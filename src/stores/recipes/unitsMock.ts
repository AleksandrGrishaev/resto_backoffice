// src/stores/recipes/unitsMock.ts
import type { Unit } from './types'
import { MEASUREMENT_UNITS } from '@/types/measurementUnits'

const now = new Date().toISOString()

// Конвертируем нашу систему единиц в формат для UnitService
export const mockUnits: Unit[] = Object.entries(MEASUREMENT_UNITS).map(([key, unitInfo]) => ({
  id: `unit-${key}`,
  name: unitInfo.name,
  shortName: unitInfo.shortName,
  type: unitInfo.type === 'culinary' ? 'volume' : unitInfo.type, // приводим к нужному формату
  baseUnit: unitInfo.baseUnit,
  conversionRate: unitInfo.conversionRate
}))

// Утилиты для работы с mock единицами
export function findUnitByShortName(shortName: string): Unit | undefined {
  return mockUnits.find(unit => unit.shortName === shortName)
}

export function getUnitsByType(type: 'weight' | 'volume' | 'piece'): Unit[] {
  return mockUnits.filter(unit => unit.type === type)
}

export function getMockUnitOptions() {
  return mockUnits.map(unit => ({
    value: unit.shortName,
    label: `${unit.name} (${unit.shortName})`,
    type: unit.type
  }))
}
