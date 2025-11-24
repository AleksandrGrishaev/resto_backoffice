// src/stores/productsStore/index.ts

// Export main store
export { useProductsStore } from './productsStore'

// Export types
export type {
  Product,
  ProductCategory,
  MeasurementUnit,
  ProductsState,
  CreateProductData,
  UpdateProductData
} from './types'

// Export constants
export { PRODUCT_CATEGORIES, MEASUREMENT_UNITS } from './types'

// Export service
export { productsService } from './productsService'
