// src/stores/productsStore/productsStore.ts - ОБНОВЛЕННАЯ интеграция

import { defineStore } from 'pinia'
import type {
  ProductsState,
  Product,
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
import { DebugUtils } from '@/utils'
import type { ProductForRecipe } from '@/stores/recipes/types'
import type { MeasurementUnit } from '@/types/measurementUnits'

const MODULE_NAME = 'ProductsStore'

export const useProductsStore = defineStore('products', {
  state: (): ProductsState => ({
    products: [],
    loading: false,
    error: null,
    selectedProduct: null,
    useMockMode: false,
    filters: {
      category: 'all',
      isActive: 'all',
      canBeSold: 'all',
      search: '',
      department: 'all',
      needsReorder: false,
      urgencyLevel: 'all'
    }
  }),

  getters: {
    // Существующие геттеры остаются без изменений
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
    }
  },

  actions: {
    // =============================================
    // ОСНОВНЫЕ МЕТОДЫ (без изменений)
    // =============================================

    async loadProducts(useMock = false): Promise<void> {
      try {
        this.loading = true
        this.error = null
        this.useMockMode = useMock

        DebugUtils.info(MODULE_NAME, '🛍️ Loading products', { useMock })

        if (useMock) {
          // ✅ ОБНОВЛЕНО: Получаем продукты с правильной структурой базовых единиц
          const { mockDataCoordinator } = await import('@/stores/shared')
          const data = mockDataCoordinator.getProductsStoreData()

          this.products = data.products

          DebugUtils.info(MODULE_NAME, '✅ Products loaded from coordinator', {
            products: this.products.length
          })
        } else {
          // Загрузка из Firebase (пока не изменяется)
          const { productsService } = await import('./productsService')
          this.products = await productsService.getAll()
          DebugUtils.info(MODULE_NAME, '✅ Products loaded from Firebase', {
            count: this.products.length
          })
        }

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

    async createProduct(data: CreateProductData): Promise<Product> {
      try {
        this.loading = true
        this.error = null

        const now = new Date().toISOString()

        // ✅ Сначала создаем базовую упаковку
        const basePackage: PackageOption = {
          id: `pkg-base-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productId: '', // Будет установлен после создания продукта
          packageName: this.getDefaultPackageName(data.baseUnit),
          packageSize: this.getDefaultPackageSize(data.baseUnit),
          packageUnit: this.getDefaultPackageUnit(data.baseUnit),
          packagePrice: data.baseCostPerUnit * this.getDefaultPackageSize(data.baseUnit),
          baseCostPerUnit: data.baseCostPerUnit,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }

        let newProduct: Product

        if (this.useMockMode) {
          const productId = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

          // Устанавливаем правильный productId в упаковке
          basePackage.productId = productId

          newProduct = {
            id: productId,
            ...data,
            isActive: data.isActive ?? true,
            canBeSold: data.canBeSold ?? false,
            packageOptions: [basePackage], // ✅ Добавляем базовую упаковку
            recommendedPackageId: basePackage.id,
            createdAt: now,
            updatedAt: now
          } as Product
        } else {
          const { productsService } = await import('./productsService')
          newProduct = await productsService.createProduct(data)

          // В реальном сервисе тоже нужно будет создавать базовую упаковку
          basePackage.productId = newProduct.id
          newProduct.packageOptions = [basePackage]
          newProduct.recommendedPackageId = basePackage.id
        }

        this.products.push(newProduct)

        DebugUtils.info(MODULE_NAME, 'Product created with base package', {
          id: newProduct.id,
          basePackageId: basePackage.id,
          packageName: basePackage.packageName
        })

        return newProduct
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error creating product', { error, data })
        this.error = 'Failed to create product'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Вспомогательные методы для создания базовых упаковок
    getDefaultPackageName(baseUnit: BaseUnit): string {
      switch (baseUnit) {
        case 'gram':
          return 'Килограмм'
        case 'ml':
          return 'Литр'
        case 'piece':
          return 'Штука'
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

        DebugUtils.info(MODULE_NAME, 'Updating product', { data, mockMode: this.useMockMode })

        if (!this.useMockMode) {
          const { productsService } = await import('./productsService')
          await productsService.updateProduct(data)
        }

        const index = this.products.findIndex(p => p.id === data.id)
        if (index !== -1) {
          this.products[index] = {
            ...this.products[index],
            ...data,
            updatedAt: new Date().toISOString()
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
    // ✅ ОБНОВЛЕННЫЕ МЕТОДЫ ИНТЕГРАЦИИ
    // =============================================

    /**
     * ✅ ИСПРАВЛЕНО: Получает продукт в формате для Recipe Store с базовыми единицами
     */
    getProductForRecipe(productId: string): ProductForRecipe | null {
      const product = this.getProductById(productId)

      if (!product) {
        DebugUtils.warn(MODULE_NAME, `Product not found: ${productId}`)
        return null
      }

      // ✅ Используем новую структуру с базовыми единицами
      return {
        id: product.id,
        name: product.name,
        nameEn: product.nameEn || product.name,
        baseUnit: product.baseUnit, // Всегда базовая единица
        baseCostPerUnit: product.baseCostPerUnit, // Цена за базовую единицу
        category: product.category,
        isActive: product.isActive,
        // Deprecated поля для совместимости (если нужны)
        unit: product.baseUnit as MeasurementUnit,
        costPerUnit: product.baseCostPerUnit
      }
    },

    /**
     * ✅ ОБНОВЛЕНО: Получает продукт в формате для Menu Store
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
        currentCostPerUnit: product.baseCostPerUnit, // Цена за базовую единицу
        unit: product.baseUnit as MeasurementUnit // Базовая единица
      }
    },

    /**
     * ✅ ОБНОВЛЕНО: Получает продукт в формате для Supplier Store с упаковками
     */
    getProductForSupplier(productId: string): ProductForSupplier | null {
      const product = this.getProductById(productId)

      if (!product) {
        DebugUtils.warn(MODULE_NAME, `Product not found: ${productId}`)
        return null
      }

      // Получаем рекомендуемую упаковку для расчета заказа
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
        packageOptions: product.packageOptions || [] // ✅ ИСПРАВЛЕНО: добавлен fallback
      }
    },

    /**
     * ✅ ОБНОВЛЕННЫЙ МЕТОД: Обновить baseCostPerUnit продукта
     */
    async updateProductCost(productId: string, newBaseCost: number): Promise<void> {
      try {
        const product = this.getProductById(productId)
        if (!product) {
          throw new Error('Product not found')
        }

        // Обновляем базовую стоимость продукта
        const productIndex = this.products.findIndex(p => p.id === productId)
        if (productIndex !== -1) {
          this.products[productIndex].baseCostPerUnit = newBaseCost
          this.products[productIndex].updatedAt = new Date().toISOString()

          // Обновляем стоимость в рекомендуемой упаковке
          if (product.recommendedPackageId) {
            const packageIndex = this.products[productIndex].packageOptions.findIndex(
              pkg => pkg.id === product.recommendedPackageId
            )
            if (packageIndex !== -1) {
              this.products[productIndex].packageOptions[packageIndex].baseCostPerUnit = newBaseCost
              this.products[productIndex].packageOptions[packageIndex].updatedAt =
                new Date().toISOString()
            }
          }
        }

        DebugUtils.info(MODULE_NAME, 'Product cost updated', { productId, newBaseCost })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error updating product cost', { error })
        throw error
      }
    },

    /**
     * ✅ НОВЫЙ МЕТОД: Получает информацию о продукте для заказов
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
     * ✅ НОВЫЙ МЕТОД: Получает все упаковки с лучшими ценами
     */
    getBestPricePackages(): Array<{
      productId: string
      productName: string
      bestPackage: PackageOption
      savings: number // сколько экономим в процентах
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
     * ✅ НОВЫЙ МЕТОД: Мигрирует старый формат продукта в новый
     */
    migrateOldProductToNew(product: Product): ProductForRecipe {
      // Определяем базовую единицу по старой структуре
      const getBaseUnit = (): 'gram' | 'ml' | 'piece' => {
        const unit = (product as any).unit
        const category = product.category.toLowerCase()

        // По категории продукта
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

        // По единице измерения (если есть)
        if (unit) {
          if (['kg', 'gram'].includes(unit)) return 'gram'
          if (['liter', 'ml'].includes(unit)) return 'ml'
          if (['piece', 'pack'].includes(unit)) return 'piece'
        }

        // По умолчанию граммы
        return 'gram'
      }

      // Определяем стоимость за базовую единицу
      const calculateBaseCost = (): number => {
        const baseUnit = getBaseUnit()
        const oldCostPerUnit = (product as any).currentCostPerUnit || product.costPerUnit || 0
        const oldUnit = (product as any).unit

        // Если единицы уже базовые, возвращаем как есть
        if (
          (baseUnit === 'gram' && oldUnit === 'gram') ||
          (baseUnit === 'ml' && oldUnit === 'ml') ||
          (baseUnit === 'piece' && oldUnit === 'piece')
        ) {
          return oldCostPerUnit
        }

        // Конвертируем из крупных единиц в базовые
        if (baseUnit === 'gram' && oldUnit === 'kg') {
          return oldCostPerUnit / 1000 // IDR/кг -> IDR/г
        }

        if (baseUnit === 'ml' && oldUnit === 'liter') {
          return oldCostPerUnit / 1000 // IDR/л -> IDR/мл
        }

        // Если не можем определить, логируем предупреждение
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
        oldCostPerUnit: product.costPerUnit
      })

      return {
        id: product.id,
        name: product.name,
        nameEn: (product as any).nameEn || product.name,
        baseUnit,
        baseCostPerUnit,
        category: product.category,
        isActive: product.isActive,
        // Сохраняем старые поля для совместимости
        unit: (product as any).unit,
        costPerUnit: product.costPerUnit
      }
    },

    /**
     * ✅ ОБНОВЛЕНО: Получает все активные продукты для Recipe Store
     */
    getProductsForRecipes(): ProductForRecipe[] {
      return this.products
        .filter(product => product.isActive)
        .map(product => this.getProductForRecipe(product.id))
        .filter((product): product is ProductForRecipe => product !== null)
    },

    /**
     * ✅ ОБНОВЛЕНО: Уведомляет об изменении цены продукта
     */
    async notifyPriceChange(productId: string, newPrice: number): Promise<void> {
      DebugUtils.info(MODULE_NAME, `💰 Price changed for product ${productId}: ${newPrice}`)

      const product = this.getProductById(productId)
      if (!product) {
        DebugUtils.error(MODULE_NAME, `Product not found for price change: ${productId}`)
        return
      }

      // ✅ УПРОЩЕНО: У нас теперь только новая структура
      await this.updateProduct({
        id: productId,
        baseCostPerUnit: newPrice // Цена уже в базовых единицах
      })

      // ✅ УПРОЩЕНО: Логируем для отладки вместо callback
      DebugUtils.info(MODULE_NAME, 'Product price updated - recipes may need recalculation', {
        productId,
        productName: product.name,
        newBaseCostPerUnit: newPrice,
        baseUnit: product.baseUnit
      })

      // В dev режиме выводим в консоль для удобства отладки
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
        DebugUtils.info(
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

        const now = new Date().toISOString()
        const newPackage: PackageOption = {
          id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...data,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }

        if (!this.useMockMode) {
          const { productsService } = await import('./productsService')
          await productsService.addPackageOption(newPackage)
        }

        // Добавляем упаковку к продукту
        const productIndex = this.products.findIndex(p => p.id === data.productId)
        if (productIndex !== -1) {
          this.products[productIndex].packageOptions.push(newPackage)
          this.products[productIndex].updatedAt = now
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

        if (!this.useMockMode) {
          const { productsService } = await import('./productsService')
          await productsService.updatePackageOption(data)
        }

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
     * Удалить упаковку
     */
    async deletePackageOption(productId: string, packageId: string): Promise<void> {
      try {
        this.loading = true
        this.error = null

        if (!this.useMockMode) {
          const { productsService } = await import('./productsService')
          await productsService.deletePackageOption(packageId)
        }

        // Удаляем упаковку из продукта
        const product = this.products.find(p => p.id === productId)
        if (product) {
          product.packageOptions = product.packageOptions.filter(pkg => pkg.id !== packageId)

          // Если удаляемая упаковка была рекомендуемой, сбрасываем рекомендацию
          if (product.recommendedPackageId === packageId) {
            product.recommendedPackageId = product.packageOptions[0]?.id
          }

          product.updatedAt = new Date().toISOString()
        }

        DebugUtils.info(MODULE_NAME, 'Package option deleted', { packageId, productId })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error deleting package option', { error, packageId })
        this.error = 'Failed to delete package option'
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

        if (!this.useMockMode) {
          const { productsService } = await import('./productsService')
          await productsService.setRecommendedPackage(productId, packageId)
        }

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
      if (!product || !product.recommendedPackageId) {
        return product?.packageOptions[0] || null
      }

      return product.packageOptions.find(pkg => pkg.id === product.recommendedPackageId) || null
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
      if (packageId) {
        packageOption =
          product.packageOptions.find(pkg => pkg.id === packageId) || product.packageOptions[0]
      } else {
        packageOption = this.getRecommendedPackage(productId) || product.packageOptions[0]
      }

      if (!packageOption) {
        throw new Error('No package options available')
      }

      const exactPackages = baseQuantity / packageOption.packageSize
      const suggestedPackages = Math.ceil(exactPackages)
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
