// src/stores/shared/index.ts - ОБНОВЛЕНО с storageDefinitions.ts

// =============================================
// ОСНОВНОЙ КООРДИНАТОР
// =============================================

export { mockDataCoordinator } from './mockDataCoordinator'

// =============================================
// ОПРЕДЕЛЕНИЯ ПРОДУКТОВ
// =============================================

export {
  CORE_PRODUCTS,
  getProductDefinition,
  getRawMaterials,
  getSellableProducts,
  validateAllProducts,
  demonstrateCostCalculation
} from './productDefinitions'

export type { CoreProductDefinition } from './productDefinitions'

// =============================================
// ОПРЕДЕЛЕНИЯ ПОСТАВЩИКОВ
// =============================================

export {
  getSupplierWorkflowData,
  getRequestById,
  getOrderById,
  getReceiptById,
  getRequestsByStatus,
  getOrdersByStatus,
  getReceiptsByStatus,
  getSupplierStatistics,
  getSuggestionsForDepartment,
  validateSupplierDefinitions
} from './supplierDefinitions'

export type { CoreSupplierWorkflow } from './supplierDefinitions'

// =============================================
// ОПРЕДЕЛЕНИЯ СКЛАДА (НОВОЕ)
// =============================================

export {
  getStorageWorkflowData,
  regenerateStorageData,
  generateBatchNumber,
  validateStorageDefinitions,
  demonstrateStorageCalculations
} from './storageDefinitions'

export type { CoreStorageWorkflow } from './storageDefinitions'
