// src/stores/supplier_2/integrations/index.ts
// ✅ Централизованный экспорт всех интеграций supplier store

// =============================================
// PLANNED DELIVERY INTEGRATION
// =============================================

export {
  usePlannedDeliveryIntegration,
  type PlannedDeliveryIntegration
} from './plannedDeliveryIntegration'

// ✅ Для обратной совместимости, экспортируем старый способ как deprecated
export { plannedDeliveryIntegration } from './plannedDeliveryIntegration'

// =============================================
// STORAGE INTEGRATION
// =============================================

export {
  useSupplierStorageIntegration,
  type SupplierStorageIntegration
} from './storageIntegration'

// =============================================
// CONVENIENCE COMPOSABLE
// =============================================

/**
 * ✅ Композабл для получения всех интеграций supplier store
 */
export function useSupplierIntegrations() {
  const plannedDelivery = usePlannedDeliveryIntegration()
  const storage = useSupplierStorageIntegration()

  return {
    plannedDelivery,
    storage
  }
}
