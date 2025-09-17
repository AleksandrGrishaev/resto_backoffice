<!-- src/views/pos/order/dialogs/CheckoutDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6">Checkout Order</v-card-title>

      <v-card-text>
        <div v-if="order && calculations">
          <!-- Order Summary -->
          <div class="order-summary mb-4">
            <h4 class="text-subtitle-1 mb-2">Order Summary</h4>
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${{ calculations.subtotal.toFixed(2) }}</span>
            </div>
            <div class="summary-row">
              <span>Discounts:</span>
              <span class="text-success">-${{ calculations.totalDiscounts.toFixed(2) }}</span>
            </div>
            <div class="summary-row">
              <span>Tax:</span>
              <span>${{ calculations.totalTaxes.toFixed(2) }}</span>
            </div>
            <v-divider class="my-2" />
            <div class="summary-row font-weight-bold">
              <span>Total:</span>
              <span>${{ calculations.finalTotal.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Payment Method -->
          <div class="payment-method mb-4">
            <h4 class="text-subtitle-1 mb-2">Payment Method</h4>
            <v-radio-group v-model="paymentMethod" inline>
              <v-radio value="cash">
                <template #label>
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-cash" class="mr-1" />
                    Cash
                  </div>
                </template>
              </v-radio>

              <v-radio value="card">
                <template #label>
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-credit-card" class="mr-1" />
                    Card
                  </div>
                </template>
              </v-radio>

              <v-radio value="qr">
                <template #label>
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-qrcode" class="mr-1" />
                    QR Code
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
          </div>

          <!-- Cash Payment -->
          <div v-if="paymentMethod === 'cash'" class="cash-payment mb-4">
            <v-text-field
              v-model="cashReceived"
              label="Cash Received"
              prefix="$"
              type="number"
              :min="calculations.finalTotal"
              step="0.01"
            />

            <div
              v-if="cashReceived && Number(cashReceived) >= calculations.finalTotal"
              class="change-display"
            >
              <div class="summary-row text-h6">
                <span>Change:</span>
                <span class="text-success">
                  ${{ (Number(cashReceived) - calculations.finalTotal).toFixed(2) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn
          color="primary"
          :disabled="!canConfirm"
          @click="$emit('confirm', { method: paymentMethod, amount: cashReceived })"
        >
          Complete Payment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  modelValue: boolean
  order: any
  calculations: any
}

const props = defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [paymentData: { method: string; amount?: string }]
}>()

const paymentMethod = ref('cash')
const cashReceived = ref('')

const canConfirm = computed(() => {
  if (props.paymentMethod === 'cash') {
    return Number(cashReceived.value) >= (props.calculations?.finalTotal || 0)
  }
  return true
})
</script>

<style scoped>
.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.change-display {
  padding: 12px;
  background-color: rgba(var(--v-theme-success), 0.1);
  border-radius: 4px;
  margin-top: 16px;
}
</style>
