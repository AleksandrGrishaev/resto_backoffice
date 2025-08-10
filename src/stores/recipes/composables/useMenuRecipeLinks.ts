// src/stores/recipes/composables/useMenuRecipeLinks.ts - Menu Recipe Links (Minimal)

import { ref } from 'vue'
import { generateId, DebugUtils } from '@/utils'
import type { MenuRecipeLink } from '../types'

const MODULE_NAME = 'useMenuRecipeLinks'

// =============================================
// STATE
// =============================================

// Global state for menu recipe links
const menuRecipeLinks = ref<MenuRecipeLink[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// =============================================
// MAIN COMPOSABLE
// =============================================

export function useMenuRecipeLinks() {
  // =============================================
  // SETUP
  // =============================================

  /**
   * Инициализирует данные связей
   */
  async function initializeMenuRecipeLinks(initialData: MenuRecipeLink[] = []): Promise<void> {
    try {
      loading.value = true
      error.value = null

      menuRecipeLinks.value = [...initialData]

      DebugUtils.info(MODULE_NAME, '✅ Menu recipe links initialized', {
        total: menuRecipeLinks.value.length
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize menu recipe links'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  /**
   * Получает все связи
   */
  function getAllMenuRecipeLinks(): MenuRecipeLink[] {
    return [...menuRecipeLinks.value]
  }

  /**
   * Получает связь по ID
   */
  function getMenuRecipeLinkById(id: string): MenuRecipeLink | null {
    return menuRecipeLinks.value.find(item => item.id === id) || null
  }

  /**
   * Получает связи по элементу меню
   */
  function getMenuRecipeLinksByMenuItem(menuItemId: string, variantId?: string): MenuRecipeLink[] {
    return menuRecipeLinks.value.filter(link => {
      const matchesMenuItem = link.menuItemId === menuItemId
      const matchesVariant = variantId ? link.variantId === variantId : !link.variantId
      return matchesMenuItem && matchesVariant
    })
  }

  /**
   * Получает связи по рецепту
   */
  function getMenuRecipeLinksByRecipe(recipeId: string): MenuRecipeLink[] {
    return menuRecipeLinks.value.filter(link => link.recipeId === recipeId)
  }

  /**
   * Создает новую связь
   */
  async function createMenuRecipeLink(
    menuItemId: string,
    recipeId: string,
    variantId?: string,
    portionMultiplier: number = 1
  ): Promise<MenuRecipeLink> {
    try {
      loading.value = true
      error.value = null

      const link: MenuRecipeLink = {
        id: generateId(),
        menuItemId,
        variantId,
        recipeId,
        portionMultiplier,
        modifications: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      menuRecipeLinks.value.push(link)

      DebugUtils.info(MODULE_NAME, '✅ Menu recipe link created', {
        id: link.id,
        menuItemId,
        recipeId,
        variantId
      })

      return link
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create menu recipe link'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Обновляет связь
   */
  async function updateMenuRecipeLink(
    id: string,
    data: Partial<MenuRecipeLink>
  ): Promise<MenuRecipeLink> {
    try {
      loading.value = true
      error.value = null

      const index = menuRecipeLinks.value.findIndex(item => item.id === id)
      if (index === -1) {
        throw new Error('Menu recipe link not found')
      }

      const updatedLink = {
        ...menuRecipeLinks.value[index],
        ...data,
        updatedAt: new Date().toISOString()
      }

      menuRecipeLinks.value[index] = updatedLink

      DebugUtils.info(MODULE_NAME, '✅ Menu recipe link updated', {
        id,
        changes: Object.keys(data)
      })

      return updatedLink
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update menu recipe link'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err, id, data })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Удаляет связь
   */
  async function deleteMenuRecipeLink(id: string): Promise<void> {
    try {
      loading.value = true
      error.value = null

      const index = menuRecipeLinks.value.findIndex(item => item.id === id)
      if (index === -1) {
        throw new Error('Menu recipe link not found')
      }

      menuRecipeLinks.value.splice(index, 1)

      DebugUtils.info(MODULE_NAME, '✅ Menu recipe link deleted', { id })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete menu recipe link'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err, id })
      throw err
    } finally {
      loading.value = false
    }
  }

  // =============================================
  // UTILITIES
  // =============================================

  /**
   * Очищает ошибки
   */
  function clearError(): void {
    error.value = null
  }

  // =============================================
  // RETURN COMPOSABLE
  // =============================================

  return {
    // State
    menuRecipeLinks,
    loading,
    error,

    // Setup
    initializeMenuRecipeLinks,

    // CRUD
    getAllMenuRecipeLinks,
    getMenuRecipeLinkById,
    getMenuRecipeLinksByMenuItem,
    getMenuRecipeLinksByRecipe,
    createMenuRecipeLink,
    updateMenuRecipeLink,
    deleteMenuRecipeLink,

    // Utilities
    clearError
  }
}
