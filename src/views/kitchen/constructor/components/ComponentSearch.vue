<!-- src/views/kitchen/constructor/components/ComponentSearch.vue -->
<template>
  <BottomSheet
    :model-value="modelValue"
    title="Add Ingredient"
    max-height="80vh"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- Search -->
    <v-text-field
      v-model="searchQuery"
      placeholder="Search..."
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      autofocus
      class="mb-3"
    />

    <!-- Type filter -->
    <div class="type-filter mb-3">
      <v-chip
        v-for="opt in typeOptions"
        :key="opt.value"
        :color="typeFilter === opt.value ? 'primary' : undefined"
        :variant="typeFilter === opt.value ? 'flat' : 'outlined'"
        size="small"
        @click="typeFilter = opt.value"
      >
        {{ opt.label }}
      </v-chip>
    </div>

    <!-- Results -->
    <div class="search-results">
      <div
        v-for="item in results"
        :key="`${item.type}-${item.id}`"
        class="result-item"
        @click="handleSelect(item)"
      >
        <div class="result-info">
          <span class="result-name">{{ item.name }}</span>
          <span class="result-meta">
            <v-chip :color="item.color" size="x-small" variant="flat" label>
              {{ item.typeLabel }}
            </v-chip>
            <span v-if="item.code">{{ item.code }}</span>
            <span>{{ item.unit }}</span>
          </span>
        </div>
      </div>

      <div v-if="results.length === 0 && searchQuery" class="no-results">No results found</div>
    </div>

    <!-- Create new actions -->
    <div class="create-actions">
      <div class="divider-label">Not found? Create:</div>
      <div class="create-buttons">
        <v-btn size="small" variant="outlined" @click="handleCreateProduct">
          <v-icon start>mdi-plus</v-icon>
          New Product
        </v-btn>
        <v-btn size="small" variant="outlined" @click="handleCreatePreparation">
          <v-icon start>mdi-plus</v-icon>
          New Preparation
        </v-btn>
      </div>
    </div>

    <!-- Inline New Product Sheet -->
    <InlineNewProduct v-model="showNewProduct" @created="handleProductCreated" />

    <!-- Inline New Preparation (full screen) -->
    <InlineNewPreparation v-model="showNewPreparation" @created="handlePreparationCreated" />
  </BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { generateId } from '@/utils'
import BottomSheet from '@/components/tablet/BottomSheet.vue'
import InlineNewProduct from './InlineNewProduct.vue'
import InlineNewPreparation from './InlineNewPreparation.vue'
import type { RecipeComponent } from '@/stores/recipes/types'
import type { Product } from '@/stores/productsStore/types'
import type { Preparation } from '@/stores/recipes/types'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [component: RecipeComponent]
}>()

const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

const searchQuery = ref('')
const typeFilter = ref<'all' | 'product' | 'preparation'>('all')
const showNewProduct = ref(false)
const showNewPreparation = ref(false)

const typeOptions = [
  { value: 'all' as const, label: 'All' },
  { value: 'product' as const, label: 'Products' },
  { value: 'preparation' as const, label: 'Preps' }
]

interface SearchResult {
  id: string
  name: string
  type: 'product' | 'preparation'
  typeLabel: string
  color: string
  unit: string
  code?: string
}

const results = computed<SearchResult[]>(() => {
  const q = searchQuery.value.toLowerCase()
  const items: SearchResult[] = []

  if (typeFilter.value !== 'preparation') {
    for (const p of productsStore.products as Product[]) {
      if (!p.isActive) continue
      if (q && !p.name.toLowerCase().includes(q)) continue
      items.push({
        id: p.id,
        name: p.name,
        type: 'product',
        typeLabel: 'PRODUCT',
        color: 'blue',
        unit: p.baseUnit
      })
    }
  }

  if (typeFilter.value !== 'product') {
    for (const p of recipesStore.preparations as Preparation[]) {
      if (!p.isActive) continue
      if (q && !p.name.toLowerCase().includes(q) && !(p.code && p.code.toLowerCase().includes(q)))
        continue
      items.push({
        id: p.id,
        name: p.name,
        type: 'preparation',
        typeLabel: 'PREP',
        color: 'orange',
        unit: p.outputUnit,
        code: p.code
      })
    }
  }

  // Limit results
  return items.slice(0, 30)
})

function handleSelect(item: SearchResult) {
  const component: RecipeComponent = {
    id: generateId(),
    componentId: item.id,
    componentType: item.type,
    quantity: 1,
    unit: item.unit as any
  }
  emit('select', component)
}

function handleCreateProduct() {
  showNewProduct.value = true
}

function handleCreatePreparation() {
  showNewPreparation.value = true
}

function handleProductCreated(productId: string) {
  const p = productsStore.products.find((p: Product) => p.id === productId)
  if (p) {
    handleSelect({
      id: p.id,
      name: p.name,
      type: 'product',
      typeLabel: 'PRODUCT',
      color: 'blue',
      unit: p.baseUnit
    })
  }
  showNewProduct.value = false
}

function handlePreparationCreated(prepId: string) {
  const p = (recipesStore.preparations as Preparation[]).find(p => p.id === prepId)
  if (p) {
    handleSelect({
      id: p.id,
      name: p.name,
      type: 'preparation',
      typeLabel: 'PREP',
      color: 'orange',
      unit: p.outputUnit
    })
  }
  showNewPreparation.value = false
}
</script>

<style scoped lang="scss">
.type-filter {
  display: flex;
  gap: 6px;
}

.search-results {
  max-height: 40vh;
  overflow-y: auto;
}

.result-item {
  padding: 12px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  border-radius: 8px;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  &:active {
    background: rgba(255, 255, 255, 0.08);
  }
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-name {
  font-weight: 500;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.no-results {
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
}

.create-actions {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.divider-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
  text-align: center;
}

.create-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>
