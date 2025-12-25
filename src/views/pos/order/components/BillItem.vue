<!-- src/views/pos/order/components/BillItem.vue -->
<template>
  <div class="bill-items">
    <!-- Items Groups -->
    <div v-for="group in groupedItems" :key="group.key" class="item-group">
      <!-- Multiple Items Group -->
      <div v-if="group.items.length >= 2" class="group-container">
        <!-- Group Header -->
        <div class="group-header" @click="toggleGroup(group.key)">
          <v-checkbox
            :model-value="areAllGroupItemsSelected(group)"
            :indeterminate="areSomeGroupItemsSelected(group) && !areAllGroupItemsSelected(group)"
            :disabled="areAllGroupItemsPaid(group)"
            density="comfortable"
            hide-details
            @click.stop
            @update:model-value="val => handleSelectGroup(group, val)"
          />

          <div class="group-info">
            <!-- Первая строка: только название -->
            <div class="item-name-full">
              {{ group.menuItemName }}
            </div>

            <!-- Вторая строка: вариант (если есть) -->
            <div v-if="group.variantName" class="variant-name-line">
              {{ group.variantName }}
            </div>

            <!-- Третья строка: счетчик, скидки и цена -->
            <div class="group-meta-line">
              <div class="group-badges">
                <span class="count-badge">{{ group.items.length }}</span>

                <!-- Discount indicator for group -->
                <v-tooltip v-if="hasGroupDiscounts(group)" location="top">
                  <template #activator="{ props: tooltipProps }">
                    <v-chip size="x-small" color="error" variant="flat" v-bind="tooltipProps">
                      <v-icon size="12" start>mdi-tag-percent</v-icon>
                      -{{ formatPrice(calculateGroupDiscounts(group)) }}
                    </v-chip>
                  </template>
                  <div class="discount-tooltip">
                    <div class="text-caption font-weight-bold mb-1">Discounts Applied:</div>
                    <div v-for="(item, idx) in group.items" :key="idx">
                      <div v-for="discount in item.discounts" :key="discount.id" class="mb-1">
                        <div class="text-caption">
                          {{
                            discount.type === 'percentage'
                              ? `${discount.value}%`
                              : formatPrice(discount.value)
                          }}
                          - {{ discount.reason }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          by {{ discount.appliedBy }}
                        </div>
                      </div>
                    </div>
                  </div>
                </v-tooltip>
              </div>
              <!-- Price with discount indicator -->
              <div v-if="hasGroupDiscounts(group)" class="price-with-discount">
                <span class="old-price">{{ formatPrice(calculateGroupOriginalPrice(group)) }}</span>
                <span class="discount-badge">
                  -{{
                    Math.round(
                      (calculateGroupDiscounts(group) / calculateGroupOriginalPrice(group)) * 100
                    )
                  }}%
                </span>
                <span class="new-price">{{ formatPrice(group.totalPrice) }}</span>
              </div>
              <span v-else class="group-price-inline">{{ formatPrice(group.totalPrice) }}</span>
            </div>

            <!-- Четвертая строка: модификации (если есть) -->
            <div
              v-if="group.modifications && group.modifications.length > 0"
              class="group-modifications"
            >
              <span v-for="mod in group.modifications" :key="mod" class="mod-chip">+{{ mod }}</span>
            </div>
          </div>

          <div class="group-actions">
            <v-btn
              icon
              size="default"
              variant="text"
              color="primary"
              @click.stop="handleAddOneMore(group)"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
            <v-btn icon size="default" variant="text" @click.stop="toggleGroup(group.key)">
              <v-icon>
                {{ isGroupExpanded(group.key) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
              </v-icon>
            </v-btn>
          </div>
        </div>

        <!-- Individual Items (Collapsible) -->
        <v-expand-transition>
          <div v-show="isGroupExpanded(group.key)" class="items-list">
            <div
              v-for="(item, index) in group.items"
              :key="item.id"
              class="item-row"
              :class="{
                selected: isItemSelected(item.id),
                'item-paid': item.paymentStatus === 'paid',
                'item-cancelled': item.status === 'cancelled'
              }"
            >
              <v-checkbox
                :model-value="isItemSelected(item.id)"
                :disabled="item.paymentStatus === 'paid' || item.status === 'cancelled'"
                density="comfortable"
                hide-details
                @update:model-value="val => handleSelect(item.id, val)"
              />

              <span class="item-number">#{{ index + 1 }}</span>

              <v-chip :color="getItemStatusColor(item.status)" size="small" variant="flat">
                {{ getItemStatusText(item.status) }}
              </v-chip>

              <v-chip
                :color="getItemPaymentStatusColor(item.paymentStatus || 'unpaid')"
                size="small"
                variant="flat"
              >
                {{ getItemPaymentStatusText(item.paymentStatus || 'unpaid') }}
              </v-chip>

              <v-tooltip v-if="item.kitchenNotes" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-icon size="18" color="warning" v-bind="tooltipProps">mdi-note-text</v-icon>
                </template>
                <span>{{ item.kitchenNotes }}</span>
              </v-tooltip>

              <div class="spacer"></div>

              <span class="item-price">{{ formatPrice(item.totalPrice) }}</span>

              <!-- Item Actions Menu -->
              <v-menu location="bottom end">
                <template #activator="{ props: menuProps }">
                  <v-btn icon size="default" variant="text" v-bind="menuProps">
                    <v-icon>mdi-dots-vertical</v-icon>
                  </v-btn>
                </template>

                <v-list density="compact">
                  <v-list-item
                    :disabled="item.status !== 'draft'"
                    @click="item.status === 'draft' ? handleAddNote(item.id) : null"
                  >
                    <template #prepend>
                      <v-icon size="small">
                        {{ item.kitchenNotes ? 'mdi-note-edit' : 'mdi-note-plus' }}
                      </v-icon>
                    </template>
                    <v-list-item-title>
                      {{ item.kitchenNotes ? 'Edit Note' : 'Add Note' }}
                      <span v-if="item.status !== 'draft'" class="text-caption text-grey">
                        (Sent)
                      </span>
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item
                    :disabled="item.paymentStatus === 'paid'"
                    @click="item.paymentStatus !== 'paid' ? handleApplyDiscount(item.id) : null"
                  >
                    <template #prepend>
                      <v-icon size="small" color="primary">mdi-tag-percent</v-icon>
                    </template>
                    <v-list-item-title>
                      Apply Discount
                      <span v-if="item.paymentStatus === 'paid'" class="text-caption text-grey">
                        (Paid)
                      </span>
                    </v-list-item-title>
                  </v-list-item>

                  <v-divider />

                  <v-tooltip :disabled="canCancelItem(item)" location="left">
                    <template #activator="{ props: tooltipProps }">
                      <div v-bind="tooltipProps">
                        <v-list-item
                          :disabled="!canCancelItem(item)"
                          :class="canCancelItem(item) ? 'text-error' : ''"
                          @click="canCancelItem(item) ? handleCancel(item.id) : null"
                        >
                          <template #prepend>
                            <v-icon size="small" :color="canCancelItem(item) ? 'error' : 'grey'">
                              mdi-cancel
                            </v-icon>
                          </template>
                          <v-list-item-title>
                            Cancel Item
                            <span v-if="!canCancelItem(item)" class="text-caption text-grey">
                              ({{ getCancelBlockReason(item) }})
                            </span>
                          </v-list-item-title>
                        </v-list-item>
                      </div>
                    </template>
                    {{ getCancelBlockReason(item) }}
                  </v-tooltip>
                </v-list>
              </v-menu>
            </div>
          </div>
        </v-expand-transition>
      </div>

      <!-- Single Item -->
      <div
        v-else
        class="single-item"
        :class="{
          selected: isItemSelected(group.items[0].id),
          'item-paid': group.items[0].paymentStatus === 'paid',
          'item-cancelled': group.items[0].status === 'cancelled'
        }"
      >
        <v-checkbox
          :model-value="isItemSelected(group.items[0].id)"
          :disabled="
            group.items[0].paymentStatus === 'paid' || group.items[0].status === 'cancelled'
          "
          density="comfortable"
          hide-details
          @update:model-value="val => handleSelect(group.items[0].id, val)"
        />

        <div class="item-info">
          <!-- Первая строка: только название -->
          <div class="item-name-single">
            {{ group.menuItemName }}
          </div>

          <!-- Вторая строка: вариант (если есть) -->
          <div v-if="group.variantName" class="variant-name-line">
            {{ group.variantName }}
          </div>

          <!-- Третья строка: статус, заметки, скидки и цена -->
          <div class="item-meta-line">
            <div class="item-badges">
              <v-chip
                :color="getItemStatusColor(group.items[0].status)"
                size="small"
                variant="flat"
                class="status-chip"
              >
                {{ getItemStatusText(group.items[0].status) }}
              </v-chip>

              <v-chip
                :color="getItemPaymentStatusColor(group.items[0].paymentStatus)"
                size="small"
                variant="flat"
                class="payment-chip"
              >
                {{ getItemPaymentStatusText(group.items[0].paymentStatus) }}
              </v-chip>

              <v-tooltip v-if="group.items[0].kitchenNotes" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-icon size="18" color="warning" v-bind="tooltipProps">mdi-note-text</v-icon>
                </template>
                <span>{{ group.items[0].kitchenNotes }}</span>
              </v-tooltip>
            </div>

            <!-- Price with discount indicator -->
            <div v-if="hasItemDiscounts(group.items[0])" class="price-with-discount">
              <span class="old-price">{{ formatPrice(group.items[0].totalPrice) }}</span>
              <span class="discount-badge">
                -{{
                  Math.round(
                    (calculateItemDiscounts(group.items[0]) / group.items[0].totalPrice) * 100
                  )
                }}%
              </span>
              <span class="new-price">
                {{
                  formatPrice(group.items[0].totalPrice - calculateItemDiscounts(group.items[0]))
                }}
              </span>
            </div>
            <span v-else class="item-price-inline">
              {{ formatPrice(group.items[0].totalPrice) }}
            </span>
          </div>

          <!-- Четвертая строка: модификации (если есть) -->
          <div
            v-if="group.modifications && group.modifications.length > 0"
            class="item-modifications"
          >
            <span v-for="mod in group.modifications" :key="mod" class="mod-chip">+{{ mod }}</span>
          </div>
        </div>

        <!-- Single Item Actions Menu -->
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn icon size="default" variant="text" v-bind="menuProps">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>

          <v-list density="compact">
            <!-- Add One More -->
            <v-list-item @click="handleAddOneMore(group)">
              <template #prepend>
                <v-icon size="small" color="success">mdi-plus</v-icon>
              </template>
              <v-list-item-title class="text-success">One More</v-list-item-title>
            </v-list-item>

            <v-divider />

            <v-list-item
              :disabled="group.items[0].status !== 'draft'"
              @click="group.items[0].status === 'draft' ? handleAddNote(group.items[0].id) : null"
            >
              <template #prepend>
                <v-icon size="small">
                  {{ group.items[0].kitchenNotes ? 'mdi-note-edit' : 'mdi-note-plus' }}
                </v-icon>
              </template>
              <v-list-item-title>
                {{ group.items[0].kitchenNotes ? 'Edit Note' : 'Add Note' }}
                <span v-if="group.items[0].status !== 'draft'" class="text-caption text-grey">
                  (Sent)
                </span>
              </v-list-item-title>
            </v-list-item>

            <v-list-item
              :disabled="group.items[0].paymentStatus === 'paid'"
              @click="
                group.items[0].paymentStatus !== 'paid'
                  ? handleApplyDiscount(group.items[0].id)
                  : null
              "
            >
              <template #prepend>
                <v-icon size="small" color="primary">mdi-tag-percent</v-icon>
              </template>
              <v-list-item-title>
                Apply Discount
                <span v-if="group.items[0].paymentStatus === 'paid'" class="text-caption text-grey">
                  (Paid)
                </span>
              </v-list-item-title>
            </v-list-item>

            <v-divider />

            <v-tooltip :disabled="canCancelItem(group.items[0])" location="left">
              <template #activator="{ props: tooltipProps }">
                <div v-bind="tooltipProps">
                  <v-list-item
                    :disabled="!canCancelItem(group.items[0])"
                    :class="canCancelItem(group.items[0]) ? 'text-error' : ''"
                    @click="canCancelItem(group.items[0]) ? handleCancel(group.items[0].id) : null"
                  >
                    <template #prepend>
                      <v-icon
                        size="small"
                        :color="canCancelItem(group.items[0]) ? 'error' : 'grey'"
                      >
                        mdi-cancel
                      </v-icon>
                    </template>
                    <v-list-item-title>
                      Cancel Item
                      <span v-if="!canCancelItem(group.items[0])" class="text-caption text-grey">
                        ({{ getCancelBlockReason(group.items[0]) }})
                      </span>
                    </v-list-item-title>
                  </v-list-item>
                </div>
              </template>
              {{ getCancelBlockReason(group.items[0]) }}
            </v-tooltip>
          </v-list>
        </v-menu>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  PosBillItem,
  PosItemDiscount,
  ItemStatus,
  ItemPaymentStatus
} from '@/stores/pos/types'
import { formatIDR } from '@/utils/currency'
import { computed, ref } from 'vue'
import { useOrdersComposables } from '@/stores/pos/orders/composables'

// Получить функции из composables:
const {
  getItemStatusColor,
  getItemStatusText,
  getItemPaymentStatusColor,
  getItemPaymentStatusText
} = useOrdersComposables()

const formatPrice = formatIDR

interface GroupedBillItems {
  key: string
  menuItemId: string
  menuItemName: string
  variantId?: string
  variantName?: string
  modifications?: string[]
  items: PosBillItem[]
  totalPrice: number
}

// Props
interface Props {
  items: PosBillItem[]
  isItemSelected: (itemId: string) => boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  select: [itemId: string, selected: boolean]
  cancel: [itemId: string]
  'add-note': [itemId: string]
  'add-one-more': [group: GroupedBillItems]
  'apply-discount': [itemId: string]
}>()

// Helper function to calculate item discounts (moved up before groupedItems computed)
const calculateItemDiscounts = (item: PosBillItem): number => {
  if (!item.discounts || item.discounts.length === 0) return 0
  return item.discounts.reduce((sum: number, discount: PosItemDiscount) => {
    if (discount.type === 'percentage') {
      return sum + (item.totalPrice * discount.value) / 100
    } else {
      return sum + discount.value
    }
  }, 0)
}

// Состояние сворачивания групп
const expandedGroups = ref<Set<string>>(new Set())

// Группировка с учетом модификаций
const groupedItems = computed(() => {
  const groups = new Map<string, GroupedBillItems>()

  props.items.forEach(item => {
    // ✨ NEW: Создаем ключ с учетом НОВОЙ системы модификаторов (selectedModifiers)
    let modificationsKey = 'no-mods'

    if (item.selectedModifiers && item.selectedModifiers.length > 0) {
      // Используем новую систему модификаторов
      modificationsKey = item.selectedModifiers
        .map(m => m.optionName)
        .sort()
        .join('-')
    } else if (item.modifications && item.modifications.length > 0) {
      // Fallback на старую систему для обратной совместимости
      modificationsKey = item.modifications
        .map(m => m.name)
        .sort()
        .join('-')
    }

    // ✅ FIX: Include discount amount and payment status in grouping key
    // Items with different discounts or payment statuses should NOT be grouped
    const discountAmount = calculateItemDiscounts(item)
    const discountKey = discountAmount > 0 ? `discount-${discountAmount}` : 'no-discount'
    const paymentStatusKey = item.paymentStatus || 'unpaid'
    const notesKey = item.kitchenNotes ? `notes-${item.kitchenNotes}` : 'no-notes'

    // Включаем variantId, discounts, payment status, and notes в ключ группировки
    const key = `${item.menuItemId}-${item.variantId || 'default'}-${modificationsKey}-${discountKey}-${paymentStatusKey}-${notesKey}`

    if (!groups.has(key)) {
      // ✨ NEW: Приоритет новой системе модификаторов
      const modificationsDisplay =
        item.selectedModifiers && item.selectedModifiers.length > 0
          ? item.selectedModifiers.map((m: any) => m.optionName)
          : item.modifications?.map((m: any) => m.name)

      groups.set(key, {
        key,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        variantId: item.variantId,
        variantName: item.variantName,
        modifications: modificationsDisplay,
        items: [],
        totalPrice: 0
      })

      // По умолчанию группы развернуты
      expandedGroups.value.add(key)
    }

    const group = groups.get(key)!
    group.items.push(item)
    // ✅ FIX: Use final price after discounts, not base totalPrice
    // item.totalPrice is base price (before discounts)
    // We need to subtract discounts to get the actual price displayed
    const itemDiscountAmount = calculateItemDiscounts(item)
    const itemFinalPrice = item.totalPrice - itemDiscountAmount

    group.totalPrice += itemFinalPrice
  })

  return Array.from(groups.values())
})

// Group selection logic
const areAllGroupItemsSelected = (group: GroupedBillItems): boolean => {
  const unpaidItems = group.items.filter(item => item.paymentStatus !== 'paid')
  if (unpaidItems.length === 0) return false
  return unpaidItems.every(item => props.isItemSelected(item.id))
}

const areSomeGroupItemsSelected = (group: GroupedBillItems): boolean => {
  return group.items.some(item => props.isItemSelected(item.id))
}

const areAllGroupItemsPaid = (group: GroupedBillItems): boolean => {
  return group.items.every(item => item.paymentStatus === 'paid')
}

// Expand/collapse logic
const isGroupExpanded = (groupKey: string): boolean => {
  return expandedGroups.value.has(groupKey)
}

const toggleGroup = (groupKey: string): void => {
  if (expandedGroups.value.has(groupKey)) {
    expandedGroups.value.delete(groupKey)
  } else {
    expandedGroups.value.add(groupKey)
  }
}

// Methods
const handleSelect = (itemId: string, selected: boolean): void => {
  emit('select', itemId, selected)
}

const handleSelectGroup = (group: GroupedBillItems, selected: boolean): void => {
  // Выбираем/снимаем выбор только с unpaid items
  group.items.forEach(item => {
    if (item.paymentStatus !== 'paid') {
      emit('select', item.id, selected)
    }
  })
}

const handleCancel = (itemId: string): void => {
  emit('cancel', itemId)
}

// Cancellation validation helpers
const canCancelItem = (item: PosBillItem): boolean => {
  if (item.status === 'served') return false
  if (item.status === 'cancelled') return false
  if (item.paymentStatus === 'paid') return false
  return true
}

const getCancelBlockReason = (item: PosBillItem): string => {
  if (item.status === 'served') return 'Served'
  if (item.status === 'cancelled') return 'Already cancelled'
  if (item.paymentStatus === 'paid') return 'Paid'
  return ''
}

const handleAddNote = (itemId: string): void => {
  emit('add-note', itemId)
}

const handleAddOneMore = (group: GroupedBillItems): void => {
  emit('add-one-more', group)
}

const handleApplyDiscount = (itemId: string): void => {
  emit('apply-discount', itemId)
}

// Discount helpers
const hasItemDiscounts = (item: PosBillItem): boolean => {
  return item.discounts && item.discounts.length > 0
}

// calculateItemDiscounts moved up before groupedItems computed (line 380)

const hasGroupDiscounts = (group: GroupedBillItems): boolean => {
  return group.items.some(item => hasItemDiscounts(item))
}

const calculateGroupDiscounts = (group: GroupedBillItems): number => {
  const totalDiscounts = group.items.reduce((sum, item) => {
    const itemDiscounts = calculateItemDiscounts(item)
    return sum + itemDiscounts
  }, 0)

  return totalDiscounts
}

/**
 * Calculate original price for a group (BEFORE any discounts)
 * Simply sum up item.totalPrice which already contains (unitPrice + modifiersTotal) * quantity
 */
const calculateGroupOriginalPrice = (group: GroupedBillItems): number => {
  return group.items.reduce((sum, item) => sum + item.totalPrice, 0)
}
</script>

<style scoped>
/* =============================================
   TABLET-OPTIMIZED CLEAN DESIGN
   ============================================= */

.bill-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-group {
  background: transparent;
}

/* =============================================
   GROUP HEADER - TWO LINES LAYOUT
   ============================================= */

.group-header {
  display: flex;
  align-items: center;
  padding: 16px 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 8px;
  gap: 16px;
  min-height: 64px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.group-header:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.group-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name-full {
  font-weight: 600;
  font-size: 1rem;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-meta-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.group-price-inline {
  font-weight: 600;
  font-size: 0.9rem;
  color: rgb(var(--v-theme-on-surface));
  flex-shrink: 0;
  margin-left: 8px;
}

.group-modifications {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 6px;
  min-height: 32px;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* =============================================
   SINGLE ITEM - TWO LINES LAYOUT
   ============================================= */

.single-item {
  display: flex;
  align-items: center;
  padding: 16px 12px;
  gap: 16px;
  min-height: 64px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  transition: background-color 0.2s ease;
}

.status-chip,
.payment-chip {
  height: 24px !important;
  font-size: 0.75rem !important;
  flex-shrink: 0;
  margin-right: 4px;
}

.payment-chip {
  margin-left: 4px;
}

.single-item:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}

.single-item.selected {
  background: rgba(var(--v-theme-primary), 0.08);
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name-single {
  font-weight: 600;
  font-size: 1rem;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-meta-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.item-price-inline {
  font-weight: 600;
  font-size: 0.9rem;
  color: rgb(var(--v-theme-on-surface));
  flex-shrink: 0;
  margin-left: 8px;
}

.item-modifications {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 6px;
  min-height: 32px;
}

/* =============================================
   SHARED STYLES
   ============================================= */

.variant-name-inline {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 500;
  flex-shrink: 0;
}

.variant-name-line {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 500;
  line-height: 1.2;
  margin-top: 2px;
}

.mod-chip {
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-info));
  background: rgba(var(--v-theme-info), 0.12);
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 500;
  white-space: nowrap;
}

.count-badge {
  background: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  min-width: 32px;
  text-align: center;
}

.status-chip {
  height: 24px !important;
  font-size: 0.75rem !important;
  flex-shrink: 0;
}

/* =============================================
   ITEMS LIST - NO BORDERS
   ============================================= */

.items-list {
  padding: 0 8px 8px 8px;
  margin-top: 4px;
}

.item-row {
  display: flex;
  align-items: center;
  padding: 12px 8px;
  gap: 12px;
  min-height: 48px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  margin-bottom: 2px;
}

.item-row:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}

.item-row.selected {
  background: rgba(var(--v-theme-primary), 0.08);
}

.item-number {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  min-width: 28px;
  font-weight: 600;
}

.spacer {
  flex: 1;
}

.item-price {
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  min-width: 80px;
  text-align: right;
}

/* =============================================
   VUETIFY OVERRIDES FOR TABLET
   ============================================= */

:deep(.v-selection-control) {
  min-height: auto !important;
}

:deep(.v-selection-control__wrapper) {
  height: 24px !important;
}

:deep(.v-selection-control__input) {
  width: 24px !important;
  height: 24px !important;
}

.v-chip {
  height: 24px !important;
  font-size: 0.75rem !important;
}

.v-btn {
  min-width: 40px !important;
  height: 40px !important;
}

/* =============================================
   PAID ITEMS VISUAL INDICATOR
   ============================================= */

.item-paid {
  opacity: 0.6;
  background: rgba(var(--v-theme-success), 0.05) !important;
  border-left: 3px solid rgba(var(--v-theme-success), 0.3);
}

.item-paid:hover {
  background: rgba(var(--v-theme-success), 0.08) !important;
}

.item-paid :deep(.v-checkbox) {
  opacity: 0.5;
}

.item-paid :deep(.v-selection-control--disabled) {
  opacity: 0.4;
}

/* =============================================
   CANCELLED ITEMS VISUAL INDICATOR
   ============================================= */

.item-cancelled {
  opacity: 0.5;
  background: rgba(var(--v-theme-error), 0.05) !important;
  border-left: 3px solid rgba(var(--v-theme-error), 0.3);
}

.item-cancelled:hover {
  background: rgba(var(--v-theme-error), 0.08) !important;
}

.item-cancelled .item-name-single,
.item-cancelled .item-name-full {
  text-decoration: line-through;
  color: rgb(var(--v-theme-on-surface-variant));
}

.item-cancelled .item-price,
.item-cancelled .item-price-inline,
.item-cancelled .group-price-inline {
  text-decoration: line-through;
  color: rgb(var(--v-theme-on-surface-variant));
}

/* =============================================
   DISCOUNT TOOLTIP
   ============================================= */

.discount-tooltip {
  max-width: 300px;
  padding: 4px;
}

.discount-tooltip .text-caption {
  line-height: 1.4;
}

/* =============================================
   PRICE WITH DISCOUNT
   ============================================= */

.price-with-discount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.old-price {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  text-decoration: line-through;
  opacity: 0.6;
}

.discount-badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.new-price {
  font-weight: 600;
  font-size: 0.9rem;
  color: rgb(var(--v-theme-on-surface));
  font-variant-numeric: tabular-nums;
}

/* =============================================
   RESPONSIVE ADJUSTMENTS
   ============================================= */

@media (max-width: 768px) {
  .group-header {
    padding: 12px 10px;
    min-height: 56px;
  }

  .single-item {
    padding: 12px 10px;
    min-height: 56px;
  }

  .item-row {
    padding: 10px 6px;
    min-height: 44px;
  }

  .group-badges,
  .item-badges {
    gap: 4px;
  }

  .mod-chip {
    font-size: 0.75rem;
    padding: 3px 8px;
  }

  .group-modifications,
  .item-modifications {
    gap: 6px;
    min-height: 28px;
  }
}
</style>
