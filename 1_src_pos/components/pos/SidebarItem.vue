<template>
  <v-list-item
    class="sidebar-card"
    :class="[
      type && `card-type-${type}`,
      { 'card-active': isActive },
      { 'card-occupied': isTableOccupied },
      { 'card-paid': isTablePaid }
    ]"
    @click="$emit('select')"
  >
    <template #prepend>
      <v-icon :icon="icon" size="24" :color="getIconColor" />
    </template>
    <v-list-item-title class="d-flex align-center justify-space-between">
      <span>{{ label }}</span>
      <span
        v-if="isTableOccupied"
        class="status-indicator"
        :class="{ 'status-paid': isTablePaid }"
      />
    </v-list-item-title>
  </v-list-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableStatus } from '@/types/table'

const props = defineProps<{
  type?: 'delivery' | 'takeaway' | 'table'
  label: string
  icon: string
  isActive?: boolean
  iconColor?: string
  tableStatus?: TableStatus
  tableId?: string
}>()

const isTableOccupied = computed(() => {
  return props.tableStatus === 'occupied_unpaid' || props.tableStatus === 'occupied_paid'
})

const isTablePaid = computed(() => {
  return props.tableStatus === 'occupied_paid'
})

const getIconColor = computed(() => {
  if (props.isActive) return 'white'
  return props.iconColor || 'primary'
})

defineEmits<{
  (e: 'select'): void
}>()
</script>

<style scoped>
/* Base card styles */
.sidebar-card {
  height: var(--app-header-height);
  width: 80px;
  padding: 0 !important;
  background-color: var(--app-surface);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--app-border-radius);
  transition: all 0.2s ease;
}

/* Table styles */
.card-type-table {
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.card-occupied {
  border-color: rgb(var(--v-theme-warning));
}

.card-paid {
  border-color: rgb(var(--v-theme-success));
}

/* Status indicator styles */
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-left: 8px;
  background-color: rgb(var(--v-theme-warning));
  transition: all 0.2s ease;
}

.status-indicator.status-paid {
  background-color: rgb(var(--v-theme-success));
}

/* Delivery/Takeaway orders styles */
.card-type-delivery,
.card-type-takeaway {
  border: 1px solid var(--app-primary);
}

/* Hover states */
.sidebar-card:not(.card-active):hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
  border-color: var(--app-primary);
  opacity: 1;
}

/* Active state */
.card-active {
  background-color: var(--app-primary);
  border-color: var(--app-primary);
  opacity: 1;
}

.card-active:hover {
  opacity: 1;
  background-color: var(--app-primary);
}

/* Text and icon styles */
:deep(.v-list-item__content) {
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.v-list-item-title) {
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  line-height: 1;
  color: var(--v-theme-on-surface);
}

.card-active :deep(.v-list-item-title),
.card-active :deep(.v-icon) {
  color: white !important;
}

:deep(.v-list-item__prepend) {
  display: none;
}
</style>
