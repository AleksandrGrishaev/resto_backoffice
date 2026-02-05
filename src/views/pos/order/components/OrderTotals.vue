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
      <!-- Revenue Breakdown (Expandable) -->
      <v-expansion-panels
        v-if="revenueBreakdown"
        variant="accordion"
        class="revenue-breakdown-panel mb-2"
      >
        <v-expansion-panel>
          <v-expansion-panel-title class="breakdown-title">
            <div class="d-flex align-center">
              <v-icon size="small" class="mr-2">mdi-chart-bar</v-icon>
              <span class="text-caption font-weight-medium">Revenue Breakdown</span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text class="breakdown-content">
            <!-- Planned Revenue -->
            <div class="breakdown-row">
              <span class="breakdown-label">Planned Revenue</span>
              <span class="breakdown-value">
                {{ formatPrice(revenueBreakdown.plannedRevenue) }}
              </span>
            </div>

            <!-- Item Discounts -->
            <div
              v-if="revenueBreakdown.itemDiscounts > 0"
              class="breakdown-row text-medium-emphasis"
            >
              <span class="breakdown-label">
                <v-icon size="12" class="mr-1">mdi-tag</v-icon>
                Item Discounts ({{ itemDiscountCount }})
              </span>
              <span class="breakdown-value text-error">
                -{{ formatPrice(revenueBreakdown.itemDiscounts) }}
              </span>
            </div>

            <!-- Bill Discounts -->
            <div
              v-if="revenueBreakdown.billDiscounts > 0"
              class="breakdown-row text-medium-emphasis"
            >
              <span class="breakdown-label">
                <v-icon size="12" class="mr-1">mdi-tag-multiple</v-icon>
                Bill Discounts ({{ billDiscountCount }})
              </span>
              <span class="breakdown-value text-error">
                -{{ formatPrice(revenueBreakdown.billDiscounts) }}
              </span>
            </div>

            <!-- Actual Revenue -->
            <div class="breakdown-row breakdown-divider">
              <span class="breakdown-label font-weight-medium">Actual Revenue</span>
              <span class="breakdown-value font-weight-medium">
                {{ formatPrice(revenueBreakdown.actualRevenue) }}
              </span>
            </div>

            <!-- Tax Breakdown -->
            <div
              v-for="tax in revenueBreakdown.taxes"
              :key="tax.taxId"
              class="breakdown-row text-caption"
            >
              <span class="breakdown-label">{{ tax.name }} ({{ tax.percentage }}%)</span>
              <span class="breakdown-value">+{{ formatPrice(tax.amount) }}</span>
            </div>

            <!-- Total to Collect -->
            <div class="breakdown-row breakdown-divider font-weight-bold">
              <span class="breakdown-label">Total to Collect</span>
              <span class="breakdown-value">
                {{ formatPrice(revenueBreakdown.totalCollected) }}
              </span>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Simple View (when no revenue breakdown) -->
      <!-- Детали убраны - только Total отображается ниже -->
      <template v-else>
        <!-- Пустая секция - все детали скрыты -->
      </template>

      <!-- Final Total (Always visible) -->
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
import { computed } from 'vue'
import { formatIDR } from '@/utils/currency'
import type { RevenueBreakdown } from '@/stores/discounts/types'

// Alias для удобства
const formatPrice = formatIDR

// Types
interface OrderTotals {
  subtotal: number
  totalDiscounts: number
  totalTaxes: number
  finalTotal: number
}

// Props
interface Props {
  totals: OrderTotals
  revenueBreakdown?: RevenueBreakdown | null
  showTaxes?: boolean
  loading?: boolean
  hasSelection?: boolean
  selectedItemsCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  totals: () => ({
    subtotal: 0,
    totalDiscounts: 0,
    totalTaxes: 0,
    finalTotal: 0
  }),
  revenueBreakdown: null,
  showTaxes: true,
  loading: false,
  hasSelection: false,
  selectedItemsCount: 0
})

// Computed
const itemDiscountCount = computed(() => {
  // TODO: Count actual item discounts from order
  // For now, return 0 if no item discounts
  return props.revenueBreakdown && props.revenueBreakdown.itemDiscounts > 0 ? 1 : 0
})

const billDiscountCount = computed(() => {
  // TODO: Count actual bill discounts from order
  // For now, return 0 if no bill discounts
  return props.revenueBreakdown && props.revenueBreakdown.billDiscounts > 0 ? 1 : 0
})
</script>

<style scoped>
/* =============================================
   ORDER TOTALS LAYOUT
   ============================================= */

.order-totals {
  background: transparent;
  padding: 8px 12px;
  /* border-top убран - footer уже имеет border-top */
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
   REVENUE BREAKDOWN PANEL
   ============================================= */

.revenue-breakdown-panel {
  background: transparent;
}

.revenue-breakdown-panel :deep(.v-expansion-panel) {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
}

.revenue-breakdown-panel :deep(.v-expansion-panel-title) {
  min-height: 36px;
  padding: 8px 12px;
}

.breakdown-content {
  padding-top: 8px !important;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 0.8125rem;
}

.breakdown-label {
  display: flex;
  align-items: center;
  color: rgb(var(--v-theme-on-surface));
}

.breakdown-value {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface));
}

.breakdown-divider {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding-top: 8px;
  margin-top: 4px;
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
    padding: 6px 8px; /* Еще более компактный для мобильных */
  }

  .totals-content {
    gap: 3px;
  }

  .total-line {
    min-height: 20px;
    font-size: 0.8125rem;
  }

  .final-total {
    font-size: 0.9375rem;
    padding-top: 2px;
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
  .divider {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
