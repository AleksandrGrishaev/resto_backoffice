<!-- src/views/pos/order/components/BillsTabs.vue -->
<template>
  <div class="bills-tabs-wrapper">
    <!-- Rename Dialog -->
    <v-dialog v-model="showRenameDialog" max-width="300">
      <v-card>
        <v-card-title class="text-h6">Rename Bill</v-card-title>
        <v-card-text class="pt-4">
          <v-text-field
            v-model="newBillName"
            label="Bill Name"
            variant="outlined"
            hide-details
            autofocus
            @keyup.enter="confirmRename"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeRenameDialog">Cancel</v-btn>
          <v-btn color="primary" :disabled="!newBillName.trim()" @click="confirmRename">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Delete Bill</v-card-title>
        <v-card-text>
          <div v-if="billToDelete && billToDelete.items.length === 0">
            Are you sure you want to delete "{{ billToDelete.name }}"?
          </div>
          <div v-else class="text-error">
            Cannot delete bill with items. Please remove all items first.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDeleteDialog">Cancel</v-btn>
          <v-btn
            v-if="billToDelete && billToDelete.items.length === 0"
            color="error"
            @click="confirmDelete"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bills Tabs -->
    <v-tabs
      v-model="activeTab"
      density="compact"
      color="primary"
      align-tabs="start"
      class="bills-tabs px-2"
    >
      <v-tab
        v-for="bill in bills"
        :key="bill.id"
        :value="bill.id"
        class="bill-tab"
        :class="{ 'bill-paid': bill.paymentStatus === 'paid' }"
      >
        <div class="d-flex align-center justify-space-between w-100">
          <!-- Чекбокс для выбора счета -->
          <v-checkbox
            v-if="showSelectionMode"
            :model-value="isBillSelected(bill.id)"
            density="compact"
            hide-details
            color="primary"
            class="bill-checkbox mr-2"
            @click.stop
            @update:model-value="() => handleBillSelection(bill.id)"
          />

          <!-- Название счета с счетчиком позиций -->
          <div class="bill-info flex-grow-1">
            <span class="bill-name">{{ bill.name }}</span>
            <v-chip
              v-if="bill.items.length > 0"
              size="x-small"
              variant="text"
              class="bill-count ml-1"
            >
              {{ bill.items.length }}
            </v-chip>
          </div>

          <!-- Правая секция с индикаторами -->
          <div class="d-flex align-center gap-1">
            <!-- Индикатор оплаты -->
            <v-icon
              v-if="bill.paymentStatus === 'paid'"
              size="small"
              color="success"
              icon="mdi-check-circle"
              class="payment-indicator"
            >
              <v-tooltip activator="parent" location="top">Bill Paid</v-tooltip>
            </v-icon>
            <v-icon
              v-else-if="bill.paymentStatus === 'partial'"
              size="small"
              color="warning"
              icon="mdi-clock-time-four"
              class="payment-indicator"
            >
              <v-tooltip activator="parent" location="top">Partial Payment</v-tooltip>
            </v-icon>
            <v-icon
              v-else-if="bill.items.length > 0 && bill.total > 0"
              size="small"
              color="error"
              icon="mdi-credit-card-off"
              class="payment-indicator"
            >
              <v-tooltip activator="parent" location="top">
                Unpaid - {{ formatPrice(bill.total) }}
              </v-tooltip>
            </v-icon>

            <!-- Индикатор новых позиций -->
            <v-badge
              v-if="getNewItemsCount(bill) > 0"
              :content="getNewItemsCount(bill)"
              color="error"
              class="status-badge"
            >
              <v-icon size="small" color="error" icon="mdi-circle" class="status-indicator">
                <v-tooltip activator="parent" location="top">
                  {{ getNewItemsCount(bill) }} new items
                </v-tooltip>
              </v-icon>
            </v-badge>

            <!-- Меню действий -->
            <v-menu location="bottom">
              <template #activator="{ props }">
                <v-btn
                  icon="mdi-dots-vertical"
                  variant="text"
                  density="comfortable"
                  size="small"
                  v-bind="props"
                  @click.stop
                />
              </template>

              <v-list density="compact">
                <v-list-item @click="openRenameDialog(bill)">
                  <template #prepend>
                    <v-icon size="small">mdi-pencil</v-icon>
                  </template>
                  <v-list-item-title>Rename</v-list-item-title>
                </v-list-item>

                <v-divider />

                <v-list-item :disabled="bill.items.length > 0" @click="openDeleteDialog(bill)">
                  <template #prepend>
                    <v-icon size="small" color="error">mdi-delete</v-icon>
                  </template>
                  <v-list-item-title>Delete</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>
      </v-tab>

      <!-- Кнопка добавления нового счета -->
      <v-btn
        v-if="canAddBill && allowMultipleBills"
        variant="text"
        icon="mdi-plus"
        size="small"
        color="primary"
        class="ml-2 add-bill-btn"
        @click="handleAddBill"
      >
        <v-tooltip activator="parent" location="bottom">Add New Bill</v-tooltip>
      </v-btn>
    </v-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { PosBill, OrderType } from '@/stores/pos/types'
import { formatIDR } from '@/utils/currency'

// Alias для удобства
const formatPrice = formatIDR

// Props
interface Props {
  bills: PosBill[]
  activeBillId: string | null
  orderType: OrderType | null
  canAddBill?: boolean
  showSelectionMode?: boolean
  isBillSelected: (billId: string) => boolean
}

const props = withDefaults(defineProps<Props>(), {
  canAddBill: true,
  showSelectionMode: true
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

const handleAddBill = (): void => {
  emit('add-bill')
}

const getNewItemsCount = (bill: PosBill): number => {
  return bill.items.filter(item => item.status === 'pending').length
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
   BILLS TABS LAYOUT
   ============================================= */

.bills-tabs-wrapper {
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.12);
  height: 48px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.bills-tabs {
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--v-theme-on-surface), 0.3) transparent;
}

.bills-tabs::-webkit-scrollbar {
  height: 4px;
}

.bills-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.bills-tabs::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 2px;
}

.bills-tabs::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.5);
}

/* =============================================
   BILL TAB STYLING
   ============================================= */

.bill-tab {
  text-transform: none;
  letter-spacing: normal;
  min-width: 120px;
  max-width: 200px;
  padding: 0 12px;
  height: 44px;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.bill-tab:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}

.bill-tab.bill-paid {
  opacity: 0.7;
  background: rgba(var(--v-theme-success), 0.05);
}

.bill-tab.bill-paid:hover {
  opacity: 1;
  background: rgba(var(--v-theme-success), 0.1);
}

/* =============================================
   BILL INFO
   ============================================= */

.bill-info {
  display: flex;
  align-items: center;
  min-width: 0;
}

.bill-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.bill-count {
  opacity: 0.7;
  height: 18px !important;
  font-size: 0.7rem !important;
}

/* =============================================
   INDICATORS
   ============================================= */

.payment-indicator {
  opacity: 0.9;
  transition: opacity 0.2s ease;
}

.status-indicator {
  opacity: 0.8;
}

.status-badge {
  position: relative;
}

/* =============================================
   CHECKBOX
   ============================================= */

.bill-checkbox {
  margin-right: 8px !important;
}

.bill-checkbox :deep(.v-selection-control__wrapper) {
  width: 18px;
  height: 18px;
}

/* =============================================
   ADD BILL BUTTON
   ============================================= */

.add-bill-btn {
  flex-shrink: 0;
  margin-left: 8px !important;
  border: 1px dashed rgba(var(--v-theme-primary), 0.5);
}

.add-bill-btn:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

/* Touch-friendly для планшетов */
@media (max-width: 1024px) {
  .bills-tabs-wrapper {
    height: 52px;
  }

  .bill-tab {
    min-width: 140px;
    height: 48px;
    padding: 0 16px;
  }

  .bill-name {
    font-size: 1rem;
  }

  /* Увеличиваем размеры кнопок для touch */
  :deep(.v-btn) {
    min-width: 44px;
    min-height: 44px;
  }

  /* Увеличиваем чекбоксы */
  .bill-checkbox :deep(.v-selection-control__wrapper) {
    width: 24px;
    height: 24px;
  }
}

/* Для мобильных устройств */
@media (max-width: 768px) {
  .bills-tabs-wrapper {
    height: 56px;
  }

  .bill-tab {
    min-width: 160px;
    max-width: 240px;
    height: 52px;
    padding: 0 20px;
  }

  .bill-name {
    font-size: 1.1rem;
  }

  .bill-count {
    height: 20px !important;
    font-size: 0.75rem !important;
  }
}

/* =============================================
   SELECTION MODE
   ============================================= */

:deep(.v-tab--selected) .bill-checkbox {
  color: rgb(var(--v-theme-primary));
}

.bill-tab:has(.bill-checkbox :deep(.v-selection-control--dirty)) {
  background: rgba(var(--v-theme-primary), 0.08);
}

/* =============================================
   ANIMATIONS
   ============================================= */

.bill-tab {
  transition: all 0.2s ease;
}

.payment-indicator,
.status-indicator {
  transition: all 0.2s ease;
}

.bill-tab:hover .payment-indicator,
.bill-tab:hover .status-indicator {
  opacity: 1;
}

/* =============================================
   DIALOGS
   ============================================= */

.v-dialog .v-card {
  border-radius: 12px;
}

.v-dialog .v-card-title {
  padding-bottom: 8px;
}

.v-dialog .v-text-field {
  margin-top: 8px;
}

/* =============================================
   ACCESSIBILITY
   ============================================= */

.bill-tab:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.add-bill-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* =============================================
   DARK MODE ADJUSTMENTS
   ============================================= */

@media (prefers-color-scheme: dark) {
  .bills-tabs::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
  }

  .bills-tabs::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
}
</style>
