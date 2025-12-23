<!-- src/views/pos/order/dialogs/TableSelectionDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6">
        {{ title || 'Select Table' }}
      </v-card-title>

      <v-card-text>
        <!-- No tables available -->
        <div v-if="!tables?.length" class="text-center py-4">
          <v-icon size="48" color="grey" class="mb-2">mdi-alert-circle-outline</v-icon>
          <p class="text-body-1 text-grey">No tables available.</p>
        </div>

        <!-- Normal flow with tables -->
        <div v-else>
          <p class="mb-4">{{ subtitle || 'Select a table for this order:' }}</p>

          <!-- Table selection -->
          <v-radio-group v-model="selectedTableId">
            <div class="tables-grid">
              <div
                v-for="table in sortedTables"
                :key="table.id"
                class="table-item"
                :class="{
                  'table-free': table.status === 'free',
                  'table-occupied': table.status === 'occupied',
                  'table-reserved': table.status === 'reserved'
                }"
              >
                <v-radio :value="table.id">
                  <template #label>
                    <div class="table-label">
                      <div class="table-info">
                        <span class="table-number">{{ table.number }}</span>
                        <v-chip
                          v-if="table.status === 'occupied'"
                          size="x-small"
                          color="warning"
                          class="ml-2"
                        >
                          Occupied
                        </v-chip>
                        <v-chip
                          v-else-if="table.status === 'reserved'"
                          size="x-small"
                          color="info"
                          class="ml-2"
                        >
                          Reserved
                        </v-chip>
                        <v-chip v-else size="x-small" color="success" class="ml-2">Free</v-chip>
                      </div>
                      <div class="table-details text-caption text-grey">
                        Capacity: {{ table.capacity }} | Section: {{ table.section }}
                      </div>
                    </div>
                  </template>
                </v-radio>
              </div>
            </div>
          </v-radio-group>

          <!-- Warning for occupied table -->
          <v-alert
            v-if="selectedTable?.status === 'occupied'"
            type="warning"
            variant="tonal"
            class="mt-4"
          >
            <v-alert-title>Merge Orders</v-alert-title>
            <div class="text-body-2">
              This table is currently occupied. All bills from this order will be merged into the
              existing order on
              <strong>{{ selectedTable.number }}</strong>
              .
            </div>
          </v-alert>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancel')">Cancel</v-btn>
        <v-btn
          v-if="tables?.length"
          color="primary"
          :disabled="!selectedTableId"
          @click="handleConfirm"
        >
          {{ confirmButtonText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PosTable } from '@/stores/pos/types'

interface Props {
  modelValue: boolean
  tables: PosTable[]
  currentTableId?: string // Exclude current table from selection
  title?: string
  subtitle?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [tableId: string]
  cancel: []
}>()

const selectedTableId = ref<string>('')

// Filter out current table and sort: free tables first, then occupied
const sortedTables = computed(() => {
  return props.tables
    .filter(table => table.id !== props.currentTableId)
    .sort((a, b) => {
      // Sort: free → reserved → occupied
      const statusOrder = { free: 0, reserved: 1, occupied: 2 }
      const aOrder = statusOrder[a.status]
      const bOrder = statusOrder[b.status]

      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }

      // Within same status, sort by table number
      return a.number.localeCompare(b.number, undefined, { numeric: true })
    })
})

const selectedTable = computed(() => {
  return props.tables.find(t => t.id === selectedTableId.value)
})

const confirmButtonText = computed(() => {
  if (selectedTable.value?.status === 'occupied') {
    return 'Merge Orders'
  }
  return 'Select Table'
})

function handleConfirm() {
  if (selectedTableId.value) {
    emit('confirm', selectedTableId.value)
  }
}
</script>

<style scoped lang="scss">
.tables-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.table-item {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s;

  &.table-free {
    background-color: rgba(76, 175, 80, 0.05);
    border-color: rgba(76, 175, 80, 0.2);
  }

  &.table-occupied {
    background-color: rgba(255, 152, 0, 0.05);
    border-color: rgba(255, 152, 0, 0.2);
  }

  &.table-reserved {
    background-color: rgba(33, 150, 243, 0.05);
    border-color: rgba(33, 150, 243, 0.2);
  }

  &:hover {
    border-color: rgb(var(--v-theme-primary));
  }
}

.table-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.table-info {
  display: flex;
  align-items: center;
}

.table-number {
  font-weight: 600;
  font-size: 1rem;
}

.table-details {
  line-height: 1.2;
}
</style>
