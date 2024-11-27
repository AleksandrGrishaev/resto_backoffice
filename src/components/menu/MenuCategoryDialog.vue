<template>
  <base-dialog
    v-model="dialogModel"
    :title="isEdit ? 'Редактировать категорию' : 'Добавить категорию'"
    :loading="loading"
    :disabled="!isFormValid"
    cancel-text="Отмена"
    confirm-text="Сохранить"
    @cancel="handleCancel"
    @confirm="handleSubmit"
  >
    <template #default>
      <v-form ref="form" v-model="formState.isValid" @submit.prevent="handleSubmit">
        <v-text-field
          v-model="formData.name"
          label="Название"
          :rules="[v => !!v || 'Обязательное поле']"
          required
          class="mb-4"
          hide-details="auto"
        />

        <div v-if="isEdit" class="mb-4">
          <v-btn-toggle
            v-model="formData.isActive"
            mandatory
            rounded="lg"
            color="primary"
            class="w-100"
          >
            <v-btn :value="true" class="flex-grow-1">Активно</v-btn>
            <v-btn :value="false" class="flex-grow-1">Не активно</v-btn>
          </v-btn-toggle>
        </div>
      </v-form>
    </template>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useMenuStore } from '@/stores/menu.store'
import type { Category } from '@/types/menu'
import { useDialogForm } from '@/composables/useDialogForm'
import BaseDialog from '@/components/base/BaseDialog.vue'

const MODULE_NAME = 'MenuCategoryDialog'

// Props & Emits
interface Props {
  modelValue: boolean
  category?: Category | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  category: null
})

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: []
}>()

// Store
const menuStore = useMenuStore()
const isEdit = computed(() => !!props.category)

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Form handling
const { form, loading, formState, formData, isFormValid, handleSubmit, handleCancel, resetForm } =
  useDialogForm({
    moduleName: MODULE_NAME,
    initialData: {
      name: props.category?.name || '',
      isActive: props.category?.isActive ?? true,
      sortOrder: props.category?.sortOrder || getNextSortOrder()
    },
    async onSubmit(data) {
      if (isEdit.value && props.category) {
        await menuStore.updateCategory(props.category.id, data)
      } else {
        await menuStore.addCategory(data)
      }
      emit('saved')
      dialogModel.value = false
    }
  })

// Helpers
function getNextSortOrder(): number {
  if (!menuStore.state.categories.length) return 0
  const maxOrder = Math.max(...menuStore.state.categories.map(c => c.sortOrder))
  return maxOrder + 1
}

// Watch for category changes
watch(
  () => props.category,
  newCategory => {
    if (newCategory) {
      formData.value = {
        name: newCategory.name,
        isActive: newCategory.isActive,
        sortOrder: newCategory.sortOrder
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
:deep(.v-btn-toggle) {
  border: 1px solid var(--color-surface);
  border-radius: 8px;
}
</style>
