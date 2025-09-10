<!-- src/views/pos/components/OrderSection.vue -->
<template>
  <div class="order-section">
    <!-- Order Header -->
    <div class="order-header pa-3">
      <div v-if="currentOrder" class="d-flex align-center justify-space-between">
        <div>
          <div class="text-subtitle-1 font-weight-bold">
            {{ currentOrder.orderNumber }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ getOrderTypeText(currentOrder.type) }}
            <span v-if="currentOrder.tableId">• {{ getTableName(currentOrder.tableId) }}</span>
          </div>
        </div>

        <v-chip :color="getOrderStatusColor(currentOrder.status)" size="small" variant="flat">
          {{ getOrderStatusText(currentOrder.status) }}
        </v-chip>
      </div>

      <div v-else class="text-center text-medium-emphasis">
        <v-icon size="48" class="mb-2">mdi-cart-outline</v-icon>
        <div>Выберите или создайте заказ</div>
      </div>
    </div>

    <v-divider />

    <!-- Bills Tabs -->
    <div v-if="currentOrder && currentOrder.bills.length > 0" class="bills-section">
      <v-tabs v-model="activeTab" density="compact" class="bills-tabs">
        <v-tab
          v-for="(bill, index) in currentOrder.bills"
          :key="bill.id"
          :value="index"
          size="small"
        >
          <span>{{ bill.name }}</span>
          <v-chip
            v-if="bill.items.filter(i => i.status === 'active').length > 0"
            size="x-small"
            color="primary"
            class="ms-2"
          >
            {{ bill.items.filter(i => i.status === 'active').length }}
          </v-chip>
        </v-tab>

        <v-btn
          icon="mdi-plus"
          size="x-small"
          variant="text"
          :loading="ordersStore.loading.create"
          @click="addNewBill"
        />
      </v-tabs>

      <!-- Active Bill Content -->
      <div class="bill-content">
        <div v-if="activeBill" class="pa-3">
          <!-- Bill Items -->
          <div
            v-if="activeBill.items.filter(i => i.status === 'active').length > 0"
            class="items-list"
          >
            <div
              v-for="item in activeBill.items.filter(i => i.status === 'active')"
              :key="item.id"
              class="item-row mb-2"
            >
              <v-card variant="outlined" class="pa-2">
                <div class="d-flex align-center">
                  <!-- Item Info -->
                  <div class="flex-grow-1">
                    <div class="text-subtitle-2">{{ item.menuItemName }}</div>
                    <div class="text-caption text-medium-emphasis">
                      ₽{{ item.unitPrice }} × {{ item.quantity }}
                    </div>
                  </div>

                  <!-- Quantity Controls -->
                  <div class="quantity-controls me-3">
                    <v-btn
                      icon="mdi-minus"
                      size="x-small"
                      variant="outlined"
                      @click="decreaseQuantity(item)"
                    />
                    <span class="mx-2 text-body-2">{{ item.quantity }}</span>
                    <v-btn
                      icon="mdi-plus"
                      size="x-small"
                      variant="outlined"
                      @click="increaseQuantity(item)"
                    />
                  </div>

                  <!-- Total Price -->
                  <div class="item-total me-2">
                    <div class="text-body-1 font-weight-bold">₽{{ item.totalPrice }}</div>
                  </div>

                  <!-- Remove Button -->
                  <v-btn
                    icon="mdi-close"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeItem(item)"
                  />
                </div>
              </v-card>
            </div>
          </div>

          <!-- Empty Bill -->
          <div v-else class="text-center pa-8 text-medium-emphasis">
            <v-icon size="48" class="mb-2">mdi-cart-outline</v-icon>
            <div>Счет пуст</div>
            <div class="text-caption">Добавьте товары из меню</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Summary -->
    <div v-if="currentOrder" class="order-summary mt-auto">
      <v-divider />

      <div class="pa-3">
        <div class="summary-line d-flex justify-space-between">
          <span>Подытог:</span>
          <span>₽{{ currentOrder.totalAmount.toFixed(2) }}</span>
        </div>

        <div
          v-if="currentOrder.discountAmount > 0"
          class="summary-line d-flex justify-space-between text-success"
        >
          <span>Скидка:</span>
          <span>-₽{{ currentOrder.discountAmount.toFixed(2) }}</span>
        </div>

        <div class="summary-line d-flex justify-space-between">
          <span>Налог (10%):</span>
          <span>₽{{ currentOrder.taxAmount.toFixed(2) }}</span>
        </div>

        <v-divider class="my-2" />

        <div class="summary-line d-flex justify-space-between text-h6 font-weight-bold">
          <span>Итого:</span>
          <span>₽{{ currentOrder.finalAmount.toFixed(2) }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="mt-3">
          <v-btn
            v-if="canSendToKitchen"
            color="info"
            block
            class="mb-2"
            :loading="ordersStore.loading.update"
            @click="sendToKitchen"
          >
            <v-icon start>mdi-chef-hat</v-icon>
            Отправить на кухню
          </v-btn>

          <v-btn
            v-if="canProcessPayment"
            color="success"
            block
            size="large"
            @click="processPayment"
          >
            <v-icon start>mdi-cash</v-icon>
            Оплата
          </v-btn>
        </div>
      </div>
    </div>
  </div>

  <!-- Payment Dialog -->
  <PaymentDialog
    v-model="showPaymentDialog"
    :order-id="currentOrder?.id"
    @payment-completed="handlePaymentCompleted"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import type { PosBillItem, OrderStatus, OrderType } from '@/stores/pos/types'

// components
import PaymentDialog from './PaymentDialog.vue'

// Stores
const ordersStore = usePosOrdersStore()
const tablesStore = usePosTablesStore()

// State
const activeTab = ref(0)
const showPaymentDialog = ref(false)

// Computed
const currentOrder = computed(() => ordersStore.currentOrder)
const activeBill = computed(() => {
  if (!currentOrder.value) return null
  return currentOrder.value.bills[activeTab.value] || null
})

const canSendToKitchen = computed(() => {
  if (!currentOrder.value) return false
  return currentOrder.value.status === 'draft' && hasActiveItems.value
})

const canProcessPayment = computed(() => {
  if (!currentOrder.value) return false
  return (
    ['confirmed', 'preparing', 'ready', 'served'].includes(currentOrder.value.status) &&
    hasActiveItems.value
  )
})

const hasActiveItems = computed(() => {
  if (!currentOrder.value) return false
  return currentOrder.value.bills.some(bill => bill.items.some(item => item.status === 'active'))
})

// Watchers
watch(
  () => ordersStore.activeBillId,
  newBillId => {
    if (newBillId && currentOrder.value) {
      const billIndex = currentOrder.value.bills.findIndex(b => b.id === newBillId)
      if (billIndex !== -1) {
        activeTab.value = billIndex
      }
    }
  }
)

watch(activeTab, newIndex => {
  if (currentOrder.value && currentOrder.value.bills[newIndex]) {
    ordersStore.selectBill(currentOrder.value.bills[newIndex].id)
  }
})

// Methods
async function addNewBill() {
  if (!currentOrder.value) return

  try {
    const billName = `Счет ${currentOrder.value.bills.length + 1}`
    const result = await ordersStore.addBillToOrder(currentOrder.value.id, billName)

    if (result.success) {
      // Переключаемся на новый счет
      activeTab.value = currentOrder.value.bills.length - 1
      console.log('✅ Добавлен новый счет')
    }
  } catch (error) {
    console.error('❌ Ошибка добавления счета:', error)
  }
}

async function increaseQuantity(item: PosBillItem) {
  if (!currentOrder.value || !activeBill.value) return

  try {
    await ordersStore.updateItemQuantity(
      currentOrder.value.id,
      activeBill.value.id,
      item.id,
      item.quantity + 1
    )
  } catch (error) {
    console.error('❌ Ошибка изменения количества:', error)
  }
}

async function decreaseQuantity(item: PosBillItem) {
  if (!currentOrder.value || !activeBill.value) return

  try {
    if (item.quantity <= 1) {
      await removeItem(item)
    } else {
      await ordersStore.updateItemQuantity(
        currentOrder.value.id,
        activeBill.value.id,
        item.id,
        item.quantity - 1
      )
    }
  } catch (error) {
    console.error('❌ Ошибка изменения количества:', error)
  }
}

async function removeItem(item: PosBillItem) {
  if (!currentOrder.value || !activeBill.value) return

  try {
    await ordersStore.removeItemFromBill(currentOrder.value.id, activeBill.value.id, item.id)
    console.log('✅ Товар удален')
  } catch (error) {
    console.error('❌ Ошибка удаления товара:', error)
  }
}

async function sendToKitchen() {
  if (!currentOrder.value) return

  try {
    const result = await ordersStore.sendOrderToKitchen(currentOrder.value.id)

    if (result.success) {
      console.log('✅ Заказ отправлен на кухню')
    }
  } catch (error) {
    console.error('❌ Ошибка отправки на кухню:', error)
  }
}

function processPayment() {
  if (!currentOrder.value) return
  showPaymentDialog.value = true
}

// Helper functions
function getOrderTypeText(type: OrderType): string {
  const types = {
    dine_in: 'В зале',
    takeaway: 'На вынос',
    delivery: 'Доставка'
  }
  return types[type] || type
}

function handlePaymentCompleted(orderId: string) {
  console.log('✅ Оплата завершена для заказа:', orderId)
  showPaymentDialog.value = false

  // Можно добавить уведомление об успешной оплате
  // или автоматически перейти к новому заказу
}

function getOrderStatusText(status: OrderStatus): string {
  const statuses = {
    draft: 'Черновик',
    confirmed: 'Подтвержден',
    preparing: 'Готовится',
    ready: 'Готов',
    served: 'Подан',
    paid: 'Оплачен',
    cancelled: 'Отменен'
  }
  return statuses[status] || status
}

function getOrderStatusColor(status: OrderStatus): string {
  const colors = {
    draft: 'grey',
    confirmed: 'info',
    preparing: 'warning',
    ready: 'success',
    served: 'primary',
    paid: 'green',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}

function getTableName(tableId: string): string {
  const table = tablesStore.getTableById(tableId)
  return table ? `Стол ${table.number}` : 'Стол'
}
</script>

<style scoped>
.order-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.order-header {
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.02);
}

.bills-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bills-tabs {
  flex-shrink: 0;
}

.bill-content {
  flex: 1;
  overflow-y: auto;
}

.items-list {
  max-height: 400px;
  overflow-y: auto;
}

.item-row {
  transition: all 0.2s ease;
}

.quantity-controls {
  display: flex;
  align-items: center;
}

.summary-line {
  margin-bottom: 8px;
}

.order-summary {
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.02);
}
</style>
