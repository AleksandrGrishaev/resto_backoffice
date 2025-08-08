<!-- src/views/preparation/components/PreparationOperationsTable.vue - Адаптация StorageOperationsTable -->
<template>
  <div class="preparation-operations-table">
    <!-- Filters Section -->
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Recent Preparation Operations</span>
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

          <!-- Preparation Search -->
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.preparationSearch"
              label="Search preparations..."
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

        <!-- Preparations Summary -->
        <template #[`item.items`]="{ item }">
          <div>
            <div class="font-weight-medium">
              {{ item.items.length }} preparation{{ item.items.length !== 1 ? 's' : '' }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ getPreparationsSummary(item.items) }}
            </div>
            <!-- Shelf Life Indicator -->
            <div v-if="hasShelfLifeIssues(item)" class="mt-1">
              <v-chip v-if="getExpiredCount(item) > 0" size="x-small" color="error" variant="flat">
                <v-icon icon="mdi-alert-circle" size="10" class="mr-1" />
                {{ getExpiredCount(item) }} Expired
              </v-chip>
              <v-chip
                v-if="getExpiringCount(item) > 0"
                size="x-small"
                color="warning"
                variant="flat"
                class="ml-1"
              >
                <v-icon icon="mdi-clock-alert-outline" size="10" class="mr-1" />
                {{ getExpiringCount(item) }} Expiring
              </v-chip>
            </div>
          </div>
        </template>

        <!-- Usage Details (для consumption операций) -->
        <template #[`item.usageDetails`]="{ item }">
          <div v-if="item.operationType === 'consumption' && item.consumptionDetails">
            <div class="font-weight-medium">
              {{ formatUsageReason(item.consumptionDetails.reason) }}
            </div>
            <div
              v-if="item.consumptionDetails.relatedName"
              class="text-caption text-medium-emphasis"
            >
              {{ item.consumptionDetails.relatedName }}
            </div>
            <div
              v-if="item.consumptionDetails.portionCount"
              class="text-caption text-medium-emphasis"
            >
              {{ item.consumptionDetails.portionCount }} portions
            </div>
          </div>
          <div v-else-if="item.operationType === 'production' && item.sourceType">
            <div class="font-weight-medium">{{ formatSourceType(item.sourceType) }}</div>
          </div>
          <div v-else class="text-medium-emphasis">-</div>
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
            <div class="text-h6 text-medium-emphasis mb-2">No preparation operations found</div>
            <div class="text-body-2 text-medium-emphasis">
              {{
                hasActiveFilters
                  ? 'Try adjusting your filters'
                  : `No recent operations for ${formatDepartment(department)}`
              }}
            </div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Operation Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="700px">
      <v-card v-if="selectedOperation">
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <h3>Preparation Operation Details</h3>
            <div class="text-caption text-medium-emphasis">
              {{ selectedOperation.documentNumber }}
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="showDetailsDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-6">
          <!-- Operation Info -->
          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">Operation Type</div>
              <v-chip :color="getOperationColor(selectedOperation.operationType)" size="small">
                <v-icon
                  :icon="getOperationIcon(selectedOperation.operationType)"
                  size="14"
                  class="mr-1"
                />
                {{ formatOperationType(selectedOperation.operationType) }}
              </v-chip>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">Date & Time</div>
              <div>{{ formatDateTime(selectedOperation.operationDate) }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">Responsible Person</div>
              <div>{{ selectedOperation.responsiblePerson }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 mb-1">Status</div>
              <v-chip
                :color="selectedOperation.status === 'confirmed' ? 'success' : 'warning'"
                size="small"
              >
                {{ selectedOperation.status === 'confirmed' ? 'Confirmed' : 'Draft' }}
              </v-chip>
            </v-col>
          </v-row>

          <!-- Usage/Production Details -->
          <div
            v-if="selectedOperation.consumptionDetails || selectedOperation.sourceType"
            class="mb-4"
          >
            <div class="text-subtitle-2 mb-2">
              {{
                selectedOperation.operationType === 'consumption'
                  ? 'Usage Details'
                  : 'Production Details'
              }}
            </div>
            <v-card variant="outlined">
              <v-card-text>
                <div v-if="selectedOperation.consumptionDetails">
                  <div class="font-weight-medium mb-1">
                    {{ formatUsageReason(selectedOperation.consumptionDetails.reason) }}
                  </div>
                  <div
                    v-if="selectedOperation.consumptionDetails.relatedName"
                    class="text-body-2 mb-1"
                  >
                    Related to: {{ selectedOperation.consumptionDetails.relatedName }}
                  </div>
                  <div v-if="selectedOperation.consumptionDetails.portionCount" class="text-body-2">
                    Portions: {{ selectedOperation.consumptionDetails.portionCount }}
                  </div>
                </div>
                <div v-else-if="selectedOperation.sourceType">
                  <div class="font-weight-medium">
                    {{ formatSourceType(selectedOperation.sourceType) }}
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Shelf Life Analysis -->
          <div v-if="hasShelfLifeIssues(selectedOperation)" class="mb-4">
            <div class="text-subtitle-2 mb-2">Shelf Life Status</div>
            <v-row>
              <v-col v-if="getExpiredCount(selectedOperation) > 0" cols="6">
                <v-card variant="tonal" color="error" class="text-center">
                  <v-card-text>
                    <div class="text-h6 font-weight-bold">
                      {{ getExpiredCount(selectedOperation) }}
                    </div>
                    <div class="text-body-2">Expired Preparations</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col v-if="getExpiringCount(selectedOperation) > 0" cols="6">
                <v-card variant="tonal" color="warning" class="text-center">
                  <v-card-text>
                    <div class="text-h6 font-weight-bold">
                      {{ getExpiringCount(selectedOperation) }}
                    </div>
                    <div class="text-body-2">Expiring Soon</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- Preparations List -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">
              Preparations ({{ selectedOperation.items.length }})
            </div>
            <v-card variant="outlined">
              <v-list density="compact">
                <v-list-item
                  v-for="(item, index) in selectedOperation.items"
                  :key="index"
                  class="px-4"
                  :class="getItemRowClass(item)"
                >
                  <template #prepend>
                    <div class="item-icon mr-3">🍲</div>
                  </template>

                  <v-list-item-title>
                    <div class="d-flex align-center justify-space-between">
                      <div class="flex-grow-1">
                        <div class="font-weight-medium">
                          {{ item.preparationName || item.itemName }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ item.quantity }} {{ item.unit || 'g' }}
                          <span v-if="item.costPerUnit">
                            @ {{ formatCurrency(item.costPerUnit) }}/{{ item.unit || 'g' }}
                          </span>
                        </div>
                        <!-- Expiry Date (for production) -->
                        <div v-if="item.expiryDate" class="text-caption mt-1">
                          <v-icon
                            :icon="
                              isItemExpired(item.expiryDate)
                                ? 'mdi-alert-circle'
                                : isItemExpiring(item.expiryDate)
                                  ? 'mdi-clock-alert-outline'
                                  : 'mdi-check-circle'
                            "
                            :color="
                              isItemExpired(item.expiryDate)
                                ? 'error'
                                : isItemExpiring(item.expiryDate)
                                  ? 'warning'
                                  : 'success'
                            "
                            size="12"
                            class="mr-1"
                          />
                          Expires: {{ formatDate(item.expiryDate) }}
                        </div>
                        <!-- Notes -->
                        <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                          <v-icon icon="mdi-note-text" size="12" class="mr-1" />
                          {{ item.notes }}
                        </div>
                      </div>
                      <div v-if="item.totalCost" class="text-right">
                        <div class="font-weight-medium">{{ formatCurrency(item.totalCost) }}</div>
                        <div class="text-caption text-medium-emphasis">total</div>
                      </div>
                    </div>
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </div>

          <!-- Total Value -->
          <div v-if="selectedOperation.totalValue" class="mb-4">
            <v-card variant="tonal" color="primary">
              <v-card-text class="d-flex align-center justify-space-between">
                <div class="text-subtitle-1 font-weight-medium">Total Value</div>
                <div class="text-h6 font-weight-bold">
                  {{ formatCurrency(selectedOperation.totalValue) }}
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Notes -->
          <div v-if="selectedOperation.notes">
            <div class="text-subtitle-2 mb-1">Notes</div>
            <v-card variant="outlined">
              <v-card-text>{{ selectedOperation.notes }}</v-card-text>
            </v-card>
          </div>
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
  PreparationOperation,
  PreparationDepartment,
  PreparationOperationType,
  PreparationOperationItem
} from '@/stores/preparation'

// Props
interface Props {
  operations: PreparationOperation[]
  loading: boolean
  department: PreparationDepartment
}

const props = defineProps<Props>()

// State
const filters = ref({
  dateFrom: '',
  dateTo: '',
  operationType: null as PreparationOperationType | null,
  preparationSearch: ''
})

const sortOrder = ref<'asc' | 'desc'>('desc')
const showDetailsDialog = ref(false)
const selectedOperation = ref<PreparationOperation | null>(null)

// Computed
const headers = computed(() => [
  { title: 'Type', key: 'operationType', sortable: true },
  { title: 'Document', key: 'documentNumber', sortable: true },
  { title: 'Preparations', key: 'items', sortable: false },
  { title: 'Details', key: 'usageDetails', sortable: false },
  { title: 'Responsible', key: 'responsiblePerson', sortable: true },
  { title: 'Value', key: 'totalValue', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '80px' }
])

const operationTypeOptions = computed(() => [
  { title: 'All Types', value: null },
  { title: 'Production', value: 'production' },
  { title: 'Consumption', value: 'consumption' },
  { title: 'Inventory', value: 'inventory' },
  { title: 'Correction', value: 'correction' }
])

const quickFilters = computed(() => [
  { title: 'Production', value: 'production', icon: 'mdi-chef-hat' },
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
    filters.value.preparationSearch
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
      toDate.setHours(23, 59, 59, 999)
      result = result.filter(op => op && new Date(op.operationDate) <= toDate)
    }

    // Operation type filter
    if (filters.value.operationType) {
      result = result.filter(op => op && op.operationType === filters.value.operationType)
    }

    // Preparation search filter
    if (filters.value.preparationSearch) {
      const searchLower = filters.value.preparationSearch.toLowerCase()
      result = result.filter(
        op =>
          op &&
          op.items &&
          op.items.some(
            item =>
              item &&
              (item.preparationName || item.itemName) &&
              (item.preparationName || item.itemName).toLowerCase().includes(searchLower)
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
    console.warn('Error filtering preparation operations:', error)
    return []
  }
})

// Methods
function formatDepartment(dept: PreparationDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function getOperationIcon(type: PreparationOperationType): string {
  switch (type) {
    case 'production':
      return 'mdi-chef-hat'
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

function getOperationColor(type: PreparationOperationType): string {
  switch (type) {
    case 'production':
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

function formatOperationType(type: PreparationOperationType): string {
  switch (type) {
    case 'production':
      return 'Production'
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

function formatUsageReason(reason: string): string {
  const reasons: Record<string, string> = {
    menu_item: 'Menu Item',
    catering: 'Catering Order',
    waste: 'Waste/Spoilage',
    expired: 'Expired',
    damage: 'Damage',
    other: 'Other'
  }
  return reasons[reason] || reason
}

function formatSourceType(sourceType: string): string {
  const sources: Record<string, string> = {
    production: 'Recipe Production',
    correction: 'Correction/Adjustment',
    opening_balance: 'Opening Balance'
  }
  return sources[sourceType] || sourceType
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
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

function getPreparationsSummary(items: PreparationOperationItem[]): string {
  if (!items || items.length === 0) return 'No preparations'
  if (items.length === 1)
    return items[0]?.preparationName || items[0]?.itemName || 'Unknown preparation'
  const firstName = items[0]?.preparationName || items[0]?.itemName || 'Unknown preparation'
  return `${firstName} +${items.length - 1} more`
}

function hasShelfLifeIssues(operation: PreparationOperation): boolean {
  return getExpiredCount(operation) > 0 || getExpiringCount(operation) > 0
}

function getExpiredCount(operation: PreparationOperation): number {
  if (!operation.items) return 0
  return operation.items.filter(item => item.expiryDate && isItemExpired(item.expiryDate)).length
}

function getExpiringCount(operation: PreparationOperation): number {
  if (!operation.items) return 0
  return operation.items.filter(
    item => item.expiryDate && isItemExpiring(item.expiryDate) && !isItemExpired(item.expiryDate)
  ).length
}

function isItemExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date()
}

function isItemExpiring(expiryDate: string): boolean {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diffHours <= 24 && diffHours >= 0
}

function getItemRowClass(item: PreparationOperationItem): string {
  if (item.expiryDate) {
    if (isItemExpired(item.expiryDate)) return 'expired-item'
    if (isItemExpiring(item.expiryDate)) return 'expiring-item'
  }
  return ''
}

function toggleQuickFilter(operationType: PreparationOperationType) {
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
    preparationSearch: ''
  }
}

function viewOperation(operation: PreparationOperation) {
  selectedOperation.value = operation
  showDetailsDialog.value = true
}
</script>

<style lang="scss" scoped>
.preparation-operations-table {
  .gap-2 {
    gap: 8px;
  }

  .v-card-title {
    background: rgba(var(--v-theme-surface), 0.8);
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

  // Стили для статуса срока годности
  .expired-item {
    background-color: rgba(var(--v-theme-error), 0.05);
    border-left: 3px solid rgb(var(--v-theme-error));
  }

  .expiring-item {
    background-color: rgba(var(--v-theme-warning), 0.05);
    border-left: 3px solid rgb(var(--v-theme-warning));
  }
}
</style>
