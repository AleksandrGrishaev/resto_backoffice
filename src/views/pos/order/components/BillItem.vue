/* ============================================= TABLET-OPTIMIZED CLEAN DESIGN
============================================= */ .bill-items { display: flex; flex-direction:
column; gap: 8px; } .item-group { background: transparent; } /*
============================================= GROUP HEADER - CLICKABLE
============================================= */ .group-header { display: flex; align-items: center;
padding: 16px 12px; background: rgba(var(--v-theme-on-surface), 0.02); border-radius: 8px; gap:
16px; min-height: 64px; cursor: pointer; transition: background-color 0.2s ease; }
.group-header:hover { background: rgba(var(--v-theme-on-surface), 0.04); } .group-info { flex: 1;
min-width: 0; } .group-actions { display: flex; align-items: center; gap: 12px; } .item-name {
font-weight: 600; font-size: 1rem; color: rgb(var(--v-theme-on-surface)); line-height: 1.2; }
.group-details-line { display: flex; align-items: center; gap: 8px; margin-top: 4px; } .variant-name
{ font-size: 0.875rem; color: rgb(var(--v-theme-on-surface-variant)); } .mod-chip { font-size:
0.75rem; color: rgb(var(--v-theme-info)); background: rgba(var(--v-theme-info), 0.1); padding: 2px
6px; border-radius: 4px; font-weight: 500; } .count-badge { background: rgba(var(--v-theme-primary),
0.15); color: rgb(var(--v-theme-primary)); padding: 4px 8px; border-radius: 12px; font-size:
0.875rem; font-weight: 600; min-width: 32px; text-align: center; } .group-price { font-weight: 600;
font-size: 1rem; color: rgb(var(--v-theme-on-surface)); min-width: 80px; text-align: right; } /*
============================================= SINGLE ITEM - TWO LINES
============================================= */ .single-item { display: flex; align-items:
flex-start; padding: 16px 12px; gap: 16px; min-height: 64px; border-radius: 8px; background:
rgba(var(--v-theme-on-surface), 0.02); transition: background-color 0.2s ease; } .single-item:hover
{ background: rgba(var(--v-theme-primary), 0.04); } .single-item.selected { background:
rgba(var(--v-theme-primary), 0.08); } .item-info { flex: 1; min-width: 0; } .item-name-line {
font-weight: 600; font-size: 1rem; color: rgb(var(--v-theme-on-surface)); line-height: 1.2;
margin-bottom: 4px; } .item-name-line .variant-name { color: rgb(var(--v-theme-on-surface-variant));
font-weight: 500; margin-left: 4px; } .item-details-line { display: flex; align-items: center; gap:
8px; flex-wrap: wrap; } .notes-inline { display: flex; align-items: center; gap: 4px; } .note-text {
font-size: 0.8125rem; color: rgb(var(--v-theme-warning)); font-style: italic; } /*
============================================= ITEMS LIST - NO BORDERS
============================================= */ .items-list { padding: 0 8px 8px 8px; margin-top:
4px; } .item-row { display: flex; align-items: center; padding: 12px 8px; gap: 12px; min-height:
48px; border-radius: 4px; transition: background-color 0.2s ease; margin-bottom: 2px; }
.item-row:hover { background: rgba(var(--v-theme-primary), 0.04); } .item-row.selected { background:
rgba(var(--v-theme-primary), 0.08); } .item-number { font-size: 0.875rem; color:
rgb(var(--v-theme-on-surface-variant)); min-width: 28px; font-weight: 600; } .spacer { flex: 1; }
.item-price { font-size: 1rem; font-weight: 600; color: rgb(var(--v-theme-on-surface)); min-width:
80px; text-align: right; } /* ============================================= STATUS CHIP
============================================= */ .status-chip { height: 24px !important; font-size:
0.75rem !important; flex-shrink: 0; } /* ============================================= VUETIFY
OVERRIDES FOR TABLET ============================================= */ :deep(.v-selection-control) {
min-height: auto !important; } :deep(.v-selection-control__wrapper) { height: 24px !important; }
:deep(.v-selection-control__input) { width: 24px !important; height: 24px !important; } .v-btn {
min-width: 40px !important; height: 40px !important; } /*
============================================= RESPONSIVE ADJUSTMENTS
============================================= */ @media (max-width: 768px) { .group-header {
padding: 12px
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
            density="comfortable"
            hide-details
            @click.stop
            @update:model-value="val => handleSelectGroup(group, val)"
          />

          <div class="group-info">
            <div class="item-name">{{ group.menuItemName }}</div>
            <div class="group-details-line">
              <span class="count-badge">{{ group.items.length }}</span>
              <div v-if="group.variantName" class="variant-name">{{ group.variantName }}</div>
              <span v-for="mod in group.modifications" :key="mod" class="mod-chip">+{{ mod }}</span>
            </div>
          </div>

          <div class="group-actions">
            <span class="group-price">{{ formatPrice(group.totalPrice) }}</span>
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
              :class="{ selected: isItemSelected(item.id) }"
            >
              <v-checkbox
                :model-value="isItemSelected(item.id)"
                density="comfortable"
                hide-details
                @update:model-value="val => handleSelect(item.id, val)"
              />

              <span class="item-number">#{{ index + 1 }}</span>

              <v-chip :color="getStatusColor(item.status)" size="small" variant="flat">
                {{ getStatusLabel(item.status) }}
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
      <div v-else class="single-item" :class="{ selected: isItemSelected(group.items[0].id) }">
        <v-checkbox
          :model-value="isItemSelected(group.items[0].id)"
          density="comfortable"
          hide-details
          @update:model-value="val => handleSelect(group.items[0].id, val)"
        />

        <div class="item-info">
          <!-- First Line: Name + Variant -->
          <div class="item-name-line">
            {{ group.menuItemName }}
            <span v-if="group.variantName" class="variant-name">{{ group.variantName }}</span>
          </div>

          <!-- Second Line: Status + Modifications + Notes -->
          <div class="item-details-line">
            <v-chip
              :color="getStatusColor(group.items[0].status)"
              size="small"
              variant="flat"
              class="status-chip"
            >
              {{ getStatusLabel(group.items[0].status) }}
            </v-chip>

            <span v-for="mod in group.modifications" :key="mod" class="mod-chip">+{{ mod }}</span>

            <div v-if="group.items[0].kitchenNotes" class="notes-inline">
              <v-icon size="14" color="warning">mdi-note-text</v-icon>
              <span class="note-text">{{ group.items[0].kitchenNotes }}</span>
            </div>
          </div>
        </div>

        <div class="spacer"></div>

        <span class="item-price">{{ formatPrice(group.items[0].totalPrice) }}</span>

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
import type { PosBillItem, ItemStatus } from '@/stores/pos/types'
import { formatIDR } from '@/utils/currency'
import { computed, ref } from 'vue'

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
  return group.items.every(item => props.isItemSelected(item.id))
}

const areSomeGroupItemsSelected = (group: GroupedBillItems): boolean => {
  return group.items.some(item => props.isItemSelected(item.id))
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
  group.items.forEach(item => {
    emit('select', item.id, selected)
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

const getStatusColor = (status: ItemStatus): string => {
  switch (status) {
    case 'pending':
      return 'orange'
    case 'sent_to_kitchen':
      return 'blue'
    case 'preparing':
      return 'purple'
    case 'ready':
      return 'green'
    case 'served':
      return 'success'
    case 'cancelled':
      return 'error'
    default:
      return 'grey'
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
      return 'Active'
  }
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
   GROUP HEADER - LARGER FOR TABLET
   ============================================= */

.group-header {
  display: flex;
  align-items: center;
  padding: 16px 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 8px;
  gap: 16px;
  min-height: 64px;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-name {
  font-weight: 600;
  font-size: 1rem;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.2;
}

.variant-name {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 2px;
}

.modifications {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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

.group-price {
  font-weight: 600;
  font-size: 1rem;
  color: rgb(var(--v-theme-on-surface));
  min-width: 80px;
  text-align: right;
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

/* =============================================
   SINGLE ITEM - LARGER
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

.item-notes {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.note-text {
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-warning));
  font-style: italic;
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
}
</style>
