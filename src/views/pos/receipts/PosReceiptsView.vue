<script setup lang="ts">
// src/views/pos/receipts/PosReceiptsView.vue
// Sprint 6: POS Receipt Module - Table-based Design

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePosReceipt, getPaymentStatusDisplay } from '@/stores/pos/receipts'
import { formatIDR } from '@/utils'
import ReceiptDialog from './dialogs/ReceiptDialog.vue'
import type { PendingOrderForReceipt } from '@/stores/pos/receipts'

const router = useRouter()

const {
  pendingOrders,
  selectedOrder,
  formData,
  isOnline,
  isLoading,
  isSubmitting,
  error,
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
// LOCAL STATE
// =============================================

const showReceiptDialog = ref(false)
const searchQuery = ref('')

// =============================================
// TABLE CONFIGURATION
// =============================================

const headers = [
  { title: 'Order #', key: 'orderNumber', sortable: true, width: '140px' },
  { title: 'Supplier', key: 'supplierName', sortable: true },
  { title: 'Items', key: 'itemsCount', sortable: false, width: '80px', align: 'center' as const },
  { title: 'Amount', key: 'totalAmount', sortable: true, width: '140px', align: 'end' as const },
  { title: 'Payment', key: 'paymentStatus', sortable: false, width: '140px' },
  { title: 'Date', key: 'createdAt', sortable: true, width: '120px' },
  { title: '', key: 'actions', sortable: false, width: '100px', align: 'center' as const }
]

// =============================================
// COMPUTED
// =============================================

const filteredOrders = computed(() => {
  if (!searchQuery.value) return pendingOrders.value

  const query = searchQuery.value.toLowerCase()
  return pendingOrders.value.filter(
    order =>
      order.orderNumber.toLowerCase().includes(query) ||
      order.supplierName.toLowerCase().includes(query)
  )
})

const ordersWithPaymentInfo = computed(
  () => pendingOrders.value.filter(o => o.hasPendingPayment).length
)

// =============================================
// METHODS
// =============================================

// Load orders on mount
onMounted(async () => {
  await loadOrders()
})

// Handle order selection - open dialog
async function handleSelectOrder(order: PendingOrderForReceipt) {
  await selectOrder(order.id)
  showReceiptDialog.value = true
}

// Close dialog
function handleCloseDialog() {
  showReceiptDialog.value = false
  clearSelection()
}

// Complete receipt from dialog
async function handleCompleteReceipt() {
  const success = await completeReceipt()
  if (success) {
    showReceiptDialog.value = false
  }
}

// Complete receipt with payment from dialog
async function handleCompleteWithPayment(amount: number) {
  const result = await completeReceiptWithPayment(amount)
  if (result.success) {
    showReceiptDialog.value = false
  }
}

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short'
  })
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

    <!-- Main Content Card -->
    <v-card>
      <!-- Card Header with Search -->
      <v-card-title class="d-flex align-center pa-4">
        <span>Pending Orders</span>
        <v-chip class="ml-2" size="small" color="primary" variant="tonal">
          {{ pendingOrders.length }}
        </v-chip>
        <v-chip
          v-if="ordersWithPaymentInfo > 0"
          class="ml-2"
          size="small"
          color="success"
          variant="tonal"
        >
          {{ ordersWithPaymentInfo }} with payment
        </v-chip>

        <v-spacer />

        <v-text-field
          v-model="searchQuery"
          placeholder="Search orders..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 250px"
          class="mr-2"
        />

        <v-btn
          icon="mdi-refresh"
          variant="text"
          :loading="isLoading"
          :disabled="!isOnline"
          @click="loadOrders"
        />
      </v-card-title>

      <v-divider />

      <!-- Orders Table -->
      <v-data-table
        :headers="headers"
        :items="filteredOrders"
        :loading="isLoading"
        density="comfortable"
        :items-per-page="25"
        :items-per-page-options="[10, 25, 50]"
        hover
        class="orders-table"
        @click:row="
          (_event: Event, { item }: { item: PendingOrderForReceipt }) => handleSelectOrder(item)
        "
      >
        <!-- Order Number Column -->
        <template #[`item.orderNumber`]="{ item }">
          <div class="font-weight-medium">{{ item.orderNumber }}</div>
        </template>

        <!-- Supplier Column -->
        <template #[`item.supplierName`]="{ item }">
          <div>{{ item.supplierName }}</div>
        </template>

        <!-- Items Count Column -->
        <template #[`item.itemsCount`]="{ item }">
          <v-chip size="small" variant="outlined">{{ item.items.length }}</v-chip>
        </template>

        <!-- Amount Column -->
        <template #[`item.totalAmount`]="{ item }">
          <div class="font-weight-medium">{{ formatIDR(item.totalAmount) }}</div>
          <v-chip v-if="item.isEstimatedTotal" size="x-small" color="warning" variant="flat">
            Est.
          </v-chip>
        </template>

        <!-- Payment Status Column -->
        <template #[`item.paymentStatus`]="{ item }">
          <v-chip :color="getPaymentStatusDisplay(item).color" size="small" variant="tonal">
            <v-icon :icon="getPaymentStatusDisplay(item).icon" size="small" start />
            {{ getPaymentStatusDisplay(item).shortLabel }}
          </v-chip>
        </template>

        <!-- Date Column -->
        <template #[`item.createdAt`]="{ item }">
          <span class="text-body-2">{{ formatDate(item.createdAt) }}</span>
        </template>

        <!-- Actions Column -->
        <template #[`item.actions`]="{ item }">
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            :disabled="!isOnline"
            @click.stop="handleSelectOrder(item)"
          >
            <v-icon start>mdi-package-down</v-icon>
            Receive
          </v-btn>
        </template>

        <!-- Loading state -->
        <template #loading>
          <v-skeleton-loader type="table-row@5" />
        </template>

        <!-- No data state -->
        <template #no-data>
          <div class="text-center pa-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">
              mdi-package-variant-closed
            </v-icon>
            <h3 class="text-h6 text-grey mb-2">No pending orders</h3>
            <p class="text-body-2 text-grey">
              Orders with status "Sent" and payment terms "On Delivery" will appear here
            </p>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Receipt Dialog -->
    <ReceiptDialog
      v-model="showReceiptDialog"
      :order="selectedOrder"
      :form-data="formData"
      :submitting="isSubmitting"
      @close="handleCloseDialog"
      @update:quantity="updateItemQuantity"
      @update:package-quantity="updateItemPackageQuantity"
      @update:price="updateItemPrice"
      @update:package-price="updateItemPackagePrice"
      @update:line-total="updateItemLineTotal"
      @complete="handleCompleteReceipt"
      @complete-with-payment="handleCompleteWithPayment"
    />
  </v-container>
</template>

<style scoped lang="scss">
.pos-receipts-view {
  min-height: 100vh;
  background: rgb(var(--v-theme-surface-variant));
}

.orders-table {
  :deep(.v-data-table__tr) {
    cursor: pointer;

    &:hover {
      background: rgba(var(--v-theme-primary), 0.04) !important;
    }
  }
}
</style>
