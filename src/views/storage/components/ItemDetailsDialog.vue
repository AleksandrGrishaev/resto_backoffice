<!-- src/views/storage/components/ItemDetailsDialog.vue - ИСПРАВЛЕНО -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700px"
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
                  <div class="text-body-2">{{ item.unit }} on hand</div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- ✅ НОВАЯ КАРТОЧКА: Транзит -->
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
                  <div class="text-body-2">Total value</div>
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

        <!-- ✅ ИСПРАВЛЕНО: Убран дубликат tabs -->
        <v-tabs v-model="selectedTab" class="px-6">
          <v-tab value="batches">Batches (FIFO)</v-tab>
          <v-tab value="transit" :disabled="transitBatches.length === 0" class="position-relative">
            In Transit
            <v-badge
              v-if="transitBatches.length > 0"
              :content="transitBatches.length"
              color="orange"
              offset-x="5"
              offset-y="5"
            />
          </v-tab>
          <v-tab value="analytics">Analytics</v-tab>
        </v-tabs>

        <v-tabs-window v-model="selectedTab">
          <!-- Batches Tab -->
          <v-tabs-window-item value="batches" class="pa-6">
            <div class="mb-4">
              <h4 class="mb-2">Current Batches (FIFO Order)</h4>
              <p class="text-body-2 text-medium-emphasis">
                Oldest batches are consumed first. Total: {{ item.batches.length }} batch{{
                  item.batches.length !== 1 ? 'es' : ''
                }}
              </p>
            </div>

            <div v-if="item.batches.length === 0" class="text-center py-8 text-medium-emphasis">
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
                    <span>{{ formatSource(batch.sourceType) }}</span>
                    <span class="font-weight-medium">
                      Value: {{ formatCurrency(batch.totalValue) }}
                    </span>
                  </div>

                  <!-- Expiry warning -->
                  <v-alert
                    v-if="batch.expiryDate && isExpiringSoon(batch.expiryDate)"
                    type="warning"
                    variant="tonal"
                    density="compact"
                    class="mt-2"
                  >
                    <v-icon icon="mdi-clock-alert-outline" class="mr-1" />
                    Expires {{ formatDate(batch.expiryDate) }}
                  </v-alert>
                </v-card-text>
              </v-card>
            </div>
          </v-tabs-window-item>

          <!-- ✅ НОВАЯ ВКЛАДКА: Transit -->
          <v-tabs-window-item value="transit" class="pa-6">
            <div class="mb-4">
              <h4 class="mb-2 d-flex align-center">
                <v-icon icon="mdi-truck-delivery" color="orange" class="mr-2" />
                Incoming Deliveries ({{ transitBatches.length }})
              </h4>
              <p class="text-body-2 text-medium-emphasis">
                Orders that have been sent to suppliers but not yet received.
              </p>
            </div>

            <div v-if="transitBatches.length === 0" class="text-center py-8 text-medium-emphasis">
              <v-icon icon="mdi-truck-off" size="48" class="mb-2" />
              <div>No pending deliveries</div>
            </div>

            <div v-else class="transit-batches-list">
              <v-card
                v-for="(batch, index) in transitBatches"
                :key="batch.id"
                variant="outlined"
                class="mb-3"
                :class="getTransitBatchCardClass(batch)"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="d-flex align-center">
                      <v-chip size="small" color="orange" variant="flat" class="mr-2">
                        #{{ index + 1 }}
                      </v-chip>
                      <div>
                        <div class="font-weight-medium">{{ batch.batchNumber }}</div>
                        <div class="text-caption text-medium-emphasis">
                          Order: {{ batch.purchaseOrderId }}
                        </div>
                      </div>
                    </div>

                    <div class="text-right">
                      <div class="font-weight-medium">
                        {{ formatQuantity(batch.currentQuantity, batch.unit) }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ formatCurrency(batch.costPerUnit) }}/{{ batch.unit }}
                      </div>
                    </div>
                  </div>

                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="d-flex align-center">
                      <v-icon icon="mdi-store" size="16" class="mr-1" />
                      <span class="text-caption">{{ batch.supplierName }}</span>
                    </div>

                    <div class="d-flex align-center">
                      <v-icon
                        :icon="getDeliveryStatusIcon(batch)"
                        :color="getDeliveryStatusColor(batch)"
                        size="16"
                        class="mr-1"
                      />
                      <span
                        class="text-caption font-weight-medium"
                        :class="getDeliveryStatusTextClass(batch)"
                      >
                        {{ getDeliveryStatusText(batch) }}
                      </span>
                    </div>
                  </div>

                  <!-- Planned vs Actual Date -->
                  <div
                    v-if="batch.plannedDeliveryDate"
                    class="d-flex justify-space-between text-caption mb-2"
                  >
                    <span>Expected: {{ formatDate(batch.plannedDeliveryDate) }}</span>
                    <span class="font-weight-medium">
                      Value: {{ formatCurrency(batch.totalValue) }}
                    </span>
                  </div>

                  <!-- Status Alert -->
                  <v-alert
                    v-if="isTransitBatchOverdue(batch)"
                    type="error"
                    variant="tonal"
                    density="compact"
                    class="mt-2"
                  >
                    <v-icon icon="mdi-clock-alert" class="mr-1" />
                    Delivery is {{ getDaysOverdue(batch) }} day(s) overdue
                  </v-alert>

                  <v-alert
                    v-else-if="isTransitBatchDueToday(batch)"
                    type="warning"
                    variant="tonal"
                    density="compact"
                    class="mt-2"
                  >
                    <v-icon icon="mdi-clock" class="mr-1" />
                    Delivery expected today
                  </v-alert>

                  <!-- Notes -->
                  <div v-if="batch.notes" class="mt-2 text-caption text-medium-emphasis">
                    <v-icon icon="mdi-note-text" size="14" class="mr-1" />
                    {{ batch.notes }}
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-tabs-window-item>

          <!-- Analytics Tab -->
          <v-tabs-window-item value="analytics" class="pa-6">
            <div class="analytics-section">
              <h4 class="mb-3">Price Trends</h4>

              <div class="d-flex align-center mb-4">
                <v-icon
                  :icon="getCostTrendIcon(item.costTrend)"
                  :color="getCostTrendColor(item.costTrend)"
                  class="mr-2"
                />
                <span :class="getCostTrendColor(item.costTrend)" class="font-weight-medium">
                  Price trend: {{ formatCostTrend(item.costTrend) }}
                </span>
              </div>

              <v-row>
                <v-col cols="12" md="6">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-2">Latest Cost</div>
                      <div class="text-h5 font-weight-bold">
                        {{ formatCurrency(item.latestCost) }}/{{ item.unit }}
                      </div>
                      <div class="text-caption text-medium-emphasis">From newest batch</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-2">Average Cost</div>
                      <div class="text-h5 font-weight-bold">
                        {{ formatCurrency(item.averageCost) }}/{{ item.unit }}
                      </div>
                      <div class="text-caption text-medium-emphasis">Weighted average</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <h4 class="mb-3 mt-6">Usage Information</h4>

              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 mb-1">Last Consumption</div>
                  <div class="text-body-1">
                    {{ item.lastConsumptionDate ? formatDate(item.lastConsumptionDate) : 'Never' }}
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 mb-1">Stock Age</div>
                  <div class="text-body-1">{{ calculateStockAge(item.oldestBatchDate) }} days</div>
                </v-col>
              </v-row>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
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
import { ref, computed } from 'vue' // ✅ ДОБАВЛЕНО: computed
import type { StorageBalance, StorageItemType, StorageDepartment } from '@/stores/storage'
import { useBatches } from '@/stores/storage' // ✅ ДОБАВЛЕНО
import { TimeUtils } from '@/utils' // ✅ ДОБАВЛЕНО

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

// State
const selectedTab = ref('batches')
const batches = useBatches() // ✅ ДОБАВЛЕНО

// ✅ ДОБАВЛЕНО: Computed для транзитных batch-ей
const transitBatches = computed(() => {
  if (!props.item) return []

  return batches.transitBatches.value.filter(
    batch => batch.itemId === props.item.itemId && batch.department === props.item.department
  )
})

const totalTransitQuantity = computed(() => {
  return transitBatches.value.reduce((sum, batch) => sum + batch.currentQuantity, 0)
})

// ✅ ДОБАВЛЕНО: Методы для транзитных batch-ей
function getTransitBatchCardClass(batch: any): string {
  if (isTransitBatchOverdue(batch)) return 'border-error'
  if (isTransitBatchDueToday(batch)) return 'border-warning'
  return ''
}

function getDeliveryStatusIcon(batch: any): string {
  if (isTransitBatchOverdue(batch)) return 'mdi-alert-circle'
  if (isTransitBatchDueToday(batch)) return 'mdi-clock-alert'
  return 'mdi-truck-delivery'
}

function getDeliveryStatusColor(batch: any): string {
  if (isTransitBatchOverdue(batch)) return 'error'
  if (isTransitBatchDueToday(batch)) return 'warning'
  return 'success'
}

function getDeliveryStatusTextClass(batch: any): string {
  if (isTransitBatchOverdue(batch)) return 'text-error'
  if (isTransitBatchDueToday(batch)) return 'text-warning'
  return 'text-success'
}

function getDeliveryStatusText(batch: any): string {
  if (isTransitBatchOverdue(batch)) return 'Overdue'
  if (isTransitBatchDueToday(batch)) return 'Due Today'
  return 'On Schedule'
}

function isTransitBatchOverdue(batch: any): boolean {
  return batch.plannedDeliveryDate && TimeUtils.isOverdue(batch.plannedDeliveryDate)
}

function isTransitBatchDueToday(batch: any): boolean {
  return batch.plannedDeliveryDate && TimeUtils.isToday(batch.plannedDeliveryDate)
}

function getDaysOverdue(batch: any): number {
  if (!batch.plannedDeliveryDate) return 0
  return TimeUtils.getDaysAgo(batch.plannedDeliveryDate)
}

function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString()} ${unit}`
}

// Остальные существующие методы
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
  const mockNames: Record<string, string> = {
    'beef-steak': 'Beef Steak',
    potato: 'Potato',
    garlic: 'Garlic',
    vodka: 'Vodka',
    beer: 'Beer',
    'beef-rendang-prep': 'Beef Rendang (Prepared)'
  }
  return mockNames[itemId] || itemId
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
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatSource(sourceType: string): string {
  const sources: Record<string, string> = {
    purchase: 'Purchase',
    production: 'Production',
    correction: 'Correction',
    opening_balance: 'Opening Balance'
  }
  return sources[sourceType] || sourceType
}

function getUsageColor(ratio: number): string {
  if (ratio > 0.7) return 'success'
  if (ratio > 0.3) return 'warning'
  return 'error'
}

function isExpiringSoon(expiryDate: string): boolean {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 3 && diffDays >= 0
}

function getCostTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'mdi-trending-up'
    case 'down':
      return 'mdi-trending-down'
    default:
      return 'mdi-minus'
  }
}

function getCostTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'text-error'
    case 'down':
      return 'text-success'
    default:
      return 'text-medium-emphasis'
  }
}

function formatCostTrend(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'Rising'
    case 'down':
      return 'Falling'
    default:
      return 'Stable'
  }
}

function calculateStockAge(oldestDate: string): number {
  const oldest = new Date(oldestDate)
  const now = new Date()
  return Math.floor((now.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24))
}
</script>

<style lang="scss" scoped>
.item-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 12px;
}

.batches-list,
.transit-batches-list {
  max-height: 400px;
  overflow-y: auto;
}

.analytics-section {
  .v-card {
    height: 100%;
  }
}

/* ✅ ДОБАВЛЕНО: Стили для transit batch cards */
.border-error {
  border-color: rgb(var(--v-theme-error)) !important;
}

.border-warning {
  border-color: rgb(var(--v-theme-warning)) !important;
}
</style>
