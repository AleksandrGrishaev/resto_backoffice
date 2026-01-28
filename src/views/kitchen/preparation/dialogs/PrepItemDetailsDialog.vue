<!-- src/views/kitchen/preparation/dialogs/PrepItemDetailsDialog.vue -->
<!-- Touch-optimized preparation item details dialog for Kitchen Monitor -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900px"
    fullscreen
    transition="dialog-bottom-transition"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="item" class="d-flex flex-column">
      <!-- Header -->
      <v-toolbar color="primary" dark>
        <v-btn icon @click="$emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="d-flex align-center">
          <div class="item-icon-header mr-3">🍲</div>
          <div>
            <div class="text-h6">{{ item.preparationName }}</div>
            <div class="text-caption">Preparation • {{ formatDepartment(item.department) }}</div>
          </div>
        </v-toolbar-title>
      </v-toolbar>

      <!-- Summary Cards -->
      <div class="pa-4 bg-surface">
        <v-row dense>
          <v-col cols="4">
            <v-card variant="tonal" color="primary">
              <v-card-text class="text-center pa-4">
                <template v-if="portionInfo.isPortionType">
                  <div class="text-h4 font-weight-bold">{{ totalPortions }}</div>
                  <div class="text-caption">portions</div>
                  <v-chip size="x-small" color="secondary" variant="tonal" class="mt-1">
                    {{ portionInfo.portionSize }}g/portion
                  </v-chip>
                </template>
                <template v-else>
                  <div class="text-h4 font-weight-bold">
                    {{ formatQuantity(item.totalQuantity) }}
                  </div>
                  <div class="text-caption">{{ item.unit }}</div>
                </template>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="4">
            <v-card variant="tonal" color="success">
              <v-card-text class="text-center pa-4">
                <div class="text-h5 font-weight-bold">{{ formatCurrency(item.totalValue) }}</div>
                <div class="text-caption">Total value</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="4">
            <v-card variant="tonal" :color="getShelfLifeColor()">
              <v-card-text class="text-center pa-4">
                <div class="text-h5 font-weight-bold">{{ getShelfLifeStatus() }}</div>
                <div class="text-caption">Status</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Tabs -->
      <v-tabs v-model="selectedTab" bg-color="surface">
        <v-tab value="batches">
          <v-icon start>mdi-package-variant</v-icon>
          Batches
          <v-chip size="small" class="ml-2">{{ activeBatchesOnly.length }}</v-chip>
        </v-tab>
        <v-tab value="writeoffs">
          <v-icon start>mdi-delete-outline</v-icon>
          Write-offs
          <v-chip size="small" class="ml-2">{{ writeOffOperations.length }}</v-chip>
        </v-tab>
        <v-tab value="shelf-life">
          <v-icon start>mdi-clock-outline</v-icon>
          Shelf Life
        </v-tab>
      </v-tabs>

      <!-- Tab Content -->
      <v-card-text class="flex-grow-1 overflow-y-auto pa-0">
        <v-tabs-window v-model="selectedTab">
          <!-- Batches Tab -->
          <v-tabs-window-item value="batches" class="pa-4">
            <div
              v-if="activeBatchesOnly.length === 0"
              class="text-center py-12 text-medium-emphasis"
            >
              <v-icon icon="mdi-chef-hat" size="64" class="mb-4 opacity-50" />
              <div class="text-h6">No active batches</div>
              <div class="text-body-2">This preparation is out of stock</div>
            </div>

            <div v-else class="batches-list">
              <v-card
                v-for="(batch, index) in activeBatchesOnly"
                :key="batch.id"
                variant="outlined"
                class="mb-3"
                :class="getBatchCardClass(batch)"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-3">
                    <div class="d-flex align-center">
                      <v-chip
                        size="large"
                        :color="
                          batch.isNegative || batch.currentQuantity < 0
                            ? 'error'
                            : index === 0
                              ? 'primary'
                              : 'default'
                        "
                        variant="flat"
                        class="mr-3"
                      >
                        {{
                          batch.isNegative || batch.currentQuantity < 0 ? '⚠️ NEG' : `#${index + 1}`
                        }}
                      </v-chip>
                      <div>
                        <div class="text-subtitle-1 font-weight-medium">
                          {{ batch.batchNumber }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{
                            batch.isNegative || batch.currentQuantity < 0
                              ? 'Negative stock'
                              : `Produced ${formatDate(batch.productionDate)}`
                          }}
                        </div>
                      </div>
                    </div>

                    <div class="text-right">
                      <div class="text-h6 font-weight-medium">
                        {{
                          formatBatchQuantity(
                            batch.currentQuantity,
                            batch.initialQuantity,
                            batch.unit
                          )
                        }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ formatCurrency(batch.costPerUnit) }}/{{ batch.unit }}
                      </div>
                    </div>
                  </div>

                  <!-- Progress bar for consumption -->
                  <v-progress-linear
                    v-if="!batch.isNegative && batch.currentQuantity >= 0"
                    :model-value="(batch.currentQuantity / batch.initialQuantity) * 100"
                    height="8"
                    rounded
                    :color="getUsageColor(batch.currentQuantity / batch.initialQuantity)"
                    class="mb-3"
                  />

                  <div class="d-flex justify-space-between text-body-2 mb-2">
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
                      }}h)
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

          <!-- Write-offs Tab -->
          <v-tabs-window-item value="writeoffs" class="pa-4">
            <div
              v-if="writeOffOperations.length === 0"
              class="text-center py-12 text-medium-emphasis"
            >
              <v-icon icon="mdi-check-circle-outline" size="64" class="mb-4 opacity-50" />
              <div class="text-h6">No write-offs</div>
              <div class="text-body-2">This preparation has no write-off transactions</div>
            </div>

            <div v-else class="writeoffs-list">
              <v-card
                v-for="operation in writeOffOperations"
                :key="operation.id"
                variant="outlined"
                class="mb-3"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-3">
                    <div class="d-flex align-center">
                      <v-icon
                        :color="getWriteOffReasonColor(operation.writeOffDetails?.reason)"
                        size="32"
                        class="mr-3"
                      >
                        {{ getWriteOffReasonIcon(operation.writeOffDetails?.reason) }}
                      </v-icon>
                      <div>
                        <div class="text-subtitle-1 font-weight-medium">
                          {{ operation.documentNumber }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ formatDate(operation.operationDate) }}
                        </div>
                      </div>
                    </div>

                    <div class="text-right">
                      <v-chip
                        size="small"
                        :color="getWriteOffReasonColor(operation.writeOffDetails?.reason)"
                        variant="tonal"
                      >
                        {{ formatWriteOffReason(operation.writeOffDetails?.reason) }}
                      </v-chip>
                    </div>
                  </div>

                  <!-- Write-off items -->
                  <div
                    v-for="operationItem in getOperationItems(operation)"
                    :key="operationItem.id"
                    class="mb-2"
                  >
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <div class="text-body-2 font-weight-medium">
                          {{ formatQuantity(operationItem.quantity) }} {{ operationItem.unit }}
                        </div>
                        <div v-if="operationItem.notes" class="text-caption text-medium-emphasis">
                          {{ operationItem.notes }}
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-body-2 font-weight-medium text-error">
                          -{{ formatCurrency(operationItem.totalCost || 0) }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Batch allocations -->
                  <v-expand-transition>
                    <div v-if="showBatchDetails[operation.id]" class="mt-3 pt-3 border-t">
                      <div class="text-caption text-medium-emphasis mb-2 font-weight-medium">
                        Batch Allocations:
                      </div>
                      <div v-for="item in getOperationItems(operation)" :key="item.id" class="mb-2">
                        <div
                          v-for="allocation in item.batchAllocations || []"
                          :key="allocation.batchId"
                          class="d-flex justify-space-between text-caption pa-2 bg-surface-variant rounded"
                        >
                          <span>{{ allocation.batchNumber }}</span>
                          <span>{{ formatQuantity(allocation.quantity) }} {{ item.unit }}</span>
                          <span>
                            {{ formatCurrency(allocation.costPerUnit * allocation.quantity) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </v-expand-transition>

                  <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    block
                    class="mt-2"
                    @click="toggleBatchDetails(operation.id)"
                  >
                    {{
                      showBatchDetails[operation.id] ? 'Hide batch details' : 'Show batch details'
                    }}
                    <v-icon end>
                      {{ showBatchDetails[operation.id] ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                    </v-icon>
                  </v-btn>

                  <div v-if="operation.notes" class="mt-3 pt-3 border-t">
                    <div class="text-caption text-medium-emphasis">Notes:</div>
                    <div class="text-body-2">{{ operation.notes }}</div>
                  </div>

                  <div class="d-flex justify-space-between align-center mt-3 pt-3 border-t">
                    <div class="text-body-2 text-medium-emphasis">
                      By {{ operation.responsiblePerson }}
                    </div>
                    <v-chip
                      v-if="operation.writeOffDetails?.affectsKPI"
                      size="x-small"
                      color="warning"
                      variant="tonal"
                    >
                      Affects KPI
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-tabs-window-item>

          <!-- Shelf Life Tab -->
          <v-tabs-window-item value="shelf-life" class="pa-4">
            <div class="shelf-life-section">
              <v-row dense class="mb-4">
                <v-col cols="4">
                  <v-card variant="tonal" color="success">
                    <v-card-text class="text-center pa-4">
                      <div class="text-h4 font-weight-bold">{{ freshBatchesCount }}</div>
                      <div class="text-caption">Fresh</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="4">
                  <v-card variant="tonal" color="warning">
                    <v-card-text class="text-center pa-4">
                      <div class="text-h4 font-weight-bold">{{ expiringBatchesCount }}</div>
                      <div class="text-caption">Expiring</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="4">
                  <v-card variant="tonal" color="error">
                    <v-card-text class="text-center pa-4">
                      <div class="text-h4 font-weight-bold">{{ expiredBatchesCount }}</div>
                      <div class="text-caption">Expired</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Recommendations -->
              <v-card variant="outlined">
                <v-card-title>
                  <v-icon icon="mdi-lightbulb-outline" class="mr-2" />
                  Recommendations
                </v-card-title>
                <v-card-text>
                  <div v-if="expiredBatchesCount > 0" class="mb-3">
                    <v-alert type="error" variant="tonal" density="comfortable">
                      <strong>URGENT:</strong>
                      Remove {{ expiredBatchesCount }} expired batch{{
                        expiredBatchesCount !== 1 ? 'es' : ''
                      }}
                      immediately for food safety.
                    </v-alert>
                  </div>
                  <div v-if="expiringBatchesCount > 0" class="mb-3">
                    <v-alert type="warning" variant="tonal" density="comfortable">
                      <strong>Priority:</strong>
                      Use {{ expiringBatchesCount }} expiring batch{{
                        expiringBatchesCount !== 1 ? 'es' : ''
                      }}
                      within 24 hours.
                    </v-alert>
                  </div>
                  <div v-if="freshBatchesCount > 0" class="mb-3">
                    <v-alert type="success" variant="tonal" density="comfortable">
                      <strong>Good:</strong>
                      {{ freshBatchesCount }} fresh batch{{ freshBatchesCount !== 1 ? 'es' : '' }}
                      available.
                    </v-alert>
                  </div>
                  <div v-if="item.belowMinStock" class="mb-3">
                    <v-alert type="info" variant="tonal" density="comfortable">
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

      <!-- Footer -->
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          @click="$emit('update:modelValue', false)"
        >
          <v-icon start>mdi-check</v-icon>
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type {
  PreparationBalance,
  PreparationBatch,
  PreparationOperation,
  PreparationOperationItem,
  PreparationDepartment,
  PreparationWriteOffReason
} from '@/stores/preparation'
import { usePreparationStore } from '@/stores/preparation'
import { useRecipesStore } from '@/stores/recipes'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PrepItemDetailsDialog'

// =============================================
// PROPS
// =============================================

interface Props {
  modelValue: boolean
  item: PreparationBalance | null
}

const props = defineProps<Props>()

// =============================================
// EMITS
// =============================================

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// =============================================
// STORES
// =============================================

const preparationStore = usePreparationStore()
const recipesStore = useRecipesStore()

// =============================================
// STATE
// =============================================

const selectedTab = ref('batches')
const writeOffOperations = ref<PreparationOperation[]>([])
const showBatchDetails = ref<Record<string, boolean>>({})

// =============================================
// COMPUTED
// =============================================

/**
 * Portion type info
 */
const portionInfo = computed(() => {
  if (!props.item?.preparationId) return { isPortionType: false, portionSize: null }
  const preparation = recipesStore.preparations.find(p => p.id === props.item!.preparationId)
  if (!preparation) return { isPortionType: false, portionSize: null }

  return {
    isPortionType: preparation.portionType === 'portion' && !!preparation.portionSize,
    portionSize: preparation.portionSize || null
  }
})

const totalPortions = computed(() => {
  if (!portionInfo.value.isPortionType || !portionInfo.value.portionSize || !props.item) return 0
  return Math.floor(props.item.totalQuantity / portionInfo.value.portionSize)
})

/**
 * Filter out reconciled negative batches
 */
const activeBatchesOnly = computed(() => {
  if (!props.item?.batches) return []

  return props.item.batches.filter((batch: PreparationBatch) => {
    // Show all positive batches
    if (!batch.isNegative && batch.currentQuantity >= 0) return true

    // For negative batches, only show unreconciled ones
    return !batch.reconciledAt
  })
})

/**
 * Count fresh batches
 */
const freshBatchesCount = computed(() => {
  if (!props.item?.batches) return 0
  return props.item.batches.filter(
    batch =>
      !batch.expiryDate || (!isExpired(batch.expiryDate) && !isExpiringSoon(batch.expiryDate))
  ).length
})

/**
 * Count expiring batches
 */
const expiringBatchesCount = computed(() => {
  if (!props.item?.batches) return 0
  return props.item.batches.filter(
    batch => batch.expiryDate && isExpiringSoon(batch.expiryDate) && !isExpired(batch.expiryDate)
  ).length
})

/**
 * Count expired batches
 */
const expiredBatchesCount = computed(() => {
  if (!props.item?.batches) return 0
  return props.item.batches.filter(batch => batch.expiryDate && isExpired(batch.expiryDate)).length
})

// =============================================
// METHODS
// =============================================

/**
 * Load write-off operations for this preparation
 */
async function loadWriteOffOperations() {
  if (!props.item) return

  try {
    const allOperations = await preparationStore.getOperations(props.item.department)

    // Filter write-off operations that include this preparation
    writeOffOperations.value = allOperations.filter(op => {
      if (op.operationType !== 'write_off') return false

      return op.items.some(item => item.preparationId === props.item!.preparationId)
    })

    DebugUtils.info(MODULE_NAME, 'Write-off operations loaded', {
      preparationId: props.item.preparationId,
      count: writeOffOperations.value.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load write-off operations', { error })
  }
}

/**
 * Get items for this preparation from an operation
 */
function getOperationItems(operation: PreparationOperation): PreparationOperationItem[] {
  return operation.items.filter(item => item.preparationId === props.item!.preparationId)
}

/**
 * Toggle batch details visibility
 */
function toggleBatchDetails(operationId: string) {
  showBatchDetails.value[operationId] = !showBatchDetails.value[operationId]
}

/**
 * Format quantity
 */
function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return value.toString()
  return value.toFixed(2)
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format department
 */
function formatDepartment(department: PreparationDepartment): string {
  return department === 'kitchen' ? 'Kitchen' : 'Bar'
}

/**
 * Format source
 */
function formatSource(sourceType: string): string {
  const sources: Record<string, string> = {
    production: 'Production',
    correction: 'Adjustment',
    opening_balance: 'Opening',
    inventory_adjustment: 'Adjustment',
    negative_correction: 'Deficit Coverage'
  }
  return sources[sourceType] || sourceType
}

/**
 * Format batch quantity with portions
 */
function formatBatchQuantity(current: number, initial: number, unit: string): string {
  const isNegative = current < 0

  if (portionInfo.value.isPortionType && portionInfo.value.portionSize) {
    const currentPortions = Math.floor(current / portionInfo.value.portionSize)
    if (isNegative) {
      return `${currentPortions} portions`
    }
    const initialPortions = Math.floor(initial / portionInfo.value.portionSize)
    return `${currentPortions}/${initialPortions} portions`
  }

  if (isNegative) {
    return `${formatQuantity(current)} ${unit}`
  }
  return `${formatQuantity(current)}/${formatQuantity(initial)} ${unit}`
}

/**
 * Format write-off reason
 */
function formatWriteOffReason(reason?: PreparationWriteOffReason): string {
  const reasons: Record<string, string> = {
    expired: 'Expired',
    spoiled: 'Spoiled',
    other: 'Other',
    education: 'Education',
    test: 'Test/Tasting'
  }
  return reason ? reasons[reason] || reason : 'Unknown'
}

/**
 * Get write-off reason icon
 */
function getWriteOffReasonIcon(reason?: PreparationWriteOffReason): string {
  const icons: Record<string, string> = {
    expired: 'mdi-clock-alert-outline',
    spoiled: 'mdi-food-off',
    other: 'mdi-delete-outline',
    education: 'mdi-school-outline',
    test: 'mdi-flask-outline'
  }
  return reason ? icons[reason] || 'mdi-delete-outline' : 'mdi-delete-outline'
}

/**
 * Get write-off reason color
 */
function getWriteOffReasonColor(reason?: PreparationWriteOffReason): string {
  const colors: Record<string, string> = {
    expired: 'error',
    spoiled: 'error',
    other: 'warning',
    education: 'info',
    test: 'info'
  }
  return reason ? colors[reason] || 'default' : 'default'
}

/**
 * Get usage color for progress bar
 */
function getUsageColor(ratio: number): string {
  if (ratio > 0.7) return 'success'
  if (ratio > 0.3) return 'warning'
  return 'error'
}

/**
 * Check if expired
 */
function isExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date()
}

/**
 * Check if expiring soon
 */
function isExpiringSoon(expiryDate: string): boolean {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diffHours <= 24 && diffHours >= 0
}

/**
 * Get hours until expiry
 */
function getHoursUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
  return Math.max(0, Math.round(diffHours))
}

/**
 * Get batch card class
 */
function getBatchCardClass(batch: PreparationBatch): string {
  if (batch.isNegative || batch.currentQuantity < 0) return 'negative-batch'

  if (!batch.expiryDate) return ''
  if (isExpired(batch.expiryDate)) return 'expired-batch'
  if (isExpiringSoon(batch.expiryDate)) return 'expiring-batch'
  return 'fresh-batch'
}

/**
 * Get shelf life status
 */
function getShelfLifeStatus(): string {
  if (!props.item) return 'Unknown'
  if (props.item.hasExpired) return 'EXPIRED'
  if (props.item.hasNearExpiry) return 'EXPIRING'
  return 'FRESH'
}

/**
 * Get shelf life color
 */
function getShelfLifeColor(): string {
  if (!props.item) return 'info'
  if (props.item.hasExpired) return 'error'
  if (props.item.hasNearExpiry) return 'warning'
  return 'success'
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  loadWriteOffOperations()
})
</script>

<style lang="scss" scoped>
.item-icon-header {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
}

.batches-list,
.writeoffs-list {
  max-height: none;
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

.border-t {
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}

.opacity-50 {
  opacity: 0.5;
}
</style>
