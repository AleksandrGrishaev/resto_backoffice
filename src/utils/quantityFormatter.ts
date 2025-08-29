// src/utils/quantityFormatter.ts
// Утилита для правильного форматирования количеств с единицами измерения

import type { Product } from '@/stores/productsStore/types'

export interface QuantityDisplayOptions {
  precision?: number // Количество знаков после запятой
  showUnit?: boolean // Показывать единицу измерения
  autoConvert?: boolean // Автоматически конвертировать в удобные единицы (г→кг, мл→л)
  forceUnit?: string // Принудительно использовать определенную единицу
}

/**
 * ✅ Форматирует количество с правильными единицами измерения
 * Автоматически конвертирует граммы в кг, мл в литры для больших значений
 */
export function formatQuantityWithUnit(
  quantity: number,
  product: Product | { baseUnit: string; purchaseUnit?: string },
  options: QuantityDisplayOptions = {}
): string {
  const { precision = 1, showUnit = true, autoConvert = true, forceUnit } = options

  if (quantity === 0) {
    const unit = forceUnit || getDisplayUnit(quantity, product, autoConvert)
    return showUnit ? `0 ${unit}` : '0'
  }

  // Если принудительная единица задана
  if (forceUnit) {
    const formatted = Number(quantity.toFixed(precision))
    return showUnit ? `${formatted} ${forceUnit}` : formatted.toString()
  }

  // Определяем базовую единицу
  const baseUnit = product.baseUnit

  // Логика автоматической конвертации
  if (autoConvert) {
    // Граммы → Килограммы (если >= 1000г)
    if (baseUnit === 'gram' && quantity >= 1000) {
      const kg = Number((quantity / 1000).toFixed(precision))
      return showUnit ? `${kg} kg` : kg.toString()
    }

    // Миллилитры → Литры (если >= 1000мл)
    if (baseUnit === 'ml' && quantity >= 1000) {
      const liters = Number((quantity / 1000).toFixed(precision))
      return showUnit ? `${liters} L` : liters.toString()
    }
  }

  // Стандартное отображение в базовых единицах
  const formatted = Number(quantity.toFixed(precision))

  if (!showUnit) {
    return formatted.toString()
  }

  // English unit names for UI
  const unitNames: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pcs',
    kg: 'kg',
    L: 'L',
    liter: 'L'
  }

  const displayUnit = unitNames[baseUnit] || baseUnit
  return `${formatted} ${displayUnit}`
}

/**
 * ✅ Получает правильную единицу для отображения (с автоконвертацией)
 */
export function getDisplayUnit(
  quantity: number,
  product: Product | { baseUnit: string; purchaseUnit?: string },
  autoConvert: boolean = true
): string {
  const baseUnit = product.baseUnit

  if (autoConvert) {
    if (baseUnit === 'gram' && quantity >= 1000) return 'kg'
    if (baseUnit === 'ml' && quantity >= 1000) return 'L'
  }

  const unitNames: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pcs',
    kg: 'kg',
    L: 'L',
    liter: 'L'
  }

  return unitNames[baseUnit] || baseUnit
}

/**
 * ✅ Форматирует диапазон количеств для рекомендаций
 * Пример: "Current: 1.5кг • Min: 11.3кг • Suggested: 16.9кг"
 */
export function formatQuantityRange(
  current: number,
  min: number,
  suggested: number,
  product: Product | { baseUnit: string }
): string {
  const currentFormatted = formatQuantityWithUnit(current, product, { precision: 1 })
  const minFormatted = formatQuantityWithUnit(min, product, { precision: 1 })
  const suggestedFormatted = formatQuantityWithUnit(suggested, product, { precision: 1 })

  return `Current: ${currentFormatted} • Min: ${minFormatted} • Suggested: ${suggestedFormatted}`
}

/**
 * ✅ Определяет лучшую единицу для ввода пользователем
 */
export function getBestInputUnit(product: Product): string {
  const baseUnit = product.baseUnit
  const purchaseUnit = (product as any).purchaseUnit

  // For products with grams/ml better to use kg/L for input
  if (baseUnit === 'gram') return 'kg'
  if (baseUnit === 'ml') return 'L'

  // For others use base unit
  const unitNames: Record<string, string> = {
    piece: 'pcs',
    kg: 'kg',
    L: 'L'
  }

  return unitNames[baseUnit] || baseUnit
}

/**
 * ✅ Конвертирует количество в покупочные единицы для заказов
 */
export function convertToPurchaseUnits(
  quantityInBaseUnits: number,
  product: Product
): { quantity: number; unit: string } {
  const purchaseToBaseRatio = (product as any).purchaseToBaseRatio || 1
  const purchaseUnit = (product as any).purchaseUnit || product.unit || 'кг'

  const convertedQuantity = quantityInBaseUnits / purchaseToBaseRatio

  return {
    quantity: Number(convertedQuantity.toFixed(2)),
    unit: purchaseUnit
  }
}

/**
 * ✅ Конвертирует из покупочных единиц в базовые единицы
 */
export function convertToBaseUnits(quantityInPurchaseUnits: number, product: Product): number {
  const purchaseToBaseRatio = (product as any).purchaseToBaseRatio || 1
  return quantityInPurchaseUnits * purchaseToBaseRatio
}

/**
 * ✅ Конвертирует пользовательский ввод в базовые единицы
 */
export function convertUserInputToBaseUnits(
  inputQuantity: number,
  inputUnit: string,
  product: Product
): number {
  const baseUnit = product.baseUnit

  // Conversions from convenient units to base units
  if (inputUnit === 'kg' && baseUnit === 'gram') {
    return inputQuantity * 1000
  }

  if (inputUnit === 'L' && baseUnit === 'ml') {
    return inputQuantity * 1000
  }

  // If units match, return as is
  return inputQuantity
}

/**
 * ✅ Конвертирует из базовых единиц в удобные для отображения пользователю
 */
export function convertBaseUnitsToUserDisplay(
  baseQuantity: number,
  product: Product
): { quantity: number; unit: string } {
  const baseUnit = product.baseUnit

  // Auto conversion to convenient units
  if (baseUnit === 'gram' && baseQuantity >= 1000) {
    return {
      quantity: Number((baseQuantity / 1000).toFixed(2)),
      unit: 'kg'
    }
  }

  if (baseUnit === 'ml' && baseQuantity >= 1000) {
    return {
      quantity: Number((baseQuantity / 1000).toFixed(2)),
      unit: 'L'
    }
  }

  // For other units return as is
  const unitNames: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pcs'
  }

  return {
    quantity: Number(baseQuantity.toFixed(1)),
    unit: unitNames[baseUnit] || baseUnit
  }
}

/**
 * ✅ Валидация количества с учетом единиц
 */
export function validateQuantity(
  quantity: number,
  product: Product,
  inputUnit?: string
): { isValid: boolean; error?: string; convertedQuantity?: number } {
  if (quantity <= 0) {
    return { isValid: false, error: 'Количество должно быть больше 0' }
  }

  // Если продукт штучный, проверяем что количество целое
  if (product.baseUnit === 'piece' && quantity % 1 !== 0) {
    return { isValid: false, error: 'Для штучных товаров количество должно быть целым числом' }
  }

  // Конвертируем в базовые единицы если нужно
  let convertedQuantity = quantity
  if (inputUnit) {
    convertedQuantity = convertUserInputToBaseUnits(quantity, inputUnit, product)
  }

  return { isValid: true, convertedQuantity }
}

/**
 * ✅ Умные предложения количества на основе типичных упаковок
 */
export function getSuggestedQuantities(
  product: Product
): Array<{ quantity: number; display: string }> {
  const baseUnit = product.baseUnit
  const suggestions: number[] = []

  if (baseUnit === 'gram') {
    // Для граммов предлагаем типичные веса в кг
    suggestions.push(...[0.5, 1, 2, 5, 10].map(kg => kg * 1000))
  } else if (baseUnit === 'ml') {
    // Для мл предлагаем типичные объемы в литрах
    suggestions.push(...[0.5, 1, 2, 5, 10].map(l => l * 1000))
  } else if (baseUnit === 'piece') {
    // Для штук предлагаем типичные количества
    suggestions.push(...[6, 12, 24, 48, 100])
  }

  return suggestions.map(qty => ({
    quantity: qty,
    display: formatQuantityWithUnit(qty, product)
  }))
}
