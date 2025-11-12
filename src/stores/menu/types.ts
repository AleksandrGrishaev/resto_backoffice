// src/stores/menu/types.ts
import type { BaseEntity } from '@/types/common'
import type { MeasurementUnit } from '@/types/measurementUnits'

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

// ✨ NEW: Тип блюда (определяет UI и логику модификаторов)
export type DishType = 'simple' | 'component-based' | 'addon-based'

// ✨ NEW: Стиль группы модификаторов
export type ModifierGroupStyle = 'component' | 'addon'

export interface MenuItem extends BaseEntity {
  categoryId: string
  name: string // "Стейк с гарниром", "Пиво Bintang"
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
  quantity: number // количество в конкретных единицах (не порциях!)
  unit: MeasurementUnit // 'gram', 'ml', 'piece' - конкретные единицы
  role?: ComponentRole // роль в блюде (для UI группировки)
  notes?: string
}

export type ComponentRole = 'main' | 'garnish' | 'sauce' | 'addon'

// =============================================
// Модификаторы (для составных блюд)
// =============================================

export type ModifierType = 'replacement' | 'addon' | 'removal'

export interface ModifierGroup {
  id: string
  name: string // "Choose your bread", "Extra proteins", "Sauces"
  description?: string
  type: ModifierType
  groupStyle: ModifierGroupStyle // ✨ NEW: component (замена) vs addon (добавление)
  isRequired: boolean
  minSelection?: number // минимум выбрать (для addon)
  maxSelection?: number // максимум выбрать (0 = без ограничений)
  options: ModifierOption[]
  sortOrder?: number
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
  groupStyle: ModifierGroupStyle // ✨ NEW: component vs addon
  optionId: string
  optionName: string
  priceAdjustment: number
  composition?: MenuComposition[] // что добавилось
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
  groupStyle: 'addon', // ✨ NEW: по умолчанию addon
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

// ✨ NEW: Константы для типов блюд
export const DISH_TYPES: Record<DishType, string> = {
  simple: 'Простое блюдо',
  'component-based': 'Составное блюдо',
  'addon-based': 'Блюдо с дополнениями'
}

export const DISH_TYPE_DESCRIPTIONS: Record<DishType, string> = {
  simple: 'Без модификаторов (фиксированная композиция)',
  'component-based': 'С заменяемыми компонентами (гарнир, соус)',
  'addon-based': 'Только дополнительные опции'
}

export const DISH_TYPE_ICONS: Record<DishType, string> = {
  simple: 'mdi-food',
  'component-based': 'mdi-food-variant',
  'addon-based': 'mdi-plus-box-multiple'
}

// ✨ NEW: Константы для стилей групп модификаторов
export const MODIFIER_GROUP_STYLES: Record<ModifierGroupStyle, string> = {
  component: 'Компонент (замена части блюда)',
  addon: 'Дополнение (добавление к блюду)'
}

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
}

export interface ProductOption {
  id: string
  name: string
  category: string
  unit: MeasurementUnit
  costPerUnit: number
  canBeSold?: boolean
}
