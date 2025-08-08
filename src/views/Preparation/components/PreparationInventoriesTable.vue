<!-- src/views/preparation/components/PreparationInventoriesTable.vue - Адаптация StorageInventoriesTable -->
<template>
  <div class="preparation-inventories-table">
    <!-- Filters Section -->
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Preparation Inventory Records</span>
        <v-chip size="small" variant="outlined">
          {{ filteredInventories.length }} inventories
        </v-chip>
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

          <!-- Status Filter -->
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.status"
              label="Status"
              :items="statusOptions"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>

          <!-- Search -->
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.search"
              label="Search..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
        </v-row>

        <!-- Quick Filters -->
        <div class="d-flex align-center mt-3 gap-2">
          <v-chip
            :color="filters.status === 'draft' ? 'warning' : 'default'"
            :variant="filters.status === 'draft' ? 'flat' : 'outlined'"
            size="small"
            @click="toggleStatusFilter('draft')"
          >
            <v-icon icon="mdi-pencil" size="14" class="mr-1" />
            Draft ({{ getDraftCount() }})
          </v-chip>

          <v-chip
            :color="filters.status === 'confirmed' ? 'success' : 'default'"
            :variant="filters.status === 'confirmed' ? 'flat' : 'outlined'"
            size="small"
            @click="toggleStatusFilter('confirmed')"
          >
            <v-icon icon="mdi-check-circle" size="14" class="mr-1" />
            Confirmed ({{ getConfirmedCount() }})
          </v-chip>

          <v-divider vertical class="mx-2" />

          <v-btn size="small" variant="outlined" @click="clearFilters">Clear Filters</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Inventories Table -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredInventories"
        :loading="loading"
        item-key="id"
        class="elevation-0"
        :items-per-page="15"
        :sort-by="[{ key: 'inventoryDate', order: 'desc' }]"
        loading-text="Loading preparation inventories..."
      >
        <!-- Document Number -->
        <template #[`item.documentNumber`]="{ item }">
          <div>
            <div class="font-weight-medium">{{ item.documentNumber }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ formatDateTime(item.inventoryDate) }}
            </div>
          </div>
        </template>

        <!-- Preparations Count -->
        <template #[`item.totalItems`]="{ item }">
          <div class="text-center">
            <div class="font-weight-medium">{{ item.totalItems || 0 }}</div>
            <div class="text-caption text-medium-emphasis">preparations</div>
          </div>
        </template>

        <!-- Discrepancies -->
        <template #[`item.totalDiscrepancies`]="{ item }">
          <div class="text-center">
            <div
              class="font-weight-medium"
              :class="(item.totalDiscrepancies || 0) > 0 ? 'text-warning' : 'text-success'"
            >
              {{ item.totalDiscrepancies || 0 }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ (item.totalDiscrepancies || 0) === 1 ? 'discrepancy' : 'discrepancies' }}
            </div>
          </div>
        </template>

        <!-- Value Difference -->
        <template #[`item.totalValueDifference`]="{ item }">
          <div class="text-right">
            <div
              class="font-weight-medium"
              :class="getValueDifferenceColor(item.totalValueDifference || 0)"
            >
              {{ formatCurrency(item.totalValueDifference || 0) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ (item.totalValueDifference || 0) >= 0 ? 'surplus' : 'shortage' }}
            </div>
          </div>
        </template>

        <!-- Shelf Life Alert -->
        <template #[`item.shelfLifeIssues`]="{ item }">
          <div class="text-center">
            <div v-if="item.expiredItems > 0" class="mb-1">
              <v-chip size="x-small" color="error" variant="flat">
                <v-icon icon="mdi-alert-circle" size="12" class="mr-1" />
                {{ item.expiredItems }} Expired
              </v-chip>
            </div>
            <div v-if="item.expiringItems > 0">
              <v-chip size="x-small" color="warning" variant="flat">
                <v-icon icon="mdi-clock-alert-outline" size="12" class="mr-1" />
                {{ item.expiringItems }} Expiring
              </v-chip>
            </div>
            <div v-if="!item.expiredItems && !item.expiringItems">
              <v-chip size="x-small" color="success" variant="flat">
                <v-icon icon="mdi-check-circle" size="12" class="mr-1" />
                All Fresh
              </v-chip>
            </div>
          </div>
        </template>

        <!-- Responsible Person -->
        <template #[`item.responsiblePerson`]="{ item }">
          <div class="d-flex align-center">
            <v-avatar size="24" class="mr-2">
              <v-icon icon="mdi-account" size="16" />
            </v-avatar>
            {{ item.responsiblePerson || 'Unknown' }}
          </div>
        </template>

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <v-chip :color="getStatusColor(item.status)" size="small" variant="flat">
            <v-icon :icon="getStatusIcon(item.status)" size="14" class="mr-1" />
            {{ formatStatus(item.status) }}
          </v-chip>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <div class="d-flex gap-1">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-eye"
              @click="viewInventory(item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">View Details</v-tooltip>
            </v-btn>

            <v-btn
              v-if="item.status === 'draft'"
              size="small"
              variant="text"
              color="warning"
              icon="mdi-pencil"
              @click="editInventory(item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">Continue Counting</v-tooltip>
            </v-btn>

            <!-- Additional Actions for Confirmed Inventories -->
            <v-menu v-if="item.status === 'confirmed'">
              <template #activator="{ props: menuProps }">
                <v-btn size="small" variant="text" icon="mdi-dots-vertical" v-bind="menuProps" />
              </template>
              <v-list density="compact">
                <v-list-item @click="downloadReport(item)">
                  <v-list-item-title>Download Report</v-list-item-title>
                  <template #prepend>
                    <v-icon icon="mdi-download" />
                  </template>
                </v-list-item>
                <v-list-item @click="viewCorrectionOperations(item)">
                  <v-list-item-title>View Corrections</v-list-item-title>
                  <template #prepend>
                    <v-icon icon="mdi-file-document-edit" />
                  </template>
                </v-list-item>
                <v-list-item @click="viewShelfLifeAnalysis(item)">
                  <v-list-item-title>Shelf Life Analysis</v-list-item-title>
                  <template #prepend>
                    <v-icon icon="mdi-clock-alert-outline" />
                  </template>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-clipboard-list" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">No preparation inventories found</div>
            <div class="text-body-2 text-medium-emphasis">
              {{
                hasFilters
                  ? 'Try adjusting your filters'
                  : `Start an inventory to track preparation levels for ${formatDepartment(department)}`
              }}
            </div>
            <!-- Start Inventory Button -->
            <v-btn
              v-if="!hasFilters"
              color="primary"
              variant="flat"
              class="mt-4"
              @click="startNewInventory"
            >
              <v-icon icon="mdi-clipboard-list" class="mr-2" />
              Start Preparation Inventory
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Inventory Details Dialog -->
    <inventory-details-dialog v-model="showDetailsDialog" :inventory="selectedInventory" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type {
  PreparationInventoryDocument,
  PreparationDepartment,
  PreparationInventoryStatus
} from '@/stores/preparation'
import { DebugUtils } from '@/utils'

// Components
import InventoryDetailsDialog from './InventoryDetailsDialog.vue'

const MODULE_NAME = 'PreparationInventoriesTable'

// Props
interface Props {
  inventories: PreparationInventoryDocument[]
  loading?: boolean
  department: PreparationDepartment
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
const emit = defineEmits<{
  'edit-inventory': [inventory: PreparationInventoryDocument]
  'start-inventory': []
}>()

// State
const filters = ref({
  dateFrom: '',
  dateTo: '',
  status: null as PreparationInventoryStatus | null,
  search: ''
})

const showDetailsDialog = ref(false)
const selectedInventory = ref<PreparationInventoryDocument | null>(null)

// Options
const statusOptions = [
  { title: 'All Status', value: null },
  { title: 'Draft', value: 'draft' },
  { title: 'Confirmed', value: 'confirmed' },
  { title: 'Cancelled', value: 'cancelled' }
]

// Computed
const headers = computed(() => [
  { title: 'Document', key: 'documentNumber', sortable: true },
  { title: 'Preparations', key: 'totalItems', sortable: true },
  { title: 'Discrepancies', key: 'totalDiscrepancies', sortable: true },
  { title: 'Value Diff', key: 'totalValueDifference', sortable: true },
  { title: 'Shelf Life', key: 'shelfLifeIssues', sortable: false },
  { title: 'Responsible', key: 'responsiblePerson', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px' }
])

const filteredInventories = computed(() => {
  try {
    let result = [...(props.inventories || [])]

    // Date range filter
    if (filters.value.dateFrom) {
      const fromDate = new Date(filters.value.dateFrom)
      result = result.filter(inv => inv && new Date(inv.inventoryDate) >= fromDate)
    }

    if (filters.value.dateTo) {
      const toDate = new Date(filters.value.dateTo)
      toDate.setHours(23, 59, 59, 999)
      result = result.filter(inv => inv && new Date(inv.inventoryDate) <= toDate)
    }

    // Status filter
    if (filters.value.status) {
      result = result.filter(inv => inv && inv.status === filters.value.status)
    }

    // Search filter
    if (filters.value.search) {
      const searchLower = filters.value.search.toLowerCase()
      result = result.filter(
        inv =>
          inv &&
          (inv.documentNumber.toLowerCase().includes(searchLower) ||
            inv.responsiblePerson.toLowerCase().includes(searchLower))
      )
    }

    return result
  } catch (error) {
    console.warn('Error filtering preparation inventories:', error)
    return []
  }
})

const hasFilters = computed(() => {
  return !!(
    filters.value.dateFrom ||
    filters.value.dateTo ||
    filters.value.status ||
    filters.value.search
  )
})

// Methods
function getDraftCount(): number {
  return props.inventories.filter(inv => inv.status === 'draft').length
}

function getConfirmedCount(): number {
  return props.inventories.filter(inv => inv.status === 'confirmed').length
}

function getStatusIcon(status: PreparationInventoryStatus): string {
  switch (status) {
    case 'draft':
      return 'mdi-pencil'
    case 'confirmed':
      return 'mdi-check-circle'
    case 'cancelled':
      return 'mdi-cancel'
    default:
      return 'mdi-help-circle'
  }
}

function getStatusColor(status: PreparationInventoryStatus): string {
  switch (status) {
    case 'draft':
      return 'warning'
    case 'confirmed':
      return 'success'
    case 'cancelled':
      return 'error'
    default:
      return 'default'
  }
}

function formatDepartment(dept: PreparationDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function formatStatus(status: PreparationInventoryStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'confirmed':
      return 'Confirmed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

function getValueDifferenceColor(value: number): string {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-error'
  return 'text-medium-emphasis'
}

function toggleStatusFilter(status: PreparationInventoryStatus) {
  if (filters.value.status === status) {
    filters.value.status = null
  } else {
    filters.value.status = status
  }
}

function clearFilters() {
  filters.value = {
    dateFrom: '',
    dateTo: '',
    status: null,
    search: ''
  }
}

function viewInventory(inventory: PreparationInventoryDocument) {
  selectedInventory.value = inventory
  showDetailsDialog.value = true

  DebugUtils.info(MODULE_NAME, 'Viewing preparation inventory details', {
    inventoryId: inventory.id,
    documentNumber: inventory.documentNumber
  })
}

function editInventory(inventory: PreparationInventoryDocument) {
  emit('edit-inventory', inventory)

  DebugUtils.info(MODULE_NAME, 'Editing preparation inventory', {
    inventoryId: inventory.id,
    documentNumber: inventory.documentNumber
  })
}

function startNewInventory() {
  emit('start-inventory')
}

function downloadReport(inventory: PreparationInventoryDocument) {
  DebugUtils.info(MODULE_NAME, 'Downloading preparation inventory report', {
    inventoryId: inventory.id,
    documentNumber: inventory.documentNumber
  })

  // TODO: Implement actual report download with shelf life analysis
  console.log('Download preparation inventory report for:', inventory.documentNumber)
}

function viewCorrectionOperations(inventory: PreparationInventoryDocument) {
  DebugUtils.info(MODULE_NAME, 'Viewing preparation correction operations', {
    inventoryId: inventory.id,
    documentNumber: inventory.documentNumber
  })

  // TODO: Implement showing related correction operations
  console.log('View corrections for preparation inventory:', inventory.documentNumber)
}

function viewShelfLifeAnalysis(inventory: PreparationInventoryDocument) {
  DebugUtils.info(MODULE_NAME, 'Viewing shelf life analysis', {
    inventoryId: inventory.id,
    documentNumber: inventory.documentNumber
  })

  // TODO: Implement shelf life analysis view for inventory
  console.log('View shelf life analysis for preparation inventory:', inventory.documentNumber)
}
</script>

<style lang="scss" scoped>
.preparation-inventories-table {
  .gap-2 {
    gap: 8px;
  }

  .item-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 6px;
  }
}
</style>
