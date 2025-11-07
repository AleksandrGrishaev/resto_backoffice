import type { BaseEntity } from '@/types/base'
import type { DecomposedItem } from '../types'
import type { MenuComposition } from '@/stores/menu/types'

/**
 * Recipe Write-off Item
 * Элемент списания (продукт или полуфабрикат)
 */
export interface RecipeWriteOffItem {
  type: 'product' | 'preparation'
  itemId: string
  itemName: string

  // Quantity data
  quantityPerPortion: number // Количество на 1 порцию
  totalQuantity: number // quantityPerPortion * soldQuantity
  unit: string // gram, ml, piece

  // Cost data
  costPerUnit: number // Себестоимость за единицу
  totalCost: number // totalQuantity * costPerUnit

  // Batch tracking (для audit trail)
  batchIds: string[] // Партии, из которых было списание (FIFO)
}

/**
 * Recipe Write-off
 * Автоматическое списание на основе продаж
 */
export interface RecipeWriteOff extends BaseEntity {
  // Link to sale
  salesTransactionId: string
  menuItemId: string
  variantId: string
  recipeId?: string

  // Recipe data
  portionSize: number // Размер порции рецепта
  soldQuantity: number // Количество проданных порций

  // Ingredients written off
  writeOffItems: RecipeWriteOffItem[]

  // Decomposed items (flattened to final products)
  decomposedItems: DecomposedItem[]

  // Original composition (for reference)
  originalComposition: MenuComposition[]

  // Operation data
  department: 'kitchen' | 'bar'
  operationType: 'auto_sales_writeoff'
  performedAt: string // ISO timestamp
  performedBy: string // 'system' или имя пользователя

  // Storage operation link (audit trail)
  storageOperationId?: string // Link to StorageOperation
}

/**
 * Write-off Filters
 * Фильтры для истории списаний
 */
export interface WriteOffFilters {
  dateFrom?: string // ISO date
  dateTo?: string // ISO date
  menuItemId?: string
  department?: 'kitchen' | 'bar'
  operationType?: 'manual' | 'auto_sales_writeoff' | 'all'
}

/**
 * Write-off Summary
 * Краткая статистика списаний
 */
export interface WriteOffSummary {
  totalWriteOffs: number
  totalCost: number
  totalItems: number

  // By department
  byDepartment: {
    kitchen: {
      count: number
      cost: number
    }
    bar: {
      count: number
      cost: number
    }
  }

  // By type
  byType: {
    manual: {
      count: number
      cost: number
    }
    auto_sales_writeoff: {
      count: number
      cost: number
    }
  }
}
