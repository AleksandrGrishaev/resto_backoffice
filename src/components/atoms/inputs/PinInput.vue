<!-- src/components/atoms/inputs/PinInput.vue -->
<template>
  <v-form class="pin-input-form" @submit.prevent="handleSubmit">
    <div class="d-flex flex-column align-center">
      <v-text-field
        v-model="pin"
        :label="label"
        type="password"
        maxlength="4"
        :rules="validationRules"
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
        :color="buttonColor"
        :size="buttonSize"
        :loading="loading"
        :disabled="!isValid || loading"
        type="submit"
        class="submit-button"
        :min-width="buttonMinWidth"
      >
        <v-icon start :icon="buttonIcon" />
        {{ buttonText }}
      </v-btn>
    </div>
  </v-form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'

// ===== ТИПЫ =====

type ButtonSize = 'x-small' | 'small' | 'default' | 'large' | 'x-large'

// ===== ПРОПСЫ =====

interface Props {
  loading?: boolean
  label?: string
  buttonText?: string
  buttonIcon?: string
  buttonColor?: string
  buttonSize?: ButtonSize
  buttonMinWidth?: string | number
  autoSubmit?: boolean // Автоматическая отправка при вводе 4 цифр
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  label: 'Введите PIN',
  buttonText: 'ВОЙТИ',
  buttonIcon: 'mdi-login',
  buttonColor: 'primary',
  buttonSize: 'large',
  buttonMinWidth: 200,
  autoSubmit: false
})

// ===== ЭМИТЫ =====

const emit = defineEmits<{
  submit: [pin: string]
  input: [pin: string] // Для отслеживания ввода
  valid: [isValid: boolean] // Для отслеживания валидности
}>()

// ===== СОСТОЯНИЕ =====

const pin = ref('')
const errorMessage = ref('')

// ===== ПРАВИЛА ВАЛИДАЦИИ =====

const validationRules = [
  (v: string) => !!v || 'PIN обязателен',
  (v: string) => v.length === 4 || 'PIN должен содержать 4 цифры',
  (v: string) => /^\d+$/.test(v) || 'PIN должен содержать только цифры'
]

// ===== ГЕТТЕРЫ =====

const isValid = computed(() => {
  return pin.value.length === 4 && /^\d+$/.test(pin.value)
})

// ===== МЕТОДЫ =====

const handleInput = (value: string) => {
  errorMessage.value = ''

  // Оставляем только цифры, максимум 4
  pin.value = value.replace(/\D/g, '').slice(0, 4)

  emit('input', pin.value)
  emit('valid', isValid.value)

  // Автоматическая отправка при заполнении
  if (props.autoSubmit && pin.value.length === 4 && isValid.value) {
    setTimeout(() => handleSubmit(), 100) // Небольшая задержка для UX
  }
}

const handleSubmit = () => {
  try {
    if (!isValid.value) {
      errorMessage.value = 'Пожалуйста, введите корректный 4-значный PIN'
      return
    }

    DebugUtils.debug('PinInput', 'PIN отправлен')
    emit('submit', pin.value)
  } catch (error) {
    DebugUtils.error('PinInput', 'Ошибка отправки', { error })
    errorMessage.value = 'Произошла ошибка при обработке запроса'
  }
}

// ===== ПУБЛИЧНЫЕ МЕТОДЫ =====

const clearPin = () => {
  pin.value = ''
  errorMessage.value = ''
}

const focusInput = () => {
  // TODO: Добавить фокус на поле ввода
}

// Экспортируем методы для использования через ref
defineExpose({
  clearPin,
  focusInput,
  isValid
})
</script>

<style lang="scss" scoped>
.pin-input-form {
  width: 100%;

  .pin-input {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;

    :deep(.v-field__input) {
      font-size: 1.25rem;
      text-align: center;
      font-family: 'Roboto Mono', monospace;
      letter-spacing: 0.5rem;
    }

    // Скрыть показ пароля
    :deep(.v-field__append-inner) {
      display: none;
    }
  }

  .submit-button {
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: 1px;
    height: 48px;
    text-transform: none;

    &:hover {
      transform: translateY(-2px);
      transition: transform 0.2s ease;
    }
  }
}

// ===== АДАПТИВНОСТЬ =====

@media (max-width: 600px) {
  .pin-input {
    max-width: 100% !important;

    :deep(.v-field__input) {
      font-size: 1.1rem !important;
      letter-spacing: 0.3rem !important;
    }
  }

  .submit-button {
    min-width: 150px !important;
    font-size: 1rem !important;
  }
}

// ===== TOUCH ОПТИМИЗАЦИЯ =====

@media (hover: none) and (pointer: coarse) {
  .pin-input {
    :deep(.v-field__input) {
      font-size: 1.4rem;
      padding: 16px;
    }
  }

  .submit-button {
    min-height: 56px;
    padding: 12px 24px;
  }
}

// ===== АНИМАЦИИ =====

.pin-input {
  :deep(.v-field) {
    transition: all 0.3s ease;

    &.v-field--focused {
      transform: scale(1.02);
    }
  }
}

.submit-button {
  transition: all 0.2s ease;

  &:not(:disabled) {
    &:hover {
      box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
    }
  }

  &:disabled {
    opacity: 0.6;
  }
}
</style>
