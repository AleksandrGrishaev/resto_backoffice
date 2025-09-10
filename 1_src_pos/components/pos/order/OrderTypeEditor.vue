<!-- src/components/pos/order/OrderTypeEditor.vue -->
<template>
  <base-dialog
    v-model="isOpen"
    title="Edit Order Type"
    :loading="loading"
    @confirm="handleSubmit"
    @cancel="handleCancel"
  >
    <v-container class="pa-0">
      <!-- Alert для ошибок -->
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        @click:close="errorMessage = ''"
      >
        {{ errorMessage }}
      </v-alert>

      <!-- Order Type Selection -->
      <v-row no-gutters>
        <v-col cols="12">
          <div class="text-subtitle-1 mb-3">Order Type</div>
          <v-btn-group class="w-100" divided>
            <v-btn
              prepend-icon="mdi-table-chair"
              :color="formData.type === 'dine-in' ? 'primary' : undefined"
              :variant="formData.type === 'dine-in' ? 'flat' : 'outlined'"
              class="flex-1"
              height="56"
              @click="handleTypeSelect('dine-in')"
            >
              DINE IN
            </v-btn>
            <v-btn
              prepend-icon="mdi-shopping"
              :color="formData.type === 'takeaway' ? 'primary' : undefined"
              :variant="formData.type === 'takeaway' ? 'flat' : 'outlined'"
              class="flex-1"
              height="56"
              @click="handleTypeSelect('takeaway')"
            >
              TAKE AWAY
            </v-btn>
            <!-- Delivery Options -->
            <v-menu>
              <template #activator="{ props }">
                <v-btn
                  prepend-icon="mdi-bike-fast"
                  :color="isDeliveryType(formData.type) ? 'primary' : undefined"
                  :variant="isDeliveryType(formData.type) ? 'flat' : 'outlined'"
                  class="flex-1"
                  height="56"
                  v-bind="props"
                >
                  DELIVERY
                </v-btn>
              </template>
              <v-list>
                <v-list-item
                  v-for="type in deliveryTypes"
                  :key="type.value"
                  :title="type.title"
                  @click="handleTypeSelect(type.value)"
                />
              </v-list>
            </v-menu>
          </v-btn-group>
        </v-col>
      </v-row>

      <!-- Target Selection for Dine-in -->
      <v-row v-if="formData.type === 'dine-in'" class="mt-6">
        <v-col cols="12">
          <div class="text-subtitle-1 mb-3">Target Location</div>
          <v-radio-group v-model="moveTarget" class="mb-4">
            <v-radio label="Move to new table" value="new" />
            <v-radio label="Move to existing order" value="existing" />
          </v-radio-group>

          <!-- Table Selection -->
          <v-select
            v-if="moveTarget === 'new'"
            v-model="formData.tableId"
            :items="availableTables"
            label="Select Table"
            item-title="label"
            item-value="id"
            variant="outlined"
            :error-messages="tableError"
            class="mb-4"
          />

          <!-- Existing Orders -->
          <v-select
            v-if="moveTarget === 'existing'"
            v-model="formData.targetOrderId"
            :items="availableOrders"
            label="Select Order"
            item-title="label"
            item-value="id"
            variant="outlined"
            :error-messages="orderError"
          />
        </v-col>
      </v-row>
    </v-container>
  </base-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTablesStore } from '@/stores/tables.store'
import { useOrderStore } from '@/stores/order.store'
import { useDialogForm } from '@/composables/useDialogForm'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { OrderType, DeliveryType, OrderTypeChangeData } from '@/types/order'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'OrderTypeEditor'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  confirm: [OrderTypeChangeData]
}>()

// Stores
const tablesStore = useTablesStore()
const orderStore = useOrderStore()

// Constants
const deliveryTypes = [
  { value: 'delivery-gojek' as DeliveryType, title: 'Gojek' },
  { value: 'delivery-grab' as DeliveryType, title: 'Grab' },
  { value: 'delivery-other' as DeliveryType, title: 'Other Delivery' }
]

// State
const errorMessage = ref('')
const tableError = ref('')
const orderError = ref('')
const moveTarget = ref<'new' | 'existing'>('new')

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const currentTableId = computed(() => tablesStore.activeOrder?.tableId || '')

const availableTables = computed(() => {
  return tablesStore.tables
    .filter(table => table.id !== currentTableId.value && table.status === 'free')
    .map(table => ({
      id: table.id,
      label: `Table ${table.number}`
    }))
})

const availableOrders = computed(() => {
  const currentOrder = tablesStore.activeOrder
  return tablesStore.activeOrders
    .filter(order => order.id !== currentOrder?.id && order.type === 'dine-in')
    .map(order => ({
      id: order.id,
      label: `${order.orderNumber} (Table ${order.tableId})`
    }))
})

// Helpers
function isDeliveryType(type: DeliveryType): boolean {
  return type.startsWith('delivery-')
}

// Преобразование DeliveryType в OrderType
function getOrderType(type: DeliveryType): OrderType {
  if (type === 'dine-in') return 'dine-in'
  if (type === 'takeaway') return 'takeaway'
  if (type.startsWith('delivery-')) return 'delivery'
  throw new Error('Invalid delivery type')
}

// Form setup
const initialData = {
  type: 'dine-in' as DeliveryType,
  tableId: '',
  targetOrderId: ''
}

function handleTypeSelect(type: DeliveryType) {
  formData.value.type = type
  if (type !== 'dine-in') {
    formData.value.tableId = ''
    formData.value.targetOrderId = ''
    moveTarget.value = 'new'
  }
  errorMessage.value = ''
  tableError.value = ''
  orderError.value = ''
}

const validateForm = (data: typeof initialData): boolean | string => {
  const currentOrder = tablesStore.activeOrder
  if (!currentOrder) return 'No active order'

  const orderType = getOrderType(data.type)

  // Используем существующий метод валидации
  if (!tablesStore.validateOrderTypeChange(currentOrder.id, orderType)) {
    return 'Cannot change to this order type with multiple bills. Please merge bills first.'
  }

  if (data.type === 'dine-in') {
    if (moveTarget.value === 'new' && !data.tableId) {
      return 'Please select a table'
    }
    if (moveTarget.value === 'existing' && !data.targetOrderId) {
      return 'Please select an order'
    }
  }

  return true
}

const { formData, loading, handleSubmit, handleCancel } = useDialogForm({
  moduleName: MODULE_NAME,
  initialData,
  validateForm,
  onSubmit: async data => {
    try {
      const orderType = getOrderType(data.type)
      const result: OrderTypeChangeData = {
        type: data.type,
        orderType,
        ...(moveTarget.value === 'new' ? { tableId: data.tableId } : {}),
        ...(moveTarget.value === 'existing' ? { targetOrderId: data.targetOrderId } : {})
      }
      emit('confirm', result)
      isOpen.value = false
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to change order type', error)
      errorMessage.value = error instanceof Error ? error.message : 'Failed to change order type'
    }
  }
})
</script>

<style scoped>
.flex-1 {
  flex: 1;
}

:deep(.v-btn-group) {
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  border-radius: var(--app-border-radius);
  overflow: hidden;
  gap: 0;
}

:deep(.v-btn-group .v-btn) {
  height: 56px !important;
  border-radius: 0 !important;
  border: none;
  border-right: 1px solid rgba(var(--v-theme-primary), 0.12);
}

:deep(.v-btn-group .v-btn:last-child) {
  border-right: none;
}

:deep(.v-btn--variant-outlined) {
  border: none !important;
}
</style>
