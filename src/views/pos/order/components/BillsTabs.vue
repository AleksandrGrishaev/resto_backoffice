<!-- src/views/pos/order/components/BillsTabs.vue -->
<template>
  <div class="bills-tabs">
    <div class="tabs-container d-flex align-center">
      <!-- Bills Tabs -->
      <div class="tabs-list flex-grow-1 overflow-x-auto">
        <div class="tabs-wrapper d-flex">
          <v-btn
            v-for="bill in bills"
            :key="bill.id"
            :color="bill.id === activeBillId ? 'primary' : 'surface-variant'"
            :variant="bill.id === activeBillId ? 'flat' : 'text'"
            class="bill-tab"
            size="large"
            :class="{
              'bill-tab-active': bill.id === activeBillId,
              'bill-tab-paid': bill.paymentStatus === 'paid',
              'bill-tab-partial': bill.paymentStatus === 'partial'
            }"
            @click="selectBill(bill.id)"
            @contextmenu.prevent="showBillMenu(bill, $event)"
          >
            <!-- Bill Icon -->
            <v-icon start size="18" :icon="getBillIcon(bill)" />

            <!-- Bill Name -->
            <span class="bill-name">{{ bill.name }}</span>

            <!-- Items Count Badge -->
            <v-badge
              v-if="bill.items.length > 0"
              :content="bill.items.length"
              :color="getBadgeColor(bill)"
              inline
              class="ml-2"
            />

            <!-- Payment Status Indicator -->
            <v-icon
              v-if="bill.paymentStatus !== 'unpaid'"
              :color="getPaymentStatusColor(bill.paymentStatus)"
              size="16"
              class="ml-1"
            >
              {{ getPaymentStatusIcon(bill.paymentStatus) }}
            </v-icon>

            <!-- Close Button (for additional bills) -->
            <v-btn
              v-if="canRemoveBill && bills.length > 1"
              icon
              variant="text"
              size="x-small"
              class="bill-close-btn ml-1"
              @click.stop="confirmRemoveBill(bill)"
            >
              <v-icon size="12">mdi-close</v-icon>
            </v-btn>
          </v-btn>
        </div>
      </div>

      <!-- Add Bill Button -->
      <div v-if="canAddBill" class="add-bill-section ml-2">
        <v-btn
          color="success"
          variant="outlined"
          size="large"
          class="add-bill-btn"
          :disabled="!canAddBill"
          @click="addNewBill"
        >
          <v-icon start>mdi-plus</v-icon>
          Add Bill
        </v-btn>
      </div>

      <!-- Overflow Menu (for small screens) -->
      <div class="bills-menu ml-2">
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn icon variant="text" size="large" v-bind="menuProps">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>

          <v-list density="compact">
            <v-list-item
              v-if="canAddBill"
              prepend-icon="mdi-plus"
              title="Add New Bill"
              @click="addNewBill"
            />
            <v-list-item
              v-if="activeBill"
              prepend-icon="mdi-pencil"
              title="Rename Bill"
              @click="showRenameBillDialog = true"
            />
            <v-list-item
              v-if="canMergeBills"
              prepend-icon="mdi-call-merge"
              title="Merge Bills"
              @click="handleMergeBills"
            />
            <v-divider />
            <v-list-item
              v-if="canRemoveBill && bills.length > 1"
              prepend-icon="mdi-delete"
              title="Remove Current Bill"
              :disabled="activeBill?.items.length > 0"
              @click="confirmRemoveBill(activeBill)"
            />
          </v-list>
        </v-menu>
      </div>
    </div>

    <!-- Rename Bill Dialog -->
    <v-dialog v-model="showRenameBillDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Rename Bill</v-card-title>
        <v-card-text class="pt-4">
          <v-text-field
            v-model="newBillName"
            label="Bill Name"
            variant="outlined"
            hide-details="auto"
            autofocus
            :rules="billNameRules"
            @keyup.enter="confirmRenameBill"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelRenameBill">Cancel</v-btn>
          <v-btn color="primary" :disabled="!isValidBillName" @click="confirmRenameBill">
            Rename
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove Bill Confirmation -->
    <v-dialog v-model="showRemoveBillDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Remove Bill</v-card-title>
        <v-card-text>
          <div v-if="billToRemove?.items.length === 0">
            Are you sure you want to remove "{{ billToRemove?.name }}"?
          </div>
          <div v-else class="text-error">
            Cannot remove bill with items. Please move or remove all items first.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelRemoveBill">Cancel</v-btn>
          <v-btn
            v-if="billToRemove?.items.length === 0"
            color="error"
            @click="confirmRemoveBillAction"
          >
            Remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PosBill } from '@/stores/pos/types'

// Props
interface Props {
  bills: PosBill[]
  activeBillId: string | null
  canAddBill?: boolean
  canRemoveBill?: boolean
  maxBills?: number
}

const props = withDefaults(defineProps<Props>(), {
  canAddBill: true,
  canRemoveBill: true,
  maxBills: 10
})

// Emits
const emit = defineEmits<{
  'select-bill': [billId: string]
  'add-bill': []
  'rename-bill': [billId: string, newName: string]
  'remove-bill': [billId: string]
  'merge-bills': []
}>()

// State
const showRenameBillDialog = ref(false)
const showRemoveBillDialog = ref(false)
const billToRemove = ref<PosBill | null>(null)
const newBillName = ref('')

// Computed
const activeBill = computed((): PosBill | null => {
  return props.bills.find(bill => bill.id === props.activeBillId) || null
})

const canMergeBills = computed((): boolean => {
  return props.bills.length > 1
})

const isValidBillName = computed((): boolean => {
  const trimmed = newBillName.value.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= 20 &&
    !props.bills.some(bill => bill.name === trimmed && bill.id !== props.activeBillId)
  )
})

// Validation rules
const billNameRules = [
  (v: string) => !!v || 'Bill name is required',
  (v: string) => v.length <= 20 || 'Bill name must be 20 characters or less',
  (v: string) =>
    !props.bills.some(bill => bill.name === v.trim() && bill.id !== props.activeBillId) ||
    'Bill name already exists'
]

// Methods
const getBillIcon = (bill: PosBill): string => {
  if (bill.paymentStatus === 'paid') return 'mdi-check-circle'
  if (bill.paymentStatus === 'partial') return 'mdi-clock-time-four'
  return bill.items.length > 0 ? 'mdi-receipt' : 'mdi-receipt-outline'
}

const getBadgeColor = (bill: PosBill): string => {
  if (bill.paymentStatus === 'paid') return 'success'
  if (bill.paymentStatus === 'partial') return 'warning'
  return 'primary'
}

const getPaymentStatusColor = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partial':
      return 'warning'
    default:
      return 'grey'
  }
}

const getPaymentStatusIcon = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'mdi-check'
    case 'partial':
      return 'mdi-clock-time-four'
    default:
      return 'mdi-help'
  }
}

const selectBill = (billId: string): void => {
  console.log('🧾 Select bill:', { billId, currentActive: props.activeBillId })
  emit('select-bill', billId)
}

const addNewBill = (): void => {
  if (!props.canAddBill || props.bills.length >= props.maxBills) return

  console.log('➕ Add new bill:', {
    currentBillsCount: props.bills.length,
    maxBills: props.maxBills
  })

  emit('add-bill')
}

const showBillMenu = (bill: PosBill, event: MouseEvent): void => {
  console.log('📋 Show bill context menu:', { billId: bill.id, billName: bill.name })
  // Right-click context menu - could implement custom context menu here
}

const showRenameBillDialogAction = (): void => {
  if (!activeBill.value) return

  newBillName.value = activeBill.value.name
  showRenameBillDialog.value = true
}

const cancelRenameBill = (): void => {
  showRenameBillDialog.value = false
  newBillName.value = ''
}

const confirmRenameBill = (): void => {
  if (!activeBill.value || !isValidBillName.value) return

  const trimmedName = newBillName.value.trim()

  console.log('✏️ Rename bill:', {
    billId: activeBill.value.id,
    oldName: activeBill.value.name,
    newName: trimmedName
  })

  emit('rename-bill', activeBill.value.id, trimmedName)
  showRenameBillDialog.value = false
  newBillName.value = ''
}

const confirmRemoveBill = (bill: PosBill | null): void => {
  if (!bill || !props.canRemoveBill) return

  billToRemove.value = bill
  showRemoveBillDialog.value = true
}

const cancelRemoveBill = (): void => {
  showRemoveBillDialog.value = false
  billToRemove.value = null
}

const confirmRemoveBillAction = (): void => {
  if (!billToRemove.value) return

  console.log('🗑️ Remove bill:', {
    billId: billToRemove.value.id,
    billName: billToRemove.value.name,
    itemsCount: billToRemove.value.items.length
  })

  emit('remove-bill', billToRemove.value.id)
  showRemoveBillDialog.value = false
  billToRemove.value = null
}

const handleMergeBills = (): void => {
  console.log('🔗 Merge bills:', { billsCount: props.bills.length })
  emit('merge-bills')
}
</script>

<style scoped>
/* =============================================
   BILLS TABS LAYOUT
   ============================================= */

.bills-tabs {
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding: var(--spacing-sm) var(--spacing-md);
}

.tabs-container {
  min-height: 48px;
}

.tabs-list {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tabs-list::-webkit-scrollbar {
  display: none;
}

.tabs-wrapper {
  gap: var(--spacing-xs);
  min-width: max-content;
}

/* =============================================
   BILL TAB STYLES
   ============================================= */

.bill-tab {
  min-height: 40px;
  border-radius: var(--v-border-radius-lg);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.bill-tab:not(.bill-tab-active) {
  opacity: 0.8;
}

.bill-tab-active {
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.3);
}

.bill-tab-paid {
  border: 1px solid rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.1);
}

.bill-tab-partial {
  border: 1px solid rgb(var(--v-theme-warning));
  background: rgba(var(--v-theme-warning), 0.1);
}

.bill-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-close-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.bill-tab:hover .bill-close-btn {
  opacity: 1;
}

/* =============================================
   ADD BILL SECTION
   ============================================= */

.add-bill-btn {
  border-radius: var(--v-border-radius-lg);
  white-space: nowrap;
}

.add-bill-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-success), 0.3);
}

/* =============================================
   BILLS MENU
   ============================================= */

.bills-menu .v-btn {
  border-radius: var(--v-border-radius-lg);
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .bills-tabs {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .bill-tab {
    min-height: 36px;
    font-size: 0.875rem;
  }

  .bill-name {
    max-width: 80px;
  }

  .add-bill-btn {
    min-width: 90px;
  }

  .add-bill-btn .v-icon {
    margin-right: 4px !important;
  }
}

@media (max-width: 480px) {
  .tabs-container {
    flex-direction: column;
    gap: var(--spacing-xs);
    align-items: stretch;
  }

  .add-bill-section {
    margin-left: 0 !important;
  }

  .bills-menu {
    align-self: flex-end;
    position: absolute;
    right: var(--spacing-sm);
    top: var(--spacing-xs);
  }
}

/* =============================================
   SCROLL INDICATORS
   ============================================= */

.tabs-list {
  position: relative;
}

.tabs-list::before,
.tabs-list::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20px;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tabs-list::before {
  left: 0;
  background: linear-gradient(
    to right,
    rgb(var(--v-theme-surface)),
    rgba(var(--v-theme-surface), 0)
  );
}

.tabs-list::after {
  right: 0;
  background: linear-gradient(
    to left,
    rgb(var(--v-theme-surface)),
    rgba(var(--v-theme-surface), 0)
  );
}

.tabs-list.scrollable-left::before,
.tabs-list.scrollable-right::after {
  opacity: 1;
}

/* =============================================
   DIALOG CUSTOMIZATIONS
   ============================================= */

.v-dialog .v-card {
  border-radius: var(--v-border-radius-lg);
}

.v-dialog .v-card-title {
  background: rgba(var(--v-theme-primary), 0.05);
}

/* =============================================
   ANIMATIONS
   ============================================= */

.bill-tab {
  animation: slideInFromBottom 0.3s ease;
}

@keyframes slideInFromBottom {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.add-bill-btn {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.add-bill-btn:active {
  transform: scale(0.95);
}
</style>
