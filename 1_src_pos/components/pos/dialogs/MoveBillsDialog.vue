<!-- src/components/pos/dialogs/MoveBillDialog.vue -->
<template>
  <base-dialog
    v-model="isOpen"
    title="Move Bill"
    :loading="loading"
    @confirm="handleConfirm"
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

      <!-- Type Selection -->
      <v-row no-gutters>
        <v-col cols="12">
          <div class="text-subtitle-1 mb-3">Order Type</div>
          <v-btn-group class="w-100" divided>
            <v-btn
              prepend-icon="mdi-table-chair"
              :color="selectedType === 'dine-in' ? 'primary' : undefined"
              :variant="selectedType === 'dine-in' ? 'flat' : 'outlined'"
              class="flex-1"
              height="56"
              @click="handleTypeSelect('dine-in')"
            >
              DINE IN
            </v-btn>
            <v-btn
              prepend-icon="mdi-shopping"
              :color="selectedType === 'takeaway' ? 'primary' : undefined"
              :variant="selectedType === 'takeaway' ? 'flat' : 'outlined'"
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
                  :color="isDeliveryType(selectedType) ? 'primary' : undefined"
                  :variant="isDeliveryType(selectedType) ? 'flat' : 'outlined'"
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

      <!-- Target Selection -->
      <v-row v-if="selectedType === 'dine-in'" class="mt-6">
        <v-col cols="12">
          <div class="text-subtitle-1 mb-3">Target Location</div>
          <v-radio-group v-model="moveTarget" class="mb-4">
            <v-radio label="Move to existing order" value="existing" />
            <v-radio label="Create new order" value="new" />
          </v-radio-group>

          <!-- Existing Orders -->
          <v-select
            v-if="moveTarget === 'existing'"
            v-model="selectedOrderId"
            :items="availableOrders"
            label="Select Order"
            item-title="label"
            item-value="id"
            variant="outlined"
            :error-messages="orderError"
            class="mb-4"
          />

          <!-- Table Selection -->
          <v-select
            v-if="moveTarget === 'new'"
            v-model="selectedTableId"
            :items="availableTables"
            label="Select Table"
            item-title="label"
            item-value="id"
            variant="outlined"
            :error-messages="tableError"
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
import BaseDialog from '@/components/base/BaseDialog.vue'
import { DeliveryType } from '@/types/order'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'MoveBillsDialog'

const props = defineProps<{
  modelValue: boolean
  billId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  move: [{ type: DeliveryType; tableId?: string; targetOrderId?: string }]
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
const loading = ref(false)
const selectedType = ref<DeliveryType>('dine-in')
const moveTarget = ref<'existing' | 'new'>('new')
const selectedTableId = ref('')
const selectedOrderId = ref('')
const errorMessage = ref('')
const tableError = ref('')
const orderError = ref('')

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const availableTables = computed(() => {
  const currentOrder = tablesStore.activeOrder
  return tablesStore.tables
    .filter(table => table.status === 'free' && table.id !== currentOrder?.tableId)
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

// Methods
function isDeliveryType(type: DeliveryType): boolean {
  return type.startsWith('delivery-')
}

function handleTypeSelect(type: DeliveryType) {
  selectedType.value = type
  if (type !== 'dine-in') {
    selectedTableId.value = ''
    selectedOrderId.value = ''
    moveTarget.value = 'new'
  }
  errorMessage.value = ''
  tableError.value = ''
  orderError.value = ''
}

async function handleConfirm() {
  loading.value = true
  errorMessage.value = ''
  tableError.value = ''
  orderError.value = ''

  try {
    const sourceOrderId = tablesStore.activeOrder?.id

    if (selectedType.value === 'dine-in') {
      if (moveTarget.value === 'new' && !selectedTableId.value) {
        tableError.value = 'Please select a table'
        return
      }
      if (moveTarget.value === 'existing' && !selectedOrderId.value) {
        orderError.value = 'Please select an order'
        return
      }
    }

    const data = {
      type: selectedType.value,
      ...(moveTarget.value === 'new' && selectedTableId.value
        ? { tableId: selectedTableId.value }
        : {}),
      ...(moveTarget.value === 'existing' ? { targetOrderId: selectedOrderId.value } : {})
    }

    // После успешного перемещения проверяем необходимость очистки
    if (sourceOrderId) {
      DebugUtils.debug(MODULE_NAME, 'Checking source order for cleanup after bill move', {
        sourceOrderId
      })
      await tablesStore.checkAndCleanupOrder(sourceOrderId)
    }

    emit('move', data)
    isOpen.value = false
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to move bill'
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  selectedType.value = 'dine-in'
  selectedTableId.value = ''
  selectedOrderId.value = ''
  moveTarget.value = 'new'
  errorMessage.value = ''
  tableError.value = ''
  orderError.value = ''
  emit('update:modelValue', false)
}
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
