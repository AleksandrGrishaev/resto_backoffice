<!-- src/views/pos/order/components/BillsTabs.vue -->
<template>
  <div class="bills-tabs-wrapper">
    <!-- Rename Dialog -->
    <v-dialog v-model="showRenameDialog" max-width="300">
      <v-card>
        <v-card-title class="text-h6">Rename</v-card-title>
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
        <v-card-title class="text-h6">Delete</v-card-title>
        <v-card-text>
          <div v-if="billToDelete?.items.length === 0">
            Are you sure you want to delete this bill?
          </div>
          <div v-else class="text-error">
            Cannot delete bill with items. Please remove all items first.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDeleteDialog">Cancel</v-btn>
          <v-btn v-if="billToDelete?.items.length === 0" color="error" @click="confirmDelete">
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
      <v-tab v-for="bill in bills" :key="bill.id" :value="bill.id" class="bill-tab">
        <div class="d-flex align-center justify-space-between w-100">
          <!-- Чекбокс для выбора счета -->
          <v-checkbox
            :model-value="isBillSelected?.(bill.id) || false"
            density="compact"
            hide-details
            class="bill-checkbox mr-2"
            @click.stop="toggleBillSelection?.(bill.id)"
          />

          <!-- Название счета -->
          <span class="bill-name">{{ bill.name }}</span>

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
              v-else-if="bill.items.length > 0"
              size="small"
              color="error"
              icon="mdi-credit-card-off"
              class="payment-indicator"
            >
              <v-tooltip activator="parent" location="top">Unpaid</v-tooltip>
            </v-icon>

            <!-- Индикатор новых позиций -->
            <v-icon
              v-if="hasNewItems(bill)"
              size="small"
              color="error"
              icon="mdi-circle"
              class="status-indicator"
            >
              <v-tooltip activator="parent" location="top">Has new items</v-tooltip>
            </v-icon>

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
        class="ml-2"
        @click="emit('add-bill')"
      />
    </v-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { PosBill, OrderType } from '@/stores/pos/types'

// Props
interface Props {
  bills: PosBill[]
  activeBillId: string | null
  orderType: OrderType | null
  canAddBill?: boolean
  isBillSelected?: (billId: string) => boolean
  toggleBillSelection?: (billId: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  canAddBill: true
})

// Emits
const emit = defineEmits<{
  'select-bill': [billId: string]
  'add-bill': []
  'rename-bill': [billId: string, newName: string]
  'remove-bill': [billId: string]
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
const hasNewItems = (bill: PosBill): boolean => {
  return bill.items.some(item => item.status === 'pending')
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
.bills-tabs-wrapper {
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.12);
  height: 48px;
  overflow: hidden;
}

.bills-tabs {
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.bills-tabs::-webkit-scrollbar {
  height: 4px;
}

.bills-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.bills-tabs::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.bills-tabs::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.bill-tab {
  text-transform: none;
  letter-spacing: normal;
  min-width: 100px;
  max-width: 160px;
  padding: 0 8px;
  height: 44px;
  flex-shrink: 0;
}

.bill-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 6px;
  font-size: 0.9rem;
  font-weight: 500;
}

/* Touch-friendly для планшетов */
@media (max-width: 1024px) {
  .bills-tabs-wrapper {
    height: 52px;
  }

  .bill-tab {
    min-width: 120px;
    height: 48px;
    padding: 0 12px;
  }

  .bill-name {
    font-size: 1rem;
  }

  .gap-1 {
    gap: 8px;
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
    min-width: 140px;
    height: 52px;
    padding: 0 16px;
  }

  .bill-name {
    font-size: 1.1rem;
  }
}

.gap-1 {
  gap: 4px;
}

.bill-checkbox {
  margin-right: 8px !important;
}

.payment-indicator {
  opacity: 0.9;
}

.status-indicator {
  opacity: 0.7;
}

/* Стили для режима выбора */
:deep(.v-tab--selected) .bill-checkbox {
  color: var(--v-theme-primary);
}
</style>
