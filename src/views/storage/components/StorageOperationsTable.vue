<!-- src/views/storage/components/StorageOperationsTable.vue -->
<template>
  <div class="storage-operations-table">
    <!-- Filters Section -->
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Recent Operations</span>
        <v-chip size="small" variant="outlined">{{ filteredOperations.length }} operations</v-chip>
      </v-card-title>

      <v-card-text class="pb-2">
        <v-row>
          <!-- Date Range -->
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.dateFrom"
              label="Date From"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.dateTo"
              label="Date To"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>

          <!-- Operation Type Filter -->
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.operationType"
              label="Operation Type"
              :items="operationTypeOptions"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>

          <!-- Item Search -->
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.itemSearch"
              label="Search items..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>

          <!-- Sort Options -->
          <v-col cols="12" md="1">
            <v-btn-toggle v-model="sortOrder" density="compact" class="h-100">
              <v-btn value="desc" size="small">
                <v-icon icon="mdi-sort-calendar-descending" />
                <v-tooltip activator="parent" location="top">Newest First</v-tooltip>
              </v-btn>
              <v-btn value="asc" size="small">
                <v-icon icon="mdi-sort-calendar-ascending" />
                <v-tooltip activator="parent" location="top">Oldest First</v-tooltip>
              </v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>

        <!-- Quick Filters -->
        <div class="d-flex align-center mt-3 gap-2">
          <v-chip
            v-for="quickFilter in quickFilters"
            :key="quickFilter.value"
            :color="filters.operationType === quickFilter.value ? 'primary' : 'default'"
            :variant="filters.operationType === quickFilter.value ? 'flat' : 'outlined'"
            size="small"
            @click="toggleQuickFilter(quickFilter.value)"
          >
            <v-icon :icon="quickFilter.icon" size="14" class="mr-1" />
            {{ quickFilter.title }}
          </v-chip>

          <v-divider vertical class="mx-2" />

          <v-btn size="small" variant="outlined" @click="clearFilters">Clear Filters</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Operations Table -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredOperations"
        :loading="loading"
        item-key="id"
        class="elevation-0"
        :items-per-page="15"
        :sort-by="sortBy"
      >
        <!-- Operation Type -->
        <template #[`item.operationType`]="{ item }">
          <v-chip :color="getOperationColor(item.operationType)" size="small" variant="flat">
            <v-icon :icon="getOperationIcon(item.operationType)" size="14" class="mr-1" />
            {{ formatOperationType(item.operationType) }}
          </v-chip>
        </template>

        <!-- Document Number -->
        <template #[`item.documentNumber`]="{ item }">
          <div class="font-weight-medium">{{ item.documentNumber }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ formatDateTime(item.operationDate) }}
          </div>
        </template>

        <!-- Items Summary -->
        <template #[`item.items`]="{ item }">
          <div>
            <div class="font-weight-medium">
              {{ item.items.length }} item{{ item.items.length !== 1 ? 's' : '' }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ getItemsSummary(item.items) }}
            </div>
          </div>
        </template>

        <!-- Responsible Person -->
        <template #[`item.responsiblePerson`]="{ item }">
          <div class="d-flex align-center">
            <v-avatar size="24" class="mr-2">
              <v-icon icon="mdi-account" size="16" />
            </v-avatar>
            {{ item.responsiblePerson }}
          </div>
        </template>

        <!-- Total Value -->
        <template #[`item.totalValue`]="{ item }">
          <div v-if="item.totalValue" class="font-weight-medium">
            {{ formatCurrency(item.totalValue) }}
          </div>
          <div v-else class="text-medium-emphasis">-</div>
        </template>

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <v-chip
            :color="item.status === 'confirmed' ? 'success' : 'warning'"
            size="small"
            variant="flat"
          >
            {{ item.status === 'confirmed' ? 'Confirmed' : 'Draft' }}
          </v-chip>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <v-btn
            size="small"
            variant="text"
            color="primary"
            icon="mdi-eye"
            @click="viewOperation(item)"
          >
            <v-icon />
            <v-tooltip activator="parent" location="top">View Details</v-tooltip>
          </v-btn>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-history" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">No operations found</div>
            <div class="text-body-2 text-medium-emphasis">
              {{
                hasActiveFilters
                  ? 'Try adjusting your filters'
                  : `No recent operations for ${department}`
              }}
            </div>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type {
  StorageOperation,
  StorageDepartment,
  OperationType,
  StorageOperationItem
} from '@/stores/storage'

// Props
interface Props {
  operations: StorageOperation[]
  loading: boolean
  department: StorageDepartment
}

defineProps<Props>()

// State
const filters = ref({
  dateFrom: '',
  dateTo: '',
  operationType: null as OperationType | null,
  itemSearch: ''
})

const sortOrder = ref<'asc' | 'desc'>('desc')

// Computed
const headers = computed(() => [
  { title: 'Type', key: 'operationType', sortable: true },
  { title: 'Document', key: 'documentNumber', sortable: true },
  { title: 'Items', key: 'items', sortable: false },
  { title: 'Responsible', key: 'responsiblePerson', sortable: true },
  { title: 'Value', key: 'totalValue', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '80px' }
])

const operationTypeOptions = computed(() => [
  { title: 'All Types', value: null },
  { title: 'Receipt', value: 'receipt' },
  { title: 'Consumption', value: 'consumption' },
  { title: 'Inventory', value: 'inventory' },
  { title: 'Correction', value: 'correction' }
])

const quickFilters = computed(() => [
  { title: 'Receipt', value: 'receipt', icon: 'mdi-plus-circle' },
  { title: 'Consumption', value: 'consumption', icon: 'mdi-minus-circle' },
  { title: 'Inventory', value: 'inventory', icon: 'mdi-clipboard-list' },
  { title: 'Correction', value: 'correction', icon: 'mdi-pencil' }
])

const sortBy = computed(() => [{ key: 'operationDate', order: sortOrder.value }])

const hasActiveFilters = computed(
  () =>
    filters.value.dateFrom ||
    filters.value.dateTo ||
    filters.value.operationType ||
    filters.value.itemSearch
)

const filteredOperations = computed(() => {
  try {
    let result = [...(props.operations || [])]

    // Date range filter
    if (filters.value.dateFrom) {
      const fromDate = new Date(filters.value.dateFrom)
      result = result.filter(op => op && new Date(op.operationDate) >= fromDate)
    }

    if (filters.value.dateTo) {
      const toDate = new Date(filters.value.dateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      result = result.filter(op => op && new Date(op.operationDate) <= toDate)
    }

    // Operation type filter
    if (filters.value.operationType) {
      result = result.filter(op => op && op.operationType === filters.value.operationType)
    }

    // Item search filter
    if (filters.value.itemSearch) {
      const searchLower = filters.value.itemSearch.toLowerCase()
      result = result.filter(
        op =>
          op &&
          op.items &&
          op.items.some(
            item => item && item.itemName && item.itemName.toLowerCase().includes(searchLower)
          )
      )
    }

    // Sort by date
    result.sort((a, b) => {
      if (!a || !b || !a.operationDate || !b.operationDate) return 0
      const dateA = new Date(a.operationDate).getTime()
      const dateB = new Date(b.operationDate).getTime()
      return sortOrder.value === 'desc' ? dateB - dateA : dateA - dateB
    })

    return result
  } catch (error) {
    console.warn('Error filtering operations:', error)
    return []
  }
})

// Methods
function getOperationIcon(type: OperationType): string {
  switch (type) {
    case 'receipt':
      return 'mdi-plus-circle'
    case 'consumption':
      return 'mdi-minus-circle'
    case 'inventory':
      return 'mdi-clipboard-list'
    case 'correction':
      return 'mdi-pencil'
    default:
      return 'mdi-file-document'
  }
}

function getOperationColor(type: OperationType): string {
  switch (type) {
    case 'receipt':
      return 'success'
    case 'consumption':
      return 'primary'
    case 'inventory':
      return 'info'
    case 'correction':
      return 'warning'
    default:
      return 'default'
  }
}

function formatOperationType(type: OperationType): string {
  switch (type) {
    case 'receipt':
      return 'Receipt'
    case 'consumption':
      return 'Consumption'
    case 'inventory':
      return 'Inventory'
    case 'correction':
      return 'Correction'
    default:
      return type
  }
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function getItemsSummary(items: StorageOperationItem[]): string {
  if (items.length === 0) return 'No items'
  if (items.length === 1) return items[0].itemName
  return `${items[0].itemName} +${items.length - 1} more`
}

function toggleQuickFilter(operationType: OperationType) {
  if (filters.value.operationType === operationType) {
    filters.value.operationType = null
  } else {
    filters.value.operationType = operationType
  }
}

function clearFilters() {
  filters.value = {
    dateFrom: '',
    dateTo: '',
    operationType: null,
    itemSearch: ''
  }
}

function viewOperation(operation: StorageOperation) {
  // TODO: Implement operation details view
  console.log('View operation:', operation)
}
</script>

<style lang="scss" scoped>
.storage-operations-table {
  .gap-2 {
    gap: 8px;
  }

  .v-card-title {
    background: rgba(var(--v-theme-surface), 0.8);
  }
}
</style>
