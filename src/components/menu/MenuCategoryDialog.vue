<template>
  <v-dialog v-model="dialogModel" max-width="500px">
    <v-card>
      <v-card-title class="text-h5 pa-4">
        {{ isEdit ? 'Редактировать категорию' : 'Добавить категорию' }}
      </v-card-title>

      <v-card-text class="pa-4">
        <v-form ref="form" v-model="isValid" @submit.prevent="handleSubmit">
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
      </v-card-text>

      <v-card-actions class="pa-4">
        <div class="d-flex w-100 gap-2">
          <v-btn variant="outlined" width="100%" :disabled="loading" @click="dialogModel = false">
            Отмена
          </v-btn>

          <v-btn
            color="primary"
            width="100%"
            :loading="loading"
            :disabled="!isValid"
            @click="handleSubmit"
          >
            Сохранить
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMenuStore } from '@/stores/menu.store'
import type { Category } from '@/types/menu'
import { DebugUtils } from '@/utils'

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
  isActive: true,
  sortOrder: 0
})

// Computed
const isEdit = computed(() => !!props.category)

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Methods
async function handleSubmit() {
  if (!isValid.value) return

  try {
    loading.value = true
    DebugUtils.debug(MODULE_NAME, 'Submitting category', formData.value)

    if (isEdit.value && props.category) {
      await menuStore.updateCategory(props.category.id, formData.value)
    } else {
      await menuStore.addCategory(formData.value)
    }

    emit('saved')
    dialogModel.value = false
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to save category', error)
  } finally {
    loading.value = false
  }
}

function resetForm() {
  if (form.value) {
    form.value.reset()
  }
  formData.value = {
    name: '',
    isActive: true,
    sortOrder: getNextSortOrder()
  }
}

function getNextSortOrder(): number {
  if (!menuStore.state.categories.length) return 0
  return Math.max(...menuStore.state.categories.map(c => c.sortOrder || 0)) + 1
}

// Watch
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

.gap-2 {
  gap: 8px;
}
</style>
