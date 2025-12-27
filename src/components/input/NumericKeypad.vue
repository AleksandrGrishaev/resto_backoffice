<!-- src/components/input/NumericKeypad.vue -->
<!--
  Touch-friendly numeric keypad for tablet/mobile input.
  Designed to replace system keyboard for numeric fields in POS and Backoffice.

  Usage:
  <NumericKeypad
    v-model="amount"
    :allow-decimal="true"
    :max-value="100000"
    @submit="handleSubmit"
    @cancel="handleCancel"
  />
-->
<template>
  <div class="numeric-keypad" :class="{ 'keypad-inline': inline, 'keypad-compact': compact }">
    <!-- Display (optional, can be hidden if using external display) -->
    <div v-if="showDisplay" class="keypad-display">
      <div class="display-label">{{ label }}</div>
      <div class="display-value" :class="{ 'has-error': hasError }">
        <span v-if="prefix" class="display-prefix">{{ prefix }}</span>
        <span class="display-number">{{ formattedDisplayValue }}</span>
        <span v-if="suffix" class="display-suffix">{{ suffix }}</span>
      </div>
      <div v-if="hasError" class="display-error">{{ errorMessage }}</div>
      <div v-else-if="hint" class="display-hint">{{ hint }}</div>
    </div>

    <!-- Keypad Grid -->
    <div class="keypad-grid">
      <!-- Row 1: 7 8 9 -->
      <button
        v-for="num in ['7', '8', '9']"
        :key="num"
        type="button"
        class="keypad-btn keypad-btn-number"
        @click="handleInput(num)"
      >
        {{ num }}
      </button>

      <!-- Row 2: 4 5 6 -->
      <button
        v-for="num in ['4', '5', '6']"
        :key="num"
        type="button"
        class="keypad-btn keypad-btn-number"
        @click="handleInput(num)"
      >
        {{ num }}
      </button>

      <!-- Row 3: 1 2 3 -->
      <button
        v-for="num in ['1', '2', '3']"
        :key="num"
        type="button"
        class="keypad-btn keypad-btn-number"
        @click="handleInput(num)"
      >
        {{ num }}
      </button>

      <!-- Row 4: 0 00 . or C -->
      <button type="button" class="keypad-btn keypad-btn-number" @click="handleInput('0')">
        0
      </button>

      <button
        v-if="allowDoubleZero"
        type="button"
        class="keypad-btn keypad-btn-number"
        @click="handleInput('00')"
      >
        00
      </button>
      <button v-else type="button" class="keypad-btn keypad-btn-clear" @click="handleClear">
        C
      </button>

      <button
        v-if="allowDecimal"
        type="button"
        class="keypad-btn keypad-btn-decimal"
        :disabled="hasDecimal"
        @click="handleInput('.')"
      >
        .
      </button>
      <button v-else type="button" class="keypad-btn keypad-btn-backspace" @click="handleBackspace">
        <v-icon size="20">mdi-backspace-outline</v-icon>
      </button>
    </div>

    <!-- Action Row (optional) -->
    <div v-if="showActions" class="keypad-actions">
      <button
        type="button"
        class="keypad-btn keypad-btn-action keypad-btn-clear"
        @click="handleClear"
      >
        <v-icon size="18" class="mr-1">mdi-close</v-icon>
        {{ clearLabel }}
      </button>
      <button
        type="button"
        class="keypad-btn keypad-btn-action keypad-btn-submit"
        :disabled="!isValid"
        @click="handleSubmit"
      >
        <v-icon size="18" class="mr-1">mdi-check</v-icon>
        {{ submitLabel }}
      </button>
    </div>

    <!-- Quick Values (optional) -->
    <div v-if="quickValues.length > 0" class="keypad-quick-values">
      <button
        v-for="qv in quickValues"
        :key="qv.value"
        type="button"
        class="keypad-btn keypad-btn-quick"
        @click="handleQuickValue(qv.value)"
      >
        {{ qv.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { formatIDR } from '@/utils/currency'

// =============================================
// TYPES
// =============================================

interface QuickValue {
  label: string
  value: number
}

// =============================================
// PROPS
// =============================================

interface Props {
  // Core value
  modelValue?: number | string

  // Display options
  showDisplay?: boolean
  label?: string
  prefix?: string
  suffix?: string
  hint?: string

  // Validation
  min?: number
  max?: number
  maxLength?: number
  required?: boolean

  // Features
  allowDecimal?: boolean
  allowDoubleZero?: boolean
  decimalPlaces?: number
  formatAsCurrency?: boolean

  // Quick values (e.g., [{ label: '10K', value: 10000 }])
  quickValues?: QuickValue[]

  // Actions
  showActions?: boolean
  submitLabel?: string
  clearLabel?: string

  // Layout
  inline?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  showDisplay: true,
  label: '',
  prefix: '',
  suffix: '',
  hint: '',
  min: 0,
  max: undefined,
  maxLength: 12,
  required: false,
  allowDecimal: false,
  allowDoubleZero: true,
  decimalPlaces: 2,
  formatAsCurrency: false,
  quickValues: () => [],
  showActions: true,
  submitLabel: 'OK',
  clearLabel: 'Clear',
  inline: false,
  compact: false
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'update:modelValue': [value: number]
  submit: [value: number]
  cancel: []
  clear: []
}>()

// =============================================
// STATE
// =============================================

// Internal string representation for precise input
const inputValue = ref<string>('')

// =============================================
// COMPUTED
// =============================================

const numericValue = computed<number>(() => {
  if (!inputValue.value) return 0
  const parsed = parseFloat(inputValue.value)
  return isNaN(parsed) ? 0 : parsed
})

const hasDecimal = computed(() => inputValue.value.includes('.'))

const formattedDisplayValue = computed(() => {
  if (!inputValue.value) return '0'

  if (props.formatAsCurrency) {
    return formatIDR(numericValue.value).replace('Rp ', '')
  }

  // Add thousand separators for large numbers
  if (!hasDecimal.value && inputValue.value.length > 3) {
    return numericValue.value.toLocaleString('id-ID')
  }

  return inputValue.value
})

const hasError = computed(() => {
  if (props.required && numericValue.value === 0) return true
  if (props.min !== undefined && numericValue.value < props.min) return true
  if (props.max !== undefined && numericValue.value > props.max) return true
  return false
})

const errorMessage = computed(() => {
  if (props.required && numericValue.value === 0) {
    return 'Value is required'
  }
  if (props.min !== undefined && numericValue.value < props.min) {
    return `Minimum value: ${props.formatAsCurrency ? formatIDR(props.min) : props.min}`
  }
  if (props.max !== undefined && numericValue.value > props.max) {
    return `Maximum value: ${props.formatAsCurrency ? formatIDR(props.max) : props.max}`
  }
  return ''
})

const isValid = computed(() => {
  if (props.required && numericValue.value === 0) return false
  if (props.min !== undefined && numericValue.value < props.min) return false
  if (props.max !== undefined && numericValue.value > props.max) return false
  return true
})

// =============================================
// METHODS
// =============================================

function handleInput(char: string) {
  let newValue = inputValue.value

  // Handle decimal point
  if (char === '.') {
    if (hasDecimal.value) return
    if (!newValue) newValue = '0'
    newValue += '.'
  }
  // Handle double zero
  else if (char === '00') {
    if (!newValue || newValue === '0') {
      newValue = '0'
    } else {
      newValue += '00'
    }
  }
  // Handle regular digit
  else {
    // Replace leading zero unless adding decimal
    if (newValue === '0' && char !== '.') {
      newValue = char
    } else {
      newValue += char
    }
  }

  // Check decimal places limit
  if (hasDecimal.value && props.allowDecimal) {
    const parts = newValue.split('.')
    if (parts[1] && parts[1].length > props.decimalPlaces) {
      return
    }
  }

  // Check max length
  const cleanValue = newValue.replace('.', '')
  if (cleanValue.length > props.maxLength) {
    return
  }

  // Check max value (soft check - allow typing but show error)
  const testValue = parseFloat(newValue) || 0
  if (props.max !== undefined && testValue > props.max * 10) {
    // Don't allow values more than 10x the max (prevent obvious mistakes)
    return
  }

  inputValue.value = newValue
  emit('update:modelValue', numericValue.value)
}

function handleBackspace() {
  if (inputValue.value.length <= 1) {
    inputValue.value = ''
  } else {
    inputValue.value = inputValue.value.slice(0, -1)
  }
  emit('update:modelValue', numericValue.value)
}

function handleClear() {
  inputValue.value = ''
  emit('update:modelValue', 0)
  emit('clear')
}

function handleSubmit() {
  if (isValid.value) {
    emit('submit', numericValue.value)
  }
}

function handleQuickValue(value: number) {
  inputValue.value = String(value)
  emit('update:modelValue', value)
}

function setValue(value: number | string) {
  if (typeof value === 'string') {
    inputValue.value = value
  } else {
    inputValue.value = value ? String(value) : ''
  }
}

// =============================================
// WATCHERS
// =============================================

// Sync with external modelValue changes
watch(
  () => props.modelValue,
  newValue => {
    const externalValue = typeof newValue === 'string' ? parseFloat(newValue) || 0 : newValue || 0
    if (externalValue !== numericValue.value) {
      setValue(externalValue)
    }
  },
  { immediate: true }
)

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  if (props.modelValue) {
    setValue(props.modelValue)
  }
})

// =============================================
// EXPOSE
// =============================================

defineExpose({
  clear: handleClear,
  setValue,
  getValue: () => numericValue.value,
  isValid
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.numeric-keypad {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  width: 100%;
  max-width: 320px;
  user-select: none;

  &.keypad-inline {
    max-width: none;
  }

  &.keypad-compact {
    gap: var(--spacing-xs);

    .keypad-btn {
      min-height: 44px;
      font-size: var(--text-base);
    }

    .keypad-display {
      padding: var(--spacing-xs) var(--spacing-sm);
    }
  }
}

// Display Section
.keypad-display {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: right;
}

.display-label {
  font-size: var(--text-xs);
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: var(--spacing-xs);
  text-align: left;
}

.display-value {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: var(--spacing-xs);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  min-height: 36px;

  &.has-error {
    color: rgb(var(--v-theme-error));
  }
}

.display-prefix,
.display-suffix {
  font-size: var(--text-base);
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.display-hint {
  font-size: var(--text-xs);
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-top: var(--spacing-xs);
  text-align: left;
}

.display-error {
  font-size: var(--text-xs);
  color: rgb(var(--v-theme-error));
  margin-top: var(--spacing-xs);
  text-align: left;
}

// Keypad Grid
.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xs);
}

// Buttons
.keypad-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-xl);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
}

.keypad-btn-number {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  color: rgb(var(--v-theme-on-surface));

  &:hover:not(:disabled) {
    background: rgba(var(--v-theme-surface-variant), 0.8);
  }

  &:active:not(:disabled) {
    background: rgba(var(--v-theme-primary), 0.2);
  }
}

.keypad-btn-decimal {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  color: rgb(var(--v-theme-on-surface));

  &:hover:not(:disabled) {
    background: rgba(var(--v-theme-surface-variant), 0.5);
  }
}

.keypad-btn-backspace {
  background: rgba(var(--v-theme-warning), 0.15);
  color: rgb(var(--v-theme-warning));

  &:hover:not(:disabled) {
    background: rgba(var(--v-theme-warning), 0.25);
  }
}

.keypad-btn-clear {
  background: rgba(var(--v-theme-error), 0.15);
  color: rgb(var(--v-theme-error));

  &:hover:not(:disabled) {
    background: rgba(var(--v-theme-error), 0.25);
  }
}

// Action Row
.keypad-actions {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}

.keypad-btn-action {
  min-height: 48px;
  font-size: var(--text-sm);
  font-weight: 600;
}

.keypad-btn-submit {
  background: rgb(var(--v-theme-success));
  color: rgb(var(--v-theme-on-success));

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  &:disabled {
    background: rgba(var(--v-theme-success), 0.3);
  }
}

// Quick Values
.keypad-quick-values {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}

.keypad-btn-quick {
  flex: 1;
  min-width: 60px;
  min-height: 40px;
  font-size: var(--text-sm);
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  border: 1px solid rgba(var(--v-theme-primary), 0.3);

  &:hover:not(:disabled) {
    background: rgba(var(--v-theme-primary), 0.2);
  }
}

// Responsive adjustments
@media (max-width: 400px) {
  .keypad-btn {
    min-height: 48px;
    font-size: var(--text-lg);
  }

  .display-value {
    font-size: var(--text-xl);
  }
}
</style>
