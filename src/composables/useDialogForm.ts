import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'

interface UseDialogFormOptions<T> {
  moduleName: string
  initialData: T
  onSubmit: (data: T) => Promise<void>
}

export function useDialogForm<T extends Record<string, unknown>>(options: UseDialogFormOptions<T>) {
  const { moduleName, initialData, onSubmit } = options

  // Refs
  const form = ref()
  const loading = ref(false)
  const formState = ref({
    isValid: false,
    isDirty: false
  })

  // Form data
  const formData = ref<T>({ ...initialData })

  // Computed
  const isFormValid = computed(() => {
    return formState.value.isValid && !loading.value
  })

  // Methods
  function resetForm() {
    if (form.value) {
      form.value.reset()
    }
    formData.value = { ...initialData }
    formState.value = {
      isValid: false,
      isDirty: false
    }
  }

  async function handleSubmit() {
    if (loading.value) return
    if (!isFormValid.value) return
    try {
      loading.value = true
      DebugUtils.debug(moduleName, 'Submitting form', formData.value)
      await onSubmit(formData.value)
    } catch (error) {
      DebugUtils.error(moduleName, 'Form submission failed', error)
      // Добавим отображение ошибки пользователю
      if (error instanceof Error) {
        // Можно использовать глобальный store для уведомлений или пробросить ошибку выше
        throw new Error(error.message)
      }
      throw error
    } finally {
      loading.value = false
    }
  }

  function handleCancel() {
    resetForm()
  }

  return {
    form,
    loading,
    formState,
    formData,
    isFormValid,
    resetForm,
    handleSubmit,
    handleCancel
  }
}
