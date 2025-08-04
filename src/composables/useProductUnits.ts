// src/composables/useProductUnits.ts
import { computed } from 'vue'
import type { MeasurementUnit } from '@/types/measurementUnits'
import { PRODUCT_UNITS, getUnitName, isUnitValidForContext } from '@/types/measurementUnits'

/**
 * Простой composable для работы с единицами продуктов
 */
export function useProductUnits() {
  // Получаем опции для селекта
  const unitOptions = computed(() => {
    return PRODUCT_UNITS.map(unit => ({
      title: getUnitName(unit),
      value: unit
    }))
  })

  // Валидация единицы
  const validateUnit = (unit: MeasurementUnit) => {
    const isValid = isUnitValidForContext(unit, 'products')
    return {
      valid: isValid,
      error: isValid ? undefined : `Единица ${unit} не подходит для продуктов`
    }
  }

  return {
    unitOptions,
    validateUnit
  }
}
