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
export { MEASUREMENT_UNITS } from './types'
// ❌ PRODUCT_CATEGORIES removed - use productsStore.getCategoryName() instead

// Export service
export { productsService } from './productsService'
