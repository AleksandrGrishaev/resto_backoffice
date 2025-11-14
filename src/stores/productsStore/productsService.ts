// src/stores/productsStore/productsService.ts - Legacy service without Firebase

import { ref } from 'vue'
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

/**
 * Legacy ProductsService for backward compatibility
 * Works with in-memory data (ref), no Firebase
 * In future, will delegate to Supabase or API
 */
export class ProductsService {
  private products = ref<Product[]>([])

  constructor(initialData: Product[] = []) {
    this.products.value = initialData
  }

  // =============================================
  // ОСНОВНЫЕ МЕТОДЫ ПРОДУКТОВ
  // =============================================

  async getAll(): Promise<Product[]> {
    return [...this.products.value]
  }

  async getById(id: string): Promise<Product | null> {
    return this.products.value.find(p => p.id === id) || null
  }

  async getActiveProducts(): Promise<Product[]> {
    return this.products.value
      .filter(p => p.isActive)
      .sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category)
        }
        return a.name.localeCompare(b.name)
      })
  }

  async getProductsByCategory(category: ProductCategory): Promise<Product[]> {
    return this.products.value
      .filter(p => p.category === category && p.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async searchProducts(searchTerm: string): Promise<Product[]> {
    const term = searchTerm.toLowerCase()
    return this.products.value.filter(
      p =>
        p.name.toLowerCase().includes(term) ||
        p.nameEn?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    )
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating product', { data })

      if (!data.usedInDepartments || data.usedInDepartments.length === 0) {
        throw new Error('Product must be used in at least one department')
      }

      const now = TimeUtils.getCurrentLocalISO()
      const newProduct: Product = {
        ...data,
        id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        packageOptions: [],
        isActive: data.isActive ?? true,
        canBeSold: data.canBeSold ?? false,
        createdAt: now,
        updatedAt: now
      }

      this.products.value.push(newProduct)
      DebugUtils.info(MODULE_NAME, 'Product created successfully', { id: newProduct.id })

      return newProduct
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating product', { error, data })
      throw error
    }
  }

  async updateProduct(data: UpdateProductData): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating product', { data })

      if (data.usedInDepartments !== undefined && data.usedInDepartments.length === 0) {
        throw new Error('Product must be used in at least one department')
      }

      const index = this.products.value.findIndex(p => p.id === data.id)
      if (index === -1) {
        throw new Error(`Product not found: ${data.id}`)
      }

      const { id, ...updateData } = data
      this.products.value[index] = {
        ...this.products.value[index],
        ...updateData,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      DebugUtils.info(MODULE_NAME, 'Product updated successfully', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating product', { error, data })
      throw error
    }
  }

  async deactivateProduct(id: string): Promise<void> {
    const product = await this.getById(id)
    if (!product) {
      throw new Error(`Product not found: ${id}`)
    }

    await this.updateProduct({
      id,
      isActive: false
    })
  }

  async activateProduct(id: string): Promise<void> {
    const product = await this.getById(id)
    if (!product) {
      throw new Error(`Product not found: ${id}`)
    }

    await this.updateProduct({
      id,
      isActive: true
    })
  }

  async getLowStockProducts(): Promise<Product[]> {
    return this.products.value
      .filter(p => p.isActive && (p.minStock || 0) > 0)
      .sort((a, b) => (a.minStock || 0) - (b.minStock || 0))
  }

  // =============================================
  // МЕТОДЫ РАБОТЫ С УПАКОВКАМИ
  // =============================================

  async addPackageOption(packageData: PackageOption): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Adding package option', { packageData })

      const product = await this.getById(packageData.productId)
      if (!product) {
        throw new Error(`Product not found: ${packageData.productId}`)
      }

      const updatedPackages = [...product.packageOptions, packageData]

      await this.updateProduct({
        id: packageData.productId,
        packageOptions: updatedPackages
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

  async updatePackageOption(data: UpdatePackageOptionDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating package option', { data })

      const product = this.products.value.find(p =>
        p.packageOptions.some(pkg => pkg.id === data.id)
      )

      if (!product) {
        throw new Error(`Package not found: ${data.id}`)
      }

      const updatedPackages = product.packageOptions.map(pkg =>
        pkg.id === data.id ? { ...pkg, ...data, updatedAt: TimeUtils.getCurrentLocalISO() } : pkg
      )

      await this.updateProduct({
        id: product.id,
        packageOptions: updatedPackages
      })

      DebugUtils.info(MODULE_NAME, 'Package option updated', { packageId: data.id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating package option', { error, data })
      throw error
    }
  }

  async deletePackageOption(packageId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Deleting package option', { packageId })

      const product = this.products.value.find(p =>
        p.packageOptions.some(pkg => pkg.id === packageId)
      )

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

      await this.updateProduct({
        id: product.id,
        packageOptions: updatedPackages,
        recommendedPackageId: updatedRecommendedId
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

      await this.updateProduct({
        id: productId,
        recommendedPackageId: packageId
      })

      DebugUtils.info(MODULE_NAME, 'Recommended package set', { productId, packageId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error setting recommended package', { error })
      throw error
    }
  }
}

// Export instance (will be initialized with mock data in store)
export const productsService = new ProductsService()
