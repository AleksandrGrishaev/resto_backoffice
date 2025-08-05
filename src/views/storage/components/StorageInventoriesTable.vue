<!-- src/views/storage/components/StorageInventoriesTable.vue -->
<template>
  <div class="storage-inventories-table">
    <!-- Filters Section -->
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Inventory Records</span>
        <v-chip size="small" variant="outlined">{{ inventories.length }} inventories</v-chip>
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

          <!-- Item Type Filter -->
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.itemType"
              label="Item Type"
              :items="itemTypeOptions"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>

          <!-- Status Filter -->
          <v-col cols="12" md="2">
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
          <v-col cols="12" md="2">
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
            Draft
          </v-chip>

          <v-chip
            :color="filters.status === 'confirmed' ? 'success' : 'default'"
            :variant="filters.status === 'confirmed' ? 'flat' : 'outlined'"
            size="small"
            @click="toggleStatusFilter('confirmed')"
          >
            <v-icon icon="mdi-check-circle" size="14" class="mr-1" />
            Confirmed
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

        <!-- Item Type -->
        <template #[`item.itemType`]="{ item }">
          <v-chip :color="getItemTypeColor(item.itemType)" size="small" variant="flat">
            <v-icon :icon="getItemTypeIcon(item.itemType)" size="14" class="mr-1" />
            {{ formatItemType(item.itemType) }}
          </v-chip>
        </template>

        <!-- Items Count -->
        <template #[`item.totalItems`]="{ item }">
          <div class="text-center">
            <div class="font-weight-medium">{{ item.totalItems }}</div>
            <div class="text-caption text-medium-emphasis">items</div>
          </div>
        </template>

        <!-- Discrepancies -->
        <template #[`item.totalDiscrepancies`]="{ item }">
          <div class="text-center">
            <div
              class="font-weight-medium"
              :class="item.totalDiscrepancies > 0 ? 'text-warning' : 'text-success'"
            >
              {{ item.totalDiscrepancies }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ item.totalDiscrepancies === 1 ? 'discrepancy' : 'discrepancies' }}
            </div>
          </div>
        </template>

        <!-- Value Difference -->
        <template #[`item.totalValueDifference`]="{ item }">
          <div class="text-right">
            <div
              class="font-weight-medium"
              :class="getValueDifferenceColor(item.totalValueDifference)"
            >
              {{ formatCurrency(item.totalValueDifference) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ item.totalValueDifference >= 0 ? 'surplus' : 'shortage' }}
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

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <v-chip
            :color="item.status === 'confirmed' ? 'success' : 'warning'"
            size="small"
            variant="flat"
          >
            <v-icon
              :icon="item.status === 'confirmed' ? 'mdi-check-circle' : 'mdi-pencil'"
              size="14"
              class="mr-1"
            />
            {{ item.status === 'confirmed' ? 'Confirmed' : 'Draft' }}
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
          </div>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-clipboard-list" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">No inventories found</div>
            <div class="text-body-2 text-medium-emphasis">
              Start an inventory to track stock levels for {{ department }}
            </div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Inventory Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="800px">
      <v-card v-if="selectedInventory">
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <h3>Inventory Details</h3>
            <div class="text-caption text-medium-emphasis">
              {{ selectedInventory.documentNumber }}
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="showDetailsDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-6">
          <!-- Summary -->
          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="info">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ selectedInventory.totalItems }}</div>
                  <div class="text-body-2">Total Items Counted</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card
                variant="tonal"
                :color="selectedInventory.totalDiscrepancies > 0 ? 'warning' : 'success'"
              >
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">
                    {{ selectedInventory.totalDiscrepancies }}
                  </div>
                  <div class="text-body-2">Discrepancies Found</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Items with Discrepancies -->
          <div v-if="selectedInventory.totalDiscrepancies > 0" class="mb-4">
            <h4 class="mb-3">Items with Discrepancies</h4>
            <v-card variant="outlined">
              <v-list density="compact">
                <v-list-item
                  v-for="item in getDiscrepancyItems(selectedInventory)"
                  :key="item.id"
                  class="px-4"
                >
                  <template #prepend>
                    <div class="item-icon mr-3">
                      {{ item.itemType === 'product' ? '🥩' : '🍲' }}
                    </div>
                  </template>

                  <v-list-item-title>
                    <div class="d-flex align-center justify-space-between">
                      <div>
                        <div class="font-weight-medium">{{ item.itemName }}</div>
                        <div class="text-caption text-medium-emphasis">
                          System: {{ item.systemQuantity }} {{ item.unit }} | Actual:
                          {{ item.actualQuantity }} {{ item.unit }}
                        </div>
                      </div>
                      <div class="text-right">
                        <div
                          class="font-weight-medium"
                          :class="item.difference > 0 ? 'text-success' : 'text-error'"
                        >
                          {{ item.difference > 0 ? '+' : '' }}{{ item.difference }} {{ item.unit }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ formatCurrency(item.valueDifference) }}
                        </div>
                      </div>
                    </div>
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </div>

          <!-- Inventory Info -->
          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">Date & Time</div>
              <div>{{ formatDateTime(selectedInventory.inventoryDate) }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">Responsible Person</div>
              <div>{{ selectedInventory.responsiblePerson }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">Department</div>
              <div>{{ formatDepartment(selectedInventory.department) }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">Item Type</div>
              <div>{{ formatItemType(selectedInventory.itemType) }}</div>
            </v-col>
          </v-row>

          <!-- Total Value Difference -->
          <v-card
            v-if="selectedInventory.totalValueDifference !== 0"
            variant="tonal"
            :color="selectedInventory.totalValueDifference > 0 ? 'success' : 'error'"
            class="mt-4"
          >
            <v-card-text class="d-flex align-center justify-space-between">
              <div class="text-subtitle-1 font-weight-medium">
                Total Value
                {{ selectedInventory.totalValueDifference > 0 ? 'Surplus' : 'Shortage' }}
              </div>
              <div class="text-h6 font-weight-bold">
                {{ formatCurrency(Math.abs(selectedInventory.totalValueDifference)) }}
              </div>
            </v-card-text>
          </v-card>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type {
  InventoryDocument,
  InventoryItem,
  StorageDepartment,
  StorageItemType
} from '@/stores/storage'

// Props
interface Props {
  inventories: InventoryDocument[]
  loading: boolean
  department: StorageDepartment
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'edit-inventory': [inventory: InventoryDocument]
}>()

// State
const filters = ref({
  dateFrom: '',
  dateTo: '',
  itemType: null as StorageItemType | null,
  status: null as 'draft' | 'confirmed' | null,
  search: ''
})

const showDetailsDialog = ref(false)
const selectedInventory = ref<InventoryDocument | null>(null)

// Computed
const headers = computed(() => [
  { title: 'Document', key: 'documentNumber', sortable: true },
  { title: 'Type', key: 'itemType', sortable: true },
  { title: 'Items', key: 'totalItems', sortable: true },
  { title: 'Discrepancies', key: 'totalDiscrepancies', sortable: true },
  { title: 'Value Diff', key: 'totalValueDifference', sortable: true },
  { title: 'Responsible', key: 'responsiblePerson', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '100px' }
])

const itemTypeOptions = computed(() => [
  { title: 'All Types', value: null },
  { title: 'Products', value: 'product' },
  { title: 'Preparations', value: 'preparation' }
])

const statusOptions = computed(() => [
  { title: 'All Status', value: null },
  { title: 'Draft', value: 'draft' },
  { title: 'Confirmed', value: 'confirmed' }
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

    // Item type filter
    if (filters.value.itemType) {
      result = result.filter(inv => inv && inv.itemType === filters.value.itemType)
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
    console.warn('Error filtering inventories:', error)
    return []
  }
})

// Methods
function getItemTypeIcon(type: StorageItemType): string {
  return type === 'product' ? 'mdi-package-variant' : 'mdi-chef-hat'
}

function getItemTypeColor(type: StorageItemType): string {
  return type === 'product' ? 'primary' : 'secondary'
}

function formatItemType(type: StorageItemType): string {
  return type === 'product' ? 'Products' : 'Preparations'
}

function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
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

function getDiscrepancyItems(inventory: InventoryDocument): InventoryItem[] {
  return inventory.items.filter(item => Math.abs(item.difference) > 0.01)
}

function toggleStatusFilter(status: 'draft' | 'confirmed') {
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
    itemType: null,
    status: null,
    search: ''
  }
}

function viewInventory(inventory: InventoryDocument) {
  selectedInventory.value = inventory
  showDetailsDialog.value = true
}

function editInventory(inventory: InventoryDocument) {
  emit('edit-inventory', inventory)
}
</script>

<style lang="scss" scoped>
.storage-inventories-table {
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
