// src/stores/navigation.store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'NavigationStore'

export const useNavigationStore = defineStore('navigation', () => {
  const showUnsavedDialog = ref(false)
  let resolvePromise: ((value: boolean) => void) | null = null

  const confirmNavigation = () => {
    DebugUtils.debug(MODULE_NAME, 'Confirming navigation')
    return new Promise<boolean>(resolve => {
      DebugUtils.debug(MODULE_NAME, 'Setting dialog visible')
      showUnsavedDialog.value = true
      resolvePromise = resolve
    })
  }

  const handleConfirm = () => {
    DebugUtils.debug(MODULE_NAME, 'Dialog confirmed')
    showUnsavedDialog.value = false
    if (resolvePromise) {
      resolvePromise(true)
      resolvePromise = null
    }
  }

  const handleCancel = () => {
    DebugUtils.debug(MODULE_NAME, 'Dialog cancelled')
    showUnsavedDialog.value = false
    if (resolvePromise) {
      resolvePromise(false)
      resolvePromise = null
    }
  }

  return {
    showUnsavedDialog,
    confirmNavigation,
    handleConfirm,
    handleCancel
  }
})
