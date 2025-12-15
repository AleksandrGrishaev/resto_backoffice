<script setup lang="ts">
// src/views/pos/receipts/dialogs/ConfirmReceiptDialog.vue
// Sprint 6: POS Receipt Module - Confirmation Dialog

import { computed } from 'vue'
import type { ReceiptFormData } from '@/stores/pos/receipts'
import { formatIDR } from '@/utils/currency'

interface Props {
  modelValue: boolean
  formData: ReceiptFormData | null
  submitting?: boolean
  withPayment?: boolean
  paymentAmount?: number
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  submitting: false,
  withPayment: false,
  paymentAmount: 0
})

const emit = defineEmits<Emits>()

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const itemsCount = computed(() => props.formData?.items.length ?? 0)

const discrepancyItems = computed(() => {
  if (!props.formData) return []
  return props.formData.items.filter(item => item.hasDiscrepancy)
})

const hasDiscrepancies = computed(() => discrepancyItems.value.length > 0)

const totalDifference = computed(() => {
  if (!props.formData) return 0
  return props.formData.actualTotal - props.formData.expectedTotal
})

const paymentStatus = computed(() => {
  if (!props.withPayment) return null

  const diff = props.paymentAmount - (props.formData?.actualTotal ?? 0)
  if (Math.abs(diff) < 1) return { type: 'exact', diff: 0 }
  if (diff > 0) return { type: 'over', diff }
  return { type: 'under', diff: Math.abs(diff) }
})

// =============================================
// METHODS
// =============================================

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="500" persistent>
    <v-card v-if="formData">
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-checkbox-marked-circle-outline</v-icon>
        Confirm Receipt
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Order Info -->
        <div class="mb-4">
          <div class="text-subtitle-2 text-grey mb-1">Order</div>
          <div class="text-h6">{{ formData.orderNumber }}</div>
          <div class="text-body-2 text-grey">{{ formData.supplierName }}</div>
        </div>

        <!-- Items Summary -->
        <v-alert
          :type="hasDiscrepancies ? 'warning' : 'success'"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          <div class="d-flex align-center justify-space-between">
            <span>
              <v-icon start size="small">
                {{ hasDiscrepancies ? 'mdi-alert' : 'mdi-check-circle' }}
              </v-icon>
              {{ itemsCount }} items
            </span>
            <span v-if="hasDiscrepancies" class="text-warning">
              {{ discrepancyItems.length }} with discrepancies
            </span>
          </div>
        </v-alert>

        <!-- Discrepancy Details -->
        <div v-if="hasDiscrepancies" class="discrepancy-list mb-4">
          <div class="text-subtitle-2 text-grey mb-2">Discrepancies:</div>
          <v-list density="compact" class="bg-grey-lighten-4 rounded">
            <v-list-item v-for="item in discrepancyItems" :key="item.orderItemId" density="compact">
              <v-list-item-title class="text-body-2">
                {{ item.productName }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                <span v-if="item.discrepancyType === 'quantity' || item.discrepancyType === 'both'">
                  Qty: {{ item.orderedQuantity }} → {{ item.receivedQuantity }} {{ item.unit }}
                </span>
                <span v-if="item.discrepancyType === 'both'">,</span>
                <span v-if="item.discrepancyType === 'price' || item.discrepancyType === 'both'">
                  Price changed
                </span>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>

        <!-- Totals -->
        <div class="totals-section pa-3 bg-grey-lighten-4 rounded mb-4">
          <div class="d-flex justify-space-between mb-2">
            <span class="text-body-2">Expected Total:</span>
            <span class="text-body-2">{{ formatIDR(formData.expectedTotal) }}</span>
          </div>
          <div class="d-flex justify-space-between mb-2">
            <span class="text-body-2 font-weight-bold">Actual Total:</span>
            <span class="text-h6 font-weight-bold">{{ formatIDR(formData.actualTotal) }}</span>
          </div>
          <v-divider v-if="totalDifference !== 0" class="my-2" />
          <div v-if="totalDifference !== 0" class="d-flex justify-space-between">
            <span class="text-body-2">Difference:</span>
            <span
              class="text-body-2 font-weight-medium"
              :class="totalDifference > 0 ? 'text-error' : 'text-success'"
            >
              {{ totalDifference > 0 ? '+' : '' }}{{ formatIDR(totalDifference) }}
            </span>
          </div>
        </div>

        <!-- Payment Info (if applicable) -->
        <div v-if="withPayment" class="payment-section pa-3 bg-primary-lighten-5 rounded">
          <div class="d-flex align-center mb-2">
            <v-icon start color="primary" size="small">mdi-cash</v-icon>
            <span class="text-subtitle-2">Payment</span>
          </div>

          <div class="d-flex justify-space-between mb-2">
            <span class="text-body-2">Payment Amount:</span>
            <span class="text-h6 font-weight-bold text-primary">
              {{ formatIDR(paymentAmount) }}
            </span>
          </div>

          <!-- Payment Status -->
          <v-alert
            v-if="paymentStatus"
            :type="
              paymentStatus.type === 'exact'
                ? 'success'
                : paymentStatus.type === 'over'
                  ? 'warning'
                  : 'error'
            "
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            <template v-if="paymentStatus.type === 'exact'">
              <v-icon start size="small">mdi-check</v-icon>
              Exact payment
            </template>
            <template v-else-if="paymentStatus.type === 'over'">
              <v-icon start size="small">mdi-alert</v-icon>
              Overpayment: {{ formatIDR(paymentStatus.diff) }}
            </template>
            <template v-else>
              <v-icon start size="small">mdi-alert</v-icon>
              Underpayment: {{ formatIDR(paymentStatus.diff) }}
            </template>
          </v-alert>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="submitting" @click="handleCancel">Cancel</v-btn>

        <v-spacer />

        <v-btn
          :color="withPayment ? 'success' : 'primary'"
          variant="flat"
          :loading="submitting"
          @click="handleConfirm"
        >
          <v-icon start>{{ withPayment ? 'mdi-cash-check' : 'mdi-check' }}</v-icon>
          {{ withPayment ? 'Complete with Payment' : 'Complete Receipt' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.discrepancy-list {
  max-height: 200px;
  overflow-y: auto;
}

.totals-section,
.payment-section {
  border: 1px solid rgba(var(--v-border-color), 0.12);
}

.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style>
