// src/stores/pos/orders/composables/index.ts
// Composables for POS orders module
// Note: useKitchenDecomposition was removed in Phase 4 refactoring
// Kitchen Display uses dish names + modifiers, not ingredient decomposition

export { useOrders, useOrdersComposables } from './useOrders'
export { useOrderCalculations } from './useOrderCalculations'
export { useCancellation } from './useCancellation'
export type { CancellationRequest, CancellationResult } from './useCancellation'
