import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { categoryService, menuItemService } from '@/services/menu.service'
import { DebugUtils } from '@/utils'
import type { Category, MenuItem } from '@/types/menu'
import type { BaseEntity } from '@/types/common'

const MODULE_NAME = 'MenuStore'

interface MenuState {
  categories: Category[]
  menuItems: MenuItem[]
  loading: boolean
  selectedCategoryId: string | null
  error: string | null
}

export const useMenuStore = defineStore('menu', () => {
  // State
  const state = ref<MenuState>({
    categories: [],
    menuItems: [],
    loading: false,
    selectedCategoryId: null,
    error: null
  })

  // Getters
  const activeCategories = computed(() => state.value.categories.filter(c => c.isActive))

  const activeMenuItems = computed(() => state.value.menuItems.filter(i => i.isActive))

  const menuItemsByCategory = computed(() => {
    if (!state.value.selectedCategoryId) return []
    return state.value.menuItems.filter(item => item.categoryId === state.value.selectedCategoryId)
  })

  // Actions
  async function fetchCategories() {
    try {
      state.value.loading = true
      state.value.categories = await categoryService.getAll([])
      DebugUtils.info(MODULE_NAME, 'Categories loaded', { count: state.value.categories.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch categories'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
    } finally {
      state.value.loading = false
    }
  }

  async function addCategory(data: Omit<Category, keyof BaseEntity>) {
    try {
      state.value.loading = true
      const category = await categoryService.create(data)
      state.value.categories.push(category)
      DebugUtils.info(MODULE_NAME, 'Category added', { category })
      return category
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add category'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function updateCategory(id: string, data: Partial<Category>) {
    try {
      state.value.loading = true
      await categoryService.update(id, data)
      const index = state.value.categories.findIndex(c => c.id === id)
      if (index !== -1) {
        state.value.categories[index] = {
          ...state.value.categories[index],
          ...data
        }
      }
      DebugUtils.info(MODULE_NAME, 'Category updated', { id, data })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update category'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function deleteCategory(id: string) {
    try {
      state.value.loading = true
      await categoryService.delete(id)
      state.value.categories = state.value.categories.filter(c => c.id !== id)
      DebugUtils.info(MODULE_NAME, 'Category deleted', { id })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete category'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function fetchMenuItems(categoryId?: string) {
    try {
      state.value.loading = true
      const items = categoryId
        ? await menuItemService.getItemsByCategory(categoryId)
        : await menuItemService.getAll([])

      state.value.menuItems = items
      if (categoryId) {
        state.value.selectedCategoryId = categoryId
      }

      DebugUtils.info(MODULE_NAME, 'Menu items loaded', {
        count: items.length,
        categoryId
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch menu items'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
    } finally {
      state.value.loading = false
    }
  }

  return {
    state,
    activeCategories,
    activeMenuItems,
    menuItemsByCategory,
    fetchCategories,
    fetchMenuItems,
    addCategory,
    updateCategory,
    deleteCategory
  }
})
