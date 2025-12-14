// src/stores/account/categoryService.ts
import { supabase } from '@/supabase'
import type {
  TransactionCategory,
  CategoryType,
  CreateCategoryDto,
  UpdateCategoryDto
} from './types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'CategoryService'

/**
 * CategoryService - Supabase-based service for transaction categories
 * Provides CRUD operations and caching for expense/income categories
 */
class CategoryService {
  private cache: TransactionCategory[] | null = null
  private cacheTimestamp: number = 0
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get all categories (with caching)
   */
  async getAll(): Promise<TransactionCategory[]> {
    try {
      // Check cache
      const now = Date.now()
      if (this.cache && now - this.cacheTimestamp < this.CACHE_TTL) {
        DebugUtils.debug(MODULE_NAME, 'Returning cached categories', {
          count: this.cache.length
        })
        return this.cache
      }

      DebugUtils.info(MODULE_NAME, 'Fetching categories from Supabase')

      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error

      // Transform snake_case to camelCase
      this.cache = (data || []).map(this.transformFromDb)
      this.cacheTimestamp = now

      DebugUtils.info(MODULE_NAME, 'Categories loaded', { count: this.cache.length })
      return this.cache
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch categories', { error })
      throw error
    }
  }

  /**
   * Get categories by type (expense/income)
   */
  async getByType(type: CategoryType): Promise<TransactionCategory[]> {
    try {
      const categories = await this.getAll()
      return categories.filter(c => c.type === type && c.isActive)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch categories by type', { type, error })
      throw error
    }
  }

  /**
   * Get category by code
   */
  async getByCode(code: string): Promise<TransactionCategory | null> {
    try {
      const categories = await this.getAll()
      return categories.find(c => c.code === code) || null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch category by code', { code, error })
      throw error
    }
  }

  /**
   * Get active categories only
   */
  async getActive(): Promise<TransactionCategory[]> {
    try {
      const categories = await this.getAll()
      return categories.filter(c => c.isActive)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch active categories', { error })
      throw error
    }
  }

  /**
   * Get OPEX categories (operating expenses for P&L)
   */
  async getOpexCategories(): Promise<TransactionCategory[]> {
    try {
      const categories = await this.getAll()
      return categories.filter(c => c.isOpex && c.isActive)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch OPEX categories', { error })
      throw error
    }
  }

  /**
   * Get expense categories (for dropdowns)
   */
  async getExpenseCategories(): Promise<TransactionCategory[]> {
    try {
      const categories = await this.getAll()
      return categories
        .filter(c => c.type === 'expense' && c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch expense categories', { error })
      throw error
    }
  }

  /**
   * Get income categories (for dropdowns)
   */
  async getIncomeCategories(): Promise<TransactionCategory[]> {
    try {
      const categories = await this.getAll()
      return categories
        .filter(c => c.type === 'income' && c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch income categories', { error })
      throw error
    }
  }

  /**
   * Create new category
   */
  async create(dto: CreateCategoryDto): Promise<TransactionCategory> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating category', { dto })

      const { data, error } = await supabase
        .from('transaction_categories')
        .insert({
          code: dto.code,
          name: dto.name,
          type: dto.type,
          is_opex: dto.isOpex || false,
          is_system: false,
          description: dto.description || null
        })
        .select()
        .single()

      if (error) throw error

      this.invalidateCache()
      DebugUtils.info(MODULE_NAME, 'Category created', { id: data.id })

      return this.transformFromDb(data)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create category', { error })
      throw error
    }
  }

  /**
   * Update category
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating category', { id, dto })

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      }
      if (dto.name !== undefined) updateData.name = dto.name
      if (dto.isOpex !== undefined) updateData.is_opex = dto.isOpex
      if (dto.isActive !== undefined) updateData.is_active = dto.isActive
      if (dto.sortOrder !== undefined) updateData.sort_order = dto.sortOrder
      if (dto.description !== undefined) updateData.description = dto.description

      const { error } = await supabase
        .from('transaction_categories')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      this.invalidateCache()
      DebugUtils.info(MODULE_NAME, 'Category updated', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update category', { error })
      throw error
    }
  }

  /**
   * Delete category (only non-system categories)
   */
  async delete(id: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Deleting category', { id })

      // Check if category is system
      const category = await this.getById(id)
      if (category?.isSystem) {
        throw new Error('Cannot delete system category')
      }

      const { error } = await supabase.from('transaction_categories').delete().eq('id', id)

      if (error) throw error

      this.invalidateCache()
      DebugUtils.info(MODULE_NAME, 'Category deleted', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete category', { error })
      throw error
    }
  }

  /**
   * Get category by ID
   */
  async getById(id: string): Promise<TransactionCategory | null> {
    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return this.transformFromDb(data)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch category by ID', { id, error })
      throw error
    }
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive })
  }

  /**
   * Invalidate cache (call after mutations)
   */
  invalidateCache(): void {
    this.cache = null
    this.cacheTimestamp = 0
    DebugUtils.debug(MODULE_NAME, 'Cache invalidated')
  }

  /**
   * Transform database row to TypeScript type
   */
  private transformFromDb(row: Record<string, unknown>): TransactionCategory {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      type: row.type as CategoryType,
      isOpex: row.is_opex as boolean,
      isSystem: row.is_system as boolean,
      isActive: row.is_active as boolean,
      sortOrder: row.sort_order as number,
      description: row.description as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }
  }
}

export const categoryService = new CategoryService()
