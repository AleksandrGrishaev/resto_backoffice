<script setup lang="ts">
import { useBillStore } from '@/stores/bill.store'
import { usePaymentStore } from '@/stores/payment/payment.store'
import { formatAmount } from '@/utils/formatter'

const billStore = useBillStore()
const paymentStore = usePaymentStore()
</script>

<template>
  <v-card variant="outlined">
    <v-card-title>Bill Summary</v-card-title>
    <v-card-text>
      <div class="d-flex flex-column">
        <!-- Основные суммы -->
        <div class="d-flex justify-space-between mb-2">
          <span>Subtotal:</span>
          <span>{{ formatAmount(billStore.billSubtotal) }}</span>
        </div>

        <!-- Налоги -->
        <div class="d-flex justify-space-between mb-2">
          <span>Service Tax (5%):</span>
          <span>{{ formatAmount(billStore.billTaxes.serviceTax) }}</span>
        </div>

        <div class="d-flex justify-space-between mb-2">
          <span>Government Tax (10%):</span>
          <span>{{ formatAmount(billStore.billTaxes.governmentTax) }}</span>
        </div>

        <v-divider class="my-2" />

        <!-- Общая сумма -->
        <div class="d-flex justify-space-between mb-2">
          <span class="text-h6">Total:</span>
          <span class="text-h6">{{ formatAmount(billStore.billTotal) }}</span>
        </div>

        <!-- Информация об оплате -->
        <template v-if="billStore.activeBill">
          <div class="d-flex justify-space-between mb-2">
            <span class="text-body-2">Already Paid:</span>
            <span
              :class="[
                'text-body-2',
                paymentStore.getTotalPaidAmount(billStore.activeBill.id) > 0 ? 'text-success' : ''
              ]"
            >
              {{ formatAmount(paymentStore.getTotalPaidAmount(billStore.activeBill.id)) }}
            </span>
          </div>

          <div class="d-flex justify-space-between">
            <span class="text-body-1 font-weight-medium">Remaining:</span>
            <span class="text-body-1 font-weight-medium">
              {{
                formatAmount(
                  billStore.billTotal - paymentStore.getTotalPaidAmount(billStore.activeBill.id)
                )
              }}
            </span>
          </div>
        </template>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.text-success {
  color: var(--color-success);
}
</style>
