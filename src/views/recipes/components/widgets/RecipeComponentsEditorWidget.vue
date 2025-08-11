<!-- src/views/recipes/components/widgets/RecipeComponentsEditorWidget.vue - ИСПРАВЛЕНО -->
<template>
  <div class="components-section">
    <div class="d-flex justify-space-between align-center mb-4">
      <h3 class="text-h6">
        {{ type === 'preparation' ? 'Recipe (Products only)' : 'Components' }}
      </h3>
      <v-btn
        color="primary"
        variant="outlined"
        size="small"
        prepend-icon="mdi-plus"
        @click="handleAddComponent"
      >
        Add {{ type === 'preparation' ? 'Product' : 'Component' }}
      </v-btn>
    </div>

    <div v-if="components.length === 0" class="text-center text-medium-emphasis py-4">
      No {{ type === 'preparation' ? 'products' : 'components' }} added yet
    </div>

    <div v-else class="components-list">
      <v-card
        v-for="(component, index) in components"
        :key="component.id"
        variant="outlined"
        class="mb-2"
      >
        <v-card-text class="pa-3">
          <v-row align="center">
            <!-- Component Type (recipes only) -->
            <v-col v-if="type === 'recipe'" cols="12" md="2">
              <v-select
                :model-value="component.componentType"
                :items="componentTypes"
                item-title="text"
                item-value="value"
                label="Type"
                variant="outlined"
                density="compact"
                :rules="[validateRequired]"
                required
                @update:model-value="handleComponentTypeChange(index, $event)"
              />
            </v-col>

            <!-- Component Selection -->
            <v-col cols="12" :md="type === 'recipe' ? 3 : 4">
              <v-select
                :model-value="component.componentId"
                :items="getAvailableItems(component.componentType || 'product')"
                item-title="label"
                item-value="id"
                :label="getItemLabel(component.componentType || 'product')"
                variant="outlined"
                density="compact"
                :rules="[validateRequired]"
                required
                @update:model-value="handleComponentIdChange(index, $event)"
              />
              <!-- ✅ ИСПРАВЛЕНО: Улучшенное отображение цены с базовыми единицами -->
              <div v-if="component.componentId" class="price-display mt-1">
                {{ getEnhancedPriceDisplay(component) }}
              </div>
            </v-col>

            <!-- Quantity -->
            <v-col cols="6" :md="type === 'recipe' ? 2 : 2">
              <v-text-field
                :model-value="component.quantity"
                label="Quantity"
                type="number"
                step="0.1"
                variant="outlined"
                density="compact"
                :rules="[validateRequired, validatePositiveNumber]"
                required
                @update:model-value="handleQuantityChange(index, $event)"
              />
            </v-col>

            <!-- Unit -->
            <v-col cols="6" :md="type === 'recipe' ? 2 : 2">
              <v-select
                :model-value="component.unit"
                :items="getCompatibleUnits(component)"
                item-title="label"
                item-value="value"
                label="Unit"
                variant="outlined"
                density="compact"
                :rules="[validateRequired, validateUnitCompatibility(component)]"
                required
                @update:model-value="handleUnitChange(index, $event)"
              />
              <!-- ✅ НОВОЕ: Индикатор совместимости единиц -->
              <div v-if="getUnitCompatibilityInfo(component)" class="unit-compatibility mt-1">
                {{ getUnitCompatibilityInfo(component) }}
              </div>
            </v-col>

            <!-- Notes -->
            <v-col cols="12" :md="type === 'recipe' ? 2 : 3">
              <v-text-field
                :model-value="component.notes"
                label="Notes"
                placeholder="diced, minced"
                variant="outlined"
                density="compact"
                @update:model-value="handleNotesChange(index, $event)"
              />
            </v-col>

            <!-- Delete button -->
            <v-col cols="12" md="1">
              <v-btn
                icon="mdi-delete"
                color="error"
                variant="text"
                size="small"
                @click="handleRemoveComponent(index)"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { MeasurementUnit } from '@/stores/recipes/types'
// ✅ НОВОЕ: Импорт централизованных утилит валюты
import { formatIDR, getBaseUnitDisplay } from '@/utils/currency'

// ===== TYPES =====
interface Component {
  id: string
  componentId: string
  componentType: string
  quantity: number
  unit: string
  notes: string
}

interface ProductItem {
  id: string
  name: string
  unit: string
  isActive: boolean
  costPerUnit: number
  baseUnit?: string
  baseCostPerUnit?: number
}

interface PreparationItem {
  id: string
  code: string
  name: string
  outputUnit: string
}

interface UnitOption {
  value: string
  title: string
}

interface Props {
  components: Component[]
  type: 'recipe' | 'preparation'
}

interface Emits {
  (e: 'component-quantity-changed'): void
  (e: 'add-component'): void
  (e: 'remove-component', index: number): void
  (e: 'update-component', index: number, field: string, value: unknown): void
}

// ===== SETUP =====
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// ===== STATE =====
const products = ref<ProductItem[]>([])
const preparations = ref<PreparationItem[]>([])
const units = ref<UnitOption[]>([])
const storesLoaded = ref(false)

// ===== CONSTANTS =====
const componentTypes = [
  { value: 'product', text: 'Product' },
  { value: 'preparation', text: 'Preparation' }
]

// ===== COMPUTED =====
const availableUnits = computed(() => {
  return units.value.map(unit => ({
    value: unit.value,
    label: unit.title
  }))
})

const productItems = computed(() => {
  return products.value
    .filter(product => product.isActive)
    .map(product => ({
      id: product.id,
      label: `${product.name} (${product.unit})`
    }))
})

const preparationItems = computed(() => {
  return preparations.value.map(prep => ({
    id: prep.id,
    label: `${prep.code} - ${prep.name} (${prep.outputUnit})`
  }))
})

// ===== VALIDATION =====
const validateRequired = (value: unknown) => !!value || 'Required field'
const validatePositiveNumber = (value: number) => value > 0 || 'Must be greater than 0'

// ✅ НОВАЯ ФУНКЦИЯ: Валидация совместимости единиц
const validateUnitCompatibility = (component: Component) => {
  return (value: string) => {
    if (!component.componentId || !value) return true

    const info = getUnitCompatibilityInfo(component)
    if (info && info.includes('⚠️')) {
      return 'Unit may not be compatible with product base unit'
    }
    return true
  }
}

// ===== METHODS =====
function getAvailableItems(componentType: string) {
  return componentType === 'product' ? productItems.value : preparationItems.value
}

function getItemLabel(componentType: string): string {
  return componentType === 'product' ? 'Product' : 'Preparation'
}

// ✅ ИСПРАВЛЕНО: Улучшенное отображение цены с базовыми единицами
function getEnhancedPriceDisplay(component: Component): string {
  if (!storesLoaded.value) return 'Loading price...'

  if (component.componentType === 'product') {
    const product = products.value.find(p => p.id === component.componentId)
    if (product) {
      // ✅ Показываем цену за базовую единицу если доступна
      if (product.baseCostPerUnit && product.baseUnit) {
        return `💰 ${formatIDR(product.baseCostPerUnit)}/${getBaseUnitDisplay(product.baseUnit)} (base unit)`
      } else {
        // Fallback на старую систему
        return `💰 ${formatIDR(product.costPerUnit)}/${product.unit} (legacy)`
      }
    }
  }

  return 'Price not available'
}

// ✅ НОВАЯ ФУНКЦИЯ: Получение совместимых единиц для компонента
function getCompatibleUnits(component: Component) {
  if (!component.componentId) return availableUnits.value

  if (component.componentType === 'product') {
    const product = products.value.find(p => p.id === component.componentId)
    if (product?.baseUnit) {
      // Фильтруем единицы по типу базовой единицы
      return getUnitsForBaseType(product.baseUnit)
    }
  }

  return availableUnits.value
}

// ✅ НОВАЯ ФУНКЦИЯ: Получение единиц для типа базовой единицы
function getUnitsForBaseType(baseUnit: string) {
  const unitGroups: Record<string, string[]> = {
    gram: ['gram', 'kg'],
    ml: ['ml', 'liter'],
    piece: ['piece', 'pack']
  }

  const compatibleUnits = unitGroups[baseUnit] || []

  return availableUnits.value.filter(unit => compatibleUnits.includes(unit.value))
}

// ✅ НОВАЯ ФУНКЦИЯ: Информация о совместимости единиц
function getUnitCompatibilityInfo(component: Component): string {
  if (!component.componentId || !component.unit) return ''

  if (component.componentType === 'product') {
    const product = products.value.find(p => p.id === component.componentId)
    if (product?.baseUnit) {
      const isCompatible = checkUnitCompatibility(component.unit, product.baseUnit)

      if (isCompatible.compatible) {
        if (isCompatible.needsConversion) {
          return `✅ ${isCompatible.conversionInfo}`
        } else {
          return `✅ Compatible with ${getBaseUnitDisplay(product.baseUnit)}`
        }
      } else {
        return `⚠️ May not be compatible with base unit (${getBaseUnitDisplay(product.baseUnit)})`
      }
    }
  }

  return ''
}

// ✅ НОВАЯ ФУНКЦИЯ: Проверка совместимости единиц
function checkUnitCompatibility(unit: string, baseUnit: string) {
  const conversions: Record<string, { baseUnit: string; factor: number; info: string }> = {
    kg: { baseUnit: 'gram', factor: 1000, info: '1 kg = 1000 g' },
    gram: { baseUnit: 'gram', factor: 1, info: 'Already in base unit' },
    liter: { baseUnit: 'ml', factor: 1000, info: '1 L = 1000 ml' },
    ml: { baseUnit: 'ml', factor: 1, info: 'Already in base unit' },
    piece: { baseUnit: 'piece', factor: 1, info: 'Already in base unit' },
    pack: { baseUnit: 'piece', factor: 1, info: 'Pack as piece' }
  }

  const conversion = conversions[unit.toLowerCase()]

  if (!conversion) {
    return { compatible: false, needsConversion: false, conversionInfo: '' }
  }

  const compatible = conversion.baseUnit === baseUnit
  const needsConversion = compatible && conversion.factor !== 1

  return {
    compatible,
    needsConversion,
    conversionInfo: conversion.info
  }
}

function getBaseUnitDisplayName(baseUnit: string): string {
  const displayNames: Record<string, string> = {
    gram: 'г',
    ml: 'мл',
    piece: 'шт'
  }
  return displayNames[baseUnit] || baseUnit
}

// ✅ НОВАЯ ФУНКЦИЯ: Форматирование валюты в IDR
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M IDR`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K IDR`
  }
  return `${Math.round(amount)} IDR`
}

// ===== EVENT HANDLERS =====
function handleAddComponent() {
  emit('add-component')
}

function handleRemoveComponent(index: number) {
  emit('remove-component', index)
}

function handleComponentTypeChange(index: number, newType: string) {
  emit('update-component', index, 'componentType', newType)
  emit('update-component', index, 'componentId', '')
}

function handleComponentIdChange(index: number, componentId: string) {
  emit('update-component', index, 'componentId', componentId)
  emit('component-quantity-changed')
}

function handleQuantityChange(index: number, quantity: string) {
  emit('update-component', index, 'quantity', Number(quantity))
  emit('component-quantity-changed')
}

function handleUnitChange(index: number, unit: string) {
  emit('update-component', index, 'unit', unit)
}

function handleNotesChange(index: number, notes: string) {
  emit('update-component', index, 'notes', notes)
}

// ===== LIFECYCLE =====
async function loadStores() {
  try {
    const { useProductsStore } = await import('@/stores/productsStore')
    const productsStore = useProductsStore()

    if (productsStore.products) {
      products.value = productsStore.products.map(p => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        isActive: p.isActive,
        costPerUnit: p.costPerUnit || 0,
        baseUnit: (p as any).baseUnit,
        baseCostPerUnit: (p as any).baseCostPerUnit
      }))
    }

    const { useRecipesStore } = await import('@/stores/recipes')
    const recipesStore = useRecipesStore()

    if (recipesStore.activePreparations) {
      preparations.value = recipesStore.activePreparations.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        outputUnit: p.outputUnit
      }))
    }

    const { useRecipeUnits } = await import('@/composables/useMeasurementUnits')
    const { unitOptions } = useRecipeUnits()

    if (unitOptions.value) {
      units.value = unitOptions.value
    }

    storesLoaded.value = true
  } catch (error) {
    console.warn('Failed to load stores:', error)
    storesLoaded.value = true
  }
}

onMounted(() => {
  loadStores()
})
</script>

<style lang="scss" scoped>
.components-section {
  border: 1px solid var(--color-outline-variant);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-surface-variant);
}

.components-list {
  max-height: 300px;
  overflow-y: auto;
}

.price-display {
  font-size: 0.8rem;
  color: var(--color-success);
  font-weight: 500;
}

.unit-compatibility {
  font-size: 0.75rem;

  &:contains('✅') {
    color: var(--color-success);
  }

  &:contains('⚠️') {
    color: var(--color-warning);
  }
}
</style>
