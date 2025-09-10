import { ref, computed, Ref, ComputedRef, UnwrapRef } from 'vue'
import { DebugUtils } from '@/utils'

export interface UseDialogFormOptions<T> {
  moduleName: string
  initialData: T
  validateForm?: (data: T) => boolean | string
  onSubmit: (data: T) => Promise<void>
}

interface FormState {
  isValid: boolean
  isDirty: boolean
  error: string
}

export interface UseDialogFormReturn<T> {
  form: Ref<any>
  loading: Ref<boolean>
  formData: Ref<UnwrapRef<T>>
  formState: Ref<FormState>
  isFormValid: ComputedRef<boolean>
  resetForm: () => void
  handleSubmit: () => Promise<boolean>
  handleCancel: () => void
  updateFormState: (isValid: boolean) => void
}

export function useDialogForm<T extends object>(
  options: UseDialogFormOptions<T>
): UseDialogFormReturn<T> {
  const { moduleName, initialData, onSubmit, validateForm } = options

  const form = ref<any>()
  const loading = ref(false)
  const formData = ref<T>({ ...initialData }) as Ref<UnwrapRef<T>>

  const formState = ref<FormState>({
    isValid: false,
    isDirty: false,
    error: ''
  })

  const isFormValid = computed(() => {
    return formState.value.isValid && !loading.value
  })

  function resetForm() {
    formData.value = { ...initialData } as UnwrapRef<T>
    formState.value = {
      isValid: false,
      isDirty: false,
      error: ''
    }
    if (form.value?.reset) {
      form.value.reset()
    }
  }

  async function handleSubmit() {
    try {
      if (validateForm) {
        const validationResult = validateForm(formData.value as T)
        if (typeof validationResult === 'string') {
          throw new Error(validationResult)
        }
        if (!validationResult) {
          throw new Error('Validation failed')
        }
      }

      loading.value = true
      formState.value.error = ''

      DebugUtils.debug(moduleName, 'Submitting form', formData.value)
      await onSubmit(formData.value as T)

      resetForm()
      return true
    } catch (error) {
      DebugUtils.error(moduleName, 'Form submission failed', error)
      if (error instanceof Error) {
        formState.value.error = error.message
      } else {
        formState.value.error = 'An unexpected error occurred'
      }
      throw error
    } finally {
      loading.value = false
    }
  }

  function handleCancel() {
    resetForm()
  }

  function updateFormState(isValid: boolean) {
    formState.value.isValid = isValid
    formState.value.isDirty = true
  }

  return {
    form,
    loading,
    formData,
    formState,
    isFormValid,
    resetForm,
    handleSubmit,
    handleCancel,
    updateFormState
  }
}
