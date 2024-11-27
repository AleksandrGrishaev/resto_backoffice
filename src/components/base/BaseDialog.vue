<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="maxWidth"
    :persistent="persistent"
    @click:outside="handleCancel"
  >
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <template #default>
          <span class="text-h5">{{ title }}</span>
          <v-spacer />
          <slot name="title-actions" />
        </template>
      </v-card-title>

      <v-card-text class="pa-4">
        <slot />
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <slot name="actions">
          <div class="actions-wrapper w-100">
            <v-btn
              variant="text"
              width="50%"
              height="44"
              :disabled="loading"
              class="text-uppercase"
              @click="handleCancel"
            >
              {{ cancelText }}
            </v-btn>

            <v-btn
              color="primary"
              variant="flat"
              width="50%"
              height="44"
              :loading="loading"
              :disabled="disabled"
              class="text-uppercase"
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
withDefaults(
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
    cancelText: 'Отмена',
    confirmText: 'Сохранить'
  }
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
  cancel: []
  confirm: []
}>()

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

function handleConfirm() {
  emit('confirm')
}
</script>

<style lang="scss" scoped>
:deep(.v-card) {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.gap-4 {
  gap: 16px;
}
</style>
