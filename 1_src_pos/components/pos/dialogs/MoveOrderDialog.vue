<template>
  <base-dialog
    :model-value="modelValue"
    title="Move Order"
    :loading="loading"
    @confirm="handleSubmit"
    @cancel="handleCancel"
    @update:model-value="$emit('update:model-value', $event)"
  >
    <v-form ref="form" @submit.prevent="handleSubmit">
      <v-container class="pa-0">
        <v-row>
          <v-col cols="12">
            <div class="text-subtitle-1 mb-3">Select Target Table</div>
            <v-select
              v-model="formData.tableId"
              :items="availableTables"
              item-title="label"
              item-value="id"
              variant="outlined"
              :rules="tableRules"
              hide-details="auto"
              class="flex-grow-1"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTablesStore } from '@/stores/tables.store'
import { useDialogForm } from '@/composables/useDialogForm'
import BaseDialog from '@/components/base/BaseDialog.vue'

interface MoveOrderForm {
  tableId: string
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:model-value': [boolean]
  move: [{ tableId: string }]
}>()

const tablesStore = useTablesStore()
const form = ref<HTMLFormElement>()

const initialData: MoveOrderForm = {
  tableId: ''
}

// Правила валидации
const tableRules = [(v: string) => !!v || 'Please select a table']

const validateForm = (data: MoveOrderForm): boolean | string => {
  if (!data.tableId) {
    return 'Please select a target table'
  }
  return true
}

const { formData, loading, formState, handleSubmit, handleCancel } = useDialogForm<MoveOrderForm>({
  moduleName: 'MoveOrderDialog',
  initialData,
  validateForm,
  onSubmit: async data => {
    emit('move', { tableId: data.tableId })
    emit('update:model-value', false)
  }
})

// Получаем список доступных столов (исключая текущий)
const availableTables = computed(() => {
  const currentTableId = tablesStore.activeOrder?.tableId
  return tablesStore.tables
    .filter(table => table.id !== currentTableId && !table.currentOrderId)
    .map(table => ({
      id: table.id,
      label: `Table ${table.number}`
    }))
})
</script>
