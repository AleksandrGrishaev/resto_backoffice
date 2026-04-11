// src/stores/productsStore/productsStore.ts - UPDATED integration

import { defineStore } from 'pinia'
import type {
  ProductsState,
  Product,
  ProductCategory,
  CreateProductData,
  UpdateProductData,
  PackageOption,
  CreatePackageOptionDto,
  UpdatePackageOptionDto,
  BaseUnit,
  ProductForSupplier,
  ProductForMenu,
  Department
} from './types'
import { DebugUtils, invalidateCache } from '@/utils'
import type { ProductForRecipe } from '@/stores/recipes/types'
import { isUnitDivisible, type MeasurementUnit } from '@/types/measurementUnits'
import { computeProductDiff, changelogService, setCurrentUserProvider } from '@/core/changelog'
import { useAuthStore } from '@/stores/auth/authStore'

const MODULE_NAME = 'ProductsStore'

let _changelogUserProviderSet = false
function ensureChangelogUserProvider() {
  if (_changelogUserProviderSet) return
  _changelogUserProviderSet = true
  setCurrentUserProvider(() => {
    try {
      const authStore = useAuthStore()
      const user = authStore.currentUser
      if (user) return { id: user.id, name: user.name }
    } catch {
      /* store not ready */
    }
    return null
  })
}

export const useProductsStore = defineStore('products', {
  state: (): ProductsState => ({
    products: [],
    categories: [], // ✅ NEW: Categories from database
    loading: false,
    error: null,
    selectedProduct: null,
    filters: {
      category: 'all',
      isActive: true as boolean | 'all',
      canBeSold: 'all',
      search: '',
      department: 'all',
      needsReorder: false,
      urgencyLevel: 'all'
    }
  }),

  getters: {
    // Existing getters remain unchanged
    filteredProducts: (state): Product[] => {
      let filtered = [...state.products]

      if (state.filters.category !== 'all') {
        filtered = filtered.filter(product => product.category === state.filters.category)
      }

      if (state.filters.isActive !== 'all') {
        filtered = filtered.filter(product => product.isActive === state.filters.isActive)
      }
      if (state.filters.department !== 'all') {
        filtered = filtered.filter(product =>
          product.usedInDepartments.includes(state.filters.department as Department)
        )
      }
      if (state.filters.search) {
        const searchTerm = state.filters.search.toLowerCase()
        filtered = filtered.filter(
          product =>
            product.name.toLowerCase().includes(searchTerm) ||
            (product as any).nameEn?.toLowerCase().includes(searchTerm) ||
            product.description?.toLowerCase().includes(searchTerm)
        )
      }

      return filtered.sort((a, b) => a.name.localeCompare(b.name))
    },

    sellableProducts: (state): Product[] => {
      return state.products.filter(product => product.isActive && product.canBeSold)
    },

    rawMaterials: (state): Product[] => {
      return state.products.filter(product => product.isActive && !product.canBeSold)
    },

    // ✅ NEW: Category getters
    activeCategories: state =>
      state.categories.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),

    getCategoryById: state => (id: string) => state.categories.find(c => c.id === id),

    getCategoryName: state => (id: string) => state.categories.find(c => c.id === id)?.name || id,

    getCategoryColor: state => (id: string) =>
      state.categories.find(c => c.id === id)?.color || 'grey'
  },

  actions: {
    // =============================================
    // CORE METHODS (unchanged)
    // =============================================

    async loadProducts(): Promise<void> {
      try {
        this.loading = true
        this.error = null

        DebugUtils.info(MODULE_NAME, '🛍️ Loading products from Supabase')

        // ✅ Load categories first (needed for product display)
        await this.loadCategories()

        // Load from Supabase only (no mock data)
        const { productsService } = await import('./productsService')
        this.products = await productsService.getAll()

        DebugUtils.info(MODULE_NAME, '✅ Products loaded from Supabase', {
          count: this.products.length
        })

        if (import.meta.env.DEV) {
          this.setupDevDebugFunctions()
        }
      } catch (error) {
        DebugUtils.error(MODULE_NAME, '❌ Error loading products', { error })
        this.error = 'Failed to load products'
        throw error
      } finally {
        this.loading = false
      }
    },

    // ✅ NEW: Load categories from database
    async loadCategories(): Promise<void> {
      try {
        DebugUtils.info(MODULE_NAME, '📂 Loading categories from Supabase')

        const { productsService } = await import('./productsService')
        this.categories = await productsService.getCategories()

        DebugUtils.info(MODULE_NAME, '✅ Categories loaded from Supabase', {
          count: this.categories.length
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, '❌ Error loading categories', { error })
        // Don't throw - categories are optional for basic functionality
        this.categories = []
      }
    },

    /**
     * ✅ Sprint 8: Force refresh products from server
     * Invalidates cache and reloads from Supabase
     */
    async refresh(): Promise<void> {
      DebugUtils.info(MODULE_NAME, '🔄 Refreshing products (cache invalidation + reload)')

      // Invalidate SWR cache
      invalidateCache('products')
      invalidateCache('product_categories')

      // Also clear legacy cache keys
      localStorage.removeItem('products_cache')
      localStorage.removeItem('products_cache_ts')

      // Reload from server
      await this.loadProducts()

      DebugUtils.info(MODULE_NAME, '✅ Products refreshed', {
        count: this.products.length,
        categories: this.categories.length
      })
    },

    async createProductCategory(data: {
      name: string
      key: string
      color?: string
      icon?: string
      sortOrder?: number
    }): Promise<ProductCategory> {
      const { productsService } = await import('./productsService')
      const category = await productsService.createCategory(data)
      this.categories.push(category)
      return category
    },

    async updateProductCategory(
      id: string,
      data: Partial<{
        name: string
        key: string
        color: string
        icon: string
        sortOrder: number
        isActive: boolean
      }>
    ): Promise<void> {
      const { productsService } = await import('./productsService')
      await productsService.updateCategory(id, data)
      const idx = this.categories.findIndex(c => c.id === id)
      if (idx >= 0) {
        Object.assign(this.categories[idx], data)
      }
    },

    async deleteProductCategory(id: string): Promise<void> {
      const { productsService } = await import('./productsService')
      await productsService.deleteCategory(id)
      const idx = this.categories.findIndex(c => c.id === id)
      if (idx >= 0) {
        this.categories[idx].isActive = false
      }
    },

    async createProduct(data: CreateProductData): Promise<Product> {
      try {
        this.loading = true
        this.error = null

        // Always use productsService (Supabase-only)
        const { productsService } = await import('./productsService')
        const newProduct = await productsService.createProduct(data)

        // Create base package for the new product and save to database
        const basePackageData = {
          productId: newProduct.id,
          packageName: this.getDefaultPackageName(data.baseUnit),
          packageSize: this.getDefaultPackageSize(data.baseUnit),
          packageUnit: this.getDefaultPackageUnit(data.baseUnit),
          packagePrice: data.baseCostPerUnit * this.getDefaultPackageSize(data.baseUnit),
          baseCostPerUnit: data.baseCostPerUnit
        }

        const savedPackage = await productsService.addPackageOption(basePackageData)
        newProduct.packageOptions = [savedPackage]
        newProduct.recommendedPackageId = savedPackage.id

        // Update product's recommendedPackageId in database
        await productsService.updateProduct({
          id: newProduct.id,
          recommendedPackageId: savedPackage.id
        })

        this.products.push(newProduct)

        DebugUtils.info(MODULE_NAME, 'Product created with base package', {
          id: newProduct.id,
          basePackageId: savedPackage.id,
          packageName: savedPackage.packageName
        })

        ensureChangelogUserProvider()
        changelogService
          .logChange({
            entityType: 'product',
            entityId: newProduct.id,
            entityName: newProduct.name,
            changeType: 'created',
            changes: {}
          })
          .catch(() => {})

        return newProduct
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error creating product', { error, data })
        this.error = 'Failed to create product'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Helper methods for creating base packages
    getDefaultPackageName(baseUnit: BaseUnit): string {
      switch (baseUnit) {
        case 'gram':
          return 'Kilogram'
        case 'ml':
          return 'Liter'
        case 'piece':
          return 'Piece'
      }
    },

    getDefaultPackageSize(baseUnit: BaseUnit): number {
      switch (baseUnit) {
        case 'gram':
          return 1000
        case 'ml':
          return 1000
        case 'piece':
          return 1
      }
    },

    getDefaultPackageUnit(baseUnit: BaseUnit): MeasurementUnit {
      switch (baseUnit) {
        case 'gram':
          return 'kg'
        case 'ml':
          return 'liter'
        case 'piece':
          return 'piece'
      }
    },

    async updateProduct(data: UpdateProductData): Promise<void> {
      try {
        this.loading = true
        this.error = null

        DebugUtils.info(MODULE_NAME, 'Updating product', { data })

        const index = this.products.findIndex(p => p.id === data.id)
        const oldProduct = index !== -1 ? { ...this.products[index] } : null

        // Always use productsService (Supabase-only)
        const { productsService } = await import('./productsService')
        await productsService.updateProduct(data)

        if (index !== -1) {
          this.products[index] = {
            ...this.products[index],
            ...data,
            updatedAt: new Date().toISOString()
          }
        }

        if (oldProduct) {
          ensureChangelogUserProvider()
          const diff = computeProductDiff(oldProduct, data)
          if (diff.hasChanges) {
            changelogService
              .logChange({
                entityType: 'product',
                entityId: data.id,
                entityName: data.name || oldProduct.name,
                changeType: 'updated',
                changes: diff
              })
              .catch(() => {})
          }
        }

        DebugUtils.info(MODULE_NAME, 'Product updated', { id: data.id })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error updating product', { error, data })
        this.error = 'Failed to update product'
        throw error
      } finally {
        this.loading = false
      }
    },

    // =============================================
    // ✅ UPDATED INTEGRATION METHODS
    // =============================================

    /**
     * ✅ FIXED: Gets product in format for Recipe Store with base units
     */
    getProductForRecipe(productId: string): ProductForRecipe | null {
      const product = this.getProductById(productId)

      if (!product) {
        DebugUtils.warn(MODULE_NAME, `Product not found: ${productId}`)
        return null
      }

      // ✅ Use new structure with base units
      return {
        id: product.id,
        name: product.name,
        nameEn: product.nameEn || product.name,
        baseUnit: product.baseUnit, // Always base unit
        baseCostPerUnit: product.baseCostPerUnit, // Price per base unit
        yieldPercentage: product.yieldPercentage, // ✅ NEW: Yield percentage for waste calculation
        category: product.category,
        isActive: product.isActive,
        // Deprecated fields for compatibility (if needed)
        unit: product.baseUnit as MeasurementUnit,
        costPerUnit: product.baseCostPerUnit
      }
    },

    /**
     * ✅ UPDATED: Gets product in format for Menu Store
     */
    getProductForMenu(productId: string): ProductForMenu | null {
      const product = this.getProductById(productId)

      if (!product) {
        DebugUtils.warn(MODULE_NAME, `Product not found: ${productId}`)
        return null
      }

      return {
        id: product.id,
        name: product.name,
        nameEn: product.nameEn || product.name,
        canBeSold: product.canBeSold,
        currentCostPerUnit: product.baseCostPerUnit, // Price per base unit
        unit: product.baseUnit as MeasurementUnit // Base unit
      }
    },

    /**
     * ✅ UPDATED: Gets product in format for Supplier Store with packages
     */
    getProductForSupplier(productId: string): ProductForSupplier | null {
      const product = this.getProductById(productId)

      if (!product) {
        DebugUtils.warn(MODULE_NAME, `Product not found: ${productId}`)
        return null
      }

      // Get recommended package for order calculation
      const recommendedPackage = this.getRecommendedPackage(productId)

      return {
        id: product.id,
        name: product.name,
        nameEn: product.nameEn || product.name,
        currentCostPerUnit: product.baseCostPerUnit,
        recommendedOrderQuantity: 0,
        urgencyLevel: 'medium',
        primarySupplierId: product.primarySupplierId,
        leadTimeDays: product.leadTimeDays,
        baseUnit: product.baseUnit,
        recommendedPackage: recommendedPackage || undefined,
        packageOptions: product.packageOptions || [] // ✅ FIXED: added fallback
      }
    },

    /**
     * ✅ UPDATED METHOD: Update product's baseCostPerUnit
     */
    async updateProductCost(productId: string, newBaseCost: number): Promise<void> {
      try {
        const product = this.getProductById(productId)
        if (!product) {
          throw new Error('Product not found')
        }

        // ✅ Update in database via productsService
        const { productsService } = await import('./productsService')
        await productsService.updateProduct({
          id: productId,
          baseCostPerUnit: newBaseCost
        })

        // Update in-memory state
        const productIndex = this.products.findIndex(p => p.id === productId)
        if (productIndex !== -1) {
          this.products[productIndex].baseCostPerUnit = newBaseCost
          this.products[productIndex].updatedAt = new Date().toISOString()

          // Update cost in recommended package (in-memory and database)
          if (product.recommendedPackageId) {
            const packageIndex = this.products[productIndex].packageOptions.findIndex(
              pkg => pkg.id === product.recommendedPackageId
            )
            if (packageIndex !== -1) {
              this.products[productIndex].packageOptions[packageIndex].baseCostPerUnit = newBaseCost
              this.products[productIndex].packageOptions[packageIndex].updatedAt =
                new Date().toISOString()

              // ✅ Also update package in database
              await productsService.updatePackageOption({
                id: product.recommendedPackageId,
                baseCostPerUnit: newBaseCost
              })
            }
          }
        }

        DebugUtils.info(MODULE_NAME, 'Product cost updated (with DB persistence)', {
          productId,
          newBaseCost
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error updating product cost', { error })
        throw error
      }
    },

    /**
     * ✅ NEW METHOD: Get product information for orders
     */
    getProductForOrder(productId: string): {
      product: Product
      recommendedPackage: PackageOption
      baseUnit: BaseUnit
      baseCostPerUnit: number
    } | null {
      const product = this.getProductById(productId)
      if (!product) return null

      const recommendedPackage = this.getRecommendedPackage(productId)
      if (!recommendedPackage) {
        DebugUtils.warn(MODULE_NAME, `No package options for product: ${productId}`)
        return null
      }

      return {
        product,
        recommendedPackage,
        baseUnit: product.baseUnit,
        baseCostPerUnit: product.baseCostPerUnit
      }
    },

    /**
     * ✅ NEW METHOD: Get all packages with best prices
     */
    getBestPricePackages(): Array<{
      productId: string
      productName: string
      bestPackage: PackageOption
      savings: number // percentage saved
    }> {
      return this.products
        .map(product => {
          if (product.packageOptions.length < 2) return null

          const packages = product.packageOptions.filter(pkg => pkg.isActive)
          const bestPackage = packages.reduce((best, current) =>
            current.baseCostPerUnit < best.baseCostPerUnit ? current : best
          )
          const worstPackage = packages.reduce((worst, current) =>
            current.baseCostPerUnit > worst.baseCostPerUnit ? current : worst
          )

          if (bestPackage.id === worstPackage.id) return null

          const savings =
            ((worstPackage.baseCostPerUnit - bestPackage.baseCostPerUnit) /
              worstPackage.baseCostPerUnit) *
            100

          return {
            productId: product.id,
            productName: product.name,
            bestPackage,
            savings
          }
        })
        .filter(Boolean) as Array<{
        productId: string
        productName: string
        bestPackage: PackageOption
        savings: number
      }>
    },

    /**
     * ✅ NEW METHOD: Migrate old product format to new
     */
    migrateOldProductToNew(product: Product): ProductForRecipe {
      // Determine base unit from old structure
      const getBaseUnit = (): 'gram' | 'ml' | 'piece' => {
        const unit = (product as any).unit
        const category = product.category.toLowerCase()

        // By product category
        if (['meat', 'vegetables', 'spices', 'cereals'].includes(category)) {
          return 'gram'
        }

        if (category === 'dairy' && product.name.toLowerCase().includes('milk')) {
          return 'ml'
        }

        if (category === 'beverages') {
          return 'piece'
        }

        if (product.name.toLowerCase().includes('oil')) {
          return 'ml'
        }

        // By measurement unit (if available)
        if (unit) {
          if (['kg', 'gram'].includes(unit)) return 'gram'
          if (['liter', 'ml'].includes(unit)) return 'ml'
          if (['piece', 'pack'].includes(unit)) return 'piece'
        }

        // Default to grams
        return 'gram'
      }

      // Determine cost per base unit
      const calculateBaseCost = (): number => {
        const baseUnit = getBaseUnit()
        const oldCostPerUnit =
          (product as any).currentCostPerUnit || (product as any).costPerUnit || 0
        const oldUnit = (product as any).unit

        // If units are already base units, return as is
        if (
          (baseUnit === 'gram' && oldUnit === 'gram') ||
          (baseUnit === 'ml' && oldUnit === 'ml') ||
          (baseUnit === 'piece' && oldUnit === 'piece')
        ) {
          return oldCostPerUnit
        }

        // Convert from large units to base units
        if (baseUnit === 'gram' && oldUnit === 'kg') {
          return oldCostPerUnit / 1000 // IDR/кг -> IDR/г
        }

        if (baseUnit === 'ml' && oldUnit === 'liter') {
          return oldCostPerUnit / 1000 // IDR/л -> IDR/мл
        }

        // If we can't determine, log warning
        DebugUtils.warn(MODULE_NAME, `Cannot determine base cost for product ${product.name}`, {
          baseUnit,
          oldUnit,
          oldCostPerUnit
        })

        return oldCostPerUnit
      }

      const baseUnit = getBaseUnit()
      const baseCostPerUnit = calculateBaseCost()

      DebugUtils.info(MODULE_NAME, `✅ Migrated product ${product.name}`, {
        baseUnit,
        baseCostPerUnit,
        oldUnit: (product as any).unit,
        oldCostPerUnit: (product as any).costPerUnit
      })

      return {
        id: product.id,
        name: product.name,
        nameEn: (product as any).nameEn || product.name,
        baseUnit,
        baseCostPerUnit,
        category: product.category,
        isActive: product.isActive,
        // Keep old fields for compatibility
        unit: (product as any).unit,
        costPerUnit: (product as any).costPerUnit
      }
    },

    /**
     * ✅ UPDATED: Get all active products for Recipe Store
     */
    getProductsForRecipes(): ProductForRecipe[] {
      return this.products
        .filter(product => product.isActive)
        .map(product => this.getProductForRecipe(product.id))
        .filter((product): product is ProductForRecipe => product !== null)
    },

    /**
     * ✅ UPDATED: Notify about product price change
     */
    async notifyPriceChange(productId: string, newPrice: number): Promise<void> {
      DebugUtils.info(MODULE_NAME, `💰 Price changed for product ${productId}: ${newPrice}`)

      const product = this.getProductById(productId)
      if (!product) {
        DebugUtils.error(MODULE_NAME, `Product not found for price change: ${productId}`)
        return
      }

      // ✅ SIMPLIFIED: We now only have the new structure
      await this.updateProduct({
        id: productId,
        baseCostPerUnit: newPrice // Price already in base units
      })

      // ✅ SIMPLIFIED: Log for debugging instead of callback
      DebugUtils.info(MODULE_NAME, 'Product price updated - recipes may need recalculation', {
        productId,
        productName: product.name,
        newBaseCostPerUnit: newPrice,
        baseUnit: product.baseUnit
      })

      // In dev mode, output to console for easier debugging
      if (import.meta.env.DEV) {
        console.log(`🔄 Recipe costs may need recalculation for product: ${product.name}`)
      }
    },

    /**
     * Обновляет информацию об использовании продукта
     */
    updateProductUsage(productId: string, usageData: any): void {
      DebugUtils.debug(MODULE_NAME, `📊 Updating usage for product ${productId}`, {
        preparations: usageData.usedInPreparations?.length || 0,
        recipes: usageData.usedInRecipes?.length || 0
      })

      const product = this.getProductById(productId)
      if (product) {
        const prepCount = usageData.usedInPreparations?.length || 0
        const recipeCount = usageData.usedInRecipes?.length || 0
        DebugUtils.debug(
          MODULE_NAME,
          `Product ${product.name} used in ${prepCount} preparations and ${recipeCount} recipes`
        )
      }
    },

    // =============================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // =============================================

    getProductById(id: string): Product | null {
      return this.products.find(product => product.id === id) || null
    },

    updateFilters(filters: Partial<typeof this.filters>): void {
      console.log('🏬 Store: updating filters', filters) // ✅ ДОБАВИТЬ
      console.log('🏬 Store: old filters', { ...this.filters }) // ✅ ДОБАВИТЬ
      this.filters = { ...this.filters, ...filters }
      console.log('🏬 Store: new filters', { ...this.filters }) // ✅ ДОБАВИТЬ
      DebugUtils.debug(MODULE_NAME, 'Filters updated', { filters: this.filters })
    },

    resetFilters(): void {
      this.filters = {
        category: 'all',
        isActive: 'all',
        canBeSold: 'all',
        search: '',
        department: 'all',
        needsReorder: false,
        urgencyLevel: 'all'
      }
      DebugUtils.debug(MODULE_NAME, 'Filters reset')
    },

    setSelectedProduct(product: Product | null): void {
      this.selectedProduct = product
      DebugUtils.debug(MODULE_NAME, 'Selected product changed', { id: product?.id })
    },

    clearError(): void {
      this.error = null
    },

    // =============================================
    // ✅ НОВЫЕ МЕТОДЫ ДЛЯ УПАКОВОК
    // =============================================

    /**
     * Создать новую упаковку для продукта
     */
    async addPackageOption(data: CreatePackageOptionDto): Promise<PackageOption> {
      try {
        this.loading = true
        this.error = null

        // Валидация продукта
        const product = this.getProductById(data.productId)
        if (!product) {
          throw new Error('Product not found')
        }

        // Always use productsService (Supabase-only)
        const { productsService } = await import('./productsService')
        const newPackage = await productsService.addPackageOption(data)

        // Добавляем упаковку к продукту в store
        const productIndex = this.products.findIndex(p => p.id === data.productId)
        if (productIndex !== -1) {
          this.products[productIndex].packageOptions.push(newPackage)
          this.products[productIndex].updatedAt = newPackage.updatedAt
        }

        DebugUtils.info(MODULE_NAME, 'Package option created', {
          packageId: newPackage.id,
          productId: data.productId
        })

        return newPackage
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error creating package option', { error, data })
        this.error = 'Failed to create package option'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Обновить упаковку
     */
    async updatePackageOption(data: UpdatePackageOptionDto): Promise<void> {
      try {
        this.loading = true
        this.error = null

        // Always use productsService (Supabase-only)
        const { productsService } = await import('./productsService')
        await productsService.updatePackageOption(data)

        // Обновляем упаковку в продукте
        const product = this.products.find(p => p.packageOptions.some(pkg => pkg.id === data.id))

        if (product) {
          const packageIndex = product.packageOptions.findIndex(pkg => pkg.id === data.id)
          if (packageIndex !== -1) {
            product.packageOptions[packageIndex] = {
              ...product.packageOptions[packageIndex],
              ...data,
              updatedAt: new Date().toISOString()
            }
            product.updatedAt = new Date().toISOString()
          }
        }

        DebugUtils.info(MODULE_NAME, 'Package option updated', { packageId: data.id })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error updating package option', { error, data })
        this.error = 'Failed to update package option'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Деактивировать упаковку (soft delete)
     * Устанавливает isActive = false для сохранения связей с историческими данными
     */
    async deactivatePackageOption(productId: string, packageId: string): Promise<void> {
      try {
        this.loading = true
        this.error = null

        // Always use productsService (Supabase-only)
        const { productsService } = await import('./productsService')
        await productsService.deactivatePackageOption(packageId)

        // Деактивируем упаковку в локальном состоянии
        const product = this.products.find(p => p.id === productId)
        if (product) {
          const packageToDeactivate = product.packageOptions.find(pkg => pkg.id === packageId)
          if (packageToDeactivate) {
            packageToDeactivate.isActive = false
          }

          // Если деактивируемая упаковка была рекомендуемой, выбираем первую активную
          if (product.recommendedPackageId === packageId) {
            const firstActivePackage = product.packageOptions.find(
              pkg => pkg.id !== packageId && pkg.isActive
            )
            product.recommendedPackageId = firstActivePackage?.id
          }

          product.updatedAt = new Date().toISOString()
        }

        DebugUtils.info(MODULE_NAME, 'Package option deactivated', { packageId, productId })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error deactivating package option', { error, packageId })
        this.error = 'Failed to deactivate package option'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Установить рекомендуемую упаковку
     */
    async setRecommendedPackage(productId: string, packageId: string): Promise<void> {
      try {
        const product = this.getProductById(productId)
        if (!product) {
          throw new Error('Product not found')
        }

        const packageExists = product.packageOptions.some(pkg => pkg.id === packageId)
        if (!packageExists) {
          throw new Error('Package option not found')
        }

        // Always use productsService (Supabase-only)
        const { productsService } = await import('./productsService')
        await productsService.setRecommendedPackage(productId, packageId)

        // Обновляем рекомендуемую упаковку
        const productIndex = this.products.findIndex(p => p.id === productId)
        if (productIndex !== -1) {
          this.products[productIndex].recommendedPackageId = packageId
          this.products[productIndex].updatedAt = new Date().toISOString()
        }

        DebugUtils.info(MODULE_NAME, 'Recommended package set', { productId, packageId })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error setting recommended package', { error })
        throw error
      }
    },

    /**
     * Получить рекомендуемую упаковку
     */
    getRecommendedPackage(productId: string): PackageOption | null {
      const product = this.getProductById(productId)
      if (!product) return null

      const activePackages = product.packageOptions.filter(pkg => pkg.isActive)

      if (product.recommendedPackageId) {
        const recommended = activePackages.find(pkg => pkg.id === product.recommendedPackageId)
        if (recommended) return recommended
      }

      return activePackages[0] || null
    },

    /**
     * Рассчитать количество упаковок для заданного базового количества
     */
    calculatePackageQuantity(
      productId: string,
      baseQuantity: number,
      packageId?: string
    ): {
      packageOption: PackageOption
      exactPackages: number // 2.5 упаковок
      suggestedPackages: number // 3 упаковки (округленно)
      actualBaseQuantity: number // 3000г (фактически получится)
      difference: number // +500г (разница с требуемым)
    } {
      const product = this.getProductById(productId)
      if (!product) {
        throw new Error('Product not found')
      }

      let packageOption: PackageOption
      const activePackages = product.packageOptions.filter(pkg => pkg.isActive)
      if (packageId) {
        packageOption = activePackages.find(pkg => pkg.id === packageId) || activePackages[0]
      } else {
        packageOption = this.getRecommendedPackage(productId) || activePackages[0]
      }

      if (!packageOption) {
        throw new Error('No package options available')
      }

      const exactPackages = baseQuantity / packageOption.packageSize

      // Для делимых единиц (gram, kg, ml, liter) - разрешаем дробные упаковки
      // Для неделимых (piece, pack) - округляем вверх
      const suggestedPackages = isUnitDivisible(product.baseUnit)
        ? Math.round(exactPackages * 100) / 100 // Round to 2 decimal places for divisible units
        : Math.ceil(exactPackages) // Round up for indivisible units

      const actualBaseQuantity = suggestedPackages * packageOption.packageSize
      const difference = actualBaseQuantity - baseQuantity

      return {
        packageOption,
        exactPackages: Math.round(exactPackages * 100) / 100,
        suggestedPackages,
        actualBaseQuantity,
        difference
      }
    },

    /**
     * Автоматически обновить цену упаковки на основе фактической приемки
     */
    async updatePackageCostFromReceipt(packageId: string, actualPrice: number): Promise<void> {
      try {
        // Находим продукт с данной упаковкой
        const product = this.products.find(p => p.packageOptions.some(pkg => pkg.id === packageId))

        if (!product) {
          throw new Error('Package not found')
        }

        const packageOption = product.packageOptions.find(pkg => pkg.id === packageId)
        if (!packageOption) {
          throw new Error('Package option not found')
        }

        // Рассчитываем новую базовую стоимость
        const newBaseCostPerUnit = actualPrice / packageOption.packageSize

        // Обновляем упаковку
        await this.updatePackageOption({
          id: packageId,
          packagePrice: actualPrice,
          baseCostPerUnit: newBaseCostPerUnit
        })

        // Устанавливаем эту упаковку как рекомендуемую
        await this.setRecommendedPackage(product.id, packageId)

        DebugUtils.info(MODULE_NAME, 'Package cost updated from receipt', {
          packageId,
          actualPrice,
          newBaseCostPerUnit,
          productId: product.id
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error updating package cost from receipt', { error })
        throw error
      }
    },

    /**
     * Получить упаковку по ID
     */
    getPackageById(packageId: string): PackageOption | null {
      for (const product of this.products) {
        const packageOption = product.packageOptions.find(pkg => pkg.id === packageId)
        if (packageOption) return packageOption
      }
      return null
    },

    /**
     * Получить все активные упаковки продукта
     */
    getActivePackages(productId: string): PackageOption[] {
      const product = this.getProductById(productId)
      if (!product) return []

      return product.packageOptions.filter(pkg => pkg.isActive)
    },

    // =============================================
    // ✅ ОБНОВЛЕННЫЕ DEBUG ФУНКЦИИ
    // =============================================

    setupDevDebugFunctions(): void {
      if (!import.meta.env.DEV) return

      window.__PRODUCT_STORE_DEBUG__ = () => {
        DebugUtils.debug(MODULE_NAME, '=== ENHANCED PRODUCT STORE DEBUG ===')
        DebugUtils.debug(MODULE_NAME, 'Products:', this.products.length)

        // Анализируем структуру продуктов
        const withBaseUnits = this.products.filter(p => (p as any).baseUnit).length
        const withoutBaseUnits = this.products.length - withBaseUnits

        DebugUtils.debug(MODULE_NAME, 'Products with base units:', withBaseUnits)
        DebugUtils.debug(
          MODULE_NAME,
          'Products without base units (need migration):',
          withoutBaseUnits
        )

        // Показываем примеры расчетов
        const sampleProduct = this.products[0]
        if (sampleProduct) {
          DebugUtils.debug(
            MODULE_NAME,
            'Sample product for Recipe Store:',
            this.getProductForRecipe(sampleProduct.id)
          )
        }

        return this
      }

      window.__TEST_COST_CALCULATION__ = () => {
        DebugUtils.debug(MODULE_NAME, '🧪 Testing cost calculation with current products...')

        DebugUtils.debug(MODULE_NAME, '📝 RECIPE: Salad Dressing')
        DebugUtils.debug(MODULE_NAME, 'Ingredients:')

        const oliveOil = this.getProductForRecipe('prod-olive-oil')
        const garlic = this.getProductForRecipe('prod-garlic')
        const salt = this.getProductForRecipe('prod-salt')
        const pepper = this.getProductForRecipe('prod-black-pepper')

        if (oliveOil && garlic && salt && pepper) {
          // Оливковое масло: 120 мл
          const oilCost = 120 * oliveOil.baseCostPerUnit
          DebugUtils.debug(
            MODULE_NAME,
            `• Olive Oil: 120 мл × ${oliveOil.baseCostPerUnit} IDR/мл = ${oilCost} IDR`
          )

          // Чеснок: 10 г
          const garlicCost = 10 * garlic.baseCostPerUnit
          DebugUtils.debug(
            MODULE_NAME,
            `• Garlic: 10 г × ${garlic.baseCostPerUnit} IDR/г = ${garlicCost} IDR`
          )

          // Соль: 3 г
          const saltCost = 3 * salt.baseCostPerUnit
          DebugUtils.debug(
            MODULE_NAME,
            `• Salt: 3 г × ${salt.baseCostPerUnit} IDR/г = ${saltCost} IDR`
          )

          // Перец: 1 г
          const pepperCost = 1 * pepper.baseCostPerUnit
          DebugUtils.debug(
            MODULE_NAME,
            `• Black Pepper: 1 г × ${pepper.baseCostPerUnit} IDR/г = ${pepperCost} IDR`
          )

          const totalCost = oilCost + garlicCost + saltCost + pepperCost
          const costPerMl = totalCost / 130 // 130 мл выход

          DebugUtils.debug(MODULE_NAME, `📊 TOTAL: ${totalCost} IDR`)
          DebugUtils.debug(MODULE_NAME, `💰 Cost per ml: ${costPerMl.toFixed(2)} IDR/мл`)
          DebugUtils.debug(MODULE_NAME, '✅ This should match the Recipe Store calculation!')
        } else {
          DebugUtils.debug(MODULE_NAME, '❌ Some products not found for test calculation')
        }

        return {
          oliveOil,
          garlic,
          salt,
          pepper
        }
      }

      DebugUtils.debug(MODULE_NAME, '🔍 Enhanced Product Store loaded! Try:')
      DebugUtils.debug(MODULE_NAME, '  • window.__PRODUCT_STORE_DEBUG__()')
      DebugUtils.debug(MODULE_NAME, '  • window.__TEST_COST_CALCULATION__()')
    }
  }
})
