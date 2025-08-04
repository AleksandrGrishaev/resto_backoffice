// src/views/menu/components/MenuItemDialog.vue
<template>
  <base-dialog
    v-model="dialogModel"
    :title="isEdit ? 'Редактировать блюдо' : 'Добавить блюдо'"
    :loading="loading"
    :disabled="!isFormValid"
    max-width="900"
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

      <!-- Описание -->
      <v-text-field
        v-model="formData.description"
        label="Описание"
        hide-details="auto"
        class="mb-4"
      />

      <!-- Статус -->
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

      <!-- Источник блюда (опционально) -->
      <div class="mb-4">
        <div class="text-subtitle-1 mb-2">Источник блюда (опционально)</div>
        <v-select
          v-model="formData.source"
          :items="sourceOptions"
          item-title="displayName"
          item-value="source"
          label="Выберите источник"
          return-object
          clearable
          hide-details="auto"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
              <template #prepend>
                <v-icon :icon="getSourceIcon(item.raw.source.type)" />
              </template>
              <template #title>
                {{ item.raw.displayName }}
              </template>
              <template #subtitle>
                {{ getSourceLabel(item.raw.source.type) }}
              </template>
            </v-list-item>
          </template>
          <template #selection="{ item }">
            <v-chip color="primary" variant="outlined" size="small">
              <v-icon :icon="getSourceIcon(item.raw.source.type)" size="14" class="mr-1" />
              {{ item.raw.displayName }}
            </v-chip>
          </template>
        </v-select>
        <v-alert v-if="!formData.source" type="info" variant="tonal" density="compact" class="mt-2">
          Если источник не выбран, можно настроить композицию для каждого варианта
        </v-alert>
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

            <!-- Основные поля варианта -->
            <div class="variant-item__fields">
              <div class="d-flex gap-2 mb-3">
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
                  suffix="IDR"
                  :rules="[v => v > 0 || 'Цена должна быть больше 0']"
                  required
                  style="width: 150px"
                  bg-color="surface"
                />
              </div>

              <!-- Источник варианта (если нет общего источника) -->
              <div v-if="!formData.source" class="mb-3">
                <v-select
                  v-model="variant.source"
                  :items="sourceOptions"
                  item-title="displayName"
                  item-value="source"
                  label="Источник варианта"
                  return-object
                  clearable
                  hide-details="auto"
                  bg-color="surface"
                >
                  <template #selection="{ item }">
                    <v-chip color="secondary" variant="outlined" size="small">
                      <v-icon :icon="getSourceIcon(item.raw.source.type)" size="14" class="mr-1" />
                      {{ item.raw.displayName }}
                    </v-chip>
                  </template>
                </v-select>
              </div>

              <!-- Множитель порции (для простых рецептов) -->
              <div
                v-if="formData.source?.type === 'recipe' || variant.source?.type === 'recipe'"
                class="mb-3"
              >
                <v-text-field
                  v-model.number="variant.portionMultiplier"
                  type="number"
                  label="Множитель порции"
                  hide-details="auto"
                  step="0.1"
                  min="0.1"
                  placeholder="1.0"
                  bg-color="surface"
                />
              </div>

              <!-- Композиция (если нет источника ни у блюда, ни у варианта) -->
              <div v-if="!formData.source && !variant.source" class="composition-section">
                <div class="d-flex align-center mb-2">
                  <div class="text-subtitle-2">Композиция</div>
                  <v-spacer />
                  <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    @click="addComposition(variant)"
                  >
                    <v-icon icon="mdi-plus" size="16" class="mr-1" />
                    Компонент
                  </v-btn>
                </div>

                <div
                  v-if="!variant.composition || variant.composition.length === 0"
                  class="text-caption text-medium-emphasis mb-2"
                >
                  Добавьте компоненты для создания композитного блюда
                </div>

                <div
                  v-for="(component, compIndex) in variant.composition"
                  :key="compIndex"
                  class="composition-item mb-2"
                >
                  <div class="d-flex gap-2 align-center">
                    <!-- Источник компонента -->
                    <v-select
                      v-model="component.sourceRef"
                      :items="compositionSourceOptions"
                      item-title="displayName"
                      item-value="source"
                      label="Компонент"
                      return-object
                      hide-details="auto"
                      bg-color="background"
                      style="min-width: 200px"
                      @update:model-value="updateComponentFromSource(component, $event)"
                    >
                      <template #selection="{ item }">
                        <v-chip color="info" variant="outlined" size="small">
                          <v-icon
                            :icon="getSourceIcon(item.raw.source.type)"
                            size="12"
                            class="mr-1"
                          />
                          {{ item.raw.displayName }}
                        </v-chip>
                      </template>
                    </v-select>

                    <!-- Количество -->
                    <v-text-field
                      v-model.number="component.quantity"
                      type="number"
                      label="Кол-во"
                      hide-details="auto"
                      bg-color="background"
                      style="width: 100px"
                    />

                    <!-- Единицы -->
                    <v-select
                      v-model="component.unit"
                      :items="unitOptions"
                      label="Ед."
                      hide-details="auto"
                      bg-color="background"
                      style="width: 100px"
                    />

                    <!-- Роль -->
                    <v-select
                      v-model="component.role"
                      :items="roleOptions"
                      label="Роль"
                      hide-details="auto"
                      bg-color="background"
                      style="width: 120px"
                    />

                    <!-- Удалить -->
                    <v-btn
                      size="small"
                      color="error"
                      variant="text"
                      icon
                      @click="removeComposition(variant, compIndex)"
                    >
                      <v-icon icon="mdi-delete" size="16" />
                    </v-btn>
                  </div>
                </div>
              </div>

              <!-- Предпросмотр -->
              <div class="variant-preview mt-3">
                <div class="variant-preview__label text-caption text-medium-emphasis mb-1">
                  Предпросмотр:
                </div>
                <div class="variant-preview__content d-flex justify-space-between align-center">
                  <div class="text-body-2">
                    {{ getFullItemName(formData.name, variant.name) }}
                  </div>
                  <div class="variant-preview__price">{{ formatPrice(variant.price) }}</div>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import type {
  MenuItem,
  CreateMenuItemDto,
  MenuItemVariant,
  MenuItemSource,
  MenuComposition,
  SourceOption
} from '@/types/menu'
import type { MeasurementUnit } from '@/types/recipes'
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

// Stores
const menuStore = useMenuStore()
const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

// State
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

// Создаем дефолтный компонент композиции
function createDefaultComposition(): MenuComposition & { sourceRef?: SourceOption } {
  return {
    type: 'product',
    id: '',
    quantity: 0,
    unit: 'gram',
    role: 'main'
  }
}

const formData = ref({
  categoryId: '',
  name: '',
  description: '',
  type: 'food' as 'food' | 'beverage',
  isActive: true,
  sortOrder: 0,
  source: null as SourceOption | null,
  variants: [createDefaultVariant()]
})

// Computed
const isEdit = computed(() => !!props.item)
const categories = computed(() => menuStore.activeCategories)

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Опции для выбора источников (продукты + рецепты)
const sourceOptions = computed((): SourceOption[] => {
  const options: SourceOption[] = []

  // Продукты
  productsStore.activeProducts.forEach(product => {
    options.push({
      id: product.id,
      name: product.name,
      type: 'product',
      category: product.category,
      unit: product.unit,
      costPerUnit: product.costPerUnit,
      displayName: `${product.name} (${product.category})`,
      source: { type: 'product', id: product.id }
    })
  })

  // Рецепты
  recipesStore.activeRecipes.forEach(recipe => {
    options.push({
      id: recipe.id,
      name: recipe.name,
      type: 'recipe',
      category: recipe.type,
      unit: recipe.outputUnit,
      outputQuantity: recipe.outputQuantity,
      displayName: `${recipe.name} (${recipe.type})`,
      source: { type: 'recipe', id: recipe.id }
    })
  })

  return options.sort((a, b) => a.displayName.localeCompare(b.displayName))
})

// Опции для композиции (продукты + рецепты + полуфабрикаты)
const compositionSourceOptions = computed((): SourceOption[] => {
  const options: SourceOption[] = [...sourceOptions.value]

  // Полуфабрикаты
  recipesStore.activePreparations.forEach(prep => {
    options.push({
      id: prep.id,
      name: prep.name,
      type: 'preparation',
      category: prep.type,
      unit: prep.outputUnit,
      outputQuantity: prep.outputQuantity,
      displayName: `${prep.name} (${prep.type})`,
      source: { type: 'preparation', id: prep.id }
    })
  })

  return options.sort((a, b) => a.displayName.localeCompare(b.displayName))
})

// Опции для единиц измерения
const unitOptions = computed(() => [
  { title: 'Граммы', value: 'gram' },
  { title: 'Миллилитры', value: 'ml' },
  { title: 'Штуки', value: 'piece' },
  { title: 'Литры', value: 'liter' },
  { title: 'Килограммы', value: 'kg' }
])

// Опции для ролей компонентов
const roleOptions = computed(() => [
  { title: 'Основное', value: 'main' },
  { title: 'Гарнир', value: 'garnish' },
  { title: 'Соус', value: 'sauce' }
])

const isFormValid = computed(() => {
  return (
    isValid.value &&
    formData.value.name.trim().length > 0 &&
    formData.value.categoryId &&
    formData.value.variants.length > 0 &&
    formData.value.variants.every(v => v.price > 0)
  )
})

// Methods
function getFullItemName(itemName: string, variantName: string): string {
  return variantName ? `${itemName} (${variantName})` : itemName
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

function getSourceIcon(type: string): string {
  switch (type) {
    case 'product':
      return 'mdi-package-variant'
    case 'recipe':
      return 'mdi-chef-hat'
    case 'preparation':
      return 'mdi-food-variant'
    default:
      return 'mdi-help-circle'
  }
}

function getSourceLabel(type: string): string {
  switch (type) {
    case 'product':
      return 'Продукт'
    case 'recipe':
      return 'Рецепт'
    case 'preparation':
      return 'Полуфабрикат'
    default:
      return 'Неизвестно'
  }
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

function addComposition(variant: MenuItemVariant) {
  if (!variant.composition) {
    variant.composition = []
  }
  variant.composition.push(createDefaultComposition())
}

function removeComposition(variant: MenuItemVariant, index: number) {
  if (variant.composition) {
    variant.composition.splice(index, 1)
  }
}

function updateComponentFromSource(
  component: MenuComposition & { sourceRef?: SourceOption },
  sourceOption: SourceOption | null
) {
  if (sourceOption) {
    component.type = sourceOption.source.type as any
    component.id = sourceOption.source.id
    component.sourceRef = sourceOption
  } else {
    component.type = 'product'
    component.id = ''
    component.sourceRef = undefined
  }
}

function getNextSortOrder(categoryId: string): number {
  const categoryItems = menuStore.getItemsByCategory(categoryId)
  if (categoryItems.length === 0) return 0
  return Math.max(...categoryItems.map(item => item.sortOrder || 0)) + 1
}

function resetForm() {
  if (form.value) {
    form.value.reset()
  }
  formData.value = {
    categoryId: '',
    name: '',
    description: '',
    type: 'food',
    isActive: true,
    sortOrder: 0,
    source: null,
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

    // Обработка вариантов перед сохранением
    const processedVariants = formData.value.variants.map((variant, index) => {
      const processedVariant: any = {
        id: variant.id,
        name: variant.name?.trim() || '',
        price: variant.price,
        isActive: true,
        sortOrder: index
      }

      // Добавляем источник варианта если есть
      if (variant.source) {
        processedVariant.source = variant.source.source
      }

      // Добавляем множитель порции если есть
      if (variant.portionMultiplier && variant.portionMultiplier !== 1) {
        processedVariant.portionMultiplier = variant.portionMultiplier
      }

      // Добавляем композицию если есть
      if (variant.composition && variant.composition.length > 0) {
        processedVariant.composition = variant.composition.map(comp => ({
          type: comp.type,
          id: comp.id,
          quantity: comp.quantity,
          unit: comp.unit,
          role: comp.role,
          notes: comp.notes
        }))
      }

      return processedVariant
    })

    const itemData: CreateMenuItemDto = {
      categoryId: formData.value.categoryId,
      name: formData.value.name.trim(),
      description: formData.value.description?.trim(),
      type: formData.value.type,
      source: formData.value.source?.source,
      variants: processedVariants.map(v => ({
        name: v.name,
        price: v.price,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
        portionMultiplier: v.portionMultiplier,
        source: v.source,
        composition: v.composition
      }))
    }

    if (isEdit.value && props.item) {
      await menuStore.updateMenuItem(props.item.id, {
        ...itemData,
        isActive: formData.value.isActive,
        sortOrder: formData.value.sortOrder,
        variants: processedVariants
      })
    } else {
      await menuStore.addMenuItem({
        ...itemData,
        sortOrder: getNextSortOrder(formData.value.categoryId)
      })
    }

    emit('saved')
    dialogModel.value = false
    if (!isEdit.value) {
      resetForm()
    }
  } catch (error) {
    console.error('Failed to save menu item:', error)
  } finally {
    loading.value = false
  }
}

// Watch for item changes
watch(
  () => props.item,
  newItem => {
    if (newItem) {
      // Находим источник в опциях
      const sourceOption = newItem.source
        ? sourceOptions.value.find(
            opt => opt.source.type === newItem.source!.type && opt.source.id === newItem.source!.id
          )
        : null

      formData.value = {
        categoryId: newItem.categoryId,
        name: newItem.name,
        description: newItem.description || '',
        type: newItem.type,
        isActive: newItem.isActive,
        sortOrder: newItem.sortOrder,
        source: sourceOption || null,
        variants: newItem.variants.map(variant => {
          const variantSourceOption = variant.source
            ? sourceOptions.value.find(
                opt =>
                  opt.source.type === variant.source!.type && opt.source.id === variant.source!.id
              )
            : null

          const processedVariant: any = {
            ...variant,
            source: variantSourceOption || null
          }

          // Обрабатываем композицию
          if (variant.composition) {
            processedVariant.composition = variant.composition.map(comp => {
              const compSourceOption = compositionSourceOptions.value.find(
                opt => opt.source.type === comp.type && opt.source.id === comp.id
              )

              return {
                ...comp,
                sourceRef: compSourceOption
              }
            })
          }

          return processedVariant
        })
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
    if (isOpen && !props.item) {
      resetForm()
    }
  }
)

// Initialize stores
onMounted(async () => {
  await Promise.all([productsStore.loadProducts(), recipesStore.initialize()])
})
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

.composition-section {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--color-border);
}

.composition-item {
  background: var(--color-background);
  border-radius: 6px;
  padding: 8px;
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
    min-width: 120px;
    text-align: right;
  }
}

.variants-list {
  max-height: 600px;
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
