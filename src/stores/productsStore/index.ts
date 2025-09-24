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

// Экспорт констант
export { PRODUCT_CATEGORIES, MEASUREMENT_UNITS } from './types'

// Экспорт сервиса
export { productsService } from './productsService'
