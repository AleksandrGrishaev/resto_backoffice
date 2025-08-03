// src/stores/productsStore/productsService.ts
import { BaseService } from '@/firebase/services/base.service'
import { where, orderBy, QueryConstraint } from 'firebase/firestore'
import type { Product, ProductCategory, CreateProductData, UpdateProductData } from './types'
import { DebugUtils, TimeUtils } from '@/utils'

const MODULE_NAME = 'ProductsService'

export class ProductsService extends BaseService<Product> {
  constructor() {
    super('products')
  }

  /**
   * Получение всех активных продуктов
   */
  async getActiveProducts(): Promise<Product[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Getting active products')
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        orderBy('category', 'asc'),
        orderBy('name', 'asc')
      ]
      return await this.getAll(constraints)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting active products', { error })
      throw error
    }
  }

  /**
   * Получение продуктов по категории
   */
  async getProductsByCategory(category: ProductCategory): Promise<Product[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Getting products by category', { category })
      const constraints: QueryConstraint[] = [
        where('category', '==', category),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      ]
      return await this.getAll(constraints)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting products by category', { error, category })
      throw error
    }
  }

  /**
   * Поиск продуктов по названию
   */
  async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Searching products', { searchTerm })
      // Получаем все продукты и фильтруем локально
      // В будущем можно оптимизировать с помощью Algolia или аналогов
      const allProducts = await this.getActiveProducts()
      return allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error searching products', { error, searchTerm })
      throw error
    }
  }

  /**
   * Создание нового продукта
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating product', { data })

      const now = TimeUtils.getCurrentLocalISO()
      const productData: Omit<Product, 'id'> = {
        ...data,
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now
      }

      const newProduct = await this.create(productData)
      DebugUtils.info(MODULE_NAME, 'Product created successfully', { id: newProduct.id })
      return newProduct
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating product', { error, data })
      throw error
    }
  }

  /**
   * Обновление продукта
   */
  async updateProduct(data: UpdateProductData): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating product', { data })

      const { id, ...updateData } = data
      const updatedData = {
        ...updateData,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      await this.update(id, updatedData)
      DebugUtils.info(MODULE_NAME, 'Product updated successfully', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating product', { error, data })
      throw error
    }
  }

  /**
   * Мягкое удаление продукта (деактивация)
   */
  async deactivateProduct(id: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Deactivating product', { id })

      await this.update(id, {
        isActive: false,
        updatedAt: TimeUtils.getCurrentLocalISO()
      })

      DebugUtils.info(MODULE_NAME, 'Product deactivated successfully', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deactivating product', { error, id })
      throw error
    }
  }

  /**
   * Активация продукта
   */
  async activateProduct(id: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Activating product', { id })

      await this.update(id, {
        isActive: true,
        updatedAt: TimeUtils.getCurrentLocalISO()
      })

      DebugUtils.info(MODULE_NAME, 'Product activated successfully', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error activating product', { error, id })
      throw error
    }
  }

  /**
   * Получение продуктов с низким остатком (будет использоваться в будущем)
   */
  async getLowStockProducts(): Promise<Product[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Getting low stock products')
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        where('minStock', '>', 0),
        orderBy('minStock', 'asc')
      ]
      // В будущем здесь будет логика сравнения с актуальными остатками
      return await this.getAll(constraints)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting low stock products', { error })
      throw error
    }
  }
}

// Экспортируем экземпляр сервиса
export const productsService = new ProductsService()
