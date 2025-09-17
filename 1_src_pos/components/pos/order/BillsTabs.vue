<!-- ПРОШЛЫЙ ФАЙЛ -->
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
      density="comfortable"
      color="primary"
      align-tabs="start"
      class="bills-tabs px-4"
    >
      <v-tab v-for="bill in bills" :key="bill.id" :value="bill.id" class="bill-tab">
        <div class="d-flex align-center justify-space-between w-100">
          <!-- Чекбокс для выбора счета -->
          <v-checkbox
            :model-value="isBillSelected(bill.id)"
            density="compact"
            hide-details
            class="bill-checkbox mr-2"
            @click.stop="toggleBillSelection(bill.id)"
          />

          <!-- Название счета -->
          <span class="bill-name">{{ bill.name }}</span>

          <!-- Правая секция с индикаторами -->
          <div class="d-flex align-center gap-1">
            <!-- Индикатор оплаты -->
            <template v-if="billPaymentStatus(bill.id) !== 'new'">
              <v-icon
                v-if="billPaymentStatus(bill.id) === 'paid'"
                size="small"
                color="success"
                icon="mdi-check-circle"
                class="payment-indicator"
              >
                <v-tooltip activator="parent" location="top">Bill Paid</v-tooltip>
              </v-icon>
              <v-icon
                v-else
                size="small"
                color="error"
                icon="mdi-credit-card-off"
                class="payment-indicator"
              >
                <v-tooltip activator="parent" location="top">Not Paid</v-tooltip>
              </v-icon>
            </template>

            <!-- Индикатор новых позиций -->
            <v-icon
              v-if="bill.items.some(item => item.status === 'pending')"
              size="small"
              color="primary"
              icon="mdi-circle-small"
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
                <v-list-item :disabled="!canEditBill(bill)" @click="openRenameDialog(bill)">
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
        v-if="canAddBill"
        variant="text"
        icon="mdi-plus"
        size="small"
        class="ml-2"
        @click="$emit('add-bill')"
      />
    </v-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Bill } from '@/types/bill'
import { useBillStore } from '@/stores/bill.store'

const MODULE_NAME = 'BillsTabs'

const billStore = useBillStore()
const isBillSelected = computed(() => (billId: string) => {
  return billStore.selection.selectedBills.has(billId)
})

const props = defineProps<{
  bills: Bill[]
  activeBillId: string | null
  canAddBill: boolean
  canEditBill: (bill: Bill) => boolean
}>()

const emit = defineEmits<{
  'update:activeBillId': [string]
  'add-bill': []
  'rename-bill': [billId: string, newName: string]
  'remove-bill': [billId: string]
}>()

const billPaymentStatus = computed(() => (billId: string) => {
  const bill = props.bills.find(b => b.id === billId)
  return bill?.paymentStatus || 'unpaid'
})

// Dialog states
const showRenameDialog = ref(false)
const showDeleteDialog = ref(false)
const billToRename = ref<Bill | null>(null)
const billToDelete = ref<Bill | null>(null)
const newBillName = ref('')
const activeTab = ref(props.activeBillId)

// Rename methods
const openRenameDialog = (bill: Bill) => {
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

// Добавляем метод для переключения выбора
const toggleBillSelection = async (billId: string) => {
  const bill = props.bills.find(b => b.id === billId)
  if (!bill) return

  const isCurrentlySelected = billStore.selection.selectedBills.has(billId)
  billStore.toggleBillSelection(billId)

  if (!isCurrentlySelected) {
    billStore.selectBillItems(bill)
  } else {
    billStore.unselectBillItems(bill)
  }
}

// Delete methods
const openDeleteDialog = (bill: Bill) => {
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
    emit('update:activeBillId', newValue)
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
}

.bill-tab {
  text-transform: none;
  letter-spacing: normal;
  min-width: 100px;
  max-width: 160px;
  padding: 0 8px;
}

.bill-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 8px;
}

.gap-1 {
  gap: 4px;
}

.bill-checkbox {
  margin-right: 8px !important;
}

.payment-indicator {
  opacity: 0.9;
  &.v-icon--success {
    color: rgb(var(--v-theme-success));
  }
  &.v-icon--warning {
    color: rgb(var(--v-theme-warning));
  }
  &.v-icon--error {
    color: rgb(var(--v-theme-error));
  }
}

.status-indicator {
  opacity: 0.7;
}

/* Стили для режима выбора */
:deep(.v-tab--selected) .bill-checkbox {
  color: var(--v-theme-primary);
}

/* Стили для оплаченного счета */
.bill-tab[data-paid='true'] {
  opacity: 0.7;
}

.bill-tab[data-paid='true']:hover {
  opacity: 1;
}
</style>
