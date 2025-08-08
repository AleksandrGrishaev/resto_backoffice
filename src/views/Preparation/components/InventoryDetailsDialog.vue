<!-- src/views/preparation/components/InventoryDetailsDialog.vue - Адаптация InventoryDetailsDialog -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900px"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="inventory">
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>Preparation Inventory Details</h3>
          <div class="text-caption text-medium-emphasis">
            {{ inventory.documentNumber }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <!-- Summary Cards -->
        <v-row class="mb-4">
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="info">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ inventory.totalItems || 0 }}</div>
                <div class="text-body-2">Total Preparations</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="success">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ countedItemsCount }}</div>
                <div class="text-body-2">Preparations Counted</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card
              variant="tonal"
              :color="(inventory.totalDiscrepancies || 0) > 0 ? 'warning' : 'success'"
            >
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">
                  {{ inventory.totalDiscrepancies || 0 }}
                </div>
                <div class="text-body-2">Discrepancies</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card
              variant="tonal"
              :color="getValueColorForCard(inventory.totalValueDifference || 0)"
            >
              <v-card-text class="text-center">
                <div class="text-h6 font-weight-bold">
                  {{ formatCurrency(inventory.totalValueDifference || 0) }}
                </div>
                <div class="text-body-2">Value Impact</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Shelf Life Analysis -->
        <div
          v-if="shelfLifeStats.expiredItems > 0 || shelfLifeStats.expiringItems > 0"
          class="mb-4"
        >
          <h4 class="mb-3">
            <v-icon icon="mdi-clock-alert-outline" color="warning" class="mr-2" />
            Shelf Life Analysis
          </h4>
          <v-row>
            <v-col cols="6" md="4">
              <v-card variant="tonal" color="error" class="text-center">
                <v-card-text>
                  <div class="text-h5 font-weight-bold">{{ shelfLifeStats.expiredItems }}</div>
                  <div class="text-body-2">Expired Preparations</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="6" md="4">
              <v-card variant="tonal" color="warning" class="text-center">
                <v-card-text>
                  <div class="text-h5 font-weight-bold">{{ shelfLifeStats.expiringItems }}</div>
                  <div class="text-body-2">Expiring Soon</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="6" md="4">
              <v-card variant="tonal" color="success" class="text-center">
                <v-card-text>
                  <div class="text-h5 font-weight-bold">{{ shelfLifeStats.freshItems }}</div>
                  <div class="text-body-2">Fresh Preparations</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Expired/Expiring Items Alert -->
        <div v-if="expiredOrExpiringItems.length > 0" class="mb-4">
          <h4 class="mb-3">
            <v-icon icon="mdi-alert-circle" color="error" class="mr-2" />
            Critical Shelf Life Issues ({{ expiredOrExpiringItems.length }})
          </h4>
          <v-card variant="outlined" color="error">
            <v-list density="compact">
              <v-list-item
                v-for="item in expiredOrExpiringItems"
                :key="item.id"
                class="px-4 critical-shelf-life-item"
              >
                <template #prepend>
                  <div class="item-icon mr-3">🍲</div>
                </template>

                <v-list-item-title>
                  <div class="d-flex align-center justify-space-between">
                    <div class="flex-grow-1">
                      <div class="font-weight-medium">
                        {{ item.preparationName || 'Unknown Preparation' }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        Quantity: {{ item.actualQuantity || 0 }} {{ item.unit || 'g' }}
                      </div>
                      <div class="d-flex align-center gap-2 mt-1">
                        <v-chip
                          :color="isItemExpired(item) ? 'error' : 'warning'"
                          size="x-small"
                          variant="flat"
                        >
                          <v-icon
                            :icon="
                              isItemExpired(item) ? 'mdi-alert-circle' : 'mdi-clock-alert-outline'
                            "
                            size="10"
                            class="mr-1"
                          />
                          {{ isItemExpired(item) ? 'EXPIRED' : 'EXPIRING SOON' }}
                        </v-chip>
                        <span class="text-caption text-medium-emphasis">
                          {{ getShelfLifeMessage(item) }}
                        </span>
                      </div>
                      <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                        <v-icon icon="mdi-note-text" size="12" class="mr-1" />
                        {{ item.notes }}
                      </div>
                    </div>
                    <div class="text-right ml-4">
                      <div class="font-weight-medium text-error">
                        {{ formatCurrency((item.actualQuantity || 0) * (item.averageCost || 0)) }}
                      </div>
                      <div class="text-caption text-medium-emphasis">potential loss</div>
                    </div>
                  </div>
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </div>

        <!-- Items with Discrepancies -->
        <div v-if="discrepancyItems.length > 0" class="mb-4">
          <h4 class="mb-3">
            <v-icon icon="mdi-alert-triangle" color="warning" class="mr-2" />
            Preparations with Discrepancies ({{ discrepancyItems.length }})
          </h4>
          <v-card variant="outlined">
            <v-list density="compact">
              <v-list-item
                v-for="item in discrepancyItems"
                :key="item.id"
                class="px-4 discrepancy-item"
              >
                <template #prepend>
                  <div class="item-icon mr-3">🍲</div>
                </template>

                <v-list-item-title>
                  <div class="d-flex align-center justify-space-between">
                    <div class="flex-grow-1">
                      <div class="font-weight-medium">
                        {{ item.preparationName || 'Unknown Preparation' }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        System: {{ item.systemQuantity || 0 }} {{ item.unit || 'g' }} → Actual:
                        {{ item.actualQuantity || 0 }} {{ item.unit || 'g' }}
                      </div>
                      <div v-if="item.countedBy" class="text-caption text-primary mt-1">
                        <v-icon icon="mdi-account" size="12" class="mr-1" />
                        Counted by {{ item.countedBy }}
                      </div>
                      <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                        <v-icon icon="mdi-note-text" size="12" class="mr-1" />
                        {{ item.notes }}
                      </div>
                    </div>
                    <div class="text-right ml-4">
                      <div
                        class="font-weight-medium"
                        :class="(item.difference || 0) > 0 ? 'text-success' : 'text-error'"
                      >
                        {{ (item.difference || 0) > 0 ? '+' : '' }}{{ item.difference || 0 }}
                        {{ item.unit || 'g' }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ formatCurrency(item.valueDifference || 0) }}
                      </div>
                    </div>
                  </div>
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </div>

        <!-- Counted Items -->
        <div class="mb-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <h4>
              <v-icon icon="mdi-check-circle" color="success" class="mr-2" />
              Counted Preparations ({{ countedItems.length }})
            </h4>
            <v-btn-toggle v-model="itemsFilter" density="compact" size="small">
              <v-btn value="all">All Counted</v-btn>
              <v-btn value="confirmed">Confirmed</v-btn>
              <v-btn value="changed">With Changes</v-btn>
              <v-btn value="notes">With Notes</v-btn>
              <v-btn value="shelf-life">Shelf Life Issues</v-btn>
            </v-btn-toggle>
          </div>

          <v-card variant="outlined" max-height="400" style="overflow-y: auto">
            <v-list density="compact">
              <v-list-item
                v-for="item in filteredCountedItems"
                :key="item.id"
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
                        {{ item.preparationName || 'Unknown Preparation' }}
                      </div>

                      <!-- Количество -->
                      <div class="text-caption text-medium-emphasis">
                        <span
                          v-if="
                            Math.abs((item.actualQuantity || 0) - (item.systemQuantity || 0)) >
                            0.001
                          "
                        >
                          {{ item.systemQuantity || 0 }} → {{ item.actualQuantity || 0 }}
                          {{ item.unit || 'g' }}
                        </span>
                        <span v-else>
                          {{ item.systemQuantity || 0 }} {{ item.unit || 'g' }} (confirmed)
                        </span>
                      </div>

                      <!-- Статусы и информация -->
                      <div class="d-flex align-center gap-2 mt-1">
                        <!-- Кто считал -->
                        <v-chip color="primary" size="x-small" variant="tonal">
                          <v-icon icon="mdi-account" size="10" class="mr-1" />
                          {{ item.countedBy || 'Unknown' }}
                        </v-chip>

                        <!-- Подтверждено -->
                        <v-chip v-if="item.confirmed" color="success" size="x-small" variant="flat">
                          <v-icon icon="mdi-check" size="10" class="mr-1" />
                          Confirmed
                        </v-chip>

                        <!-- Есть изменения -->
                        <v-chip
                          v-if="Math.abs(item.difference || 0) > 0.001"
                          :color="(item.difference || 0) > 0 ? 'success' : 'error'"
                          size="x-small"
                          variant="flat"
                        >
                          <v-icon
                            :icon="(item.difference || 0) > 0 ? 'mdi-plus' : 'mdi-minus'"
                            size="10"
                            class="mr-1"
                          />
                          {{ Math.abs(item.difference || 0) }} {{ item.unit }}
                        </v-chip>

                        <!-- Срок годности -->
                        <v-chip
                          v-if="isItemExpired(item)"
                          color="error"
                          size="x-small"
                          variant="flat"
                        >
                          <v-icon icon="mdi-alert-circle" size="10" class="mr-1" />
                          EXPIRED
                        </v-chip>
                        <v-chip
                          v-else-if="isItemExpiring(item)"
                          color="warning"
                          size="x-small"
                          variant="flat"
                        >
                          <v-icon icon="mdi-clock-alert-outline" size="10" class="mr-1" />
                          EXPIRING
                        </v-chip>
                      </div>

                      <!-- Заметки -->
                      <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                        <v-icon icon="mdi-note-text" size="12" class="mr-1" />
                        {{ item.notes }}
                      </div>
                    </div>

                    <!-- Стоимостное воздействие -->
                    <div v-if="Math.abs(item.valueDifference || 0) > 0" class="text-right ml-4">
                      <div
                        class="text-body-2 font-weight-medium"
                        :class="(item.valueDifference || 0) > 0 ? 'text-success' : 'text-error'"
                      >
                        {{ formatCurrency(item.valueDifference || 0) }}
                      </div>
                      <div class="text-caption text-medium-emphasis">value impact</div>
                    </div>
                  </div>
                </v-list-item-title>
              </v-list-item>

              <!-- Empty state для фильтра -->
              <div v-if="filteredCountedItems.length === 0" class="text-center py-6">
                <v-icon icon="mdi-filter-off" size="48" class="text-medium-emphasis mb-2" />
                <div class="text-h6 text-medium-emphasis">No preparations match the filter</div>
                <div class="text-body-2 text-medium-emphasis">
                  Try selecting a different filter option
                </div>
              </div>
            </v-list>
          </v-card>
        </div>

        <!-- Inventory Info -->
        <v-row>
          <v-col cols="12" md="6">
            <div class="text-subtitle-2 mb-1">Date & Time</div>
            <div>{{ formatDateTime(inventory.inventoryDate) }}</div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="text-subtitle-2 mb-1">Responsible Person</div>
            <div>{{ inventory.responsiblePerson || 'Unknown' }}</div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="text-subtitle-2 mb-1">Department</div>
            <div>{{ formatDepartment(inventory.department) }}</div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="text-subtitle-2 mb-1">Status</div>
            <v-chip :color="getStatusColor(inventory.status)" size="small" variant="flat">
              <v-icon :icon="getStatusIcon(inventory.status)" size="14" class="mr-1" />
              {{ formatStatus(inventory.status) }}
            </v-chip>
          </v-col>
        </v-row>

        <!-- Recommendations -->
        <v-card v-if="hasRecommendations" variant="tonal" color="info" class="mt-4">
          <v-card-title>
            <v-icon icon="mdi-lightbulb" class="mr-2" />
            Recommendations
          </v-card-title>
          <v-card-text>
            <div v-if="shelfLifeStats.expiredItems > 0" class="mb-2">
              <v-alert type="error" variant="tonal" density="compact">
                <strong>URGENT:</strong>
                Remove {{ shelfLifeStats.expiredItems }} expired preparation{{
                  shelfLifeStats.expiredItems !== 1 ? 's' : ''
                }}
                immediately for food safety.
              </v-alert>
            </div>
            <div v-if="shelfLifeStats.expiringItems > 0" class="mb-2">
              <v-alert type="warning" variant="tonal" density="compact">
                <strong>Priority:</strong>
                Use {{ shelfLifeStats.expiringItems }} expiring preparation{{
                  shelfLifeStats.expiringItems !== 1 ? 's' : ''
                }}
                within 24 hours or dispose safely.
              </v-alert>
            </div>
            <div v-if="discrepancyItems.length > 0" class="mb-2">
              <v-alert type="info" variant="tonal" density="compact">
                <strong>Discrepancies:</strong>
                Investigate {{ discrepancyItems.length }} preparation{{
                  discrepancyItems.length !== 1 ? 's' : ''
                }}
                with quantity differences to improve inventory accuracy.
              </v-alert>
            </div>
          </v-card-text>
        </v-card>

        <!-- Total Value Difference -->
        <v-card
          v-if="(inventory.totalValueDifference || 0) !== 0"
          variant="tonal"
          :color="(inventory.totalValueDifference || 0) > 0 ? 'success' : 'error'"
          class="mt-4"
        >
          <v-card-text class="d-flex align-center justify-space-between">
            <div class="text-subtitle-1 font-weight-medium">
              Total Value {{ (inventory.totalValueDifference || 0) > 0 ? 'Surplus' : 'Shortage' }}
            </div>
            <div class="text-h6 font-weight-bold">
              {{ formatCurrency(Math.abs(inventory.totalValueDifference || 0)) }}
            </div>
          </v-card-text>
        </v-card>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="$emit('update:modelValue', false)">Close</v-btn>

        <v-btn
          v-if="inventory.status === 'confirmed'"
          color="primary"
          variant="flat"
          prepend-icon="mdi-download"
          @click="downloadReport"
        >
          Download Report
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type {
  PreparationInventoryDocument,
  PreparationInventoryItem,
  PreparationDepartment,
  PreparationInventoryStatus
} from '@/stores/preparation'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PreparationInventoryDetailsDialog'

// Props
interface Props {
  modelValue: boolean
  inventory: PreparationInventoryDocument | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// State
const itemsFilter = ref('all')

// Computed
const countedItems = computed(() => {
  if (!props.inventory?.items) return []

  // Показываем только полуфабрикаты, которые были реально посчитаны
  return props.inventory.items.filter(
    item =>
      item.countedBy ||
      item.confirmed ||
      Math.abs((item.actualQuantity || 0) - (item.systemQuantity || 0)) > 0.001
  )
})

const countedItemsCount = computed(() => countedItems.value.length)

const discrepancyItems = computed(() =>
  countedItems.value.filter(item => Math.abs(item.difference || 0) > 0.01)
)

const expiredOrExpiringItems = computed(() =>
  countedItems.value.filter(item => isItemExpired(item) || isItemExpiring(item))
)

const shelfLifeStats = computed(() => {
  const stats = {
    expiredItems: 0,
    expiringItems: 0,
    freshItems: 0
  }

  countedItems.value.forEach(item => {
    if (isItemExpired(item)) {
      stats.expiredItems++
    } else if (isItemExpiring(item)) {
      stats.expiringItems++
    } else {
      stats.freshItems++
    }
  })

  return stats
})

const hasRecommendations = computed(() => {
  return (
    shelfLifeStats.value.expiredItems > 0 ||
    shelfLifeStats.value.expiringItems > 0 ||
    discrepancyItems.value.length > 0
  )
})

const filteredCountedItems = computed(() => {
  const items = [...countedItems.value]

  switch (itemsFilter.value) {
    case 'confirmed':
      return items.filter(item => item.confirmed)
    case 'changed':
      return items.filter(item => Math.abs(item.difference || 0) > 0.001)
    case 'notes':
      return items.filter(item => item.notes && item.notes.trim())
    case 'shelf-life':
      return items.filter(item => isItemExpired(item) || isItemExpiring(item))
    default:
      return items
  }
})

// Methods
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

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatCurrency(amount: number): string {
  if (amount === 0) return '0'

  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Math.abs(amount))

  return amount < 0 ? `-${formatted}` : formatted
}

function getValueColorForCard(value: number): string {
  if (value > 0) return 'success'
  if (value < 0) return 'error'
  return 'info'
}

function getItemRowClass(item: PreparationInventoryItem): string {
  if (isItemExpired(item)) return 'expired-item'
  if (isItemExpiring(item)) return 'expiring-item'
  if (item.confirmed && Math.abs(item.difference || 0) <= 0.001) return 'confirmed-item'
  if (Math.abs(item.difference || 0) > 0.001) return 'discrepancy-item'
  return 'counted-item'
}

function isItemExpired(item: PreparationInventoryItem): boolean {
  // TODO: Implement actual expiry check based on batch data
  // This is a placeholder - should check against batch expiry dates
  return false
}

function isItemExpiring(item: PreparationInventoryItem): boolean {
  // TODO: Implement actual expiring check (within 24 hours)
  // This is a placeholder - should check against batch expiry dates
  return false
}

function getShelfLifeMessage(item: PreparationInventoryItem): string {
  if (isItemExpired(item)) {
    return 'Expired - must be disposed immediately'
  }
  if (isItemExpiring(item)) {
    return 'Expires within 24 hours - use immediately'
  }
  return 'Fresh'
}

function downloadReport() {
  if (!props.inventory) return

  DebugUtils.info(MODULE_NAME, 'Downloading preparation inventory report', {
    inventoryId: props.inventory.id,
    documentNumber: props.inventory.documentNumber
  })

  // TODO: Implement actual report download with shelf life analysis
}
</script>

<style lang="scss" scoped>
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

// Стили для разных состояний полуфабрикатов
.confirmed-item {
  background-color: rgba(var(--v-theme-success), 0.05);
  border-left: 3px solid rgb(var(--v-theme-success));
}

.discrepancy-item {
  background-color: rgba(var(--v-theme-warning), 0.05);
  border-left: 3px solid rgb(var(--v-theme-warning));
}

.counted-item {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-left: 3px solid rgb(var(--v-theme-primary));
}

.expired-item {
  background-color: rgba(var(--v-theme-error), 0.05);
  border-left: 3px solid rgb(var(--v-theme-error));
}

.expiring-item {
  background-color: rgba(var(--v-theme-warning), 0.05);
  border-left: 3px solid rgb(var(--v-theme-warning));
}

.critical-shelf-life-item {
  background-color: rgba(var(--v-theme-error), 0.1);
  border: 1px solid rgba(var(--v-theme-error), 0.3);
  border-radius: 8px;
  margin-bottom: 8px;
}

.v-table {
  th {
    font-weight: 600 !important;
  }
}
</style>
