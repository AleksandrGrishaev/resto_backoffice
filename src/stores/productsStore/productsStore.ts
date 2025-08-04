// src/stores/productsStore/productsStore.ts
import { defineStore } from 'pinia'
import type {
  ProductsState,
  Product,
  ProductCategory,
  CreateProductData,
  UpdateProductData
} from './types'
import { productsService } from './productsService'
import { mockProducts } from './productsMock'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProductsStore'

export const useProductsStore = defineStore('products', {
  state: (): ProductsState => ({
    products: [],
    loading: false,
    error: null,
    selectedProduct: null,
    useMockMode: false, // флаг для режима моков
    filters: {
      category: 'all',
      isActive: true,
      search: ''
    }
  }),

  getters: {
    /**
     * Получение отфильтрованных продуктов
     */
    filteredProducts: (state): Product[] => {
      let filtered = [...state.products]

      // Фильтр по категории
      if (state.filters.category !== 'all') {
        filtered = filtered.filter(product => product.category === state.filters.category)
      }

      // Фильтр по активности
      if (state.filters.isActive !== 'all') {
        filtered = filtered.filter(product => product.isActive === state.filters.isActive)
      }

      // Поиск по названию
      if (state.filters.search) {
        const searchTerm = state.filters.search.toLowerCase()
        filtered = filtered.filter(
          product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description?.toLowerCase().includes(searchTerm)
        )
      }

      return filtered.sort((a, b) => {
        // Сначала по категории, потом по названию
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category)
        }
        return a.name.localeCompare(b.name)
      })
    },

    /**
     * Получение продуктов по категориям
     */
    productsByCategory: (state): Record<ProductCategory, Product[]> => {
      const categories: Record<string, Product[]> = {}

      state.products.forEach(product => {
        if (!categories[product.category]) {
          categories[product.category] = []
        }
        categories[product.category].push(product)
      })

      return categories as Record<ProductCategory, Product[]>
    },

    /**
     * Активные продукты
     */
    activeProducts: (state): Product[] => {
      return state.products.filter(product => product.isActive)
    },

    /**
     * ✅ НОВОЕ: Продукты для прямой продажи
     */
    sellableProducts: (state): Product[] => {
      return state.products.filter(product => product.isActive && product.canBeSold)
    },

    /**
     * ✅ НОВОЕ: Сырье для приготовления (не продается напрямую)
     */
    rawProducts: (state): Product[] => {
      return state.products.filter(product => product.isActive && !product.canBeSold)
    },

    /**
     * Продукты с низким остатком (заглушка для будущей функциональности)
     */
    lowStockProducts: (state): Product[] => {
      return state.products.filter(
        product => product.isActive && product.minStock && product.minStock > 0
      )
    },

    /**
     * Статистика продуктов
     */
    statistics: state => {
      const total = state.products.length
      const active = state.products.filter(p => p.isActive).length
      const inactive = total - active
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
        inactive,
        sellable,
        rawMaterials,
        byCategory
      }
    }
  },

  actions: {
    /**
     * Загрузка всех продуктов
     */
    async loadProducts(useMock = false): Promise<void> {
      try {
        this.loading = true
        this.error = null
        this.useMockMode = useMock

        DebugUtils.info(MODULE_NAME, 'Loading products', { useMock })

        if (useMock) {
          // Используем моковые данные для разработки
          this.products = [...mockProducts]
          DebugUtils.info(MODULE_NAME, 'Loaded mock products', { count: this.products.length })
        } else {
          this.products = await productsService.getAll()
          DebugUtils.info(MODULE_NAME, 'Loaded products from Firebase', {
            count: this.products.length
          })
        }
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error loading products', { error })
        this.error = 'Ошибка загрузки продуктов'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Загрузка только активных продуктов
     */
    async loadActiveProducts(): Promise<void> {
      try {
        this.loading = true
        this.error = null

        DebugUtils.info(MODULE_NAME, 'Loading active products')
        this.products = await productsService.getActiveProducts()
        DebugUtils.info(MODULE_NAME, 'Loaded active products', { count: this.products.length })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error loading active products', { error })
        this.error = 'Ошибка загрузки активных продуктов'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Создание нового продукта
     */
    async createProduct(data: CreateProductData): Promise<Product> {
      try {
        this.loading = true
        this.error = null

        DebugUtils.info(MODULE_NAME, 'Creating product', { data, mockMode: this.useMockMode })

        let newProduct: Product

        if (this.useMockMode) {
          // В режиме моков создаем продукт локально
          const now = new Date().toISOString()
          newProduct = {
            id: `prod-${Date.now()}`, // Генерируем уникальный ID
            ...data,
            isActive: data.isActive ?? true,
            canBeSold: data.canBeSold ?? false, // ✅ по умолчанию не продается
            createdAt: now,
            updatedAt: now
          }
        } else {
          newProduct = await productsService.createProduct(data)
        }

        // Добавляем в локальный массив
        this.products.push(newProduct)

        DebugUtils.info(MODULE_NAME, 'Product created', { id: newProduct.id })
        return newProduct
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error creating product', { error, data })
        this.error = 'Ошибка создания продукта'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Обновление продукта
     */
    async updateProduct(data: UpdateProductData): Promise<void> {
      try {
        this.loading = true
        this.error = null

        DebugUtils.info(MODULE_NAME, 'Updating product', { data, mockMode: this.useMockMode })

        if (!this.useMockMode) {
          await productsService.updateProduct(data)
        }

        // Обновляем в локальном массиве
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
        this.error = 'Ошибка обновления продукта'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Деактивация продукта
     */
    async deactivateProduct(id: string): Promise<void> {
      try {
        this.loading = true
        this.error = null

        DebugUtils.info(MODULE_NAME, 'Deactivating product', { id, mockMode: this.useMockMode })

        if (!this.useMockMode) {
          await productsService.deactivateProduct(id)
        }

        // Обновляем в локальном массиве
        const product = this.products.find(p => p.id === id)
        if (product) {
          product.isActive = false
          product.updatedAt = new Date().toISOString()
        }

        DebugUtils.info(MODULE_NAME, 'Product deactivated', { id })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error deactivating product', { error, id })
        this.error = 'Ошибка деактивации продукта'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Активация продукта
     */
    async activateProduct(id: string): Promise<void> {
      try {
        this.loading = true
        this.error = null

        DebugUtils.info(MODULE_NAME, 'Activating product', { id, mockMode: this.useMockMode })

        if (!this.useMockMode) {
          await productsService.activateProduct(id)
        }

        // Обновляем в локальном массиве
        const product = this.products.find(p => p.id === id)
        if (product) {
          product.isActive = true
          product.updatedAt = new Date().toISOString()
        }

        DebugUtils.info(MODULE_NAME, 'Product activated', { id })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Error activating product', { error, id })
        this.error = 'Ошибка активации продукта'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Установка выбранного продукта
     */
    setSelectedProduct(product: Product | null): void {
      this.selectedProduct = product
      DebugUtils.debug(MODULE_NAME, 'Selected product changed', { id: product?.id })
    },

    /**
     * Обновление фильтров
     */
    updateFilters(filters: Partial<ProductsState['filters']>): void {
      this.filters = { ...this.filters, ...filters }
      DebugUtils.debug(MODULE_NAME, 'Filters updated', { filters: this.filters })
    },

    /**
     * Сброс фильтров
     */
    resetFilters(): void {
      this.filters = {
        category: 'all',
        isActive: true,
        search: ''
      }
      DebugUtils.debug(MODULE_NAME, 'Filters reset')
    },

    /**
     * Очистка ошибок
     */
    clearError(): void {
      this.error = null
    }
  }
})
