<!-- src/views/pos/order/components/BillsTabs.vue -->
<template>
  <div class="bills-tabs-wrapper">
    <v-tabs
      v-model="activeTab"
      bg-color="surface"
      color="primary"
      density="compact"
      show-arrows
      class="bills-tabs"
    >
      <!-- Bill Tabs -->
      <v-tab
        v-for="bill in bills"
        :key="bill.id"
        :value="bill.id"
        class="bill-tab"
        :class="{ 'bill-tab-active': bill.id === activeBillId }"
      >
        <div class="tab-content">
          <!-- Selection Checkbox -->
          <div
            v-if="showSelectionMode"
            class="bill-selection"
            @click.stop="handleBillSelection(bill.id)"
          >
            <v-checkbox
              :model-value="getBillCheckboxState(bill.id).checked"
              :indeterminate="getBillCheckboxState(bill.id).indeterminate"
              density="compact"
              hide-details
              class="bill-checkbox"
              @click.stop
              @update:model-value="() => handleBillSelection(bill.id)"
            />
          </div>

          <!-- Bill Info -->
          <div class="bill-info">
            <!-- Bill Name -->
            <div class="bill-name">{{ bill.name }}</div>

            <!-- Bill Status Indicators -->
            <div class="bill-indicators">
              <!-- Items Count -->
              <v-chip
                size="x-small"
                :variant="getSelectionVariant(bill)"
                :color="getSelectionColor(bill)"
                class="selection-chip"
              >
                {{ getSelectionText(bill) }}
              </v-chip>

              <!-- New Items Badge -->
              <v-badge
                v-if="hasNewItems(bill)"
                :content="bill.items.filter(item => item.status === 'pending').length"
                color="warning"
                inline
                class="new-items-badge"
              >
                <v-icon size="14" color="warning">mdi-clock-fast</v-icon>
              </v-badge>

              <!-- Payment Status -->
              <v-icon
                :color="getPaymentStatusColor(bill.paymentStatus)"
                size="14"
                class="payment-status-icon"
              >
                {{ getPaymentStatusIcon(bill.paymentStatus) }}
              </v-icon>
            </div>
          </div>

          <!-- Tab Actions Menu -->
          <div v-if="canEditBill" class="tab-actions">
            <v-menu location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn
                  icon="mdi-dots-vertical"
                  variant="text"
                  size="x-small"
                  v-bind="menuProps"
                  @click.stop
                />
              </template>

              <v-list density="compact">
                <v-list-item @click="openRenameDialog(bill)">
                  <template #prepend>
                    <v-icon>mdi-pencil</v-icon>
                  </template>
                  <v-list-item-title>Rename</v-list-item-title>
                </v-list-item>

                <v-list-item
                  v-if="bills.length > 1"
                  class="text-error"
                  @click="openDeleteDialog(bill)"
                >
                  <template #prepend>
                    <v-icon>mdi-delete</v-icon>
                  </template>
                  <v-list-item-title>Delete</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>
      </v-tab>

      <!-- Add Bill Button -->
      <v-btn
        v-if="canAddBill && allowMultipleBills"
        icon
        variant="outlined"
        size="large"
        color="primary"
        class="add-bill-btn"
        @click="$emit('add-bill')"
      >
        <v-icon size="24">mdi-plus</v-icon>
        <v-tooltip activator="parent" location="bottom">Add New Bill</v-tooltip>
      </v-btn>
    </v-tabs>

    <!-- Rename Dialog -->
    <v-dialog v-model="showRenameDialog" max-width="400">
      <v-card>
        <v-card-title>Rename Bill</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newBillName"
            label="Bill Name"
            variant="outlined"
            density="compact"
            autofocus
            @keyup.enter="confirmRename"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeRenameDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!newBillName.trim()"
            @click="confirmRename"
          >
            Rename
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-error">Delete Bill</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ billToDelete?.name }}"?
          <br />
          <strong>This action cannot be undone.</strong>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDeleteDialog">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PosBill, OrderType } from '@/stores/pos/types'

interface Props {
  bills: PosBill[]
  activeBillId: string | null
  orderType: OrderType
  canAddBill?: boolean
  canEditBill?: boolean
  showSelectionMode?: boolean
  isBillSelected?: (billId: string) => boolean
  isItemSelected?: (itemId: string) => boolean
}

const props = withDefaults(defineProps<Props>(), {
  canAddBill: true,
  canEditBill: true,
  showSelectionMode: true,
  isBillSelected: () => false,
  isItemSelected: () => false
})

// Emits
const emit = defineEmits<{
  'select-bill': [billId: string]
  'add-bill': []
  'rename-bill': [billId: string, newName: string]
  'remove-bill': [billId: string]
  'toggle-bill-selection': [billId: string]
}>()

// Computed
const allowMultipleBills = computed((): boolean => {
  return props.orderType === 'dine_in'
})

// Dialog states
const showRenameDialog = ref(false)
const showDeleteDialog = ref(false)
const billToRename = ref<PosBill | null>(null)
const billToDelete = ref<PosBill | null>(null)
const newBillName = ref('')
const activeTab = ref(props.activeBillId)

// Methods
const handleBillSelection = (billId: string): void => {
  emit('toggle-bill-selection', billId)
}

const hasNewItems = (bill: PosBill): boolean => {
  return bill.items.some(item => item.status === 'pending')
}

const getPaymentStatusColor = (status: 'paid' | 'partial' | 'unpaid'): string => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partial':
      return 'warning'
    default:
      return 'grey'
  }
}

const getPaymentStatusIcon = (status: 'paid' | 'partial' | 'unpaid'): string => {
  switch (status) {
    case 'paid':
      return 'mdi-check-circle'
    case 'partial':
      return 'mdi-clock-outline'
    default:
      return 'mdi-circle-outline'
  }
}

// Rename methods
const openRenameDialog = (bill: PosBill) => {
  billToRename.value = bill
  newBillName.value = bill.name
  showRenameDialog.value = true
}

const closeRenameDialog = () => {
  showRenameDialog.value = false
  billToRename.value = null
  newBillName.value = ''
}

const confirmRename = () => {
  if (!billToRename.value || !newBillName.value.trim()) return

  emit('rename-bill', billToRename.value.id, newBillName.value.trim())
  closeRenameDialog()
}

// Delete methods
const openDeleteDialog = (bill: PosBill) => {
  billToDelete.value = bill
  showDeleteDialog.value = true
}

const closeDeleteDialog = () => {
  showDeleteDialog.value = false
  billToDelete.value = null
}

const confirmDelete = () => {
  if (!billToDelete.value) return

  emit('remove-bill', billToDelete.value.id)
  closeDeleteDialog()
}

// Добавить после существующих методов
const getSelectedItemsCount = (bill: PosBill): number => {
  return bill.items.filter(item => item.status !== 'cancelled' && props.isItemSelected?.(item.id))
    .length
}

const getSelectionText = (bill: PosBill): string => {
  const totalItems = bill.items.filter(item => item.status !== 'cancelled').length
  const selectedItems = getSelectedItemsCount(bill)

  if (selectedItems === 0) {
    return totalItems.toString()
  } else if (selectedItems === totalItems) {
    return totalItems.toString()
  } else {
    return `${selectedItems}/${totalItems}`
  }
}

const getSelectionVariant = (bill: PosBill): string => {
  const selectedItems = getSelectedItemsCount(bill)
  return selectedItems === 0 ? 'outlined' : 'flat'
}

const getSelectionColor = (bill: PosBill): string => {
  const selectedItems = getSelectedItemsCount(bill)
  const totalItems = bill.items.filter(item => item.status !== 'cancelled').length

  if (selectedItems === 0) return 'primary'
  if (selectedItems === totalItems) return 'success'
  return 'warning'
}

const getBillCheckboxState = (billId: string) => {
  const bill = props.bills.find(b => b.id === billId)
  if (!bill) return { checked: false, indeterminate: false }

  const totalItems = bill.items.filter(item => item.status !== 'cancelled').length
  const selectedItems = getSelectedItemsCount(bill)

  if (selectedItems === 0) {
    return { checked: false, indeterminate: false }
  } else if (selectedItems === totalItems) {
    return { checked: true, indeterminate: false }
  } else {
    return { checked: false, indeterminate: true }
  }
}

// Watchers
watch(activeTab, newValue => {
  if (newValue) {
    emit('select-bill', newValue)
  }
})

watch(
  () => props.activeBillId,
  newValue => {
    activeTab.value = newValue
  }
)
</script>

<style scoped>
/* =============================================
   TABS WRAPPER
   ============================================= */

.bills-tabs-wrapper {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgb(var(--v-theme-surface));
  min-height: 64px;
  overflow: hidden;
}

.bills-tabs {
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.bills-tabs::-webkit-scrollbar {
  height: 4px;
}

.bills-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.bills-tabs::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 2px;
}

/* =============================================
   TAB CONTENT
   ============================================= */

.bill-tab {
  min-width: 80px !important;
  max-width: 300px !important;
  height: 64px !important;
  padding: 8px 8px !important;
}

.tab-content {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
}

.bill-selection {
  flex-shrink: 0;
}

.bill-checkbox :deep(.v-input__control) {
  min-height: 24px;
}

.bill-checkbox :deep(.v-selection-control) {
  min-height: 24px;
}

.bill-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bill-name {
  font-weight: 500;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bill-indicators {
  display: flex;
  align-items: center;
  gap: 6px;
}

.selection-chip {
  height: 20px !important;
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  transition: all 0.2s ease;
}

.selection-chip.v-chip--variant-flat {
  animation: subtle-pulse 2s ease-in-out infinite;
}

.bill-checkbox :deep(.v-selection-control__input) {
  transition: all 0.2s ease;
}

.bill-checkbox :deep(.v-selection-control__input[aria-checked='mixed']) {
  color: rgb(var(--v-theme-warning));
}

@keyframes subtle-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.new-items-badge :deep(.v-badge__badge) {
  font-size: 0.6rem;
  height: 16px;
  min-width: 16px;
}

.payment-status-icon {
  opacity: 0.8;
}

.tab-actions {
  flex-shrink: 0;
}

.add-bill-btn {
  margin-left: 6px;
  margin-right: 6px;
  align-self: center; /* Центрирование по высоте */
  height: 36px !important; /* Фиксированная высота для выравнивания с табами */
  width: 36px !important; /* Квадратная форма */
  background: rgba(var(--v-theme-primary), 0.1) !important;
  border: 1px dashed rgba(var(--v-theme-primary), 0.4) !important;
  transition: all 0.2s ease;
}

.add-bill-btn:hover {
  background: rgba(var(--v-theme-primary), 0.15) !important;
  border-color: rgba(var(--v-theme-primary), 0.6) !important;
  transform: scale(1.05);
}

.add-bill-btn .v-icon {
  font-size: 1.5rem !important;
  color: rgb(var(--v-theme-primary)) !important;
}
/* =============================================
   ACTIVE STATES
   ============================================= */

.bill-tab-active .bill-name {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.bill-tab:hover .bill-name {
  color: rgb(var(--v-theme-primary));
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .bill-tab {
    min-width: 160px !important;
    max-width: 240px !important;
    padding: 6px 8px !important;
  }

  .tab-content {
    gap: 6px;
  }

  .bill-name {
    font-size: 0.8125rem;
  }

  .bill-indicators {
    gap: 4px;
  }
}

/* =============================================
   SELECTION MODE
   ============================================= */

.bills-tabs-wrapper.selection-active {
  background: rgba(var(--v-theme-primary), 0.04);
  border-bottom-color: rgba(var(--v-theme-primary), 0.2);
}

.bill-tab.bill-selected {
  background: rgba(var(--v-theme-primary), 0.08);
}

.bill-tab.bill-selected .bill-name {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
</style>
