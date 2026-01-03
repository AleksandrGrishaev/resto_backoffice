<!-- src/components/input/NumericInputField.vue -->
<!--
  Smart numeric input field that automatically uses NumericKeypad on tablets.
  Drop-in replacement for v-text-field with type="number".

  Features:
  - Auto-detects tablet mode and shows custom keypad
  - Blocks system keyboard on tablets
  - Falls back to native input on desktop
  - Supports all v-text-field props

  Usage:
  <NumericInputField
    v-model="amount"
    label="Amount"
    prefix="Rp"
    :min="0"
    :max="100000"
  />
-->
<template>
  <div class="numeric-input-field">
    <!-- Native input (desktop) or trigger (tablet) -->
    <v-text-field
      ref="textFieldRef"
      :model-value="displayValue"
      :label="label"
      :prefix="prefix"
      :suffix="suffix"
      :hint="hint"
      :error-messages="errorMessages"
      :disabled="disabled"
      :readonly="isTabletMode || readonly"
      :variant="variant"
      :density="density"
      :hide-details="hideDetails"
      :persistent-hint="persistentHint"
      :class="{ 'cursor-pointer': isTabletMode }"
      v-bind="isTabletMode ? noKeyboardAttrs : {}"
      type="text"
      inputmode="decimal"
      @click="handleClick"
      @focus="handleFocus"
      @blur="handleBlur"
      @update:model-value="handleNativeInput"
    >
      <template v-if="$slots.prepend" #prepend>
        <slot name="prepend" />
      </template>
      <template v-if="$slots.append" #append>
        <slot name="append" />
      </template>
      <template v-if="$slots['prepend-inner']" #prepend-inner>
        <slot name="prepend-inner" />
      </template>
    </v-text-field>

    <!-- Keypad Dialog (tablet mode) -->
    <v-dialog
      v-model="showKeypad"
      :max-width="keypadDialogWidth"
      :persistent="keypadPersistent"
      content-class="keypad-dialog"
    >
      <v-card class="keypad-dialog-card">
        <v-card-title v-if="label" class="text-subtitle-1 pb-0">
          {{ label }}
        </v-card-title>

        <v-card-text class="pa-3">
          <NumericKeypad
            ref="keypadRef"
            v-model="tempValue"
            :show-display="true"
            :label="''"
            :prefix="prefix"
            :suffix="suffix"
            :hint="hint"
            :min="min"
            :max="max"
            :max-length="maxLength"
            :required="required"
            :allow-decimal="allowDecimal"
            :allow-double-zero="allowDoubleZero"
            :decimal-places="decimalPlaces"
            :format-as-currency="formatAsCurrency"
            :quick-values="quickValues"
            :show-actions="true"
            :submit-label="submitLabel"
            :clear-label="clearLabel"
            :compact="compactKeypad"
            @submit="handleKeypadSubmit"
            @cancel="handleKeypadCancel"
            @clear="handleKeypadClear"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import NumericKeypad from './NumericKeypad.vue'
import { useTabletMode, useNoKeyboardAttrs } from '@/composables/useTabletMode'
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
  // Core
  modelValue?: number | string

  // Text field props
  label?: string
  prefix?: string
  suffix?: string
  hint?: string
  errorMessages?: string | string[]
  disabled?: boolean
  readonly?: boolean
  variant?:
    | 'outlined'
    | 'filled'
    | 'underlined'
    | 'plain'
    | 'solo'
    | 'solo-inverted'
    | 'solo-filled'
  density?: 'default' | 'comfortable' | 'compact'
  hideDetails?: boolean | 'auto'
  persistentHint?: boolean

  // Validation
  min?: number
  max?: number
  maxLength?: number
  required?: boolean

  // Numeric keypad options
  allowDecimal?: boolean
  allowDoubleZero?: boolean
  decimalPlaces?: number
  formatAsCurrency?: boolean
  quickValues?: QuickValue[]

  // Keypad dialog options
  keypadDialogWidth?: number | string
  keypadPersistent?: boolean
  submitLabel?: string
  clearLabel?: string
  compactKeypad?: boolean

  // Force tablet mode (for testing)
  forceTabletMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  label: '',
  prefix: '',
  suffix: '',
  hint: '',
  errorMessages: '',
  disabled: false,
  readonly: false,
  variant: 'outlined',
  density: 'comfortable',
  hideDetails: false,
  persistentHint: false,
  min: undefined,
  max: undefined,
  maxLength: 12,
  required: false,
  allowDecimal: false,
  allowDoubleZero: true,
  decimalPlaces: 6,
  formatAsCurrency: false,
  quickValues: () => [],
  keypadDialogWidth: 360,
  keypadPersistent: false,
  submitLabel: 'OK',
  clearLabel: 'Clear',
  compactKeypad: false,
  forceTabletMode: false
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'update:modelValue': [value: number]
  submit: [value: number]
  focus: []
  blur: []
}>()

// =============================================
// COMPOSABLES
// =============================================

const { isTabletMode: detectedTabletMode } = useTabletMode()
const noKeyboardAttrs = useNoKeyboardAttrs()

// =============================================
// STATE
// =============================================

const textFieldRef = ref<any>(null)
const keypadRef = ref<InstanceType<typeof NumericKeypad> | null>(null)
const showKeypad = ref(false)
const tempValue = ref<number>(0)
const isEditing = ref(false)
const editingValue = ref('')

// =============================================
// COMPUTED
// =============================================

const isTabletMode = computed(() => props.forceTabletMode || detectedTabletMode.value)

const numericValue = computed(() => {
  if (typeof props.modelValue === 'string') {
    return parseFloat(props.modelValue) || 0
  }
  return props.modelValue || 0
})

const displayValue = computed(() => {
  // During editing, show raw input value without formatting
  if (isEditing.value && !isTabletMode.value) {
    return editingValue.value
  }

  const val = numericValue.value

  if (props.formatAsCurrency) {
    return formatIDR(val).replace('Rp ', '')
  }

  // Show 0 as "0" (don't hide it)
  if (val === 0) return '0'

  // Format with thousand separators
  return val.toLocaleString('id-ID')
})

// =============================================
// METHODS
// =============================================

function handleClick() {
  if (props.disabled) return

  if (isTabletMode.value) {
    openKeypad()
  }
}

function handleFocus(event: FocusEvent) {
  emit('focus')

  if (isTabletMode.value) {
    // Blur to prevent keyboard, then open our keypad
    const input = event.target as HTMLInputElement
    input?.blur()
    openKeypad()
  } else {
    // Desktop mode: start editing with raw value
    isEditing.value = true
    editingValue.value = numericValue.value ? String(numericValue.value) : ''
  }
}

function handleNativeInput(value: string) {
  if (isTabletMode.value) return // Ignore in tablet mode

  // Store raw editing value
  editingValue.value = value

  // Parse the input value
  const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.')
  const parsed = parseFloat(cleanValue) || 0

  emit('update:modelValue', parsed)
}

function handleBlur() {
  isEditing.value = false
  editingValue.value = ''
  emit('blur')
}

function openKeypad() {
  // Start with 0 so user can immediately type new value
  // The previous value is shown in the text field behind the dialog
  tempValue.value = 0
  showKeypad.value = true

  // Clear the keypad display after it opens
  nextTick(() => {
    keypadRef.value?.clear?.()
  })
}

function closeKeypad() {
  showKeypad.value = false
  emit('blur')
}

function handleKeypadSubmit(value: number) {
  emit('update:modelValue', value)
  emit('submit', value)
  closeKeypad()
}

function handleKeypadCancel() {
  closeKeypad()
}

function handleKeypadClear() {
  tempValue.value = 0
}

// =============================================
// WATCHERS
// =============================================

// Sync tempValue when modelValue changes externally
watch(
  () => props.modelValue,
  newVal => {
    if (!showKeypad.value) {
      tempValue.value = typeof newVal === 'string' ? parseFloat(newVal) || 0 : newVal || 0
    }
  },
  { immediate: true }
)

// =============================================
// EXPOSE
// =============================================

defineExpose({
  openKeypad,
  closeKeypad,
  focus: () => textFieldRef.value?.focus()
})
</script>

<style lang="scss" scoped>
.numeric-input-field {
  width: 100%;
}

.cursor-pointer {
  cursor: pointer;

  :deep(input) {
    cursor: pointer;
  }
}

:deep(.keypad-dialog) {
  margin: auto;
}

.keypad-dialog-card {
  overflow: visible;
}
</style>

<style lang="scss">
// Global styles for keypad dialog (not scoped)
.keypad-dialog {
  .v-overlay__content {
    margin: auto !important;
  }
}
</style>
