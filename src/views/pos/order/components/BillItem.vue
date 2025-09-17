<!-- src/views/pos/order/components/BillItem.vue -->
<template>
  <div :class="['bill-item', { 'item-selected': selected }]">
    <div class="item-content d-flex pa-3">
      <!-- Selection Checkbox -->
      <v-checkbox
        v-if="showCheckbox"
        :model-value="selected"
        density="compact"
        hide-details
        color="primary"
        class="item-checkbox flex-shrink-0"
        @update:model-value="handleSelect"
      />

      <!-- Item Details - Full Width -->
      <div class="item-details flex-grow-1 min-w-0 mr-3">
        <div class="item-name text-subtitle-1 font-weight-medium mb-1">
          {{ item.menuItemName || 'Unknown Item' }}
        </div>

        <div class="item-variant text-body-2 text-medium-emphasis mb-1">
          {{ item.variantName || 'Standard' }}
          {{ ' x ' + item.quantity }}
        </div>

        <!-- Item Notes (если есть) -->
        <div v-if="item.kitchenNotes" class="item-notes text-caption text-warning mb-1">
          <v-icon size="12" class="mr-1">mdi-note-text</v-icon>
          {{ item.kitchenNotes }}
        </div>

        <!-- Item Modifications (если есть) -->
        <div
          v-if="item.modifications && item.modifications.length > 0"
          class="item-modifications mb-1"
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
            <template v-if="mod.price > 0">+{{ formatPrice(mod.price) }}</template>
          </v-chip>
        </div>

        <!-- Item Status -->
        <div v-if="showStatus" class="item-status">
          <v-chip :color="getStatusColor(item.status)" size="x-small" variant="flat">
            <v-icon start size="12">{{ getStatusIcon(item.status) }}</v-icon>
            {{ getStatusLabel(item.status) }}
          </v-chip>
        </div>

        <!-- Kitchen Time (если отправлено на кухню) -->
        <div
          v-if="item.sentToKitchenAt"
          class="kitchen-time text-caption text-medium-emphasis mt-1"
        >
          <v-icon size="12" class="mr-1">mdi-clock-outline</v-icon>
          Sent: {{ formatTime(item.sentToKitchenAt) }}
        </div>
      </div>

      <!-- Right Side Controls -->
      <div class="item-controls d-flex flex-column align-end gap-2">
        <!-- Price Display -->
        <div class="price-display text-right">
          <div class="unit-price text-caption text-medium-emphasis">
            {{ formatPrice(item.unitPrice || 0) }} each
          </div>
          <div class="total-price text-subtitle-1 font-weight-bold">
            {{ formatPrice(item.totalPrice || 0) }}
          </div>
        </div>

        <!-- Quantity Controls -->
        <div v-if="canModify" class="quantity-controls d-flex align-center">
          <v-btn
            icon
            variant="text"
            size="small"
            :disabled="item.quantity <= 1 || !canModify"
            @click="handleQuantityChange(item.quantity - 1)"
          >
            <v-icon size="16">mdi-minus</v-icon>
          </v-btn>

          <div class="quantity-display mx-2 text-center" style="min-width: 32px">
            <span class="text-subtitle-2 font-weight-medium">{{ item.quantity || 1 }}</span>
          </div>

          <v-btn
            icon
            variant="text"
            size="small"
            :disabled="!canModify"
            @click="handleQuantityChange(item.quantity + 1)"
          >
            <v-icon size="16">mdi-plus</v-icon>
          </v-btn>
        </div>

        <!-- Read-only Quantity Display -->
        <div v-else class="quantity-readonly text-center">
          <div class="text-caption text-medium-emphasis">Qty</div>
          <div class="text-subtitle-2 font-weight-medium">{{ item.quantity }}</div>
        </div>

        <!-- Actions Menu -->
        <v-btn v-if="showActions" icon variant="text" density="comfortable" size="small">
          <v-icon>mdi-dots-vertical</v-icon>
          <v-menu activator="parent" location="bottom">
            <v-list density="compact">
              <v-list-item v-if="canModify" @click="handleModify">
                <template #prepend>
                  <v-icon size="small">mdi-pencil</v-icon>
                </template>
                <v-list-item-title>Modify</v-list-item-title>
              </v-list-item>

              <v-list-item @click="handleAddNote">
                <template #prepend>
                  <v-icon size="small">mdi-note-plus</v-icon>
                </template>
                <v-list-item-title>Add Note</v-list-item-title>
              </v-list-item>

              <v-divider />

              <v-list-item v-if="canCancel" class="text-error" @click="handleCancel">
                <template #prepend>
                  <v-icon size="small" color="error">mdi-cancel</v-icon>
                </template>
                <v-list-item-title>Cancel Item</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PosBillItem, ItemStatus } from '@/stores/pos/types'
import { formatIDR } from '@/utils/currency'
import { computed } from 'vue'

// Alias для удобства
const formatPrice = formatIDR

// Props
interface Props {
  item: PosBillItem
  selected?: boolean
  showCheckbox?: boolean
  showStatus?: boolean
  showActions?: boolean
  canModify?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  showCheckbox: true,
  showStatus: true,
  showActions: true,
  canModify: true
})

// Emits
const emit = defineEmits<{
  select: [itemId: string, selected: boolean]
  'update-quantity': [itemId: string, quantity: number]
  modify: [itemId: string]
  cancel: [itemId: string]
  'add-note': [itemId: string]
}>()

// Computed
const canCancel = computed(() => {
  return props.item.status === 'active' || props.item.status === 'pending'
})

// Debug: проверим, что item содержит нужные данные
console.log('🔍 BillItem props:', {
  itemId: props.item?.id,
  menuItemName: props.item?.menuItemName,
  quantity: props.item?.quantity,
  unitPrice: props.item?.unitPrice,
  totalPrice: props.item?.totalPrice,
  status: props.item?.status
})

// Methods
const handleSelect = (selected: boolean): void => {
  emit('select', props.item.id, selected)
}

const handleQuantityChange = (newQuantity: number): void => {
  if (newQuantity > 0 && props.canModify) {
    emit('update-quantity', props.item.id, newQuantity)
  }
}

const handleModify = (): void => {
  emit('modify', props.item.id)
}

const handleCancel = (): void => {
  emit('cancel', props.item.id)
}

const handleAddNote = (): void => {
  emit('add-note', props.item.id)
}

const formatTime = (timestamp: string): string => {
  try {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Invalid time'
  }
}

const getStatusColor = (status: ItemStatus): string => {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'active':
      return 'primary'
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
    case 'active':
      return 'mdi-check'
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
    case 'active':
      return 'Active'
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
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.2);
}

.item-content {
  align-items: flex-start;
  min-height: 80px;
}

/* =============================================
   CHECKBOX STYLING
   ============================================= */

.item-checkbox {
  margin-top: 4px;
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
}

.item-name {
  line-height: 1.3;
  word-break: break-word;
  font-size: 1rem;
}

.item-variant {
  line-height: 1.2;
  margin-bottom: 4px;
}

.item-notes,
.kitchen-time {
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
   RIGHT SIDE CONTROLS
   ============================================= */

.item-controls {
  min-width: 100px;
  max-width: 120px;
}

.price-display {
  text-align: right;
  min-width: 80px;
}

.unit-price {
  line-height: 1.2;
  margin-bottom: 2px;
  font-size: 0.75rem;
}

.total-price {
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  font-size: 0.95rem;
}

/* =============================================
   QUANTITY CONTROLS
   ============================================= */

.quantity-controls {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border-radius: 16px;
  padding: 2px;
  min-width: 90px;
}

.quantity-display {
  user-select: none;
}

.quantity-readonly {
  opacity: 0.7;
  min-width: 50px;
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .item-content {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
    min-height: auto;
  }

  .item-controls {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    max-width: none;
    min-width: auto;
  }

  .price-display {
    order: 1;
    text-align: left;
  }

  .quantity-controls,
  .quantity-readonly {
    order: 2;
    margin: 0;
  }

  .item-actions {
    order: 3;
  }

  .item-name {
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .item-content {
    padding: 12px;
  }

  .item-controls {
    flex-direction: column;
    gap: 8px;
  }

  .price-display {
    text-align: center;
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
    background-color 0.2s ease,
    box-shadow 0.2s ease;
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

/* =============================================
   MODIFICATION CHIPS
   ============================================= */

.item-modifications .v-chip {
  height: 20px;
  font-size: 0.65rem;
  border-radius: 10px;
}

.item-modifications .v-chip :deep(.v-chip__content) {
  padding: 0 6px;
}
</style>
