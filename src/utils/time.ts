// src/utils/time.ts
import { format, parseISO, formatISO } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'

const TIMEZONE = 'Asia/Denpasar'
const DATE_FORMAT = 'yyyy-MM-dd HH:mm:ss'

export class TimeUtils {
  static getCurrentLocalISO(): string {
    try {
      const now = new Date()
      return now.toISOString()
    } catch (error) {
      console.error('Error in getCurrentLocalISO:', error)
      return new Date().toISOString()
    }
  }

  static formatDateToDisplay(date: string | Date, formatStr: string = DATE_FORMAT): string {
    try {
      const parsedDate = typeof date === 'string' ? parseISO(date) : date
      const zonedDate = utcToZonedTime(parsedDate, TIMEZONE)
      return format(zonedDate, formatStr)
    } catch (error) {
      console.error('Error in formatDateToDisplay:', error)
      return format(new Date(date), formatStr)
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
}
