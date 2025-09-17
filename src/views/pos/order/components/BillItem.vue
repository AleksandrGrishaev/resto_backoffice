<!-- src/views/pos/order/components/BillItem.vue -->
<template>
  <div :class="['bill-item', { 'item-selected': isSelected }]">
    <div class="item-content d-flex align-center pa-3">
      <!-- Selection Checkbox -->
      <v-checkbox
        v-if="showCheckbox"
        :model-value="isSelected"
        density="compact"
        hide-details
        color="primary"
        class="item-checkbox mr-3"
        @update:model-value="handleSelect"
      />

      <!-- Item Details -->
      <div class="item-details flex-grow-1 min-w-0">
        <div class="item-name text-subtitle-1 font-weight-medium mb-1">
          {{ item.menuItemName }}
        </div>

        <div class="item-variant text-body-2 text-medium-emphasis">
          {{ item.variantName }}
          {{ item.quantity > 1 ? ` x ${item.quantity}` : ' x 1' }}
        </div>

        <!-- Item Notes (если есть) -->
        <div v-if="item.kitchenNotes" class="item-notes text-caption text-warning mt-1">
          <v-icon size="12" class="mr-1">mdi-note-text</v-icon>
          {{ item.kitchenNotes }}
        </div>

        <!-- Item Modifications (если есть) -->
        <div
          v-if="item.modifications && item.modifications.length > 0"
          class="item-modifications mt-1"
        >
          <v-chip
            v-for="mod in item.modifications"
            :key="mod.id"
            size="x-small"
            variant="outlined"
            color="info"
            class="mr-1 mb-1"
          >
            {{ mod.name }}
          </v-chip>
        </div>

        <!-- Item Status -->
        <div v-if="showStatus" class="item-status mt-1">
          <v-chip :color="getStatusColor(item.status)" size="x-small" variant="flat">
            <v-icon start size="12">{{ getStatusIcon(item.status) }}</v-icon>
            {{ getStatusLabel(item.status) }}
          </v-chip>
        </div>
      </div>

      <!-- Quantity Controls -->
      <div class="quantity-controls d-flex align-center mr-4">
        <v-btn
          icon
          variant="text"
          size="small"
          :disabled="item.quantity <= 1"
          @click="handleQuantityChange(item.quantity - 1)"
        >
          <v-icon size="16">mdi-minus</v-icon>
        </v-btn>

        <div class="quantity-display mx-2 text-center" style="min-width: 40px">
          <span class="text-subtitle-2 font-weight-medium">{{ item.quantity }}</span>
        </div>

        <v-btn icon variant="text" size="small" @click="handleQuantityChange(item.quantity + 1)">
          <v-icon size="16">mdi-plus</v-icon>
        </v-btn>
      </div>

      <!-- Price Display -->
      <div class="price-display text-right" style="min-width: 80px">
        <div class="unit-price text-caption text-medium-emphasis">
          {{ formatPrice(item.unitPrice) }} each
        </div>
        <div class="total-price text-subtitle-1 font-weight-bold">
          {{ formatPrice(item.totalPrice) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PosBillItem, ItemStatus } from '@/stores/pos/types'
import { formatIDR } from '@/utils/currency'

// Alias для удобства
const formatPrice = formatIDR

// Props
interface Props {
  item: PosBillItem
  isSelected?: boolean
  showCheckbox?: boolean
  showStatus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  showCheckbox: true,
  showStatus: false
})

// Emits
const emit = defineEmits<{
  select: [selected: boolean]
  'update-quantity': [itemId: string, quantity: number]
}>()

// Methods
const handleSelect = (selected: boolean): void => {
  emit('select', selected)
}

const handleQuantityChange = (newQuantity: number): void => {
  if (newQuantity > 0) {
    emit('update-quantity', props.item.id, newQuantity)
  }
}

const getStatusColor = (status: ItemStatus): string => {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'sent_to_kitchen':
      return 'info'
    case 'preparing':
      return 'info'
    case 'ready':
      return 'success'
    case 'served':
      return 'success'
    case 'cancelled':
      return 'error'
    default:
      return 'grey'
  }
}

const getStatusIcon = (status: ItemStatus): string => {
  switch (status) {
    case 'pending':
      return 'mdi-clock-outline'
    case 'sent_to_kitchen':
      return 'mdi-chef-hat'
    case 'preparing':
      return 'mdi-food'
    case 'ready':
      return 'mdi-check-circle'
    case 'served':
      return 'mdi-check-all'
    case 'cancelled':
      return 'mdi-cancel'
    default:
      return 'mdi-help'
  }
}

const getStatusLabel = (status: ItemStatus): string => {
  switch (status) {
    case 'pending':
      return 'New'
    case 'sent_to_kitchen':
      return 'Sent'
    case 'preparing':
      return 'Cooking'
    case 'ready':
      return 'Ready'
    case 'served':
      return 'Served'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Unknown'
  }
}
</script>

<style scoped>
/* =============================================
   BILL ITEM LAYOUT
   ============================================= */

.bill-item {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  margin-bottom: var(--spacing-xs);
  background: rgb(var(--v-theme-surface));
  transition: all 0.2s ease;
  cursor: pointer;
}

.bill-item:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  background: rgba(var(--v-theme-primary), 0.02);
}

.bill-item.item-selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}

.item-content {
  align-items: flex-start;
  padding: 12px;
}

/* =============================================
   CHECKBOX STYLING
   ============================================= */

.item-checkbox {
  flex-shrink: 0;
  margin-top: -4px; /* Выравниваем с текстом */
}

.item-checkbox :deep(.v-selection-control) {
  min-height: auto;
}

.item-checkbox :deep(.v-selection-control__wrapper) {
  height: 20px;
}

/* =============================================
   ITEM DETAILS
   ============================================= */

.item-details {
  min-width: 0;
  flex: 1;
}

.item-name {
  line-height: 1.3;
  word-break: break-word;
}

.item-variant {
  line-height: 1.2;
}

.item-notes {
  display: flex;
  align-items: center;
  line-height: 1.2;
}

.item-modifications {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.item-status {
  margin-top: 4px;
}

/* =============================================
   QUANTITY CONTROLS
   ============================================= */

.quantity-controls {
  flex-shrink: 0;
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border-radius: 20px;
  padding: 2px;
}

.quantity-display {
  user-select: none;
}

/* =============================================
   PRICE DISPLAY
   ============================================= */

.price-display {
  flex-shrink: 0;
  text-align: right;
}

.unit-price {
  line-height: 1.2;
  margin-bottom: 2px;
}

.total-price {
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .item-content {
    padding: 8px;
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-xs);
  }

  .quantity-controls,
  .price-display {
    align-self: flex-end;
    margin: 0;
  }

  .quantity-controls {
    order: 1;
  }

  .price-display {
    order: 2;
  }
}

/* =============================================
   ACCESSIBILITY
   ============================================= */

.bill-item:focus-within {
  outline: 2px solid rgba(var(--v-theme-primary), 0.5);
  outline-offset: 2px;
}

/* =============================================
   ANIMATIONS
   ============================================= */

.bill-item {
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.item-checkbox :deep(.v-selection-control__input) {
  transition: all 0.2s ease;
}

.quantity-controls .v-btn {
  transition: all 0.15s ease;
}

.quantity-controls .v-btn:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.1);
}
</style>
