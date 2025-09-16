<!-- src/views/pos/order/components/OrderTotals.vue -->
<template>
  <div class="order-totals">
    <div class="totals-content pa-4">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state d-flex justify-center align-center py-8">
        <v-progress-circular indeterminate color="primary" size="32" />
        <span class="ml-3 text-body-2">Calculating totals...</span>
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Subtotal -->
        <div class="total-line d-flex justify-space-between align-center mb-2">
          <div class="total-label text-body-2">Subtotal</div>
          <div class="total-value text-body-2 font-weight-medium">
            {{ calculations.formatPrice(calculations.subtotal.value) }}
          </div>
        </div>

        <!-- Item Discounts (if any) -->
        <div
          v-if="calculations.itemDiscounts.value > 0"
          class="total-line d-flex justify-space-between align-center mb-2"
        >
          <div class="total-label text-body-2 text-success">
            <v-icon size="16" class="mr-1">mdi-percent</v-icon>
            Item Discounts
          </div>
          <div class="total-value text-body-2 font-weight-medium text-success">
            -{{ calculations.formatPrice(calculations.itemDiscounts.value) }}
          </div>
        </div>

        <!-- Bill Discounts (if any) -->
        <div
          v-if="calculations.billDiscounts.value > 0"
          class="total-line d-flex justify-space-between align-center mb-2"
        >
          <div class="total-label text-body-2 text-success">
            <v-icon size="16" class="mr-1">mdi-tag</v-icon>
            Bill Discounts
          </div>
          <div class="total-value text-body-2 font-weight-medium text-success">
            -{{ calculations.formatPrice(calculations.billDiscounts.value) }}
          </div>
        </div>

        <!-- Discounted Subtotal (if there are discounts) -->
        <div
          v-if="calculations.totalDiscounts.value > 0"
          class="total-line d-flex justify-space-between align-center mb-2 discounted-subtotal"
        >
          <div class="total-label text-body-2 font-weight-medium">Discounted Subtotal</div>
          <div class="total-value text-body-2 font-weight-medium">
            {{ calculations.formatPrice(calculations.discountedSubtotal.value) }}
          </div>
        </div>

        <!-- Divider before taxes -->
        <v-divider v-if="showTaxes" class="my-2" />

        <!-- Service Tax -->
        <div v-if="showTaxes" class="total-line d-flex justify-space-between align-center mb-2">
          <div class="total-label text-body-2">Service Tax ({{ serviceTaxRate }}%)</div>
          <div class="total-value text-body-2 font-weight-medium">
            {{ calculations.formatPrice(calculations.serviceTax.value) }}
          </div>
        </div>

        <!-- Government Tax -->
        <div v-if="showTaxes" class="total-line d-flex justify-space-between align-center mb-2">
          <div class="total-label text-body-2">Government Tax ({{ governmentTaxRate }}%)</div>
          <div class="total-value text-body-2 font-weight-medium">
            {{ calculations.formatPrice(calculations.governmentTax.value) }}
          </div>
        </div>

        <!-- Final Total -->
        <v-divider class="my-3" />
        <div class="total-line d-flex justify-space-between align-center final-total">
          <div class="total-label text-h6 font-weight-bold">Total</div>
          <div class="total-value text-h6 font-weight-bold text-primary">
            {{ calculations.formatPrice(calculations.finalTotal.value) }}
          </div>
        </div>

        <!-- Payment Status (if any payments made) -->
        <div v-if="calculations.paidAmount.value > 0" class="payment-status mt-3">
          <v-divider class="mb-2" />

          <div class="payment-line d-flex justify-space-between align-center mb-1">
            <div class="payment-label text-body-2 text-success">
              <v-icon size="16" class="mr-1">mdi-cash</v-icon>
              Paid Amount
            </div>
            <div class="payment-value text-body-2 font-weight-medium text-success">
              {{ calculations.formatPrice(calculations.paidAmount.value) }}
            </div>
          </div>

          <div class="payment-line d-flex justify-space-between align-center">
            <div class="payment-label text-body-2 text-warning">
              <v-icon size="16" class="mr-1">mdi-credit-card-clock</v-icon>
              Remaining
            </div>
            <div class="payment-value text-body-2 font-weight-medium text-warning">
              {{ calculations.formatPrice(calculations.remainingAmount.value) }}
            </div>
          </div>
        </div>

        <!-- Bills Breakdown (if multiple bills) -->
        <div v-if="bills.length > 1" class="bills-breakdown mt-3">
          <v-divider class="mb-2" />

          <div class="breakdown-header d-flex align-center justify-space-between mb-2">
            <div class="text-caption text-medium-emphasis font-weight-medium">
              BILLS BREAKDOWN ({{ bills.length }})
            </div>
            <v-btn icon variant="text" size="x-small" @click="toggleBreakdownDetails">
              <v-icon>{{ showBreakdownDetails ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </v-btn>
          </div>

          <v-expand-transition>
            <div v-show="showBreakdownDetails" class="breakdown-content">
              <div
                v-for="billBreakdown in calculations.billsBreakdown.value"
                :key="billBreakdown.id"
                class="bill-line d-flex justify-space-between align-center mb-1 pa-2 rounded"
                :class="{ 'bill-line-active': billBreakdown.id === activeBillId }"
              >
                <div class="bill-info">
                  <div class="bill-name text-body-2 font-weight-medium">
                    {{ billBreakdown.name }}
                  </div>
                  <div class="bill-details text-caption text-medium-emphasis">
                    {{ billBreakdown.itemsCount }} items
                    <span v-if="billBreakdown.totalDiscounts && billBreakdown.totalDiscounts > 0">
                      • {{ calculations.formatPrice(billBreakdown.totalDiscounts) }} discount
                    </span>
                  </div>
                </div>

                <div class="bill-total-info text-right">
                  <div class="bill-total text-body-2 font-weight-medium">
                    {{ calculations.formatPrice(billBreakdown.finalTotal || 0) }}
                  </div>
                  <v-chip
                    v-if="billBreakdown.paymentStatus !== 'unpaid'"
                    :color="
                      calculations.getPaymentStatusColor(billBreakdown.paymentStatus || 'unpaid')
                    "
                    size="x-small"
                    variant="flat"
                  >
                    {{
                      calculations.getPaymentStatusLabel(billBreakdown.paymentStatus || 'unpaid')
                    }}
                  </v-chip>
                </div>
              </div>
            </div>
          </v-expand-transition>
        </div>

        <!-- Order Statistics (debug mode) -->
        <div v-if="showDebugInfo" class="debug-info mt-3">
          <v-divider class="mb-2" />
          <div class="debug-header text-caption text-medium-emphasis font-weight-medium mb-2">
            DEBUG INFO
          </div>

          <div class="debug-stats text-caption">
            <div>Total Items: {{ calculations.orderStats.value.totalItems }}</div>
            <div>Active Items: {{ calculations.orderStats.value.activeItems }}</div>
            <div>Cancelled Items: {{ calculations.orderStats.value.cancelledItems }}</div>
            <div>
              Avg Item Price:
              {{ calculations.formatPrice(calculations.orderStats.value.averageItemPrice) }}
            </div>
            <div>
              Discount %: {{ calculations.orderStats.value.discountPercentage.toFixed(1) }}%
            </div>
            <div>Tax %: {{ calculations.orderStats.value.taxPercentage.toFixed(1) }}%</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PosBill } from '@/stores/pos/types'
import { useOrderCalculations } from '@/stores/pos/orders/composables/useOrderCalculations'

// Props
interface Props {
  bills: PosBill[]
  activeBillId?: string | null
  showTaxes?: boolean
  serviceTaxRate?: number
  governmentTaxRate?: number
  loading?: boolean
  showDebugInfo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  activeBillId: null,
  showTaxes: true,
  serviceTaxRate: 5,
  governmentTaxRate: 10,
  loading: false,
  showDebugInfo: false
})

// Local state
const showBreakdownDetails = ref(false)

// Use calculations composable with all the power
const calculations = useOrderCalculations(() => props.bills, {
  serviceTaxRate: props.serviceTaxRate,
  governmentTaxRate: props.governmentTaxRate,
  includeServiceTax: props.showTaxes,
  includeGovernmentTax: props.showTaxes
})

// Methods
const toggleBreakdownDetails = (): void => {
  showBreakdownDetails.value = !showBreakdownDetails.value
}

// Watch for changes and log detailed breakdown
watch(
  () => [props.bills, calculations.finalTotal.value],
  () => {
    if (props.bills.length > 0) {
      console.log('📊 OrderTotals - Detailed calculations:', calculations.getCalculationBreakdown())
    }
  },
  { deep: true }
)
</script>

<style scoped>
/* =============================================
   ORDER TOTALS LAYOUT
   ============================================= */

.order-totals {
  background: rgb(var(--v-theme-surface-variant));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.totals-content {
  padding: var(--spacing-md);
}

.loading-state {
  min-height: 120px;
}

/* =============================================
   TOTAL LINES
   ============================================= */

.total-line {
  min-height: 28px;
  transition: all 0.2s ease;
  border-radius: var(--v-border-radius-sm);
  padding: 2px 0;
}

.total-line:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
  padding: 4px var(--spacing-xs);
  margin: 0 calc(-1 * var(--spacing-xs));
}

.total-label {
  flex: 1;
  display: flex;
  align-items: center;
  line-height: 1.3;
}

.total-value {
  flex-shrink: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

/* =============================================
   SPECIAL SECTIONS
   ============================================= */

.discounted-subtotal {
  background: rgba(var(--v-theme-success), 0.08);
  border-radius: var(--v-border-radius-md);
  padding: var(--spacing-sm);
  margin: var(--spacing-xs) calc(-1 * var(--spacing-xs));
}

.discounted-subtotal:hover {
  background: rgba(var(--v-theme-success), 0.12);
  padding: var(--spacing-sm);
  margin: var(--spacing-xs) calc(-1 * var(--spacing-xs));
}

.final-total {
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.08),
    rgba(var(--v-theme-primary), 0.12)
  );
  border-radius: var(--v-border-radius-lg);
  padding: var(--spacing-md);
  margin: var(--spacing-sm) calc(-1 * var(--spacing-sm));
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}

.final-total:hover {
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.12),
    rgba(var(--v-theme-primary), 0.16)
  );
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.2);
}

/* =============================================
   PAYMENT STATUS
   ============================================= */

.payment-status {
  background: rgba(var(--v-theme-info), 0.05);
  border-radius: var(--v-border-radius-md);
  padding: var(--spacing-sm);
  margin: 0 calc(-1 * var(--spacing-xs));
}

.payment-line {
  min-height: 24px;
  padding: 2px 0;
}

.payment-label,
.payment-value {
  display: flex;
  align-items: center;
  font-variant-numeric: tabular-nums;
}

/* =============================================
   BILLS BREAKDOWN
   ============================================= */

.bills-breakdown {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: var(--v-border-radius-md);
  padding: var(--spacing-sm);
  margin: 0 calc(-1 * var(--spacing-xs));
}

.breakdown-header {
  user-select: none;
  cursor: pointer;
}

.breakdown-content {
  margin-top: var(--spacing-xs);
}

.bill-line {
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.bill-line:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.bill-line-active {
  background: rgba(var(--v-theme-primary), 0.08);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.bill-info {
  flex: 1;
  min-width: 0;
}

.bill-name {
  line-height: 1.2;
}

.bill-details {
  line-height: 1.2;
  margin-top: 2px;
}

.bill-total-info {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.bill-total {
  font-variant-numeric: tabular-nums;
}

/* =============================================
   DEBUG INFO
   ============================================= */

.debug-info {
  background: rgba(var(--v-theme-warning), 0.05);
  border-radius: var(--v-border-radius-md);
  padding: var(--spacing-sm);
  margin: 0 calc(-1 * var(--spacing-xs));
  border: 1px dashed rgba(var(--v-theme-warning), 0.3);
}

.debug-stats {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  line-height: 1.4;
}

.debug-stats div {
  margin-bottom: 2px;
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .totals-content {
    padding: var(--spacing-sm);
  }

  .final-total {
    padding: var(--spacing-sm);
    margin: var(--spacing-sm) calc(-1 * var(--spacing-sm));
  }

  .total-label,
  .total-value {
    font-size: 0.875rem;
  }

  .final-total .total-label,
  .final-total .total-value {
    font-size: 1.1rem;
  }

  .bill-line {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-xs);
  }

  .bill-total-info {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .payment-line {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-xs);
  }

  .payment-value {
    justify-content: flex-end;
  }
}

/* =============================================
   LOADING ANIMATION
   ============================================= */

.order-totals.updating {
  opacity: 0.8;
}

.total-value {
  transition: all 0.3s ease;
}

.loading-state {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* =============================================
   HOVER EFFECTS
   ============================================= */

@media (hover: hover) {
  .breakdown-header:hover {
    background: rgba(var(--v-theme-on-surface), 0.04);
    border-radius: var(--v-border-radius-sm);
  }
}
</style>
