// stores/menu/menuService.ts
import type { Category, MenuItem, CreateCategoryDto, CreateMenuItemDto } from './types'
import { createTimestamp } from './types'
import { generateId } from '@/utils/id'
import { DebugUtils, executeSupabaseQuery } from '@/utils'
import { ENV } from '@/config/environment'
import { supabase } from '@/supabase/client'
import {
  categoryToSupabaseInsert,
  categoryToSupabaseUpdate,
  categoryFromSupabase,
  menuItemToSupabaseInsert,
  menuItemToSupabaseUpdate,
  menuItemFromSupabase
} from './supabaseMappers'

const MODULE_NAME = 'MenuService'

// Helper: Check if Supabase is available
function isSupabaseAvailable(): boolean {
  return ENV.useSupabase && !!supabase
}

export class CategoryService {
  // Получение активных категорий
  async getActiveCategories(): Promise<Category[]> {
    try {
      // Get all categories from Supabase
      const allCategories = await this.getAllSorted()

      // Filter active categories
      const result = allCategories
        .filter(category => category.isActive)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .sort((a, b) => a.name.localeCompare(b.name))

      DebugUtils.info(MODULE_NAME, 'Active categories loaded', { count: result.length })
      return result
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting active categories:', error)
      throw error
    }
  }

  // Получение всех категорий с сортировкой
  async getAllSorted(): Promise<Category[]> {
    try {
      // Try Supabase first (if online) with retry logic
      if (isSupabaseAvailable()) {
        try {
          const data = await executeSupabaseQuery(
            supabase.from('menu_categories').select('*').order('sort_order', { ascending: true }),
            `${MODULE_NAME}.getAllSorted`
          )

          const categories = data.map(categoryFromSupabase)
          // Cache to localStorage for offline
          localStorage.setItem('menu_categories_cache', JSON.stringify(categories))
          DebugUtils.info(MODULE_NAME, '✅ Categories loaded from Supabase', {
            count: categories.length
          })
          return categories
        } catch (error) {
          // All retries failed - fallback to cache
          DebugUtils.warn(MODULE_NAME, '⚠️ Supabase request failed after retries, using cache', {
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Fallback to localStorage cache
      const cached = localStorage.getItem('menu_categories_cache')
      if (cached) {
        const categories = JSON.parse(cached)
        DebugUtils.info(MODULE_NAME, '📦 Categories loaded from cache', {
          count: categories.length
        })
        return categories
      }

      // No data available - return empty array
      DebugUtils.warn(MODULE_NAME, '⚠️ No categories found (Supabase offline and no cache)')
      return []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting sorted categories:', error)
      throw error
    }
  }

  // Получение всех категорий (для внутреннего использования)
  async getAll(): Promise<Category[]> {
    try {
      // Use getAllSorted() which handles Supabase + cache
      return await this.getAllSorted()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting all categories:', error)
      throw error
    }
  }

  // Получение категории по ID
  async getById(id: string): Promise<Category | null> {
    try {
      const allCategories = await this.getAllSorted()
      const category = allCategories.find(c => c.id === id) || null
      DebugUtils.info(MODULE_NAME, 'Category by ID', { id, found: !!category })
      return category
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting category by ID:', error)
      throw error
    }
  }

  // Создание категории с валидацией
  async createCategory(data: CreateCategoryDto): Promise<Category> {
    try {
      // Устанавливаем sortOrder если не указан
      let sortOrder = data.sortOrder
      if (sortOrder === undefined) {
        const existingCategories = await this.getAllSorted()
        const maxOrder =
          existingCategories.length > 0
            ? Math.max(...existingCategories.map(c => c.sortOrder || 0))
            : -1
        sortOrder = maxOrder + 1
      }

      const newCategory: Category = {
        id: generateId(),
        name: data.name,
        description: data.description,
        sortOrder,
        isActive: data.isActive ?? true,
        createdAt: createTimestamp(),
        updatedAt: createTimestamp()
      }

      // Save to Supabase only (Backoffice is online-first)
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot create category.')
      }

      const { error } = await supabase
        .from('menu_categories')
        .insert(categoryToSupabaseInsert(newCategory))

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to save category to Supabase:', error)
        throw new Error(`Failed to create category: ${error.message}`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Category saved to Supabase', {
        id: newCategory.id,
        name: newCategory.name
      })

      // Invalidate cache to force fresh read
      localStorage.removeItem('menu_categories_cache')

      return newCategory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating category:', error)
      throw error
    }
  }

  // Обновление категории
  async update(id: string, data: Partial<Category>): Promise<void> {
    try {
      // Get existing category first
      const existingCategory = await this.getById(id)
      if (!existingCategory) {
        throw new Error(`Category with id ${id} not found`)
      }

      const updatedCategory = {
        ...existingCategory,
        ...data,
        updatedAt: createTimestamp()
      }

      // Update Supabase only (Backoffice is online-first)
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot update category.')
      }

      const { error } = await supabase
        .from('menu_categories')
        .update(categoryToSupabaseUpdate(updatedCategory))
        .eq('id', id)

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to update category in Supabase:', error)
        throw new Error(`Failed to update category: ${error.message}`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Category updated in Supabase', { id })

      // Invalidate cache to force fresh read
      localStorage.removeItem('menu_categories_cache')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating category:', error)
      throw error
    }
  }

  // Удаление категории
  async delete(id: string): Promise<void> {
    try {
      // Verify category exists
      const existingCategory = await this.getById(id)
      if (!existingCategory) {
        throw new Error(`Category with id ${id} not found`)
      }

      // Delete from Supabase only (Backoffice is online-first)
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot delete category.')
      }

      const { error } = await supabase.from('menu_categories').delete().eq('id', id)

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to delete category from Supabase:', error)
        throw new Error(`Failed to delete category: ${error.message}`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Category deleted from Supabase', { id })

      // Invalidate cache to force fresh read
      localStorage.removeItem('menu_categories_cache')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deleting category:', error)
      throw error
    }
  }

  // Обновление порядка сортировки категорий
  async updateCategorySortOrder(categoryId: string, newSortOrder: number): Promise<void> {
    try {
      await this.update(categoryId, { sortOrder: newSortOrder })
      DebugUtils.info(MODULE_NAME, 'Category sort order updated', { categoryId, newSortOrder })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating category sort order:', error)
      throw error
    }
  }

  // Переключение активности категории
  async toggleActive(categoryId: string, isActive: boolean): Promise<void> {
    try {
      await this.update(categoryId, { isActive })
      DebugUtils.info(MODULE_NAME, 'Category activity toggled', { categoryId, isActive })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error toggling category activity:', error)
      throw error
    }
  }
}

export class MenuItemService {
  // Получение позиций по категории
  async getItemsByCategory(categoryId: string): Promise<MenuItem[]> {
    try {
      const allItems = await this.getAllSorted()
      const result = allItems
        .filter(item => item.categoryId === categoryId)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .sort((a, b) => a.name.localeCompare(b.name))

      DebugUtils.info(MODULE_NAME, 'Items by category loaded', { categoryId, count: result.length })
      return result
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting items by category:', error)
      throw error
    }
  }

  // Получение активных позиций
  async getActiveItems(): Promise<MenuItem[]> {
    try {
      const allItems = await this.getAllSorted()
      const result = allItems
        .filter(item => item.isActive)
        .sort((a, b) => a.categoryId.localeCompare(b.categoryId))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

      DebugUtils.info(MODULE_NAME, 'Active items loaded', { count: result.length })
      return result
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting active items:', error)
      throw error
    }
  }

  // Получение всех позиций с сортировкой
  async getAllSorted(): Promise<MenuItem[]> {
    try {
      // Try Supabase first (if online) with retry logic
      if (isSupabaseAvailable()) {
        try {
          const data = await executeSupabaseQuery(
            supabase
              .from('menu_items')
              .select('*')
              .order('category_id', { ascending: true })
              .order('sort_order', { ascending: true }),
            `${MODULE_NAME}.MenuItemService.getAllSorted`
          )

          const menuItems = data.map(menuItemFromSupabase)
          // Cache to localStorage for offline
          localStorage.setItem('menu_items_cache', JSON.stringify(menuItems))
          DebugUtils.info(MODULE_NAME, '✅ Menu items loaded from Supabase', {
            count: menuItems.length
          })
          return menuItems
        } catch (error) {
          // All retries failed - fallback to cache
          DebugUtils.warn(MODULE_NAME, '⚠️ Supabase request failed after retries, using cache', {
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Fallback to localStorage cache
      const cached = localStorage.getItem('menu_items_cache')
      if (cached) {
        const menuItems = JSON.parse(cached)
        DebugUtils.info(MODULE_NAME, '📦 Menu items loaded from cache', { count: menuItems.length })
        return menuItems
      }

      // No data available - return empty array
      DebugUtils.warn(MODULE_NAME, '⚠️ No menu items found (Supabase offline and no cache)')
      return []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting sorted items:', error)
      throw error
    }
  }

  // Получение всех позиций (для внутреннего использования)
  async getAll(): Promise<MenuItem[]> {
    try {
      // Use getAllSorted() which handles Supabase + cache
      return await this.getAllSorted()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting all items:', error)
      throw error
    }
  }

  // Получение позиции по ID
  async getById(id: string): Promise<MenuItem | null> {
    try {
      const allItems = await this.getAllSorted()
      const item = allItems.find(i => i.id === id) || null
      DebugUtils.info(MODULE_NAME, 'Item by ID', { id, found: !!item })
      return item
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting item by ID:', error)
      throw error
    }
  }

  // Создание позиции меню с валидацией
  async createMenuItem(data: CreateMenuItemDto): Promise<MenuItem> {
    try {
      // Устанавливаем sortOrder если не указан
      let sortOrder = data.sortOrder
      if (sortOrder === undefined) {
        const allItems = await this.getAllSorted()
        const categoryItems = allItems.filter(item => item.categoryId === data.categoryId)
        const maxOrder =
          categoryItems.length > 0
            ? Math.max(...categoryItems.map(item => item.sortOrder || 0))
            : -1
        sortOrder = maxOrder + 1
      }

      // Обрабатываем варианты - добавляем ID если отсутствует
      const processedVariants = data.variants.map((variant, index) => ({
        ...variant,
        id: generateId(),
        isActive: variant.isActive ?? true,
        sortOrder: variant.sortOrder ?? index
      }))

      const now = createTimestamp()
      const status = data.status || 'active'

      const newMenuItem: MenuItem = {
        id: generateId(),
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        isActive: status === 'active',
        status,
        type: data.type,
        department: data.department, // ✨ NEW
        dishType: data.dishType, // ✨ NEW
        variants: processedVariants,
        sortOrder,
        preparationTime: data.preparationTime,
        allergens: data.allergens || [],
        tags: data.tags || [],
        modifierGroups: data.modifierGroups || [], // ✨ NEW
        templates: data.templates || [], // ✨ NEW
        lastEditedAt: now,
        createdAt: now,
        updatedAt: now
      }

      // Save to Supabase only (Backoffice is online-first)
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot create menu item.')
      }

      const { error } = await supabase
        .from('menu_items')
        .insert(menuItemToSupabaseInsert(newMenuItem))

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to save menu item to Supabase:', error)
        throw new Error(`Failed to create menu item: ${error.message}`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Menu item saved to Supabase', {
        id: newMenuItem.id,
        name: newMenuItem.name
      })

      // Invalidate cache to force fresh read
      localStorage.removeItem('menu_items_cache')

      return newMenuItem
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating menu item:', error)
      throw error
    }
  }

  // Обновление позиции меню
  async update(id: string, data: Partial<MenuItem>): Promise<void> {
    try {
      // Get existing menu item first
      const existingItem = await this.getById(id)
      if (!existingItem) {
        throw new Error(`Menu item with id ${id} not found`)
      }

      // Если обновляем варианты, обрабатываем их
      if (data.variants) {
        data.variants = data.variants.map((variant, index) => ({
          ...variant,
          id: variant.id || generateId(),
          sortOrder: variant.sortOrder ?? index
        }))
      }

      const now = createTimestamp()
      const updatedMenuItem = {
        ...existingItem,
        ...data,
        // Sync isActive ↔ status
        ...(data.status ? { isActive: data.status === 'active' } : {}),
        ...(data.isActive !== undefined && !data.status
          ? { status: data.isActive ? 'active' : 'draft' }
          : {}),
        lastEditedAt: now,
        updatedAt: now
      } as MenuItem

      // Update Supabase only (Backoffice is online-first)
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot update menu item.')
      }

      const { error } = await supabase
        .from('menu_items')
        .update(menuItemToSupabaseUpdate(updatedMenuItem))
        .eq('id', id)

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to update menu item in Supabase:', error)
        throw new Error(`Failed to update menu item: ${error.message}`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Menu item updated in Supabase', { id })

      // Invalidate cache to force fresh read
      localStorage.removeItem('menu_items_cache')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating menu item:', error)
      throw error
    }
  }

  // Удаление позиции меню
  async delete(id: string): Promise<void> {
    try {
      // Verify menu item exists
      const existingItem = await this.getById(id)
      if (!existingItem) {
        throw new Error(`Menu item with id ${id} not found`)
      }

      // Delete from Supabase only (Backoffice is online-first)
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot delete menu item.')
      }

      const { error } = await supabase.from('menu_items').delete().eq('id', id)

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to delete menu item from Supabase:', error)
        throw new Error(`Failed to delete menu item: ${error.message}`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Menu item deleted from Supabase', { id })

      // Invalidate cache to force fresh read
      localStorage.removeItem('menu_items_cache')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deleting menu item:', error)
      throw error
    }
  }

  // Обновление позиции меню (алиас для совместимости)
  async updateMenuItem(id: string, data: Partial<MenuItem>): Promise<void> {
    return this.update(id, data)
  }

  // Обновление порядка сортировки позиций в категории
  async updateItemSortOrder(itemId: string, newSortOrder: number): Promise<void> {
    try {
      await this.update(itemId, { sortOrder: newSortOrder })
      DebugUtils.info(MODULE_NAME, 'Menu item sort order updated', { itemId, newSortOrder })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating item sort order:', error)
      throw error
    }
  }

  // Переключение активности позиции
  async toggleActive(itemId: string, isActive: boolean): Promise<void> {
    try {
      await this.update(itemId, { isActive })
      DebugUtils.info(MODULE_NAME, 'Menu item activity toggled', { itemId, isActive })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error toggling item activity:', error)
      throw error
    }
  }

  // Перемещение позиции в другую категорию
  async moveToCategory(itemId: string, newCategoryId: string): Promise<void> {
    try {
      // Получаем новый sortOrder для новой категории
      const allItems = await this.getAllSorted()
      const categoryItems = allItems.filter(item => item.categoryId === newCategoryId)
      const newSortOrder =
        categoryItems.length > 0
          ? Math.max(...categoryItems.map(item => item.sortOrder || 0)) + 1
          : 0

      await this.update(itemId, {
        categoryId: newCategoryId,
        sortOrder: newSortOrder
      })

      DebugUtils.info(MODULE_NAME, 'Menu item moved to category', { itemId, newCategoryId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error moving item to category:', error)
      throw error
    }
  }
}

// Создаем экземпляры сервисов
export const categoryService = new CategoryService()
export const menuItemService = new MenuItemService()
