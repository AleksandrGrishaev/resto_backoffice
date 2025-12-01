<!-- src/views/storage/components/ItemDetailsDialog.vue - Адаптация PreparationItemDetailsDialog -->
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
            <v-col cols="12" md="4">
              <v-card variant="tonal" :color="item.totalQuantity < 0 ? 'error' : 'primary'">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ item.totalQuantity }}</div>
                  <div class="text-body-2">{{ item.unit }} in stock</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="success">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ formatCurrency(item.totalValue) }}</div>
                  <div class="text-body-2">Total value</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" :color="getExpiryColor()">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ getExpiryStatus() }}</div>
                  <div class="text-body-2">Expiry status</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Tabs -->
        <v-tabs v-model="selectedTab" class="px-6">
          <v-tab value="batches">Batches (FIFO)</v-tab>
          <v-tab value="analytics">Analytics</v-tab>
          <v-tab v-if="totalTransitQuantity > 0" value="transit">In Transit</v-tab>
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
                :class="getBatchCardClass(batch)"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="d-flex align-center">
                      <v-chip
                        size="small"
                        :color="
                          batch.isNegative || batch.currentQuantity < 0
                            ? 'error'
                            : index === 0
                              ? 'primary'
                              : 'default'
                        "
                        variant="flat"
                        class="mr-2"
                      >
                        {{
                          batch.isNegative || batch.currentQuantity < 0 ? '⚠️ NEG' : `#${index + 1}`
                        }}
                      </v-chip>
                      <div>
                        <div class="font-weight-medium">{{ batch.batchNumber }}</div>
                        <div class="text-caption text-medium-emphasis">
                          {{
                            batch.isNegative || batch.currentQuantity < 0
                              ? 'Negative stock created'
                              : `Received ${formatDate(batch.receiptDate)}`
                          }}
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

                  <!-- Progress bar for consumption (or negative bar) -->
                  <v-progress-linear
                    :model-value="Math.abs((batch.currentQuantity / batch.initialQuantity) * 100)"
                    height="6"
                    rounded
                    :color="
                      batch.currentQuantity < 0
                        ? 'error'
                        : getUsageColor(batch.currentQuantity / batch.initialQuantity)
                    "
                    class="mb-2"
                  />

                  <div class="d-flex justify-space-between text-caption mb-2">
                    <span>{{ formatSource(batch.sourceType) }}</span>
                    <span class="font-weight-medium">
                      Value: {{ formatCurrency(Math.abs(batch.totalValue)) }}
                    </span>
                  </div>

                  <!-- Negative batch info -->
                  <div v-if="batch.isNegative || batch.currentQuantity < 0">
                    <v-alert type="error" variant="tonal" density="compact" class="mt-2">
                      <div class="d-flex align-center">
                        <v-icon icon="mdi-alert-circle" class="mr-2" />
                        <div>
                          <strong>Negative Stock</strong>
                          <div class="text-caption">
                            {{ batch.negativeReason || 'Item sold/consumed before stock arrived' }}
                          </div>
                          <div v-if="batch.reconciledAt" class="text-caption mt-1">
                            ✅ Reconciled on {{ formatDate(batch.reconciledAt) }}
                          </div>
                          <div v-else class="text-caption mt-1">
                            ⏳ Waiting for new stock to reconcile
                          </div>
                        </div>
                      </div>
                    </v-alert>
                  </div>

                  <!-- Expiry warning (for positive batches) -->
                  <div v-else-if="batch.expiryDate">
                    <v-alert
                      v-if="isExpired(batch.expiryDate)"
                      type="error"
                      variant="tonal"
                      density="compact"
                      class="mt-2"
                    >
                      <v-icon icon="mdi-alert-circle" class="mr-1" />
                      EXPIRED {{ formatDate(batch.expiryDate) }}
                    </v-alert>
                    <v-alert
                      v-else-if="isExpiringSoon(batch.expiryDate)"
                      type="warning"
                      variant="tonal"
                      density="compact"
                      class="mt-2"
                    >
                      <v-icon icon="mdi-clock-alert-outline" class="mr-1" />
                      Expires {{ formatDate(batch.expiryDate) }} ({{
                        getDaysUntilExpiry(batch.expiryDate)
                      }}
                      days left)
                    </v-alert>
                    <v-alert v-else type="success" variant="tonal" density="compact" class="mt-2">
                      <v-icon icon="mdi-check-circle" class="mr-1" />
                      Fresh until {{ formatDate(batch.expiryDate) }}
                    </v-alert>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-tabs-window-item>

          <!-- Analytics Tab -->
          <v-tabs-window-item value="analytics" class="pa-6">
            <div class="analytics-section">
              <h4 class="mb-3">Cost Analysis</h4>

              <div class="d-flex align-center mb-4">
                <v-icon
                  :icon="getCostTrendIcon(item.costTrend)"
                  :color="getCostTrendColor(item.costTrend)"
                  class="mr-2"
                />
                <span :class="getCostTrendColor(item.costTrend)" class="font-weight-medium">
                  Cost trend: {{ formatCostTrend(item.costTrend) }}
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

              <h4 class="mb-3 mt-6">Stock Information</h4>

              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 mb-1">Stock Age</div>
                  <div class="text-body-1">{{ calculateStockAge(item.oldestBatchDate) }} days</div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 mb-1">Total Batches</div>
                  <div class="text-body-1">{{ item.batches.length }}</div>
                </v-col>
              </v-row>
            </div>
          </v-tabs-window-item>

          <!-- Transit Tab -->
          <v-tabs-window-item v-if="totalTransitQuantity > 0" value="transit" class="pa-6">
            <div class="transit-section">
              <h4 class="mb-3">In Transit Shipments</h4>

              <div class="mb-4">
                <v-card variant="tonal" color="orange">
                  <v-card-text class="text-center">
                    <div class="text-h4 font-weight-bold">{{ totalTransitQuantity }}</div>
                    <div class="text-body-2">{{ item.unit }} arriving soon</div>
                  </v-card-text>
                </v-card>
              </div>

              <div v-for="batch in transitBatchesForItem" :key="batch.id" class="mb-3">
                <v-card variant="outlined" class="transit-card">
                  <v-card-text>
                    <div class="d-flex justify-space-between mb-2">
                      <div>
                        <div class="font-weight-medium">{{ batch.batchNumber }}</div>
                        <div class="text-caption">
                          {{ batch.supplierName || 'Unknown supplier' }}
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-weight-medium">
                          {{ batch.currentQuantity }} {{ batch.unit }}
                        </div>
                        <div class="text-caption">
                          {{ formatCurrency(batch.totalValue) }}
                        </div>
                      </div>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      <v-icon icon="mdi-truck-delivery" size="16" class="mr-1" />
                      Expected: {{ formatDate(batch.plannedDeliveryDate || batch.receiptDate) }}
                    </div>
                  </v-card-text>
                </v-card>
              </div>
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
import { ref, computed } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
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

// State
const selectedTab = ref('batches')

// ===========================
// COMPUTED
// ===========================

const transitBatchesForItem = computed(() => {
  if (!props.item || !storageStore.transitBatches) return []

  return storageStore.transitBatches.filter(
    (batch: StorageBatch) =>
      batch.itemId === props.item!.itemId && batch.department === props.item!.department
  )
})

const totalTransitQuantity = computed(() => {
  return transitBatchesForItem.value.reduce(
    (sum: number, batch: StorageBatch) => sum + batch.currentQuantity,
    0
  )
})

// ===========================
// METHODS
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
  if (!props.item) return itemId

  // Get name based on item type
  if (props.item.itemType === 'product') {
    const productsStore = useProductsStore()
    const product = productsStore.products.find((p: any) => p.id === itemId)
    return product?.name || itemId
  } else {
    const recipesStore = useRecipesStore()
    const preparation = recipesStore.preparations.find((p: any) => p.id === itemId)
    return preparation?.name || itemId
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatSource(sourceType?: string): string {
  const sources: Record<string, string> = {
    purchase: 'Purchase',
    correction: 'Correction',
    opening_balance: 'Opening Balance',
    inventory_adjustment: 'Inventory Adjustment'
  }
  return sources[sourceType || ''] || sourceType || 'Unknown'
}

function getUsageColor(ratio: number): string {
  if (ratio > 0.7) return 'success'
  if (ratio > 0.3) return 'warning'
  return 'error'
}

function isExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date()
}

function isExpiringSoon(expiryDate: string): boolean {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 7 && diffDays >= 0
}

function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.ceil(diffDays))
}

function getBatchCardClass(batch: StorageBatch): string {
  // ✅ Negative batches get special styling
  if (batch.isNegative || batch.currentQuantity < 0) return 'negative-batch'

  if (!batch.expiryDate) return ''
  if (isExpired(batch.expiryDate)) return 'expired-batch'
  if (isExpiringSoon(batch.expiryDate)) return 'expiring-batch'
  return 'fresh-batch'
}

function getExpiryStatus(): string {
  if (!props.item) return 'Unknown'
  if (props.item.hasExpired) return 'EXPIRED'
  if (props.item.hasNearExpiry) return 'EXPIRING'
  return 'FRESH'
}

function getExpiryColor(): string {
  if (!props.item) return 'info'
  if (props.item.hasExpired) return 'error'
  if (props.item.hasNearExpiry) return 'warning'
  return 'success'
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

.batches-list {
  max-height: 400px;
  overflow-y: auto;
}

.analytics-section,
.transit-section {
  .v-card {
    height: 100%;
  }
}

// Batch status styles
.fresh-batch {
  border-left: 4px solid rgb(var(--v-theme-success));
}

.expiring-batch {
  border-left: 4px solid rgb(var(--v-theme-warning));
  background-color: rgba(var(--v-theme-warning), 0.05);
}

.expired-batch {
  border-left: 4px solid rgb(var(--v-theme-error));
  background-color: rgba(var(--v-theme-error), 0.05);
}

.negative-batch {
  border-left: 4px solid rgb(var(--v-theme-error));
  background-color: rgba(var(--v-theme-error), 0.1);
  border: 2px dashed rgb(var(--v-theme-error));
}

.transit-card {
  border-left: 4px solid rgb(var(--v-theme-orange));
  background-color: rgba(255, 152, 0, 0.05);
}
</style>
