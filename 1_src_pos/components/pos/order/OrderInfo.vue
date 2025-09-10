<!-- src/components/pos/order/OrderInfo.vue -->
<template>
  <div class="order-info px-4 py-3">
    <div class="d-flex align-center justify-space-between">
      <!-- Order Type & Info -->
      <div class="d-flex align-center">
        <v-icon :icon="getOrderTypeIcon" :color="getOrderTypeColor" class="mr-2" size="24" />
        <div class="order-details">
          <div class="text-subtitle-1 font-weight-medium">
            {{ getOrderTypeLabel }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ getOrderDetails }}
          </div>
        </div>
      </div>

      <!-- Edit Button -->
      <v-btn icon="mdi-pencil" variant="text" density="comfortable" @click="handleEdit" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTablesStore } from '@/stores/tables.store'
import { TableOrder } from '@/types/table'

const props = defineProps<{
  order: TableOrder
}>()

const emit = defineEmits<{
  edit: []
}>()

const tablesStore = useTablesStore()

const getOrderTypeIcon = computed(() => {
  switch (props.order.type) {
    case 'delivery':
      return 'mdi-bike-fast'
    case 'takeaway':
      return 'mdi-shopping'
    default:
      return 'mdi-table-chair'
  }
})

const getOrderTypeColor = computed(() => {
  switch (props.order.type) {
    case 'delivery':
      return 'primary'
    case 'takeaway':
      return 'warning'
    default:
      return undefined
  }
})

const getOrderTypeLabel = computed(() => {
  switch (props.order.type) {
    case 'delivery':
      return 'Delivery Order'
    case 'takeaway':
      return 'Take Away'
    default:
      return 'Table Order'
  }
})

const getOrderDetails = computed(() => {
  if (props.order.type === 'dine-in') {
    const table = tablesStore.getTableById(props.order.tableId)
    return table ? `Table ${table.number}` : 'No table assigned'
  }
  return `Order #${props.order.orderNumber}`
})

const handleEdit = () => {
  emit('edit')
}
</script>

<style scoped>
.order-info {
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.order-details {
  line-height: 1.2;
}
</style>
