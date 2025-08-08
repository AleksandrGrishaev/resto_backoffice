// src/stores/preparation/index.ts

/**
 * Preparation Management Store
 *
 * Управление полуфабрикатами с FIFO учетом, отслеживанием коротких сроков годности
 * и интеграцией с системой рецептов для Kitchen и Bar департаментов.
 */

// Export all types
export type {
  PreparationDepartment,
  PreparationOperationType,
  BatchSourceType,
  BatchStatus,
  PreparationBatch,
  BatchAllocation,
  PreparationOperationItem,
  PreparationOperation,
  PreparationBalance,
  PreparationInventoryDocument,
  PreparationInventoryItem,
  CreatePreparationReceiptData,
  PreparationReceiptItem,
  CreatePreparationConsumptionData,
  PreparationConsumptionItem,
  CreatePreparationCorrectionData,
  PreparationCorrectionItem,
  CreatePreparationInventoryData,
  PreparationState
} from './types'

// Export service
export { preparationService } from './preparationService'

// Export store
export { usePreparationStore } from './preparationStore'

// Export mock data for testing
export {
  mockPreparationBatches,
  mockPreparationOperations,
  mockPreparationBalances,
  generatePreparationBatchNumber,
  calculatePreparationFifoAllocation
} from './preparationMock'
