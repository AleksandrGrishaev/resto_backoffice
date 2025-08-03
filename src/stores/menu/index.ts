// stores/menu/index.ts
// Главный файл экспорта для menu store

// Store
export { useMenuStore } from './menuStore'

// Services
export { categoryService, menuItemService, CategoryService, MenuItemService } from './menuService'

// Types
export type {
  Category,
  MenuItem,
  MenuItemVariant,
  MenuState,
  CreateCategoryDto,
  CreateMenuItemDto,
  UpdateCategoryDto,
  UpdateMenuItemDto
} from './types'

// Default data and utilities
export {
  DEFAULT_CATEGORY,
  DEFAULT_MENU_ITEM,
  DEFAULT_VARIANT,
  MENU_ITEM_TYPES,
  CATEGORY_SORT_OPTIONS,
  ITEM_SORT_OPTIONS,
  createDefaultVariant,
  createDefaultCategory,
  createDefaultMenuItem
} from './defaultMenu'

// Re-export для удобства
export { useMenuStore as useMenu } from './menuStore'
