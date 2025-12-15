<script setup lang="ts">
// src/views/pos/receipts/PosReceiptsView.vue
// Sprint 6: POS Receipt Module - Main View (ONLINE ONLY)

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePosReceipt } from '@/stores/pos/receipts'
import PendingOrdersList from './components/PendingOrdersList.vue'
import ReceiptForm from './components/ReceiptForm.vue'
import ConfirmReceiptDialog from './dialogs/ConfirmReceiptDialog.vue'

const router = useRouter()

const {
  pendingOrders,
  selectedOrder,
  formData,
  isOnline,
  isLoading,
  isSubmitting,
  error,
  hasSelectedOrder,
  canComplete,
  loadOrders,
  selectOrder,
  clearSelection,
  updateItemQuantity,
  updateItemPrice,
  updateItemPackagePrice,
  updateItemPackageQuantity,
  updateItemLineTotal,
  completeReceipt,
  completeReceiptWithPayment
} = usePosReceipt()

// =============================================
// CONFIRMATION DIALOG STATE
// =============================================

const showConfirmDialog = ref(false)
const pendingPaymentAmount = ref(0)
const isPaymentMode = ref(false)

// Load orders on mount
onMounted(async () => {
  await loadOrders()
})

// Handle order selection
async function handleSelectOrder(orderId: string) {
  await selectOrder(orderId)
}

// =============================================
// RECEIPT COMPLETION FLOW
// =============================================

// Open confirmation dialog (without payment)
function handleComplete() {
  isPaymentMode.value = false
  pendingPaymentAmount.value = 0
  showConfirmDialog.value = true
}

// Open confirmation dialog (with payment)
function handleCompleteWithPayment(amount: number) {
  isPaymentMode.value = true
  pendingPaymentAmount.value = amount
  showConfirmDialog.value = true
}

// Actually complete the receipt after confirmation
async function handleConfirmComplete() {
  if (isPaymentMode.value) {
    const result = await completeReceiptWithPayment(pendingPaymentAmount.value)
    if (result.success) {
      showConfirmDialog.value = false
      // TODO: Show success snackbar
    }
  } else {
    const success = await completeReceipt()
    if (success) {
      showConfirmDialog.value = false
      // TODO: Show success snackbar
    }
  }
}

// Cancel confirmation
function handleCancelConfirm() {
  showConfirmDialog.value = false
}

// Go back to POS main view
function goBack() {
  router.push('/pos')
}
</script>

<template>
  <v-container fluid class="pos-receipts-view pa-4">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
      <h1 class="text-h5 ml-2">Goods Receipt</h1>
      <v-spacer />

      <!-- Online Status -->
      <v-chip :color="isOnline ? 'success' : 'error'" variant="flat" size="small">
        <v-icon start size="small">
          {{ isOnline ? 'mdi-wifi' : 'mdi-wifi-off' }}
        </v-icon>
        {{ isOnline ? 'Online' : 'Offline' }}
      </v-chip>
    </div>

    <!-- Offline Warning -->
    <v-alert v-if="!isOnline" type="warning" variant="tonal" class="mb-4">
      <v-icon start>mdi-wifi-off</v-icon>
      Internet connection required for goods receipt. Please connect to continue.
    </v-alert>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- Main Content -->
    <v-row>
      <!-- Left Panel: Orders List -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>Pending Orders</span>
            <v-spacer />
            <v-btn
              icon="mdi-refresh"
              variant="text"
              size="small"
              :loading="isLoading"
              :disabled="!isOnline"
              @click="loadOrders"
            />
          </v-card-title>

          <v-divider />

          <PendingOrdersList
            :orders="pendingOrders"
            :selected-order-id="selectedOrder?.id"
            :loading="isLoading"
            :disabled="!isOnline"
            @select="handleSelectOrder"
          />
        </v-card>
      </v-col>

      <!-- Right Panel: Receipt Form -->
      <v-col cols="12" md="8">
        <v-card v-if="hasSelectedOrder && formData">
          <v-card-title class="d-flex align-center">
            <span>Receipt: {{ formData.orderNumber }}</span>
            <v-spacer />
            <v-btn icon="mdi-close" variant="text" size="small" @click="clearSelection" />
          </v-card-title>

          <v-card-subtitle>Supplier: {{ formData.supplierName }}</v-card-subtitle>

          <v-divider />

          <ReceiptForm
            :form-data="formData"
            :submitting="isSubmitting"
            :can-complete="canComplete"
            @update:quantity="updateItemQuantity"
            @update:package-quantity="updateItemPackageQuantity"
            @update:price="updateItemPrice"
            @update:package-price="updateItemPackagePrice"
            @update:line-total="updateItemLineTotal"
            @complete="handleComplete"
            @complete-with-payment="handleCompleteWithPayment"
          />
        </v-card>

        <!-- Empty State -->
        <v-card v-else class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-package-variant</v-icon>
          <h3 class="text-h6 text-grey">Select an order to start receipt</h3>
          <p class="text-body-2 text-grey mt-2">Choose a pending order from the list on the left</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirmation Dialog -->
    <ConfirmReceiptDialog
      v-model="showConfirmDialog"
      :form-data="formData"
      :submitting="isSubmitting"
      :with-payment="isPaymentMode"
      :payment-amount="pendingPaymentAmount"
      @confirm="handleConfirmComplete"
      @cancel="handleCancelConfirm"
    />
  </v-container>
</template>

<style scoped lang="scss">
.pos-receipts-view {
  min-height: 100vh;
  background: rgb(var(--v-theme-surface-variant));
}
</style>
