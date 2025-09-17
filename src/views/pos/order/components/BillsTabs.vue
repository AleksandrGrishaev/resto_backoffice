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

            <!-- Close Button (только для dine-in заказов и при наличии нескольких счетов) -->
            <v-btn
              v-if="canRemoveBill && bills.length > 1 && allowMultipleBills"
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

      <!-- Add Bill Button (только для dine-in заказов) -->
      <div v-if="canAddBill && allowMultipleBills" class="add-bill-section ml-2">
        <v-btn
          color="success"
          variant="outlined"
          size="large"
          class="add-bill-btn"
          :disabled="!canAddBill || bills.length >= maxBills"
          @click="addNewBill"
        >
          <v-icon start>mdi-plus</v-icon>
          Add Bill
        </v-btn>
      </div>

      <!-- Bills Limitation Notice (для takeaway/delivery) -->
      <div v-else-if="!allowMultipleBills" class="limitation-notice ml-2">
        <v-chip size="small" variant="tonal" color="info" prepend-icon="mdi-information">
          Single Bill Only
        </v-chip>
      </div>

      <!-- Overflow Menu -->
      <div class="bills-menu ml-2">
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn icon variant="text" size="large" v-bind="menuProps">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>

          <v-list density="compact">
            <!-- Add Bill (для dine-in) -->
            <v-list-item
              v-if="canAddBill && allowMultipleBills"
              prepend-icon="mdi-plus"
              title="Add New Bill"
              :disabled="bills.length >= maxBills"
              @click="addNewBill"
            />

            <!-- Rename Bill -->
            <v-list-item
              v-if="activeBill"
              prepend-icon="mdi-pencil"
              title="Rename Bill"
              @click="showRenameBillDialog = true"
            />

            <!-- Merge Bills (только для dine-in с несколькими счетами) -->
            <v-list-item
              v-if="canMergeBills && allowMultipleBills"
              prepend-icon="mdi-call-merge"
              title="Merge Bills"
              @click="handleMergeBills"
            />

            <v-divider v-if="canRemoveBill || canMergeBills" />

            <!-- Remove Bill (только для dine-in) -->
            <v-list-item
              v-if="canRemoveBill && bills.length > 1 && allowMultipleBills"
              prepend-icon="mdi-delete"
              title="Remove Current Bill"
              :disabled="activeBill?.items.length > 0"
              @click="confirmRemoveBill(activeBill)"
            />
          </v-list>
        </v-menu>
      </div>
    </div>

    <!-- Bills Count Info -->
    <div v-if="bills.length > 1" class="bills-info text-center pa-1">
      <v-chip size="x-small" variant="text" color="primary">
        {{ bills.length }} bills • {{ totalItemsCount }} items
      </v-chip>
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
import type { PosBill, OrderType } from '@/stores/pos/types'

// Props
interface Props {
  bills: PosBill[]
  activeBillId: string | null
  orderType: OrderType | null
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

const allowMultipleBills = computed((): boolean => {
  // Только для dine-in заказов можно создавать несколько счетов
  return props.orderType === 'dine_in'
})

const canMergeBills = computed((): boolean => {
  return props.bills.length > 1 && allowMultipleBills.value
})

const totalItemsCount = computed((): number => {
  return props.bills.reduce((sum, bill) => sum + bill.items.length, 0)
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
  console.log('🧾 Select bill:', {
    billId,
    currentActive: props.activeBillId,
    orderType: props.orderType
  })
  emit('select-bill', billId)
}

const addNewBill = (): void => {
  if (!props.canAddBill || !allowMultipleBills.value || props.bills.length >= props.maxBills) {
    console.warn('❌ Cannot add bill:', {
      canAddBill: props.canAddBill,
      allowMultipleBills: allowMultipleBills.value,
      currentBillsCount: props.bills.length,
      maxBills: props.maxBills,
      orderType: props.orderType
    })
    return
  }

  console.log('➕ Add new bill:', {
    orderType: props.orderType,
    currentBillsCount: props.bills.length,
    maxBills: props.maxBills
  })

  emit('add-bill')
}

const showBillMenu = (bill: PosBill, event: MouseEvent): void => {
  console.log('📋 Show bill context menu:', {
    billId: bill.id,
    billName: bill.name,
    orderType: props.orderType
  })
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
    newName: trimmedName,
    orderType: props.orderType
  })

  emit('rename-bill', activeBill.value.id, trimmedName)
  showRenameBillDialog.value = false
  newBillName.value = ''
}

const confirmRemoveBill = (bill: PosBill | null): void => {
  if (!bill || !props.canRemoveBill || !allowMultipleBills.value) {
    console.warn('❌ Cannot remove bill:', {
      hasBill: !!bill,
      canRemoveBill: props.canRemoveBill,
      allowMultipleBills: allowMultipleBills.value,
      orderType: props.orderType
    })
    return
  }

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
    itemsCount: billToRemove.value.items.length,
    orderType: props.orderType
  })

  emit('remove-bill', billToRemove.value.id)
  showRemoveBillDialog.value = false
  billToRemove.value = null
}

const handleMergeBills = (): void => {
  if (!allowMultipleBills.value) {
    console.warn('❌ Cannot merge bills - not allowed for this order type:', props.orderType)
    return
  }

  console.log('🔗 Merge bills:', {
    billsCount: props.bills.length,
    orderType: props.orderType
  })
  emit('merge-bills')
}
</script>

<style scoped>
/* Оставляем существующие стили + добавляем новые */

.limitation-notice {
  flex-shrink: 0;
}

.bills-info {
  background: rgba(var(--v-theme-primary), 0.05);
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.bills-info .v-chip {
  font-size: 0.7rem;
}

/* Скрыть кнопку закрытия для заказов не dine-in */
.bill-tab:not(.allow-multiple) .bill-close-btn {
  display: none;
}

/* Дополнительная индикация для заказов с одним счетом */
.bills-tabs[data-single-bill='true'] .add-bill-btn {
  opacity: 0.5;
  pointer-events: none;
}

/* Добавить индикацию типа заказа */
.bills-tabs::before {
  content: attr(data-order-type);
  position: absolute;
  top: -20px;
  right: 10px;
  font-size: 0.6rem;
  color: var(--v-theme-on-surface);
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .limitation-notice {
    display: none; /* Скрываем на мобильных */
  }
}
</style>
