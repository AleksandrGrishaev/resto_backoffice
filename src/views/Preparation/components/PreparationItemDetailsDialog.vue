<!-- src/views/preparation/components/PreparationItemDetailsDialog.vue - Адаптация ItemDetailsDialog -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="item">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <div class="item-icon mr-3">🍲</div>
          <div>
            <h3>{{ item.preparationName }}</h3>
            <div class="text-caption text-medium-emphasis">
              Preparation • {{ formatDepartment(item.department) }}
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
              <v-card variant="tonal" color="primary">
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
              <v-card variant="tonal" :color="getShelfLifeColor()">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">{{ getShelfLifeStatus() }}</div>
                  <div class="text-body-2">Shelf life status</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Tabs -->
        <v-tabs v-model="selectedTab" class="px-6">
          <v-tab value="batches">Batches (FIFO)</v-tab>
          <v-tab value="analytics">Analytics</v-tab>
          <v-tab value="shelf-life">Shelf Life</v-tab>
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
              <v-icon icon="mdi-chef-hat" size="48" class="mb-2" />
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
                              : `Produced ${formatDate(batch.productionDate)}`
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

                  <!-- Progress bar for consumption -->
                  <v-progress-linear
                    :model-value="(batch.currentQuantity / batch.initialQuantity) * 100"
                    height="6"
                    rounded
                    :color="getUsageColor(batch.currentQuantity / batch.initialQuantity)"
                    class="mb-2"
                  />

                  <div class="d-flex justify-space-between text-caption mb-2">
                    <span>{{ formatSource(batch.sourceType) }}</span>
                    <span class="font-weight-medium">
                      Value: {{ formatCurrency(batch.totalValue) }}
                    </span>
                  </div>

                  <!-- Expiry warning -->
                  <div v-if="batch.expiryDate">
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
                        getHoursUntilExpiry(batch.expiryDate)
                      }}h left)
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
                      <div class="text-subtitle-2 mb-2">Latest Production Cost</div>
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
                  <div class="text-body-1">{{ calculateStockAge(item.oldestBatchDate) }} hours</div>
                </v-col>
              </v-row>
            </div>
          </v-tabs-window-item>

          <!-- Shelf Life Tab -->
          <v-tabs-window-item value="shelf-life" class="pa-6">
            <div class="shelf-life-section">
              <h4 class="mb-3">Shelf Life Analysis</h4>

              <v-row class="mb-4">
                <v-col cols="12" md="4">
                  <v-card variant="tonal" color="success">
                    <v-card-text class="text-center">
                      <div class="text-h5 font-weight-bold">{{ freshBatchesCount }}</div>
                      <div class="text-body-2">Fresh batches</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="4">
                  <v-card variant="tonal" color="warning">
                    <v-card-text class="text-center">
                      <div class="text-h5 font-weight-bold">{{ expiringBatchesCount }}</div>
                      <div class="text-body-2">Expiring soon</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="4">
                  <v-card variant="tonal" color="error">
                    <v-card-text class="text-center">
                      <div class="text-h5 font-weight-bold">{{ expiredBatchesCount }}</div>
                      <div class="text-body-2">Expired</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Recommendations -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title>
                  <v-icon icon="mdi-lightbulb" class="mr-2" />
                  Recommendations
                </v-card-title>
                <v-card-text>
                  <div v-if="expiredBatchesCount > 0" class="mb-2">
                    <v-alert type="error" variant="tonal" density="compact">
                      <strong>URGENT:</strong>
                      Remove {{ expiredBatchesCount }} expired batch{{
                        expiredBatchesCount !== 1 ? 'es' : ''
                      }}
                      immediately for food safety.
                    </v-alert>
                  </div>
                  <div v-if="expiringBatchesCount > 0" class="mb-2">
                    <v-alert type="warning" variant="tonal" density="compact">
                      <strong>Priority:</strong>
                      Use {{ expiringBatchesCount }} expiring batch{{
                        expiringBatchesCount !== 1 ? 'es' : ''
                      }}
                      within 24 hours.
                    </v-alert>
                  </div>
                  <div v-if="freshBatchesCount > 0" class="mb-2">
                    <v-alert type="success" variant="tonal" density="compact">
                      <strong>Good:</strong>
                      {{ freshBatchesCount }} fresh batch{{ freshBatchesCount !== 1 ? 'es' : '' }}
                      available for service.
                    </v-alert>
                  </div>
                  <div v-if="item.belowMinStock" class="mb-2">
                    <v-alert type="info" variant="tonal" density="compact">
                      <strong>Stock Alert:</strong>
                      Consider producing more of this preparation.
                    </v-alert>
                  </div>
                </v-card-text>
              </v-card>
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
import type { PreparationBalance, PreparationDepartment } from '@/stores/preparation'

// Props
interface Props {
  modelValue: boolean
  item: PreparationBalance | null
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// State
const selectedTab = ref('batches')

// Computed
const freshBatchesCount = computed(() => {
  if (!props.item?.batches) return 0
  return props.item.batches.filter(
    batch =>
      !batch.expiryDate || (!isExpired(batch.expiryDate) && !isExpiringSoon(batch.expiryDate))
  ).length
})

const expiringBatchesCount = computed(() => {
  if (!props.item?.batches) return 0
  return props.item.batches.filter(
    batch => batch.expiryDate && isExpiringSoon(batch.expiryDate) && !isExpired(batch.expiryDate)
  ).length
})

const expiredBatchesCount = computed(() => {
  if (!props.item?.batches) return 0
  return props.item.batches.filter(batch => batch.expiryDate && isExpired(batch.expiryDate)).length
})

// Methods
function formatDepartment(department: PreparationDepartment): string {
  return department === 'kitchen' ? 'Kitchen' : 'Bar'
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
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatSource(sourceType: string): string {
  const sources: Record<string, string> = {
    production: 'Production',
    correction: 'Correction',
    opening_balance: 'Opening Balance',
    inventory_adjustment: 'Inventory Adjustment'
  }
  return sources[sourceType] || sourceType
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
  const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diffHours <= 24 && diffHours >= 0
}

function getHoursUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
  return Math.max(0, Math.round(diffHours))
}

function getBatchCardClass(batch: any): string {
  // ✅ Negative batches get special styling
  if (batch.isNegative || batch.currentQuantity < 0) return 'negative-batch'

  if (!batch.expiryDate) return ''
  if (isExpired(batch.expiryDate)) return 'expired-batch'
  if (isExpiringSoon(batch.expiryDate)) return 'expiring-batch'
  return 'fresh-batch'
}

function getShelfLifeStatus(): string {
  if (!props.item) return 'Unknown'
  if (props.item.hasExpired) return 'EXPIRED'
  if (props.item.hasNearExpiry) return 'EXPIRING'
  return 'FRESH'
}

function getShelfLifeColor(): string {
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
  return Math.floor((now.getTime() - oldest.getTime()) / (1000 * 60 * 60))
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
.shelf-life-section {
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
</style>
