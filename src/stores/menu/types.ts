// src/stores/menu/types.ts
import type { BaseEntity } from '@/types/common'
import type { MeasurementUnit } from '@/types/measurementUnits'
import type { PortionType } from '@/stores/recipes/types'

// =============================================
// Основные типы меню
// =============================================

export interface Category extends BaseEntity {
  name: string
  description?: string
  isActive: boolean
  sortOrder: number
}

export type Department = 'kitchen' | 'bar'

// ✨ UPDATED: Упрощенный тип блюда (2 типа вместо 3)
export type DishType = 'simple' | 'modifiable'
// simple: фиксированная композиция, нет модификаторов
// modifiable: есть модификаторы (обязательные или опциональные)

export interface MenuItem extends BaseEntity {
  categoryId: string
  name: string // "Стейк с гарниром", "Пиво Bintang"
  nameEn?: string // English name (optional)
  description?: string
  type: 'food' | 'beverage'
  department: Department // добавить это поле
  dishType: DishType // ✨ NEW: тип блюда (simple/component-based/addon-based)
  isActive: boolean
  variants: MenuItemVariant[]
  sortOrder: number
  preparationTime?: number // в минутах
  allergens?: string[]
  tags?: string[]
  imageUrl?: string // Menu item image

  // ✨ NEW: Модификаторы на уровне блюда (общие для всех вариантов)
  modifierGroups?: ModifierGroup[]
  templates?: VariantTemplate[]
}

export interface MenuItemVariant {
  id: string
  name: string // "с картошкой фри", "с пюре", "330мл", "500мл"
  price: number // ЦЕНА ПРОДАЖИ (базовая цена без модификаторов)
  isActive: boolean
  sortOrder?: number

  // ✅ Композиция - единственный способ определить состав варианта
  composition: MenuComposition[]

  // Дополнительные поля
  portionMultiplier?: number // для масштабирования количества в композиции и модификаторах
  notes?: string

  // ❌ УДАЛЕНО: modifierGroups и templates перенесены на уровень MenuItem
}

// =============================================
// Композиция блюда
// =============================================

export interface MenuComposition {
  type: 'product' | 'recipe' | 'preparation' // что добавляем
  id: string // ID компонента
  quantity: number // количество в конкретных единицах (порции для portion-type)
  unit: MeasurementUnit // 'gram', 'ml', 'piece', 'portion' - конкретные единицы
  role?: ComponentRole // роль в блюде (для UI группировки)
  useYieldPercentage?: boolean // ✅ NEW: apply yield adjustment for products (Sprint 6)
  notes?: string
  // ⭐ PHASE 2: Portion type support (for portion-type preparations)
  portionType?: PortionType // 'weight' | 'portion' - cached from preparation
  portionSize?: number // grams per portion - cached from preparation
}

export type ComponentRole = 'main' | 'garnish' | 'sauce' | 'addon'

// =============================================
// Модификаторы (для составных блюд)
// =============================================

export type ModifierType = 'replacement' | 'addon' | 'removal'

// =============================================
// Target Component (для replacement модификаторов)
// =============================================

/**
 * Указывает какой компонент рецепта/варианта заменяется модификатором.
 * Используется только для ModifierGroup с type='replacement'.
 */
export interface TargetComponent {
  /** Откуда берётся компонент: из composition варианта или из рецепта */
  sourceType: 'variant' | 'recipe'
  /** ID рецепта (если sourceType === 'recipe') */
  recipeId?: string
  /** ID компонента в рецепте (RecipeComponent.id) или index в variant composition */
  componentId: string
  /** Тип компонента для валидации */
  componentType: 'product' | 'recipe' | 'preparation'
  /** Название компонента для отображения в UI */
  componentName: string
}

export interface ModifierGroup {
  id: string
  name: string // "Choose your bread", "Extra proteins", "Sauces"
  description?: string
  type: ModifierType
  // ✅ groupStyle удалено - логика определяется через isRequired
  // isRequired=true → обязательный выбор (бывший "component")
  // isRequired=false → опциональное добавление (бывший "addon")
  isRequired: boolean
  minSelection?: number // минимум выбрать
  maxSelection?: number // максимум выбрать (0 = без ограничений)
  options: ModifierOption[]
  sortOrder?: number

  /**
   * Какой компонент рецепта/варианта заменяется (только для type='replacement').
   * Если указан - при decomposition исключаем target и добавляем выбранную альтернативу.
   * Если не указан - работает как addon (обратная совместимость).
   */
  targetComponent?: TargetComponent
}

export interface ModifierOption {
  id: string
  name: string // "Toast", "Mozzarella", "Bacon"
  description?: string

  // Что добавляется/заменяется в композиции
  composition?: MenuComposition[] // компоненты для добавления

  // Доплата за модификатор
  priceAdjustment: number // +10000, +0, -5000

  // UI и логика
  isDefault?: boolean // выбрано по умолчанию
  isActive?: boolean
  sortOrder?: number
  imageUrl?: string
}

export interface VariantTemplate {
  id: string
  name: string // "Toast base", "Big breakfast - standard"
  description?: string
  imageUrl?: string

  // Какие модификаторы выбраны в шаблоне
  selectedModifiers: TemplateModifierSelection[]

  sortOrder?: number
}

export interface TemplateModifierSelection {
  groupId: string // ID группы модификаторов
  optionIds: string[] // IDs опций (может быть несколько для addon)
}

// =============================================
// Выбранные модификаторы (для заказа в POS)
// =============================================

export interface SelectedModifier {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  priceAdjustment: number
  composition?: MenuComposition[] // что добавилось к базовой композиции

  /** Тип модификатора для логики decomposition */
  groupType?: ModifierType
  /** Какой компонент заменяется (копия из ModifierGroup для decomposition) */
  targetComponent?: TargetComponent
  /** Если true - использовать оригинальный компонент из рецепта (не заменять) */
  isDefault?: boolean
}

// =============================================
// DTOs для создания/обновления
// =============================================

export interface CreateCategoryDto {
  name: string
  description?: string
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface CreateMenuItemDto {
  categoryId: string
  name: string
  description?: string
  type: 'food' | 'beverage'
  department: Department
  dishType: DishType // ✨ NEW: тип блюда
  variants: CreateMenuItemVariantDto[]
  sortOrder?: number
  preparationTime?: number
  allergens?: string[]
  tags?: string[]

  // ✨ NEW: Модификаторы и шаблоны на уровне блюда
  modifierGroups?: ModifierGroup[]
  templates?: VariantTemplate[]
}

export interface CreateMenuItemVariantDto {
  name: string
  price: number
  composition: MenuComposition[]
  portionMultiplier?: number
  isActive?: boolean
  sortOrder?: number
  notes?: string
}

export interface UpdateMenuItemDto extends Partial<CreateMenuItemDto> {
  isActive?: boolean
  variants?: MenuItemVariant[] // полная замена вариантов при обновлении
  department: Department
}

// =============================================
// State типы
// =============================================

export interface MenuState {
  categories: Category[]
  menuItems: MenuItem[]
  loading: boolean
  error: string | null
  selectedCategoryId: string | null
}

// =============================================
// Константы и дефолтные значения
// =============================================

export const DEFAULT_CATEGORY: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true
}

export const DEFAULT_MENU_ITEM: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'> = {
  categoryId: '',
  name: '',
  description: '',
  isActive: true,
  type: 'food',
  department: 'kitchen',
  dishType: 'simple', // ✨ NEW: по умолчанию simple
  variants: [],
  sortOrder: 0,
  preparationTime: 0,
  allergens: [],
  tags: []
}

export const DEFAULT_VARIANT: Omit<MenuItemVariant, 'id'> = {
  name: '',
  price: 0,
  isActive: true,
  sortOrder: 0,
  composition: []
}

export const DEFAULT_MODIFIER_GROUP: Omit<ModifierGroup, 'id'> = {
  name: '',
  description: '',
  type: 'addon',
  // ✅ groupStyle удалено
  isRequired: false,
  minSelection: 0,
  maxSelection: 0,
  options: [],
  sortOrder: 0
}

export const DEFAULT_MODIFIER_OPTION: Omit<ModifierOption, 'id'> = {
  name: '',
  description: '',
  composition: [],
  priceAdjustment: 0,
  isDefault: false,
  isActive: true,
  sortOrder: 0
}

export const DEFAULT_VARIANT_TEMPLATE: Omit<VariantTemplate, 'id'> = {
  name: '',
  description: '',
  selectedModifiers: [],
  sortOrder: 0
}

// Добавить новые константы после MENU_ITEM_TYPES:
export const DEPARTMENTS = {
  KITCHEN: 'kitchen',
  BAR: 'bar'
} as const

export const DEPARTMENT_LABELS: Record<Department, string> = {
  kitchen: 'Kitchen',
  bar: 'Bar'
}

export const DEFAULT_DEPARTMENTS: Record<'food' | 'beverage', Department> = {
  food: 'kitchen',
  beverage: 'bar'
}

export const MENU_ITEM_TYPES = {
  FOOD: 'food',
  BEVERAGE: 'beverage'
} as const

export const COMPONENT_ROLES: Record<ComponentRole, string> = {
  main: 'Основное',
  garnish: 'Гарнир',
  sauce: 'Соус',
  addon: 'Дополнение'
}

// ✨ UPDATED: Константы для упрощенных типов блюд
export const DISH_TYPES: Record<DishType, string> = {
  simple: 'Simple Dish',
  modifiable: 'Customizable Dish'
}

export const DISH_TYPE_DESCRIPTIONS: Record<DishType, string> = {
  simple: 'Fixed composition, no modifiers',
  modifiable: 'With required/optional modifiers (sides, add-ons, etc.)'
}

export const DISH_TYPE_ICONS: Record<DishType, string> = {
  simple: 'mdi-food',
  modifiable: 'mdi-food-variant'
}

// ✅ MODIFIER_GROUP_STYLES удалено - groupStyle больше не используется

export const MODIFIER_TYPES: Record<ModifierType, string> = {
  replacement: 'Замена',
  addon: 'Добавка',
  removal: 'Удаление'
}

export const MODIFIER_TYPE_ICONS: Record<ModifierType, string> = {
  replacement: 'mdi-swap-horizontal',
  addon: 'mdi-plus-circle-outline',
  removal: 'mdi-minus-circle-outline'
}

export const CATEGORY_SORT_OPTIONS = [
  { value: 'name', text: 'По названию' },
  { value: 'sortOrder', text: 'По порядку' },
  { value: 'createdAt', text: 'По дате создания' }
]

export const ITEM_SORT_OPTIONS = [
  { value: 'name', text: 'По названию' },
  { value: 'sortOrder', text: 'По порядку' },
  { value: 'price', text: 'По цене' },
  { value: 'createdAt', text: 'По дате создания' }
]

// =============================================
// Утилиты для создания новых объектов
// =============================================

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function createTimestamp(): string {
  return new Date().toISOString()
}

export function createDefaultVariant(): MenuItemVariant {
  return {
    ...DEFAULT_VARIANT,
    id: generateId('var')
  }
}

export function createDefaultCategory(): Omit<Category, 'id' | 'createdAt' | 'updatedAt'> {
  return { ...DEFAULT_CATEGORY }
}

export function createDefaultMenuItem(): Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ...DEFAULT_MENU_ITEM,
    variants: [createDefaultVariant()]
  }
}

export function createDefaultModifierGroup(): ModifierGroup {
  return {
    ...DEFAULT_MODIFIER_GROUP,
    id: generateId('mg')
  }
}

export function createDefaultModifierOption(): ModifierOption {
  return {
    ...DEFAULT_MODIFIER_OPTION,
    id: generateId('mo')
  }
}

export function createDefaultVariantTemplate(): VariantTemplate {
  return {
    ...DEFAULT_VARIANT_TEMPLATE,
    id: generateId('tmpl')
  }
}

// =============================================
// Утилиты для расчетов
// =============================================

/**
 * Расчет примерной себестоимости варианта меню
 * (требует загруженные данные products/recipes/preparations)
 */
export interface MenuCostCalculation {
  totalCost: number
  margin: number
  marginPercent: number
  components: {
    type: string
    name: string
    cost: number
    quantity: number
    unit: string
  }[]
}

/**
 * Группировка компонентов по ролям для отображения
 */
export interface GroupedComposition {
  main: MenuComposition[]
  garnish: MenuComposition[]
  sauce: MenuComposition[]
  addon: MenuComposition[]
}

// =============================================
// Вспомогательные типы для UI (упрощенные)
// =============================================

export interface DishOption {
  id: string
  name: string
  type: 'recipe' | 'preparation'
  unit: MeasurementUnit
  outputQuantity: number
  category?: string
  // ⭐ PHASE 2: Portion type support
  portionType?: PortionType // 'weight' | 'portion'
  portionSize?: number // grams per portion (only for portionType='portion')
}

export interface ProductOption {
  id: string
  name: string
  category: string
  unit: MeasurementUnit
  costPerUnit: number
  canBeSold?: boolean
}
