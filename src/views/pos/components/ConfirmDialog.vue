<!-- src/views/pos/components/ConfirmDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="400"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center">
        <v-icon :icon="iconName" :color="iconColor" class="me-3" />
        <span>{{ title }}</span>
      </v-card-title>

      <!-- Content -->
      <v-card-text v-if="message" class="pb-2">
        <div class="text-body-1">{{ message }}</div>
        <div v-if="details" class="text-caption text-medium-emphasis mt-2">
          {{ details }}
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="loading" @click="handleCancel">
          {{ cancelText }}
        </v-btn>

        <v-spacer />

        <v-btn :color="confirmColor" :loading="loading" @click="handleConfirm">
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Props
interface Props {
  modelValue: boolean
  title?: string
  message?: string
  details?: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'error' | 'success'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  title: 'Подтверждение',
  confirmText: 'Подтвердить',
  cancelText: 'Отмена',
  type: 'info',
  loading: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

// State
const dialog = ref(props.modelValue)

// Computed
const iconName = computed(() => {
  const icons = {
    info: 'mdi-information',
    warning: 'mdi-alert',
    error: 'mdi-alert-circle',
    success: 'mdi-check-circle'
  }
  return icons[props.type]
})

const iconColor = computed(() => {
  const colors = {
    info: 'info',
    warning: 'warning',
    error: 'error',
    success: 'success'
  }
  return colors[props.type]
})

const confirmColor = computed(() => {
  const colors = {
    info: 'primary',
    warning: 'warning',
    error: 'error',
    success: 'success'
  }
  return colors[props.type]
})

// Watchers
watch(
  () => props.modelValue,
  newVal => {
    dialog.value = newVal
  }
)

watch(dialog, newVal => {
  emit('update:modelValue', newVal)
})

// Methods
function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
  dialog.value = false
}
</script>

<style scoped>
.v-card-title {
  background-color: rgba(255, 255, 255, 0.02);
}
</style>
