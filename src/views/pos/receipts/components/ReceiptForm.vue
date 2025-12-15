<script setup lang="ts">
// src/views/pos/receipts/components/ReceiptForm.vue
// Sprint 6: POS Receipt Module - Receipt Form with Items

import { ref, computed } from 'vue'
import type { ReceiptFormData } from '@/stores/pos/receipts'
import { formatIDR } from '@/utils'
import ReceiptItemRow from './ReceiptItemRow.vue'

interface Props {
  formData: ReceiptFormData
  submitting?: boolean
  canComplete?: boolean
}

interface Emits {
  (e: 'update:quantity', itemId: string, quantity: number): void
  (e: 'update:packageQuantity', itemId: string, packageQuantity: number): void
  (e: 'update:price', itemId: string, price: number): void
  (e: 'update:packagePrice', itemId: string, packagePrice: number): void
  (e: 'update:lineTotal', itemId: string, lineTotal: number | undefined): void
  (e: 'complete'): void
  (e: 'complete-with-payment', amount: number): void
}

const props = withDefaults(defineProps<Props>(), {
  submitting: false,
  canComplete: true
})

const emit = defineEmits<Emits>()

// Payment section
const showPayment = ref(false)
const paymentAmount = ref(0)

// Computed values
const totalDifference = computed(() => {
  return props.formData.actualTotal - props.formData.expectedTotal
})

const differenceColor = computed(() => {
  if (totalDifference.value === 0) return 'success'
  if (totalDifference.value > 0) return 'error' // More expensive
  return 'warning' // Less expensive
})

const itemsWithDiscrepancies = computed(() => {
  return props.formData.items.filter(item => item.hasDiscrepancy)
})

// Initialize payment amount with actual total
function togglePayment() {
  showPayment.value = !showPayment.value
  if (showPayment.value) {
    paymentAmount.value = props.formData.actualTotal
  }
}

// Handle item updates
function handleQuantityUpdate(itemId: string, quantity: number) {
  emit('update:quantity', itemId, quantity)
}

function handlePackageQuantityUpdate(itemId: string, packageQuantity: number) {
  emit('update:packageQuantity', itemId, packageQuantity)
}

function handlePriceUpdate(itemId: string, price: number) {
  emit('update:price', itemId, price)
}

function handlePackagePriceUpdate(itemId: string, packagePrice: number) {
  emit('update:packagePrice', itemId, packagePrice)
}

function handleLineTotalUpdate(itemId: string, lineTotal: number | undefined) {
  emit('update:lineTotal', itemId, lineTotal)
}

// Handle completion
function handleComplete() {
  emit('complete')
}

function handleCompleteWithPayment() {
  emit('complete-with-payment', paymentAmount.value)
}
</script>

<template>
  <div class="receipt-form">
    <!-- Items Table -->
    <v-card-text class="pa-0">
      <v-table density="compact">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="text-center" style="width: 50px"></th>
            <th>Product</th>
            <th style="width: 120px">Package</th>
            <th style="width: 120px">Received</th>
            <th style="width: 140px">Price</th>
            <th class="text-right" style="width: 140px">Line Total</th>
          </tr>
        </thead>
        <tbody>
          <ReceiptItemRow
            v-for="item in formData.items"
            :key="item.orderItemId"
            :item="item"
            :disabled="submitting"
            @update:quantity="handleQuantityUpdate"
            @update:package-quantity="handlePackageQuantityUpdate"
            @update:price="handlePriceUpdate"
            @update:package-price="handlePackagePriceUpdate"
            @update:line-total="handleLineTotalUpdate"
          />
        </tbody>
      </v-table>
    </v-card-text>

    <v-divider />

    <!-- Totals Section -->
    <v-card-text>
      <v-row>
        <!-- Discrepancies Summary -->
        <v-col cols="12" md="6">
          <div v-if="formData.hasDiscrepancies" class="discrepancies-summary">
            <v-alert type="warning" variant="tonal" density="compact">
              <div class="font-weight-medium mb-1">
                {{ itemsWithDiscrepancies.length }} item{{
                  itemsWithDiscrepancies.length !== 1 ? 's' : ''
                }}
                with discrepancies
              </div>
              <ul class="text-body-2 pl-4 mb-0">
                <li v-for="item in itemsWithDiscrepancies" :key="item.orderItemId">
                  {{ item.productName }}:
                  <span
                    v-if="item.discrepancyType === 'quantity' || item.discrepancyType === 'both'"
                  >
                    qty {{ item.orderedQuantity }} → {{ item.receivedQuantity }}
                  </span>
                  <span v-if="item.discrepancyType === 'both'">,</span>
                  <span v-if="item.discrepancyType === 'price' || item.discrepancyType === 'both'">
                    price {{ formatIDR(item.orderedPrice) }} → {{ formatIDR(item.actualPrice) }}
                  </span>
                </li>
              </ul>
            </v-alert>
          </div>
          <div v-else class="text-success d-flex align-center">
            <v-icon start>mdi-check-circle</v-icon>
            All items match order
          </div>
        </v-col>

        <!-- Totals -->
        <v-col cols="12" md="6">
          <v-table density="compact" class="totals-table">
            <tbody>
              <tr>
                <td class="text-body-2">Expected Total:</td>
                <td class="text-right font-weight-medium">
                  {{ formatIDR(formData.expectedTotal) }}
                </td>
              </tr>
              <tr>
                <td class="text-body-2">Actual Total:</td>
                <td class="text-right font-weight-bold text-h6">
                  {{ formatIDR(formData.actualTotal) }}
                </td>
              </tr>
              <tr v-if="totalDifference !== 0">
                <td class="text-body-2">Difference:</td>
                <td class="text-right font-weight-medium" :class="`text-${differenceColor}`">
                  {{ totalDifference > 0 ? '+' : '' }}{{ formatIDR(totalDifference) }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-col>
      </v-row>
    </v-card-text>

    <v-divider />

    <!-- Payment Section (Optional) -->
    <v-expand-transition>
      <v-card-text v-if="showPayment" class="bg-grey-lighten-5">
        <div class="d-flex align-center gap-4">
          <v-text-field
            v-model.number="paymentAmount"
            label="Payment Amount"
            type="number"
            variant="outlined"
            density="compact"
            prefix="Rp"
            :disabled="submitting"
            style="max-width: 200px"
          />

          <div class="text-body-2">
            <div v-if="paymentAmount === formData.actualTotal" class="text-success">
              <v-icon start size="small">mdi-check</v-icon>
              Exact amount
            </div>
            <div v-else-if="paymentAmount > formData.actualTotal" class="text-warning">
              <v-icon start size="small">mdi-alert</v-icon>
              Overpayment: {{ formatIDR(paymentAmount - formData.actualTotal) }}
            </div>
            <div v-else class="text-error">
              <v-icon start size="small">mdi-alert</v-icon>
              Underpayment: {{ formatIDR(formData.actualTotal - paymentAmount) }}
            </div>
          </div>
        </div>
      </v-card-text>
    </v-expand-transition>

    <!-- Actions -->
    <v-card-actions class="pa-4">
      <v-btn variant="outlined" @click="togglePayment">
        <v-icon start>{{ showPayment ? 'mdi-cash-remove' : 'mdi-cash-plus' }}</v-icon>
        {{ showPayment ? 'Remove Payment' : 'Add Payment' }}
      </v-btn>

      <v-spacer />

      <v-btn
        v-if="!showPayment"
        color="primary"
        size="large"
        :loading="submitting"
        :disabled="!canComplete"
        @click="handleComplete"
      >
        <v-icon start>mdi-check</v-icon>
        Complete Receipt
      </v-btn>

      <v-btn
        v-else
        color="success"
        size="large"
        :loading="submitting"
        :disabled="!canComplete || paymentAmount <= 0"
        @click="handleCompleteWithPayment"
      >
        <v-icon start>mdi-cash-check</v-icon>
        Complete with Payment ({{ formatIDR(paymentAmount) }})
      </v-btn>
    </v-card-actions>
  </div>
</template>

<style scoped lang="scss">
.receipt-form {
  .totals-table {
    background: transparent;

    td {
      border: none;
      padding: 4px 0;
    }
  }

  .discrepancies-summary {
    ul {
      margin: 0;
      list-style-type: disc;
    }
  }
}
</style>
