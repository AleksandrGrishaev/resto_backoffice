<!-- src/components/pos/order/MoveButton.vue -->
<template>
  <v-btn
    v-if="billStore.hasSelection"
    :prepend-icon="hasIcon ? 'mdi-arrow-right' : undefined"
    class="action-btn"
    :variant="orderStore.hasUnsavedChanges ? 'flat' : 'tonal'"
    :color="orderStore.hasUnsavedChanges ? 'primary' : 'grey-darken-3'"
    density="comfortable"
    @click="handleMoveClick"
  >
    <v-tooltip activator="parent" location="top">
      {{ getMoveTooltip }}
    </v-tooltip>
  </v-btn>

  <!-- Dialogs -->
  <move-items-dialog
    v-model="showMoveItemsDialog"
    :source-id="billStore.activeBill?.id || ''"
    :selected-items="Array.from(billStore.selection.selectedItems)"
    @move="handleMoveItems"
  />

  <move-bills-dialog
    v-model="showMoveBillsDialog"
    :bill-id="Array.from(billStore.selection.selectedBills)[0] || ''"
    @move="handleMoveBills"
  />

  <move-order-dialog v-model="showMoveOrderDialog" @move="handleMoveOrder" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBillStore } from '@/stores/bill.store'
import { useOrderStore } from '@/stores/order.store'
import { useTablesStore } from '@/stores/tables.store'
import { DebugUtils } from '@/utils'
import MoveItemsDialog from '../dialogs/MoveItemsDialog.vue'
import MoveBillsDialog from '../dialogs/MoveBillsDialog.vue'
import MoveOrderDialog from '../dialogs/MoveOrderDialog.vue'
import { DeliveryType } from '@/types/order'

const MODULE_NAME = 'MoveButton'

const billStore = useBillStore()
const orderStore = useOrderStore()
const tablesStore = useTablesStore()

// Dialog states
const showMoveItemsDialog = ref(false)
const showMoveBillsDialog = ref(false)
const showMoveOrderDialog = ref(false)

// Computed properties
const hasIcon = computed(() => true)

const getMoveTooltip = computed(() => {
  switch (billStore.selection.selectionMode) {
    case 'items':
      return `Move ${billStore.selection.selectedItems.size} items`
    case 'bills':
      return 'Move bill'
    case 'order':
      return 'Move order'
    default:
      return ''
  }
})

// Methods
function handleMoveClick() {
  DebugUtils.debug(MODULE_NAME, 'Move button clicked', {
    mode: billStore.selection.selectionMode,
    selectedItems: billStore.selection.selectedItems.size,
    selectedBills: billStore.selection.selectedBills.size
  })

  if (!billStore.hasSelection) return

  switch (billStore.selection.selectionMode) {
    case 'items':
      if (billStore.selection.selectedItems.size > 0) {
        showMoveItemsDialog.value = true
      }
      break
    case 'bills':
      const selectedBillId = Array.from(billStore.selection.selectedBills)[0]
      if (selectedBillId) {
        showMoveBillsDialog.value = true
      }
      break
    case 'order':
      showMoveOrderDialog.value = true
      break
  }
}

const handleMoveItems = async ({ targetBillId }: { targetBillId: string }) => {
  if (!billStore.activeBill) return

  try {
    const result = await orderStore.moveItems({
      sourceId: billStore.activeBill.id,
      targetId: targetBillId,
      items: Array.from(billStore.selection.selectedItems)
    })

    if (result.isValid) {
      billStore.clearSelection()
      showMoveItemsDialog.value = false
    }
  } catch (error) {
    console.error('Move error:', error)
  }
}

const handleMoveBills = async ({ type, tableId }: { type: DeliveryType; tableId?: string }) => {
  try {
    const billId = Array.from(billStore.selection.selectedBills)[0]
    if (!billId) return

    const result = await orderStore.moveBill({
      billId,
      newType: type,
      targetTableId: tableId
    })

    if (result.isValid) {
      billStore.clearSelection()
      showMoveBillsDialog.value = false
    }
  } catch (error) {
    console.error('Move error:', error)
  }
}

const handleMoveOrder = async ({ tableId }: { tableId: string }) => {
  const activeOrder = tablesStore.activeOrder
  if (!activeOrder) return

  try {
    const result = await tablesStore.moveOrderToTable(activeOrder.id, tableId)
    if (result.isValid) {
      billStore.clearSelection()
      showMoveOrderDialog.value = false
    }
  } catch (error) {
    console.error('Move error:', error)
  }
}
</script>

<style scoped>
.action-btn {
  font-weight: 500;
  letter-spacing: 0.0125em;
  text-transform: none;
  font-size: 0.875rem;
  border-radius: var(--app-border-radius);
  min-width: 44px !important;
  width: 44px;
}

.action-btn :deep(.v-btn__prepend) {
  margin-inline-end: 0;
}
</style>
