<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="maxWidth"
    :persistent="persistent"
    @click:outside="handleCancel"
  >
    <v-card class="base-dialog-card">
      <v-card-title class="d-flex align-center pa-4 base-dialog-card__title">
        <template #default>
          <span class="text-h5">{{ title }}</span>
          <v-spacer />
          <slot name="title-actions" />
        </template>
      </v-card-title>

      <v-card-text class="pa-4 base-dialog-card__content">
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

      <v-card-actions class="pa-4 base-dialog-card__actions">
        <slot name="actions">
          <div class="actions-wrapper w-100">
            <v-btn
              variant="text"
              class="text-uppercase action-button"
              height="44"
              :disabled="loading"
              @click="handleCancel"
            >
              {{ cancelText }}
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              class="text-uppercase action-button"
              height="44"
              :loading="loading"
              :disabled="disabled || loading"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </v-btn>
          </div>
        </slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DebugUtils } from '@/utils/debugger'

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

// Methods
async function handleConfirm() {
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

<style lang="scss" scoped>
:deep(.v-card) {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.base-dialog-card {
  display: flex;
  flex-direction: column;
  max-height: 90vh;

  &__title {
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  &__actions {
    flex-shrink: 0;
  }
}

.actions-wrapper {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  width: 100%;
}

.action-button {
  min-width: 120px;
  padding: 0 24px;
}
</style>
