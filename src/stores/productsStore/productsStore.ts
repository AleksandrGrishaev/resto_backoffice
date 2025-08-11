// src/stores/productsStore/productsStore.ts - ОБНОВЛЕННАЯ интеграция

import { defineStore } from 'pinia'
import type { ProductsState, Product, CreateProductData, UpdateProductData } from './types'
import { DebugUtils } from '@/utils'
import type { ProductForRecipe } from '@/stores/recipes/types'

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

        DebugUtils.info(MODULE_NAME, 'Creating product', { data, mockMode: this.useMockMode })

        let newProduct: Product

        if (this.useMockMode) {
          // ✅ ОБНОВЛЕНО: Создаем продукт с правильной структурой базовых единиц
          const now = new Date().toISOString()
          newProduct = {
            id: `prod-${Date.now()}`,
            ...data,
            isActive: data.isActive ?? true,
            canBeSold: data.canBeSold ?? false,
            createdAt: now,
            updatedAt: now
          } as Product
        } else {
          const { productsService } = await import('./productsService')
          newProduct = await productsService.createProduct(data)
        }

        this.products.push(newProduct)
        DebugUtils.info(MODULE_NAME, 'Product created', { id: newProduct.id })
        return newProduct
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error creating product', { error, data })
        this.error = 'Failed to create product'
        throw error
      } finally {
        this.loading = false
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

      // ✅ ПРОВЕРЯЕМ: Есть ли у продукта новая структура с базовыми единицами?
      const hasBaseUnits =
        (product as any).baseUnit && (product as any).baseCostPerUnit !== undefined

      if (hasBaseUnits) {
        // ✅ НОВАЯ СТРУКТУРА: Продукт уже имеет правильные базовые единицы
        return {
          id: product.id,
          name: product.name,
          nameEn: (product as any).nameEn || product.name,
          baseUnit: (product as any).baseUnit,
          baseCostPerUnit: (product as any).baseCostPerUnit,
          category: product.category,
          isActive: product.isActive
        }
      } else {
        // ✅ МИГРАЦИЯ: Преобразуем старую структуру в новую
        DebugUtils.warn(MODULE_NAME, `Product ${productId} uses old structure, migrating...`)

        return this.migrateOldProductToNew(product)
      }
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

      // ✅ ОБНОВЛЕНО: Обновляем цену в зависимости от структуры продукта
      const hasBaseUnits =
        (product as any).baseUnit && (product as any).baseCostPerUnit !== undefined

      if (hasBaseUnits) {
        // ✅ НОВАЯ СТРУКТУРА: Обновляем baseCostPerUnit
        await this.updateProduct({
          id: productId,
          baseCostPerUnit: newPrice, // Цена уже в базовых единицах
          purchaseCost: newPrice * ((product as any).purchaseToBaseRatio || 1) // Пересчитываем цену закупки
        })
      } else {
        // ✅ СТАРАЯ СТРУКТУРА: Обновляем costPerUnit
        await this.updateProduct({
          id: productId,
          costPerUnit: newPrice,
          currentCostPerUnit: newPrice
        })
      }

      // Уведомляем Recipe Store о необходимости пересчета
      if (window.__RECIPE_STORE_PRICE_CHANGE_CALLBACK__) {
        await window.__RECIPE_STORE_PRICE_CHANGE_CALLBACK__(productId)
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
      this.filters = { ...this.filters, ...filters }
      DebugUtils.debug(MODULE_NAME, 'Filters updated', { filters: this.filters })
    },

    resetFilters(): void {
      this.filters = {
        category: 'all',
        isActive: 'all',
        canBeSold: 'all',
        search: '',
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
    // ✅ ОБНОВЛЕННЫЕ DEBUG ФУНКЦИИ
    // =============================================

    setupDevDebugFunctions(): void {
      if (!import.meta.env.DEV) return

      window.__PRODUCT_STORE_DEBUG__ = () => {
        console.log('=== ENHANCED PRODUCT STORE DEBUG ===')
        console.log('Products:', this.products.length)

        // Анализируем структуру продуктов
        const withBaseUnits = this.products.filter(p => (p as any).baseUnit).length
        const withoutBaseUnits = this.products.length - withBaseUnits

        console.log('Products with base units:', withBaseUnits)
        console.log('Products without base units (need migration):', withoutBaseUnits)

        // Показываем примеры расчетов
        const sampleProduct = this.products[0]
        if (sampleProduct) {
          console.log('\nSample product for Recipe Store:')
          console.log(this.getProductForRecipe(sampleProduct.id))
        }

        return this
      }

      window.__TEST_COST_CALCULATION__ = () => {
        console.log('🧪 Testing cost calculation with current products...')

        // Тестируем расчет для салатной заправки
        console.log('\n📝 RECIPE: Salad Dressing')
        console.log('Ingredients:')

        const oliveOil = this.getProductForRecipe('prod-olive-oil')
        const garlic = this.getProductForRecipe('prod-garlic')
        const salt = this.getProductForRecipe('prod-salt')
        const pepper = this.getProductForRecipe('prod-black-pepper')

        if (oliveOil && garlic && salt && pepper) {
          // Оливковое масло: 120 мл
          const oilCost = 120 * oliveOil.baseCostPerUnit
          console.log(`• Olive Oil: 120 мл × ${oliveOil.baseCostPerUnit} IDR/мл = ${oilCost} IDR`)

          // Чеснок: 10 г
          const garlicCost = 10 * garlic.baseCostPerUnit
          console.log(`• Garlic: 10 г × ${garlic.baseCostPerUnit} IDR/г = ${garlicCost} IDR`)

          // Соль: 3 г
          const saltCost = 3 * salt.baseCostPerUnit
          console.log(`• Salt: 3 г × ${salt.baseCostPerUnit} IDR/г = ${saltCost} IDR`)

          // Перец: 1 г
          const pepperCost = 1 * pepper.baseCostPerUnit
          console.log(`• Black Pepper: 1 г × ${pepper.baseCostPerUnit} IDR/г = ${pepperCost} IDR`)

          const totalCost = oilCost + garlicCost + saltCost + pepperCost
          const costPerMl = totalCost / 130 // 130 мл выход

          console.log(`\n📊 TOTAL: ${totalCost} IDR`)
          console.log(`💰 Cost per ml: ${costPerMl.toFixed(2)} IDR/мл`)
          console.log('\n✅ This should match the Recipe Store calculation!')
        } else {
          console.log('❌ Some products not found for test calculation')
        }

        return {
          oliveOil,
          garlic,
          salt,
          pepper
        }
      }

      setTimeout(() => {
        console.log('🔍 Enhanced Product Store loaded! Try:')
        console.log('  • window.__PRODUCT_STORE_DEBUG__()')
        console.log('  • window.__TEST_COST_CALCULATION__()')
      }, 100)
    }
  }
})
