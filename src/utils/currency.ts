// src/utils/currency.ts - ОБНОВЛЕННАЯ версия с новым форматом рупий

/**
 * Форматирует сумму в IDR с префиксом "Rp" и точками как разделителями тысяч
 * Поддерживает отрицательные числа
 * Примеры:
 * - 7500 -> "Rp 7.500"
 * - 1250000 -> "Rp 1.250.000"
 * - -17955101 -> "-Rp 17.955.101"
 * - 2500000000 -> "Rp 2.5M" (сокращенный формат)
 */
export function formatIDR(amount: number, options: FormatOptions = {}): string {
  if (isNaN(amount)) {
    return 'Rp 0'
  }

  // Handle negative numbers
  const isNegative = amount < 0
  const absoluteAmount = Math.abs(amount)

  // Округляем до целого числа
  const roundedAmount = Math.round(absoluteAmount)
  const { compact = false, maxWidth } = options

  // Определяем нужно ли сокращение
  const shouldUseCompact = compact || shouldUseCompactFormat(roundedAmount, maxWidth)

  let formatted: string
  if (shouldUseCompact && roundedAmount >= 1000000) {
    formatted = formatCompactIDR(roundedAmount)
  } else {
    // Обычный формат с точками
    formatted = `Rp ${formatWithDots(roundedAmount)}`
  }

  // Add negative sign if needed
  return isNegative ? `-${formatted}` : formatted
}

/**
 * Краткое форматирование IDR с сокращениями (K/M/B)
 */
export function formatIDRCompact(amount: number): string {
  if (isNaN(amount)) {
    return 'Rp 0'
  }

  const isNegative = amount < 0
  const roundedAmount = Math.round(Math.abs(amount))
  const formatted = formatCompactIDR(roundedAmount)
  return isNegative ? `-${formatted}` : formatted
}

/**
 * Форматирование с единицей измерения
 * Пример: "Rp 2.500/kg"
 */
export function formatIDRWithUnit(
  amount: number,
  unit: string,
  options: FormatOptions = {}
): string {
  const formattedAmount = formatIDR(amount, options)
  return `${formattedAmount}/${unit}`
}

/**
 * Краткое форматирование (только число с префиксом, без "Rp")
 * Для использования в ограниченном пространстве
 */
export function formatIDRShort(amount: number, options: FormatOptions = {}): string {
  const formatted = formatIDR(amount, options)
  return formatted.replace('Rp ', '')
}

/**
 * Форматирование для отображения в таблицах с автоматическим сокращением
 */
export function formatIDRTable(amount: number, maxWidth: number = 100): string {
  return formatIDR(amount, { maxWidth, compact: true })
}

// =============================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// =============================================

interface FormatOptions {
  compact?: boolean // Принудительное использование сокращений
  maxWidth?: number // Максимальная ширина в пикселях для автоматического сокращения
  showSign?: boolean // Показывать знак + для положительных чисел
  decimals?: number // Количество десятичных знаков для сокращений
}

// =============================================
// ВНУТРЕННИЕ ФУНКЦИИ
// =============================================

/**
 * Форматирует число с точками как разделителями тысяч
 * 1250000 -> "1.250.000"
 */
function formatWithDots(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Создает сокращенный формат
 */
function formatCompactIDR(amount: number): string {
  if (amount >= 1000000000) {
    // Миллиарды
    const billions = amount / 1000000000
    return `Rp ${formatDecimal(billions)}B`
  }

  if (amount >= 1000000) {
    // Миллионы
    const millions = amount / 1000000
    return `Rp ${formatDecimal(millions)}M`
  }

  if (amount >= 100000) {
    // Тысячи (только от 100K)
    const thousands = amount / 1000
    return `Rp ${formatDecimal(thousands)}K`
  }

  // Обычный формат для сумм менее 100K
  return `Rp ${formatWithDots(amount)}`
}

/**
 * Форматирует десятичное число для сокращений
 */
function formatDecimal(num: number, decimals: number = 1): string {
  if (num >= 100) {
    // Для больших чисел показываем целые
    return Math.round(num).toString()
  }

  if (num >= 10) {
    // Для чисел 10-99 показываем 1 знак после запятой если нужно
    const rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(decimals)
  }

  // Для чисел меньше 10 показываем до 2 знаков после запятой
  const maxDecimals = Math.max(decimals, 2)
  const rounded = Math.round(num * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals)

  if (rounded % 1 === 0) {
    return rounded.toString()
  }

  // Определяем нужное количество знаков
  const actualDecimals = rounded < 1 ? maxDecimals : decimals
  return rounded.toFixed(actualDecimals)
}

/**
 * Определяет нужно ли использовать сокращенный формат на основе ширины
 */
function shouldUseCompactFormat(amount: number, maxWidth?: number): boolean {
  if (!maxWidth) return false

  // Примерная ширина символа: 8px
  const estimatedWidth = estimateTextWidth(formatWithDots(amount))

  return estimatedWidth > maxWidth
}

/**
 * Оценивает ширину текста (приблизительно)
 */
function estimateTextWidth(text: string): number {
  // Примерная ширина: цифра = 8px, точка = 4px, "Rp " = 24px
  const digitWidth = 8
  const dotWidth = 4
  const prefixWidth = 24

  const digits = text.replace(/[^0-9]/g, '').length
  const dots = (text.match(/\./g) || []).length

  return prefixWidth + digits * digitWidth + dots * dotWidth
}

// =============================================
// ПАРСИНГ И УТИЛИТЫ
// =============================================

/**
 * Парсит строку IDR обратно в число
 * "Rp 2.500.000" -> 2500000
 * "Rp 2.5M" -> 2500000
 */
export function parseIDR(idrString: string): number {
  if (!idrString) return 0

  // Убираем "Rp" и пробелы
  const cleaned = idrString.replace(/Rp\s*/gi, '').replace(/\s/g, '')

  // Обрабатываем сокращения
  if (cleaned.includes('B')) {
    return parseFloat(cleaned.replace('B', '')) * 1000000000
  }
  if (cleaned.includes('M')) {
    return parseFloat(cleaned.replace('M', '')) * 1000000
  }
  if (cleaned.includes('K')) {
    return parseFloat(cleaned.replace('K', '')) * 1000
  }

  // Убираем точки и парсим как обычное число
  const withoutDots = cleaned.replace(/\./g, '')
  return parseFloat(withoutDots) || 0
}

/**
 * Проверяет, является ли сумма "дорогой" для определенного типа
 */
export function isExpensiveAmount(amount: number, type: 'preparation' | 'recipe'): boolean {
  if (type === 'preparation') {
    return amount > 50000 // 50K IDR за единицу
  } else {
    return amount > 100000 // 100K IDR за порцию
  }
}

/**
 * Возвращает цветовой класс в зависимости от суммы
 */
export function getAmountColorClass(amount: number, type: 'preparation' | 'recipe'): string {
  if (amount === 0) return 'text-medium-emphasis'

  if (isExpensiveAmount(amount, type)) {
    return 'text-error' // Дорого
  }

  if (amount > (type === 'preparation' ? 20000 : 50000)) {
    return 'text-warning' // Средне
  }

  return 'text-success' // Дешево
}

/**
 * Получает описание диапазона цен
 */
export function getPriceRangeDescription(amount: number, type: 'preparation' | 'recipe'): string {
  const thresholds =
    type === 'preparation'
      ? { low: 10000, medium: 30000, high: 50000 }
      : { low: 25000, medium: 75000, high: 100000 }

  if (amount === 0) return 'No cost calculated'
  if (amount <= thresholds.low) return 'Budget-friendly'
  if (amount <= thresholds.medium) return 'Moderate cost'
  if (amount <= thresholds.high) return 'Premium cost'
  return 'Luxury cost'
}

// =============================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// =============================================

/**
 * Экспорт констант для консистентности
 */
export const IDR_CURRENCY = {
  symbol: 'Rp',
  name: 'Indonesian Rupiah',
  locale: 'id-ID',
  format: {
    prefix: 'Rp ',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    compactThreshold: 100000
  },
  thresholds: {
    preparation: {
      budget: 10000,
      moderate: 30000,
      premium: 50000
    },
    recipe: {
      budget: 25000,
      moderate: 75000,
      premium: 100000
    }
  }
} as const

// =============================================
// PAYMENT TOLERANCE UTILITIES
// =============================================

/**
 * Default payment tolerance for IDR currency
 * Used when store settings are not available
 */
export const DEFAULT_PAYMENT_TOLERANCE = 1000 // 1000 IDR (~$0.06)

/**
 * Round amount to whole IDR units (no decimals)
 * IDR is the smallest unit, no sen/cents
 * @param amount - Amount to round
 * @returns Rounded whole number
 */
export function roundToWholeIDR(amount: number): number {
  return Math.round(amount)
}

/**
 * Check if an amount difference is negligible (within tolerance)
 * Use for floating point error handling and small payment differences
 *
 * @param amount - The amount difference to check (can be negative)
 * @param tolerance - Maximum acceptable difference (default: 1000 IDR)
 * @returns true if amount is within ±tolerance
 *
 * @example
 * isAmountNegligible(0.18) // true - floating point error
 * isAmountNegligible(862, 1000) // true - within 1000 IDR
 * isAmountNegligible(1500, 1000) // false - exceeds tolerance
 */
export function isAmountNegligible(
  amount: number,
  tolerance: number = DEFAULT_PAYMENT_TOLERANCE
): boolean {
  return Math.abs(roundToWholeIDR(amount)) <= tolerance
}

/**
 * Check if a payment is considered fully paid (within tolerance)
 * Accounts for both underpayment and slight overpayment
 *
 * @param paidAmount - Amount that has been paid
 * @param requiredAmount - Amount that needs to be paid
 * @param tolerance - Maximum acceptable shortfall (default: 1000 IDR)
 * @returns true if considered fully paid
 *
 * @example
 * isPaymentComplete(31895500, 31896362, 1000) // true - 862 IDR short, within tolerance
 * isPaymentComplete(32000000, 31896362, 1000) // true - overpaid
 * isPaymentComplete(31000000, 31896362, 1000) // false - 896K short
 */
export function isPaymentComplete(
  paidAmount: number,
  requiredAmount: number,
  tolerance: number = DEFAULT_PAYMENT_TOLERANCE
): boolean {
  const roundedPaid = roundToWholeIDR(paidAmount)
  const roundedRequired = roundToWholeIDR(requiredAmount)
  const difference = roundedRequired - roundedPaid

  // Fully paid if difference is within tolerance (including overpayment)
  return difference <= tolerance
}

/**
 * Check if two amounts are equal within tolerance
 *
 * @param amount1 - First amount
 * @param amount2 - Second amount
 * @param tolerance - Maximum acceptable difference (default: 1000 IDR)
 * @returns true if amounts are equal within tolerance
 *
 * @example
 * amountsEqual(31896361.82, 31896362) // true - floating point
 * amountsEqual(31895500, 31896362, 1000) // true - within 1000 IDR
 */
export function amountsEqual(
  amount1: number,
  amount2: number,
  tolerance: number = DEFAULT_PAYMENT_TOLERANCE
): boolean {
  const rounded1 = roundToWholeIDR(amount1)
  const rounded2 = roundToWholeIDR(amount2)
  return Math.abs(rounded1 - rounded2) <= tolerance
}

/**
 * Calculate payment status based on amounts with tolerance
 *
 * @param paidAmount - Amount paid
 * @param requiredAmount - Amount required
 * @param tolerance - Maximum acceptable shortfall (default: 1000 IDR)
 * @returns Payment status string
 *
 * @example
 * getTolerancePaymentStatus(0, 100000) // 'not_paid'
 * getTolerancePaymentStatus(50000, 100000) // 'partially_paid'
 * getTolerancePaymentStatus(99500, 100000, 1000) // 'fully_paid' - within tolerance
 * getTolerancePaymentStatus(100000, 100000) // 'fully_paid'
 * getTolerancePaymentStatus(110000, 100000, 1000) // 'overpaid'
 */
export function getTolerancePaymentStatus(
  paidAmount: number,
  requiredAmount: number,
  tolerance: number = DEFAULT_PAYMENT_TOLERANCE
): 'not_paid' | 'partially_paid' | 'fully_paid' | 'overpaid' {
  const roundedPaid = roundToWholeIDR(paidAmount)
  const roundedRequired = roundToWholeIDR(requiredAmount)

  if (roundedPaid <= 0) return 'not_paid'

  const difference = roundedPaid - roundedRequired

  // Overpaid: paid more than required + tolerance
  if (difference > tolerance) return 'overpaid'

  // Fully paid: within tolerance range (including exact and small overpay)
  if (difference >= -tolerance) return 'fully_paid'

  // Partially paid: paid something but not enough
  return 'partially_paid'
}

/**
 * Get the effective remaining amount (0 if within tolerance)
 *
 * @param paidAmount - Amount paid
 * @param requiredAmount - Amount required
 * @param tolerance - Maximum acceptable shortfall (default: 1000 IDR)
 * @returns Remaining amount or 0 if within tolerance
 */
export function getEffectiveRemaining(
  paidAmount: number,
  requiredAmount: number,
  tolerance: number = DEFAULT_PAYMENT_TOLERANCE
): number {
  const roundedPaid = roundToWholeIDR(paidAmount)
  const roundedRequired = roundToWholeIDR(requiredAmount)
  const remaining = roundedRequired - roundedPaid

  // If within tolerance, return 0 (considered fully paid)
  if (Math.abs(remaining) <= tolerance) return 0

  return remaining
}

// =============================================
// АДАПТИВНОЕ ФОРМАТИРОВАНИЕ
// =============================================

/**
 * Форматирует сумму с учетом доступного места
 */
export function formatIDRAdaptive(
  amount: number,
  containerWidth: number,
  priority: 'full' | 'compact' | 'minimal' = 'full'
): string {
  const fullFormat = formatIDR(amount)
  const estimatedWidth = estimateTextWidth(fullFormat.replace('Rp ', '')) + 24 // +24 для "Rp "

  // Если помещается полный формат
  if (estimatedWidth <= containerWidth || priority === 'full') {
    return fullFormat
  }

  // Пробуем сокращенный формат
  const compactFormat = formatIDRCompact(amount)
  const compactWidth = estimateTextWidth(compactFormat.replace('Rp ', '')) + 24

  if (compactWidth <= containerWidth || priority === 'compact') {
    return compactFormat
  }

  // Минимальный формат (только число без "Rp")
  if (priority === 'minimal') {
    return formatIDRShort(amount, { compact: true })
  }

  return compactFormat
}

// =============================================
// ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
// =============================================

/**
 * Примеры использования новой системы:
 *
 * // Обычное форматирование
 * formatIDR(7500) -> "Rp 7.500"
 * formatIDR(1250000) -> "Rp 1.250.000"
 * formatIDR(2500000) -> "Rp 2.500.000"
 *
 * // Сокращенное форматирование
 * formatIDRCompact(1250000) -> "Rp 1.25M"
 * formatIDRCompact(2500000000) -> "Rp 2.5B"
 *
 * // С единицами измерения
 * formatIDRWithUnit(850, 'ml') -> "Rp 850/ml"
 * formatIDRWithUnit(180000, 'kg') -> "Rp 180K/kg" (если compact)
 *
 * // Для таблиц (автоматическое сокращение)
 * formatIDRTable(1250000, 80) -> "Rp 1.25M"
 *
 * // Адаптивное форматирование
 * formatIDRAdaptive(1250000, 100, 'compact') -> "Rp 1.25M"
 *
 * // Парсинг обратно
 * parseIDR("Rp 1.250.000") -> 1250000
 * parseIDR("Rp 2.5M") -> 2500000
 */
