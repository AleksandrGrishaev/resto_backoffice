// src/stores/productsStore/productsService.ts - Supabase-only service

import type {
  Product,
  ProductCategory,
  CreateProductData,
  UpdateProductData,
  PackageOption,
  CreatePackageOptionDto,
  UpdatePackageOptionDto
} from './types'
import { DebugUtils, TimeUtils, generateId, executeSupabaseQuery } from '@/utils'
import { ENV } from '@/config/environment'
import { supabase } from '@/supabase/client'
import {
  productToSupabaseInsert,
  productToSupabaseUpdate,
  productFromSupabase,
  packageOptionToSupabaseInsert,
  packageOptionToSupabaseUpdate,
  packageOptionFromSupabase,
  packageOptionsFromSupabase
} from './supabaseMappers'

const MODULE_NAME = 'ProductsService'

// Helper: Check if Supabase is available
function isSupabaseAvailable(): boolean {
  return ENV.useSupabase && !!supabase
}

/**
 * ProductsService - Supabase-only implementation
 * Pattern: Supabase-first with localStorage cache fallback
 */
export class ProductsService {
  // =============================================
  // PRODUCTS - READ OPERATIONS
  // =============================================

  /**
   * Get all products with package options
   */
  async getAll(): Promise<Product[]> {
    try {
      // Try Supabase first (if online) with retry logic
      if (isSupabaseAvailable()) {
        try {
          // Fetch products and their package options in parallel
          const [productsData, packagesData] = await Promise.all([
            executeSupabaseQuery(
              supabase.from('products').select('*').order('name', { ascending: true }),
              `${MODULE_NAME}.getAll.products`
            ),
            executeSupabaseQuery(
              supabase.from('package_options').select('*'),
              `${MODULE_NAME}.getAll.packages`
            )
          ])

          // Group package options by product_id
          const packageOptionsMap = new Map<string, PackageOption[]>()
          packagesData.forEach(pkg => {
            const productId = pkg.product_id
            if (!packageOptionsMap.has(productId)) {
              packageOptionsMap.set(productId, [])
            }
            packageOptionsMap.get(productId)!.push(packageOptionFromSupabase(pkg))
          })

          // Map products with their package options
          const products = productsData.map(row =>
            productFromSupabase(row, packageOptionsMap.get(row.id) || [])
          )

          // Cache to localStorage for offline
          localStorage.setItem('products_cache', JSON.stringify(products))
          DebugUtils.info(MODULE_NAME, '✅ Products loaded from Supabase', {
            count: products.length,
            withPackages: products.filter(p => p.packageOptions.length > 0).length
          })
          return products
        } catch (error) {
          // All retries failed - fallback to cache
          DebugUtils.warn(MODULE_NAME, '⚠️ Supabase request failed after retries, using cache', {
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Fallback to localStorage cache
      const cached = localStorage.getItem('products_cache')
      if (cached) {
        const products = JSON.parse(cached)
        DebugUtils.info(MODULE_NAME, '📦 Products loaded from cache', { count: products.length })
        return products
      }

      // No data available - return empty array
      DebugUtils.warn(MODULE_NAME, '⚠️ No products found (Supabase offline and no cache)')
      return []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting all products:', error)
      throw error
    }
  }

  /**
   * Get product by ID
   */
  async getById(id: string): Promise<Product | null> {
    try {
      const allProducts = await this.getAll()
      const product = allProducts.find(p => p.id === id) || null
      DebugUtils.info(MODULE_NAME, 'Product by ID', { id, found: !!product })
      return product
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting product by ID:', error)
      throw error
    }
  }

  /**
   * ✅ NEW: Get all product categories from database
   */
  async getCategories(): Promise<ProductCategory[]> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, '⚠️ Supabase not available, returning empty categories')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to load categories from Supabase:', error)
        throw error
      }

      // Map from snake_case to camelCase
      const categories: ProductCategory[] = (data || []).map(row => ({
        id: row.id,
        key: row.key,
        name: row.name,
        color: row.color,
        icon: row.icon,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      DebugUtils.info(MODULE_NAME, '✅ Categories loaded from Supabase', {
        count: categories.length
      })

      return categories
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting categories:', error)
      throw error
    }
  }

  /**
   * Get active products
   */
  async getActiveProducts(): Promise<Product[]> {
    try {
      const allProducts = await this.getAll()
      return allProducts
        .filter(p => p.isActive)
        .sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category)
          }
          return a.name.localeCompare(b.name)
        })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting active products:', error)
      throw error
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: ProductCategory): Promise<Product[]> {
    try {
      const allProducts = await this.getAll()
      return allProducts
        .filter(p => p.category === category && p.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting products by category:', error)
      throw error
    }
  }

  /**
   * Search products by name/description
   */
  async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      const allProducts = await this.getAll()
      const term = searchTerm.toLowerCase()
      return allProducts.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.nameEn?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error searching products:', error)
      throw error
    }
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(): Promise<Product[]> {
    try {
      const allProducts = await this.getAll()
      return allProducts
        .filter(p => p.isActive && (p.minStock || 0) > 0)
        .sort((a, b) => (a.minStock || 0) - (b.minStock || 0))
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting low stock products:', error)
      throw error
    }
  }

  // =============================================
  // PRODUCTS - WRITE OPERATIONS
  // =============================================

  /**
   * Create new product
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      DebugUtils.info(MODULE_NAME, '🛍️ Creating product', { data })

      if (!data.usedInDepartments || data.usedInDepartments.length === 0) {
        throw new Error('Product must be used in at least one department')
      }

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot create product.')
      }

      const now = TimeUtils.getCurrentLocalISO()

      // Set last_known_cost from base_cost_per_unit or default to 0
      const lastKnownCost = data.baseCostPerUnit || 0

      const newProduct: Product = {
        ...data,
        id: generateId(),
        packageOptions: [],
        isActive: data.isActive ?? true,
        canBeSold: data.canBeSold ?? false,
        lastKnownCost: lastKnownCost,
        createdAt: now,
        updatedAt: now
      }

      // Log warning if cost is 0
      if (lastKnownCost === 0) {
        DebugUtils.warn(MODULE_NAME, '⚠️ Product created with 0 cost', {
          productId: newProduct.id,
          productName: newProduct.name,
          suggestion: 'Set base_cost_per_unit or create receipt operation to update last_known_cost'
        })
      } else {
        DebugUtils.info(MODULE_NAME, '✅ Product created with last_known_cost', {
          productId: newProduct.id,
          productName: newProduct.name,
          lastKnownCost: lastKnownCost
        })
      }

      // Insert to Supabase
      const { error } = await supabase.from('products').insert(productToSupabaseInsert(newProduct))

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to save product to Supabase:', error)
        throw new Error(`Failed to create product: ${error.message}`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Product saved to Supabase', {
        id: newProduct.id,
        name: newProduct.name
      })

      // Invalidate cache to force fresh read
      localStorage.removeItem('products_cache')

      return newProduct
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating product', { error, data })
      throw error
    }
  }

  /**
   * Update existing product
   */
  async updateProduct(data: UpdateProductData): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating product', { data })

      if (data.usedInDepartments !== undefined && data.usedInDepartments.length === 0) {
        throw new Error('Product must be used in at least one department')
      }

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot update product.')
      }

      // Get existing product
      const existingProduct = await this.getById(data.id)
      if (!existingProduct) {
        throw new Error(`Product not found: ${data.id}`)
      }

      const { id, ...updateData } = data
      const updatedProduct: Product = {
        ...existingProduct,
        ...updateData,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Update in Supabase
      const { error } = await supabase
        .from('products')
        .update(productToSupabaseUpdate(updatedProduct))
        .eq('id', id)

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to update product in Supabase:', error)
        throw new Error(`Failed to update product: ${error.message}`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Product updated in Supabase', { id })

      // Invalidate cache
      localStorage.removeItem('products_cache')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating product', { error, data })
      throw error
    }
  }

  /**
   * Deactivate product
   */
  async deactivateProduct(id: string): Promise<void> {
    await this.updateProduct({ id, isActive: false })
  }

  /**
   * Activate product
   */
  async activateProduct(id: string): Promise<void> {
    await this.updateProduct({ id, isActive: true })
  }

  // =============================================
  // PACKAGE OPTIONS - CRUD OPERATIONS
  // =============================================

  /**
   * Add package option to product
   */
  async addPackageOption(packageData: CreatePackageOptionDto): Promise<PackageOption> {
    try {
      DebugUtils.info(MODULE_NAME, 'Adding package option', { packageData })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot add package option.')
      }

      // Verify product exists
      const product = await this.getById(packageData.productId)
      if (!product) {
        throw new Error(`Product not found: ${packageData.productId}`)
      }

      const now = TimeUtils.getCurrentLocalISO()
      const newPackage: PackageOption = {
        id: generateId(),
        ...packageData,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }

      // Insert to Supabase
      const { error } = await supabase
        .from('package_options')
        .insert(packageOptionToSupabaseInsert(newPackage))

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to save package option to Supabase:', error)
        throw new Error(`Failed to add package option: ${error.message}`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Package option added to Supabase', {
        packageId: newPackage.id,
        productId: newPackage.productId
      })

      // Invalidate cache
      localStorage.removeItem('products_cache')

      return newPackage
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error adding package option', { error, packageData })
      throw error
    }
  }

  /**
   * Update package option
   */
  async updatePackageOption(data: UpdatePackageOptionDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating package option', { data })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot update package option.')
      }

      // Get existing package option (from cached products)
      const allProducts = await this.getAll()
      const product = allProducts.find(p => p.packageOptions.some(pkg => pkg.id === data.id))

      if (!product) {
        throw new Error(`Package option not found: ${data.id}`)
      }

      const existingPackage = product.packageOptions.find(pkg => pkg.id === data.id)!
      const { id, ...updateData } = data
      const updatedPackage: PackageOption = {
        ...existingPackage,
        ...updateData,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Update in Supabase
      const { error } = await supabase
        .from('package_options')
        .update(packageOptionToSupabaseUpdate(updatedPackage))
        .eq('id', id)

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to update package option in Supabase:', error)
        throw new Error(`Failed to update package option: ${error.message}`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Package option updated in Supabase', { packageId: data.id })

      // Invalidate cache
      localStorage.removeItem('products_cache')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating package option', { error, data })
      throw error
    }
  }

  /**
   * Deactivate package option (soft delete)
   * Sets is_active = false instead of deleting to preserve historical data references
   */
  async deactivatePackageOption(packageId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Deactivating package option', { packageId })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot deactivate package option.')
      }

      // Find product with this package option
      const allProducts = await this.getAll()
      const product = allProducts.find(p => p.packageOptions.some(pkg => pkg.id === packageId))

      if (!product) {
        throw new Error(`Package option not found: ${packageId}`)
      }

      // Check if this is the last active package
      const activePackages = product.packageOptions.filter(pkg => pkg.isActive)
      if (activePackages.length <= 1 && activePackages.some(pkg => pkg.id === packageId)) {
        throw new Error('Cannot deactivate the last active package option')
      }

      // Soft delete: update is_active = false
      const { error } = await supabase
        .from('package_options')
        .update({ is_active: false })
        .eq('id', packageId)

      if (error) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to deactivate package option in Supabase:', error)
        throw new Error(`Failed to deactivate package option: ${error.message}`)
      }

      // If this was the recommended package, update to first remaining active package
      if (product.recommendedPackageId === packageId) {
        const remainingActivePackages = product.packageOptions.filter(
          pkg => pkg.id !== packageId && pkg.isActive
        )
        await this.setRecommendedPackage(product.id, remainingActivePackages[0]?.id || '')
      }

      DebugUtils.info(MODULE_NAME, '✅ Package option deactivated in Supabase', {
        packageId,
        productId: product.id
      })

      // Invalidate cache
      localStorage.removeItem('products_cache')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deactivating package option', { error, packageId })
      throw error
    }
  }

  /**
   * Set recommended package for product
   */
  async setRecommendedPackage(productId: string, packageId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Setting recommended package', { productId, packageId })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot set recommended package.')
      }

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

      DebugUtils.info(MODULE_NAME, '✅ Recommended package set', { productId, packageId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error setting recommended package', { error })
      throw error
    }
  }
}

// Export singleton instance
export const productsService = new ProductsService()
