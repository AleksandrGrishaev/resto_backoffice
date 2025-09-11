<!-- src/views/pos/order/OrderSection.vue -->
<template>
  <div class="order-section">
    <!-- Order Header -->
    <div class="order-header pa-4">
      <div class="d-flex align-center justify-space-between">
        <div>
          <h3 class="text-h6">
            {{ currentOrderTitle }}
          </h3>
          <div class="text-caption text-medium-emphasis">
            {{ currentOrderSubtitle }}
          </div>
        </div>
        <div class="order-actions">
          <v-btn
            variant="outlined"
            size="small"
            :disabled="!hasActiveOrder"
            @click="handleSaveBill"
          >
            Save Bill
          </v-btn>
          <v-btn
            variant="outlined"
            size="small"
            class="ml-2"
            :disabled="!hasActiveOrder"
            @click="handlePrintBill"
          >
            Print Bill
          </v-btn>
        </div>
      </div>
    </div>

    <v-divider />

    <!-- Bill Tabs -->
    <div v-if="hasActiveOrder" class="bill-tabs pa-2">
      <v-tabs v-model="activeBillTab" color="primary" density="compact">
        <v-tab v-for="(bill, index) in mockBills" :key="bill.id" :value="bill.id">
          <v-icon
            :icon="index === 0 ? 'mdi-receipt' : 'mdi-receipt-outline'"
            class="me-2"
            size="16"
          />
          {{ bill.name }}
          <v-badge
            v-if="bill.items.length > 0"
            :content="bill.items.length"
            inline
            color="primary"
            class="ml-2"
          />
        </v-tab>
        <v-tab value="add" disabled>
          <v-icon icon="mdi-plus" class="me-2" size="16" />
          Add Bill
        </v-tab>
      </v-tabs>
    </div>

    <v-divider v-if="hasActiveOrder" />

    <!-- Order Items -->
    <div class="order-items flex-grow-1">
      <div v-if="!hasActiveOrder" class="empty-state pa-4 text-center">
        <v-icon icon="mdi-table-chair" size="48" class="text-medium-emphasis mb-2" />
        <div class="text-body-2 text-medium-emphasis">Create or select an order to start</div>
      </div>

      <div v-else-if="currentBillItems.length === 0" class="empty-state pa-4 text-center">
        <v-icon icon="mdi-cart-outline" size="48" class="text-medium-emphasis mb-2" />
        <div class="text-body-2 text-medium-emphasis">Add items to bill from the menu</div>
      </div>

      <div v-else class="items-list pa-2">
        <v-card
          v-for="(item, index) in currentBillItems"
          :key="`${item.id}-${index}`"
          variant="outlined"
          class="mb-2 order-item-card"
        >
          <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between">
              <div class="item-details flex-grow-1">
                <div class="text-subtitle-2 font-weight-bold">
                  {{ item.name }}
                </div>
                <div v-if="item.variant" class="text-caption text-medium-emphasis">
                  {{ item.variant }}
                </div>
                <div v-if="item.notes" class="text-caption text-warning">
                  Note: {{ item.notes }}
                </div>
              </div>
              <div class="item-controls d-flex align-center">
                <v-btn icon="mdi-minus" size="small" variant="text" @click="decrementItem(index)" />
                <span class="mx-2 text-subtitle-2 font-weight-bold">
                  {{ item.quantity }}
                </span>
                <v-btn icon="mdi-plus" size="small" variant="text" @click="incrementItem(index)" />
              </div>
              <div class="item-price ml-3 text-right">
                <div class="text-subtitle-2 font-weight-bold">
                  {{ formatPrice(item.price * item.quantity) }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- Order Summary -->
    <div v-if="hasActiveOrder.value && currentBillItems.length > 0" class="order-summary">
      <v-divider />
      <div class="pa-4">
        <div class="d-flex justify-space-between mb-2">
          <span class="text-body-2">Subtotal</span>
          <span class="text-body-2">{{ formatPrice(subtotal.value) }}</span>
        </div>
        <div class="d-flex justify-space-between mb-2">
          <span class="text-body-2">Service Tax (5%)</span>
          <span class="text-body-2">{{ formatPrice(serviceTax.value) }}</span>
        </div>
        <div class="d-flex justify-space-between mb-3">
          <span class="text-body-2">Government Tax (10%)</span>
          <span class="text-body-2">{{ formatPrice(governmentTax.value) }}</span>
        </div>
        <v-divider class="mb-3" />
        <div class="d-flex justify-space-between">
          <span class="text-h6 font-weight-bold">Total</span>
          <span class="text-h6 font-weight-bold">{{ formatPrice(total.value) }}</span>
        </div>

        <!-- Checkout Button -->
        <v-btn color="primary" size="large" block class="mt-4" @click="handleCheckout">
          Checkout
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'OrderSection'

// Injected data from parent (PosMainView)
const mockOrderItems = inject('mockOrderItems', ref([]))

// State
const activeBillTab = ref('bill1')

// Mock bills structure
const mockBills = ref([
  {
    id: 'bill1',
    name: 'Bill 1',
    items: mockOrderItems.value
  }
])

// Computed
const hasActiveOrder = computed(() => {
  return mockOrderItems.value.length > 0
})

const currentOrderTitle = computed(() => {
  // TODO: интеграция с реальными stores
  return hasActiveOrder.value ? 'Table Order' : 'No Order Selected'
})

const currentOrderSubtitle = computed(() => {
  // TODO: интеграция с реальными stores
  return hasActiveOrder.value ? 'Order #001' : 'Select a table or create a new order'
})

const currentBillItems = computed(() => {
  const currentBill = mockBills.value.find(bill => bill.id === activeBillTab.value)
  return currentBill ? currentBill.items : []
})

const subtotal = computed(() => {
  return currentBillItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
})

const serviceTax = computed(() => {
  return subtotal.value * 0.05
})

const governmentTax = computed(() => {
  return subtotal.value * 0.1
})

const total = computed(() => {
  return subtotal.value + serviceTax.value + governmentTax.value
})

// Methods
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const incrementItem = (index: number) => {
  if (mockOrderItems.value[index]) {
    mockOrderItems.value[index].quantity += 1
  }
}

const decrementItem = (index: number) => {
  if (mockOrderItems.value[index]) {
    if (mockOrderItems.value[index].quantity > 1) {
      mockOrderItems.value[index].quantity -= 1
    } else {
      // Удаляем позицию если количество становится 0
      mockOrderItems.value.splice(index, 1)
    }
  }
}

const handleSaveBill = () => {
  DebugUtils.debug(MODULE_NAME, 'Saving bill')
  console.log('Save bill clicked')
  // TODO: Сохранение заказа
}

const handlePrintBill = () => {
  DebugUtils.debug(MODULE_NAME, 'Printing bill')
  console.log('Print bill clicked')
  // TODO: Печать чека
}

const handleCheckout = () => {
  DebugUtils.debug(MODULE_NAME, 'Checkout clicked')
  console.log('Checkout clicked - total:', total.value)
  // TODO: Переход к оплате
}
</script>

<style scoped>
.order-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--v-theme-surface);
}

.order-header {
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.02);
}

.bill-tabs {
  flex-shrink: 0;
}

.order-items {
  flex: 1;
  overflow-y: auto;
}

.order-summary {
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.02);
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.order-item-card {
  transition: all 0.2s ease;
}

.order-item-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.item-controls {
  min-width: 100px;
}

.item-price {
  min-width: 80px;
}

/* Custom scrollbar */
.order-items::-webkit-scrollbar {
  width: 6px;
}

.order-items::-webkit-scrollbar-track {
  background: transparent;
}

.order-items::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.order-items::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
