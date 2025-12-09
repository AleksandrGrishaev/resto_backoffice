// src/stores/menu/menuStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { categoryService, menuItemService } from './menuService'
import { DebugUtils, generateId } from '@/utils'
import type {
  Category,
  MenuItem,
  MenuState,
  CreateCategoryDto,
  CreateMenuItemDto,
  UpdateCategoryDto,
  UpdateMenuItemDto
} from '@/types/menu'

const MODULE_NAME = 'MenuStore'

/**
 * ✨ NEW: Validate MenuItem based on dishType requirements
 */
function validateMenuItem(data: CreateMenuItemDto | UpdateMenuItemDto): string[] {
  const errors: string[] = []

  // Modifiable dishes must have at least one modifier group
  if (data.dishType === 'modifiable') {
    const modifierGroups = data.modifierGroups || []

    if (modifierGroups.length === 0) {
      errors.push('Modifiable dishes must have at least one modifier group')
    }
  }

  return errors
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

  // Getters - Categories
  const categories = computed(() => state.value.categories)
  const activeCategories = computed(() =>
    state.value.categories
      .filter(c => c.isActive)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  )
  const inactiveCategories = computed(() => state.value.categories.filter(c => !c.isActive))

  // Getters - Menu Items
  const menuItems = computed(() => state.value.menuItems)
  const activeMenuItems = computed(() => state.value.menuItems.filter(i => i.isActive))
  const inactiveMenuItems = computed(() => state.value.menuItems.filter(i => !i.isActive))

  // Getter - Items by category
  const getItemsByCategory = computed(() => {
    return (categoryId: string) => {
      return state.value.menuItems
        .filter(item => item.categoryId === categoryId)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    }
  })

  // Getter - Active items by category
  const getActiveItemsByCategory = computed(() => {
    return (categoryId: string) => {
      return state.value.menuItems
        .filter(item => item.categoryId === categoryId && item.isActive)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    }
  })

  // Getters - Selected category
  const selectedCategory = computed(() => {
    if (!state.value.selectedCategoryId) return null
    return state.value.categories.find(c => c.id === state.value.selectedCategoryId) || null
  })

  const selectedCategoryItems = computed(() => {
    if (!state.value.selectedCategoryId) return []
    return getItemsByCategory.value(state.value.selectedCategoryId)
  })

  // Getters - Statistics
  const categoriesCount = computed(() => state.value.categories.length)
  const activeCategoriesCount = computed(() => activeCategories.value.length)
  const menuItemsCount = computed(() => state.value.menuItems.length)
  const activeMenuItemsCount = computed(() => activeMenuItems.value.length)

  // Getters - State
  const isLoading = computed(() => state.value.loading)
  const error = computed(() => state.value.error)

  // Actions - Categories
  async function fetchCategories() {
    try {
      state.value.loading = true
      state.value.error = null
      state.value.categories = await categoryService.getAllSorted()
      DebugUtils.info(MODULE_NAME, 'Categories loaded', {
        count: state.value.categories.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch categories'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function addCategory(data: CreateCategoryDto) {
    try {
      state.value.loading = true
      state.value.error = null

      const category = await categoryService.createCategory(data)
      state.value.categories.push(category)

      DebugUtils.info(MODULE_NAME, 'Category added', { category })
      return category
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add category'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function updateCategory(id: string, data: UpdateCategoryDto) {
    try {
      state.value.loading = true
      state.value.error = null

      await categoryService.update(id, data)

      // Обновляем локальное состояние
      const index = state.value.categories.findIndex(c => c.id === id)
      if (index !== -1) {
        state.value.categories[index] = {
          ...state.value.categories[index],
          ...data,
          updatedAt: new Date().toISOString()
        }
      }

      DebugUtils.info(MODULE_NAME, 'Category updated', { id, data })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update category'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function deleteCategory(id: string) {
    try {
      state.value.loading = true
      state.value.error = null

      // Проверяем, есть ли позиции в этой категории
      const categoryItems = getItemsByCategory.value(id)
      if (categoryItems.length > 0) {
        throw new Error('Нельзя удалить категорию с позициями. Сначала удалите все позиции.')
      }

      await categoryService.delete(id)
      state.value.categories = state.value.categories.filter(c => c.id !== id)

      // Сбрасываем выбранную категорию если она была удалена
      if (state.value.selectedCategoryId === id) {
        state.value.selectedCategoryId = null
      }

      DebugUtils.info(MODULE_NAME, 'Category deleted', { id })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete category'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function toggleCategoryActive(id: string, isActive: boolean) {
    try {
      await categoryService.toggleActive(id, isActive)

      // Обновляем локальное состояние
      const index = state.value.categories.findIndex(c => c.id === id)
      if (index !== -1) {
        state.value.categories[index].isActive = isActive
        state.value.categories[index].updatedAt = new Date().toISOString()
      }

      DebugUtils.info(MODULE_NAME, 'Category activity toggled', { id, isActive })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle category activity'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    }
  }

  // Actions - Menu Items
  async function fetchMenuItems(categoryId?: string) {
    try {
      state.value.loading = true
      state.value.error = null

      const items = categoryId
        ? await menuItemService.getItemsByCategory(categoryId)
        : await menuItemService.getAllSorted()

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
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function addMenuItem(data: CreateMenuItemDto) {
    try {
      state.value.loading = true
      state.value.error = null

      // ✨ NEW: Validate MenuItem before saving
      const validationErrors = validateMenuItem(data)
      if (validationErrors.length > 0) {
        const errorMessage = `Validation failed: ${validationErrors.join('; ')}`
        state.value.error = errorMessage
        DebugUtils.error(MODULE_NAME, errorMessage, { data, errors: validationErrors })
        throw new Error(errorMessage)
      }

      const menuItem = await menuItemService.createMenuItem(data)
      state.value.menuItems.push(menuItem)

      DebugUtils.info(MODULE_NAME, 'Menu item added', { menuItem })
      return menuItem
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add menu item'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function updateMenuItem(id: string, data: UpdateMenuItemDto) {
    try {
      state.value.loading = true
      state.value.error = null

      // ✨ NEW: Validate MenuItem before saving
      const validationErrors = validateMenuItem(data)
      if (validationErrors.length > 0) {
        const errorMessage = `Validation failed: ${validationErrors.join('; ')}`
        state.value.error = errorMessage
        DebugUtils.error(MODULE_NAME, errorMessage, { id, data, errors: validationErrors })
        throw new Error(errorMessage)
      }

      await menuItemService.updateMenuItem(id, data)

      // Обновляем локальное состояние
      const index = state.value.menuItems.findIndex(i => i.id === id)
      if (index !== -1) {
        state.value.menuItems[index] = {
          ...state.value.menuItems[index],
          ...data,
          updatedAt: new Date().toISOString()
        }
      }

      DebugUtils.info(MODULE_NAME, 'Menu item updated', { id, data })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update menu item'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function deleteMenuItem(id: string) {
    try {
      state.value.loading = true
      state.value.error = null

      await menuItemService.delete(id)
      state.value.menuItems = state.value.menuItems.filter(i => i.id !== id)

      DebugUtils.info(MODULE_NAME, 'Menu item deleted', { id })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete menu item'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function duplicateMenuItem(id: string, newName: string) {
    try {
      state.value.loading = true
      state.value.error = null

      const original = state.value.menuItems.find(item => item.id === id)
      if (!original) {
        throw new Error('Menu item not found')
      }

      // Создаем данные для нового блюда
      const duplicateData: CreateMenuItemDto = {
        categoryId: original.categoryId,
        name: newName,
        description: original.description,
        type: original.type,
        department: original.department,
        dishType: original.dishType,
        variants: original.variants.map(variant => ({
          name: variant.name,
          price: variant.price,
          composition: variant.composition.map(comp => ({ ...comp })), // deep copy
          portionMultiplier: variant.portionMultiplier,
          isActive: variant.isActive,
          sortOrder: variant.sortOrder,
          notes: variant.notes
        })),
        sortOrder: original.sortOrder,
        preparationTime: original.preparationTime,
        allergens: original.allergens ? [...original.allergens] : undefined,
        tags: original.tags ? [...original.tags] : undefined,
        modifierGroups: original.modifierGroups
          ? original.modifierGroups.map(group => ({
              ...group,
              id: generateId(), // новый ID для группы
              // Deep copy targetComponent для replacement модификаторов
              targetComponent: group.targetComponent ? { ...group.targetComponent } : undefined,
              options: group.options.map(option => ({
                ...option,
                id: generateId(), // новый ID для опции
                // Deep copy composition для каждой опции
                composition: option.composition
                  ? option.composition.map(comp => ({ ...comp }))
                  : undefined
              }))
            }))
          : undefined,
        templates: original.templates
          ? original.templates.map(template => ({
              ...template,
              id: generateId(), // новый ID для template
              // Deep copy selectedModifiers
              selectedModifiers: template.selectedModifiers
                ? template.selectedModifiers.map(sel => ({
                    ...sel,
                    optionIds: [...sel.optionIds]
                  }))
                : []
            }))
          : undefined
      }

      const newMenuItem = await addMenuItem(duplicateData)

      DebugUtils.info(MODULE_NAME, 'Menu item duplicated', {
        original: id,
        new: newMenuItem.id
      })

      return newMenuItem
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to duplicate menu item'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function toggleMenuItemActive(id: string, isActive: boolean) {
    try {
      await menuItemService.toggleActive(id, isActive)

      // Обновляем локальное состояние
      const index = state.value.menuItems.findIndex(i => i.id === id)
      if (index !== -1) {
        state.value.menuItems[index].isActive = isActive
        state.value.menuItems[index].updatedAt = new Date().toISOString()
      }

      DebugUtils.info(MODULE_NAME, 'Menu item activity toggled', { id, isActive })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle menu item activity'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    }
  }

  async function moveMenuItem(itemId: string, newCategoryId: string) {
    try {
      state.value.loading = true
      state.value.error = null

      await menuItemService.moveToCategory(itemId, newCategoryId)

      // Обновляем локальное состояние
      const index = state.value.menuItems.findIndex(i => i.id === itemId)
      if (index !== -1) {
        state.value.menuItems[index].categoryId = newCategoryId
        state.value.menuItems[index].updatedAt = new Date().toISOString()
      }

      DebugUtils.info(MODULE_NAME, 'Menu item moved', { itemId, newCategoryId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move menu item'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  // Actions - Utility
  function setSelectedCategory(categoryId: string | null) {
    state.value.selectedCategoryId = categoryId
    DebugUtils.info(MODULE_NAME, 'Selected category changed', { categoryId })
  }

  function clearError() {
    state.value.error = null
  }

  // Инициализация store
  async function initialize() {
    try {
      await Promise.all([fetchCategories(), fetchMenuItems()])
      DebugUtils.info(MODULE_NAME, 'Menu store initialized successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize menu store', error)
    }
  }

  return {
    // State
    state,

    // Getters - Categories
    categories,
    activeCategories,
    inactiveCategories,
    categoriesCount,
    activeCategoriesCount,

    // Getters - Menu Items
    menuItems,
    activeMenuItems,
    inactiveMenuItems,
    menuItemsCount,
    activeMenuItemsCount,
    getItemsByCategory,
    getActiveItemsByCategory,

    // Getters - Selected
    selectedCategory,
    selectedCategoryItems,

    // Getters - State
    isLoading,
    error,

    // Actions - Categories
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,

    // Actions - Menu Items
    fetchMenuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    duplicateMenuItem,
    toggleMenuItemActive,
    moveMenuItem,

    // Actions - Utility
    setSelectedCategory,
    clearError,
    initialize
  }
})
