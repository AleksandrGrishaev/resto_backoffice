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
