<!-- src/components/dialogs/UnsavedChangesDialog.vue -->
<template>
  <base-dialog
    :model-value="modelValue"
    title="Unsaved Changes"
    confirm-text="Continue"
    cancel-text="Cancel"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="text-body-1">You have unsaved changes. Do you want to continue without saving?</div>
  </base-dialog>
</template>

<script setup lang="ts">
import BaseDialog from '@/components/base/BaseDialog.vue'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:model-value': [value: boolean]
  confirm: []
  cancel: []
}>()

const handleConfirm = () => {
  emit('confirm')
  emit('update:model-value', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:model-value', false)
}
</script>
