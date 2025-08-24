<!-- src/views/preparation/components/writeoff/PreparationWriteOffWidget.vue -->
<template>
  <div class="preparation-writeoff-widget">
    <!-- Main Write-off Button -->
    <v-btn
      color="error"
      variant="outlined"
      prepend-icon="mdi-delete-sweep"
      @click="showDialog = true"
    >
      Write Off
    </v-btn>

    <!-- Write-off Dialog -->
    <preparation-writeoff-dialog
      v-model="showDialog"
      :department="department"
      @success="handleSuccess"
      @error="handleError"
    />

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccessSnackbar" color="success" timeout="3000">
      <v-icon icon="mdi-check-circle" class="mr-2" />
      {{ successMessage }}
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showErrorSnackbar" color="error" timeout="5000">
      <v-icon icon="mdi-alert-circle" class="mr-2" />
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showErrorSnackbar = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DebugUtils } from '@/utils'
import PreparationWriteoffDialog from './PreparationWriteOffDialog.vue'
import type { PreparationDepartment } from '@/stores/preparation/types'

const MODULE_NAME = 'PreparationWriteOffWidget'

interface Props {
  department: PreparationDepartment
}

const props = defineProps<Props>()

const emit = defineEmits<{
  success: [message: string]
  'refresh-needed': []
}>()

// State
const showDialog = ref(false)
const showSuccessSnackbar = ref(false)
const showErrorSnackbar = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Methods
function handleSuccess(operation: any) {
  try {
    DebugUtils.info(MODULE_NAME, 'Preparation write-off operation completed successfully', {
      operationId: operation?.id,
      department: props.department
    })

    successMessage.value = 'Preparations written off successfully!'
    showSuccessSnackbar.value = true
    showDialog.value = false

    emit('success', successMessage.value)
    emit('refresh-needed')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error handling write-off success', { error })
  }
}

function handleError(error: any) {
  try {
    DebugUtils.error(MODULE_NAME, 'Preparation write-off operation failed', { error })

    errorMessage.value = error?.message || 'Failed to write off preparations'
    showErrorSnackbar.value = true
    showDialog.value = false
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Error handling write-off error', { error: err })
  }
}
</script>

<style lang="scss" scoped>
.preparation-writeoff-widget {
  // Widget styles if needed
}
</style>
