// src/composables/useSnackbar.ts
// Global snackbar state for showing toast notifications

import { reactive } from 'vue'

const state = reactive({
  show: false,
  message: '',
  color: 'success' as string,
  timeout: 3000
})

export function useSnackbar() {
  function showSuccess(message: string) {
    state.message = message
    state.color = 'success'
    state.timeout = 3000
    state.show = true
  }

  function showError(message: string) {
    state.message = message
    state.color = 'error'
    state.timeout = 5000
    state.show = true
  }

  function showInfo(message: string) {
    state.message = message
    state.color = 'info'
    state.timeout = 3000
    state.show = true
  }

  return {
    state,
    showSuccess,
    showError,
    showInfo
  }
}
