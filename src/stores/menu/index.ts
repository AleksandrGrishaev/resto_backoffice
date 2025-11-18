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
  SourceOption,
  // ✨ NEW: Exported new types
  Department,
  DishType,
  ModifierGroupStyle,
  ModifierGroup,
  ModifierOption,
  ModifierType,
  VariantTemplate,
  SelectedModifier
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
  createDefaultMenuItem,
  // ✨ NEW: Exported new constants
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  DEFAULT_DEPARTMENTS,
  DISH_TYPES,
  DISH_TYPE_DESCRIPTIONS,
  DISH_TYPE_ICONS,
  MODIFIER_GROUP_STYLES,
  MODIFIER_TYPES,
  MODIFIER_TYPE_ICONS,
  DEFAULT_MODIFIER_GROUP,
  DEFAULT_MODIFIER_OPTION,
  DEFAULT_VARIANT_TEMPLATE,
  createDefaultModifierGroup,
  createDefaultModifierOption,
  createDefaultVariantTemplate
} from './types'

// Re-export для удобства
export { useMenuStore as useMenu } from './menuStore'
