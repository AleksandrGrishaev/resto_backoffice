<!-- src/views/backoffice/inventory/components/inventory/InventoryTopItemsTable.vue -->
<template>
  <div class="inventory-top-items-table">
    <!-- Filters and Actions -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center gap-2 flex-wrap">
        <!-- Item Type Filter -->
        <v-btn-toggle v-model="selectedType" density="compact" mandatory>
          <v-btn value="all" size="small">All Items</v-btn>
          <v-btn value="product" size="small">
            <v-icon icon="mdi-package-variant" class="mr-1" size="small" />
            Products
          </v-btn>
          <v-btn value="preparation" size="small">
            <v-icon icon="mdi-pot-mix" class="mr-1" size="small" />
            Preparations
          </v-btn>
        </v-btn-toggle>

        <!-- Department Filter -->
        <v-btn-toggle v-model="selectedDepartment" density="compact" mandatory>
          <v-btn value="all" size="small">All Departments</v-btn>
          <v-btn value="kitchen" size="small">
            <v-icon icon="mdi-silverware-fork-knife" class="mr-1" size="small" />
            Kitchen
          </v-btn>
          <v-btn value="bar" size="small">
            <v-icon icon="mdi-coffee" class="mr-1" size="small" />
            Bar
          </v-btn>
          <v-btn value="kitchenAndBar" size="small">
            <v-icon icon="mdi-food-fork-drink" class="mr-1" size="small" />
            Both
          </v-btn>
        </v-btn-toggle>

        <!-- Search -->
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search items..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="width: 300px"
        />
      </div>

      <!-- Export Button -->
      <v-btn
        color="primary"
        variant="outlined"
        size="small"
        prepend-icon="mdi-download"
        @click="exportToExcel"
      >
        Export to Excel
      </v-btn>
    </div>

    <!-- Active Filters Display -->
    <div v-if="hasActiveFilters" class="mb-3">
      <div class="d-flex align-center gap-2">
        <span class="text-caption text-medium-emphasis">Active filters:</span>

        <v-chip
          v-if="selectedType !== 'all'"
          size="small"
          closable
          color="primary"
          @click:close="selectedType = 'all'"
        >
          {{ selectedType === 'product' ? 'Products' : 'Preparations' }}
        </v-chip>

        <v-chip
          v-if="selectedDepartment !== 'all'"
          size="small"
          closable
          color="primary"
          @click:close="selectedDepartment = 'all'"
        >
          {{ getDepartmentLabel(selectedDepartment) }}
        </v-chip>

        <v-chip
          v-if="searchQuery"
          size="small"
          closable
          color="primary"
          @click:close="searchQuery = ''"
        >
          Search: "{{ searchQuery }}"
        </v-chip>

        <v-btn size="small" variant="text" @click="clearAllFilters">Clear All</v-btn>
      </div>
    </div>

    <!-- Top Items Table -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredItems"
        :loading="loading"
        :search="searchQuery"
        item-key="itemId"
        class="elevation-0"
        :items-per-page="50"
        :sort-by="[{ key: 'totalValue', order: 'desc' }]"
      >
        <!-- Rank -->
        <template #[`item.rank`]="{ index }">
          <div class="d-flex align-center">
            <v-icon
              v-if="index < 3"
              :icon="getRankIcon(index)"
              :color="getRankColor(index)"
              size="20"
              class="mr-2"
            />
            <span :class="index < 3 ? 'font-weight-bold' : ''">{{ index + 1 }}</span>
          </div>
        </template>

        <!-- Item Name -->
        <template #[`item.itemName`]="{ item }">
          <div class="d-flex align-center">
            <v-icon
              :icon="item.itemType === 'product' ? 'mdi-package-variant' : 'mdi-pot-mix'"
              :color="item.itemType === 'product' ? 'blue' : 'orange'"
              size="18"
              class="mr-2"
            />
            <div>
              <div class="font-weight-medium">{{ item.itemName }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ item.itemType === 'product' ? 'Product' : 'Preparation' }}
              </div>
            </div>
          </div>
        </template>

        <!-- Department -->
        <template #[`item.department`]="{ item }">
          <v-chip
            :color="getDepartmentColor(item.department)"
            :prepend-icon="getDepartmentIcon(item.department)"
            size="small"
            variant="tonal"
          >
            {{ getDepartmentLabel(item.department) }}
          </v-chip>
        </template>

        <!-- Quantity -->
        <template #[`item.quantity`]="{ item }">
          <div class="font-weight-medium">
            {{ formatQuantity(item.quantity, item.unit) }}
          </div>
        </template>

        <!-- Cost per Unit -->
        <template #[`item.averageCostPerUnit`]="{ item }">
          <div>
            <div class="font-weight-medium">{{ formatCurrency(item.averageCostPerUnit) }}</div>
            <div class="text-caption text-medium-emphasis">per {{ item.unit }}</div>
          </div>
        </template>

        <!-- Total Value -->
        <template #[`item.totalValue`]="{ item, index }">
          <div>
            <div class="font-weight-bold" :class="getValueClass(index)">
              {{ formatCurrency(item.totalValue) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ formatPercentage(item.totalValue, totalInventoryValue) }}% of total
            </div>
          </div>
        </template>

        <!-- Value Bar -->
        <template #[`item.valueBar`]="{ item }">
          <div class="d-flex align-center">
            <v-progress-linear
              :model-value="(item.totalValue / maxItemValue) * 100"
              :color="getBarColor(item.itemType)"
              height="8"
              rounded
            />
          </div>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-package-variant-closed" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">
              {{ hasActiveFilters ? 'No items match filters' : 'No inventory data' }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{
                hasActiveFilters
                  ? 'Try adjusting or clearing your filters'
                  : 'Calculate inventory valuation to see data'
              }}
            </div>
            <div v-if="hasActiveFilters" class="d-flex justify-center gap-2">
              <v-btn size="small" variant="outlined" @click="clearAllFilters">Clear Filters</v-btn>
            </div>
          </div>
        </template>

        <!-- Loading -->
        <template #loading>
          <div class="text-center py-8">
            <v-progress-circular indeterminate color="primary" class="mb-2" />
            <div>Loading inventory data...</div>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { InventoryValuation } from '@/stores/analytics/types'

// Props
interface Props {
  items: InventoryValuation['topItems']
  totalInventoryValue: number
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// State
const searchQuery = ref('')
const selectedType = ref<'all' | 'product' | 'preparation'>('all')
const selectedDepartment = ref<'all' | 'kitchen' | 'bar' | 'kitchenAndBar'>('all')

// Computed
const headers = computed(() => [
  { title: '#', key: 'rank', sortable: false, width: '80px' },
  { title: 'Item', key: 'itemName', sortable: true, width: '200px' },
  { title: 'Department', key: 'department', sortable: true, width: '140px' },
  { title: 'Quantity', key: 'quantity', sortable: true, width: '130px', align: 'end' },
  {
    title: 'Avg Cost/Unit',
    key: 'averageCostPerUnit',
    sortable: true,
    width: '140px',
    align: 'end'
  },
  { title: 'Total Value', key: 'totalValue', sortable: true, width: '160px', align: 'end' },
  { title: 'Value Distribution', key: 'valueBar', sortable: false, width: '150px' }
])

const filteredItems = computed(() => {
  let items = [...props.items]

  // Filter by type
  if (selectedType.value !== 'all') {
    items = items.filter(item => item.itemType === selectedType.value)
  }

  // Filter by department
  if (selectedDepartment.value !== 'all') {
    items = items.filter(item => item.department === selectedDepartment.value)
  }

  return items
})

const hasActiveFilters = computed(
  () =>
    selectedType.value !== 'all' || selectedDepartment.value !== 'all' || searchQuery.value !== ''
)

const maxItemValue = computed(() => {
  if (filteredItems.value.length === 0) return 0
  return Math.max(...filteredItems.value.map(item => item.totalValue))
})

// Methods
function getRankIcon(index: number): string {
  switch (index) {
    case 0:
      return 'mdi-medal'
    case 1:
      return 'mdi-medal'
    case 2:
      return 'mdi-medal'
    default:
      return ''
  }
}

function getRankColor(index: number): string {
  switch (index) {
    case 0:
      return 'amber'
    case 1:
      return 'grey'
    case 2:
      return 'orange-darken-2'
    default:
      return ''
  }
}

function getValueClass(index: number): string {
  if (index < 3) return 'text-primary'
  return ''
}

function getBarColor(itemType: 'product' | 'preparation'): string {
  return itemType === 'product' ? 'blue' : 'orange'
}

function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${unit}`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0.00'
  return ((value / total) * 100).toFixed(2)
}

function getDepartmentLabel(
  department: 'kitchen' | 'bar' | 'kitchenAndBar' | 'unknown' | 'all'
): string {
  switch (department) {
    case 'kitchen':
      return 'Kitchen'
    case 'bar':
      return 'Bar'
    case 'kitchenAndBar':
      return 'Kitchen & Bar'
    case 'all':
      return 'All Departments'
    default:
      return 'Unknown'
  }
}

function getDepartmentIcon(department: 'kitchen' | 'bar' | 'kitchenAndBar' | 'unknown'): string {
  switch (department) {
    case 'kitchen':
      return 'mdi-silverware-fork-knife'
    case 'bar':
      return 'mdi-coffee'
    case 'kitchenAndBar':
      return 'mdi-food-fork-drink'
    default:
      return 'mdi-help-circle'
  }
}

function getDepartmentColor(department: 'kitchen' | 'bar' | 'kitchenAndBar' | 'unknown'): string {
  switch (department) {
    case 'kitchen':
      return 'orange'
    case 'bar':
      return 'blue'
    case 'kitchenAndBar':
      return 'purple'
    default:
      return 'grey'
  }
}

function clearAllFilters() {
  selectedType.value = 'all'
  selectedDepartment.value = 'all'
  searchQuery.value = ''
}

function exportToExcel() {
  // TODO: Implement Excel export
  console.log('Export to Excel - TODO')
}
</script>

<style lang="scss" scoped>
.inventory-top-items-table {
  .gap-2 {
    gap: 8px;
  }
}
</style>
