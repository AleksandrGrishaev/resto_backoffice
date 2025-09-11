<!-- src/views/pos/tables/TableItem.vue -->
<template>
  <v-card
    class="table-item"
    :class="[`table-item--${table.status}`, { 'table-item--active': isActive }]"
    :color="getTableColor()"
    :variant="isActive ? 'flat' : 'outlined'"
    @click="$emit('select', table)"
  >
    <v-card-text class="pa-2 d-flex flex-column align-center justify-center text-center">
      <!-- Table Icon -->
      <v-icon :icon="getTableIcon()" size="24" :color="getIconColor()" class="mb-1" />

      <!-- Table Number -->
      <div class="table-number text-subtitle-2 font-weight-bold">
        {{ table.number }}
      </div>

      <!-- Status Indicator -->
      <div v-if="isOccupied" class="status-dot mt-1" :class="{ 'status-dot--paid': isPaid }" />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Table } from '@/stores/pos/tables/types'
import { isTableOccupied, isTablePaid, TABLE_STATUS_COLORS } from '@/stores/pos/tables/types'

const props = defineProps<{
  table: Table
  isActive?: boolean
}>()

defineEmits<{
  select: [table: Table]
}>()

// Computed properties
const isOccupied = computed(() => isTableOccupied(props.table.status))
const isPaid = computed(() => isTablePaid(props.table.status))

const getTableColor = () => {
  if (props.isActive) return 'primary'
  return TABLE_STATUS_COLORS[props.table.status]
}

const getTableIcon = () => {
  return isOccupied.value ? 'mdi-table-chair' : 'mdi-table'
}

const getIconColor = () => {
  if (props.isActive) return 'white'

  switch (props.table.status) {
    case 'free':
      return 'success'
    case 'occupied_unpaid':
      return 'warning'
    case 'occupied_paid':
      return 'success'
    case 'reserved':
      return 'info'
    default:
      return 'grey'
  }
}
</script>

<style scoped>
.table-item {
  width: 80px;
  height: 80px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.table-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.table-item--active {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-2px);
}

/* Status-specific styles */
.table-item--free {
  border-color: rgba(76, 175, 80, 0.3);
}

.table-item--occupied_unpaid {
  border-color: rgba(255, 152, 0, 0.5);
}

.table-item--occupied_paid {
  border-color: rgba(76, 175, 80, 0.5);
}

.table-item--reserved {
  border-color: rgba(33, 150, 243, 0.5);
}

/* Status dot */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgb(var(--v-theme-warning));
  transition: all 0.2s ease;
}

.status-dot--paid {
  background-color: rgb(var(--v-theme-success));
}

.table-number {
  color: inherit;
  line-height: 1;
}

/* Card text override */
:deep(.v-card-text) {
  min-height: 76px;
}
</style>
