<!-- src/views/catalog/categories/TransactionCategoryDialog.vue -->
<template>
  <base-dialog
    :model-value="modelValue"
    :title="category ? 'Edit Category' : 'New Category'"
    :loading="loading"
    :disabled="!isFormValid"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="handleSubmit"
    @cancel="handleCancel"
  >
    <v-form ref="form" v-model="formState.isValid" @submit.prevent>
      <v-text-field
        v-model="formData.code"
        label="Code"
        :rules="[
          v => !!v || 'Required field',
          v =>
            /^[a-z][a-z0-9_]*$/.test(v) ||
            'Only lowercase letters, numbers, and underscores (start with letter)'
        ]"
        :disabled="!!category"
        hint="Unique identifier (snake_case, e.g. office_supplies)"
        persistent-hint
        required
        class="mb-4"
      />

      <v-text-field
        v-model="formData.name"
        label="Name"
        :rules="[v => !!v || 'Required field']"
        hint="Display name for this category"
        persistent-hint
        required
        class="mb-4"
      />

      <v-select
        v-model="formData.type"
        label="Type"
        :items="categoryTypes"
        :rules="[v => !!v || 'Required field']"
        :disabled="!!category"
        hint="Expense or Income category"
        persistent-hint
        required
        class="mb-4"
      />

      <v-checkbox
        v-if="formData.type === 'expense'"
        v-model="formData.isOpex"
        label="Operating Expense (OPEX)"
        color="warning"
        hint="Include in OPEX section of P&L report"
        persistent-hint
        class="mb-4"
      />

      <v-textarea
        v-model="formData.description"
        label="Description"
        rows="2"
        hint="Optional description"
        persistent-hint
        class="mb-4"
      />

      <v-switch
        v-model="formData.isActive"
        label="Active"
        color="primary"
        hint="Inactive categories won't appear in dropdowns"
        persistent-hint
      />
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { useAccountStore } from '@/stores/account'
import type { TransactionCategory, CategoryType } from '@/stores/account/types'
import { useDialogForm } from '@/composables/useDialogForm'

const MODULE_NAME = 'TransactionCategoryDialog'

const categoryTypes = [
  { title: 'Expense', value: 'expense' },
  { title: 'Income', value: 'income' }
] as const

const props = defineProps<{
  modelValue: boolean
  category?: TransactionCategory | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: [TransactionCategory]
}>()

const accountStore = useAccountStore()

function getDefaultData() {
  return {
    code: '',
    name: '',
    type: 'expense' as CategoryType,
    isOpex: true,
    isActive: true,
    description: ''
  }
}

const { form, loading, formState, formData, isFormValid, handleSubmit, handleCancel } =
  useDialogForm({
    moduleName: MODULE_NAME,
    initialData: getDefaultData(),
    onSubmit: async data => {
      try {
        if (props.category) {
          // Update existing
          await accountStore.updateCategory(props.category.id, {
            name: data.name,
            isOpex: data.type === 'expense' ? data.isOpex : false,
            isActive: data.isActive,
            description: data.description || undefined
          })
        } else {
          // Create new
          await accountStore.createCategory({
            code: data.code,
            name: data.name,
            type: data.type,
            isOpex: data.type === 'expense' ? data.isOpex : false,
            description: data.description || undefined
          })
        }
        emit('saved', data as unknown as TransactionCategory)
        emit('update:modelValue', false)
      } catch (error) {
        console.error(MODULE_NAME, 'Failed to save category', error)
      }
    }
  })

// Watch for dialog open with category data - populate form
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      if (props.category) {
        // Editing existing - populate form
        formData.value = {
          code: props.category.code,
          name: props.category.name,
          type: props.category.type,
          isOpex: props.category.isOpex,
          isActive: props.category.isActive,
          description: props.category.description || ''
        }
      } else {
        // Creating new - reset to defaults
        formData.value = getDefaultData()
      }
    }
  },
  { immediate: true }
)
</script>
