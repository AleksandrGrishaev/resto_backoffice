<!-- src/views/pos/payment/widgets/PaymentItemsList.vue -->
<template>
  <div class="payment-items-list">
    <div class="items-header">
      <h4 class="text-subtitle-2 font-weight-bold mb-2">Items to Pay</h4>
      <div class="text-caption text-medium-emphasis">{{ unpaidItems.length }} items</div>
    </div>

    <v-divider class="my-2" />

    <div class="items-container">
      <div v-for="item in unpaidItems" :key="item.id" class="item-row">
        <!-- Item Name & Variant -->
        <div class="item-info">
          <div class="item-name text-body-2">{{ item.menuItemName }}</div>
          <div v-if="item.variantName" class="item-variant text-caption text-medium-emphasis">
            {{ item.variantName }}
          </div>
          <div v-if="item.notes" class="item-notes text-caption text-medium-emphasis">
            <v-icon size="12" class="mr-1">mdi-note-text</v-icon>
            {{ item.notes }}
          </div>
        </div>

        <!-- Quantity & Price -->
        <div class="item-price">
          <div class="quantity-badge">{{ item.quantity }}x</div>
          <div class="price-info">
            <!-- Show discount info if item has discounts -->
            <div v-if="hasItemDiscounts(item)" class="price-with-discount">
              <div
                class="original-price text-caption text-decoration-line-through text-medium-emphasis"
              >
                {{ formatPrice(item.totalPrice) }}
              </div>
              <div class="discount-info text-caption text-error">
                <v-icon size="12" class="mr-1">mdi-tag</v-icon>
                {{ getDiscountReasonLabel(item.discounts![0].reason) }}
              </div>
              <div class="final-price text-body-2 font-weight-medium">
                {{ formatPrice(getItemFinalPrice(item)) }}
              </div>
            </div>
            <!-- No discount - just show price -->
            <div v-else class="price text-body-2 font-weight-medium">
              {{ formatPrice(item.totalPrice) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PosBillItem } from '@/stores/pos/types'
import { DISCOUNT_REASON_LABELS } from '@/stores/discounts/constants'

interface Props {
  items: PosBillItem[]
}

const props = defineProps<Props>()

// Filter out already paid items - only show unpaid items in payment dialog
const unpaidItems = computed(() => {
  return props.items.filter(item => item.paymentStatus !== 'paid' && item.status !== 'cancelled')
})

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const hasItemDiscounts = (item: PosBillItem): boolean => {
  return !!item.discounts && item.discounts.length > 0
}

const getItemFinalPrice = (item: PosBillItem): number => {
  if (!hasItemDiscounts(item)) return item.totalPrice

  const discountAmount = item.discounts!.reduce((sum: number, discount: any) => {
    if (discount.type === 'percentage') {
      return sum + (item.totalPrice * discount.value) / 100
    } else {
      return sum + discount.value
    }
  }, 0)

  return Math.max(0, item.totalPrice - discountAmount)
}

const getDiscountReasonLabel = (reason: string): string => {
  return DISCOUNT_REASON_LABELS[reason as keyof typeof DISCOUNT_REASON_LABELS] || reason
}
</script>

<style scoped>
.payment-items-list {
  padding: 12px;
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.items-container {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px;
  background: rgba(var(--v-theme-surface), 1);
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  gap: 12px;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-variant {
  margin-top: 2px;
  font-size: 0.7rem;
}

.item-notes {
  margin-top: 4px;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  font-style: italic;
}

.item-price {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.price-info {
  min-width: 100px;
}

.price-with-discount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.original-price {
  font-size: 0.7rem;
  opacity: 0.6;
}

.discount-info {
  display: flex;
  align-items: center;
  font-size: 0.65rem;
  line-height: 1;
}

.final-price {
  font-variant-numeric: tabular-nums;
}

.quantity-badge {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 32px;
  text-align: center;
}

.price {
  font-variant-numeric: tabular-nums;
  min-width: 80px;
  text-align: right;
}

/* Custom scrollbar */
.items-container::-webkit-scrollbar {
  width: 6px;
}

.items-container::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 3px;
}

.items-container::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 3px;
}

.items-container::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}

@media (max-width: 600px) {
  .items-container {
    max-height: 150px;
  }

  .item-row {
    padding: 6px;
  }

  .item-name {
    font-size: 0.8125rem;
  }

  .price {
    font-size: 0.8125rem;
    min-width: 70px;
  }
}
</style>
