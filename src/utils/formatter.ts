// src/utils/formatter.ts
import { format } from 'date-fns'

// Именованные экспорты для часто используемых функций
export function formatDateTime(date: string | Date): string {
  try {
    return format(new Date(date), 'HH:mm:ss')
  } catch (error) {
    console.error('Error formatting date:', error)
    return String(date)
  }
}

export function formatDate(date: string | Date): string {
  try {
    return format(new Date(date), 'yyyy-MM-dd')
  } catch (error) {
    console.error('Error formatting date:', error)
    return String(date)
  }
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'IDR'
  }).format(amount)
}

export function formatFullDateTime(date: string | Date): string {
  try {
    return format(new Date(date), 'yyyy-MM-dd HH:mm:ss')
  } catch (error) {
    console.error('Error formatting date:', error)
    return String(date)
  }
}

export function formatTimeOnly(date: string | Date): string {
  try {
    return format(new Date(date), 'HH:mm')
  } catch (error) {
    console.error('Error formatting time:', error)
    return String(date)
  }
}

export function formatDateMonthYear(date: string | Date): string {
  try {
    return format(new Date(date), 'MMMM yyyy')
  } catch (error) {
    console.error('Error formatting date:', error)
    return String(date)
  }
}

export function formatDayMonth(date: string | Date): string {
  try {
    return format(new Date(date), 'dd MMM')
  } catch (error) {
    console.error('Error formatting date:', error)
    return String(date)
  }
}

// Если все же нужен класс, можно экспортировать его отдельно
export class Formatter {
  static formatDateTime = formatDateTime
  static formatDate = formatDate
  static formatAmount = formatAmount
  static formatFullDateTime = formatFullDateTime
  static formatTimeOnly = formatTimeOnly
  static formatDateMonthYear = formatDateMonthYear
  static formatDayMonth = formatDayMonth
}
