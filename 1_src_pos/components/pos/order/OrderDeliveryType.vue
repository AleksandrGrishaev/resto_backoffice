<!-- src/components/pos/order/OrderDeliveryType.vue -->
<template>
  <div class="px-4 py-3 delivery-type-container">
    <!-- Основные типы доставки -->
    <div class="d-flex delivery-buttons-row">
      <v-btn
        v-for="type in mainDeliveryTypes"
        :key="type.value"
        class="delivery-type-btn"
        :color="modelValue === type.value ? 'primary' : undefined"
        :variant="modelValue === type.value ? 'elevated' : 'outlined'"
        density="comfortable"
        @click="handleDeliveryTypeSelect(type.value)"
      >
        {{ type.title }}
      </v-btn>
    </div>

    <!-- Дополнительные опции для доставки -->
    <div v-if="showDeliveryOptions" class="delivery-options mt-3">
      <div class="d-flex delivery-buttons-row">
        <v-btn
          v-for="option in deliveryOptions"
          :key="option.value"
          class="delivery-type-btn"
          :color="modelValue === option.value ? 'primary' : undefined"
          :variant="modelValue === option.value ? 'elevated' : 'outlined'"
          density="comfortable"
          @click="handleDeliveryTypeSelect(option.value)"
        >
          {{ option.title }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DeliveryType } from '@/types'
import { OrderType } from '@/types/table'
import { DebugUtils } from '@/utils'
import { useTablesStore } from '@/stores/tables.store'
import { useOrderStore } from '@/stores/order.store'

const MODULE_NAME = 'OrderDeliveryType'
const tablesStore = useTablesStore()
const orderStore = useOrderStore()

const props = defineProps<{
  modelValue: DeliveryType
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DeliveryType]
}>()

const mainDeliveryTypes = [
  { title: 'Dine In', value: 'dine-in' as const },
  { title: 'Take Away', value: 'takeaway' as const },
  { title: 'Delivery', value: 'delivery-gojek' as const }
]

const deliveryOptions = [
  { title: 'Gojek', value: 'delivery-gojek' as const },
  { title: 'Grab', value: 'delivery-grab' as const }
]

const showDeliveryOptions = computed(() => props.modelValue.startsWith('delivery'))

const handleDeliveryTypeSelect = async (type: DeliveryType) => {
  DebugUtils.debug(MODULE_NAME, 'Delivery type selected', { type })

  const activeOrder = tablesStore.activeOrder
  if (!activeOrder) return

  try {
    // Если меняем на takeaway/delivery, объединяем все счета
    if (type !== 'dine-in') {
      await orderStore.mergeBills()
    }

    // Меняем тип заказа
    await tablesStore.changeOrderType(activeOrder.id, type as OrderType)

    // Обновляем значение в родительском компоненте
    emit('update:modelValue', type)
  } catch (error) {
    console.error('Failed to change delivery type:', error)
    // TODO: Show error notification
  }
}
</script>

<style scoped>
.delivery-type-container {
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.delivery-buttons-row {
  gap: 12px;
  width: 100%;
}

.delivery-type-btn {
  height: 36px !important;
  text-transform: none;
  font-size: 0.875rem;
  letter-spacing: 0.0125em;
  flex: 1;
  min-width: 0;
}

.delivery-options {
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-theme-primary), 0.12);
}
</style>
