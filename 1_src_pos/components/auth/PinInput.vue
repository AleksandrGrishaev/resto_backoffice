// src/components/auth/PinInput.vue
<template>
  <v-form class="d-flex flex-column align-center" @submit.prevent="handleSubmit">
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
      class="mb-4 w-100 max-w-500"
      color="primary"
      bg-color="surface"
      variant="outlined"
      @update:model-value="handleInput"
    >
      <!-- Используем правильный слот для кастомизации поля ввода -->
      <template #default>
        <div class="text-center text-body-1">{{ maskedPin }}</div>
      </template>
    </v-text-field>

    <v-btn
      color="primary"
      size="large"
      :loading="loading"
      :disabled="!isValid || loading"
      type="submit"
      min-width="200"
      height="48"
      class="text-button text-uppercase letter-spacing-2"
    >
      <v-icon start icon="mdi-login" />
      LOGIN
    </v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PinInput'

// Определяем пропсы без сохранения в переменную
withDefaults(
  defineProps<{
    loading?: boolean
  }>(),
  {
    loading: false
  }
)

const emit = defineEmits<{
  submit: [pin: string]
}>()

const pin = ref('')
const errorMessage = ref('')

const maskedPin = computed(() => '•'.repeat(pin.value.length))

const rules = {
  required: (v: string) => !!v || 'PIN is required',
  length: (v: string) => v.length === 4 || 'PIN must be 4 digits',
  numeric: (v: string) => /^\d+$/.test(v) || 'PIN must contain only numbers'
}

const isValid = computed(() => {
  return pin.value.length === 4 && /^\d+$/.test(pin.value)
})

const handleInput = (value: string) => {
  errorMessage.value = ''
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
