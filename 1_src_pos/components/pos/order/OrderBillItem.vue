<!-- Контейнер для свайпа -->
<template>
  <div class="bill-container">
    <div
      class="bill-item pa-2"
      :class="[
        { 'bill-item--pending': isPending },
        { 'bill-item--cancelled': isCancelled },
        { 'bill-item--partially-cancelled': isPartiallyCancelled },
        { 'bill-item--selected': isSelected }
      ]"
    >
      <!-- Чекбокс -->
      <div class="checkbox-wrapper">
        <v-checkbox
          :model-value="isSelected"
          density="compact"
          hide-details
          class="item-checkbox"
          @click.stop
          @click="handleItemClick"
        />
      </div>

      <div class="content-wrapper with-checkbox">
        <!-- Item Info -->
        <div class="item-info">
          <!-- Header -->
          <div class="d-flex align-center justify-space-between">
            <span class="text-subtitle-2" :class="{ 'text-decoration-line-through': isCancelled }">
              {{ item.name }}
            </span>
            <!-- Status Chips -->
            <div class="d-flex gap-1">
              <!-- Payment Status -->
              <v-chip
                v-if="billItem.paymentStatus === 'paid'"
                size="x-small"
                color="success"
                variant="flat"
              >
                Paid
              </v-chip>
              <v-chip
                v-else-if="billItem.paymentStatus === 'partially_paid'"
                size="x-small"
                color="warning"
                variant="flat"
              >
                Partially Paid
              </v-chip>
              <v-chip
                v-if="billItem.notes"
                size="x-small"
                :color="isCancelled ? 'error' : 'primary'"
                variant="outlined"
              >
                Note
              </v-chip>
              <v-chip v-if="isCancelled" size="x-small" color="error" variant="flat">
                Cancelled
              </v-chip>
              <v-chip
                v-else-if="isPartiallyCancelled"
                size="x-small"
                color="error"
                variant="outlined"
              >
                {{ billItem.activeCancellations }} Cancelled
              </v-chip>
            </div>
          </div>

          <!-- Details -->
          <div class="d-flex flex-column mt-1">
            <!-- Количество и базовая цена -->
            <div class="d-flex align-center justify-space-between text-caption">
              <div class="d-flex align-center">
                <span>{{ variant?.name }} × {{ activeQuantity }}</span>
              </div>
              <div class="d-flex align-center">
                <template v-if="hasDiscount && currentDiscount">
                  <span class="text-medium-emphasis text-decoration-line-through me-2">
                    ${{ originalPrice }}
                  </span>
                  <span class="text-success font-weight-medium">${{ calculatePrice }}</span>
                  <v-chip size="x-small" color="success" variant="flat" class="ms-2">
                    -{{ currentDiscount.value }}%
                  </v-chip>
                </template>
                <template v-else>
                  <span class="text-body-1 font-weight-medium">${{ calculatePrice }}</span>
                </template>
              </div>
            </div>

            <!-- Дополнительная информация -->
            <div class="mt-2">
              <!-- Скидка -->
              <template v-if="hasDiscount && currentDiscount">
                <div class="text-caption text-success">
                  Discount: {{ formatDiscountReason(currentDiscount.reason) }}
                </div>
              </template>

              <!-- Notes -->
              <div v-if="billItem.notes" class="text-caption text-medium-emphasis">
                {{ billItem.notes }}
              </div>

              <!-- Cancellations -->
              <template v-if="billItem.cancellations?.length">
                <div
                  v-for="(cancellation, index) in billItem.cancellations"
                  :key="`cancellation-${index}`"
                  class="text-caption text-error"
                >
                  {{ formatCancellation(cancellation) }}
                </div>
              </template>

              <!-- Изменения количества -->
              <template v-if="hasQuantityChange">
                <div class="text-caption text-error">
                  {{ getQuantityChangeInfo }}
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Swipe Actions -->
    <div class="swipe-actions">
      <v-btn
        v-if="isEditable"
        icon="mdi-pencil"
        variant="text"
        size="small"
        color="primary"
        @click.stop="handleEdit(billItem)"
      />
      <v-btn
        v-if="canAddDiscount"
        icon="mdi-tag-outline"
        variant="text"
        size="small"
        color="success"
        @click.stop="handleAddDiscount(billItem)"
      />
      <v-btn
        v-if="canDelete"
        icon="mdi-delete"
        variant="text"
        size="small"
        color="error"
        @click.stop="handleDelete(billItem)"
      />
      <v-btn
        v-if="canCancel"
        icon="mdi-close"
        variant="text"
        size="small"
        color="error"
        @click.stop="handleCancel(billItem)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  BillItem,
  CancellationData,
  CancellationReason,
  BillDiscount,
  DiscountReason
} from '@/types/bill'
import { MenuItem } from '@/types/menu'
import { useBillStore } from '@/stores/bill.store'

const billStore = useBillStore()
const currentContainer = ref<HTMLElement | null>(null)
const isDragging = ref(false)

const props = defineProps<{
  billItem: BillItem
  item: MenuItem
}>()

const emit = defineEmits<{
  edit: [BillItem]
  delete: [BillItem]
  cancel: [BillItem]
  'add-discount': [BillItem]
}>()

const variant = computed(() => {
  return props.item.variants.find(v => v.id === props.billItem.variantId)
})

// Status computeds
const isPending = computed(() => props.billItem.status === 'pending')
const isCancelled = computed(() => props.billItem.status === 'cancelled')
const isEditable = computed(() => props.billItem.status === 'pending')
const canDelete = computed(() => props.billItem.status === 'pending')
const canCancel = computed(
  () => !isPending.value && !isCancelled.value && props.billItem.status !== 'completed'
)

// Price computeds
const canAddDiscount = computed(
  () =>
    props.billItem.status !== 'cancelled' &&
    props.billItem.status !== 'completed' &&
    props.billItem.paymentStatus !== 'paid' // Добавляем проверку оплаты
)

// Добавляем обработчик
const handleAddDiscount = (item: BillItem) => {
  closeSwipe()
  emit('add-discount', item)
}

const hasDiscount = computed(() => !!props.billItem.discounts?.[0])

const currentDiscount = computed(() => props.billItem.discounts?.[0])

const originalPrice = computed(() => {
  const price = props.billItem.price * activeQuantity.value
  return price.toFixed(2)
})

const calculatePrice = computed(() => {
  let price = props.billItem.price * activeQuantity.value

  if (hasDiscount.value && currentDiscount.value) {
    price *= 1 - currentDiscount.value.value / 100
  }

  return price.toFixed(2)
})

// Selection computeds
const isSelected = computed(() => {
  return billStore.isItemSelected(props.billItem.id)
  props.billItem.paymentStatus !== 'paid'
})

const activeQuantity = computed(
  () => props.billItem.quantity - (props.billItem.activeCancellations || 0)
)

const isPartiallyCancelled = computed(
  () =>
    props.billItem.activeCancellations &&
    props.billItem.activeCancellations > 0 &&
    props.billItem.activeCancellations < props.billItem.quantity
)

const isSelectable = computed(
  () => !isCancelled.value && props.billItem.paymentStatus !== 'paid' // Добавляем проверку оплаты
)

// History computeds
const hasQuantityChange = computed(() =>
  props.billItem.history.some(h => h.type === 'item_modified')
)

const getQuantityChangeInfo = computed(() => {
  const lastChange = [...props.billItem.history].reverse().find(h => h.type === 'item_modified')

  if (lastChange) {
    const { before, after } = lastChange.changes
    return `Changed from ${before} to ${after}`
  }
  return ''
})

// Swipe functionality
const closeSwipe = () => {
  if (currentContainer.value) {
    const billItem = currentContainer.value.querySelector('.bill-item') as HTMLElement
    const swipeActions = currentContainer.value.querySelector('.swipe-actions') as HTMLElement

    currentContainer.value.classList.remove('swiped')

    if (billItem && swipeActions) {
      billItem.style.transform = 'translateX(0)'
      swipeActions.style.opacity = '0'

      // Добавляем transition для плавного закрытия
      billItem.style.transition = 'transform 0.3s ease'
      swipeActions.style.transition = 'opacity 0.3s ease'

      // Сбрасываем transition после анимации
      setTimeout(() => {
        billItem.style.transition = ''
        swipeActions.style.transition = ''
      }, 300)
    }
  }
}

// Click handlers
const handleItemClick = (event: Event) => {
  event.stopPropagation()
  if (!isDragging.value && isSelectable.value) {
    billStore.toggleItemSelection(props.billItem.id)
  }
}

const handleClickOutside = (event: MouseEvent) => {
  if (currentContainer.value && !currentContainer.value.contains(event.target as Node)) {
    closeSwipe()
  }
}

/// Action handlers с принудительным закрытием
const handleEdit = async (item: BillItem) => {
  closeSwipe()
  emit('edit', item)
}

const handleDelete = async (item: BillItem) => {
  closeSwipe()
  emit('delete', item)
}

const handleCancel = async (item: BillItem) => {
  closeSwipe()
  emit('cancel', item)
}

// Touch handlers
const handleTouchStart = (e: TouchEvent, container: HTMLElement) => {
  isDragging.value = true
  currentContainer.value = container
  const touch = e.touches[0]
  const startX = touch.clientX
  container.dataset.startX = startX.toString()
}

const handleTouchMove = (e: TouchEvent, container: HTMLElement) => {
  if (!isDragging.value) return

  const touch = e.touches[0]
  const startX = Number(container.dataset.startX || 0)
  const diff = touch.clientX - startX

  const billItem = container.querySelector('.bill-item') as HTMLElement
  const swipeActions = container.querySelector('.swipe-actions') as HTMLElement

  if (!billItem || !swipeActions) return

  const isSwiped = container.classList.contains('swiped')

  if (isSwiped) {
    // Если меню открыто и начали движение вправо - сразу закрываем
    if (diff > 20) {
      // Небольшой порог для определения направления
      container.classList.remove('swiped')
      billItem.style.transform = 'translateX(0)'
      swipeActions.style.opacity = '0'
      isDragging.value = false // Прекращаем отслеживание движения
    }
  } else {
    // Стандартный свайп для открытия
    if (diff <= 0 && diff >= -140) {
      billItem.style.transform = `translateX(${diff}px)`
      const opacity = Math.abs(diff) / 140
      swipeActions.style.opacity = opacity.toString()
    }
  }
}

const handleTouchEnd = (container: HTMLElement) => {
  if (!isDragging.value) return

  const billItem = container.querySelector('.bill-item') as HTMLElement
  const swipeActions = container.querySelector('.swipe-actions') as HTMLElement
  const startX = Number(container.dataset.startX || 0)
  const currentX = container.getBoundingClientRect().x

  const diff = currentX - startX
  const isSwiped = container.classList.contains('swiped')

  if (isSwiped) {
    // Если начали закрытие - всегда закрываем
    if (diff > 0) {
      container.classList.remove('swiped')
      billItem.style.transform = 'translateX(0)'
      swipeActions.style.opacity = '0'
    } else {
      // Иначе оставляем открытым
      billItem.style.transform = 'translateX(-140px)'
      swipeActions.style.opacity = '1'
    }
  } else {
    // Логика открытия остаётся прежней
    if (diff < -70) {
      container.classList.add('swiped')
      billItem.style.transform = 'translateX(-140px)'
      swipeActions.style.opacity = '1'
    } else {
      billItem.style.transform = 'translateX(0)'
      swipeActions.style.opacity = '0'
    }
  }

  isDragging.value = false
}

// Formatting functions
const formatCancellation = (cancellation: CancellationData) => {
  const reason = formatCancelReason(cancellation.reason)
  return `Cancelled: ${cancellation.quantity} × ${reason}${
    cancellation.note ? ` (${cancellation.note})` : ''
  }`
}

const formatCancelReason = (reason: CancellationReason) => {
  return reason
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const formatDiscountReason = (reason: DiscountReason) => {
  return reason
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Lifecycle hooks
onMounted(() => {
  const containers = document.querySelectorAll<HTMLElement>('.bill-container')
  if (!containers.length) return

  containers.forEach(container => {
    container.addEventListener('touchstart', e => handleTouchStart(e, container), { passive: true })
    container.addEventListener('touchmove', e => handleTouchMove(e, container), { passive: true })
    container.addEventListener('touchend', () => handleTouchEnd(container), { passive: true })
  })

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
<style scoped>
/* Container Styles */
.bill-container {
  position: relative;
  overflow: hidden;
  border-radius: var(--app-border-radius);
  margin-bottom: 8px;
  touch-action: pan-x pan-y;
}

.bill-item {
  position: relative;
  display: flex;
  border: 1px solid rgba(var(--v-theme-surface), 0.12);
  cursor: pointer;
  min-height: 64px;
  background: var(--v-theme-surface);
  will-change: transform;
}

/* Item Status Styles */
.bill-item--pending {
  background: rgba(var(--v-theme-primary), 0.05);
}

.bill-item--cancelled {
  opacity: 0.75;
  background: rgba(var(--v-theme-error), 0.05);
  border-color: rgba(var(--v-theme-error), 0.12);
}

.bill-item--partially-cancelled {
  background: rgba(var(--v-theme-warning), 0.05);
  border-color: rgba(var(--v-theme-warning), 0.12);
}

.bill-item--selected {
  background-color: rgba(var(--v-theme-primary), 0.1);
  border-color: var(--v-theme-primary);
}

/* Checkbox Styles */
.checkbox-wrapper {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  cursor: pointer;
  min-width: 32px; /* Увеличиваем область клика */
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-checkbox {
  margin: 0;
}

/* Content Styles */
.content-wrapper {
  flex: 1;
  padding: 8px;
  min-width: 0;
}

.content-wrapper.with-checkbox {
  padding-left: 40px;
}

/* Swipe Actions Styles */
.swipe-actions {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 12px;
  opacity: 0;
  background: var(--v-theme-surface);
  pointer-events: auto;
  width: 140px; /* Увеличиваем ширину для кнопок */
  justify-content: flex-end;
}

/* Состояния свайпа */
.bill-container.swiped .bill-item {
  transform: translateX(-180px);
}

.bill-container.swiped .swipe-actions {
  opacity: 1;
}

/* При драге отключаем transition для мгновенной реакции */
.bill-container.dragging .bill-item,
.bill-container.dragging .swipe-actions {
  transition: none !important;
}

/* Добавляем transition только при закрытии/открытии свайпа */
.bill-container:not(.dragging) .bill-item,
.bill-container:not(.dragging) .swipe-actions {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Utils */
.gap-1 {
  gap: 4px;
}

/* Hover States */
@media (hover: hover) {
  .bill-item:hover {
    border-color: rgba(var(--v-theme-primary), 0.24);
  }

  .bill-item:active {
    cursor: grabbing;
  }
}

/* Touch Interaction Prevention */
.bill-container.swiped {
  touch-action: none;
}
</style>
