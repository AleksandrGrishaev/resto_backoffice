<!-- src/views/storage/components/writeoff/ProductCard.vue -->
<template>
  <v-card
    class="product-card"
    :class="getCardClass()"
    variant="outlined"
    :ripple="canSelect"
    @click="handleCardClick"
  >
    <!-- Selection Overlay -->
    <div v-if="selected && canSelect" class="selection-overlay">
      <v-icon icon="mdi-check-circle" size="32" color="primary" />
    </div>

    <!-- Status Badge -->
    <div class="status-badge">
      <v-chip :color="getStatusColor()" size="small" variant="flat" class="status-chip">
        {{ getStatusText() }}
      </v-chip>
    </div>

    <v-card-text class="pa-4">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="product-icon">🥩</div>
        <div class="text-right">
          <div class="text-caption text-medium-emphasis">Stock</div>
          <div class="text-h6 font-weight-bold">{{ getProductStock() }} {{ product.unit }}</div>
        </div>
      </div>

      <!-- Name -->
      <div class="mb-3">
        <h4 class="text-subtitle-1 font-weight-bold text-truncate mb-1">
          {{ product.name }}
        </h4>
        <div class="text-caption text-medium-emphasis">
          {{ formatIDR(getProductCost()) }}/{{ product.unit }}
        </div>
      </div>

      <!-- Cost Information -->
      <div class="cost-info mb-3">
        <div class="d-flex justify-space-between align-center">
          <div class="text-caption text-medium-emphasis">Total Value</div>
          <div class="text-h6 font-weight-bold">
            {{ formatIDR(getTotalValue()) }}
          </div>
        </div>
      </div>

      <!-- Expiry Information -->
      <div v-if="hasExpiryInfo()" class="expiry-info mb-3">
        <div class="d-flex justify-space-between align-center">
          <div class="text-caption text-medium-emphasis">
            <v-icon icon="mdi-clock-outline" size="12" class="mr-1" />
            {{ getExpiryLabel() }}
          </div>
          <div class="text-body-2" :class="getExpiryTextColor()">
            {{ getExpiryText() }}
          </div>
        </div>
      </div>

      <!-- Status Indicators -->
      <div class="status-indicators">
        <div class="d-flex gap-1 flex-wrap">
          <v-chip v-if="isExpired()" color="error" size="x-small" variant="flat">
            <v-icon icon="mdi-clock-alert" size="10" class="mr-1" />
            Expired
          </v-chip>
          <v-chip v-else-if="isExpiring()" color="warning" size="x-small" variant="flat">
            <v-icon icon="mdi-clock-outline" size="10" class="mr-1" />
            Expiring
          </v-chip>
          <v-chip v-if="isLowStock()" color="info" size="x-small" variant="flat">
            <v-icon icon="mdi-package-down" size="10" class="mr-1" />
            Low Stock
          </v-chip>
        </div>
      </div>
    </v-card-text>

    <!-- Quick Actions -->
    <v-card-actions class="pa-4 pt-0">
      <v-btn
        v-if="canSelect"
        :color="selected ? 'primary' : 'default'"
        :variant="selected ? 'flat' : 'outlined'"
        size="small"
        block
        @click.stop="handleSelect"
      >
        <v-icon :icon="selected ? 'mdi-check' : 'mdi-plus'" class="mr-1" />
        {{ selected ? 'Selected' : 'Select' }}
      </v-btn>

      <v-btn
        v-else
        color="error"
        variant="outlined"
        size="small"
        block
        prepend-icon="mdi-delete-sweep"
        @click.stop="handleQuickWriteOff"
      >
        Quick Write-off
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { formatIDR } from '@/utils/currency'
import type { Department } from '@/stores/productsStore/types'
interface Product {
  id: string
  name: string
  unit: string
  category?: string
  isActive: boolean
}

interface Props {
  product: Product
  department: Department
  selected?: boolean
  canSelect?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  canSelect: true
})

const emit = defineEmits<{
  select: [product: Product]
  'quick-write-off': [product: Product]
}>()

// Store
const storageStore = useStorageStore()

// Computed
const productBalance = computed(() => {
  // ✅ НОВАЯ ЛОГИКА: getBalance без department параметра
  return storageStore.state.balances.find(b => b.itemId === props.product.id) || null
})

// Methods
function getCardClass(): string {
  const classes = ['product-card-item']

  if (props.selected) classes.push('selected')
  if (isExpired()) classes.push('expired')
  else if (isExpiring()) classes.push('expiring')
  if (isLowStock()) classes.push('low-stock')

  return classes.join(' ')
}

function getStatusColor(): string {
  if (isExpired()) return 'error'
  if (isExpiring()) return 'warning'
  if (isLowStock()) return 'info'
  return 'success'
}

function getStatusText(): string {
  if (isExpired()) return 'Expired'
  if (isExpiring()) return 'Expiring'
  if (isLowStock()) return 'Low Stock'
  return 'Available'
}

function getProductStock(): number {
  return productBalance.value?.totalQuantity || 0
}

function getProductCost(): number {
  return productBalance.value?.averageCost || 0
}

function getTotalValue(): number {
  return productBalance.value?.totalValue || 0
}

function isExpired(): boolean {
  return productBalance.value?.hasExpired || false
}

function isExpiring(): boolean {
  return productBalance.value?.hasNearExpiry || false
}

function isLowStock(): boolean {
  return productBalance.value?.belowMinStock || false
}

function hasExpiryInfo(): boolean {
  return isExpired() || isExpiring() || productBalance.value?.batches?.some(b => b.expiryDate)
}

function getExpiryLabel(): string {
  if (isExpired()) return 'Expired'
  if (isExpiring()) return 'Expires'
  return 'Expires'
}

function getExpiryText(): string {
  if (!productBalance.value?.batches?.length) return 'No expiry'

  // Find earliest expiry date
  const earliestExpiry = productBalance.value.batches
    .filter(b => b.expiryDate)
    .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())[0]

  if (!earliestExpiry?.expiryDate) return 'No expiry'

  const expiryDate = new Date(earliestExpiry.expiryDate)
  const now = new Date()
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return `${diffDays} days`
}

function getExpiryTextColor(): string {
  if (isExpired()) return 'text-error'
  if (isExpiring()) return 'text-warning'
  return 'text-medium-emphasis'
}

function handleCardClick() {
  if (props.canSelect) {
    handleSelect()
  }
}

function handleSelect() {
  emit('select', props.product)
}

function handleQuickWriteOff() {
  emit('quick-write-off', props.product)
}
</script>

<style lang="scss" scoped>
.product-card {
  position: relative;
  transition: all 0.2s ease;
  height: 100%;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  &.selected {
    border-color: rgb(var(--v-theme-primary));
    box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
  }

  &.expired {
    border-left: 4px solid rgb(var(--v-theme-error));
  }

  &.expiring {
    border-left: 4px solid rgb(var(--v-theme-warning));
  }

  &.low-stock {
    border-left: 4px solid rgb(var(--v-theme-info));
  }

  .selection-overlay {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
  }

  .status-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 1;
  }

  .product-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 8px;
  }

  .cost-info {
    padding: 8px 0;
    border-top: 1px solid rgba(var(--v-theme-outline), 0.2);
    border-bottom: 1px solid rgba(var(--v-theme-outline), 0.2);
  }

  .expiry-info {
    background: rgba(var(--v-theme-surface-variant), 0.5);
    padding: 8px;
    border-radius: 4px;
  }

  .status-indicators {
    min-height: 24px;
  }
}
</style>
