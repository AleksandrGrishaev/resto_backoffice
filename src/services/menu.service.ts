import { BaseService } from '@/firebase/services/base.service'
import { where, orderBy, QueryConstraint } from 'firebase/firestore'
import type { Category, MenuItem } from '@/types/menu'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'MenuService'

export class CategoryService extends BaseService<Category> {
  constructor() {
    super('categories')
  }

  // Получение активных категорий
  async getActiveCategories(): Promise<Category[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        orderBy('sortOrder', 'asc'),
        orderBy('name', 'asc')
      ]
      return await this.getAll(constraints)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting active categories:', error)
      throw error
    }
  }
}

export class MenuItemService extends BaseService<MenuItem> {
  constructor() {
    super('menuItems')
  }

  // Получение позиций по категории
  async getItemsByCategory(categoryId: string): Promise<MenuItem[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('categoryId', '==', categoryId),
        orderBy('sortOrder', 'asc'),
        orderBy('name', 'asc')
      ]
      return await this.getAll(constraints)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting items by category:', error)
      throw error
    }
  }

  // Получение активных позиций
  async getActiveItems(): Promise<MenuItem[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        orderBy('categoryId', 'asc'),
        orderBy('sortOrder', 'asc')
      ]
      return await this.getAll(constraints)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting active items:', error)
      throw error
    }
  }
}

// Создаем экземпляры сервисов
export const categoryService = new CategoryService()
export const menuItemService = new MenuItemService()
