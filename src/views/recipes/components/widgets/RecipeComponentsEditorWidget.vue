<!-- src/views/recipes/components/widgets/RecipeComponentsEditorWidget.vue - ИСПРАВЛЕННАЯ ВЕРСИЯ -->
<template>
  <div class="components-section">
    <div class="d-flex justify-space-between align-center mb-4">
      <h3 class="text-h6">
        {{ type === 'preparation' ? 'Recipe (Products only)' : 'Components' }}
      </h3>
      <div class="d-flex align-center gap-3">
        <!-- Фильтр категорий (показывается только при добавлении продукта) -->
        <v-select
          v-if="showCategoryFilter"
          v-model="selectedCategory"
          :items="categoryFilterOptions"
          item-title="text"
          item-value="value"
          label="Category"
          variant="outlined"
          density="compact"
          class="category-filter"
          @update:model-value="filterProductsByCategory"
        >
          <template #prepend-inner>
            <v-icon>mdi-filter</v-icon>
          </template>
        </v-select>

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
    </div>

    <div v-if="components.length === 0" class="empty-state">
      <v-icon icon="mdi-package-variant-closed" size="48" class="text-medium-emphasis mb-2" />
      <div class="text-medium-emphasis mb-3">
        No {{ type === 'preparation' ? 'products' : 'components' }} added yet
      </div>
      <v-btn variant="outlined" color="primary" size="small" @click="handleAddComponent">
        Add First {{ type === 'preparation' ? 'Product' : 'Component' }}
      </v-btn>
    </div>

    <div v-else class="components-list">
      <v-card
        v-for="(component, index) in components"
        :key="component.id"
        variant="outlined"
        class="component-card mb-3"
      >
        <v-card-text class="pa-4">
          <!-- Header: Type Selection (только для рецептов) -->
          <v-row v-if="type === 'recipe'" class="mb-3">
            <v-col cols="10">
              <v-chip-group
                :model-value="component.componentType"
                mandatory
                @update:model-value="handleComponentTypeChange(index, $event)"
              >
                <v-chip value="product" variant="outlined">
                  <v-icon start size="14">mdi-food-apple</v-icon>
                  Product
                </v-chip>
                <v-chip value="preparation" variant="outlined">
                  <v-icon start size="14">mdi-chef-hat</v-icon>
                  Preparation
                </v-chip>
              </v-chip-group>
            </v-col>
            <v-col cols="2" class="d-flex justify-end align-center">
              <v-btn
                icon="mdi-delete"
                color="error"
                variant="text"
                size="small"
                @click="handleRemoveComponent(index)"
              />
            </v-col>
          </v-row>

          <!-- Product/Preparation Selection -->
          <v-row class="mb-3">
            <v-col cols="12">
              <v-select
                :model-value="component.componentId"
                :items="getFilteredItems(component.componentType || 'product')"
                item-title="name"
                item-value="id"
                :label="getItemLabel(component.componentType || 'product')"
                variant="outlined"
                density="comfortable"
                :rules="[validateRequired]"
                clearable
                required
                @update:model-value="handleComponentIdChange(index, $event)"
              >
                <template #prepend-inner>
                  <v-icon>
                    {{ component.componentType === 'product' ? 'mdi-food-apple' : 'mdi-chef-hat' }}
                  </v-icon>
                </template>
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #prepend>
                      <v-icon :icon="getCategoryIcon(item.raw.category)" size="20" />
                    </template>
                    <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                    <v-list-item-subtitle>{{ item.raw.subtitle }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
                <template #no-data>
                  <div class="pa-4 text-center">
                    <v-icon icon="mdi-magnify" size="24" class="text-medium-emphasis mb-2" />
                    <div class="text-medium-emphasis">No items found</div>
                  </div>
                </template>
              </v-select>
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

          <!-- Delete button for preparations -->
          <div v-if="type === 'preparation'" class="delete-button-container">
            <v-btn
              icon="mdi-delete"
              color="error"
              variant="text"
              size="small"
              @click="handleRemoveComponent(index)"
            />
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { MeasurementUnit } from '@/stores/recipes/types'
import { formatIDR } from '@/utils/currency'
// ✅ ИСПРАВЛЕНО: Используем правильный импорт для единиц измерения
import { useMeasurementUnits } from '@/composables/useMeasurementUnits'

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
  nameEn: string
  category: string
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

// ✅ ИСПРАВЛЕНО: Используем composable для единиц измерения
const { getUnitShortName } = useMeasurementUnits()

// ===== STATE =====
const products = ref<ProductItem[]>([])
const preparations = ref<PreparationItem[]>([])
const storesLoaded = ref(false)

// Состояние для фильтра категорий
const selectedCategory = ref<string>('all')
const showCategoryFilter = ref(false)

// Опции для фильтра категорий
const categoryFilterOptions = computed(() => [
  { value: 'all', text: 'All Categories' },
  { value: 'meat', text: 'Meat & Poultry' },
  { value: 'vegetables', text: 'Vegetables' },
  { value: 'fruits', text: 'Fruits' },
  { value: 'dairy', text: 'Dairy Products' },
  { value: 'cereals', text: 'Cereals & Grains' },
  { value: 'spices', text: 'Spices & Seasonings' },
  { value: 'seafood', text: 'Seafood' },
  { value: 'beverages', text: 'Beverages' },
  { value: 'other', text: 'Other' }
])

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

// ===== VALIDATION =====
const validateRequired = (value: unknown) => !!value || 'Required field'
const validatePositiveNumber = (value: number) => value > 0 || 'Must be greater than 0'

// ===== METHODS =====

/**
 * Фильтрованные элементы (без дублирования)
 */
function getFilteredItems(componentType: string) {
  if (componentType === 'product') {
    let filteredProducts = products.value.filter(product => product.isActive)

    // Применяем фильтр категории
    if (selectedCategory.value !== 'all') {
      filteredProducts = filteredProducts.filter(
        product => product.category === selectedCategory.value
      )
    }

    return filteredProducts
      .map(product => ({
        id: product.id,
        name: product.nameEn || product.name,
        category: product.category,
        subtitle: `${formatIDR(product.baseCostPerUnit || product.costPerUnit)}/${getBaseUnitDisplayForProduct(product)} • ${getCategoryName(product.category)}`
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } else {
    // Полуфабрикаты
    return preparations.value
      .map(prep => ({
        id: prep.id,
        name: `${prep.code} - ${prep.name}`,
        category: 'preparation',
        subtitle: `Output: ${prep.outputUnit}`
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
}

/**
 * ✅ ИСПРАВЛЕНО: Получение отображения базовой единицы для продукта
 */
function getBaseUnitDisplayForProduct(product: ProductItem): string {
  if (product.baseUnit) {
    return getUnitShortName(product.baseUnit as MeasurementUnit)
  }

  // Fallback на старое поле unit
  if (product.unit) {
    return getUnitShortName(product.unit as MeasurementUnit)
  }

  return 'g' // По умолчанию граммы
}

/**
 * Фильтрация продуктов по категории
 */
function filterProductsByCategory(category: string) {
  selectedCategory.value = category
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
    if (product?.baseUnit) {
      return getUnitShortName(product.baseUnit as MeasurementUnit)
    }
    return getUnitShortName((product?.unit || 'gram') as MeasurementUnit)
  }

  const prep = preparations.value.find(p => p.id === component.componentId)
  return prep?.outputUnit || 'g'
}

/**
 * Отображение цены
 */
function getEnhancedPriceDisplay(component: Component): string {
  if (!storesLoaded.value || !component.componentId) return 'Loading...'

  if (component.componentType === 'product') {
    const product = products.value.find(p => p.id === component.componentId)
    if (product) {
      if (product.baseCostPerUnit && product.baseUnit) {
        return `${formatIDR(product.baseCostPerUnit)}/${getBaseUnitDisplayForProduct(product)}`
      } else {
        return `${formatIDR(product.costPerUnit)}/${getUnitShortName((product.unit || 'gram') as MeasurementUnit)}`
      }
    }
  } else {
    return 'Preparation cost calculated separately'
  }

  return 'Price not available'
}

/**
 * Информация о базовой единице
 */
function getBaseUnitInfo(component: Component): string {
  if (!component.componentId) return 'Not selected'

  if (component.componentType === 'product') {
    const product = products.value.find(p => p.id === component.componentId)
    return getBaseUnitDisplayForProduct(product!)
  }

  const prep = preparations.value.find(p => p.id === component.componentId)
  return prep?.outputUnit || 'g'
}

// ===== EVENT HANDLERS =====
function handleAddComponent() {
  showCategoryFilter.value = true
  selectedCategory.value = 'all'
  emit('add-component')
}

function handleRemoveComponent(index: number) {
  emit('remove-component', index)

  if (props.components.length <= 1) {
    showCategoryFilter.value = false
  }
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
    return prep?.outputUnit || 'gram'
  }
}

function handleQuantityChange(index: number, quantity: string) {
  emit('update-component', index, 'quantity', Number(quantity))
  emit('component-quantity-changed')
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
        nameEn: (p as any).nameEn || p.name,
        category: p.category,
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

  &:hover {
    border-color: var(--v-theme-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
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

.category-filter {
  min-width: 180px;
  max-width: 200px;
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
