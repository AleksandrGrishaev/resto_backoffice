// src/stores/menu/index.ts
// Главный файл экспорта для menu store

// Store
export { useMenuStore } from './menuStore'

// Services
export { categoryService, menuItemService, CategoryService, MenuItemService } from './menuService'

// Types и все константы/утилиты
export type {
  Category,
  MenuItem,
  MenuItemVariant,
  MenuComposition,
  ComponentRole,
  MenuState,
  CreateCategoryDto,
  CreateMenuItemDto,
  UpdateCategoryDto,
  UpdateMenuItemDto,
  MenuCostCalculation,
  GroupedComposition,
  SourceOption
} from './types'

// Константы и утилиты
export {
  DEFAULT_CATEGORY,
  DEFAULT_MENU_ITEM,
  DEFAULT_VARIANT,
  MENU_ITEM_TYPES,
  COMPONENT_ROLES,
  CATEGORY_SORT_OPTIONS,
  ITEM_SORT_OPTIONS,
  generateId,
  createTimestamp,
  createDefaultVariant,
  createDefaultCategory,
  createDefaultMenuItem
} from './types'

// Mock данные для разработки/тестирования
export {
  mockCategories,
  mockMenuItems,
  getMockCategoriesWithItems,
  getMockItemsByCategory,
  getMockActiveCategories,
  getMockActiveItems,
  findMenuItemById,
  findCategoryById
} from './menuMock'

// Re-export для удобства
export { useMenuStore as useMenu } from './menuStore'
