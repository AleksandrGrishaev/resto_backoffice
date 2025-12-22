/**
 * useWebShare.ts
 * Composable for Web Share API integration
 * Provides native sharing functionality for mobile/tablet devices
 */

import { ref } from 'vue'

export interface ShareOptions {
  title?: string
  text?: string
  url?: string
  files?: File[]
}

export interface ShareResult {
  success: boolean
  error?: string
  fallbackUsed?: boolean
}

export function useWebShare() {
  const isSupported = ref(typeof navigator !== 'undefined' && 'share' in navigator)
  const canShareFiles = ref(
    typeof navigator !== 'undefined' && 'canShare' in navigator && navigator.canShare({ files: [] })
  )

  /**
   * Share content using Web Share API
   * Falls back to manual download if not supported
   */
  async function share(options: ShareOptions): Promise<ShareResult> {
    try {
      // Check if Web Share API is available
      if (!isSupported.value) {
        return {
          success: false,
          error: 'Web Share API is not supported in this browser',
          fallbackUsed: true
        }
      }

      // Check if we can share files
      if (options.files && options.files.length > 0) {
        if (!canShareFiles.value) {
          return {
            success: false,
            error: 'File sharing is not supported in this browser',
            fallbackUsed: true
          }
        }

        // Verify canShare with actual files
        if (navigator.canShare && !navigator.canShare({ files: options.files })) {
          return {
            success: false,
            error: 'Cannot share these files (might be too large or wrong format)',
            fallbackUsed: true
          }
        }
      }

      // Execute share
      await navigator.share(options)

      return {
        success: true
      }
    } catch (error: any) {
      // User cancelled the share dialog
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Share cancelled by user'
        }
      }

      // Other errors
      console.error('Share error:', error)
      return {
        success: false,
        error: error.message || 'Failed to share',
        fallbackUsed: true
      }
    }
  }

  /**
   * Share a file with optional text
   * Common use case for PDF/image sharing
   */
  async function shareFile(file: File, title?: string, text?: string): Promise<ShareResult> {
    return share({
      title,
      text,
      files: [file]
    })
  }

  /**
   * Share a PDF Blob
   * Converts Blob to File and shares it
   */
  async function sharePdfBlob(
    blob: Blob,
    filename: string,
    title?: string,
    text?: string
  ): Promise<ShareResult> {
    const file = new File([blob], filename, { type: 'application/pdf' })
    return shareFile(file, title, text)
  }

  /**
   * Share text/URL only (no files)
   */
  async function shareText(title: string, text: string, url?: string): Promise<ShareResult> {
    return share({ title, text, url })
  }

  /**
   * Download file as fallback when sharing is not supported
   */
  function downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Copy text to clipboard as fallback
   */
  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }

      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)
      return success
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }

  return {
    // State
    isSupported,
    canShareFiles,

    // Methods
    share,
    shareFile,
    sharePdfBlob,
    shareText,
    downloadFile,
    copyToClipboard
  }
}
