<!-- src/views/pos/order/components/OrderTotals.vue -->
<template>
  <div class="order-totals">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" size="24" />
      <span class="ml-2 text-caption">Calculating...</span>
    </div>

    <!-- Totals Content -->
    <div v-else class="totals-content">
      <!-- Subtotal -->
      <div class="total-line">
        <span class="total-label">Subtotal</span>
        <span class="total-value">{{ formatPrice(totals.subtotal) }}</span>
      </div>

      <!-- Discounts (if any) -->
      <div v-if="totals.totalDiscounts > 0" class="total-line discount-line">
        <span class="total-label">
          <v-icon size="14" class="mr-1">mdi-tag</v-icon>
          Discount
        </span>
        <span class="total-value discount-value">-{{ formatPrice(totals.totalDiscounts) }}</span>
      </div>

      <!-- Service Tax -->
      <div v-if="showTaxes" class="total-line">
        <span class="total-label">Service Tax ({{ serviceTaxRate }}%)</span>
        <span class="total-value">{{ formatPrice(totals.serviceTax) }}</span>
      </div>

      <!-- Government Tax -->
      <div v-if="showTaxes" class="total-line">
        <span class="total-label">Government Tax ({{ governmentTaxRate }}%)</span>
        <span class="total-value">{{ formatPrice(totals.governmentTax) }}</span>
      </div>

      <!-- Divider -->
      <div class="divider"></div>

      <!-- Final Total -->
      <div class="total-line final-total">
        <span class="total-label">Total</span>
        <span class="total-value">{{ formatPrice(totals.finalTotal) }}</span>
      </div>

      <!-- Selection Info (if items selected) -->
      <div v-if="hasSelection" class="selection-info">
        <v-icon size="12" class="mr-1">mdi-check-circle</v-icon>
        <span class="text-caption">{{ selectedItemsCount }} items selected</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatIDR } from '@/utils/currency'

// Alias для удобства
const formatPrice = formatIDR

// Types
interface OrderTotals {
  subtotal: number
  totalDiscounts: number
  serviceTax: number
  governmentTax: number
  finalTotal: number
}

// Props
interface Props {
  totals: OrderTotals
  showTaxes?: boolean
  serviceTaxRate?: number
  governmentTaxRate?: number
  loading?: boolean
  hasSelection?: boolean
  selectedItemsCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  totals: () => ({
    subtotal: 0,
    totalDiscounts: 0,
    serviceTax: 0,
    governmentTax: 0,
    finalTotal: 0
  }),
  showTaxes: true,
  serviceTaxRate: 5,
  governmentTaxRate: 10,
  loading: false,
  hasSelection: false,
  selectedItemsCount: 0
})
</script>

<style scoped>
/* =============================================
   ORDER TOTALS LAYOUT
   ============================================= */

.order-totals {
  background: transparent;
  padding: 12px 16px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.totals-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* =============================================
   TOTAL LINES
   ============================================= */

.total-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 24px;
  font-size: 0.875rem;
}

.total-label {
  color: rgb(var(--v-theme-on-surface));
  display: flex;
  align-items: center;
}

.total-value {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface));
}

/* =============================================
   SPECIAL LINES
   ============================================= */

.discount-line .total-label {
  color: rgb(var(--v-theme-success));
}

.discount-value {
  color: rgb(var(--v-theme-success)) !important;
}

.final-total {
  font-weight: 600;
  font-size: 1rem;
  padding-top: 4px;
}

.final-total .total-label {
  color: rgb(var(--v-theme-primary));
}

.final-total .total-value {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

/* =============================================
   DIVIDER
   ============================================= */

.divider {
  height: 1px;
  background: rgba(var(--v-theme-on-surface), 0.12);
  margin: 4px 0;
}

/* =============================================
   SELECTION INFO
   ============================================= */

.selection-info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  opacity: 0.8;
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .order-totals {
    padding: 8px 12px;
  }

  .totals-content {
    gap: 4px;
  }

  .total-line {
    min-height: 20px;
    font-size: 0.8125rem;
  }

  .final-total {
    font-size: 0.9375rem;
  }
}

/* =============================================
   ANIMATIONS
   ============================================= */

.totals-content {
  transition: opacity 0.2s ease;
}

.order-totals.updating .totals-content {
  opacity: 0.6;
}

.total-value {
  transition: all 0.2s ease;
}

/* =============================================
   DARK MODE ADJUSTMENTS
   ============================================= */

@media (prefers-color-scheme: dark) {
  .order-totals {
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  .divider {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
