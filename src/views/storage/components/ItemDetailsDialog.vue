<!-- src/views/storage/components/ItemDetailsDialog.vue - ДОБАВЛЕНА СЕКЦИЯ ТРАНЗИТНЫХ BATCH-ЕЙ -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="item">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <div class="item-icon mr-3">
            {{ getItemIcon(item.itemType) }}
          </div>
          <div>
            <h3>{{ getItemName(item.itemId) }}</h3>
            <div class="text-caption text-medium-emphasis">
              {{ formatItemType(item.itemType) }} • {{ formatDepartment(item.department) }}
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <!-- Summary Cards -->
        <div class="pa-6 pb-0">
          <v-row>
            <v-col cols="12" md="3">
              <v-card variant="tonal" color="primary">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ item.totalQuantity }}</div>
                  <div class="text-body-2">{{ item.unit }} in stock</div>
                </v-card-text>
              </v-card>
            </v-col>
            <!-- ✅ НОВАЯ КАРТОЧКА: В пути -->
            <v-col cols="12" md="3">
              <v-card variant="tonal" color="orange">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ totalTransitQuantity }}</div>
                  <div class="text-body-2">{{ item.unit }} in transit</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="tonal" color="success">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ formatCurrency(item.totalValue) }}</div>
                  <div class="text-body-2">Stock value</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="tonal" color="info">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ formatCurrency(item.averageCost) }}</div>
                  <div class="text-body-2">Avg cost/{{ item.unit }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Content Sections -->
        <div class="px-6 pb-6">
          <!-- Active Batches Section -->
          <div class="mb-4">
            <h4 class="mb-3 d-flex align-center">
              <v-icon color="primary" class="mr-2">mdi-package-variant</v-icon>
              Active Batches (FIFO Order)
              <v-chip size="small" class="ml-2">{{ item.batches.length }}</v-chip>
            </h4>

            <div v-if="item.batches.length === 0" class="text-center py-6 text-medium-emphasis">
              <v-icon icon="mdi-package-variant-closed" size="48" class="mb-2" />
              <div>No active batches</div>
            </div>

            <div v-else class="batches-list">
              <v-card
                v-for="(batch, index) in item.batches"
                :key="batch.id"
                variant="outlined"
                class="mb-3"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="d-flex align-center">
                      <v-chip
                        size="small"
                        :color="index === 0 ? 'primary' : 'default'"
                        variant="flat"
                        class="mr-2"
                      >
                        #{{ index + 1 }}
                      </v-chip>
                      <div>
                        <div class="font-weight-medium">{{ batch.batchNumber }}</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ formatDate(batch.receiptDate) }}
                        </div>
                      </div>
                    </div>

                    <div class="text-right">
                      <div class="font-weight-medium">
                        {{ batch.currentQuantity }}/{{ batch.initialQuantity }} {{ batch.unit }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ formatCurrency(batch.costPerUnit) }}/{{ batch.unit }}
                      </div>
                    </div>
                  </div>

                  <!-- Progress bar for consumption -->
                  <v-progress-linear
                    :model-value="(batch.currentQuantity / batch.initialQuantity) * 100"
                    height="6"
                    rounded
                    :color="getUsageColor(batch.currentQuantity / batch.initialQuantity)"
                    class="mb-2"
                  />

                  <div class="d-flex justify-space-between text-caption">
                    <span class="text-medium-emphasis">
                      Value: {{ formatCurrency(batch.totalValue) }}
                    </span>
                    <span v-if="batch.expiryDate" class="text-medium-emphasis">
                      Expires: {{ formatDate(batch.expiryDate) }}
                    </span>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </div>

          <!-- ✅ НОВАЯ СЕКЦИЯ: Транзитные batch-и -->
          <v-expansion-panels v-if="transitBatchesForItem.length > 0" class="mb-4">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon color="orange" class="mr-2">mdi-truck-delivery</v-icon>
                  <span class="subtitle-1">
                    In Transit ({{ transitBatchesForItem.length }} shipment{{
                      transitBatchesForItem.length !== 1 ? 's' : ''
                    }})
                  </span>
                  <v-spacer />
                  <span class="text-h6 orange--text">
                    {{ totalTransitQuantity }} {{ itemUnit }}
                  </span>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <v-data-table
                  :headers="transitBatchHeaders"
                  :items="transitBatchesForItem"
                  hide-default-footer
                  disable-pagination
                  class="transit-batches-table"
                >
                  <template #[`item.plannedDeliveryDate`]="{ item }">
                    <div class="d-flex align-center">
                      <span :class="isOverdue(item.plannedDeliveryDate) ? 'error--text' : ''">
                        {{ formatDate(item.plannedDeliveryDate) }}
                      </span>
                      <v-icon
                        v-if="isOverdue(item.plannedDeliveryDate)"
                        color="error"
                        size="16"
                        class="ml-1"
                      >
                        mdi-alert-circle
                      </v-icon>
                    </div>
                  </template>

                  <template #[`item.status`]="{ item }">
                    <v-chip small :color="getTransitStatusColor(item)">
                      {{ getTransitStatusText(item) }}
                    </v-chip>
                  </template>

                  <template #[`item.supplierName`]="{ item }">
                    <div class="d-flex align-center">
                      <v-icon size="16" class="mr-1">mdi-store</v-icon>
                      {{ item.supplierName }}
                    </div>
                  </template>

                  <template #[`item.currentQuantity`]="{ item }">
                    {{ formatQuantity(item.currentQuantity) }} {{ item.unit }}
                  </template>

                  <template #[`item.totalValue`]="{ item }">
                    {{ formatCurrency(item.totalValue) }}
                  </template>
                </v-data-table>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="$emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorageStore } from '@/stores/storage'
import type {
  StorageBalance,
  StorageItemType,
  StorageDepartment,
  StorageBatch
} from '@/stores/storage'

// Props
interface Props {
  modelValue: boolean
  item: StorageBalance | null
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// Store
const storageStore = useStorageStore()

// Убираем неиспользуемую переменную selectedTab

// ===========================
// COMPUTED ДЛЯ ТРАНЗИТНЫХ BATCH-ЕЙ
// ===========================

const transitBatchesForItem = computed(() => {
  if (!props.item || !storageStore.transitBatches?.value) return []

  return storageStore.transitBatches.value.filter(
    (batch: StorageBatch) =>
      batch.itemId === props.item!.itemId && batch.department === props.item!.department
  )
})

const totalTransitQuantity = computed(() => {
  return transitBatchesForItem.value.reduce((sum, batch) => sum + batch.currentQuantity, 0)
})

const itemUnit = computed(() => {
  return props.item?.unit || 'gram'
})

const transitBatchHeaders = [
  { text: 'Batch Number', value: 'batchNumber' },
  { text: 'Quantity', value: 'currentQuantity' },
  { text: 'Value', value: 'totalValue' },
  { text: 'Supplier', value: 'supplierName' },
  { text: 'Planned Date', value: 'plannedDeliveryDate' },
  { text: 'Status', value: 'status' }
]

// ===========================
// HELPER METHODS ДЛЯ ТРАНЗИТА
// ===========================

function isOverdue(plannedDate?: string): boolean {
  if (!plannedDate) return false
  return new Date(plannedDate) < new Date()
}

function getTransitStatusColor(batch: StorageBatch): string {
  if (isOverdue(batch.plannedDeliveryDate)) return 'error'
  if (isDeliveryToday(batch.plannedDeliveryDate)) return 'warning'
  return 'orange'
}

function getTransitStatusText(batch: StorageBatch): string {
  if (isOverdue(batch.plannedDeliveryDate)) return 'Overdue'
  if (isDeliveryToday(batch.plannedDeliveryDate)) return 'Today'
  return 'In Transit'
}

function isDeliveryToday(plannedDate?: string): boolean {
  if (!plannedDate) return false
  const deliveryDate = new Date(plannedDate)
  const today = new Date()
  return deliveryDate.toDateString() === today.toDateString()
}

// ===========================
// СУЩЕСТВУЮЩИЕ МЕТОДЫ
// ===========================

function getItemIcon(itemType: StorageItemType): string {
  return itemType === 'product' ? '🥩' : '🍲'
}

function formatItemType(itemType: StorageItemType): string {
  return itemType === 'product' ? 'Product' : 'Preparation'
}

function formatDepartment(department: StorageDepartment): string {
  return department === 'kitchen' ? 'Kitchen' : 'Bar'
}

function getItemName(itemId: string): string {
  // Здесь должна быть логика получения имени товара
  return itemId // Временно
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatQuantity(quantity: number): string {
  return quantity.toLocaleString()
}

function getUsageColor(usageRatio: number): string {
  if (usageRatio < 0.3) return 'error'
  if (usageRatio < 0.6) return 'warning'
  return 'success'
}
</script>

<style scoped>
.transit-card {
  border-left: 4px solid #ff9800 !important;
}

.warning-card {
  border-left-color: #f44336 !important;
}

.info-card {
  border-left-color: #2196f3 !important;
}

.success-card {
  border-left-color: #4caf50 !important;
}

.transit-batches-table >>> .v-data-table__wrapper {
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.transit-batches-table >>> tbody tr:hover {
  background-color: #fff3e0 !important;
}

.item-icon {
  font-size: 2rem;
}

.batches-list .v-card {
  transition: all 0.2s ease;
}

.batches-list .v-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
}
</style>
