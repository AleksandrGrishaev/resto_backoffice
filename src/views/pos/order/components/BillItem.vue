<!-- src/views/pos/order/components/BillItem.vue -->
<template>
  <v-card
    class="bill-item pos-card"
    :class="{
      'item-selected': isSelected,
      'item-cancelled': item.status === 'cancelled'
    }"
    variant="outlined"
  >
    <v-card-text class="item-content pa-3">
      <div class="d-flex align-center">
        <!-- Selection Checkbox -->
        <div v-if="selectable" class="item-select mr-3">
          <v-checkbox
            :model-value="isSelected"
            density="compact"
            hide-details
            @update:model-value="handleSelect"
          />
        </div>

        <!-- Item Details -->
        <div class="item-details flex-grow-1">
          <div class="item-header d-flex align-center justify-space-between mb-1">
            <div class="item-name">
              <div class="text-subtitle-2 font-weight-medium">
                {{ item.menuItemName }}
              </div>
              <div v-if="item.variantName" class="text-caption text-medium-emphasis">
                {{ item.variantName }}
              </div>
            </div>

            <!-- Status Badge -->
            <v-chip v-if="item.status === 'cancelled'" size="x-small" color="error" variant="flat">
              Cancelled
            </v-chip>
          </div>

          <!-- Kitchen Notes -->
          <div v-if="item.kitchenNotes" class="item-notes mb-2">
            <v-chip size="small" variant="tonal" color="info" prepend-icon="mdi-note-text">
              {{ item.kitchenNotes }}
            </v-chip>
          </div>

          <!-- Modifications -->
          <div v-if="item.modifications?.length" class="item-modifications mb-2">
            <div class="modifications-list d-flex flex-wrap gap-1">
              <v-chip
                v-for="mod in item.modifications"
                :key="mod.id"
                size="x-small"
                variant="outlined"
                color="primary"
              >
                {{ mod.name }}
                <span v-if="mod.price > 0" class="ml-1">+{{ formatPrice(mod.price) }}</span>
              </v-chip>
            </div>
          </div>

          <!-- Discounts -->
          <div v-if="hasDiscounts" class="item-discounts mb-2">
            <div class="discounts-list d-flex flex-wrap gap-1">
              <v-chip
                v-for="discount in item.discounts"
                :key="discount.id"
                size="x-small"
                variant="tonal"
                color="success"
                prepend-icon="mdi-percent"
              >
                {{ discount.reason }}: {{ discount.value
                }}{{ discount.type === 'percentage' ? '%' : '' }}
              </v-chip>
            </div>
          </div>
        </div>

        <!-- Quantity & Price Controls -->
        <div class="item-controls ml-3 d-flex align-center">
          <!-- Quantity Controls -->
          <div class="quantity-controls d-flex align-center mr-3">
            <v-btn
              icon
              variant="text"
              size="small"
              :disabled="item.status === 'cancelled' || item.quantity <= 1"
              @click="decrementQuantity"
            >
              <v-icon>mdi-minus</v-icon>
            </v-btn>

            <div class="quantity-display mx-2 text-center" style="min-width: 40px">
              <div class="text-subtitle-2 font-weight-bold">
                {{ item.quantity }}
              </div>
              <div class="text-caption text-medium-emphasis">qty</div>
            </div>

            <v-btn
              icon
              variant="text"
              size="small"
              :disabled="item.status === 'cancelled'"
              @click="incrementQuantity"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </div>

          <!-- Price Display -->
          <div class="price-display text-right" style="min-width: 80px">
            <div class="text-subtitle-2 font-weight-bold">
              {{ formatPrice(displayPrice) }}
            </div>
            <div v-if="hasDiscounts" class="text-caption text-medium-emphasis line-through">
              {{ formatPrice(item.totalPrice) }}
            </div>
          </div>

          <!-- Action Menu -->
          <div class="item-actions ml-2">
            <v-menu location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn icon variant="text" size="small" v-bind="menuProps">
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>

              <v-list density="compact">
                <v-list-item
                  prepend-icon="mdi-pencil"
                  title="Edit Item"
                  :disabled="item.status === 'cancelled'"
                  @click="handleEdit"
                />
                <v-list-item
                  prepend-icon="mdi-percent"
                  title="Add Discount"
                  :disabled="item.status === 'cancelled'"
                  @click="handleDiscount"
                />
                <v-list-item
                  prepend-icon="mdi-note-plus"
                  title="Add Note"
                  :disabled="item.status === 'cancelled'"
                  @click="handleAddNote"
                />
                <v-divider />
                <v-list-item
                  prepend-icon="mdi-arrow-right"
                  title="Move to Bill"
                  :disabled="item.status === 'cancelled'"
                  @click="handleMove"
                />
                <v-divider />
                <v-list-item
                  prepend-icon="mdi-delete"
                  title="Remove Item"
                  :disabled="item.status === 'cancelled'"
                  @click="handleRemove"
                />
                <v-list-item
                  v-if="canCancel"
                  prepend-icon="mdi-cancel"
                  title="Cancel Item"
                  @click="handleCancel"
                />
              </v-list>
            </v-menu>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PosBillItem } from '@/stores/pos/types'

// Props
interface Props {
  item: PosBillItem
  isSelected?: boolean
  selectable?: boolean
  canEdit?: boolean
  canCancel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  selectable: false,
  canEdit: true,
  canCancel: true
})

// Emits
const emit = defineEmits<{
  select: [selected: boolean]
  'update-quantity': [itemId: string, quantity: number]
  edit: [item: PosBillItem]
  discount: [item: PosBillItem]
  'add-note': [item: PosBillItem]
  move: [item: PosBillItem]
  remove: [item: PosBillItem]
  cancel: [item: PosBillItem]
}>()

// Computed
const hasDiscounts = computed((): boolean => {
  return props.item.discounts && props.item.discounts.length > 0
})

const displayPrice = computed((): number => {
  if (!hasDiscounts.value) return props.item.totalPrice

  // Calculate price after discounts
  let discountedPrice = props.item.totalPrice

  props.item.discounts?.forEach(discount => {
    if (discount.type === 'percentage') {
      discountedPrice -= discountedPrice * (discount.value / 100)
    } else {
      discountedPrice -= discount.value
    }
  })

  return Math.max(0, discountedPrice)
})

const canCancel = computed((): boolean => {
  return props.canCancel && props.item.status === 'active'
})

// Methods
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const handleSelect = (selected: boolean): void => {
  console.log('📋 Item selection changed:', {
    itemId: props.item.id,
    itemName: props.item.menuItemName,
    selected
  })

  emit('select', selected)
}

const incrementQuantity = (): void => {
  const newQuantity = props.item.quantity + 1

  console.log('➕ Increment quantity:', {
    itemId: props.item.id,
    itemName: props.item.menuItemName,
    oldQuantity: props.item.quantity,
    newQuantity
  })

  emit('update-quantity', props.item.id, newQuantity)
}

const decrementQuantity = (): void => {
  if (props.item.quantity <= 1) return

  const newQuantity = props.item.quantity - 1

  console.log('➖ Decrement quantity:', {
    itemId: props.item.id,
    itemName: props.item.menuItemName,
    oldQuantity: props.item.quantity,
    newQuantity
  })

  emit('update-quantity', props.item.id, newQuantity)
}

const handleEdit = (): void => {
  console.log('✏️ Edit item:', {
    itemId: props.item.id,
    itemName: props.item.menuItemName
  })

  emit('edit', props.item)
}

const handleDiscount = (): void => {
  console.log('💰 Add discount:', {
    itemId: props.item.id,
    itemName: props.item.menuItemName
  })

  emit('discount', props.item)
}

const handleAddNote = (): void => {
  console.log('📝 Add note:', {
    itemId: props.item.id,
    itemName: props.item.menuItemName
  })

  emit('add-note', props.item)
}

const handleMove = (): void => {
  console.log('↗️ Move item:', {
    itemId: props.item.id,
    itemName: props.item.menuItemName
  })

  emit('move', props.item)
}

const handleRemove = (): void => {
  console.log('🗑️ Remove item:', {
    itemId: props.item.id,
    itemName: props.item.menuItemName
  })

  emit('remove', props.item)
}

const handleCancel = (): void => {
  console.log('❌ Cancel item:', {
    itemId: props.item.id,
    itemName: props.item.menuItemName
  })

  emit('cancel', props.item)
}
</script>

<style scoped>
/* =============================================
   BILL ITEM LAYOUT
   ============================================= */

.bill-item {
  transition: all 0.2s ease;
  margin-bottom: var(--spacing-sm);
  border-width: 1px;
}

.bill-item.item-selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}

.bill-item.item-cancelled {
  opacity: 0.6;
  background: rgba(var(--v-theme-error), 0.04);
  border-color: rgba(var(--v-theme-error), 0.2);
}

.item-content {
  padding: var(--spacing-md) !important;
}

/* =============================================
   ITEM DETAILS
   ============================================= */

.item-details {
  min-width: 0; /* Allow content to shrink */
}

.item-name {
  line-height: 1.2;
}

.item-notes {
  margin-top: var(--spacing-xs);
}

.item-modifications,
.item-discounts {
  margin-top: var(--spacing-xs);
}

.modifications-list,
.discounts-list {
  gap: var(--spacing-xs);
}

/* =============================================
   QUANTITY CONTROLS
   ============================================= */

.quantity-controls {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border-radius: var(--v-border-radius-lg);
  padding: var(--spacing-xs);
}

.quantity-display {
  user-select: none;
}

/* =============================================
   PRICE DISPLAY
   ============================================= */

.price-display {
  font-variant-numeric: tabular-nums;
}

.line-through {
  text-decoration: line-through;
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .item-content {
    padding: var(--spacing-sm) !important;
  }

  .item-controls {
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-xs);
  }

  .quantity-controls {
    order: 2;
  }

  .price-display {
    order: 1;
  }

  .item-actions {
    order: 3;
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .item-content .d-flex {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .item-select {
    margin-right: 0 !important;
    align-self: flex-start;
  }

  .item-controls {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

/* =============================================
   HOVER EFFECTS
   ============================================= */

@media (hover: hover) {
  .bill-item:hover:not(.item-cancelled) {
    box-shadow: 0 2px 8px rgba(var(--v-theme-on-surface), 0.08);
    transform: translateY(-1px);
  }

  .bill-item.item-selected:hover {
    box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.2);
  }
}

/* =============================================
   LOADING STATE
   ============================================= */

.bill-item.loading {
  opacity: 0.7;
  pointer-events: none;
}

.bill-item.loading .item-content {
  position: relative;
}

.bill-item.loading .item-content::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--v-theme-surface), 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
