<!-- src/views/kitchen/preparation/components/StockItemCard.vue -->
<!-- Stock Item Card - Shows preparation stock with quick actions -->
<template>
  <v-card
    class="stock-card"
    :class="{
      'stock-out': isOutOfStock,
      'stock-low': isLowStock && !isOutOfStock,
      'stock-expiring': isExpiring && !isOutOfStock,
      'stock-expired': isExpired
    }"
    variant="outlined"
  >
    <v-card-text class="card-content pa-3">
      <!-- Status Indicator -->
      <div class="status-indicator" :class="statusClass" />

      <!-- Main Info -->
      <div class="stock-info">
        <div class="stock-name">{{ balance.preparationName }}</div>

        <div class="stock-details">
          <!-- Quantity (with portion type support) -->
          <div class="detail-item">
            <v-icon size="14" class="mr-1">mdi-package-variant</v-icon>
            <span class="detail-value" :class="{ 'text-error': isOutOfStock }">
              {{ formatDisplayQuantity() }}
            </span>
          </div>

          <!-- Expiry -->
          <div v-if="balance.oldestBatchDate" class="detail-item">
            <v-icon size="14" class="mr-1" :color="expiryIconColor">mdi-clock-outline</v-icon>
            <span :class="expiryTextClass">
              {{ formatExpiry(balance.oldestBatchDate) }}
            </span>
          </div>

          <!-- Cost (per unit: gram for weight type, portion for portion type) -->
          <div class="detail-item">
            <v-icon size="14" class="mr-1">mdi-currency-usd</v-icon>
            <span>{{ formatCostDisplay() }}</span>
          </div>

          <!-- Days Remaining -->
          <div v-if="balance.daysOfStockRemaining !== undefined" class="detail-item">
            <v-icon size="14" class="mr-1">mdi-calendar-range</v-icon>
            <span :class="{ 'text-warning': balance.daysOfStockRemaining < 3 }">
              {{ balance.daysOfStockRemaining }} days supply
            </span>
          </div>
        </div>
      </div>

      <!-- Status Badges -->
      <div class="stock-badges">
        <v-chip v-if="isOutOfStock" color="error" size="x-small" variant="flat">OUT</v-chip>
        <v-chip v-else-if="isExpired" color="error" size="x-small" variant="flat">EXPIRED</v-chip>
        <v-chip v-else-if="isExpiring" color="warning" size="x-small" variant="tonal">
          Expiring
        </v-chip>
        <v-chip v-else-if="isLowStock" color="warning" size="x-small" variant="tonal">Low</v-chip>
        <v-chip v-else color="success" size="x-small" variant="tonal">OK</v-chip>
      </div>

      <!-- Quick Actions -->
      <div class="stock-actions">
        <v-btn
          icon
          size="small"
          variant="text"
          color="primary"
          title="Produce"
          @click="handleProduce"
        >
          <v-icon>mdi-plus-circle-outline</v-icon>
        </v-btn>
        <v-btn
          icon
          size="small"
          variant="text"
          color="warning"
          title="Write-off"
          :disabled="isOutOfStock"
          @click="handleWriteOff"
        >
          <v-icon>mdi-delete-outline</v-icon>
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PreparationBalance } from '@/stores/preparation/types'

// =============================================
// PROPS
// =============================================

interface Props {
  balance: PreparationBalance
}

const props = defineProps<Props>()

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  produce: [preparationId: string]
  'write-off': [preparationId: string]
}>()

// =============================================
// COMPUTED
// =============================================

const isOutOfStock = computed(() => props.balance.totalQuantity === 0)
const isLowStock = computed(() => props.balance.belowMinStock)
const isExpiring = computed(() => props.balance.hasNearExpiry)
const isExpired = computed(() => props.balance.hasExpired)

const statusClass = computed(() => {
  if (isOutOfStock.value || isExpired.value) return 'status-error'
  if (isLowStock.value || isExpiring.value) return 'status-warning'
  return 'status-success'
})

const expiryIconColor = computed(() => {
  if (isExpired.value) return 'error'
  if (isExpiring.value) return 'warning'
  return undefined
})

const expiryTextClass = computed(() => {
  if (isExpired.value) return 'text-error'
  if (isExpiring.value) return 'text-warning'
  return ''
})

// =============================================
// METHODS
// =============================================

function handleProduce(): void {
  emit('produce', props.balance.preparationId)
}

function handleWriteOff(): void {
  if (!isOutOfStock.value) {
    emit('write-off', props.balance.preparationId)
  }
}

/**
 * ⭐ PHASE 2: Format quantity display based on portion type
 * - weight type: shows grams/kg (e.g., "290 gram", "1.5 kg")
 * - portion type: shows portions with total weight (e.g., "10 portions (300g)")
 */
function formatDisplayQuantity(): string {
  const value = props.balance.totalQuantity

  if (value === 0) return 'OUT OF STOCK'

  // For portion-type preparations, show portions
  if (
    props.balance.portionType === 'portion' &&
    props.balance.portionSize &&
    props.balance.portionSize > 0
  ) {
    const portions = Math.floor(value / props.balance.portionSize)
    const weightDisplay = value >= 1000 ? `${(value / 1000).toFixed(1)}kg` : `${Math.round(value)}g`
    return `${portions} pcs (${weightDisplay})`
  }

  // For weight-type preparations, show grams/kg
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} kg`
  }
  return `${Math.round(value)} ${props.balance.unit}`
}

/**
 * ⭐ PHASE 2: Format cost display based on portion type
 * - weight type: shows cost per gram (e.g., "Rp 50/gram")
 * - portion type: shows cost per portion (e.g., "Rp 1,500/pcs")
 */
function formatCostDisplay(): string {
  const cost = props.balance.averageCost

  if (
    props.balance.portionType === 'portion' &&
    props.balance.portionSize &&
    props.balance.portionSize > 0
  ) {
    // Cost per portion = cost per gram * portion size
    const costPerPortion = cost * props.balance.portionSize
    return `${formatCost(costPerPortion)}/pcs`
  }

  // Default: cost per gram
  return `${formatCost(cost)}/${props.balance.unit}`
}

function formatQuantity(value: number, unit: string): string {
  if (value === 0) return 'OUT OF STOCK'
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} kg`
  }
  return `${value} ${unit}`
}

function formatExpiry(date: string): string {
  try {
    const expiryDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expiryDate.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return `Expired ${Math.abs(diffDays)}d ago`
    if (diffDays === 0) return 'Expires today'
    if (diffDays === 1) return 'Expires tomorrow'
    if (diffDays <= 7) return `${diffDays} days left`

    return expiryDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return ''
  }
}

function formatCost(cost: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(cost)
}
</script>

<style scoped lang="scss">
.stock-card {
  overflow: visible;
  transition: border-color 0.2s;
  min-height: 64px;

  &.stock-out,
  &.stock-expired {
    border-color: rgb(var(--v-theme-error));
    background-color: rgba(var(--v-theme-error), 0.05);
  }

  &.stock-low,
  &.stock-expiring {
    border-color: rgb(var(--v-theme-warning));
    background-color: rgba(var(--v-theme-warning), 0.05);
  }
}

.card-content {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
}

.status-indicator {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  flex-shrink: 0;

  &.status-error {
    background-color: rgb(var(--v-theme-error));
  }

  &.status-warning {
    background-color: rgb(var(--v-theme-warning));
  }

  &.status-success {
    background-color: rgb(var(--v-theme-success));
  }
}

.stock-info {
  flex: 1;
  min-width: 0;
}

.stock-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--v-theme-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stock-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.detail-item {
  display: flex;
  align-items: center;
}

.detail-value {
  font-weight: 500;
}

.stock-badges {
  flex-shrink: 0;
}

.stock-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .card-content {
    flex-wrap: wrap;
    gap: 8px;
  }

  .stock-info {
    flex-basis: calc(100% - 60px);
  }

  .stock-badges {
    order: -1;
    margin-left: auto;
  }

  .stock-actions {
    flex-basis: 100%;
    justify-content: flex-end;
  }
}
</style>
