<!-- src/views/supplier_2/components/orders/basket/UnassignedItemsWidget.vue -->
<template>
  <div class="unassigned-widget">
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-h6 font-weight-bold">🔄 Unassigned Items ({{ items.length }})</div>

      <div class="d-flex gap-2">
        <v-select
          v-model="selectedCategory"
          :items="categoryOptions"
          label="Filter by category"
          variant="outlined"
          density="compact"
          style="width: 200px"
        />

        <v-btn v-if="filteredItems.length > 0" color="primary" size="small" @click="selectAll">
          Select All ({{ filteredItems.length }})
        </v-btn>

        <v-btn v-if="selectedItems.length > 0" color="warning" size="small" @click="clearSelection">
          Clear Selection
        </v-btn>
      </div>
    </div>

    <v-card variant="outlined">
      <v-card-text class="pa-3">
        <v-row>
          <v-col v-for="item in filteredItems" :key="item.itemId" cols="12" md="6" lg="4">
            <v-card
              variant="outlined"
              class="item-card pa-3"
              :class="{ selected: selectedItems.includes(item.itemId) }"
              @click="toggleItem(item.itemId)"
            >
              <!-- Header with checkbox -->
              <div class="d-flex justify-space-between align-start mb-3">
                <div class="font-weight-bold text-body-1">{{ item.itemName }}</div>
                <v-checkbox
                  :model-value="selectedItems.includes(item.itemId)"
                  hide-details
                  density="compact"
                  @click.stop
                  @update:model-value="toggleItem(item.itemId)"
                />
              </div>

              <!-- Quantity info -->
              <div class="mb-3">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-body-2 text-medium-emphasis">Required:</span>
                  <span class="text-body-1 font-weight-bold">
                    {{ item.totalQuantity }} {{ item.unit }}
                  </span>
                </div>

                <!-- Recommended package if exists -->
                <div
                  v-if="item.recommendedPackageName"
                  class="d-flex align-center justify-space-between mb-1 pa-2 bg-info-lighten rounded"
                >
                  <div class="d-flex align-center">
                    <v-icon size="16" class="mr-1" color="info">mdi-package-variant</v-icon>
                    <span class="text-caption">Recommended:</span>
                  </div>
                  <span class="text-caption font-weight-bold">
                    {{ item.recommendedPackageName }}
                  </span>
                </div>
              </div>

              <!-- Department sources -->
              <div class="mb-3">
                <div class="text-caption text-medium-emphasis mb-1">Sources:</div>
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="source in item.sources"
                    :key="source.requestId"
                    size="x-small"
                    :color="getDepartmentColor(source.department)"
                    variant="tonal"
                  >
                    <v-icon size="10" class="mr-1">
                      {{ getDepartmentIcon(source.department) }}
                    </v-icon>
                    {{ source.quantity }} {{ item.unit }}
                  </v-chip>
                </div>
              </div>

              <!-- Estimated cost -->
              <v-divider class="mb-2" />
              <div class="d-flex align-center justify-space-between">
                <span class="text-caption text-medium-emphasis">Est. Cost:</span>
                <span class="text-body-1 font-weight-bold text-success">
                  {{ formatCurrency(calculateEstimatedCost(item)) }}
                </span>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Bulk assign -->
        <div v-if="selectedItems.length > 0" class="mt-4 pa-3 bg-surface rounded">
          <div class="text-subtitle-2 mb-3">Assign {{ selectedItems.length }} item(s) to:</div>
          <div class="d-flex flex-wrap gap-2">
            <v-btn
              v-for="supplier in suppliers"
              :key="supplier.id"
              size="small"
              variant="outlined"
              color="primary"
              @click="assignToSupplier(supplier.id, supplier.name)"
            >
              {{ supplier.name }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { UnassignedItem } from '@/stores/supplier_2/types'
import { useProductsStore } from '@/stores/productsStore'

interface Props {
  items: UnassignedItem[]
  suppliers: Array<{ id: string; name: string }>
}

const props = defineProps<Props>()

onMounted(() => {
  console.log('=== UNASSIGNED ITEMS DEBUG ===')
  props.items.forEach(item => {
    console.log({
      name: item.itemName,
      totalQuantity: item.totalQuantity,
      unit: item.unit,
      estimatedBaseCost: item.estimatedBaseCost,
      category: item.category
    })
  })
})

const emit = defineEmits<{
  'assign-to-supplier': [supplierId: string, supplierName: string, itemIds: string[]]
}>()

const productsStore = useProductsStore()
const selectedCategory = ref('all')
const selectedItems = ref<string[]>([])

const categoryOptions = [
  { title: 'All', value: 'all' },
  { title: 'Meat', value: 'meat' },
  { title: 'Vegetables', value: 'vegetables' },
  { title: 'Beverages', value: 'beverages' },
  { title: 'Dairy', value: 'dairy' }
]

const filteredItems = computed(() => {
  if (selectedCategory.value === 'all') {
    return props.items
  }
  return props.items.filter(item => {
    const category = getItemCategory(item.itemId)
    return category === selectedCategory.value
  })
})

function calculateEstimatedCost(item: UnassignedItem): number {
  const baseCost = item.estimatedBaseCost || 0
  const quantity = item.totalQuantity || 0
  const result = baseCost * quantity

  console.log('Calculate cost:', {
    item: item.itemName,
    baseCost,
    quantity,
    result
  })

  return result
}

function getItemCategory(itemId: string): string {
  if (itemId.includes('beef') || itemId.includes('steak') || itemId.includes('chicken')) {
    return 'meat'
  }
  if (
    itemId.includes('potato') ||
    itemId.includes('tomato') ||
    itemId.includes('garlic') ||
    itemId.includes('onion')
  ) {
    return 'vegetables'
  }
  if (itemId.includes('beer') || itemId.includes('cola') || itemId.includes('water')) {
    return 'beverages'
  }
  if (itemId.includes('butter') || itemId.includes('milk') || itemId.includes('cheese')) {
    return 'dairy'
  }
  return 'all'
}

function toggleItem(itemId: string) {
  const index = selectedItems.value.indexOf(itemId)
  if (index > -1) {
    selectedItems.value.splice(index, 1)
  } else {
    selectedItems.value.push(itemId)
  }
}

function selectAll() {
  selectedItems.value = filteredItems.value.map(i => i.itemId)
}

function clearSelection() {
  selectedItems.value = []
}

function assignToSupplier(supplierId: string, supplierName: string) {
  if (selectedItems.value.length === 0) return
  emit('assign-to-supplier', supplierId, supplierName, [...selectedItems.value])
  selectedItems.value = []
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val)
}

function getDepartmentColor(dept: string) {
  return dept === 'kitchen' ? 'orange' : 'purple'
}

function getDepartmentIcon(dept: string) {
  return dept === 'kitchen' ? 'mdi-chef-hat' : 'mdi-glass-cocktail'
}
</script>

<style scoped>
.item-card {
  cursor: pointer;
  transition: all 0.2s;
  height: 100%;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.item-card.selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}

.bg-info-lighten {
  background-color: rgba(var(--v-theme-info), 0.1);
}
</style>
