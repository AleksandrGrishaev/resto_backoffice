<!-- src/views/storage/components/InventoryDetailsDialog.vue -->
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
          <h3>Inventory Details</h3>
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
                <div class="text-body-2">Total Items</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="success">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ countedItemsCount }}</div>
                <div class="text-body-2">Items Counted</div>
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

        <!-- Items with Discrepancies (если есть) -->
        <div v-if="discrepancyItems.length > 0" class="mb-4">
          <h4 class="mb-3">
            <v-icon icon="mdi-alert-circle" color="warning" class="mr-2" />
            Items with Discrepancies ({{ discrepancyItems.length }})
          </h4>
          <v-card variant="outlined">
            <v-list density="compact">
              <v-list-item
                v-for="item in discrepancyItems"
                :key="item.id"
                class="px-4 discrepancy-item"
              >
                <template #prepend>
                  <div class="item-icon mr-3">
                    {{ item.itemType === 'product' ? '🥩' : '🍲' }}
                  </div>
                </template>

                <v-list-item-title>
                  <div class="d-flex align-center justify-space-between">
                    <div class="flex-grow-1">
                      <div class="font-weight-medium">{{ item.itemName || 'Unknown Item' }}</div>
                      <div class="text-caption text-medium-emphasis">
                        System: {{ item.systemQuantity || 0 }} {{ item.unit || 'units' }} → Actual:
                        {{ item.actualQuantity || 0 }} {{ item.unit || 'units' }}
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
                        {{ item.unit || 'units' }}
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
              Counted Items ({{ countedItems.length }})
            </h4>
            <v-btn-toggle v-model="itemsFilter" density="compact" size="small">
              <v-btn value="all">All Counted</v-btn>
              <v-btn value="confirmed">Confirmed</v-btn>
              <v-btn value="changed">With Changes</v-btn>
              <v-btn value="notes">With Notes</v-btn>
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
                  <div class="item-icon mr-3">
                    {{ item.itemType === 'product' ? '🥩' : '🍲' }}
                  </div>
                </template>

                <v-list-item-title>
                  <div class="d-flex align-center justify-space-between">
                    <div class="flex-grow-1">
                      <div class="font-weight-medium">{{ item.itemName || 'Unknown Item' }}</div>

                      <!-- Количество -->
                      <div class="text-caption text-medium-emphasis">
                        <span
                          v-if="
                            Math.abs((item.actualQuantity || 0) - (item.systemQuantity || 0)) >
                            0.001
                          "
                        >
                          {{ item.systemQuantity || 0 }} → {{ item.actualQuantity || 0 }}
                          {{ item.unit || 'units' }}
                        </span>
                        <span v-else>
                          {{ item.systemQuantity || 0 }} {{ item.unit || 'units' }} (confirmed)
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
                      </div>

                      <!-- Заметки -->
                      <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                        <v-icon icon="mdi-note-text" size="12" class="mr-1" />
                        {{ item.notes }}
                      </div>
                    </div>

                    <!-- Стоимостное воздействие (если есть) -->
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
                <div class="text-h6 text-medium-emphasis">No items match the filter</div>
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
            <div class="text-subtitle-2 mb-1">Item Type</div>
            <div>{{ formatItemType(inventory.itemType) }}</div>
          </v-col>
        </v-row>

        <!-- Total Value Difference (если есть) -->
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
  InventoryDocument,
  InventoryItem,
  StorageDepartment,
  StorageItemType,
  InventoryStatus
} from '@/stores/storage'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'InventoryDetailsDialog'

// Props
interface Props {
  modelValue: boolean
  inventory: InventoryDocument | null
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

  // Показываем только товары, которые были реально посчитаны
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

const filteredCountedItems = computed(() => {
  const items = [...countedItems.value]

  switch (itemsFilter.value) {
    case 'confirmed':
      return items.filter(item => item.confirmed)
    case 'changed':
      return items.filter(item => Math.abs(item.difference || 0) > 0.001)
    case 'notes':
      return items.filter(item => item.notes && item.notes.trim())
    default:
      return items
  }
})

// Methods
function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function formatItemType(type: StorageItemType): string {
  return type === 'product' ? 'Products' : 'Preparations'
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

function getItemRowClass(item: InventoryItem): string {
  if (item.confirmed && Math.abs(item.difference || 0) <= 0.001) return 'confirmed-item'
  if (Math.abs(item.difference || 0) > 0.001) return 'discrepancy-item'
  return 'counted-item'
}

function downloadReport() {
  if (!props.inventory) return

  DebugUtils.info(MODULE_NAME, 'Downloading inventory report', {
    inventoryId: props.inventory.id,
    documentNumber: props.inventory.documentNumber
  })

  // TODO: Implement actual report download
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

// Стили для разных состояний товаров
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

.v-table {
  th {
    font-weight: 600 !important;
  }
}
</style>
