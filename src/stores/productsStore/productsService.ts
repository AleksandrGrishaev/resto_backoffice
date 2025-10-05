// src/stores/productsStore/productsService.ts - ФИНАЛЬНАЯ упрощенная версия

import { BaseService } from '@/firebase/services/base.service'
import { where, orderBy, QueryConstraint } from 'firebase/firestore'
import type {
  Product,
  ProductCategory,
  CreateProductData,
  UpdateProductData,
  PackageOption,
  UpdatePackageOptionDto
} from './types'
import { DebugUtils, TimeUtils } from '@/utils'

const MODULE_NAME = 'ProductsService'

export class ProductsService extends BaseService<Product> {
  constructor() {
    super('products')
  }

  // =============================================
  // ОСНОВНЫЕ МЕТОДЫ ПРОДУКТОВ
  // =============================================

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
      const allProducts = await this.getActiveProducts()
      return allProducts.filter(
        product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.nameEn?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error searching products', { error, searchTerm })
      throw error
    }
  }

  /**
   * Создание нового продукта (без упаковок - создаются в store)
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating product', { data })

      // ✅ ADD VALIDATION
      if (!data.usedInDepartments || data.usedInDepartments.length === 0) {
        throw new Error('Product must be used in at least one department')
      }

      const now = TimeUtils.getCurrentLocalISO()
      const productData: Omit<Product, 'id'> = {
        ...data,
        packageOptions: [],
        isActive: data.isActive ?? true,
        canBeSold: data.canBeSold ?? false,
        usedInDepartments: data.usedInDepartments, // ✅ ADD THIS
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

      // ✅ ADD VALIDATION if usedInDepartments is being updated
      if (data.usedInDepartments !== undefined && data.usedInDepartments.length === 0) {
        throw new Error('Product must be used in at least one department')
      }

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
   * Получение продуктов с низким остатком
   */
  async getLowStockProducts(): Promise<Product[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Getting low stock products')
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        where('minStock', '>', 0),
        orderBy('minStock', 'asc')
      ]
      return await this.getAll(constraints)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting low stock products', { error })
      throw error
    }
  }

  // =============================================
  // МЕТОДЫ РАБОТЫ С УПАКОВКАМИ
  // =============================================

  /**
   * Добавление новой упаковки к продукту
   */
  async addPackageOption(packageData: PackageOption): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Adding package option', { packageData })

      const product = await this.getById(packageData.productId)
      if (!product) {
        throw new Error(`Product not found: ${packageData.productId}`)
      }

      const updatedPackages = [...product.packageOptions, packageData]

      await this.update(packageData.productId, {
        packageOptions: updatedPackages,
        updatedAt: TimeUtils.getCurrentLocalISO()
      })

      DebugUtils.info(MODULE_NAME, 'Package option added', {
        packageId: packageData.id,
        productId: packageData.productId
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error adding package option', { error, packageData })
      throw error
    }
  }

  /**
   * Обновление упаковки
   */
  async updatePackageOption(data: UpdatePackageOptionDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating package option', { data })

      const allProducts = await this.getAll()
      const product = allProducts.find(p => p.packageOptions.some(pkg => pkg.id === data.id))

      if (!product) {
        throw new Error(`Package not found: ${data.id}`)
      }

      const updatedPackages = product.packageOptions.map(pkg =>
        pkg.id === data.id ? { ...pkg, ...data, updatedAt: TimeUtils.getCurrentLocalISO() } : pkg
      )

      await this.update(product.id, {
        packageOptions: updatedPackages,
        updatedAt: TimeUtils.getCurrentLocalISO()
      })

      DebugUtils.info(MODULE_NAME, 'Package option updated', { packageId: data.id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating package option', { error, data })
      throw error
    }
  }

  /**
   * Удаление упаковки
   */
  async deletePackageOption(packageId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Deleting package option', { packageId })

      const allProducts = await this.getAll()
      const product = allProducts.find(p => p.packageOptions.some(pkg => pkg.id === packageId))

      if (!product) {
        throw new Error(`Package not found: ${packageId}`)
      }

      if (product.packageOptions.length <= 1) {
        throw new Error('Cannot delete the last package option')
      }

      const updatedPackages = product.packageOptions.filter(pkg => pkg.id !== packageId)

      let updatedRecommendedId = product.recommendedPackageId
      if (product.recommendedPackageId === packageId) {
        updatedRecommendedId = updatedPackages[0]?.id
      }

      await this.update(product.id, {
        packageOptions: updatedPackages,
        recommendedPackageId: updatedRecommendedId,
        updatedAt: TimeUtils.getCurrentLocalISO()
      })

      DebugUtils.info(MODULE_NAME, 'Package option deleted', {
        packageId,
        productId: product.id,
        remainingPackages: updatedPackages.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deleting package option', { error, packageId })
      throw error
    }
  }

  /**
   * Установка рекомендуемой упаковки
   */
  async setRecommendedPackage(productId: string, packageId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Setting recommended package', { productId, packageId })

      const product = await this.getById(productId)
      if (!product) {
        throw new Error(`Product not found: ${productId}`)
      }

      const packageExists = product.packageOptions.some(pkg => pkg.id === packageId)
      if (!packageExists) {
        throw new Error(`Package not found in product: ${packageId}`)
      }

      await this.update(productId, {
        recommendedPackageId: packageId,
        updatedAt: TimeUtils.getCurrentLocalISO()
      })

      DebugUtils.info(MODULE_NAME, 'Recommended package set', { productId, packageId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error setting recommended package', { error })
      throw error
    }
  }
}

// Экспортируем экземпляр сервиса
export const productsService = new ProductsService()
