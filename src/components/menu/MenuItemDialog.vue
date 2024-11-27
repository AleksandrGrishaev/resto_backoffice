<template>
  <base-dialog
    v-model="dialogModel"
    :title="isEdit ? 'Редактировать блюдо' : 'Добавить блюдо'"
    :loading="loading"
    :disabled="!isFormValid"
    max-width="700"
    cancel-text="Отмена"
    confirm-text="Сохранить"
    @cancel="handleCancel"
    @confirm="handleSubmit"
  >
    <v-form ref="form" v-model="isValid">
      <!-- Категория -->
      <v-select
        v-model="formData.categoryId"
        :items="categories"
        item-title="name"
        item-value="id"
        label="Категория"
        :rules="[v => !!v || 'Обязательное поле']"
        hide-details="auto"
        class="mb-4"
      />

      <!-- Зона приготовления -->
      <div class="mb-4">
        <v-btn-toggle v-model="formData.type" mandatory rounded="lg" color="primary" class="w-100">
          <v-btn value="food" class="flex-grow-1">
            <v-icon icon="mdi-silverware-fork-knife" size="20" class="mr-2" />
            Кухня
          </v-btn>
          <v-btn value="beverage" class="flex-grow-1">
            <v-icon icon="mdi-coffee" size="20" class="mr-2" />
            Бар
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- Название -->
      <v-text-field
        v-model="formData.name"
        label="Название позиции"
        :rules="[v => !!v || 'Обязательное поле']"
        hide-details="auto"
        class="mb-4"
      />

      <!-- Статус -->
      <div class="mb-4">
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

      <!-- Варианты -->
      <div class="variants mb-4">
        <div class="variants-header d-flex align-center mb-2">
          <div class="text-subtitle-1">Варианты</div>
          <v-spacer />
          <v-btn density="comfortable" variant="text" @click="addVariant">
            <v-icon icon="mdi-plus" size="20" class="mr-2" />
            Добавить вариант
          </v-btn>
        </div>

        <div class="variants-list">
          <div
            v-for="(variant, index) in formData.variants"
            :key="variant.id"
            class="variant-item mb-3"
          >
            <!-- Заголовок варианта -->
            <div class="variant-item__header d-flex align-center mb-2">
              <div class="text-subtitle-2">Вариант {{ index + 1 }}</div>
              <v-spacer />
              <v-btn
                size="small"
                color="error"
                variant="text"
                :disabled="formData.variants.length === 1"
                @click="removeVariant(index)"
              >
                <v-icon icon="mdi-delete" size="20" />
              </v-btn>
            </div>

            <!-- Поля варианта -->
            <div class="variant-item__fields">
              <div class="d-flex gap-2">
                <v-text-field
                  v-model="variant.name"
                  label="Название варианта"
                  hide-details="auto"
                  placeholder="Оставьте пустым если не требуется"
                  class="flex-grow-1"
                  bg-color="surface"
                />
                <v-text-field
                  v-model.number="variant.price"
                  type="number"
                  label="Цена"
                  hide-details="auto"
                  suffix="₽"
                  :rules="[v => v > 0 || 'Цена должна быть больше 0']"
                  required
                  style="width: 150px"
                  bg-color="surface"
                />
              </div>

              <!-- Предпросмотр -->
              <div class="variant-preview mt-2">
                <div class="variant-preview__label text-caption text-medium-emphasis mb-1">
                  Предпросмотр:
                </div>
                <div class="variant-preview__content d-flex justify-space-between align-center">
                  <div class="text-body-2">
                    {{ getFullItemName(formData.name, variant.name) }}
                  </div>
                  <div class="variant-preview__price">{{ variant.price }}₽</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMenuStore } from '@/stores/menu.store'
import type { MenuItem, MenuItemVariant } from '@/types/menu'
import { DebugUtils } from '@/utils'
import BaseDialog from '@/components/base/BaseDialog.vue'

const MODULE_NAME = 'MenuItemDialog'

// Props & Emits
interface Props {
  modelValue: boolean
  item?: MenuItem | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  item: null
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

// Создаем дефолтный вариант
function createDefaultVariant(): MenuItemVariant {
  return {
    id: crypto.randomUUID(),
    name: '',
    price: 0,
    isActive: true,
    sortOrder: 0
  }
}

const formData = ref({
  categoryId: '',
  name: '',
  type: 'food' as 'food' | 'beverage',
  isActive: true,
  sortOrder: 0,
  variants: [createDefaultVariant()]
})

// Computed
const isEdit = computed(() => !!props.item)
const categories = computed(() => menuStore.state.categories.filter(c => c.isActive))

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const isFormValid = computed(() => {
  return (
    isValid.value &&
    formData.value.variants.length > 0 &&
    formData.value.variants.every(v => v.price > 0)
  )
})

// Methods
function getFullItemName(itemName: string, variantName: string): string {
  return variantName ? `${itemName} (${variantName})` : itemName
}

function addVariant() {
  formData.value.variants.push({
    ...createDefaultVariant(),
    sortOrder: formData.value.variants.length
  })
}

function removeVariant(index: number) {
  if (formData.value.variants.length > 1) {
    formData.value.variants.splice(index, 1)
  }
}

function resetForm() {
  if (form.value) {
    form.value.reset()
  }
  formData.value = {
    categoryId: '',
    name: '',
    type: 'food',
    isActive: true,
    sortOrder: 0,
    variants: [createDefaultVariant()]
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

    const categoryItems = menuStore.state.menuItems.filter(
      item => item.categoryId === formData.value.categoryId
    )

    const nextSortOrder =
      categoryItems.length > 0 ? Math.max(...categoryItems.map(item => item.sortOrder || 0)) + 1 : 0

    // Обработка вариантов перед сохранением
    const processedVariants = formData.value.variants.map((variant, index) => ({
      id: variant.id,
      name: variant.name || '', // Здесь можно добавить дополнительную обработку если нужно
      price: variant.price,
      isActive: true,
      sortOrder: index
    }))

    const itemData = {
      ...formData.value,
      sortOrder: isEdit.value ? formData.value.sortOrder : nextSortOrder,
      variants: processedVariants
    }

    DebugUtils.debug(MODULE_NAME, 'Saving menu item', itemData) // Добавим для отладки

    if (isEdit.value && props.item) {
      await menuStore.updateMenuItem(props.item.id, itemData)
    } else {
      await menuStore.addMenuItem(itemData)
    }

    emit('saved')
    dialogModel.value = false
    if (!isEdit.value) {
      resetForm()
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to save item', error)
  } finally {
    loading.value = false
  }
}

// Watch
watch(
  () => props.item,
  newItem => {
    if (newItem) {
      formData.value = {
        categoryId: newItem.categoryId,
        name: newItem.name,
        type: newItem.type,
        isActive: newItem.isActive,
        sortOrder: newItem.sortOrder,
        variants: [...newItem.variants]
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.variant-item {
  background: var(--color-background);
  border-radius: 8px;
  padding: 16px;

  &__header {
    padding: 0 4px;
  }
}

.variant-preview {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 8px 16px;

  &__price {
    font-weight: 500;
    color: var(--color-primary);
    padding: 4px 8px;
    background: var(--color-background);
    border-radius: 4px;
    min-width: 80px;
    text-align: right;
  }
}

.variants-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.gap-2 {
  gap: 8px;
}

:deep(.v-btn-toggle) {
  border: 1px solid var(--color-surface);
  border-radius: 8px;
}
</style>
