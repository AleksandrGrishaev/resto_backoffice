// src/stores/productsStore/index.ts

// Экспорт основного store
export { useProductsStore } from './productsStore'

// Экспорт типов
export type {
  Product,
  ProductCategory,
  MeasurementUnit,
  ProductsState,
  CreateProductData,
  UpdateProductData
} from './types'

export * from './productsMock'

// Экспорт констант
export { PRODUCT_CATEGORIES, MEASUREMENT_UNITS } from './types'

// Экспорт сервиса
export { productsService } from './productsService'

// Экспорт моковых данных (для разработки)
export { mockProducts, getRandomProduct, getMockProductsByCategory } from './productsMock'
