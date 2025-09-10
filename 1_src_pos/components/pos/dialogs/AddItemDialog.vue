```vue
<!-- src/components/pos/dialogs/AddItemDialog.vue -->
<template>
  <base-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    :loading="loading"
    @confirm="handleConfirm"
    @cancel="handleCancel"
    @update:model-value="$emit('update:model-value', $event)"
  >
    <v-container class="pa-0">
      <!-- Item Info -->
      <v-row no-gutters class="mb-4">
        <v-col cols="12">
          <div class="text-h6">{{ item.name }}</div>
          <div v-if="variant" class="text-subtitle-1">
            {{ variant.name }} - ${{ variant.price }}
          </div>
        </v-col>
      </v-row>

      <!-- Note Input -->
      <v-row no-gutters>
        <v-col cols="12">
          <v-textarea
            v-model="note"
            label="Add Note"
            variant="outlined"
            rows="3"
            hide-details
            class="note-input"
          />
        </v-col>
      </v-row>
    </v-container>
  </base-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { MenuItem, MenuItemVariant } from '@/types/menu'
import BaseDialog from '@/components/base/BaseDialog.vue'

const props = defineProps<{
  modelValue: boolean
  item: MenuItem
  variant: MenuItemVariant
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:model-value': [value: boolean]
  confirm: [variant: MenuItemVariant, note: string]
  cancel: []
}>()

const note = ref('')

const dialogTitle = computed(() => `Add ${props.item.name}`)

function handleConfirm() {
  emit('confirm', props.variant, note.value)
}

function handleCancel() {
  note.value = ''
  emit('cancel')
  emit('update:model-value', false)
}
</script>

<style scoped>
.note-input {
  width: 100%;
}
</style>
