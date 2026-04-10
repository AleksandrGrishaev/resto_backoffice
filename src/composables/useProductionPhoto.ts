// src/composables/useProductionPhoto.ts
// Composable for capturing, compressing, and uploading production task photos
// to Supabase Storage bucket 'production-photos'.
//
// Path: {department}/{YYYY-MM-DD}/{preparationId}_{timestamp}.webp
// Resize: max 800px (longest side), aspect-ratio preserved (NOT square-cropped)
// Format: WebP at 0.80 quality
// Max input: 10MB

import { ref } from 'vue'
import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProductionPhoto'
const BUCKET = 'production-photos'
const MAX_SIZE = 800
const WEBP_QUALITY = 0.8
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB — matches bucket limit
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/**
 * Resize image preserving aspect ratio (fit within MAX_SIZE box), convert to WebP.
 * Unlike menu images, production photos are NOT square-cropped — we keep the full frame.
 */
function resizeImage(file: File | Blob, maxSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Calculate scaled dimensions (fit within maxSize box)
      let w = img.width
      let h = img.height
      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to create canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, w, h)

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
 * Generate storage path for a production photo.
 * Pattern: {department}/{YYYY-MM-DD}/{preparationId}_{timestamp}.webp
 */
function buildPath(department: string, preparationId: string): string {
  const safeDept = department.replace(/[^a-z_-]/gi, '') || 'kitchen'
  const safeId = preparationId.replace(/[^a-z0-9-]/gi, '')
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const ts = Date.now()
  return `${safeDept}/${date}/${safeId}_${ts}.webp`
}

export function useProductionPhoto() {
  const isUploading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Upload a production photo (from File input or Blob from camera).
   * Compresses to max 800px WebP, uploads to production-photos bucket.
   * Returns the public URL.
   */
  async function upload(
    file: File | Blob,
    department: string,
    preparationId: string
  ): Promise<string> {
    error.value = null
    isUploading.value = true

    try {
      // Validate type (both File and Blob — skip if empty string from canvas)
      if (file.type && file.type.length > 0 && !ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Only PNG, JPEG, and WebP images are allowed')
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Image must be smaller than 5MB')
      }

      // Compress
      const blob = await resizeImage(file, MAX_SIZE, WEBP_QUALITY)
      DebugUtils.info(MODULE_NAME, 'Photo compressed', {
        originalKB: Math.round(file.size / 1024),
        compressedKB: Math.round(blob.size / 1024)
      })

      // Upload
      const path = buildPath(department, preparationId)
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/webp' })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const url = data.publicUrl

      DebugUtils.info(MODULE_NAME, 'Photo uploaded', { path, sizeKB: Math.round(blob.size / 1024) })
      return url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Photo upload failed'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, err)
      throw err
    } finally {
      isUploading.value = false
    }
  }

  /**
   * Remove a production photo from storage.
   */
  async function remove(photoUrl: string): Promise<void> {
    const marker = `/object/public/${BUCKET}/`
    const idx = photoUrl.indexOf(marker)
    if (idx === -1) return

    const path = photoUrl.slice(idx + marker.length).split('?')[0]
    if (!path) return

    await supabase.storage.from(BUCKET).remove([path])
    DebugUtils.info(MODULE_NAME, 'Photo removed', { path })
  }

  return {
    upload,
    remove,
    isUploading,
    error,
    ALLOWED_TYPES
  }
}
