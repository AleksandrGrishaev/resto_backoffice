// src/utils/time.ts - ENHANCED with supplier integration
import { format, parseISO, formatISO } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { Timestamp } from 'firebase/firestore'

const TIMEZONE = 'Asia/Denpasar'
const DATE_FORMAT = 'yyyy-MM-dd HH:mm:ss'

export class TimeUtils {
  // =============================================
  // EXISTING METHODS - Firebase & Local Time
  // =============================================

  static getCurrentLocalISO(): string {
    return new Date().toISOString()
  }

  static isoToTimestamp(date: string): Timestamp {
    return Timestamp.fromDate(new Date(date))
  }

  static timestampToLocalISO(timestamp: Timestamp): string {
    return timestamp.toDate().toISOString()
  }

  static formatDateToDisplay(date: string | Date, formatStr: string = DATE_FORMAT): string {
    try {
      const parsedDate = typeof date === 'string' ? parseISO(date) : date
      const zonedDate = utcToZonedTime(parsedDate, TIMEZONE)
      return format(zonedDate, formatStr)
    } catch (error) {
      return format(new Date(date), formatStr)
    }
  }

  /**
   * Форматировать дату для HTML datetime-local input
   * Возвращает формат: YYYY-MM-DDTHH:mm
   */
  static formatForHTMLInput(date?: string | Date): string {
    try {
      const dateObj = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()

      // Получаем компоненты даты в локальном времени
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      const hours = String(dateObj.getHours()).padStart(2, '0')
      const minutes = String(dateObj.getMinutes()).padStart(2, '0')

      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch (error) {
      console.error('Error formatting date for HTML input:', error)
      // Fallback: текущая дата
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }
  }

  static isSameDay(date1: string | Date, date2: string | Date): boolean {
    try {
      const zonedDate1 = utcToZonedTime(
        typeof date1 === 'string' ? parseISO(date1) : date1,
        TIMEZONE
      )
      const zonedDate2 = utcToZonedTime(
        typeof date2 === 'string' ? parseISO(date2) : date2,
        TIMEZONE
      )
      return format(zonedDate1, 'yyyy-MM-dd') === format(zonedDate2, 'yyyy-MM-dd')
    } catch (error) {
      console.error('Error in isSameDay:', error)
      return false
    }
  }

  static getStartOfDay(date: string | Date): string {
    try {
      const parsedDate = typeof date === 'string' ? parseISO(date) : date
      const zonedDate = utcToZonedTime(parsedDate, TIMEZONE)
      const startDate = new Date(zonedDate)
      startDate.setHours(0, 0, 0, 0)
      return formatISO(startDate)
    } catch (error) {
      console.error('Error in getStartOfDay:', error)
      const fallbackDate = new Date(date)
      fallbackDate.setHours(0, 0, 0, 0)
      return formatISO(fallbackDate)
    }
  }

  static getEndOfDay(date: string | Date): string {
    try {
      const parsedDate = typeof date === 'string' ? parseISO(date) : date
      const zonedDate = utcToZonedTime(parsedDate, TIMEZONE)
      const endDate = new Date(zonedDate)
      endDate.setHours(23, 59, 59, 999)
      return formatISO(endDate)
    } catch (error) {
      console.error('Error in getEndOfDay:', error)
      const fallbackDate = new Date(date)
      fallbackDate.setHours(23, 59, 59, 999)
      return formatISO(fallbackDate)
    }
  }

  // =============================================
  // NEW METHODS - For Supplier Integration
  // =============================================

  /**
   * Получить дату N дней назад в ISO формате
   */
  static getDateDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString()
  }

  /**
   * Получить дату N дней в будущем в ISO формате
   */
  static getDateDaysFromNow(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString()
  }

  /**
   * Получить дату N часов назад в ISO формате
   */
  static getDateHoursAgo(hours: number): string {
    const date = new Date()
    date.setHours(date.getHours() - hours)
    return date.toISOString()
  }

  /**
   * Получить дату N часов в будущем в ISO формате
   */
  static getDateHoursFromNow(hours: number): string {
    const date = new Date()
    date.setHours(date.getHours() + hours)
    return date.toISOString()
  }

  // =============================================
  // DISPLAY & FORMATTING METHODS
  // =============================================

  /**
   * Форматировать дату для отображения (только дата)
   */
  static formatDateForDisplay(dateString: string): string {
    try {
      const parsedDate = parseISO(dateString)
      const zonedDate = utcToZonedTime(parsedDate, TIMEZONE)
      return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: TIMEZONE
      }).format(zonedDate)
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
  }

  /**
   * Форматировать дату и время для отображения
   */
  static formatDateTimeForDisplay(dateString: string): string {
    try {
      const parsedDate = parseISO(dateString)
      const zonedDate = utcToZonedTime(parsedDate, TIMEZONE)
      return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TIMEZONE
      }).format(zonedDate)
    } catch (error) {
      console.error('Error formatting datetime:', error)
      return 'Invalid date'
    }
  }

  /**
   * Форматировать только время для отображения
   */
  static formatTimeForDisplay(dateString: string): string {
    try {
      const parsedDate = parseISO(dateString)
      const zonedDate = utcToZonedTime(parsedDate, TIMEZONE)
      return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TIMEZONE
      }).format(zonedDate)
    } catch (error) {
      console.error('Error formatting time:', error)
      return 'Invalid time'
    }
  }

  // =============================================
  // CALCULATION METHODS
  // =============================================

  /**
   * Получить количество дней назад от указанной даты
   */
  static getDaysAgo(dateString: string): number {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = now.getTime() - date.getTime()
      return Math.floor(diffTime / (1000 * 60 * 60 * 24))
    } catch (error) {
      console.error('Error calculating days ago:', error)
      return 0
    }
  }

  /**
   * Получить количество дней до указанной даты
   */
  static getDaysFromNow(dateString: string): number {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = date.getTime() - now.getTime()
      return Math.floor(diffTime / (1000 * 60 * 60 * 24))
    } catch (error) {
      console.error('Error calculating days from now:', error)
      return 0
    }
  }

  /**
   * Получить количество часов назад от указанной даты
   */
  static getHoursAgo(dateString: string): number {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = now.getTime() - date.getTime()
      return Math.floor(diffTime / (1000 * 60 * 60))
    } catch (error) {
      console.error('Error calculating hours ago:', error)
      return 0
    }
  }

  // =============================================
  // BOOLEAN CHECKS
  // =============================================

  /**
   * Проверить, просрочена ли дата
   */
  static isOverdue(dateString: string): boolean {
    try {
      const date = new Date(dateString)
      const now = new Date()
      return date < now
    } catch (error) {
      console.error('Error checking overdue:', error)
      return false
    }
  }

  /**
   * Проверить, является ли дата сегодняшней
   */
  static isToday(dateString: string): boolean {
    try {
      const date = parseISO(dateString)
      const zonedDate = utcToZonedTime(date, TIMEZONE)
      const now = utcToZonedTime(new Date(), TIMEZONE)
      return format(zonedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
    } catch (error) {
      console.error('Error checking isToday:', error)
      return false
    }
  }

  /**
   * Проверить, является ли дата завтрашней
   */
  static isTomorrow(dateString: string): boolean {
    try {
      const date = parseISO(dateString)
      const zonedDate = utcToZonedTime(date, TIMEZONE)
      const tomorrow = utcToZonedTime(new Date(), TIMEZONE)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return format(zonedDate, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')
    } catch (error) {
      console.error('Error checking isTomorrow:', error)
      return false
    }
  }

  /**
   * Проверить, является ли дата вчерашней
   */
  static isYesterday(dateString: string): boolean {
    try {
      const date = parseISO(dateString)
      const zonedDate = utcToZonedTime(date, TIMEZONE)
      const yesterday = utcToZonedTime(new Date(), TIMEZONE)
      yesterday.setDate(yesterday.getDate() - 1)
      return format(zonedDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')
    } catch (error) {
      console.error('Error checking isYesterday:', error)
      return false
    }
  }

  // =============================================
  // RELATIVE TIME METHODS
  // =============================================

  /**
   * Получить относительное время (например: "2 дня назад", "через 3 часа")
   */
  static getRelativeTime(dateString: string): string {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = date.getTime() - now.getTime()
      const diffDays = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60))
      const diffMinutes = Math.floor(Math.abs(diffTime) / (1000 * 60))

      if (TimeUtils.isToday(dateString)) {
        if (diffHours === 0) {
          if (diffMinutes === 0) return 'Только что'
          return `${diffMinutes} мин ${diffTime < 0 ? 'назад' : 'до'}`
        }
        return `${diffHours} ч ${diffTime < 0 ? 'назад' : 'до'}`
      }

      if (TimeUtils.isYesterday(dateString)) return 'Вчера'
      if (TimeUtils.isTomorrow(dateString)) return 'Завтра'

      if (diffDays < 7) {
        return `${diffDays} ${diffTime < 0 ? 'дня назад' : 'дня до'}`
      }

      return TimeUtils.formatDateForDisplay(dateString)
    } catch (error) {
      console.error('Error getting relative time:', error)
      return TimeUtils.formatDateForDisplay(dateString)
    }
  }

  // =============================================
  // BUSINESS LOGIC HELPERS
  // =============================================

  /**
   * Проверить, находится ли дата в пределах рабочих дней
   */
  static isWorkingDay(dateString: string): boolean {
    try {
      const date = parseISO(dateString)
      const zonedDate = utcToZonedTime(date, TIMEZONE)
      const dayOfWeek = zonedDate.getDay()
      return dayOfWeek >= 1 && dayOfWeek <= 5 // Понедельник-Пятница
    } catch (error) {
      console.error('Error checking working day:', error)
      return false
    }
  }

  /**
   * Получить следующий рабочий день
   */
  static getNextWorkingDay(fromDate?: string): string {
    try {
      const date = fromDate ? parseISO(fromDate) : new Date()
      const nextDate = new Date(date)

      do {
        nextDate.setDate(nextDate.getDate() + 1)
      } while (!TimeUtils.isWorkingDay(nextDate.toISOString()))

      return nextDate.toISOString()
    } catch (error) {
      console.error('Error getting next working day:', error)
      return TimeUtils.getDateDaysFromNow(1)
    }
  }

  /**
   * Получить дату поставки с учетом lead time
   */
  static getDeliveryDate(leadTimeDays: number, fromDate?: string): string {
    try {
      const startDate = fromDate ? parseISO(fromDate) : new Date()
      const deliveryDate = new Date(startDate)
      deliveryDate.setDate(deliveryDate.getDate() + leadTimeDays)
      return deliveryDate.toISOString()
    } catch (error) {
      console.error('Error calculating delivery date:', error)
      return TimeUtils.getDateDaysFromNow(leadTimeDays)
    }
  }

  // =============================================
  // VALIDATION METHODS
  // =============================================

  /**
   * Проверить, является ли строка валидной датой
   */
  static isValidDate(dateString: string): boolean {
    try {
      const date = parseISO(dateString)
      return !isNaN(date.getTime())
    } catch (error) {
      return false
    }
  }

  /**
   * Проверить, находится ли дата в разумных пределах для бизнес-логики
   */
  static isReasonableDate(dateString: string): boolean {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      const yearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

      return date >= yearAgo && date <= yearFromNow
    } catch (error) {
      return false
    }
  }
}
