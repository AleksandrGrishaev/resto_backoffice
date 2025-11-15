// stores/menu/menuService.ts
import type { Category, MenuItem, CreateCategoryDto, CreateMenuItemDto } from './types'
import { generateId, createTimestamp } from './types'
import { mockCategories, mockMenuItems } from './menuMock'
import { DebugUtils } from '@/utils'
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

// In-memory хранилище для разработки
let categoriesStore: Category[] = [...mockCategories]
let menuItemsStore: MenuItem[] = [...mockMenuItems]

// Имитация задержки сети
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

// Helper: Check if Supabase is available
function isSupabaseAvailable(): boolean {
  return ENV.useSupabase && !!supabase
}

export class CategoryService {
  // Получение активных категорий
  async getActiveCategories(): Promise<Category[]> {
    try {
      await delay()
      const result = categoriesStore
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
      // Try Supabase first (if online)
      if (isSupabaseAvailable()) {
        const { data, error } = await supabase
          .from('menu_categories')
          .select('*')
          .order('sort_order', { ascending: true })

        if (!error && data) {
          const categories = data.map(categoryFromSupabase)
          // Cache to localStorage for offline
          localStorage.setItem('menu_categories_cache', JSON.stringify(categories))
          DebugUtils.info(MODULE_NAME, '✅ Categories loaded from Supabase', {
            count: categories.length
          })
          return categories
        } else {
          DebugUtils.error(MODULE_NAME, 'Failed to load from Supabase:', error)
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

      // Final fallback to in-memory
      await delay()
      const result = [...categoriesStore]
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .sort((a, b) => a.name.localeCompare(b.name))

      DebugUtils.debug(MODULE_NAME, '💾 Categories loaded from in-memory', { count: result.length })
      return result
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting sorted categories:', error)
      throw error
    }
  }

  // Получение всех категорий (для внутреннего использования)
  async getAll(): Promise<Category[]> {
    try {
      await delay(100)
      return [...categoriesStore]
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting all categories:', error)
      throw error
    }
  }

  // Получение категории по ID
  async getById(id: string): Promise<Category | null> {
    try {
      await delay(100)
      const category = categoriesStore.find(c => c.id === id) || null
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
      await delay()

      // Устанавливаем sortOrder если не указан
      let sortOrder = data.sortOrder
      if (sortOrder === undefined) {
        const maxOrder =
          categoriesStore.length > 0 ? Math.max(...categoriesStore.map(c => c.sortOrder || 0)) : -1
        sortOrder = maxOrder + 1
      }

      const newCategory: Category = {
        id: generateId('cat'),
        name: data.name,
        description: data.description,
        sortOrder,
        isActive: data.isActive ?? true,
        createdAt: createTimestamp(),
        updatedAt: createTimestamp()
      }

      // Dual-write: Supabase + in-memory
      if (isSupabaseAvailable()) {
        const { error } = await supabase
          .from('menu_categories')
          .insert(categoryToSupabaseInsert(newCategory))

        if (error) {
          console.error('❌ Failed to save category to Supabase:', error)
        } else {
          DebugUtils.info(MODULE_NAME, '✅ Category saved to Supabase', {
            id: newCategory.id,
            name: newCategory.name
          })
        }
      }

      // Always save to in-memory for immediate UI update
      categoriesStore.push(newCategory)
      DebugUtils.info(MODULE_NAME, 'Category created', { category: newCategory })
      return newCategory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating category:', error)
      throw error
    }
  }

  // Обновление категории
  async update(id: string, data: Partial<Category>): Promise<void> {
    try {
      await delay()

      const index = categoriesStore.findIndex(c => c.id === id)
      if (index === -1) {
        throw new Error(`Category with id ${id} not found`)
      }

      const updatedCategory = {
        ...categoriesStore[index],
        ...data,
        updatedAt: createTimestamp()
      }

      // Dual-write: Supabase + in-memory
      if (isSupabaseAvailable()) {
        const { error } = await supabase
          .from('menu_categories')
          .update(categoryToSupabaseUpdate(updatedCategory))
          .eq('id', id)

        if (error) {
          console.error('❌ Failed to update category in Supabase:', error)
        } else {
          DebugUtils.info(MODULE_NAME, '✅ Category updated in Supabase', { id })
        }
      }

      categoriesStore[index] = updatedCategory
      DebugUtils.info(MODULE_NAME, 'Category updated', { id, data })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating category:', error)
      throw error
    }
  }

  // Удаление категории
  async delete(id: string): Promise<void> {
    try {
      await delay()

      const index = categoriesStore.findIndex(c => c.id === id)
      if (index === -1) {
        throw new Error(`Category with id ${id} not found`)
      }

      // Dual-write: Supabase + in-memory
      if (isSupabaseAvailable()) {
        const { error } = await supabase.from('menu_categories').delete().eq('id', id)

        if (error) {
          console.error('❌ Failed to delete category from Supabase:', error)
        } else {
          DebugUtils.info(MODULE_NAME, '✅ Category deleted from Supabase', { id })
        }
      }

      categoriesStore.splice(index, 1)
      DebugUtils.info(MODULE_NAME, 'Category deleted', { id })
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
      await delay()
      const result = menuItemsStore
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
      await delay()
      const result = menuItemsStore
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
      // Try Supabase first (if online)
      if (isSupabaseAvailable()) {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .order('category_id', { ascending: true })
          .order('sort_order', { ascending: true })

        if (!error && data) {
          const menuItems = data.map(menuItemFromSupabase)
          // Cache to localStorage for offline
          localStorage.setItem('menu_items_cache', JSON.stringify(menuItems))
          DebugUtils.info(MODULE_NAME, '✅ Menu items loaded from Supabase', {
            count: menuItems.length
          })
          return menuItems
        } else {
          DebugUtils.error(MODULE_NAME, 'Failed to load menu items from Supabase:', error)
        }
      }

      // Fallback to localStorage cache
      const cached = localStorage.getItem('menu_items_cache')
      if (cached) {
        const menuItems = JSON.parse(cached)
        DebugUtils.info(MODULE_NAME, '📦 Menu items loaded from cache', { count: menuItems.length })
        return menuItems
      }

      // Final fallback to in-memory
      await delay()
      const result = [...menuItemsStore]
        .sort((a, b) => a.categoryId.localeCompare(b.categoryId))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .sort((a, b) => a.name.localeCompare(b.name))

      DebugUtils.debug(MODULE_NAME, '💾 Menu items loaded from in-memory', { count: result.length })
      return result
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting sorted items:', error)
      throw error
    }
  }

  // Получение всех позиций (для внутреннего использования)
  async getAll(): Promise<MenuItem[]> {
    try {
      await delay(100)
      return [...menuItemsStore]
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting all items:', error)
      throw error
    }
  }

  // Получение позиции по ID
  async getById(id: string): Promise<MenuItem | null> {
    try {
      await delay(100)
      const item = menuItemsStore.find(i => i.id === id) || null
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
      await delay()

      // Устанавливаем sortOrder если не указан
      let sortOrder = data.sortOrder
      if (sortOrder === undefined) {
        const categoryItems = menuItemsStore.filter(item => item.categoryId === data.categoryId)
        const maxOrder =
          categoryItems.length > 0
            ? Math.max(...categoryItems.map(item => item.sortOrder || 0))
            : -1
        sortOrder = maxOrder + 1
      }

      // Обрабатываем варианты - добавляем ID если отсутствует
      const processedVariants = data.variants.map((variant, index) => ({
        ...variant,
        id: generateId('var'),
        isActive: variant.isActive ?? true,
        sortOrder: variant.sortOrder ?? index
      }))

      const newMenuItem: MenuItem = {
        id: generateId('item'),
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        isActive: true,
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
        createdAt: createTimestamp(),
        updatedAt: createTimestamp()
      }

      // Dual-write: Supabase + in-memory
      if (isSupabaseAvailable()) {
        const { error } = await supabase
          .from('menu_items')
          .insert(menuItemToSupabaseInsert(newMenuItem))

        if (error) {
          console.error('❌ Failed to save menu item to Supabase:', error)
        } else {
          DebugUtils.info(MODULE_NAME, '✅ Menu item saved to Supabase', {
            id: newMenuItem.id,
            name: newMenuItem.name
          })
        }
      }

      menuItemsStore.push(newMenuItem)
      DebugUtils.info(MODULE_NAME, 'Menu item created', { item: newMenuItem })
      return newMenuItem
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating menu item:', error)
      throw error
    }
  }

  // Обновление позиции меню
  async update(id: string, data: Partial<MenuItem>): Promise<void> {
    try {
      await delay()

      const index = menuItemsStore.findIndex(i => i.id === id)
      if (index === -1) {
        throw new Error(`Menu item with id ${id} not found`)
      }

      // Если обновляем варианты, обрабатываем их
      if (data.variants) {
        data.variants = data.variants.map((variant, index) => ({
          ...variant,
          id: variant.id || generateId('var'),
          sortOrder: variant.sortOrder ?? index
        }))
      }

      const updatedMenuItem = {
        ...menuItemsStore[index],
        ...data,
        updatedAt: createTimestamp()
      }

      // Dual-write: Supabase + in-memory
      if (isSupabaseAvailable()) {
        const { error } = await supabase
          .from('menu_items')
          .update(menuItemToSupabaseUpdate(updatedMenuItem))
          .eq('id', id)

        if (error) {
          console.error('❌ Failed to update menu item in Supabase:', error)
        } else {
          DebugUtils.info(MODULE_NAME, '✅ Menu item updated in Supabase', { id })
        }
      }

      menuItemsStore[index] = updatedMenuItem
      DebugUtils.info(MODULE_NAME, 'Menu item updated', { id, data })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating menu item:', error)
      throw error
    }
  }

  // Удаление позиции меню
  async delete(id: string): Promise<void> {
    try {
      await delay()

      const index = menuItemsStore.findIndex(i => i.id === id)
      if (index === -1) {
        throw new Error(`Menu item with id ${id} not found`)
      }

      // Dual-write: Supabase + in-memory
      if (isSupabaseAvailable()) {
        const { error } = await supabase.from('menu_items').delete().eq('id', id)

        if (error) {
          console.error('❌ Failed to delete menu item from Supabase:', error)
        } else {
          DebugUtils.info(MODULE_NAME, '✅ Menu item deleted from Supabase', { id })
        }
      }

      menuItemsStore.splice(index, 1)
      DebugUtils.info(MODULE_NAME, 'Menu item deleted', { id })
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
      await delay()

      // Получаем новый sortOrder для новой категории
      const categoryItems = menuItemsStore.filter(item => item.categoryId === newCategoryId)
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

// Утилиты для тестирования и сброса данных
export const mockUtils = {
  // Сброс данных к начальному состоянию
  resetData() {
    categoriesStore = [...mockCategories]
    menuItemsStore = [...mockMenuItems]
    DebugUtils.info(MODULE_NAME, 'Mock data reset to initial state')
  },

  // Получение текущего состояния данных
  getCurrentData() {
    return {
      categories: [...categoriesStore],
      menuItems: [...menuItemsStore]
    }
  },

  // Загрузка пользовательских данных
  loadData(categories: Category[], menuItems: MenuItem[]) {
    categoriesStore = [...categories]
    menuItemsStore = [...menuItems]
    DebugUtils.info(MODULE_NAME, 'Custom data loaded', {
      categoriesCount: categories.length,
      itemsCount: menuItems.length
    })
  }
}
