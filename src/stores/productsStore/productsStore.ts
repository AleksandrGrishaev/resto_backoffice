// src/stores/productsStore/productsStore.ts - Simple Enhanced Version

import { defineStore } from 'pinia'
import type {
  ProductsState,
  Product,
  CreateProductData,
  UpdateProductData,
  ProductPriceHistory,
  ProductUsage,
  ProductConsumption,
  StockRecommendation,
  ProductCategory
} from './types'
import { productsService } from './productsService'
import {
  useStockRecommendations,
  useProductConsumption,
  useProductPriceHistory,
  useProductUsage
} from './composables'
import { DebugUtils } from '@/utils'
import type { ProductForRecipe } from '@/stores/recipes/types'

const MODULE_NAME = 'ProductsStore'

// 🎯 SIMPLE: Extend existing state minimally
interface EnhancedProductsState extends ProductsState {
  // Just add the new analytics arrays
  priceHistory: ProductPriceHistory[]
  usageData: ProductUsage[]
  consumptionData: ProductConsumption[]
  stockRecommendations: StockRecommendation[]
}

export const useProductsStore = defineStore('products', {
  state: (): EnhancedProductsState => ({
    // Existing state
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
    },

    // 🆕 NEW: Just add analytics arrays
    priceHistory: [],
    usageData: [],
    consumptionData: [],
    stockRecommendations: []
  }),

  getters: {
    // Existing getters stay the same
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

      // 🆕 NEW: Add stock-based filters
      if (state.filters.needsReorder) {
        const urgentIds = new Set(
          state.stockRecommendations
            .filter(r => r.urgencyLevel === 'high' || r.urgencyLevel === 'critical')
            .map(r => r.productId)
        )
        filtered = filtered.filter(p => urgentIds.has(p.id))
      }

      return filtered.sort((a, b) => a.name.localeCompare(b.name))
    },

    sellableProducts: (state): Product[] => {
      return state.products.filter(product => product.isActive && (product as any).canBeSold)
    },

    rawMaterials: (state): Product[] => {
      return state.products.filter(product => product.isActive && !(product as any).canBeSold)
    },

    // 🆕 NEW: Simple statistics
    statistics: state => {
      const total = state.products.length
      const active = state.products.filter(p => p.isActive).length
      const sellable = state.products.filter(p => p.isActive && (p as any).canBeSold).length

      const byCategory = state.products.reduce(
        (acc, product) => {
          if (product.isActive) {
            acc[product.category] = (acc[product.category] || 0) + 1
          }
          return acc
        },
        {} as Record<string, number>
      )

      return { total, active, sellable, byCategory }
    },

    // 🆕 NEW: Simple stock summary
    stockSummary: state => {
      const recs = state.stockRecommendations
      return {
        total: recs.length,
        critical: recs.filter(r => r.urgencyLevel === 'critical').length,
        high: recs.filter(r => r.urgencyLevel === 'high').length,
        medium: recs.filter(r => r.urgencyLevel === 'medium').length,
        low: recs.filter(r => r.urgencyLevel === 'low').length
      }
    }
  },

  actions: {
    // 🎯 KEEP: Existing loadProducts method, just enhance it
    async loadProducts(useMock = false): Promise<void> {
      try {
        this.loading = true
        this.error = null
        this.useMockMode = useMock

        DebugUtils.info(MODULE_NAME, '🛍️ Loading products', { useMock })

        if (useMock) {
          const { mockDataCoordinator } = await import('@/stores/shared')
          const data = mockDataCoordinator.getProductsStoreData()

          this.products = data.products
          this.priceHistory = data.priceHistory

          DebugUtils.info(MODULE_NAME, '✅ Products loaded from coordinator', {
            products: this.products.length,
            priceRecords: this.priceHistory.length
          })

          // 🆕 NEW: Load analytics in background
          this.loadAnalyticsBackground()
        } else {
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

    // 🆕 NEW: Simple analytics loading
    async loadAnalyticsBackground(): Promise<void> {
      try {
        DebugUtils.info(MODULE_NAME, '📊 Loading analytics in background')

        const activeProducts = this.products.filter(p => p.isActive)
        if (activeProducts.length === 0) return

        // Load usage and consumption for all products
        const { calculateBulkConsumption } = useProductConsumption()
        const { getProductUsage } = useProductUsage()

        const consumptionPromise = calculateBulkConsumption(activeProducts.map(p => p.id))
        const usagePromises = activeProducts.map(p => getProductUsage(p.id))

        const [bulkConsumption, usageResults] = await Promise.all([
          consumptionPromise,
          Promise.all(usagePromises)
        ])

        this.consumptionData = Object.values(bulkConsumption)
        this.usageData = usageResults

        // Calculate recommendations
        await this.calculateRecommendations()

        DebugUtils.info(MODULE_NAME, '✅ Analytics loaded', {
          consumption: this.consumptionData.length,
          usage: this.usageData.length,
          recommendations: this.stockRecommendations.length
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, '❌ Error loading analytics', { error })
      }
    },

    // 🆕 NEW: Simple recommendations calculation
    async calculateRecommendations(): Promise<void> {
      try {
        DebugUtils.info(MODULE_NAME, '🧮 Calculating recommendations')

        const { calculateBulkRecommendations } = useStockRecommendations()

        // Simple mock stock data
        const stockData: Record<string, number> = {}
        this.products.forEach(product => {
          const days = Math.random() * 10 + 2 // 2-12 days worth
          stockData[product.id] = Math.random() * 20 + 5
        })

        // Use existing consumption data
        const consumptionMap = this.consumptionData.reduce(
          (acc, c) => {
            acc[c.productId] = c
            return acc
          },
          {} as Record<string, ProductConsumption>
        )

        const activeProducts = this.products.filter(p => p.isActive)
        const recommendations = await calculateBulkRecommendations(
          activeProducts,
          stockData,
          consumptionMap
        )

        this.stockRecommendations = recommendations

        DebugUtils.info(MODULE_NAME, '✅ Recommendations calculated', {
          total: recommendations.length,
          critical: recommendations.filter(r => r.urgencyLevel === 'critical').length
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, '❌ Error calculating recommendations', { error })
        throw error
      }
    },

    /**
     * Получает продукт в формате для Recipe Store
     */
    async getProductForRecipe(productId: string): Promise<ProductForRecipe | null> {
      const product = this.products.find(p => p.id === productId)

      if (!product) {
        DebugUtils.warn(MODULE_NAME, `Product not found: ${productId}`)
        return null
      }

      return {
        id: product.id,
        name: product.name,
        nameEn: (product as any).nameEn || product.name,
        costPerUnit: (product as any).currentCostPerUnit || product.costPerUnit,
        unit: product.unit,
        category: product.category,
        isActive: product.isActive
      }
    },

    /**
     * Получает все активные продукты для Recipe Store
     */
    getProductsForRecipes(): ProductForRecipe[] {
      return this.products
        .filter(product => product.isActive)
        .map(product => ({
          id: product.id,
          name: product.name,
          nameEn: (product as any).nameEn || product.name,
          costPerUnit: (product as any).currentCostPerUnit || product.costPerUnit,
          unit: product.unit,
          category: product.category,
          isActive: product.isActive
        }))
    },

    /**
     * Уведомляет об изменении цены продукта
     */
    async notifyPriceChange(productId: string, newPrice: number): Promise<void> {
      DebugUtils.info(MODULE_NAME, `💰 Price changed for product ${productId}: ${newPrice}`)

      // Обновляем продукт
      await this.updateProduct({
        id: productId,
        costPerUnit: newPrice,
        currentCostPerUnit: newPrice
      })

      // Уведомляем Recipe Store о необходимости пересчета
      // Это будет вызываться из Recipe Store
      if (window.__RECIPE_STORE_PRICE_CHANGE_CALLBACK__) {
        await window.__RECIPE_STORE_PRICE_CHANGE_CALLBACK__(productId)
      }
    },

    /**
     * Обновляет информацию об использовании продукта
     */
    updateProductUsage(
      productId: string,
      usageData: {
        usedInPreparations: Array<{
          preparationId: string
          preparationName: string
          quantity: number
          unit: string
        }>
      }
    ): void {
      DebugUtils.debug(MODULE_NAME, `📊 Updating usage for product ${productId}`, {
        preparations: usageData.usedInPreparations.length
      })

      // Сохраняем usage данные для будущей аналитики
      // Пока просто логируем, позже будем сохранять в usageData
      const product = this.products.find(p => p.id === productId)
      if (product) {
        DebugUtils.info(
          MODULE_NAME,
          `Product ${product.name} used in ${usageData.usedInPreparations.length} preparations`
        )
      }
    },

    // 🎯 KEEP: Existing product CRUD, just enhance minimally
    async createProduct(data: CreateProductData): Promise<Product> {
      try {
        this.loading = true
        this.error = null

        DebugUtils.info(MODULE_NAME, 'Creating product', { data, mockMode: this.useMockMode })

        let newProduct: Product

        if (this.useMockMode) {
          const now = new Date().toISOString()
          newProduct = {
            id: `prod-${Date.now()}`,
            ...data,
            isActive: data.isActive ?? true,
            canBeSold: data.canBeSold ?? false,
            createdAt: now,
            updatedAt: now
          }
        } else {
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

    // 🆕 NEW: Simple integration methods
    getProductsForSupplier(): Array<{
      id: string
      name: string
      urgencyLevel: string
      recommendedOrderQuantity: number
    }> {
      return this.rawMaterials
        .map(product => {
          const rec = this.stockRecommendations.find(r => r.productId === product.id)
          return {
            id: product.id,
            name: product.name,
            urgencyLevel: rec?.urgencyLevel || 'low',
            recommendedOrderQuantity: rec?.recommendedOrderQuantity || 0
          }
        })
        .sort((a, b) => {
          const urgencyOrder = { critical: 3, high: 2, medium: 1, low: 0 }
          return urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel]
        })
    },

    getProductsForMenu(): Array<{
      id: string
      name: string
      currentCostPerUnit: number
      unit: string
    }> {
      return this.sellableProducts.map(product => ({
        id: product.id,
        name: product.name,
        currentCostPerUnit: (product as any).currentCostPerUnit || product.costPerUnit,
        unit: product.unit
      }))
    },

    // 🎯 KEEP: Existing helper methods
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

    // 🎯 SIMPLE: Dev debug functions
    setupDevDebugFunctions(): void {
      if (!import.meta.env.DEV) return

      window.__PRODUCT_STORE_DEBUG__ = () => {
        console.log('=== ENHANCED PRODUCT STORE DEBUG ===')
        console.log('Products:', this.products.length)
        console.log('Statistics:', this.statistics)
        console.log('Stock Summary:', this.stockSummary)
        console.log('Analytics:', {
          priceHistory: this.priceHistory.length,
          usage: this.usageData.length,
          consumption: this.consumptionData.length,
          recommendations: this.stockRecommendations.length
        })
        return this
      }

      window.__TEST_STOCK_RECOMMENDATIONS__ = async () => {
        console.log('🧪 Testing Stock Recommendations...')
        await this.calculateRecommendations()
        console.table(
          this.stockRecommendations.slice(0, 5).map(r => ({
            Product: this.products.find(p => p.id === r.productId)?.name,
            Urgency: r.urgencyLevel,
            'Days Until Reorder': r.daysUntilReorder,
            'Order Qty': r.recommendedOrderQuantity
          }))
        )
        return this.stockRecommendations
      }

      setTimeout(() => {
        console.log('🔍 Enhanced Product Store loaded! Try:')
        console.log('  • window.__PRODUCT_STORE_DEBUG__()')
        console.log('  • window.__TEST_STOCK_RECOMMENDATIONS__()')
      }, 100)
    }
  }
})
