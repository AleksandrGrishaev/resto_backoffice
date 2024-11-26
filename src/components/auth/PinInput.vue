<!-- src/components/auth/PinInput.vue -->
<template>
  <v-form @submit.prevent="handleSubmit">
    <v-text-field
      v-model="pin"
      label="Enter PIN"
      type="password"
      maxlength="4"
      :rules="[rules.required, rules.length, rules.numeric]"
      :loading="loading"
      :disabled="loading"
      :error-messages="errorMessage"
      hide-details="auto"
      class="mb-4"
      @update:model-value="handleInput"
    />

    <v-btn
      block
      color="primary"
      size="large"
      :loading="loading"
      :disabled="!isValid || loading"
      type="submit"
    >
      <v-icon start icon="mdi-login" />
      Login
    </v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PinInput'

// Используем деструктуризацию, чтобы явно показать использование props
const { loading = false } = defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [pin: string]
}>()

const pin = ref('')
const errorMessage = ref('')

const rules = {
  required: (v: string) => !!v || 'PIN is required',
  length: (v: string) => v.length === 4 || 'PIN must be 4 digits',
  numeric: (v: string) => /^\d+$/.test(v) || 'PIN must contain only numbers'
}

const isValid = computed(() => {
  return pin.value.length === 4 && /^\d+$/.test(pin.value)
})

const handleInput = (value: string) => {
  // Очищаем сообщение об ошибке при вводе
  errorMessage.value = ''
  // Разрешаем только цифры
  pin.value = value.replace(/\D/g, '').slice(0, 4)
}

const handleSubmit = () => {
  try {
    if (!isValid.value) {
      errorMessage.value = 'Please enter a valid 4-digit PIN'
      return
    }

    DebugUtils.debug(MODULE_NAME, 'PIN submitted')
    emit('submit', pin.value)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Submit error', { error })
    errorMessage.value = 'An error occurred while processing your request'
  }
}
</script>

<style scoped>
.pin-input {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}
</style>
