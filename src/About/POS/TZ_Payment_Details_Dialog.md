# ТЗ: Payment Details Dialog

## 📌 **Общее описание**

При просмотре отчета по смене в Shift Management View, кассир видит список платежей. Необходимо добавить возможность **просмотра детальной информации о каждом платеже** при клике на него.

---

## 🎯 **Цели**

1. ✅ Просмотр полной информации о платеже (payment number, amount, method, status)
2. ✅ Просмотр списка оплаченных items с ценами
3. ✅ Информация о заказе (order number, table/takeaway, time)
4. ✅ Информация о чеке (receipt printed, print time)
5. ✅ Возможность повторной печати чека
6. ✅ Возможность создать refund (для admin/manager)

---

## 🔧 **Технические требования**

### **1. UI Component: PaymentDetailsDialog.vue**

**Расположение:** `src/views/pos/shifts/dialogs/PaymentDetailsDialog.vue`

**Props:**

```typescript
interface Props {
  modelValue: boolean // dialog visibility
  paymentId: string | null // payment to display
}
```

**Emits:**

```typescript
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'print-receipt': [paymentId: string]
  'create-refund': [paymentId: string]
}>()
```

---

### **2. UI Layout**

```vue
<template>
  <v-dialog v-model="dialog" max-width="700" scrollable>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <div class="text-h6">Payment Details</div>
          <div class="text-caption">{{ payment?.paymentNumber }}</div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="close" />
      </v-card-title>

      <v-divider />

      <!-- Content -->
      <v-card-text class="pa-4">
        <!-- Payment Summary Card -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <div class="payment-summary">
              <!-- Amount -->
              <div class="summary-row">
                <span class="label">Amount:</span>
                <span class="value text-h5 font-weight-bold">
                  {{ formatPrice(payment.amount) }}
                </span>
              </div>

              <!-- Method -->
              <div class="summary-row">
                <span class="label">Method:</span>
                <v-chip :prepend-icon="getPaymentMethodIcon(payment.method)" size="small">
                  {{ getPaymentMethodName(payment.method) }}
                </v-chip>
              </div>

              <!-- Status -->
              <div class="summary-row">
                <span class="label">Status:</span>
                <v-chip :color="getPaymentStatusColor(payment.status)" size="small">
                  {{ payment.status }}
                </v-chip>
              </div>

              <!-- Time -->
              <div class="summary-row">
                <span class="label">Processed:</span>
                <span class="value">{{ formatDateTime(payment.processedAt) }}</span>
              </div>

              <!-- Processed By -->
              <div class="summary-row">
                <span class="label">Cashier:</span>
                <span class="value">{{ payment.processedBy }}</span>
              </div>

              <!-- Shift -->
              <div v-if="payment.shiftId" class="summary-row">
                <span class="label">Shift:</span>
                <span class="value">{{ getShiftNumber(payment.shiftId) }}</span>
              </div>

              <!-- Change (for cash payments) -->
              <div v-if="payment.method === 'cash' && payment.changeAmount" class="summary-row">
                <span class="label">Received:</span>
                <span class="value">{{ formatPrice(payment.receivedAmount) }}</span>
              </div>
              <div v-if="payment.method === 'cash' && payment.changeAmount" class="summary-row">
                <span class="label">Change:</span>
                <span class="value text-info">{{ formatPrice(payment.changeAmount) }}</span>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Order Information -->
        <div class="order-info mb-4">
          <div class="text-subtitle-1 mb-2 d-flex align-center">
            <v-icon class="mr-2">mdi-receipt-text</v-icon>
            Order Information
          </div>

          <v-card variant="outlined">
            <v-card-text>
              <div class="d-flex justify-space-between align-center mb-2">
                <span>Order #{{ order.orderNumber }}</span>
                <v-chip size="small">{{ getOrderTypeLabel(order.type) }}</v-chip>
              </div>

              <div v-if="order.type === 'dine_in'" class="text-caption">
                <v-icon size="16">mdi-table-furniture</v-icon>
                {{ getTableName(order.tableId) }}
              </div>

              <div class="text-caption text-medium-emphasis">
                Created: {{ formatDateTime(order.createdAt) }}
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Items List -->
        <div class="items-list mb-4">
          <div class="text-subtitle-1 mb-2 d-flex align-center">
            <v-icon class="mr-2">mdi-food</v-icon>
            Paid Items ({{ paidItems.length }})
          </div>

          <v-card variant="outlined">
            <v-list>
              <v-list-item v-for="item in paidItems" :key="item.id" density="compact">
                <template #prepend>
                  <div class="item-quantity">{{ item.quantity }}x</div>
                </template>

                <v-list-item-title>{{ item.name }}</v-list-item-title>
                <v-list-item-subtitle v-if="item.modifications?.length">
                  <span v-for="mod in item.modifications" :key="mod.id" class="mr-2">
                    + {{ mod.name }}
                  </span>
                </v-list-item-subtitle>

                <template #append>
                  <div class="item-price">
                    {{ formatPrice(item.price * item.quantity) }}
                  </div>
                </template>
              </v-list-item>

              <!-- Total -->
              <v-divider />
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Total</v-list-item-title>
                <template #append>
                  <div class="text-h6 font-weight-bold">
                    {{ formatPrice(payment.amount) }}
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </div>

        <!-- Receipt Information -->
        <div class="receipt-info">
          <div class="text-subtitle-1 mb-2 d-flex align-center">
            <v-icon class="mr-2">mdi-printer</v-icon>
            Receipt
          </div>

          <v-alert
            :color="payment.receiptPrinted ? 'success' : 'grey'"
            variant="tonal"
            density="compact"
          >
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="font-weight-bold">
                  {{ payment.receiptPrinted ? 'Receipt Printed' : 'Receipt Not Printed' }}
                </div>
                <div v-if="payment.receiptPrintedAt" class="text-caption">
                  {{ formatDateTime(payment.receiptPrintedAt) }}
                </div>
              </div>
              <v-btn
                size="small"
                variant="outlined"
                prepend-icon="mdi-printer"
                @click="printReceipt"
              >
                {{ payment.receiptPrinted ? 'Reprint' : 'Print' }}
              </v-btn>
            </div>
          </v-alert>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" @click="close">Close</v-btn>

        <v-spacer />

        <!-- Refund Button (admin/manager only) -->
        <v-btn
          v-if="canCreateRefund"
          color="error"
          variant="outlined"
          prepend-icon="mdi-cash-refund"
          :disabled="payment.status === 'refunded'"
          @click="createRefund"
        >
          Create Refund
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

---

### **3. Script Logic**

```typescript
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { usePosPaymentsStore } from '@/stores/pos/payments/paymentsStore'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { useAuthStore } from '@/stores/auth'

// Props & Emits
interface Props {
  modelValue: boolean
  paymentId: string | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  paymentId: null
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'print-receipt': [paymentId: string]
  'create-refund': [paymentId: string]
}>()

// Stores
const shiftsStore = useShiftsStore()
const paymentsStore = usePosPaymentsStore()
const ordersStore = usePosOrdersStore()
const tablesStore = usePosTablesStore()
const authStore = useAuthStore()

// State
const dialog = ref(props.modelValue)

// Computed
const payment = computed(() => {
  if (!props.paymentId) return null
  return paymentsStore.payments.find(p => p.id === props.paymentId) || null
})

const order = computed(() => {
  if (!payment.value) return null
  return ordersStore.orders.find(o => o.id === payment.value!.orderId) || null
})

const paidItems = computed(() => {
  if (!payment.value || !order.value) return []

  const items: any[] = []
  for (const bill of order.value.bills) {
    for (const item of bill.items) {
      if (payment.value.itemIds.includes(item.id)) {
        items.push(item)
      }
    }
  }

  return items
})

const canCreateRefund = computed(() => {
  const roles = authStore.userRoles
  return roles.includes('admin') || roles.includes('manager')
})

// Watchers
watch(() => props.modelValue, (newVal) => {
  dialog.value = newVal
})

watch(dialog, (newVal) => {
  emit('update:modelValue', newVal)
})

// Methods
function close() {
  dialog.value = false
}

function printReceipt() {
  if (!payment.value) return
  emit('print-receipt', payment.value.id)
}

function createRefund() {
  if (!payment.value) return
  emit('create-refund', payment.value.id)
}

function getShiftNumber(shiftId: string): string {
  const shift = shiftsStore.shifts.find(s => s.id === shiftId)
  return shift?.shiftNumber || 'Unknown'
}

function getTableName(tableId?: string): string {
  if (!tableId) return 'N/A'
  const table = tablesStore.tables.find(t => t.id === tableId)
  return table ? `Table ${table.number}` : 'Unknown'
}

function getOrderTypeLabel(type: string): string {
  const labels = {
    dine_in: 'Dine In',
    takeaway: 'Takeaway',
    delivery: 'Delivery'
  }
  return labels[type] || type
}

function getPaymentMethodIcon(method: string): string {
  const icons = {
    cash: 'mdi-cash',
    card: 'mdi-credit-card',
    qr: 'mdi-qrcode'
  }
  return icons[method] || 'mdi-currency-usd'
}

function getPaymentMethodName(method: string): string {
  const names = {
    cash: 'Cash',
    card: 'Card',
    qr: 'QR Code'
  }
  return names[method] || method
}

function getPaymentStatusColor(status: string): string {
  const colors = {
    completed: 'success',
    pending: 'warning',
    failed: 'error',
    refunded: 'grey'
  }
  return colors[status] || 'grey'
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('id-ID')
}
</script>

<style scoped>
.payment-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.value {
  font-size: 16px;
  font-weight: 500;
}

.item-quantity {
  min-width: 40px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.item-price {
  font-weight: 600;
  min-width: 100px;
  text-align: right;
}
</style>
```

---

### **4. Интеграция в ShiftManagementView**

```vue
<!-- В template -->
<v-data-table
  :items="shiftPayments"
  :headers="paymentHeaders"
  :search="search"
  density="comfortable"
  @click:row="handlePaymentClick"  <!-- 🆕 Add click handler -->
>
  <!-- ... existing templates ... -->
</v-data-table>

<!-- Add dialog -->
<PaymentDetailsDialog
  v-model="showPaymentDetailsDialog"
  :payment-id="selectedPaymentId"
  @print-receipt="handlePrintReceipt"
  @create-refund="handleCreateRefund"
/>

<!-- В script -->
<script setup lang="ts">
import PaymentDetailsDialog from './dialogs/PaymentDetailsDialog.vue'

const showPaymentDetailsDialog = ref(false)
const selectedPaymentId = ref<string | null>(null)

function handlePaymentClick(event: any, { item }: any) {
  selectedPaymentId.value = item.id
  showPaymentDetailsDialog.value = true
}

function handlePrintReceipt(paymentId: string) {
  await paymentsStore.printReceipt(paymentId)
  console.log('Receipt printed:', paymentId)
}

function handleCreateRefund(paymentId: string) {
  // TODO: Open RefundDialog
  console.log('Create refund for:', paymentId)
}
</script>
```

---

## 📋 **План реализации**

### **Phase 1: Dialog Component (1 день)**

1. ✅ Создать `PaymentDetailsDialog.vue`
2. ✅ Реализовать layout с всеми секциями
3. ✅ Добавить computed properties для данных
4. ✅ Стилизация и responsive design

### **Phase 2: Integration (1 день)**

1. ✅ Интегрировать в `ShiftManagementView.vue`
2. ✅ Добавить click handler на v-data-table
3. ✅ Протестировать открытие/закрытие диалога
4. ✅ Протестировать отображение данных

### **Phase 3: Actions (1 день)**

1. ✅ Реализовать print receipt action
2. ✅ Реализовать refund action (базовая версия)
3. ✅ Добавить permission checks для refund
4. ✅ Testing и bug fixes

---

## 🎯 **Критерии приемки**

- [ ] Клик по платежу в таблице открывает PaymentDetailsDialog
- [ ] Отображается вся информация о платеже
- [ ] Отображается список оплаченных items с ценами
- [ ] Кнопка "Print Receipt" работает
- [ ] Кнопка "Create Refund" видна только admin/manager
- [ ] Dialog responsive и работает на мобильных устройствах
- [ ] Нельзя создать refund для уже refunded платежа
