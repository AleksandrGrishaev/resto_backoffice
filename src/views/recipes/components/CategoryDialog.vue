<!-- src/views/recipes/components/CategoryDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="dialog-title d-flex align-center ga-2">
        <span class="title-emoji">{{ formData.emoji || '📁' }}</span>
        {{ isEdit ? 'Edit Category' : 'New Category' }}
      </v-card-title>

      <v-card-text class="pt-4 pb-2">
        <v-form ref="formRef" v-model="isFormValid" @submit.prevent="save">
          <!-- Icon (emoji) + Name row -->
          <div class="d-flex align-center gap-3 mb-4">
            <EmojiPicker v-model="formData.emoji" placeholder="📁" />
            <v-text-field
              v-model="formData.name"
              label="Category Name"
              :rules="[rules.required]"
              variant="outlined"
              density="comfortable"
              autofocus
              hide-details="auto"
              class="flex-grow-1"
            />
          </div>

          <!-- Description -->
          <v-textarea
            v-model="formData.description"
            label="Description"
            variant="outlined"
            density="comfortable"
            rows="2"
            hide-details
            class="mb-4"
          />

          <!-- Color -->
          <div class="section-label mb-2">Color</div>
          <div class="color-grid mb-2">
            <button
              v-for="color in colorOptions"
              :key="color"
              type="button"
              class="color-btn"
              :class="{ 'color-btn--active': formData.color === color }"
              @click="formData.color = color"
            >
              <v-icon :color="color" size="20">mdi-circle</v-icon>
            </button>
          </div>
        </v-form>
      </v-card-text>

      <v-card-actions class="px-4 pb-3">
        <v-switch
          v-if="isEdit"
          v-model="formData.isActive"
          label="Active"
          color="primary"
          density="compact"
          hide-details
        />
        <v-spacer />
        <v-btn variant="text" @click="cancel">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!isFormValid"
          :loading="saving"
          @click="save"
        >
          {{ isEdit ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import EmojiPicker from '@/components/base/EmojiPicker.vue'
import type { PreparationCategory, RecipeCategory } from '@/stores/recipes/types'

const props = defineProps<{
  modelValue: boolean
  type: 'preparation' | 'recipe'
  category?: PreparationCategory | RecipeCategory | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [data: CategoryFormData]
}>()

interface CategoryFormData {
  name: string
  key: string
  description?: string
  icon?: string
  emoji?: string
  color?: string
  sortOrder: number
  isActive: boolean
}

const formRef = ref<any>(null)
const isFormValid = ref(false)
const saving = ref(false)

const formData = ref<CategoryFormData>({
  name: '',
  key: '',
  description: '',
  icon: '',
  emoji: '',
  color: 'primary',
  sortOrder: 0,
  isActive: true
})

const isEdit = computed(() => !!props.category)

const colorOptions = [
  'primary',
  'secondary',
  'success',
  'error',
  'warning',
  'info',
  'purple',
  'pink',
  'indigo',
  'cyan',
  'teal',
  'green',
  'orange',
  'brown',
  'grey'
]

const rules = {
  required: (value: string) => !!value?.trim() || 'Required'
}

// Auto-generate key from name
watch(
  () => formData.value.name,
  newName => {
    if (!isEdit.value && newName) {
      formData.value.key = newName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
    }
  }
)

// Load category data when dialog opens
watch(
  () => [props.modelValue, props.category],
  ([isOpen, category]) => {
    if (isOpen) {
      if (category) {
        const emoji = ('emoji' in category ? category.emoji : '') || category.icon || ''
        formData.value = {
          name: category.name,
          key: category.key,
          description: category.description || '',
          icon: emoji,
          emoji,
          color: category.color || 'primary',
          sortOrder: category.sortOrder || 0,
          isActive: category.isActive ?? true
        }
      } else {
        formData.value = {
          name: '',
          key: '',
          description: '',
          icon: '',
          emoji: '',
          color: 'primary',
          sortOrder: 0,
          isActive: true
        }
      }
    }
  },
  { immediate: true }
)

function cancel() {
  emit('update:modelValue', false)
}

async function save() {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    // Set icon = emoji for backwards compat
    const data = { ...formData.value, icon: formData.value.emoji }
    emit('save', data)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.dialog-title {
  padding: 16px 20px 8px;
  font-size: 1.1rem;
}

.title-emoji {
  font-size: 1.3rem;
  line-height: 1;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.45);
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.color-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  background: none;
  transition: all 0.1s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  &--active {
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
}
</style>
