// src/stores/shared/index.ts - Шаг 3: Exports (обновлено)

// Основной координатор
export { mockDataCoordinator } from './mockDataCoordinator'

// Определения продуктов
export {
  CORE_PRODUCTS,
  getProductDefinition,
  getRawMaterials,
  getSellableProducts
} from './productDefinitions'

// Типы
export type { CoreProductDefinition } from './productDefinitions'
