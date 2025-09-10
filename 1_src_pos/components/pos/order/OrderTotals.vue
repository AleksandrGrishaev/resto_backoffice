<!-- OrderTotals.vue -->
<template>
  <div class="order-totals px-4 py-3">
    <div class="d-flex justify-space-between mb-1">
      <div>Subtotal</div>
      <div>${{ formatPrice(orderStore.orderSubtotal) }}</div>
    </div>

    <!-- Добавляем строку со скидкой, если она есть -->
    <div v-if="hasDiscount" class="d-flex justify-space-between mb-1">
      <div class="text-success">Discount</div>
      <div class="text-success">-${{ formatPrice(totalDiscount) }}</div>
    </div>

    <!-- Дисконтированная сумма -->
    <div v-if="hasDiscount" class="d-flex justify-space-between mb-1">
      <div>Discounted Total</div>
      <div>${{ formatPrice(orderStore.orderDiscountedTotal) }}</div>
    </div>

    <div class="d-flex justify-space-between mb-1">
      <div>Service Tax (5%)</div>
      <div>${{ formatPrice(orderStore.orderTaxes.serviceTax) }}</div>
    </div>

    <div class="d-flex justify-space-between mb-1">
      <div>Government Tax (10%)</div>
      <div>${{ formatPrice(orderStore.orderTaxes.governmentTax) }}</div>
    </div>

    <div class="d-flex justify-space-between font-weight-bold">
      <div class="text-h6">Total</div>
      <div class="text-h6">${{ formatPrice(orderStore.orderTotal) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrderStore } from '@/stores/order.store'

const orderStore = useOrderStore()

// Добавляем computed properties для скидок
const totalDiscount = computed(() => {
  return orderStore.bills.reduce((sum, bill) => {
    return (
      sum +
      bill.items.reduce((billSum, item) => {
        if (!item.discounts?.[0]) return billSum
        const basePrice = item.price * (item.quantity - (item.activeCancellations || 0))
        const discountAmount = basePrice * (item.discounts[0].value / 100)
        return billSum + discountAmount
      }, 0)
    )
  }, 0)
})

const hasDiscount = computed(() => totalDiscount.value > 0)

const formatPrice = (price: number) => price.toFixed(2)
</script>

<style scoped>
.order-totals {
  border-top: 1px solid rgba(var(--v-theme-primary), 0.12);
}
</style>
