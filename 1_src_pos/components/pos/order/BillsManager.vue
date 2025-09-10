<!-- src/components/pos/order/BillsManager.vue -->
<template>
  <div class="bill-manager flex-grow-1">
    <!-- Bills Management Section -->
    <bills-tabs
      :bills="bills"
      :active-bill-id="billStore.activeBill?.id || null"
      :can-add-bill="canAddBill"
      :can-edit-bill="billStore.isBillEditable"
      @update:active-bill-id="handleBillSelect"
      @add-bill="handleAddBill"
      @rename-bill="handleBillRename"
      @remove-bill="handleRemoveBill"
    />

    <!-- Bill Content -->
    <div v-if="billStore.activeBill" class="bill-content">
      <div v-if="billStore.activeBill.items.length" class="items-list">
        <order-bill-item
          v-for="billItem in billStore.activeBill.items"
          :key="billItem.id"
          :bill-item="billItem"
          :item="getMenuItem(billItem.dishId)"
          :is-selected="billStore.selection.selectedItems.has(billItem.id)"
          @edit="handleEdit"
          @delete="handleDelete"
          @cancel="handleCancel"
          @add-discount="handleAddDiscount"
        />
      </div>
      <div v-else class="empty-state pa-4 text-center text-medium-emphasis">
        Add items to bill from the menu
      </div>
    </div>
    <div v-else class="empty-state pa-4 text-center text-medium-emphasis">
      Select or create a bill to start adding items
    </div>

    <!-- Dialogs -->
    <bill-item-editor
      v-if="editingItem"
      v-model="showEditDialog"
      :item="editingItem.menuItem"
      :bill-item="editingItem.billItem"
      @confirm="handleEditConfirm"
    />

    <cancel-item-dialog
      v-model="showCancelDialog"
      :item="cancellationItem?.billItem"
      @confirm="handleCancelConfirm"
    />

    <discount-editor
      v-if="discountItem"
      v-model="showDiscountDialog"
      :item="discountItem.menuItem"
      :bill-item="discountItem.billItem"
      @confirm="handleDiscountConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMenuStore } from '@/stores/menu.store'
import { useOrderStore } from '@/stores/order.store'
import { useTablesStore } from '@/stores/tables.store'
import { useBillStore } from '@/stores/bill.store'
import { useAuthStore } from '@/stores/auth.store'
import { Bill, BillItem, CancellationReason, DiscountReason } from '@/types/bill'
import { MenuItem } from '@/types/menu'
import { DebugUtils } from '@/utils'

import BillsTabs from './BillsTabs.vue'
import OrderBillItem from './OrderBillItem.vue'
import BillItemEditor from '../dialogs/BillItemEditor.vue'
import CancelItemDialog from '../dialogs/CancelItemDialog.vue'
import DiscountEditor from '../dialogs/DiscountEditor.vue'

const MODULE_NAME = 'BillsManager'

// Store instances
const menuStore = useMenuStore()
const orderStore = useOrderStore()
const tablesStore = useTablesStore()
const billStore = useBillStore()
const authStore = useAuthStore()

const props = defineProps<{
  bills: Bill[]
}>()

const emit = defineEmits<{
  'select-bill': [string]
}>()

// State
const showEditDialog = ref(false)
const showCancelDialog = ref(false)
const editingItem = ref<{ billItem: BillItem; menuItem: MenuItem } | null>(null)
const cancellationItem = ref<{ billItem: BillItem; menuItem: MenuItem } | null>(null)
const showDiscountDialog = ref(false)
const discountItem = ref<{ billItem: BillItem; menuItem: MenuItem } | null>(null)

// Computed
const canAddBill = computed(() => {
  const order = tablesStore.activeOrder
  return order ? tablesStore.isMultipleBillsAllowed(order.id) : false
})

// Bill Management Methods
const handleBillSelect = (billId: string) => {
  const bill = props.bills.find(b => b.id === billId)
  if (bill) {
    billStore.setActiveBill(bill)
    emit('select-bill', billId)
  }
}

const handleAddBill = () => {
  const order = tablesStore.activeOrder
  if (order) {
    orderStore.addBill(order.id)
  }
}

const handleBillRename = async (billId: string, newName: string) => {
  try {
    await billStore.updateBillName(billId, newName)
    await orderStore.confirmOrder()
  } catch (error) {
    console.error('Failed to rename bill:', error)
  }
}

const handleRemoveBill = async (billId: string) => {
  try {
    await orderStore.removeBill(billId)
    await billStore.removeBill(billId)
  } catch (error) {
    console.error('Failed to remove bill:', error)
  }
}

// Item Management Methods
const getMenuItem = (itemId: string) => {
  return menuStore.items.find(item => item.id === itemId)!
}

const handleEdit = (billItem: BillItem) => {
  const menuItem = getMenuItem(billItem.dishId)
  editingItem.value = { billItem, menuItem }
  showEditDialog.value = true
}

const handleEditConfirm = async (changes: {
  quantity: number
  note: string
  variantId: string
}) => {
  if (!editingItem.value || !billStore.activeBill) return

  try {
    await billStore.updateBillItem(editingItem.value.billItem.id, {
      quantity: changes.quantity,
      notes: changes.note,
      variantId: changes.variantId
    })
    showEditDialog.value = false
    editingItem.value = null
  } catch (error) {
    console.error('Failed to update item:', error)
  }
}

const handleDelete = async (billItem: BillItem) => {
  if (!billStore.activeBill) return
  try {
    await billStore.removeItem(billItem.id)
  } catch (error) {
    console.error('Failed to delete item:', error)
  }
}

const handleCancel = (billItem: BillItem) => {
  const menuItem = getMenuItem(billItem.dishId)
  cancellationItem.value = { billItem, menuItem }
  showCancelDialog.value = true
}

const handleCancelConfirm = async (data: {
  reason: CancellationReason
  note: string
  quantity: number
}) => {
  if (!cancellationItem.value || !billStore.activeBill) return

  try {
    await billStore.cancelItem(cancellationItem.value.billItem.id, {
      reason: data.reason,
      note: data.note,
      quantity: data.quantity,
      userId: authStore.state.currentUser?.id || ''
    })
    showCancelDialog.value = false
    cancellationItem.value = null
  } catch (error) {
    console.error('Failed to cancel item:', error)
  }
}

const handleAddDiscount = (billItem: BillItem) => {
  const menuItem = getMenuItem(billItem.dishId)
  discountItem.value = { billItem, menuItem }
  showDiscountDialog.value = true
}

const handleDiscountConfirm = async (data: { value: number; reason: DiscountReason }) => {
  if (!discountItem.value || !billStore.activeBill) return

  try {
    await billStore.addItemDiscount(discountItem.value.billItem.id, data)
    showDiscountDialog.value = false
    discountItem.value = null
  } catch (error) {
    console.error('Failed to add discount:', error)
  }
}
</script>

<style scoped>
.bill-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

.bill-content {
  flex: 1;
  min-height: 0; /* Важно для правильной работы flex и overflow */
  overflow-y: auto;
  padding: 16px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
