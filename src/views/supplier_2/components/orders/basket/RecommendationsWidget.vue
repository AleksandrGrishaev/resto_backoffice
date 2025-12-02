<!-- src/views/supplier_2/components/orders/basket/RecommendationsWidget.vue -->
<template>
  <div class="recommendations-widget">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <div class="text-h6 font-weight-bold d-flex align-center">
          <v-icon icon="mdi-lightbulb-on" color="warning" class="mr-2" />
          Order Recommendations
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          Smart recommendations based on consumption, lead time, and stock levels
        </div>
      </div>

      <!-- Filters -->
      <div class="d-flex gap-2">
        <v-select
          v-model="selectedUrgency"
          :items="urgencyOptions"
          label="Filter by urgency"
          variant="outlined"
          density="compact"
          hide-details
          style="min-width: 180px"
        />

        <v-select
          v-model="selectedCategory"
          :items="categoryOptions"
          label="Filter by category"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="min-width: 200px"
        />
      </div>
    </div>

    <!-- Summary Stats -->
    <v-row class="mb-4">
      <v-col cols="3">
        <v-card variant="tonal" color="error">
          <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Critical</div>
                <div class="text-h5 font-weight-bold">
                  {{ groupedByUrgency.critical?.length || 0 }}
                </div>
              </div>
              <v-icon icon="mdi-alert-circle" size="32" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="3">
        <v-card variant="tonal" color="warning">
          <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">High</div>
                <div class="text-h5 font-weight-bold">
                  {{ groupedByUrgency.high?.length || 0 }}
                </div>
              </div>
              <v-icon icon="mdi-alert" size="32" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="3">
        <v-card variant="tonal" color="info">
          <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Medium</div>
                <div class="text-h5 font-weight-bold">
                  {{ groupedByUrgency.medium?.length || 0 }}
                </div>
              </div>
              <v-icon icon="mdi-information" size="32" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="3">
        <v-card variant="tonal" color="success">
          <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Low</div>
                <div class="text-h5 font-weight-bold">
                  {{ groupedByUrgency.low?.length || 0 }}
                </div>
              </div>
              <v-icon icon="mdi-check-circle" size="32" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recommendations List (Grouped) -->
    <div v-for="urgency in visibleUrgencyLevels" :key="urgency" class="mb-4">
      <v-expansion-panels v-model="expandedPanels[urgency]" variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-chip :color="getUrgencyColor(urgency)" size="small" class="mr-3" label>
                <v-icon :icon="getUrgencyIcon(urgency)" size="16" class="mr-1" />
                {{ urgency.toUpperCase() }}
              </v-chip>
              <span class="font-weight-bold">
                {{ groupedByUrgency[urgency]?.length || 0 }} items
              </span>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <!-- Category Sub-Groups -->
            <div
              v-for="category in getCategoriesInUrgencyGroup(urgency)"
              :key="category"
              class="mb-4"
            >
              <div class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center">
                <v-icon
                  :icon="getCategoryIcon(category)"
                  :color="getCategoryColor(category)"
                  size="20"
                  class="mr-2"
                />
                {{ getCategoryLabel(category) }}
                <v-chip size="x-small" class="ml-2">
                  {{ getItemsInCategory(urgency, category).length }}
                </v-chip>
              </div>

              <v-row>
                <v-col
                  v-for="item in getItemsInCategory(urgency, category)"
                  :key="item.itemId"
                  cols="12"
                  md="6"
                  lg="4"
                >
                  <RecommendationCard
                    :item="item"
                    :selected="selectedItems.includes(item.itemId)"
                    @toggle="toggleItem(item.itemId)"
                    @add-to-request="$emit('add-to-request', item)"
                  />
                </v-col>
              </v-row>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <!-- Empty State -->
    <div v-if="filteredRecommendations.length === 0" class="text-center pa-8">
      <v-icon icon="mdi-check-all" size="64" color="success" class="mb-3" />
      <div class="text-h6 mb-2">All Stocked Up!</div>
      <div class="text-body-2 text-medium-emphasis">No reorder recommendations at this time</div>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedItems.length > 0" class="mt-4">
      <v-card variant="outlined" color="primary">
        <v-card-text class="pa-4">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="font-weight-bold">{{ selectedItems.length }} items selected</div>
              <div class="text-caption text-medium-emphasis">
                Choose an action for selected items
              </div>
            </div>

            <div class="d-flex gap-2">
              <v-btn
                color="primary"
                variant="flat"
                prepend-icon="mdi-cart-plus"
                @click="addSelectedToRequest"
              >
                Add to Request
              </v-btn>

              <v-btn variant="outlined" prepend-icon="mdi-close" @click="clearSelection">
                Clear Selection
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import type { OrderSuggestion } from '@/stores/supplier_2/types'
import RecommendationCard from './RecommendationCard.vue'

interface Props {
  recommendations: OrderSuggestion[]
}

interface Emits {
  (e: 'add-to-request', item: OrderSuggestion): void
  (e: 'bulk-add-to-request', items: OrderSuggestion[]): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

const productsStore = useProductsStore()

// Local State
const selectedUrgency = ref<string>('all')
const selectedCategory = ref<string | null>(null)
const selectedItems = ref<string[]>([])
const expandedPanels = ref<Record<string, number>>({
  critical: 0,
  high: 0,
  medium: undefined,
  low: undefined
})

// Options
const urgencyOptions = [
  { title: 'All Urgencies', value: 'all' },
  { title: 'Critical Only', value: 'critical' },
  { title: 'High Priority', value: 'high' },
  { title: 'Medium Priority', value: 'medium' },
  { title: 'Low Priority', value: 'low' }
]

const categoryOptions = computed(() => {
  const categories = new Set(
    props.recommendations.map(r => getProductCategory(r.itemId)).filter(Boolean)
  )

  return Array.from(categories).map(categoryId => ({
    title: getCategoryLabel(categoryId as string),
    value: categoryId
  }))
})

// Grouped Data
const groupedByUrgency = computed(() => {
  const groups: Record<string, OrderSuggestion[]> = {
    critical: [],
    high: [],
    medium: [],
    low: []
  }

  props.recommendations.forEach(item => {
    const urgency = item.urgency || 'low'
    if (groups[urgency]) {
      groups[urgency].push(item)
    }
  })

  return groups
})

const filteredRecommendations = computed(() => {
  let result = [...props.recommendations]

  // Urgency filter
  if (selectedUrgency.value !== 'all') {
    result = result.filter(r => r.urgency === selectedUrgency.value)
  }

  // Category filter
  if (selectedCategory.value) {
    result = result.filter(r => {
      const category = getProductCategory(r.itemId)
      return category === selectedCategory.value
    })
  }

  return result
})

const visibleUrgencyLevels = computed(() => {
  const levels: Array<'critical' | 'high' | 'medium' | 'low'> = [
    'critical',
    'high',
    'medium',
    'low'
  ]

  if (selectedUrgency.value === 'all') {
    return levels.filter(level => (groupedByUrgency.value[level]?.length || 0) > 0)
  }

  return levels.filter(level => level === selectedUrgency.value)
})

// Methods
function getCategoriesInUrgencyGroup(urgency: string): string[] {
  const items = groupedByUrgency.value[urgency] || []
  const categories = new Set(items.map(item => getProductCategory(item.itemId)).filter(Boolean))
  return Array.from(categories) as string[]
}

function getItemsInCategory(urgency: string, category: string): OrderSuggestion[] {
  const items = groupedByUrgency.value[urgency] || []
  return items.filter(item => getProductCategory(item.itemId) === category)
}

function getProductCategory(productId: string): string | null {
  const product = productsStore.products.find(p => p.id === productId)
  return product?.category || null
}

function toggleItem(itemId: string) {
  const index = selectedItems.value.indexOf(itemId)
  if (index > -1) {
    selectedItems.value.splice(index, 1)
  } else {
    selectedItems.value.push(itemId)
  }
}

function clearSelection() {
  selectedItems.value = []
}

function addSelectedToRequest() {
  const items = props.recommendations.filter(r => selectedItems.value.includes(r.itemId))
  emits('bulk-add-to-request', items)
  selectedItems.value = []
}

function getUrgencyColor(urgency: string): string {
  const colors: Record<string, string> = {
    critical: 'error',
    high: 'warning',
    medium: 'info',
    low: 'success'
  }
  return colors[urgency] || 'grey'
}

function getUrgencyIcon(urgency: string): string {
  const icons: Record<string, string> = {
    critical: 'mdi-alert-circle',
    high: 'mdi-alert',
    medium: 'mdi-information',
    low: 'mdi-check-circle'
  }
  return icons[urgency] || 'mdi-help-circle'
}

function getCategoryIcon(categoryId: string): string {
  const category = productsStore.categories.find(c => c.id === categoryId)
  return category?.icon || 'mdi-package-variant'
}

function getCategoryColor(categoryId: string): string {
  const category = productsStore.categories.find(c => c.id === categoryId)
  return category?.color || 'grey'
}

function getCategoryLabel(categoryId: string): string {
  return productsStore.getCategoryName(categoryId)
}
</script>

<style scoped lang="scss">
.recommendations-widget {
  .v-expansion-panel-title {
    padding: 12px 16px;
  }

  .v-expansion-panel-text {
    padding-top: 16px;
  }
}
</style>
