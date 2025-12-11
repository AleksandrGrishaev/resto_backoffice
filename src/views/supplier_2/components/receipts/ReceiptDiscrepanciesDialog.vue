<!-- src/views/supplier_2/components/receipts/ReceiptDiscrepanciesDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="800px">
    <v-card v-if="receipt">
      <!-- Header -->
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-alert-triangle" color="warning" class="mr-2" />
        Discrepancies Report - {{ receipt.receiptNumber }}
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Summary Cards -->
        <div class="mb-4">
          <v-row>
            <v-col cols="6">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h6 font-weight-bold text-warning">
                  {{ discrepantItems.length }}
                </div>
                <div class="text-caption">Items with Issues</div>
              </v-card>
            </v-col>

            <v-col cols="6">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h6 font-weight-bold" :class="getTotalImpactClass()">
                  {{ formatCurrency(totalFinancialImpact) }}
                </div>
                <div class="text-caption">Total Impact</div>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Impact Breakdown -->
        <div class="mb-4">
          <v-row>
            <v-col cols="4">
              <div class="text-center">
                <div class="text-subtitle-2 font-weight-bold text-info">
                  {{ quantityIssuesCount }}
                </div>
                <div class="text-caption">Quantity Issues</div>
              </div>
            </v-col>

            <v-col cols="4">
              <div class="text-center">
                <div class="text-subtitle-2 font-weight-bold text-warning">
                  {{ priceIssuesCount }}
                </div>
                <div class="text-caption">Price Issues</div>
              </div>
            </v-col>

            <v-col cols="4">
              <div class="text-center">
                <div class="text-subtitle-2 font-weight-bold text-error">
                  {{ bothIssuesCount }}
                </div>
                <div class="text-caption">Both Issues</div>
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Detailed Discrepancies -->
        <div class="text-subtitle-1 font-weight-bold mb-3">Detailed Analysis</div>

        <div v-if="discrepantItems.length === 0" class="text-center pa-4">
          <v-icon icon="mdi-check-circle" color="success" size="48" class="mb-2" />
          <div class="text-body-1">No discrepancies found</div>
          <div class="text-body-2 text-medium-emphasis">All items received exactly as ordered</div>
        </div>

        <div v-else>
          <div
            v-for="item in discrepantItems"
            :key="item.id"
            class="discrepancy-item pa-3 mb-3 rounded border"
          >
            <!-- Item Header -->
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2 font-weight-bold">{{ item.itemName }}</div>
              <v-chip size="small" :color="getItemIssueColor(item)" variant="tonal">
                {{ getItemIssueText(item) }}
              </v-chip>
            </div>

            <!-- Issue Details -->
            <v-row dense>
              <!-- Quantity Issues -->
              <v-col v-if="hasQuantityDiscrepancy(item)" cols="12" md="6">
                <v-card variant="outlined" class="pa-2">
                  <div class="text-caption text-medium-emphasis mb-1">
                    <v-icon icon="mdi-scale-balance" size="12" class="mr-1" />
                    Quantity Issue
                  </div>
                  <div class="text-body-2 mb-1">
                    <strong>Ordered:</strong>
                    {{ item.orderedQuantity }} {{ getItemUnit(item) }}
                  </div>
                  <div class="text-body-2 mb-1">
                    <strong>Received:</strong>
                    {{ item.receivedQuantity }} {{ getItemUnit(item) }}
                  </div>
                  <div class="text-body-2" :class="getQuantityImpactClass(item)">
                    <strong>Difference:</strong>
                    {{ getQuantityDifferenceText(item) }} ({{ getQuantityPercentage(item) }})
                  </div>
                </v-card>
              </v-col>

              <!-- Price Issues -->
              <v-col v-if="hasPriceDiscrepancy(item)" cols="12" md="6">
                <v-card variant="outlined" class="pa-2">
                  <div class="text-caption text-medium-emphasis mb-1">
                    <v-icon icon="mdi-currency-usd" size="12" class="mr-1" />
                    Price Issue
                  </div>
                  <div class="text-body-2 mb-1">
                    <strong>Expected:</strong>
                    {{ formatCurrency(item.orderedPrice) }}
                  </div>
                  <div class="text-body-2 mb-1">
                    <strong>Actual:</strong>
                    {{ formatCurrency(item.actualPrice || item.orderedPrice) }}
                  </div>
                  <div class="text-body-2" :class="getPriceImpactClass(item)">
                    <strong>Difference:</strong>
                    {{ getPriceDifferenceText(item) }} ({{ getPricePercentage(item) }})
                  </div>
                </v-card>
              </v-col>

              <!-- Financial Impact -->
              <v-col cols="12">
                <v-card variant="tonal" :color="getLineImpactColor(item)" class="pa-2">
                  <div class="d-flex align-center justify-space-between">
                    <div class="text-caption">
                      <v-icon icon="mdi-calculator" size="12" class="mr-1" />
                      Line Total Impact
                    </div>
                    <div class="text-body-2 font-weight-bold" :class="getLineImpactClass(item)">
                      {{ formatLineTotalImpact(item) }}
                    </div>
                  </div>
                  <div class="text-caption text-medium-emphasis mt-1">
                    Original: {{ formatCurrency(getOriginalLineTotal(item)) }} → Actual:
                    {{ formatCurrency(getActualLineTotal(item)) }}
                  </div>
                </v-card>
              </v-col>
            </v-row>

            <!-- Item Notes -->
            <div v-if="item.notes" class="mt-2">
              <div class="text-caption text-medium-emphasis">Notes:</div>
              <div class="text-body-2 font-style-italic">{{ item.notes }}</div>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        <div v-if="discrepantItems.length > 0" class="mt-4">
          <v-alert type="info" variant="tonal">
            <v-alert-title>Recommendations</v-alert-title>
            <ul class="text-body-2 mt-2">
              <li v-if="quantityIssuesCount > 0">
                Review supplier delivery accuracy and consider quality controls
              </li>
              <li v-if="priceIssuesCount > 0">
                Update price agreements with supplier for affected items
              </li>
              <li v-if="totalFinancialImpact > 10000">
                Consider financial adjustment with supplier due to significant impact
              </li>
              <li>Document these discrepancies for future supplier performance evaluation</li>
            </ul>
          </v-alert>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-spacer />

        <v-btn color="primary" variant="outlined" prepend-icon="mdi-download" @click="exportReport">
          Export Report
        </v-btn>

        <v-btn color="grey" variant="outlined" @click="closeDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Receipt, ReceiptItem } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  receipt: Receipt | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const discrepantItems = computed(() => {
  if (!props.receipt) return []
  return props.receipt.items.filter(item => hasItemDiscrepancy(item))
})

const quantityIssuesCount = computed(() => {
  return discrepantItems.value.filter(item => hasQuantityDiscrepancy(item)).length
})

const priceIssuesCount = computed(() => {
  return discrepantItems.value.filter(item => hasPriceDiscrepancy(item)).length
})

const bothIssuesCount = computed(() => {
  return discrepantItems.value.filter(
    item => hasQuantityDiscrepancy(item) && hasPriceDiscrepancy(item)
  ).length
})

const totalFinancialImpact = computed(() => {
  return discrepantItems.value.reduce((sum, item) => {
    const originalTotal = getOriginalLineTotal(item)
    const actualTotal = getActualLineTotal(item)
    return sum + (actualTotal - originalTotal)
  }, 0)
})

// =============================================
// METHODS
// =============================================

function closeDialog() {
  isOpen.value = false
}

function exportReport() {
  console.log('Export discrepancies report for:', props.receipt?.receiptNumber)
  // TODO: Implement PDF export
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function hasItemDiscrepancy(item: ReceiptItem): boolean {
  return hasQuantityDiscrepancy(item) || hasPriceDiscrepancy(item)
}

function hasQuantityDiscrepancy(item: ReceiptItem): boolean {
  return Math.abs(item.receivedQuantity - item.orderedQuantity) > 0.01
}

function hasPriceDiscrepancy(item: ReceiptItem): boolean {
  return item.actualPrice !== undefined && Math.abs(item.actualPrice - item.orderedPrice) > 0.01
}

function getItemUnit(item: ReceiptItem): string {
  // In real app, would get from ProductsStore
  if (
    item.itemName.toLowerCase().includes('beer') ||
    item.itemName.toLowerCase().includes('cola')
  ) {
    return 'piece'
  }
  return 'kg'
}

function getItemIssueText(item: ReceiptItem): string {
  const hasQty = hasQuantityDiscrepancy(item)
  const hasPrice = hasPriceDiscrepancy(item)

  if (hasQty && hasPrice) return 'Both Issues'
  if (hasQty) return 'Quantity Issue'
  if (hasPrice) return 'Price Issue'
  return 'OK'
}

function getItemIssueColor(item: ReceiptItem): string {
  const issueText = getItemIssueText(item)
  if (issueText === 'Both Issues') return 'error'
  if (issueText === 'OK') return 'success'
  return 'warning'
}

function getQuantityDifferenceText(item: ReceiptItem): string {
  const diff = item.receivedQuantity - item.orderedQuantity
  if (Math.abs(diff) < 0.01) return '0'
  return diff > 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`
}

function getQuantityPercentage(item: ReceiptItem): string {
  if (item.orderedQuantity === 0) return '0%'
  const percent = ((item.receivedQuantity - item.orderedQuantity) / item.orderedQuantity) * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

function getQuantityImpactClass(item: ReceiptItem): string {
  const diff = item.receivedQuantity - item.orderedQuantity
  if (Math.abs(diff) < 0.01) return 'text-success'
  return diff > 0 ? 'text-info' : 'text-warning'
}

function getPriceDifferenceText(item: ReceiptItem): string {
  if (!item.actualPrice) return '0'
  const diff = item.actualPrice - item.orderedPrice
  return diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)
}

function getPricePercentage(item: ReceiptItem): string {
  if (!item.actualPrice || item.orderedPrice === 0) return '0%'
  const percent = ((item.actualPrice - item.orderedPrice) / item.orderedPrice) * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

function getPriceImpactClass(item: ReceiptItem): string {
  if (!item.actualPrice) return 'text-success'
  const diff = item.actualPrice - item.orderedPrice
  return diff > 0 ? 'text-error' : 'text-success'
}

function getOriginalLineTotal(item: ReceiptItem): number {
  // ✅ FIXED: Use BaseCost (per unit), not Price (per package)
  return item.orderedQuantity * (item.orderedBaseCost || 0)
}

function getActualLineTotal(item: ReceiptItem): number {
  // ✅ FIXED: Use BaseCost (per unit), not Price (per package)
  const baseCost = item.actualBaseCost || item.orderedBaseCost || 0
  return item.receivedQuantity * baseCost
}

function formatLineTotalImpact(item: ReceiptItem): string {
  const originalTotal = getOriginalLineTotal(item)
  const actualTotal = getActualLineTotal(item)
  const diff = actualTotal - originalTotal

  if (Math.abs(diff) < 1000) return '±0'
  return diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)
}

function getLineImpactClass(item: ReceiptItem): string {
  const originalTotal = getOriginalLineTotal(item)
  const actualTotal = getActualLineTotal(item)
  const diff = actualTotal - originalTotal

  if (Math.abs(diff) < 1000) return 'text-success'
  return diff > 0 ? 'text-error' : 'text-success'
}

function getLineImpactColor(item: ReceiptItem): string {
  const originalTotal = getOriginalLineTotal(item)
  const actualTotal = getActualLineTotal(item)
  const diff = actualTotal - originalTotal

  if (Math.abs(diff) < 1000) return 'success'
  return diff > 0 ? 'error' : 'success'
}

function getTotalImpactClass(): string {
  if (Math.abs(totalFinancialImpact.value) < 1000) return 'text-success'
  return totalFinancialImpact.value > 0 ? 'text-error' : 'text-success'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}
</script>

<style lang="scss" scoped>
.discrepancy-item {
  background-color: rgb(var(--v-theme-warning), 0.05);
  border-left: 4px solid rgb(var(--v-theme-warning)) !important;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgb(var(--v-theme-warning), 0.1);
  }
}

.text-medium-emphasis {
  opacity: 0.7;
}

.border {
  border: 1px solid rgb(var(--v-theme-surface-variant));
}

.rounded {
  border-radius: 8px;
}

.text-error {
  color: rgb(var(--v-theme-error)) !important;
}

.text-success {
  color: rgb(var(--v-theme-success)) !important;
}

.text-warning {
  color: rgb(var(--v-theme-warning)) !important;
}

.text-info {
  color: rgb(var(--v-theme-info)) !important;
}

.font-style-italic {
  font-style: italic;
}

// Responsive adjustments
@media (max-width: 768px) {
  .discrepancy-item {
    .v-row {
      flex-direction: column;
    }

    .v-col {
      padding: 4px;
    }
  }
}

// Animation for discrepancy items
.discrepancy-item {
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
