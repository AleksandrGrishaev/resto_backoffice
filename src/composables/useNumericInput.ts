// src/composables/useNumericInput.ts
/**
 * Composable for managing numeric input with NumericKeypad integration.
 * Handles focus, validation, and tablet keyboard blocking.
 *
 * Usage:
 * const { value, showKeypad, openKeypad, closeKeypad, handleSubmit } = useNumericInput({
 *   initialValue: 0,
 *   min: 0,
 *   max: 100000,
 *   onSubmit: (val) => console.log('Submitted:', val)
 * })
 */

import { ref, computed, watch, type Ref } from 'vue'
import { useTabletMode } from './useTabletMode'

// =============================================
// TYPES
// =============================================

export interface NumericInputOptions {
  // Initial value
  initialValue?: number

  // Validation
  min?: number
  max?: number
  required?: boolean

  // Callbacks
  onSubmit?: (value: number) => void
  onChange?: (value: number) => void
  onCancel?: () => void

  // Features
  allowDecimal?: boolean
  formatAsCurrency?: boolean
}

export interface NumericInputField {
  id: string
  value: Ref<number>
  label?: string
  prefix?: string
  suffix?: string
  min?: number
  max?: number
  allowDecimal?: boolean
  quickValues?: Array<{ label: string; value: number }>
}

// =============================================
// SINGLE INPUT COMPOSABLE
// =============================================

export function useNumericInput(options: NumericInputOptions = {}) {
  const {
    initialValue = 0,
    min,
    max,
    required = false,
    onSubmit,
    onChange,
    onCancel,
    allowDecimal = false,
    formatAsCurrency = false
  } = options

  const { isTabletMode } = useTabletMode()

  // State
  const value = ref<number>(initialValue)
  const showKeypad = ref(false)
  const tempValue = ref<number>(initialValue)

  // Computed
  const isValid = computed(() => {
    if (required && value.value === 0) return false
    if (min !== undefined && value.value < min) return false
    if (max !== undefined && value.value > max) return false
    return true
  })

  const shouldUseKeypad = computed(() => isTabletMode.value)

  // Methods
  function openKeypad() {
    tempValue.value = value.value
    showKeypad.value = true
  }

  function closeKeypad() {
    showKeypad.value = false
  }

  function handleKeypadSubmit(newValue: number) {
    value.value = newValue
    showKeypad.value = false
    onSubmit?.(newValue)
  }

  function handleKeypadCancel() {
    showKeypad.value = false
    onCancel?.()
  }

  function handleKeypadChange(newValue: number) {
    tempValue.value = newValue
    onChange?.(newValue)
  }

  function setValue(newValue: number) {
    value.value = newValue
    onChange?.(newValue)
  }

  function reset() {
    value.value = initialValue
    tempValue.value = initialValue
    showKeypad.value = false
  }

  // Watch for external value changes
  watch(value, newVal => {
    onChange?.(newVal)
  })

  return {
    // State
    value,
    tempValue,
    showKeypad,

    // Computed
    isValid,
    shouldUseKeypad,

    // Methods
    openKeypad,
    closeKeypad,
    handleKeypadSubmit,
    handleKeypadCancel,
    handleKeypadChange,
    setValue,
    reset,

    // Config for keypad
    keypadConfig: computed(() => ({
      min,
      max,
      required,
      allowDecimal,
      formatAsCurrency
    }))
  }
}

// =============================================
// MULTI-FIELD INPUT COMPOSABLE
// =============================================

/**
 * Composable for managing multiple numeric input fields with a single keypad.
 * Useful for forms with many numeric fields (like QuickReceiptDialog).
 *
 * Usage:
 * const { activeField, openKeypadFor, handleSubmit } = useMultiNumericInput()
 */
export function useMultiNumericInput() {
  const { isTabletMode } = useTabletMode()

  // State
  const activeField = ref<NumericInputField | null>(null)
  const showKeypad = ref(false)
  const tempValue = ref<number>(0)

  // Computed
  const shouldUseKeypad = computed(() => isTabletMode.value)

  const keypadConfig = computed(() => {
    if (!activeField.value) return {}
    return {
      label: activeField.value.label,
      prefix: activeField.value.prefix,
      suffix: activeField.value.suffix,
      min: activeField.value.min,
      max: activeField.value.max,
      allowDecimal: activeField.value.allowDecimal,
      quickValues: activeField.value.quickValues
    }
  })

  // Methods
  function openKeypadFor(field: NumericInputField) {
    activeField.value = field
    tempValue.value = field.value.value
    showKeypad.value = true
  }

  function closeKeypad() {
    showKeypad.value = false
    activeField.value = null
  }

  function handleKeypadSubmit(newValue: number) {
    if (activeField.value) {
      activeField.value.value.value = newValue
    }
    closeKeypad()
  }

  function handleKeypadCancel() {
    closeKeypad()
  }

  return {
    // State
    activeField,
    showKeypad,
    tempValue,

    // Computed
    shouldUseKeypad,
    keypadConfig,

    // Methods
    openKeypadFor,
    closeKeypad,
    handleKeypadSubmit,
    handleKeypadCancel
  }
}

// =============================================
// HELPER: Block system keyboard
// =============================================

/**
 * Directive-like function to block system keyboard on an input element.
 * Call this on the input element's focus event.
 */
export function blockSystemKeyboard(event: FocusEvent, shouldBlock: boolean) {
  if (!shouldBlock) return

  const input = event.target as HTMLInputElement
  if (input) {
    // Set inputmode to none to prevent keyboard
    input.setAttribute('inputmode', 'none')
    // Blur immediately to prevent keyboard flash
    input.blur()
  }
}

/**
 * Returns input props to disable system keyboard when in tablet mode.
 */
export function useKeyboardBlockProps(isTabletMode: Ref<boolean>) {
  return computed(() => {
    if (!isTabletMode.value) return {}
    return {
      inputmode: 'none',
      readonly: true
    }
  })
}
