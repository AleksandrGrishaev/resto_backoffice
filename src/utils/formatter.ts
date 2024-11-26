// src/utils/formatter.ts
import { format } from 'date-fns'

export class Formatter {
  static formatDateTime(date: string | Date): string {
    try {
      return format(new Date(date), 'HH:mm:ss')
    } catch (error) {
      console.error('Error formatting date:', error)
      return String(date)
    }
  }

  static formatDate(date: string | Date): string {
    try {
      return format(new Date(date), 'yyyy-MM-dd')
    } catch (error) {
      console.error('Error formatting date:', error)
      return String(date)
    }
  }

  static formatFullDateTime(date: string | Date): string {
    try {
      return format(new Date(date), 'yyyy-MM-dd HH:mm:ss')
    } catch (error) {
      console.error('Error formatting date:', error)
      return String(date)
    }
  }

  // Добавим несколько полезных методов для форматирования
  static formatTimeOnly(date: string | Date): string {
    try {
      return format(new Date(date), 'HH:mm')
    } catch (error) {
      console.error('Error formatting time:', error)
      return String(date)
    }
  }

  static formatDateMonthYear(date: string | Date): string {
    try {
      return format(new Date(date), 'MMMM yyyy')
    } catch (error) {
      console.error('Error formatting date:', error)
      return String(date)
    }
  }

  static formatDayMonth(date: string | Date): string {
    try {
      return format(new Date(date), 'dd MMM')
    } catch (error) {
      console.error('Error formatting date:', error)
      return String(date)
    }
  }
}
