<!-- src/views/recipes/components/widgets/RecipeComponentsEditorWidget.vue -->
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
              <!-- Simple price display -->
              <div v-if="component.componentId" class="text-caption text-success mt-1">
                {{ getPriceDisplay(component) }}
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
                :items="availableUnits"
                item-title="label"
                item-value="value"
                label="Unit"
                variant="outlined"
                density="compact"
                :rules="[validateRequired]"
                required
                @update:model-value="handleUnitChange(index, $event)"
              />
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

// ===== METHODS =====
function getAvailableItems(componentType: string) {
  return componentType === 'product' ? productItems.value : preparationItems.value
}

function getItemLabel(componentType: string): string {
  return componentType === 'product' ? 'Product' : 'Preparation'
}

function getPriceDisplay(component: Component): string {
  if (!storesLoaded.value) return 'Loading price...'

  if (component.componentType === 'product') {
    const product = products.value.find(p => p.id === component.componentId)
    if (product) {
      return `Price: $${product.costPerUnit.toFixed(2)}/${product.unit}`
    }
  }

  return 'Price not available'
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
  // Clear component selection when type changes
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
    // Load ProductsStore
    const { useProductsStore } = await import('@/stores/productsStore')
    const productsStore = useProductsStore()

    if (productsStore.products) {
      products.value = productsStore.products.map(p => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        isActive: p.isActive,
        costPerUnit: p.costPerUnit || 0
      }))
    }

    // Load RecipesStore
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

    // Load Units
    const { useRecipeUnits } = await import('@/composables/useMeasurementUnits')
    const { unitOptions } = useRecipeUnits()

    if (unitOptions.value) {
      units.value = unitOptions.value
    }

    storesLoaded.value = true
  } catch (error) {
    console.warn('Failed to load stores:', error)
    storesLoaded.value = true // Prevent infinite loading
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
</style>
