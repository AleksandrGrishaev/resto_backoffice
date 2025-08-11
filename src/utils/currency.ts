// src/utils/currency.ts - Централизованная работа с валютой IDR

/**
 * Конвертирует количество в базовые единицы
 */
export function convertToBaseUnits(
  quantity: number,
  fromUnit: string,
  baseUnit: 'gram' | 'ml' | 'piece'
): number {
  const conversions: Record<string, { gram?: number; ml?: number; piece?: number }> = {
    // Weight conversions
    gram: { gram: 1 },
    g: { gram: 1 },
    kg: { gram: 1000 },
    kilogram: { gram: 1000 },

    // Volume conversions
    ml: { ml: 1 },
    milliliter: { ml: 1 },
    liter: { ml: 1000 },
    l: { ml: 1000 },

    // Piece conversions
    piece: { piece: 1 },
    pcs: { piece: 1 },
    pack: { piece: 1 },
    item: { piece: 1 }
  }

  const conversion = conversions[fromUnit.toLowerCase()]
  if (!conversion) {
    throw new Error(`Unknown unit: ${fromUnit}`)
  }

  const factor = conversion[baseUnit]
  if (factor === undefined) {
    throw new Error(`Cannot convert ${fromUnit} to ${baseUnit}`)
  }

  return quantity * factor
}

/**
 * Конвертирует техническое название базовой единицы в краткое английское отображение
 */
export function getBaseUnitDisplay(baseUnit: string): string {
  const displayNames: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pcs'
  }
  return displayNames[baseUnit] || baseUnit
}

/**
 * Форматирует сумму в IDR согласно правилам:
 * - До 100,000: целые числа с пробелами (7 500 IDR)
 * - От 100,000: округление до целых с префиксами (150K IDR, 2.5M IDR)
 * - Всегда с пробелами для разделения тысяч
 */
export function formatIDR(amount: number): string {
  if (isNaN(amount) || amount < 0) {
    return '0 IDR'
  }

  // Округляем до целого числа
  const roundedAmount = Math.round(amount)

  if (roundedAmount < 100000) {
    // До 100,000 - показываем с пробелами
    return `${formatWithSpaces(roundedAmount)} IDR`
  }

  // От 100,000 - используем префиксы
  if (roundedAmount >= 1000000000) {
    // Миллиарды
    const billions = roundedAmount / 1000000000
    return `${formatDecimal(billions)}B IDR`
  }

  if (roundedAmount >= 1000000) {
    // Миллионы
    const millions = roundedAmount / 1000000
    return `${formatDecimal(millions)}M IDR`
  }

  // Тысячи (от 100K)
  const thousands = roundedAmount / 1000
  return `${formatDecimal(thousands)}K IDR`
}

/**
 * Форматирует число с пробелами для разделения тысяч
 * 7500 -> "7 500"
 * 150000 -> "150 000"
 */
function formatWithSpaces(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Форматирует десятичное число для префиксов
 * Убирает лишние нули после запятой
 */
function formatDecimal(num: number): string {
  if (num >= 100) {
    // Для больших чисел показываем целые
    return Math.round(num).toString()
  }

  if (num >= 10) {
    // Для чисел 10-99 показываем 1 знак после запятой если нужно
    const rounded = Math.round(num * 10) / 10
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1)
  }

  // Для чисел меньше 10 показываем 1-2 знака после запятой
  const rounded = Math.round(num * 100) / 100
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(rounded < 1 ? 2 : 1)
}

/**
 * Краткое форматирование IDR (только число с префиксом, без "IDR")
 * Для использования в таблицах и компактных местах
 */
export function formatIDRShort(amount: number): string {
  const formatted = formatIDR(amount)
  return formatted.replace(' IDR', '')
}

/**
 * Форматирует IDR с единицей измерения
 * Например: "2 500 IDR/kg" или "85 IDR/ml"
 */
export function formatIDRWithUnit(amount: number, unit: string): string {
  return `${formatIDR(amount)}/${unit}`
}

/**
 * Парсит строку IDR обратно в число
 * "2.5M IDR" -> 2500000
 * "150 000 IDR" -> 150000
 */
export function parseIDR(idrString: string): number {
  if (!idrString) return 0

  // Убираем "IDR" и пробелы
  const cleaned = idrString.replace(/IDR/gi, '').replace(/\s/g, '')

  // Обрабатываем префиксы
  if (cleaned.includes('B')) {
    return parseFloat(cleaned.replace('B', '')) * 1000000000
  }
  if (cleaned.includes('M')) {
    return parseFloat(cleaned.replace('M', '')) * 1000000
  }
  if (cleaned.includes('K')) {
    return parseFloat(cleaned.replace('K', '')) * 1000
  }

  // Обычное число
  return parseFloat(cleaned) || 0
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

// Экспорт констант для консистентности
export const IDR_CURRENCY = {
  symbol: 'IDR',
  name: 'Indonesian Rupiah',
  locale: 'id-ID',
  thresholds: {
    compact: 100000, // С какой суммы начинаем использовать K/M
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

/**
 * Примеры использования:
 *
 * formatIDR(7500) -> "7 500 IDR"
 * formatIDR(150000) -> "150K IDR"
 * formatIDR(2500000) -> "2.5M IDR"
 *
 * formatIDRWithUnit(85, 'ml') -> "85 IDR/ml"
 * formatIDRWithUnit(180000, 'kg') -> "180K IDR/kg"
 *
 * formatIDRShort(2500000) -> "2.5M"
 *
 * parseIDR("2.5M IDR") -> 2500000
 * parseIDR("150 000 IDR") -> 150000
 */
