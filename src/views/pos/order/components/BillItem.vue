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
              <span v-if="group.variantName" class="variant-name-inline">
                {{ group.variantName }}
              </span>
            </div>

            <!-- Вторая строка: счетчик, модификации и цена -->
            <div class="group-meta-line">
              <div class="group-badges">
                <span class="count-badge">{{ group.items.length }}</span>
                <span v-for="mod in group.modifications" :key="mod" class="mod-chip">
                  +{{ mod }}
                </span>
              </div>
              <span class="group-price-inline">{{ formatPrice(group.totalPrice) }}</span>
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
                'item-paid': item.paymentStatus === 'paid'
              }"
            >
              <v-checkbox
                :model-value="isItemSelected(item.id)"
                :disabled="item.paymentStatus === 'paid'"
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

              <div v-if="item.kitchenNotes" class="notes-inline">
                <v-icon size="16" color="warning">mdi-note-text</v-icon>
                <span class="note-text">{{ item.kitchenNotes }}</span>
              </div>

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
                  <v-list-item @click="handleAddNote(item.id)">
                    <template #prepend>
                      <v-icon size="small">mdi-note-plus</v-icon>
                    </template>
                    <v-list-item-title>Add Note</v-list-item-title>
                  </v-list-item>

                  <v-divider />

                  <v-list-item class="text-error" @click="handleCancel(item.id)">
                    <template #prepend>
                      <v-icon size="small" color="error">mdi-cancel</v-icon>
                    </template>
                    <v-list-item-title>Cancel Item</v-list-item-title>
                  </v-list-item>
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
          'item-paid': group.items[0].paymentStatus === 'paid'
        }"
      >
        <v-checkbox
          :model-value="isItemSelected(group.items[0].id)"
          :disabled="group.items[0].paymentStatus === 'paid'"
          density="comfortable"
          hide-details
          @update:model-value="val => handleSelect(group.items[0].id, val)"
        />

        <div class="item-info">
          <!-- Первая строка: только название -->
          <div class="item-name-single">
            {{ group.menuItemName }}
            <span v-if="group.variantName" class="variant-name-inline">
              {{ group.variantName }}
            </span>
          </div>

          <!-- Вторая строка: статус, модификации, заметки и цена -->
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

              <span v-for="mod in group.modifications" :key="mod" class="mod-chip">+{{ mod }}</span>

              <div v-if="group.items[0].kitchenNotes" class="notes-inline">
                <v-icon size="14" color="warning">mdi-note-text</v-icon>
                <span class="note-text">{{ group.items[0].kitchenNotes }}</span>
              </div>
            </div>

            <span class="item-price-inline">{{ formatPrice(group.items[0].totalPrice) }}</span>
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
            <v-list-item @click="handleAddNote(group.items[0].id)">
              <template #prepend>
                <v-icon size="small">mdi-note-plus</v-icon>
              </template>
              <v-list-item-title>Add Note</v-list-item-title>
            </v-list-item>

            <v-divider />

            <v-list-item class="text-error" @click="handleCancel(group.items[0].id)">
              <template #prepend>
                <v-icon size="small" color="error">mdi-cancel</v-icon>
              </template>
              <v-list-item-title>Cancel Item</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PosBillItem, ItemStatus, ItemPaymentStatus } from '@/stores/pos/types'
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
}>()

// Состояние сворачивания групп
const expandedGroups = ref<Set<string>>(new Set())

// Группировка с учетом модификаций
const groupedItems = computed(() => {
  const groups = new Map<string, GroupedBillItems>()

  props.items.forEach(item => {
    // Создаем ключ с учетом модификаций
    const modificationsKey = item.modifications
      ? item.modifications
          .map(m => m.name)
          .sort()
          .join('-')
      : 'no-mods'

    // Включаем variantId в ключ группировки для разделения модификаций
    const key = `${item.menuItemId}-${item.variantId || 'default'}-${modificationsKey}`

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        variantId: item.variantId,
        variantName: item.variantName,
        modifications: item.modifications?.map(m => m.name),
        items: [],
        totalPrice: 0
      })

      // По умолчанию группы развернуты
      expandedGroups.value.add(key)
    }

    const group = groups.get(key)!
    group.items.push(item)
    group.totalPrice += item.totalPrice
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

const handleAddNote = (itemId: string): void => {
  emit('add-note', itemId)
}

const handleAddOneMore = (group: GroupedBillItems): void => {
  emit('add-one-more', group)
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
  margin-bottom: 6px;
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
  margin-bottom: 6px;
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

/* =============================================
   SHARED STYLES
   ============================================= */

.variant-name-inline {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 500;
  flex-shrink: 0;
}

.mod-chip {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-info));
  background: rgba(var(--v-theme-info), 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
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

.notes-inline {
  display: flex;
  align-items: center;
  gap: 4px;
}

.note-text {
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-warning));
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
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
    font-size: 0.7rem;
    padding: 1px 4px;
  }

  .note-text {
    max-width: 80px;
  }
}
</style>
