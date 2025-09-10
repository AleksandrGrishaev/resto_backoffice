<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="maxWidth"
    :persistent="persistent"
    @click:outside="handleCancel"
  >
    <base-card elevated>
      <!-- Header -->
      <v-card-title class="d-flex align-center pa-4">
        <span class="text-h5">{{ title }}</span>
        <v-spacer />
        <slot name="title-actions" />
      </v-card-title>

      <!-- Content -->
      <v-card-text class="pa-4">
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="error = ''"
        >
          {{ error }}
        </v-alert>
        <slot />
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <slot name="actions">
          <div class="d-flex gap-4 justify-end w-100">
            <v-btn
              variant="text"
              class="text-uppercase"
              height="44"
              min-width="120"
              :disabled="loading"
              @click="handleCancel"
            >
              {{ cancelText }}
            </v-btn>
            <v-btn
              color="primary"
              class="text-uppercase"
              height="44"
              min-width="120"
              :loading="loading"
              :disabled="disabled"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </v-btn>
          </div>
        </slot>
      </v-card-actions>
    </base-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DebugUtils } from '@/utils/debugger'
import BaseCard from '@/components/base/BaseCard.vue'

const MODULE_NAME = 'BaseDialog'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    loading?: boolean
    disabled?: boolean
    maxWidth?: number | string
    persistent?: boolean
    cancelText?: string
    confirmText?: string
  }>(),
  {
    loading: false,
    disabled: false,
    maxWidth: 700,
    persistent: true,
    cancelText: 'Cancel',
    confirmText: 'Save'
  }
)

const emit = defineEmits<{
  'update:model-value': [boolean]
  cancel: []
  confirm: []
}>()

const error = ref('')

function handleConfirm() {
  error.value = ''
  try {
    emit('confirm')
  } catch (err) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'An error occurred. Please try again.'
    }
    DebugUtils.error(MODULE_NAME, 'Error during confirmation', { error: err })
  }
}

function handleCancel() {
  error.value = ''
  emit('cancel')
  emit('update:model-value', false)
}
</script>
