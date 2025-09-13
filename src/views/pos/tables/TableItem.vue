<!-- src/views/pos/tables/TableItem.vue -->
<template>
  <v-card
    class="table-item"
    :class="[`table-item--${table.status}`, { 'table-item--active': isActive }]"
    :color="getTableColor()"
    :variant="isActive ? 'flat' : 'outlined'"
    @click="$emit('select', table)"
  >
    <v-card-text class="table-content">
      <!-- Table Icon -->
      <v-icon :icon="getTableIcon()" size="20" :color="getIconColor()" class="table-icon" />

      <!-- Table Number -->
      <div class="table-number">
        {{ table.number }}
      </div>

      <!-- Status Indicator -->
      <div v-if="isOccupied" class="status-dot" :class="{ 'status-dot--paid': isPaid }" />
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
  height: 60px; /* Уменьшено с 80px до 60px */
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  border-radius: 6px;
}

.table-item:hover {
  transform: translateY(-1px); /* Уменьшенный hover эффект */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.table-item--active {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-1px);
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

.table-content {
  padding: 8px 12px !important; /* Уменьшенный padding */
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px; /* Уменьшенная высота контента */
  gap: 8px;
}

.table-icon {
  flex-shrink: 0;
}

.table-number {
  font-size: 0.875rem; /* Уменьшенный размер шрифта */
  font-weight: 600;
  color: inherit;
  line-height: 1;
  flex: 1;
  text-align: center;
}

/* Status dot */
.status-dot {
  width: 6px; /* Уменьшено с 8px */
  height: 6px;
  border-radius: 50%;
  background-color: rgb(var(--v-theme-warning));
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.status-dot--paid {
  background-color: rgb(var(--v-theme-success));
}
</style>
