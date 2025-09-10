<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePaymentStore } from '@/stores/payment/payment.store'
import { useBillStore } from '@/stores/bill.store'
import { useOrderStore } from '@/stores/order.store'
import { useMenuStore } from '@/stores/menu.store'
import { useAccountStore } from '@/stores/account.store'
import { useTablesStore } from '@/stores/tables.store'
import { DebugUtils } from '@/utils'
import { useDialogForm } from '@/composables/useDialogForm'
import { formatAmount } from '@/utils/formatter'
import type { AccountType } from '@/types/account'
import type { Discount } from '@/types/discount'
import type { BillItem, Bill } from '@/types/bill'
import BaseDialog from '@/components/base/BaseDialog.vue'
import DiscountSelector from '@/components/discount/DiscountSelector.vue'

const MODULE_NAME = 'PaymentDialog'

// Props и Emits
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

// Stores
const paymentStore = usePaymentStore()
const billStore = useBillStore()
const accountStore = useAccountStore()
const tablesStore = useTablesStore()
const orderStore = useOrderStore()
const menuStore = useMenuStore()

// Вычисляемые свойства для обработки выбранных счетов/позиций
const selectedBills = computed(() => {
  if (billStore.selection.selectionMode === 'bills') {
    // Берем выбранные счета
    return Array.from(billStore.selection.selectedBills)
      .map(billId => orderStore.bills.find(b => b.id === billId))
      .filter(bill => bill) as Bill[]
  }
  // Если нет выбранных счетов, берем все неоплаченные
  return orderStore.bills.filter(bill =>
    bill.items.some(item => item.status !== 'cancelled' && item.paymentStatus !== 'paid')
  ) as Bill[]
})

const getItemDetails = computed(() => (item: BillItem) => {
  const menuItem = menuStore.getMenuItemById(item.dishId)
  const variant = item.variantId ? menuStore.getItemVariantById(item.dishId, item.variantId) : null
  return {
    name: menuItem?.name || 'Unknown item',
    variantName: variant?.name || ''
  }
})

const selectedItems = computed(() => {
  return selectedBills.value.flatMap(bill =>
    bill.items.filter(item => item.status !== 'cancelled' && item.paymentStatus !== 'paid')
  )
})

// Расчеты сумм
const itemsSubtotal = computed(() => {
  return selectedItems.value.reduce((sum, item) => {
    // Используем discountedPrice если есть
    const price = item.discountedPrice || item.price
    return sum + price * item.quantity
  }, 0)
})

const itemDiscountsTotal = computed(() => {
  return selectedItems.value.reduce((sum, item) => {
    if (!item.discounts || !item.discounts.length) return sum
    // Считаем сумму скидки как разницу между базовой ценой и ценой со скидкой
    return sum + (item.price - (item.discountedPrice || item.price)) * item.quantity
  }, 0)
})

const subtotalAfterItemDiscounts = computed(() => itemsSubtotal.value - itemDiscountsTotal.value)

const customerDiscountAmount = computed(() => {
  if (!billStore.activeBill?.customerDiscount) return 0
  return subtotalAfterItemDiscounts.value * (billStore.activeBill.customerDiscount.value / 100)
})

// Сумма для расчета налогов (после всех скидок)
const taxableAmount = computed(
  () => subtotalAfterItemDiscounts.value - customerDiscountAmount.value
)

// Налоги считаем от суммы после всех скидок
const taxes = computed(() => ({
  serviceTax: taxableAmount.value * 0.05,
  governmentTax: taxableAmount.value * 0.1
}))

const totalAmount = computed(
  () => taxableAmount.value + taxes.value.serviceTax + taxes.value.governmentTax
)

// Методы оплаты
const paymentMethods = computed(() =>
  accountStore.activeAccounts.map(account => ({
    id: account.id,
    accountId: account.id,
    name: account.name,
    type: account.type,
    isActive: account.isActive
  }))
)

function getPaymentMethodIcon(type: AccountType): string {
  const icons = {
    cash: 'mdi-cash',
    card: 'mdi-credit-card',
    bank: 'mdi-bank',
    gojeck: 'mdi-wallet',
    grab: 'mdi-wallet'
  }
  return icons[type] || 'mdi-help-circle'
}

// Обработка скидок
const handleDiscountApplied = (discount: Discount) => {
  DebugUtils.debug(MODULE_NAME, 'Discount applied', { discount })
}

// Форма оплаты
const { formData, loading, handleSubmit, handleCancel } = useDialogForm<{ method: string }>({
  moduleName: MODULE_NAME,
  initialData: { method: '' },
  validateForm: data => {
    const account = accountStore.getAccountById(data.method)
    if (!account || !account.isActive) {
      return 'Please select valid payment method'
    }
    return true
  },
  onSubmit: async data => {
    if (!billStore.activeBill) return

    const account = accountStore.getAccountById(data.method)
    if (!account) throw new Error('Payment method not found')

    const result = await paymentStore.processPayment({
      billId: billStore.activeBill.id,
      accountId: account.id,
      amount: totalAmount.value,
      method: account.type,
      items: selectedItems.value.map(item => item.id)
    })

    if (result.isValid) {
      const order = tablesStore.activeOrder
      if (order) {
        await orderStore.confirmOrder()
        await tablesStore.saveOrderData(order.id, orderStore.bills)

        if (order.tableId && order.tableId !== 'delivery') {
          await tablesStore.updateTableStatus(order.tableId, order.id)
        }
      }
      handleClose()
      billStore.clearSelection()
    } else {
      throw new Error(result.message)
    }
  }
})

const handleClose = () => {
  handleCancel()
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <base-dialog
    :model-value="modelValue"
    title="Payment"
    :loading="loading"
    :disabled="!formData.method"
    max-width="900"
    @update:model-value="$emit('update:modelValue', $event)"
    @cancel="handleClose"
  >
    <div class="d-flex gap-4" style="height: calc(100vh - 160px)">
      <!-- Левая колонка - список позиций -->
      <div class="w-50 d-flex flex-column">
        <!-- Заголовок с количеством и суммой -->
        <div class="d-flex justify-space-between align-center text-subtitle-1 mb-2">
          <span>Selected Items ({{ selectedItems.length }})</span>
          <span>{{ formatAmount(itemsSubtotal) }}</span>
        </div>

        <v-card class="flex-grow-1 d-flex flex-column" variant="outlined">
          <!-- Список позиций со скроллом -->
          <div class="flex-grow-1 overflow-auto">
            <v-list density="compact">
              <template v-for="item in selectedItems" :key="item.id">
                <v-list-item class="pa-2">
                  <!-- Основная информация -->
                  <div class="d-flex flex-column w-100">
                    <!-- Название и базовая цена -->
                    <div class="d-flex align-center justify-space-between">
                      <div class="d-flex align-center gap-2">
                        <span class="text-body-2">{{ item.quantity }}x</span>
                        <span>{{ getItemDetails(item).name }}</span>
                      </div>
                      <div class="d-flex align-center">
                        <span
                          :class="{
                            'text-decoration-line-through text-medium-emphasis':
                              item.discounts && item.discounts.length > 0
                          }"
                        >
                          {{ formatAmount(item.price * item.quantity) }}
                        </span>
                      </div>
                    </div>

                    <!-- Вариант если есть -->
                    <div
                      v-if="getItemDetails(item).variantName"
                      class="text-caption text-medium-emphasis"
                    >
                      {{ getItemDetails(item).variantName }}
                    </div>

                    <!-- Скидка на позицию если есть -->
                    <template v-if="item.discounts && item.discounts.length > 0">
                      <div class="d-flex justify-space-between w-100 mt-1">
                        <span class="text-caption text-error">
                          Item Discount (-{{ item.discounts[0].value }}%)
                        </span>
                        <span class="text-error">
                          -{{
                            formatAmount(
                              item.price * item.quantity * (item.discounts[0].value / 100)
                            )
                          }}
                        </span>
                      </div>
                      <div class="d-flex justify-space-between w-100">
                        <span class="text-caption">After Discount:</span>
                        <span class="text-success">
                          {{ formatAmount(item.discountedPrice * item.quantity) }}
                        </span>
                      </div>
                    </template>
                  </div>
                </v-list-item>
              </template>
            </v-list>
          </div>

          <!-- Итог по позициям -->
          <v-divider />
          <div class="pa-3">
            <div class="d-flex justify-space-between mb-1">
              <span>Subtotal:</span>
              <span>{{ formatAmount(itemsSubtotal) }}</span>
            </div>
            <template v-if="itemDiscountsTotal > 0">
              <div class="d-flex justify-space-between text-error">
                <span>Item Discounts Total:</span>
                <span>-{{ formatAmount(itemDiscountsTotal) }}</span>
              </div>
              <div class="d-flex justify-space-between">
                <span>After Discounts:</span>
                <span class="text-success">{{ formatAmount(subtotalAfterItemDiscounts) }}</span>
              </div>
            </template>
          </div>
        </v-card>
      </div>

      <!-- Правая колонка - итоги и оплата -->
      <div class="w-50 d-flex flex-column gap-3">
        <!-- Скидка на чек -->
        <div class="d-flex justify-end">
          <discount-selector type="bill" @discount-applied="handleDiscountApplied" />
        </div>

        <!-- Итоговый расчет -->
        <v-card variant="outlined">
          <v-card-text class="py-3">
            <!-- Сумма после скидок на позиции -->
            <div class="d-flex justify-space-between mb-2">
              <span>Total After Item Discounts:</span>
              <span>{{ formatAmount(subtotalAfterItemDiscounts) }}</span>
            </div>

            <!-- Скидка на чек если есть -->
            <template v-if="customerDiscountAmount > 0">
              <div class="d-flex justify-space-between mb-1 text-error">
                <span>Bill Discount:</span>
                <span>-{{ formatAmount(customerDiscountAmount) }}</span>
              </div>
              <div class="d-flex justify-space-between mb-2">
                <span>After Bill Discount:</span>
                <span>{{ formatAmount(taxableAmount) }}</span>
              </div>
            </template>

            <!-- Налоги -->
            <div class="d-flex justify-space-between mb-1">
              <span>Service Tax (5%):</span>
              <span>{{ formatAmount(taxes.serviceTax) }}</span>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span>Government Tax (10%):</span>
              <span>{{ formatAmount(taxes.governmentTax) }}</span>
            </div>

            <v-divider class="my-2" />

            <div class="d-flex justify-space-between font-weight-bold text-h6">
              <span>Total:</span>
              <span>{{ formatAmount(totalAmount) }}</span>
            </div>
          </v-card-text>
        </v-card>

        <!-- Методы оплаты -->
        <v-card variant="outlined">
          <v-card-text class="py-3">
            <v-radio-group v-model="formData.method" hide-details density="compact">
              <div class="d-flex flex-wrap gap-1">
                <template v-for="method in paymentMethods" :key="method.id">
                  <div
                    class="payment-method-item"
                    :class="{ 'payment-method-selected': formData.method === method.accountId }"
                  >
                    <v-radio
                      :value="method.accountId"
                      color="primary"
                      density="compact"
                      class="payment-method-radio"
                      hide-details
                    >
                      <template #label>
                        <div class="d-flex align-center">
                          <v-icon
                            :icon="getPaymentMethodIcon(method.type)"
                            size="16"
                            class="mr-1"
                          />
                          <span class="text-body-2">{{ method.name }}</span>
                        </div>
                      </template>
                    </v-radio>
                  </div>
                </template>
              </div>
            </v-radio-group>
          </v-card-text>
        </v-card>

        <!-- Кнопка оплаты -->
        <v-btn
          block
          color="primary"
          height="44"
          :loading="loading"
          :disabled="!formData.method"
          @click="handleSubmit"
        >
          Pay {{ formatAmount(totalAmount) }}
        </v-btn>
      </div>
    </div>
  </base-dialog>
</template>

<style scoped>
.payment-method-item {
  flex-basis: calc(50% - 4px);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 4px;
  height: 32px;
}

.payment-method-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.payment-method-selected {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.payment-method-radio {
  height: 100%;
  padding: 4px 8px;
}

.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
.gap-4 {
  gap: 16px;
}

:deep(.v-list) {
  padding: 0;
}
</style>
