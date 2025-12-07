<!-- src/views/recipes/components/widgets/RecipeComponentsEditorWidget.vue - ИСПРАВЛЕННАЯ ВЕРСИЯ -->
<template>
  <div class="components-section">
    <div class="d-flex justify-space-between align-center mb-4">
      <div class="d-flex align-center">
        <h3 class="text-h6">
          {{ type === 'preparation' ? 'Recipe (Products & Preparations)' : 'Components' }}
        </h3>
        <v-chip
          v-if="components.length > 0"
          size="small"
          class="ml-2"
          color="primary"
          variant="tonal"
        >
          {{ components.length }}
        </v-chip>
      </div>
      <div class="d-flex align-center gap-2">
        <!-- ✅ NEW: Expand/Collapse All buttons -->
        <v-btn-group v-if="components.length > 1" variant="text" density="compact">
          <v-btn size="small" title="Expand all" @click="expandAllComponents">
            <v-icon size="18">mdi-unfold-more-horizontal</v-icon>
          </v-btn>
          <v-btn size="small" title="Collapse all" @click="collapseAllComponents">
            <v-icon size="18">mdi-unfold-less-horizontal</v-icon>
          </v-btn>
        </v-btn-group>
        <v-btn
          color="primary"
          variant="outlined"
          size="small"
          prepend-icon="mdi-plus"
          @click="handleAddComponent"
        >
          Add {{ type === 'preparation' ? 'Ingredient' : 'Component' }}
        </v-btn>
      </div>
    </div>

    <!-- ⭐ PHASE 1: Cycle Detection Warning -->
    <v-alert
      v-if="cycleDetectionResult?.hasCycle"
      type="error"
      variant="tonal"
      class="mb-4"
      prominent
      border="start"
    >
      <template #title>
        <div class="d-flex align-center">
          <v-icon icon="mdi-alert-circle" class="mr-2" />
          Circular Dependency Detected!
        </div>
      </template>
      <div class="text-body-2 mt-2">
        A preparation cannot use itself as an ingredient, directly or indirectly.
      </div>
      <div class="text-body-2 mt-2 font-weight-bold">
        Cycle path: {{ cycleDetectionResult.formattedPath }}
      </div>
      <div class="text-caption mt-2 text-medium-emphasis">
        Please remove the preparation ingredient that creates the cycle to save changes.
      </div>
    </v-alert>

    <div v-if="components.length === 0" class="empty-state">
      <v-icon icon="mdi-package-variant-closed" size="48" class="text-medium-emphasis mb-2" />
      <div class="text-medium-emphasis mb-3">
        No {{ type === 'preparation' ? 'products' : 'components' }} added yet
      </div>
      <v-btn variant="outlined" color="primary" size="small" @click="handleAddComponent">
        Add First {{ type === 'preparation' ? 'Product' : 'Component' }}
      </v-btn>
    </div>

    <template v-else>
      <!-- ✅ NEW: Accordion-style collapsible components -->
      <div class="components-list">
        <v-card
          v-for="(component, index) in components"
          :key="component.id"
          variant="outlined"
          class="component-card mb-2"
        >
          <!-- ✅ Clickable Header - Always Visible -->
          <div
            class="component-header pa-3 d-flex align-center justify-space-between"
            :class="{ 'component-header--expanded': expandedComponents.has(index) }"
            @click="toggleComponentExpanded(index)"
          >
            <div class="d-flex align-center flex-grow-1">
              <v-avatar
                :color="component.componentType === 'product' ? 'primary' : 'secondary'"
                variant="tonal"
                size="32"
                class="mr-3"
              >
                <v-icon
                  :icon="component.componentType === 'product' ? 'mdi-food-apple' : 'mdi-chef-hat'"
                  size="16"
                />
              </v-avatar>
              <div class="flex-grow-1">
                <div class="font-weight-medium text-body-2">
                  {{ component.componentId ? getSelectedItemName(component) : 'Not selected' }}
                </div>
                <div v-if="component.componentId" class="text-caption text-medium-emphasis">
                  {{ component.quantity }} {{ getFixedUnit(component) }}
                </div>
              </div>
            </div>
            <div class="d-flex align-center">
              <v-btn
                icon="mdi-delete"
                color="error"
                variant="text"
                size="x-small"
                @click.stop="handleRemoveComponent(index)"
              />
              <v-icon
                :icon="expandedComponents.has(index) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                size="20"
                class="ml-1"
              />
            </div>
          </div>

          <!-- ✅ Expandable Content -->
          <v-expand-transition>
            <div v-show="expandedComponents.has(index)">
              <v-divider />
              <v-card-text class="pa-4">
                <!-- Type Selection -->
                <v-row class="mb-3">
                  <v-col cols="12">
                    <v-chip-group
                      :model-value="component.componentType"
                      mandatory
                      @update:model-value="handleComponentTypeChange(index, $event)"
                    >
                      <v-chip value="product" variant="outlined" size="small">
                        <v-icon start size="14">mdi-food-apple</v-icon>
                        Product
                      </v-chip>
                      <v-chip value="preparation" variant="outlined" size="small">
                        <v-icon start size="14">mdi-chef-hat</v-icon>
                        Preparation
                      </v-chip>
                    </v-chip-group>
                  </v-col>
                </v-row>

                <!-- Product/Preparation Selection -->
                <v-row class="mb-3">
                  <v-col cols="12">
                    <!-- Selected Item Display -->
                    <v-card
                      v-if="component.componentId"
                      variant="outlined"
                      class="selected-item-card mb-2"
                    >
                      <v-card-text class="pa-3">
                        <div class="d-flex align-center justify-space-between">
                          <div class="d-flex align-center flex-grow-1">
                            <v-avatar
                              :color="
                                component.componentType === 'product' ? 'primary' : 'secondary'
                              "
                              variant="tonal"
                              size="40"
                              class="mr-3"
                            >
                              <v-icon
                                :icon="
                                  component.componentType === 'product'
                                    ? 'mdi-food-apple'
                                    : 'mdi-chef-hat'
                                "
                                size="20"
                              />
                            </v-avatar>
                            <div class="flex-grow-1">
                              <div class="font-weight-bold text-body-1">
                                {{ getSelectedItemName(component) }}
                              </div>
                              <div class="text-caption text-medium-emphasis">
                                {{ getSelectedItemSubtitle(component) }}
                              </div>
                            </div>
                          </div>
                          <v-btn
                            icon="mdi-pencil"
                            variant="text"
                            size="small"
                            @click="
                              openSelectionDialog(index, component.componentType || 'product')
                            "
                          />
                        </div>
                      </v-card-text>
                    </v-card>

                    <!-- Add Button (when no item selected) -->
                    <v-btn
                      v-else
                      block
                      variant="outlined"
                      color="primary"
                      size="large"
                      :prepend-icon="
                        component.componentType === 'product' ? 'mdi-food-apple' : 'mdi-chef-hat'
                      "
                      @click="openSelectionDialog(index, component.componentType || 'product')"
                    >
                      {{ getItemLabel(component.componentType || 'product') }}
                    </v-btn>
                  </v-col>
                </v-row>

                <!-- Price Display -->
                <v-row v-if="component.componentId" class="mb-3">
                  <v-col cols="12">
                    <v-card variant="tonal" color="success" class="price-info-card">
                      <v-card-text class="pa-3">
                        <div class="d-flex justify-space-between align-center">
                          <div class="price-display">
                            <v-icon icon="mdi-currency-try" size="16" class="mr-2" />
                            {{ getEnhancedPriceDisplay(component) }}
                          </div>
                          <div class="base-unit-info">
                            <v-chip size="small" color="info" variant="tonal">
                              Base: {{ getBaseUnitInfo(component) }}
                            </v-chip>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- Quantity and Notes -->
                <v-row class="mb-2">
                  <v-col cols="4">
                    <v-text-field
                      :model-value="component.quantity"
                      label="Quantity"
                      type="number"
                      step="0.1"
                      min="0"
                      variant="outlined"
                      density="comfortable"
                      :rules="[validateRequired, validatePositiveNumber]"
                      :hint="getQuantityHint(component)"
                      :persistent-hint="
                        !!(
                          component.useYieldPercentage &&
                          component.componentType === 'product' &&
                          component.componentId
                        )
                      "
                      required
                      @update:model-value="handleQuantityChange(index, $event)"
                    />
                  </v-col>

                  <!-- Показываем только базовую единицу, без выбора -->
                  <v-col cols="3">
                    <v-text-field
                      :model-value="getFixedUnit(component)"
                      label="Unit"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      disabled
                    >
                      <template #prepend-inner>
                        <v-icon>mdi-scale</v-icon>
                      </template>
                    </v-text-field>
                  </v-col>

                  <v-col cols="5">
                    <v-text-field
                      :model-value="component.notes"
                      label="Notes"
                      placeholder="diced, fresh, etc."
                      variant="outlined"
                      density="comfortable"
                      @update:model-value="handleNotesChange(index, $event)"
                    >
                      <template #prepend-inner>
                        <v-icon>mdi-note-text</v-icon>
                      </template>
                    </v-text-field>
                  </v-col>
                </v-row>

                <!-- ✅ COMPACT: Yield Toggle (Products only) - inline switch -->
                <v-row
                  v-if="
                    component.componentType === 'product' &&
                    component.componentId &&
                    shouldShowYieldToggle(component)
                  "
                  class="mb-2"
                >
                  <v-col cols="12">
                    <div class="d-flex align-center">
                      <v-switch
                        :model-value="component.useYieldPercentage"
                        color="warning"
                        density="compact"
                        hide-details
                        @update:model-value="handleYieldToggle(index, $event)"
                      >
                        <template #label>
                          <span class="text-caption">
                            <v-icon size="16" class="mr-1">mdi-percent</v-icon>
                            Account for Yield ({{ getProductYield(component) }}%)
                          </span>
                        </template>
                      </v-switch>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </div>
          </v-expand-transition>
        </v-card>
      </div>

      <!-- Bottom Add Button -->
      <div class="mt-4 d-flex justify-center">
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="handleAddComponent">
          Add {{ type === 'preparation' ? 'Ingredient' : 'Component' }}
        </v-btn>
      </div>
    </template>

    <!-- Product Search Dialog -->
    <v-dialog v-model="productSearchDialog" max-width="800px" scrollable>
      <v-card>
        <v-card-title class="pa-4">
          <div class="d-flex align-center justify-space-between">
            <span class="text-h6">Select Product</span>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="productSearchDialog = false"
            />
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <product-search-widget
            :products="productOptions"
            :items-per-page="15"
            @product-selected="handleProductSelected"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Dish Search Dialog (for preparations in recipes) -->
    <v-dialog v-model="dishSearchDialog" max-width="800px" scrollable>
      <v-card>
        <v-card-title class="pa-4">
          <div class="d-flex align-center justify-space-between">
            <span class="text-h6">Select Preparation</span>
            <v-btn icon="mdi-close" variant="text" size="small" @click="dishSearchDialog = false" />
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <dish-search-widget
            :dishes="dishOptions"
            :items-per-page="15"
            @dish-selected="handleDishSelected"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import type { MeasurementUnit } from '@/stores/recipes/types'
import { formatIDR } from '@/utils/currency'
// ✅ ИСПРАВЛЕНО: Используем правильный импорт для единиц измерения
import { useMeasurementUnits } from '@/composables/useMeasurementUnits'
// ✅ NEW: Import search widgets
import ProductSearchWidget from '@/views/menu/components/widgets/ProductSearchWidget.vue'
import DishSearchWidget from '@/views/menu/components/widgets/DishSearchWidget.vue'
// ⭐ PHASE 1: Cycle detection for nested preparations
import { detectCycle, formatCyclePath } from '@/stores/recipes/composables/usePreparationGraph'
import type { PreparationIngredient, Preparation } from '@/stores/recipes/types'

// ===== TYPES =====
interface Component {
  id: string
  componentId: string
  componentType: string
  quantity: number
  unit: string
  useYieldPercentage?: boolean
  notes: string
}

interface ProductItem {
  id: string
  name: string
  nameEn: string
  category: string
  unit: string
  isActive: boolean
  costPerUnit: number
  baseUnit?: string
  baseCostPerUnit?: number
  yieldPercentage?: number
}

interface PreparationItem {
  id: string
  code: string
  name: string
  outputUnit: string
  type?: string // Category/type of preparation
  portionType?: 'weight' | 'portion' // ✅ NEW: How quantities are measured
}

interface Props {
  components: Component[]
  type: 'recipe' | 'preparation'
  preparationId?: string // ⭐ PHASE 1: Required for cycle detection
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

// ✅ ИСПРАВЛЕНО: Используем composable для единиц измерения
const { getUnitShortName } = useMeasurementUnits()

// ===== STATE =====
const products = ref<ProductItem[]>([])
const preparations = ref<PreparationItem[]>([])
const storesLoaded = ref(false)

// ✅ NEW: Accordion state - track which components are expanded (Set of indices)
const expandedComponents = ref<Set<number>>(new Set())

// ✅ NEW: Dialog states
const productSearchDialog = ref(false)
const dishSearchDialog = ref(false)
const currentEditingIndex = ref<number>(-1)

// Category icons mapping
const categoryIcons: Record<string, string> = {
  meat: 'mdi-food-steak',
  vegetables: 'mdi-carrot',
  fruits: 'mdi-food-apple',
  dairy: 'mdi-cow',
  cereals: 'mdi-barley',
  spices: 'mdi-shaker',
  seafood: 'mdi-fish',
  beverages: 'mdi-bottle-soda',
  other: 'mdi-package-variant'
}

// ===== HELPER FUNCTIONS (moved before computed) =====

/**
 * ✅ ИСПРАВЛЕНО: Получение отображения базовой единицы для продукта
 */
function getBaseUnitDisplayForProduct(product: ProductItem | undefined): string {
  if (!product) return 'g'

  if (product.baseUnit) {
    return getUnitShortName(product.baseUnit as MeasurementUnit)
  }

  // Fallback на старое поле unit
  if (product.unit) {
    return getUnitShortName(product.unit as MeasurementUnit)
  }

  return 'g' // По умолчанию граммы
}

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    meat: 'Meat & Poultry',
    vegetables: 'Vegetables',
    fruits: 'Fruits',
    dairy: 'Dairy Products',
    cereals: 'Cereals & Grains',
    spices: 'Spices & Seasonings',
    seafood: 'Seafood',
    beverages: 'Beverages',
    other: 'Other'
  }
  return names[category] || category
}

// ✅ NEW: Options for ProductSearchWidget
const productOptions = computed(() => {
  return products.value
    .filter(p => p.isActive)
    .map(p => ({
      id: p.id,
      name: p.nameEn || p.name,
      category: p.category,
      unit: p.baseUnit || p.unit || 'gram',
      costPerUnit: p.baseCostPerUnit || p.costPerUnit || 0
    }))
})

// ✅ NEW: Options for DishSearchWidget (only preparations for recipes)
const dishOptions = computed(() => {
  return preparations.value.map(prep => ({
    id: prep.id,
    name: prep.name,
    type: 'preparation' as const,
    unit: prep.outputUnit,
    outputQuantity: 1,
    category: (prep as any).type || 'Other' // Use preparation type as category
  }))
})

// ⭐ PHASE 1: Cycle Detection for Nested Preparations
const cycleDetectionResult = computed(() => {
  // Only check for preparations (nested preparations feature)
  if (props.type !== 'preparation' || !props.preparationId) {
    return null
  }

  // Convert components to PreparationIngredient format
  const recipe: PreparationIngredient[] = props.components
    .filter(c => c.componentId) // Only check components with selected items
    .map(c => ({
      type: c.componentType === 'preparation' ? 'preparation' : 'product',
      id: c.componentId,
      quantity: c.quantity,
      unit: c.unit as MeasurementUnit,
      useYieldPercentage: c.useYieldPercentage,
      notes: c.notes,
      sortOrder: 0
    }))

  // Get all preparations for cycle detection
  const allPreparations: Preparation[] = preparations.value.map(p => ({
    id: p.id,
    name: p.name,
    code: p.code,
    outputUnit: p.outputUnit as any,
    outputQuantity: 1,
    preparationTime: 0,
    instructions: '',
    isActive: true,
    type: p.type || '',
    department: 'kitchen',
    recipe: [], // We don't need full recipes for cycle detection
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))

  // Detect cycles
  const result = detectCycle(props.preparationId, recipe, allPreparations)

  if (result.hasCycle && result.cyclePath) {
    return {
      hasCycle: true,
      cyclePath: result.cyclePath,
      formattedPath: formatCyclePath(result.cyclePath, allPreparations)
    }
  }

  return null
})

// ===== VALIDATION =====
const validateRequired = (value: unknown) => !!value || 'Required field'
const validatePositiveNumber = (value: number) => value > 0 || 'Must be greater than 0'

// ===== METHODS =====

function getCategoryIcon(category: string): string {
  return categoryIcons[category] || 'mdi-package-variant'
}

function getItemLabel(componentType: string): string {
  return componentType === 'product' ? 'Select Product' : 'Select Preparation'
}

/**
 * Фиксированная единица - только базовая единица продукта
 */
function getFixedUnit(component: Component): string {
  if (!component.componentId) return 'Select item first'

  if (component.componentType === 'product') {
    const product = products.value.find(p => p.id === component.componentId)
    if (!product) return 'Product not found'

    if (product.baseUnit) {
      return getUnitShortName(product.baseUnit as MeasurementUnit)
    }
    return getUnitShortName((product.unit || 'gram') as MeasurementUnit)
  }

  // ✅ FIX: For preparations, check portionType
  const prep = preparations.value.find(p => p.id === component.componentId)
  if (!prep) return 'g'

  // Check if preparation is portion-based
  if ((prep as any).portionType === 'portion') {
    return 'portion'
  }
  return prep.outputUnit || 'g'
}

/**
 * Отображение цены
 */
function getEnhancedPriceDisplay(component: Component): string {
  if (!storesLoaded.value || !component.componentId) return 'Loading...'

  if (component.componentType === 'product') {
    const product = products.value.find(p => p.id === component.componentId)
    if (!product) return 'Product not found'

    if (product.baseCostPerUnit && product.baseUnit) {
      return `${formatIDR(product.baseCostPerUnit)}/${getBaseUnitDisplayForProduct(product)}`
    }
    return `${formatIDR(product.costPerUnit)}/${getUnitShortName((product.unit || 'gram') as MeasurementUnit)}`
  }

  return 'Preparation cost calculated separately'
}

/**
 * Информация о базовой единице
 */
function getBaseUnitInfo(component: Component): string {
  if (!component.componentId) return 'Not selected'

  if (component.componentType === 'product') {
    const product = products.value.find(p => p.id === component.componentId)
    if (!product) return 'Product not found'
    return getBaseUnitDisplayForProduct(product)
  }

  // ✅ FIX: For preparations, check portionType
  const prep = preparations.value.find(p => p.id === component.componentId)
  if (!prep) return 'g'

  // Check if preparation is portion-based
  if ((prep as any).portionType === 'portion') {
    return 'portion'
  }
  return prep.outputUnit || 'g'
}

// ===== DIALOG METHODS =====

/**
 * Open selection dialog based on component type
 */
function openSelectionDialog(index: number, componentType: string) {
  currentEditingIndex.value = index

  if (componentType === 'product') {
    productSearchDialog.value = true
  } else if (componentType === 'preparation') {
    dishSearchDialog.value = true
  }
}

/**
 * Handle product selection from ProductSearchWidget
 */
function handleProductSelected(product: any) {
  if (currentEditingIndex.value >= 0) {
    handleComponentIdChange(currentEditingIndex.value, product.id)
    productSearchDialog.value = false
    currentEditingIndex.value = -1
  }
}

/**
 * Handle dish/preparation selection from DishSearchWidget
 */
function handleDishSelected(dish: any) {
  if (currentEditingIndex.value >= 0) {
    handleComponentIdChange(currentEditingIndex.value, dish.id)
    dishSearchDialog.value = false
    currentEditingIndex.value = -1
  }
}

/**
 * Get selected item name for display
 */
function getSelectedItemName(component: Component): string {
  if (!component.componentId) return 'Not selected'

  if (component.componentType === 'product') {
    const product = products.value.find(p => p.id === component.componentId)
    return product ? product.nameEn || product.name : 'Product not found'
  } else {
    const prep = preparations.value.find(p => p.id === component.componentId)
    return prep ? `${prep.code} - ${prep.name}` : 'Preparation not found'
  }
}

/**
 * Get selected item subtitle for display
 */
function getSelectedItemSubtitle(component: Component): string {
  if (!component.componentId) return ''

  if (component.componentType === 'product') {
    const product = products.value.find(p => p.id === component.componentId)
    if (!product) return ''
    return `${getCategoryName(product.category)} • ${formatIDR(product.baseCostPerUnit || product.costPerUnit)}/${getBaseUnitDisplayForProduct(product)}`
  } else {
    const prep = preparations.value.find(p => p.id === component.componentId)
    if (!prep) return ''
    // ✅ FIX: Show correct output unit based on portionType
    const outputDisplay = getPreparationOutputDisplay(prep as any)
    return `Semi-finished • Output: ${outputDisplay}`
  }
}

/**
 * ✅ NEW: Get preparation output display based on portionType
 */
function getPreparationOutputDisplay(prep: { portionType?: string; outputUnit?: string }): string {
  if (prep.portionType === 'portion') {
    return 'portions'
  }
  return prep.outputUnit || 'g'
}

// ===== ACCORDION METHODS =====

/**
 * Toggle component expanded/collapsed state
 */
function toggleComponentExpanded(index: number) {
  const newSet = new Set(expandedComponents.value)
  if (newSet.has(index)) {
    newSet.delete(index)
  } else {
    newSet.add(index)
  }
  expandedComponents.value = newSet
}

/**
 * Expand all components
 */
function expandAllComponents() {
  const newSet = new Set<number>()
  for (let i = 0; i < props.components.length; i++) {
    newSet.add(i)
  }
  expandedComponents.value = newSet
}

/**
 * Collapse all components
 */
function collapseAllComponents() {
  expandedComponents.value = new Set()
}

// ===== EVENT HANDLERS =====
function handleAddComponent() {
  emit('add-component')
  // Note: Auto-expand is handled by watcher below
}

function handleRemoveComponent(index: number) {
  emit('remove-component', index)
}

function handleComponentTypeChange(index: number, newType: string) {
  emit('update-component', index, 'componentType', newType)
  emit('update-component', index, 'componentId', '')
  emit('update-component', index, 'unit', 'gram')
}

function handleComponentIdChange(index: number, componentId: string) {
  emit('update-component', index, 'componentId', componentId)

  const fixedUnit = getFixedUnitForComponent(componentId, props.components[index].componentType)
  emit('update-component', index, 'unit', fixedUnit)

  // ✅ NEW: Auto-enable yield percentage if product has yield < 100%
  if (props.components[index].componentType === 'product') {
    const product = products.value.find(p => p.id === componentId)
    if (product && product.yieldPercentage && product.yieldPercentage < 100) {
      emit('update-component', index, 'useYieldPercentage', true)
    } else {
      emit('update-component', index, 'useYieldPercentage', false)
    }
  }

  emit('component-quantity-changed')
}

/**
 * Получение фиксированной единицы для компонента
 */
function getFixedUnitForComponent(componentId: string, componentType: string): string {
  if (componentType === 'product') {
    const product = products.value.find(p => p.id === componentId)
    return product?.baseUnit || product?.unit || 'gram'
  } else {
    const prep = preparations.value.find(p => p.id === componentId)
    if (!prep) return 'gram'

    // ✅ FIX: For portion-based preparations, return 'portion'
    if ((prep as any).portionType === 'portion') {
      return 'portion'
    }
    return prep.outputUnit || 'gram'
  }
}

function handleQuantityChange(index: number, quantity: string) {
  emit('update-component', index, 'quantity', Number(quantity))
  emit('component-quantity-changed')
}

function handleNotesChange(index: number, notes: string) {
  emit('update-component', index, 'notes', notes)
}

/**
 * ✅ NEW: Handle yield percentage toggle
 */
function handleYieldToggle(index: number, enabled: boolean) {
  emit('update-component', index, 'useYieldPercentage', enabled)
  emit('component-quantity-changed') // Recalculate costs
}

/**
 * ✅ NEW: Get quantity hint (shows gross quantity when yield enabled)
 */
function getQuantityHint(component: Component): string {
  if (
    component.componentType !== 'product' ||
    !component.componentId ||
    !component.useYieldPercentage
  ) {
    return ''
  }

  const product = products.value.find(p => p.id === component.componentId)
  if (!product) return ''

  const yield_pct = product.yieldPercentage || 100
  if (yield_pct >= 100) return ''

  const netQuantity = component.quantity || 0
  const grossQuantity = netQuantity / (yield_pct / 100)
  const unit = getFixedUnit(component)

  return `Purchase: ${grossQuantity.toFixed(1)}${unit} (${yield_pct}% yield)`
}

/**
 * ✅ NEW: Should show yield toggle (only if product has yield < 100%)
 */
function shouldShowYieldToggle(component: Component): boolean {
  if (component.componentType !== 'product') return false

  const product = products.value.find(p => p.id === component.componentId)
  if (!product) return false

  const yield_pct = product.yieldPercentage || 100
  return yield_pct < 100
}

/**
 * ✅ NEW: Get product yield percentage
 */
function getProductYield(component: Component): number {
  if (component.componentType !== 'product') return 100

  const product = products.value.find(p => p.id === component.componentId)
  return product?.yieldPercentage || 100
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
        nameEn: (p as any).nameEn || p.name,
        category: p.category,
        unit: p.unit,
        isActive: p.isActive,
        costPerUnit: p.costPerUnit || 0,
        baseUnit: (p as any).baseUnit,
        baseCostPerUnit: (p as any).baseCostPerUnit,
        yieldPercentage: (p as any).yieldPercentage || 100 // ✅ NEW: Load yield percentage
      }))
    }

    const { useRecipesStore } = await import('@/stores/recipes')
    const recipesStore = useRecipesStore()

    if (recipesStore.activePreparations) {
      preparations.value = recipesStore.activePreparations.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        outputUnit: p.outputUnit,
        type: p.type, // Include preparation type/category
        portionType: p.portionType // ✅ NEW: Include portion type for correct unit display
      }))
    }

    storesLoaded.value = true
  } catch (error) {
    console.warn('Failed to load stores:', error)
    storesLoaded.value = true
  }
}

// ===== WATCHERS =====

// Auto-expand newly added components
watch(
  () => props.components.length,
  (newLength, oldLength) => {
    if (newLength > oldLength) {
      // New component was added - expand it
      const newIndex = newLength - 1
      const newSet = new Set(expandedComponents.value)
      newSet.add(newIndex)
      expandedComponents.value = newSet
    }
  }
)

onMounted(() => {
  loadStores()
})
</script>

<style lang="scss" scoped>
.components-section {
  border: 1px solid var(--v-theme-outline-variant);
  border-radius: 12px;
  padding: 20px;
  background: var(--v-theme-surface-variant);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  border: 2px dashed var(--v-theme-outline-variant);
  border-radius: 8px;
  background: var(--v-theme-surface);
}

.components-list {
  max-height: 600px;
  overflow-y: auto;
  padding-right: 4px;
}

.component-card {
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.component-header {
  cursor: pointer;
  transition: background-color 0.2s ease;
  user-select: none;

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.05);
  }

  &--expanded {
    background-color: rgba(var(--v-theme-primary), 0.08);
  }
}

.price-info-card {
  .price-display {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--v-theme-success);
  }

  .base-unit-info {
    font-size: 0.8rem;
  }
}

.delete-button-container {
  position: absolute;
  top: 16px;
  right: 16px;
}

.selected-item-card {
  border: 2px solid var(--v-theme-primary);
  background-color: rgba(var(--v-theme-primary), 0.05);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
}

// Custom scrollbar
.components-list {
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--v-theme-surface-variant);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--v-theme-outline);
    border-radius: 3px;

    &:hover {
      background: var(--v-theme-outline-variant);
    }
  }
}

// Responsive improvements
@media (max-width: 768px) {
  .components-section {
    padding: 16px;
  }

  .component-card {
    .v-card-text {
      padding: 16px !important;
    }
  }

  .delete-button-container {
    position: static;
    display: flex;
    justify-content: center;
    margin-top: 12px;
  }
}
</style>
