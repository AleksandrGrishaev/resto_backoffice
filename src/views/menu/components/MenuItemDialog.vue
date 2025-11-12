<template>
  <base-dialog
    v-model="dialogModel"
    :title="isEdit ? 'Редактировать блюдо' : 'Добавить блюдо'"
    :loading="loading"
    :disabled="!isFormValid"
    max-width="1200"
    cancel-text="Отмена"
    confirm-text="Сохранить"
    @cancel="handleCancel"
    @confirm="handleSubmit"
  >
    <v-form ref="form" v-model="isValid">
      <!-- ✨ NEW: Вкладки -->
      <v-tabs v-model="currentTab" bg-color="transparent" class="mb-4">
        <v-tab value="basic">
          <v-icon icon="mdi-information-outline" size="20" class="mr-2" />
          Основное
        </v-tab>
        <v-tab value="variants">
          <v-icon icon="mdi-format-list-bulleted" size="20" class="mr-2" />
          Варианты
          <v-badge
            v-if="formData.variants.length > 0"
            :content="formData.variants.length"
            color="primary"
            inline
            class="ml-2"
          />
        </v-tab>
        <v-tab v-if="formData.dishType !== 'simple'" value="modifiers">
          <v-icon icon="mdi-puzzle-outline" size="20" class="mr-2" />
          Модификаторы
          <v-badge
            v-if="formData.modifierGroups && formData.modifierGroups.length > 0"
            :content="formData.modifierGroups.length"
            color="primary"
            inline
            class="ml-2"
          />
        </v-tab>
        <v-tab v-if="formData.dishType !== 'simple'" value="templates">
          <v-icon icon="mdi-content-copy" size="20" class="mr-2" />
          Шаблоны
          <v-badge
            v-if="formData.templates && formData.templates.length > 0"
            :content="formData.templates.length"
            color="primary"
            inline
            class="ml-2"
          />
        </v-tab>
      </v-tabs>

      <v-window v-model="currentTab">
        <!-- Вкладка "Основное" -->
        <v-window-item value="basic">
          <div class="tab-content">
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
              <v-btn-toggle
                v-model="formData.type"
                mandatory
                rounded="lg"
                color="primary"
                class="w-100"
              >
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

            <!-- ✨ Индикатор типа блюда -->
            <v-alert
              v-if="formData.dishType !== 'simple'"
              type="info"
              density="compact"
              variant="tonal"
              class="mb-4"
            >
              <div class="text-body-2">
                <strong>Тип блюда:</strong>
                <template v-if="formData.dishType === 'component-based'">
                  Составное блюдо (с заменяемыми компонентами)
                </template>
                <template v-else-if="formData.dishType === 'addon-based'">
                  Блюдо с дополнениями
                </template>
              </div>
            </v-alert>

            <!-- Название -->
            <v-text-field
              v-model="formData.name"
              label="Название позиции"
              :rules="[v => !!v || 'Обязательное поле']"
              hide-details="auto"
              class="mb-4"
            />

            <!-- Описание -->
            <v-textarea
              v-model="formData.description"
              label="Описание"
              rows="3"
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
          </div>
        </v-window-item>

        <!-- Вкладка "Варианты" -->
        <v-window-item value="variants">
          <div class="tab-content">
            <div class="variants-header d-flex align-center mb-4">
              <div class="text-subtitle-1">Варианты блюда</div>
              <v-spacer />
              <v-btn color="primary" variant="text" @click="addVariant">
                <v-icon icon="mdi-plus" size="20" class="mr-2" />
                Добавить вариант
              </v-btn>
            </div>

            <div class="variants-list">
              <menu-item-variant-component
                v-for="(variant, index) in formData.variants"
                :key="variant.id"
                :variant="variant"
                :index="index"
                :can-delete="formData.variants.length > 1"
                :item-name="formData.name"
                :dish-type="formData.dishType"
                :dish-options="dishOptions"
                :product-options="productOptions"
                :unit-options="unitOptions"
                :role-options="roleOptions"
                class="mb-3"
                @update:variant="updateVariant(index, $event)"
                @delete="removeVariant(index)"
              />
            </div>
          </div>
        </v-window-item>

        <!-- Вкладка "Модификаторы" -->
        <v-window-item value="modifiers">
          <div class="tab-content">
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
              <div class="text-body-2">
                Модификаторы применяются ко всем вариантам блюда.
                <template v-if="formData.dishType === 'component-based'">
                  Используйте groupStyle="component" для замены компонентов (гарнир, соус).
                </template>
                <template v-else-if="formData.dishType === 'addon-based'">
                  Используйте groupStyle="addon" для добавления опций (топпинги, сиропы).
                </template>
              </div>
            </v-alert>

            <modifiers-editor-widget
              :modifier-groups="formData.modifierGroups"
              :templates="formData.templates"
              :dish-type="formData.dishType"
              :dish-options="dishOptions"
              :product-options="productOptions"
              @update:modifier-groups="formData.modifierGroups = $event"
              @update:templates="formData.templates = $event"
            />
          </div>
        </v-window-item>

        <!-- Вкладка "Шаблоны" -->
        <v-window-item value="templates">
          <div class="tab-content">
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
              <div class="text-body-2">
                Шаблоны - это предустановленные комбинации модификаторов для быстрого выбора в POS.
              </div>
            </v-alert>

            <!-- TODO: Создать TemplatesEditorWidget -->
            <div class="text-center py-8 text-medium-emphasis">
              <v-icon icon="mdi-content-copy" size="48" />
              <div class="mt-2">Редактор шаблонов будет добавлен позже</div>
            </div>
          </div>
        </v-window-item>
      </v-window>
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import type { MenuItem, CreateMenuItemDto, MenuItemVariant, DishType } from '@/stores/menu'
import BaseDialog from '@/components/base/BaseDialog.vue'
import MenuItemVariantComponent from './MenuItemVariant.vue'
import ModifiersEditorWidget from '@/views/recipes/components/widgets/ModifiersEditorWidget.vue'
import { ENV } from '@/config/environment'

const MODULE_NAME = 'MenuItemDialog'

// Props & Emits
interface Props {
  modelValue: boolean
  item?: MenuItem | null
  dishType?: DishType | null // ✨ NEW: Тип блюда для создания
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  item: null,
  dishType: null
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
const currentTab = ref('basic') // ✨ NEW: Текущая вкладка

// Создаем дефолтный вариант
function createDefaultVariant(): MenuItemVariant {
  return {
    id: crypto.randomUUID(),
    name: '',
    price: 0,
    isActive: true,
    sortOrder: 0,
    composition: []
  }
}

const formData = ref({
  categoryId: '',
  name: '',
  description: '',
  type: 'food' as 'food' | 'beverage',
  dishType: 'simple' as DishType, // ✨ NEW: тип блюда
  isActive: true,
  sortOrder: 0,
  variants: [createDefaultVariant()],
  modifierGroups: [] as any[], // ✨ NEW: Модификаторы на уровне MenuItem
  templates: [] as any[] // ✨ NEW: Шаблоны на уровне MenuItem
})

// Computed
const isEdit = computed(() => !!props.item)
const categories = computed(() => menuStore.activeCategories)

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Опции для блюд (рецепты + полуфабрикаты)
const dishOptions = computed(() => {
  const options: Array<{
    id: string
    name: string
    type: 'recipe' | 'preparation'
    unit: string
    outputQuantity: number
  }> = []

  try {
    // Рецепты
    const activeRecipes = recipesStore.activeRecipes || []
    activeRecipes.forEach(recipe => {
      options.push({
        id: recipe.id,
        name: recipe.name,
        type: 'recipe',
        unit: recipe.outputUnit,
        outputQuantity: recipe.outputQuantity
      })
    })

    // Полуфабрикаты
    const activePreparations = recipesStore.activePreparations || []
    if (Array.isArray(activePreparations)) {
      activePreparations.forEach(prep => {
        options.push({
          id: prep.id,
          name: prep.name,
          type: 'preparation',
          unit: prep.outputUnit || 'gram',
          outputQuantity: prep.outputQuantity || 1
        })
      })
    }
  } catch (error) {
    console.warn('Error building dish options:', error)
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
})

// Опции для продуктов (только с canBeSold = true)
const productOptions = computed(() => {
  const options: Array<{
    id: string
    name: string
    category: string
    unit: string
    costPerUnit: number
  }> = []

  try {
    const activeProducts = productsStore.activeProducts || []
    activeProducts
      .filter(product => product.canBeSold) // ✅ Только продукты на прямую продажу
      .forEach(product => {
        options.push({
          id: product.id,
          name: product.name,
          category: product.category,
          unit: product.baseUnit, // ✅ Используем baseUnit вместо unit
          costPerUnit: product.baseCostPerUnit // ✅ Используем baseCostPerUnit вместо costPerUnit
        })
      })
  } catch (error) {
    console.warn('Error building product options:', error)
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
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
  { title: 'Соус', value: 'sauce' },
  { title: 'Дополнение', value: 'addon' }
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

function updateVariant(index: number, updatedVariant: MenuItemVariant) {
  formData.value.variants[index] = updatedVariant
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
    dishType: 'simple', // ✨ NEW: по умолчанию simple
    isActive: true,
    sortOrder: 0,
    variants: [createDefaultVariant()],
    modifierGroups: [], // ✨ NEW
    templates: [] // ✨ NEW
  }
  currentTab.value = 'basic' // ✨ Сбросить на первую вкладку
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
    const processedVariants = formData.value.variants.map((variant, index) => ({
      id: variant.id,
      name: variant.name?.trim() || '',
      price: variant.price,
      isActive: variant.isActive ?? true,
      sortOrder: index,
      portionMultiplier: variant.portionMultiplier,
      composition:
        variant.composition?.map(comp => ({
          type: comp.type,
          id: comp.id,
          quantity: comp.quantity,
          unit: comp.unit,
          role: comp.role,
          notes: comp.notes
        })) || []
    }))

    const itemData: CreateMenuItemDto = {
      categoryId: formData.value.categoryId,
      name: formData.value.name.trim(),
      description: formData.value.description?.trim(),
      type: formData.value.type,
      department: formData.value.type === 'food' ? 'kitchen' : 'bar', // ✨ NEW: department
      dishType: formData.value.dishType, // ✨ NEW: тип блюда
      modifierGroups: formData.value.modifierGroups || [], // ✨ NEW
      templates: formData.value.templates || [], // ✨ NEW
      variants: processedVariants.map(v => ({
        name: v.name,
        price: v.price,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
        portionMultiplier: v.portionMultiplier,
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
    console.log('🔍 [MenuItemDialog] Watch props.item triggered:', {
      hasItem: !!newItem,
      dishTypeProp: props.dishType,
      currentFormDishType: formData.value.dishType
    })

    if (newItem) {
      console.log('📝 [MenuItemDialog] Loading existing item:', {
        name: newItem.name,
        dishType: newItem.dishType
      })
      formData.value = {
        categoryId: newItem.categoryId,
        name: newItem.name,
        description: newItem.description || '',
        type: newItem.type,
        dishType: newItem.dishType || 'simple', // ✨ NEW: тип блюда из существующего item (fallback to 'simple')
        isActive: newItem.isActive,
        sortOrder: newItem.sortOrder,
        variants: newItem.variants.map(variant => ({
          ...variant,
          composition: variant.composition || []
        })),
        modifierGroups: newItem.modifierGroups || [], // ✨ NEW
        templates: newItem.templates || [] // ✨ NEW
      }
    } else if (props.dishType) {
      // ✨ NEW: Создание нового блюда с выбранным типом
      console.log('✨ [MenuItemDialog] Creating new item with dishType:', props.dishType)
      resetForm()
      formData.value.dishType = props.dishType
      console.log('✅ [MenuItemDialog] dishType set to:', formData.value.dishType)
    } else {
      console.log('🔄 [MenuItemDialog] Resetting form (no item, no dishType)')
      resetForm()
    }
  },
  { immediate: true }
)

// ✨ NEW: Watch dishType prop separately
watch(
  () => props.dishType,
  newDishType => {
    console.log('🔧 [MenuItemDialog] Watch dishType triggered:', {
      newDishType,
      currentDishType: formData.value.dishType,
      isOpen: props.modelValue
    })

    if (newDishType && !props.item) {
      console.log('✨ [MenuItemDialog] Setting dishType from prop:', newDishType)
      formData.value.dishType = newDishType
      console.log('✅ [MenuItemDialog] dishType updated to:', formData.value.dishType)
    }
  }
)

// Watch dialog state
watch(
  () => props.modelValue,
  isOpen => {
    console.log('👁️ [MenuItemDialog] Watch modelValue triggered:', {
      isOpen,
      hasItem: !!props.item,
      hasDishType: !!props.dishType,
      currentDishType: formData.value.dishType
    })

    if (isOpen && !props.item && !props.dishType) {
      console.log('🔄 [MenuItemDialog] Resetting form (dialog opened, no item, no dishType)')
      resetForm()
    } else if (isOpen) {
      console.log('✅ [MenuItemDialog] Dialog opened, preserving state')
    }
  }
)

// Initialize stores
onMounted(async () => {
  try {
    console.log('MenuItemDialog: Initializing stores...')

    // Загружаем продукты (используем ENV.useMockData)
    await productsStore.loadProducts(ENV.useMockData)
    console.log('MenuItemDialog: Products loaded:', productsStore.products?.length)

    // Инициализируем recipes store
    if (recipesStore && typeof recipesStore.initialize === 'function') {
      await recipesStore.initialize()
      console.log('MenuItemDialog: Recipes initialized:', recipesStore.activeRecipes?.length)
      console.log(
        'MenuItemDialog: Preparations initialized:',
        recipesStore.activePreparations?.length
      )
    } else {
      console.warn('MenuItemDialog: RecipesStore not available or no initialize method')
    }
  } catch (error) {
    console.error('MenuItemDialog: Failed to initialize stores:', error)
  }
})
</script>

<style lang="scss" scoped>
// ✨ NEW: Стили для вкладок
.tab-content {
  max-height: 600px;
  overflow-y: auto;
  padding: 8px 4px;
}

.variants-list {
  max-height: 100%;
  overflow-y: auto;
  padding: 4px;
}

:deep(.v-btn-toggle) {
  border: 1px solid var(--color-surface);
  border-radius: 8px;
}

// Стили для бейджей на вкладках
:deep(.v-tab) {
  .v-badge {
    margin-left: 8px;
  }
}
</style>
