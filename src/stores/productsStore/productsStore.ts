// src/stores/productsStore/productsStore.ts - Шаг 3: Используем координатор

import { defineStore } from 'pinia'
import type { ProductsState, Product, CreateProductData, UpdateProductData } from './types'
import { productsService } from './productsService'
import { DebugUtils } from '@/utils'

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
      isActive: true,
      search: ''
    }
  }),

  getters: {
    // Existing getters
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
            product.nameEn?.toLowerCase().includes(searchTerm) || // 🆕 Search in English name
            product.description?.toLowerCase().includes(searchTerm)
        )
      }

      return filtered.sort((a, b) => a.name.localeCompare(b.name))
    },

    // 🆕 Products that can be sold directly (for Menu store)
    sellableProducts: (state): Product[] => {
      return state.products.filter(product => product.isActive && product.canBeSold)
    },

    // 🆕 Raw materials (for recipes/preparations)
    rawMaterials: (state): Product[] => {
      return state.products.filter(product => product.isActive && !product.canBeSold)
    },

    // Enhanced statistics
    statistics: state => {
      const total = state.products.length
      const active = state.products.filter(p => p.isActive).length
      const sellable = state.products.filter(p => p.isActive && p.canBeSold).length
      const rawMaterials = state.products.filter(p => p.isActive && !p.canBeSold).length

      const byCategory = state.products.reduce(
        (acc, product) => {
          acc[product.category] = (acc[product.category] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      return {
        total,
        active,
        inactive: total - active,
        sellable,
        rawMaterials,
        byCategory
      }
    }
  },

  actions: {
    // 🆕 UPDATED: Load products using coordinator
    async loadProducts(useMock = false): Promise<void> {
      try {
        this.loading = true
        this.error = null
        this.useMockMode = useMock

        DebugUtils.info(MODULE_NAME, '🛍️ Loading products', {
          useMock,
          fromWhere: useMock ? 'coordinated mock data' : 'Firebase'
        })

        if (useMock) {
          // 🆕 Use coordinated mock data
          const { mockDataCoordinator } = await import('@/stores/shared')
          const data = mockDataCoordinator.getProductsStoreData()

          this.products = data.products
          // this.priceHistory = data.priceHistory // Когда добавим в state

          DebugUtils.info(MODULE_NAME, '✅ Loaded products from coordinated mock data', {
            count: this.products.length,
            sellable: this.sellableProducts.length,
            rawMaterials: this.rawMaterials.length,
            categories: Object.keys(this.statistics.byCategory),
            hasEnglishNames: this.products.filter(p => p.nameEn).length
          })
        } else {
          // Load from Firebase (existing implementation)
          this.products = await productsService.getAll()

          DebugUtils.info(MODULE_NAME, '✅ Loaded products from Firebase', {
            count: this.products.length
          })
        }

        // 🆕 Enhanced debug logging
        if (this.products.length > 0) {
          DebugUtils.debug(MODULE_NAME, '📋 Sample products loaded', {
            firstFew: this.products.slice(0, 3).map(p => ({
              id: p.id,
              name: p.name,
              nameEn: p.nameEn, // 🆕 Include English name
              canBeSold: p.canBeSold,
              category: p.category,
              tags: p.tags, // 🆕 Include tags
              minStock: p.minStock, // 🆕 Include calculated stock
              maxStock: p.maxStock, // 🆕 Include calculated stock
              costPerUnit: p.costPerUnit || p.currentCostPerUnit // Handle both field names
            }))
          })

          // 🆕 DEV MODE: Expose debug function to window
          if (import.meta.env.DEV) {
            window.__PRODUCT_STORE_DEBUG__ = () => {
              console.log('=== PRODUCT STORE DEBUG ===')
              console.log('Total products:', this.products.length)
              console.log('Sample product (full structure):', this.products[0])
              console.log('')

              console.log('Products summary:')
              console.table(
                this.products.map(p => ({
                  name: p.name,
                  nameEn: p.nameEn || 'Not set',
                  canBeSold: p.canBeSold ? 'Yes' : 'No',
                  category: p.category,
                  tags: p.tags?.join(', ') || 'none',
                  minStock: p.minStock || 'not set',
                  maxStock: p.maxStock || 'not set'
                }))
              )
              console.log('')

              console.log(
                'Sellable products:',
                this.sellableProducts.map(p => p.name)
              )
              console.log(
                'Raw materials:',
                this.rawMaterials.map(p => p.name)
              )
              console.log('')

              console.log('Statistics:', this.statistics)
              console.log('========================')
              console.log('💡 You can access this store as: window.__PRODUCT_STORE_DEBUG__()')

              return this
            }

            // Auto-call debug function for immediate visibility
            setTimeout(() => {
              console.log(
                '🔍 Product Store loaded! Run window.__PRODUCT_STORE_DEBUG__() to see details'
              )
            }, 100)
          }
        }
      } catch (error) {
        DebugUtils.error(MODULE_NAME, '❌ Error loading products', { error })
        this.error = 'Failed to load products'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Existing methods remain the same
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

    // Existing helper methods
    setSelectedProduct(product: Product | null): void {
      this.selectedProduct = product
      DebugUtils.debug(MODULE_NAME, 'Selected product changed', { id: product?.id })
    },

    updateFilters(filters: Partial<ProductsState['filters']>): void {
      this.filters = { ...this.filters, ...filters }
      DebugUtils.debug(MODULE_NAME, 'Filters updated', { filters: this.filters })
    },

    resetFilters(): void {
      this.filters = {
        category: 'all',
        isActive: true,
        search: ''
      }
      DebugUtils.debug(MODULE_NAME, 'Filters reset')
    },

    clearError(): void {
      this.error = null
    }
  }
})
