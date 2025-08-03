// src/utils/id.ts
/**
 * Generates a unique identifier
 * Uses crypto.randomUUID() if available, otherwise falls back to a custom implementation
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback implementation for environments without crypto.randomUUID()
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Generates a short unique identifier (8 characters)
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10)
}

/**
 * Generates a timestamp-based ID
 */
export function generateTimestampId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}
