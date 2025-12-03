<!-- src/views/pos/order/dialogs/AddNoteDialog.vue -->
<template>
  <v-dialog :model-value="modelValue" max-width="500" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between bg-primary">
        <div class="d-flex align-center">
          <v-icon class="mr-2">{{ readonly ? 'mdi-note-text' : 'mdi-note-plus' }}</v-icon>
          <span>{{ readonly ? 'View Kitchen Note' : 'Kitchen Note' }}</span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="handleCancel" />
      </v-card-title>

      <!-- Content -->
      <v-card-text class="pa-6">
        <v-textarea
          v-model="note"
          label="Kitchen Note"
          :placeholder="readonly ? '' : 'Add special instructions for the kitchen...'"
          rows="4"
          auto-grow
          variant="outlined"
          :autofocus="!readonly"
          :readonly="readonly"
          :counter="!readonly"
          :maxlength="readonly ? undefined : 200"
          :hint="
            readonly
              ? 'This item was sent to kitchen. Note cannot be edited.'
              : 'Max 200 characters'
          "
          persistent-hint
        />
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">{{ readonly ? 'Close' : 'Cancel' }}</v-btn>
        <v-btn v-if="!readonly" color="primary" :disabled="!note.trim()" @click="handleSave">
          Save Note
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  existingNote?: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  existingNote: '',
  readonly: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [note: string]
  cancel: []
}>()

// State
const note = ref('')

// Watch for dialog open/close to reset note
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      note.value = props.existingNote
    }
  },
  { immediate: true }
)

// Methods
function handleSave(): void {
  if (note.value.trim()) {
    emit('save', note.value.trim())
    emit('update:modelValue', false)
  }
}

function handleCancel(): void {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* Dialog specific styles if needed */
</style>
