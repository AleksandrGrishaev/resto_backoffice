<template>
  <v-form class="pin-input-form" @submit.prevent="handleSubmit">
    <div class="d-flex flex-column align-center">
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
        class="mb-4 pin-input"
        color="primary"
        bg-color="surface"
        variant="outlined"
        @update:model-value="handleInput"
      />

      <v-btn
        color="primary"
        size="large"
        :loading="loading"
        :disabled="!isValid || loading"
        type="submit"
        class="login-button"
        min-width="200"
      >
        <v-icon start icon="mdi-login" />
        LOGIN
      </v-btn>
    </div>
  </v-form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PinInput'

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

<style lang="scss" scoped>
.pin-input-form {
  width: 100%;

  .pin-input {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;

    :deep(.v-field__input) {
      font-size: 1.2rem;
      text-align: center;
    }
  }

  .login-button {
    font-size: 1.1rem;
    letter-spacing: 2px;
    height: 48px;
  }
}
</style>
