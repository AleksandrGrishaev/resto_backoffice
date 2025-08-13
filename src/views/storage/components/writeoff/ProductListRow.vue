<!-- src/views/storage/components/writeoff/ProductListRow.vue -->
<template>
  <v-list-item class="product-row" :class="getRowClass()" @click="$emit('click')">
    <!-- Status indicator -->
    <template #prepend>
      <div class="status-indicator">
        <v-icon :icon="statusIcon" :color="statusColor" size="18" />
      </div>
    </template>

    <!-- Product info -->
    <v-list-item-title class="product-name">
      {{ product.name }}
    </v-list-item-title>

    <v-list-item-subtitle class="product-details">
      <!-- ✅ MORE COMPACT: Single line with all info -->
      <div class="d-flex align-center gap-3 text-body-2">
        <!-- Stock info -->
        <span class="stock-info">
          <strong>{{ productStock }} {{ productUnit }}</strong>
        </span>

        <!-- Expiry info -->
        <span v-if="hasExpiryIssues" class="expiry-info">
          <v-chip :color="expiryChipColor" size="x-small" variant="flat" class="mr-1">
            {{ expiryText }}
          </v-chip>
        </span>

        <!-- Value -->
        <span class="value-info text-medium-emphasis">
          {{ formatIDR(productValue) }}
        </span>
      </div>
    </v-list-item-subtitle>

    <!-- Actions -->
    <template #append>
      <div class="actions">
        <v-btn
          :color="isSelected ? 'primary' : 'default'"
          :variant="isSelected ? 'flat' : 'outlined'"
          size="small"
          density="compact"
          @click.stop="$emit('click')"
        >
          <v-icon :icon="isSelected ? 'mdi-check' : 'mdi-plus'" size="16" />
        </v-btn>
      </div>
    </template>
  </v-list-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { formatIDR } from '@/utils/currency'
import type { StorageDepartment } from '@/stores/storage/types'

interface Product {
  id: string
  name: string
  unit: string
  category?: string
  isActive: boolean
}

interface Props {
  product: Product
  department: StorageDepartment
  isSelected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false
})

defineEmits<{
  click: []
}>()

// Store
const storageStore = useStorageStore()

// Computed
const productBalance = computed(() => {
  return storageStore.getBalance(props.product.id, props.department)
})

const productStock = computed(() => {
  return productBalance.value?.totalQuantity || 0
})

const productUnit = computed(() => {
  return productBalance.value?.unit || props.product.unit || 'kg'
})

const productValue = computed(() => {
  return productBalance.value?.totalValue || 0
})

const hasExpiryIssues = computed(() => {
  return productBalance.value?.hasExpired || productBalance.value?.hasNearExpiry || false
})

const statusIcon = computed(() => {
  const balance = productBalance.value

  if (!balance || balance.totalQuantity === 0) return 'mdi-package-variant-closed'
  if (balance.hasExpired) return 'mdi-alert-circle'
  if (balance.hasNearExpiry) return 'mdi-clock-alert'
  if (balance.belowMinStock) return 'mdi-package-down'
  return 'mdi-package-variant'
})

const statusColor = computed(() => {
  const balance = productBalance.value

  if (!balance || balance.totalQuantity === 0) return 'grey'
  if (balance.hasExpired) return 'error'
  if (balance.hasNearExpiry) return 'warning'
  if (balance.belowMinStock) return 'info'
  return 'success'
})

const expiryChipColor = computed(() => {
  const balance = productBalance.value
  if (balance?.hasExpired) return 'error'
  if (balance?.hasNearExpiry) return 'warning'
  return 'success'
})

const expiryText = computed(() => {
  const balance = productBalance.value
  if (balance?.hasExpired) return 'Expired'
  if (balance?.hasNearExpiry) return 'Expiring Soon'
  return 'Fresh'
})

function getRowClass(): string {
  const balance = productBalance.value
  const classes = ['mb-1']

  if (!balance || balance.totalQuantity === 0) classes.push('out-of-stock')
  else if (balance.hasExpired) classes.push('expired')
  else if (balance.hasNearExpiry) classes.push('expiring')
  else if (balance.belowMinStock) classes.push('low-stock')

  return classes.join(' ')
}
</script>

<style lang="scss" scoped>
.product-row {
  border-radius: 8px;
  margin-bottom: 2px; // ✅ REDUCED spacing
  border: 1px solid transparent;
  transition: all 0.2s ease;
  min-height: 60px; // ✅ MORE COMPACT

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.05);
    cursor: pointer;
  }

  &.expired {
    border-left: 3px solid rgb(var(--v-theme-error)); // ✅ THINNER border
    background-color: rgba(var(--v-theme-error), 0.03);
  }

  &.expiring {
    border-left: 3px solid rgb(var(--v-theme-warning));
    background-color: rgba(var(--v-theme-warning), 0.03);
  }

  &.low-stock {
    border-left: 3px solid rgb(var(--v-theme-info));
    background-color: rgba(var(--v-theme-info), 0.03);
  }

  &.out-of-stock {
    opacity: 0.6;
    border-left: 3px solid rgb(var(--v-theme-surface-variant));
    background-color: rgba(var(--v-theme-surface-variant), 0.03);
  }

  .status-indicator {
    width: 32px; // ✅ SMALLER indicator
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .product-name {
    font-weight: 600;
    margin-bottom: 2px; // ✅ REDUCED spacing
    font-size: 0.9rem; // ✅ SLIGHTLY smaller
  }

  .product-details {
    .stock-info {
      min-width: 80px; // ✅ REDUCED min-width
      font-size: 0.875rem;
    }

    .expiry-info {
      min-width: auto; // ✅ FLEXIBLE width
    }

    .value-info {
      min-width: 80px; // ✅ REDUCED min-width
      font-size: 0.875rem;
    }
  }

  .actions {
    min-width: 40px; // ✅ COMPACT actions
    display: flex;
    justify-content: flex-end;
  }
}

// ✅ NEW: Selection summary styles
.selected-products-list {
  .selected-product-item {
    padding: 8px 0;

    .product-info {
      flex: 1;

      .text-subtitle-2 {
        margin-bottom: 2px;
      }
    }
  }
}

// Responsive improvements
@media (max-width: 960px) {
  .product-row {
    .product-details {
      .d-flex {
        flex-wrap: wrap;
        gap: 8px !important;
      }
    }
  }
}

@media (max-width: 600px) {
  .product-row {
    .product-details {
      .stock-info,
      .value-info {
        min-width: auto;
        font-size: 0.8rem;
      }
    }

    .actions {
      min-width: 36px;
    }
  }
}
</style>
