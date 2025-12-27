// src/components/input/index.ts
/**
 * Input components for tablet-friendly numeric input.
 *
 * Components:
 * - NumericKeypad: Standalone numeric keypad widget
 * - NumericInputField: Smart input field with auto-keypad on tablets
 *
 * Composables (re-exported from composables):
 * - useTabletMode: Detect tablet/touch mode
 * - useNumericInput: Manage numeric input state
 * - useNoKeyboardAttrs: Get attributes to block system keyboard
 */

// Components
export { default as NumericKeypad } from './NumericKeypad.vue'
export { default as NumericInputField } from './NumericInputField.vue'

// Re-export composables for convenience
export { useTabletMode, useNoKeyboardAttrs } from '@/composables/useTabletMode'
export {
  useNumericInput,
  useMultiNumericInput,
  blockSystemKeyboard,
  useKeyboardBlockProps
} from '@/composables/useNumericInput'

// Types
export type { NumericInputOptions, NumericInputField } from '@/composables/useNumericInput'
