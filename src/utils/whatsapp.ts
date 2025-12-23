// src/utils/whatsapp.ts

/**
 * WhatsApp Integration Utilities
 * Provides functions for formatting phone numbers and building wa.me URLs
 */

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface WhatsAppUrlOptions {
  phone: string
  message: string
}

export interface PhoneValidationResult {
  isValid: boolean
  formatted?: string
  error?: string
}

// =============================================
// PHONE NUMBER FORMATTING
// =============================================

/**
 * Validates and formats phone number to international format
 * Supports Indonesian and international phone numbers
 *
 * Examples:
 * - "08123456789" -> "+628123456789" (Indonesian local)
 * - "628123456789" -> "+628123456789" (Indonesian international)
 * - "+62 812-3456-789" -> "+628123456789"
 * - "79212283848" -> "+79212283848" (Russian)
 * - "+7 921 228 38 48" -> "+79212283848"
 */
export function formatPhoneNumber(phone: string): PhoneValidationResult {
  if (!phone) {
    return {
      isValid: false,
      error: 'Phone number is required'
    }
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')

  // Check if empty after cleaning
  if (!cleaned) {
    return {
      isValid: false,
      error: 'Invalid phone number format'
    }
  }

  let formatted = cleaned

  // Convert Indonesian local format (08...) to international (+628...)
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1)
  }

  // Validate length (international numbers: 7-15 digits)
  // 7 digits minimum (some small countries), 15 digits maximum (ITU-T E.164 standard)
  if (formatted.length < 7 || formatted.length > 15) {
    return {
      isValid: false,
      error: 'Invalid phone number length (must be 7-15 digits)'
    }
  }

  // Basic validation: number should only contain digits at this point
  if (!/^\d+$/.test(formatted)) {
    return {
      isValid: false,
      error: 'Invalid phone number format'
    }
  }

  return {
    isValid: true,
    formatted: `+${formatted}`
  }
}

/**
 * Formats phone number for WhatsApp API (without + prefix)
 * WhatsApp API expects format: 628123456789
 */
export function formatPhoneForWhatsApp(phone: string): string | null {
  const result = formatPhoneNumber(phone)

  if (!result.isValid || !result.formatted) {
    return null
  }

  // Remove + prefix for WhatsApp API
  return result.formatted.replace('+', '')
}

// =============================================
// WHATSAPP URL BUILDING
// =============================================

/**
 * Builds WhatsApp wa.me URL with pre-filled message
 *
 * @param options.phone - Phone number (any format, will be auto-formatted)
 * @param options.message - Pre-filled message text
 * @returns WhatsApp URL or null if phone is invalid
 *
 * Example:
 * buildWhatsAppUrl({ phone: '08123456789', message: 'Hello!' })
 * -> "https://wa.me/628123456789?text=Hello%21"
 */
export function buildWhatsAppUrl(options: WhatsAppUrlOptions): string | null {
  const { phone, message } = options

  // Format phone number
  const formattedPhone = formatPhoneForWhatsApp(phone)

  if (!formattedPhone) {
    return null
  }

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message)

  // Build wa.me URL
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`
}

/**
 * Opens WhatsApp in new tab with pre-filled message
 *
 * @param options.phone - Phone number
 * @param options.message - Pre-filled message
 * @returns true if URL was opened, false if phone is invalid
 */
export function openWhatsApp(options: WhatsAppUrlOptions): boolean {
  const url = buildWhatsAppUrl(options)

  if (!url) {
    return false
  }

  window.open(url, '_blank')
  return true
}

// =============================================
// MESSAGE LENGTH VALIDATION
// =============================================

/**
 * Maximum safe URL length for WhatsApp links
 * Most browsers support up to 2083 characters, but we use conservative limit
 */
const MAX_WHATSAPP_URL_LENGTH = 2000

/**
 * Validates if message length is within safe URL limits
 *
 * @param message - Message text to validate
 * @returns Validation result with length info
 */
export function validateMessageLength(message: string): {
  isValid: boolean
  length: number
  maxLength: number
  encodedLength: number
} {
  const encodedMessage = encodeURIComponent(message)
  const estimatedUrlLength = 30 + encodedMessage.length // 30 chars for "https://wa.me/628123456789?text="

  return {
    isValid: estimatedUrlLength <= MAX_WHATSAPP_URL_LENGTH,
    length: message.length,
    maxLength: MAX_WHATSAPP_URL_LENGTH,
    encodedLength: encodedMessage.length
  }
}

/**
 * Truncates message to fit within URL length limits
 *
 * @param message - Original message
 * @param suffix - Text to append after truncation (default: "...")
 * @returns Truncated message that fits URL limits
 */
export function truncateMessage(message: string, suffix: string = '...'): string {
  const validation = validateMessageLength(message)

  if (validation.isValid) {
    return message
  }

  // Binary search for max length that fits
  let left = 0
  let right = message.length
  let bestFit = ''

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const truncated = message.substring(0, mid) + suffix
    const check = validateMessageLength(truncated)

    if (check.isValid) {
      bestFit = truncated
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return bestFit || suffix
}

// =============================================
// UTILITY HELPERS
// =============================================

/**
 * Checks if phone number is valid without formatting
 */
export function isValidPhoneNumber(phone: string): boolean {
  const result = formatPhoneNumber(phone)
  return result.isValid
}

/**
 * Gets user-friendly error message for phone validation
 */
export function getPhoneValidationError(phone: string): string | null {
  const result = formatPhoneNumber(phone)
  return result.isValid ? null : result.error || 'Invalid phone number'
}

// =============================================
// CONSTANTS
// =============================================

export const WHATSAPP_CONSTANTS = {
  MAX_URL_LENGTH: MAX_WHATSAPP_URL_LENGTH,
  INDONESIA_COUNTRY_CODE: '+62',
  WA_ME_BASE_URL: 'https://wa.me/'
} as const
