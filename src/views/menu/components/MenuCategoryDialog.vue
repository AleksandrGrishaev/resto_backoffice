// src/views/menu/components/MenuCategoryDialog.vue
<template>
  <base-dialog
    v-model="dialogModel"
    :title="isEdit ? 'Edit Category' : 'Add Category'"
    :loading="loading"
    :disabled="!isFormValid"
    cancel-text="Cancel"
    confirm-text="Save"
    @cancel="handleCancel"
    @confirm="handleSubmit"
  >
    <template #default>
      <v-form ref="form" v-model="isValid" @submit.prevent="handleSubmit">
        <v-text-field
          v-model="formData.name"
          label="Name"
          :rules="[v => !!v || 'Required field']"
          required
          class="mb-4"
          hide-details="auto"
        />

        <v-text-field
          v-model="formData.description"
          label="Description"
          hide-details="auto"
          class="mb-4"
        />

        <!-- Parent Category Selector -->
        <v-select
          v-model="formData.parentId"
          :items="availableParentCategories"
          item-title="name"
          item-value="id"
          label="Parent Category (optional)"
          clearable
          hide-details="auto"
          class="mb-4"
          :disabled="categoryHasSubcategories"
          :hint="
            categoryHasSubcategories
              ? 'Categories with subcategories cannot become subcategories'
              : 'Leave empty for root category'
          "
          persistent-hint
        >
          <template #prepend-inner>
            <v-icon size="18" color="grey">mdi-folder-outline</v-icon>
          </template>
        </v-select>

        <div v-if="isEdit" class="mb-4">
          <v-btn-toggle
            v-model="formData.isActive"
            mandatory
            rounded="lg"
            color="primary"
            class="w-100"
          >
            <v-btn :value="true" class="flex-grow-1">Active</v-btn>
            <v-btn :value="false" class="flex-grow-1">Inactive</v-btn>
          </v-btn-toggle>
        </div>
      </v-form>
    </template>
  </base-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMenuStore } from '@/stores/menu'
import type { Category, CreateCategoryDto } from '@/types/menu'
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

// Store & State
const menuStore = useMenuStore()
const form = ref()
const loading = ref(false)
const isValid = ref(false)

const formData = ref({
  name: '',
  description: '',
  isActive: true,
  sortOrder: 0,
  parentId: null as string | null
})

// Computed
const isEdit = computed(() => !!props.category)

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const isFormValid = computed(() => {
  return isValid.value && formData.value.name.trim().length > 0
})

// Available parent categories (only root categories, excluding self)
const availableParentCategories = computed(() => {
  return menuStore.rootCategories.filter(c => {
    // Cannot be its own parent
    if (props.category && c.id === props.category.id) return false
    return true
  })
})

// Check if current category has subcategories (can't become subcategory itself)
const categoryHasSubcategories = computed(() => {
  if (!props.category) return false
  return menuStore.hasSubcategories(props.category.id)
})

// Methods
function getNextSortOrder(): number {
  if (!menuStore.categories.length) return 0
  const maxOrder = Math.max(...menuStore.categories.map(c => c.sortOrder))
  return maxOrder + 1
}

function resetForm() {
  if (form.value) {
    form.value.reset()
  }
  formData.value = {
    name: '',
    description: '',
    isActive: true,
    sortOrder: getNextSortOrder(),
    parentId: null
  }
}

function handleCancel() {
  resetForm()
  dialogModel.value = false
}

async function handleSubmit() {
  if (!isFormValid.value) return

  try {
    loading.value = true

    const categoryData: CreateCategoryDto = {
      name: formData.value.name.trim(),
      description: formData.value.description?.trim(),
      isActive: formData.value.isActive,
      sortOrder: formData.value.sortOrder,
      parentId: formData.value.parentId
    }

    if (isEdit.value && props.category) {
      await menuStore.updateCategory(props.category.id, categoryData)
    } else {
      await menuStore.addCategory(categoryData)
    }

    emit('saved')
    dialogModel.value = false
    if (!isEdit.value) {
      resetForm()
    }
  } catch (error) {
    console.error('Failed to save category:', error)
  } finally {
    loading.value = false
  }
}

// Watch for category changes
watch(
  () => props.category,
  newCategory => {
    if (newCategory) {
      formData.value = {
        name: newCategory.name,
        description: newCategory.description || '',
        isActive: newCategory.isActive,
        sortOrder: newCategory.sortOrder,
        parentId: newCategory.parentId || null
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// Watch dialog state
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen && !props.category) {
      resetForm()
    }
  }
)
</script>

<style lang="scss" scoped>
:deep(.v-btn-toggle) {
  border: 1px solid var(--color-surface);
  border-radius: 8px;
}
</style>
