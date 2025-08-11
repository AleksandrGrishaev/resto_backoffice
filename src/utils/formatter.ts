// src/utils/formatter.ts - REFACTORED: Устранение дублирования
import { TimeUtils } from './time'
import { formatIDR, formatIDRWithUnit, formatIDRShort } from './currency'

// =============================================
// ВРЕМЯ И ДАТЫ - используем TimeUtils
// =============================================

export function formatDateTime(date: string | Date): string {
  try {
    return TimeUtils.formatDateToDisplay(date, 'HH:mm:ss')
  } catch (error) {
    console.error('Error formatting datetime:', error)
    return String(date)
  }
}

export function formatDate(date: string | Date): string {
  try {
    return TimeUtils.formatDateToDisplay(date, 'yyyy-MM-dd')
  } catch (error) {
    console.error('Error formatting date:', error)
    return String(date)
  }
}

export function formatFullDateTime(date: string | Date): string {
  try {
    return TimeUtils.formatDateToDisplay(date, 'yyyy-MM-dd HH:mm:ss')
  } catch (error) {
    console.error('Error formatting full datetime:', error)
    return String(date)
  }
}

export function formatTimeOnly(date: string | Date): string {
  try {
    return TimeUtils.formatDateToDisplay(date, 'HH:mm')
  } catch (error) {
    console.error('Error formatting time:', error)
    return String(date)
  }
}

export function formatDateMonthYear(date: string | Date): string {
  try {
    return TimeUtils.formatDateToDisplay(date, 'MMMM yyyy')
  } catch (error) {
    console.error('Error formatting date month year:', error)
    return String(date)
  }
}

export function formatDayMonth(date: string | Date): string {
  try {
    return TimeUtils.formatDateToDisplay(date, 'dd MMM')
  } catch (error) {
    console.error('Error formatting day month:', error)
    return String(date)
  }
}

// =============================================
// ВАЛЮТА - используем currency.ts (устраняем дублирование)
// =============================================

/**
 * @deprecated Используйте formatIDR из @/utils/currency
 * Оставлено для обратной совместимости, будет удалено в следующей версии
 */
export function formatIDR(amount: number): string {
  console.warn('formatAmount is deprecated, use formatIDR from @/utils/currency instead')
  return formatIDR(amount)
}

// Re-export currency functions для удобства
export { formatIDR, formatIDRWithUnit, formatIDRShort } from './currency'

// =============================================
// СПЕЦИАЛИЗИРОВАННЫЕ ФОРМАТТЕРЫ
// =============================================

/**
 * Форматирует процент
 */
export function formatPercentage(value: number, precision: number = 1): string {
  return `${value.toFixed(precision)}%`
}

/**
 * Форматирует количество с единицей измерения
 * TODO: Интегрировать с useMeasurementUnits после рефакторинга единиц
 */
export function formatQuantity(value: number, unit: string, precision: number = 1): string {
  const formattedValue = Number(value.toFixed(precision))
  return `${formattedValue} ${unit}`
}

/**
 * Форматирует номер телефона (для Indonesia)
 */
export function formatPhoneNumber(phone: string): string {
  // Простое форматирование для Indonesian phone numbers
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.startsWith('62')) {
    // International format: +62 812 3456 7890
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 9)} ${cleaned.slice(9)}`
  }

  if (cleaned.startsWith('0')) {
    // Local format: 0812 3456 7890
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`
  }

  return phone // Return as-is if format not recognized
}

/**
 * Форматирует размер файла
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// =============================================
// КЛАСС FORMATTER (для обратной совместимости)
// =============================================

/**
 * @deprecated Используйте именованные экспорты вместо класса
 * Класс оставлен для обратной совместимости
 */
export class Formatter {
  static formatDateTime = formatDateTime
  static formatDate = formatDate
  static formatAmount = formatAmount // deprecated
  static formatFullDateTime = formatFullDateTime
  static formatTimeOnly = formatTimeOnly
  static formatDateMonthYear = formatDateMonthYear
  static formatDayMonth = formatDayMonth

  // New methods
  static formatIDR = formatIDR
  static formatIDRWithUnit = formatIDRWithUnit
  static formatIDRShort = formatIDRShort
  static formatPercentage = formatPercentage
  static formatQuantity = formatQuantity
  static formatPhoneNumber = formatPhoneNumber
  static formatFileSize = formatFileSize
}
