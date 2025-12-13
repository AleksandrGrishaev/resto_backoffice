<!-- src/views/kitchen/preparation/components/HistoryItemCard.vue -->
<!-- Unified History Item Card - Shows production or write-off details -->
<template>
  <v-card variant="outlined" :class="cardClass">
    <v-card-text class="d-flex align-center py-3 px-4">
      <!-- Status Icon -->
      <v-icon :color="iconColor" size="24" class="mr-3">{{ icon }}</v-icon>

      <!-- Item Info -->
      <div class="item-info flex-grow-1">
        <div class="item-name">{{ item.displayName }}</div>
        <div class="item-details d-flex flex-wrap gap-3">
          <!-- Quantity -->
          <span class="detail-item">
            <v-icon size="14" class="mr-1">mdi-scale</v-icon>
            {{ formatQuantity }}
          </span>

          <!-- Time -->
          <span v-if="item.timestamp" class="detail-item">
            <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
            {{ formatTime(item.timestamp) }}
          </span>

          <!-- Person -->
          <span v-if="item.responsiblePerson" class="detail-item">
            <v-icon size="14" class="mr-1">mdi-account</v-icon>
            {{ item.responsiblePerson }}
          </span>

          <!-- Write-off reason -->
          <span v-if="item.writeOffDetails" class="detail-item reason-chip">
            <v-icon size="14" class="mr-1">mdi-alert-circle-outline</v-icon>
            {{ formatReason(item.writeOffDetails.reason) }}
          </span>

          <!-- Write-off cost -->
          <span v-if="item.totalValue" class="detail-item cost-chip">
            <v-icon size="14" class="mr-1">mdi-currency-usd</v-icon>
            {{ formatCurrency(item.totalValue) }}
          </span>
        </div>
      </div>

      <!-- Badge (slot for production, KPI indicator for write-offs) -->
      <v-chip v-if="isProduction" :color="slotColor" size="small" variant="tonal" class="ml-2">
        {{ slotLabel }}
      </v-chip>

      <v-chip
        v-else-if="item.writeOffDetails"
        :color="item.writeOffDetails.affectsKPI ? 'error' : 'grey'"
        size="small"
        variant="tonal"
        class="ml-2"
      >
        {{ item.writeOffDetails.affectsKPI ? 'KPI' : 'Non-KPI' }}
      </v-chip>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatIDR } from '@/utils/currency'
import type { UnifiedHistoryItem } from '@/stores/kitchenKpi'

// =============================================
// PROPS
// =============================================

interface Props {
  item: UnifiedHistoryItem
}

const props = defineProps<Props>()

// =============================================
// COMPUTED
// =============================================

const isProduction = computed(() => props.item.type === 'production')
const isPrepWriteOff = computed(() => props.item.type === 'preparation_writeoff')
const isProductWriteOff = computed(() => props.item.type === 'product_writeoff')

const cardClass = computed(() => {
  if (isProduction.value) return 'history-card history-card--production'
  if (isPrepWriteOff.value) return 'history-card history-card--prep-writeoff'
  return 'history-card history-card--product-writeoff'
})

const icon = computed(() => {
  if (isProduction.value) return 'mdi-check-circle'
  if (isPrepWriteOff.value) return 'mdi-package-variant-remove'
  return 'mdi-delete-outline'
})

const iconColor = computed(() => {
  if (isProduction.value) return 'success'
  if (isPrepWriteOff.value) return 'warning'
  return 'error'
})

const slotLabel = computed(() => {
  if (!props.item.productionDetails) return ''
  const slots: Record<string, string> = {
    urgent: 'Urgent',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening'
  }
  return (
    slots[props.item.productionDetails.productionSlot] ||
    props.item.productionDetails.productionSlot
  )
})

const slotColor = computed(() => {
  if (!props.item.productionDetails) return 'grey'
  const colors: Record<string, string> = {
    urgent: 'error',
    morning: 'info',
    afternoon: 'warning',
    evening: 'purple'
  }
  return colors[props.item.productionDetails.productionSlot] || 'grey'
})

const formatQuantity = computed(() => {
  const value = props.item.quantity
  const unit = props.item.unit || 'g'

  if (value <= 0) return '0'

  // For production with portion type
  if (
    isProduction.value &&
    props.item.productionDetails?.portionType === 'portion' &&
    props.item.productionDetails?.portionSize &&
    props.item.productionDetails.portionSize > 0
  ) {
    const portions = Math.ceil(value / props.item.productionDetails.portionSize)
    const weightDisplay = value >= 1000 ? `${(value / 1000).toFixed(1)}kg` : `${Math.round(value)}g`
    return `${portions} pcs (${weightDisplay})`
  }

  // For weight display
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}kg`
  }
  return `${Math.round(value)}${unit}`
})

// =============================================
// METHODS
// =============================================

function formatTime(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return ''
  }
}

function formatReason(reason: string): string {
  const reasonLabels: Record<string, string> = {
    expired: 'Expired',
    spoiled: 'Spoiled',
    other: 'Other',
    education: 'Training',
    test: 'Testing'
  }
  return reasonLabels[reason] || reason
}

function formatCurrency(value: number): string {
  return formatIDR(value, { compact: true })
}
</script>

<style scoped lang="scss">
.history-card {
  transition: all 0.2s;

  &--production {
    background-color: rgba(var(--v-theme-success), 0.05);
    border-color: rgba(var(--v-theme-success), 0.2);

    &:hover {
      background-color: rgba(var(--v-theme-success), 0.08);
    }
  }

  &--prep-writeoff {
    background-color: rgba(var(--v-theme-warning), 0.05);
    border-color: rgba(var(--v-theme-warning), 0.2);

    &:hover {
      background-color: rgba(var(--v-theme-warning), 0.08);
    }
  }

  &--product-writeoff {
    background-color: rgba(var(--v-theme-error), 0.05);
    border-color: rgba(var(--v-theme-error), 0.2);

    &:hover {
      background-color: rgba(var(--v-theme-error), 0.08);
    }
  }
}

.item-info {
  min-width: 0;
}

.item-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--v-theme-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-details {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.detail-item {
  display: flex;
  align-items: center;
}

.reason-chip {
  color: rgba(var(--v-theme-warning), 1);
}

.cost-chip {
  color: rgba(var(--v-theme-error), 0.9);
}

.gap-3 {
  gap: 12px;
}
</style>
