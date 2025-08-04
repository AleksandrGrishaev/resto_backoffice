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
          <menu-item-variant-component
            v-for="(variant, index) in formData.variants"
            :key="variant.id"
            :variant="variant"
            :index="index"
            :can-delete="formData.variants.length > 1"
            :item-name="formData.name"
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
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import type { MenuItem, CreateMenuItemDto, MenuItemVariant } from '@/types/menu'
import BaseDialog from '@/components/base/BaseDialog.vue'
import MenuItemVariantComponent from './MenuItemVariant.vue'

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
    sortOrder: 0,
    composition: []
  }
}

const formData = ref({
  categoryId: '',
  name: '',
  description: '',
  type: 'food' as 'food' | 'beverage',
  isActive: true,
  sortOrder: 0,
  variants: [createDefaultVariant()]
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

// Опции для продуктов
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
    activeProducts.forEach(product => {
      options.push({
        id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        costPerUnit: product.costPerUnit
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
    if (newItem) {
      formData.value = {
        categoryId: newItem.categoryId,
        name: newItem.name,
        description: newItem.description || '',
        type: newItem.type,
        isActive: newItem.isActive,
        sortOrder: newItem.sortOrder,
        variants: newItem.variants.map(variant => ({
          ...variant,
          composition: variant.composition || []
        }))
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
  try {
    console.log('MenuItemDialog: Initializing stores...')

    // Загружаем продукты в mock режиме
    await productsStore.loadProducts(true)
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
.variants-list {
  max-height: 600px;
  overflow-y: auto;
  padding: 4px;
}

:deep(.v-btn-toggle) {
  border: 1px solid var(--color-surface);
  border-radius: 8px;
}
</style>
