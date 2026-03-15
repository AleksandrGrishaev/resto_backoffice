// src/composables/useImageUpload.ts
// Composable for uploading menu item images to Supabase Storage
// Handles client-side resize (800×800) + thumbnail (200×200) + WebP conversion
//
// File naming: items/{slug}.webp (SEO-friendly, generated once from dish name)
// Thumbnail: items/{slug}_thumb.webp (derived by convention, not stored in DB)

import { ref } from 'vue'
import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ImageUpload'
const BUCKET = 'menu-images'
const FULL_SIZE = 800
const THUMB_SIZE = 200
const WEBP_QUALITY = 0.85
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB — prevent OOM on mobile with huge camera photos
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

// Cyrillic → Latin transliteration map
const TRANSLIT_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya'
}

/**
 * Convert a dish name to a URL-safe slug.
 * Transliterates Cyrillic, lowercases, replaces non-alphanumeric with hyphens.
 * Appends short ID suffix to prevent collisions.
 */
function slugify(name: string, itemId: string): string {
  // Transliterate Cyrillic
  const transliterated = name
    .toLowerCase()
    .split('')
    .map(char => TRANSLIT_MAP[char] ?? char)
    .join('')

  // Replace non-alphanumeric with hyphens, collapse multiple, trim edges
  const slug = transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) // max slug length

  // Append short ID suffix (first 8 chars of UUID) to prevent collisions
  const idSuffix = itemId.replace(/-/g, '').slice(0, 8)

  return slug ? `${slug}-${idSuffix}` : idSuffix
}

export interface ImageUploadResult {
  url: string
  thumbUrl: string
}

/**
 * Resize and convert an image file to WebP using Canvas API.
 * Uses aspect-fill with center crop to produce a square image.
 */
function resizeImage(file: File, targetSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      canvas.width = targetSize
      canvas.height = targetSize
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to create canvas context'))
        return
      }

      // Aspect-fill: crop from center
      const scale = Math.max(targetSize / img.width, targetSize / img.height)
      const sw = targetSize / scale
      const sh = targetSize / scale
      const sx = (img.width - sw) / 2
      const sy = (img.height - sh) / 2

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetSize, targetSize)

      canvas.toBlob(
        blob => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to convert image to WebP'))
        },
        'image/webp',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Extract storage path from a Supabase public URL.
 * E.g. "https://xxx.supabase.co/storage/v1/object/public/menu-images/items/tom-yum-abc123.webp?t=123"
 * → "items/tom-yum-abc123.webp"
 */
function extractPathFromUrl(imageUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const idx = imageUrl.indexOf(marker)
  if (idx === -1) return null
  const path = imageUrl.slice(idx + marker.length).split('?')[0]
  return path || null
}

export function useImageUpload() {
  const isUploading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Upload an image for a menu item.
   * File is named using SEO-friendly slug derived from itemName.
   * Resizes to 800×800 (full) and 200×200 (thumb), converts to WebP.
   * If currentImageUrl is provided, removes old files first.
   */
  async function upload(
    file: File,
    itemId: string,
    itemName: string,
    currentImageUrl?: string
  ): Promise<ImageUploadResult> {
    error.value = null
    isUploading.value = true

    try {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Only PNG, JPEG, and WebP images are allowed')
      }

      // Validate file size (prevent OOM on mobile with huge photos)
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Image must be smaller than 10MB')
      }

      // Resize and convert BEFORE any deletion
      const [fullBlob, thumbBlob] = await Promise.all([
        resizeImage(file, FULL_SIZE, WEBP_QUALITY),
        resizeImage(file, THUMB_SIZE, WEBP_QUALITY)
      ])

      DebugUtils.info(MODULE_NAME, 'Images resized', {
        fullKB: Math.round(fullBlob.size / 1024),
        thumbKB: Math.round(thumbBlob.size / 1024)
      })

      const slug = slugify(itemName, itemId)
      const fullPath = `items/${slug}.webp`
      const thumbPath = `items/${slug}_thumb.webp`

      // Upload new files first (upsert to replace if same slug)
      const [fullResult, thumbResult] = await Promise.all([
        supabase.storage.from(BUCKET).upload(fullPath, fullBlob, {
          contentType: 'image/webp',
          upsert: true
        }),
        supabase.storage.from(BUCKET).upload(thumbPath, thumbBlob, {
          contentType: 'image/webp',
          upsert: true
        })
      ])

      // Cleanup on partial failure
      if (fullResult.error && !thumbResult.error) {
        await supabase.storage.from(BUCKET).remove([thumbPath])
        throw new Error(`Upload failed: ${fullResult.error.message}`)
      }
      if (thumbResult.error && !fullResult.error) {
        await supabase.storage.from(BUCKET).remove([fullPath])
        throw new Error(`Thumbnail upload failed: ${thumbResult.error.message}`)
      }
      if (fullResult.error) throw new Error(`Upload failed: ${fullResult.error.message}`)

      // Remove old files AFTER successful upload (safe: old image preserved on failure)
      if (currentImageUrl) {
        const oldPath = extractPathFromUrl(currentImageUrl)
        if (oldPath && oldPath !== fullPath) {
          const oldThumbPath = oldPath.replace('.webp', '_thumb.webp')
          await supabase.storage.from(BUCKET).remove([oldPath, oldThumbPath])
        }
      }

      // Get public URLs with cache-busting param (same path after upsert = stale cache)
      const cacheBuster = `?t=${Date.now()}`
      const { data: fullUrl } = supabase.storage.from(BUCKET).getPublicUrl(fullPath)
      const { data: thumbUrl } = supabase.storage.from(BUCKET).getPublicUrl(thumbPath)

      DebugUtils.info(MODULE_NAME, 'Upload complete', { itemId, slug })

      return {
        url: fullUrl.publicUrl + cacheBuster,
        thumbUrl: thumbUrl.publicUrl + cacheBuster
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, err)
      throw err
    } finally {
      isUploading.value = false
    }
  }

  /**
   * Remove images for a menu item from storage.
   * Extracts the file path from the stored public URL.
   */
  async function remove(imageUrl: string): Promise<void> {
    error.value = null

    try {
      const path = extractPathFromUrl(imageUrl)
      if (!path) throw new Error('Cannot determine storage path from URL')

      const thumbPath = path.replace('.webp', '_thumb.webp')
      const { error: removeError } = await supabase.storage.from(BUCKET).remove([path, thumbPath])

      if (removeError) throw new Error(`Remove failed: ${removeError.message}`)

      DebugUtils.info(MODULE_NAME, 'Images removed', { path })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Remove failed'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, err)
      throw err
    }
  }

  /**
   * Validate if a file is acceptable for upload (type + size).
   */
  function isValidFile(file: File): boolean {
    return ALLOWED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE
  }

  return {
    upload,
    remove,
    isUploading,
    error,
    isValidFile,
    ALLOWED_TYPES
  }
}
