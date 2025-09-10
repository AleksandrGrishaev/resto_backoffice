<template>
  <base-dialog
    v-model="isOpen"
    title="Move Items"
    :loading="loading"
    :disable-confirm="!canConfirm"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  >
    <v-form ref="form" @submit.prevent="handleConfirm">
      <v-container class="pa-0">
        <!-- Selected Items Info -->
        <v-row>
          <v-col cols="12">
            <p class="text-subtitle-2 mb-2">Selected items: {{ selectedItems.length }}</p>
          </v-col>
        </v-row>

        <!-- Move Type Selection -->
        <v-row>
          <v-col cols="12">
            <v-select
              v-model="moveType"
              :items="moveTypes"
              label="Move to"
              variant="outlined"
              required
            />
          </v-col>
        </v-row>

        <!-- Target Order Selection (for different order) -->
        <v-row v-if="moveType === 'different_order'">
          <v-col cols="12">
            <v-select
              v-model="targetOrderId"
              :items="availableOrders"
              item-title="label"
              item-value="id"
              label="Select Order"
              variant="outlined"
              required
            />
          </v-col>
        </v-row>

        <!-- Target Bill Selection -->
        <v-row v-if="shouldShowBillSelection">
          <v-col cols="12">
            <v-select
              v-model="targetBillId"
              :items="billSelectionItems"
              label="Select Bill"
              variant="outlined"
              item-title="label"
              item-value="id"
              :error-messages="errorMessage"
              required
            />
          </v-col>
        </v-row>
      </v-container>
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

import { useOrderStore } from '@/stores/order.store'
import { useTablesStore } from '@/stores/tables.store'
import { DebugUtils } from '@/utils/debugger'
import { ValidationResult } from '@/types'
import BaseDialog from '@/components/base/BaseDialog.vue'

const orderStore = useOrderStore()
const tablesStore = useTablesStore()

const MODULE_NAME = 'MoveItemsDialog'
const NEW_BILL_ID = 'new_bill'

const props = defineProps<{
  modelValue: boolean
  sourceId: string
  selectedItems: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'move-complete': [result: ValidationResult]
}>()

const loading = ref(false)
const errorMessage = ref('')
const moveType = ref<'same_order' | 'different_order'>('same_order')
const targetOrderId = ref('')
const targetBillId = ref('')

// Локальное состояние выбранных элементов
const localSelectedItems = ref(new Set(props.selectedItems))

const moveTypes = [
  { title: 'Same Order', value: 'same_order' },
  { title: 'Different Order', value: 'different_order' }
]

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const billSelectionItems = computed(() => {
  try {
    let bills = []

    if (moveType.value === 'same_order') {
      bills = orderStore.bills
        .filter(bill => bill.id !== props.sourceId)
        .map(bill => ({
          id: bill.id,
          label: `Bill ${(bill.name.match(/\d+/) || [''])[0] || '?'}`
        }))
    } else if (targetOrderId.value) {
      const orderData = tablesStore.getOrderData(targetOrderId.value)
      const targetOrder = tablesStore.getOrderById(targetOrderId.value)

      if (orderData?.bills) {
        bills = orderData.bills.map(bill => ({
          id: bill.id,
          label: `Bill ${(bill.name.match(/\d+/) || [''])[0] || '?'}${
            targetOrder ? ` (${targetOrder.orderNumber})` : ''
          }`
        }))
      }
    }

    // Добавляем опцию создания нового счета если это разрешено
    if (canCreateNewBill.value) {
      bills.push({
        id: NEW_BILL_ID,
        label: '+ Create New Bill'
      })
    }

    return bills
  } catch (error) {
    console.error('Error in billSelectionItems:', error)
    return []
  }
})
// Доступные заказы для перемещения
const availableOrders = computed(() => {
  const currentOrder = tablesStore.activeOrder
  // Получаем все активные заказы
  const activeOrders = tablesStore.activeOrders
    .filter(order => order.id !== currentOrder?.id)
    .map(order => ({
      id: order.id,
      label: `${order.orderNumber} ${order.type === 'dine-in' ? `(Table ${order.tableId})` : ''}`
    }))

  // Добавляем свободные столы
  const freeTables = tablesStore.tables
    .filter(table => table.status === 'free')
    .map(table => ({
      id: table.id,
      label: `Create New Order (Table ${table.number})`
    }))

  return [...activeOrders, ...freeTables]
})

const shouldShowBillSelection = computed(() => {
  // Для перемещения внутри того же заказа всегда показываем выбор счета
  if (moveType.value === 'same_order') {
    return true
  }

  // Для перемещения в другой заказ
  if (moveType.value === 'different_order' && targetOrderId.value) {
    // Проверяем существует ли заказ
    const targetOrder = tablesStore.getOrderById(targetOrderId.value)
    if (targetOrder) {
      // Показываем выбор счета только для существующих заказов
      return true
    }
    // Для свободных столов (новых заказов) не показываем выбор счета
    return false
  }

  return false
})

const canCreateNewBill = computed(() => {
  if (moveType.value === 'same_order') {
    return tablesStore.isMultipleBillsAllowed(tablesStore.activeOrder?.id || '')
  } else if (targetOrderId.value) {
    return tablesStore.isMultipleBillsAllowed(targetOrderId.value)
  }
  return false
})

const canConfirm = computed(() => {
  if (moveType.value === 'same_order') {
    return !!targetBillId.value
  }
  return !!targetOrderId.value && !!targetBillId.value
})

// Разделим handleConfirm на два метода
const handleConfirmInside = async (
  targetBillId: string,
  sourceId: string,
  selectedItems: string[]
): Promise<ValidationResult> => {
  const orderId = tablesStore.activeOrder?.id
  if (!orderId) throw new Error('No active order')

  let finalTargetBillId = targetBillId

  if (finalTargetBillId === NEW_BILL_ID) {
    const result = await orderStore.addBill(orderId)
    if (!result.isValid) {
      throw new Error(result.message)
    }
    finalTargetBillId = orderStore.bills[orderStore.bills.length - 1].id
  }

  return orderStore.moveItems({
    sourceId,
    targetId: finalTargetBillId,
    items: selectedItems
  })
}

const handleConfirmOutside = async (
  targetBillId: string,
  sourceId: string,
  selectedItems: string[],
  targetOrderId: string
): Promise<ValidationResult> => {
  // Если выбран свободный стол
  const isNewOrder = !tablesStore.getOrderById(targetOrderId)
  if (isNewOrder) {
    try {
      // 0. Сохраняем sourceBill до инициализации нового заказа
      const currentBills = [...orderStore.bills]
      const sourceBill = currentBills.find(b => b.id === sourceId)
      const sourceItems = sourceBill?.items.filter(item => selectedItems.includes(item.id))

      if (!sourceBill || !sourceItems?.length) {
        return {
          isValid: false,
          code: 'SOURCE_NOT_FOUND',
          message: 'Source items not found'
        }
      }

      // 1. Создаем заказ без установки его активным
      const newOrderId = tablesStore.createOrder('dine-in', targetOrderId, false)

      // 2. Инициализируем заказ и получаем ID первого счета
      await orderStore.initialize(newOrderId)
      const firstBill = orderStore.bills[0]

      if (!firstBill) {
        return {
          isValid: false,
          code: 'TARGET_NOT_CREATED',
          message: 'Failed to create target bill'
        }
      }

      // 3. Копируем элементы в новый счет
      firstBill.items.push(...sourceItems)

      // 4. Сохраняем состояние нового заказа
      await tablesStore.saveOrderData(newOrderId, orderStore.bills)

      // 5. Удаляем элементы из исходного счета и сохраняем старый заказ
      sourceBill.items = sourceBill.items.filter(item => !selectedItems.includes(item.id))
      const currentOrderId = tablesStore.activeOrder?.id
      if (currentOrderId) {
        await tablesStore.saveOrderData(currentOrderId, currentBills)
      }

      // 7. Активируем новый заказ
      tablesStore.setActiveOrder(newOrderId)

      return {
        isValid: true,
        code: 'ITEMS_MOVED',
        message: `Successfully moved ${selectedItems.length} items`
      }
    } catch (error) {
      console.error('Failed to move items to new order:', error)
      return {
        isValid: false,
        code: 'MOVE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to move items'
      }
    }
  }

  // Для существующих заказов
  let finalTargetBillId = targetBillId
  const finalTargetOrderId = targetOrderId

  if (targetBillId === NEW_BILL_ID) {
    const result = await orderStore.addBill(targetOrderId)
    if (!result.isValid) {
      throw new Error(result.message)
    }
    finalTargetBillId = orderStore.bills[orderStore.bills.length - 1].id
  }

  return await orderStore.moveItems({
    sourceId,
    targetId: finalTargetBillId,
    items: selectedItems,
    targetOrderId: finalTargetOrderId
  })
}

const handleConfirm = async () => {
  if (!localSelectedItems.value.size) {
    errorMessage.value = 'No items selected'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const selectedItems = Array.from(localSelectedItems.value)
    const sourceOrderId = tablesStore.activeOrder?.id

    DebugUtils.debug(MODULE_NAME, 'Starting move items process', {
      initialTargetBillId: targetBillId.value,
      moveType: moveType.value,
      targetOrderId: targetOrderId.value,
      selectedItems,
      sourceId: props.sourceId,
      sourceOrderId
    })

    const result =
      moveType.value === 'same_order'
        ? await handleConfirmInside(targetBillId.value, props.sourceId, selectedItems)
        : await handleConfirmOutside(
            targetBillId.value,
            props.sourceId,
            selectedItems,
            targetOrderId.value
          )

    if (result.isValid) {
      // Проверяем необходимость очистки исходного заказа
      if (sourceOrderId && moveType.value === 'different_order') {
        DebugUtils.debug(MODULE_NAME, 'Checking source order for cleanup', {
          sourceOrderId
        })
        await tablesStore.checkAndCleanupOrder(sourceOrderId)
      }

      DebugUtils.debug(MODULE_NAME, 'Move completed successfully', result)
      emit('update:modelValue', false)
      emit('move-complete', result)
    } else {
      errorMessage.value = result.message
      DebugUtils.debug(MODULE_NAME, 'Move failed', { error: result.message })
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Move error', error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to move items'
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  // Сбрасываем все поля
  localSelectedItems.value.clear()
  targetBillId.value = ''
  targetOrderId.value = ''
  moveType.value = 'same_order'
  errorMessage.value = ''
  emit('update:modelValue', false)
}

watch(
  () => props.selectedItems,
  newSelectedItems => {
    localSelectedItems.value = new Set(newSelectedItems)
  },
  { immediate: true }
)

watch([moveType, targetOrderId], () => {
  targetBillId.value = ''
  // Не сбрасываем props.selectedItems
})

watch(moveType, () => {
  targetBillId.value = ''
  targetOrderId.value = ''
  errorMessage.value = ''
})
</script>
