// src/stores/preparation/categoryMappers.ts
// Мапперы для конвертации категорий между Supabase и приложением

import type { PreparationCategory, PreparationCategoryDisplay } from './types'

// =============================================
// SUPABASE ROW MAPPERS
// =============================================

export interface PreparationCategoryRow {
  id: string
  name: string
  key: string
  description?: string
  icon: string
  emoji: string
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Конвертирует строку из Supabase в объект PreparationCategory
 */
export function mapPreparationCategoryFromRow(row: PreparationCategoryRow): PreparationCategory {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    description: row.description,
    icon: row.icon,
    emoji: row.emoji,
    color: row.color,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * Конвертирует объект PreparationCategory в строку для Supabase
 */
export function mapPreparationCategoryToRow(
  category: PreparationCategory
): Omit<PreparationCategoryRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: category.name,
    key: category.key,
    description: category.description,
    icon: category.icon,
    emoji: category.emoji,
    color: category.color,
    sort_order: category.sortOrder,
    is_active: category.isActive
  }
}

/**
 * Конвертирует PreparationCategory в PreparationCategoryDisplay
 */
export function mapPreparationCategoryToDisplay(
  category: PreparationCategory
): PreparationCategoryDisplay {
  return {
    key: category.key,
    name: category.name,
    icon: category.icon,
    emoji: category.emoji,
    color: category.color
  }
}

/**
 * Конвертирует массив строк из Supabase в массив PreparationCategory
 */
export function mapPreparationCategoriesFromRows(
  rows: PreparationCategoryRow[]
): PreparationCategory[] {
  return rows.map(mapPreparationCategoryFromRow)
}

/**
 * Конвертирует массив PreparationCategory в массив PreparationCategoryDisplay
 */
export function mapPreparationCategoriesToDisplay(
  categories: PreparationCategory[]
): PreparationCategoryDisplay[] {
  return categories
    .filter(cat => cat.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(mapPreparationCategoryToDisplay)
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Получает категорию по ключу из массива категорий
 */
export function getCategoryByKey(
  categories: PreparationCategoryDisplay[],
  key: string
): PreparationCategoryDisplay | undefined {
  return categories.find(cat => cat.key === key)
}

/**
 * Получает дефолтную категорию (первую в отсортированном списке)
 */
export function getDefaultCategory(
  categories: PreparationCategoryDisplay[]
): PreparationCategoryDisplay | undefined {
  return categories.length > 0 ? categories[0] : undefined
}

/**
 * Создает объект категории для отображения по умолчанию
 */
export function createDefaultCategoryDisplay(): PreparationCategoryDisplay {
  return {
    key: 'other',
    name: 'Other',
    icon: 'mdi-chef-hat',
    emoji: '👨‍🍳',
    color: 'grey-darken-2'
  }
}
