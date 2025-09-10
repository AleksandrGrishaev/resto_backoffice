<!-- src/components/pos/order/OrderTableSelector.vue -->
<template>
  <div class="table-selector px-4 py-3">
    <div class="tables-container">
      <base-card
        v-for="table in tables"
        :key="table.id"
        :class="['table-card', { 'table-card--active': modelValue === table.id }]"
        width="80"
        height="80"
        @click="handleSelect(table.id)"
      >
        <v-card-text class="table-number pa-0">
          {{ table.number }}
        </v-card-text>
      </base-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DebugUtils } from '@/utils'
import { useTablesStore } from '@/stores/tables.store'
import { Table } from '@/types/table'
import BaseCard from '@/components/base/BaseCard.vue'

const MODULE_NAME = 'OrderTableSelector'
const tablesStore = useTablesStore()

const props = defineProps<{
  modelValue: string | null
  tables: Table[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const handleSelect = async (tableId: string) => {
  DebugUtils.debug(MODULE_NAME, 'Table selected', { tableId })

  const activeOrder = tablesStore.activeOrder
  if (!activeOrder) return

  try {
    // Меняем стол для текущего заказа
    await tablesStore.changeOrderTable(activeOrder.id, tableId)
    emit('update:modelValue', tableId)
  } catch (error) {
    console.error('Failed to change table:', error)
    // TODO: Show error notification
  }
}
</script>

<style scoped>
.table-selector {
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.tables-container {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 1px;
}

.table-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  border-radius: 4px;
  min-width: 40px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-color: var(--v-theme-primary);
}

.table-card--active {
  border: 2px solid var(--v-theme-primary);
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.table-number {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 500;
}

/* Стилизация скроллбара */
.tables-container::-webkit-scrollbar {
  height: 4px;
}

.tables-container::-webkit-scrollbar-track {
  background: transparent;
}

.tables-container::-webkit-scrollbar-thumb {
  background: var(--v-theme-primary);
  border-radius: 2px;
}
</style>
