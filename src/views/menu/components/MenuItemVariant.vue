<template>
  <div class="variant-item">
    <!-- Заголовок варианта -->
    <div class="variant-item__header d-flex align-center mb-2">
      <div class="text-subtitle-2">Вариант {{ index + 1 }}</div>
      <v-spacer />
      <v-btn
        size="small"
        color="error"
        variant="text"
        :disabled="!canDelete"
        @click="$emit('delete')"
      >
        <v-icon icon="mdi-delete" size="20" />
      </v-btn>
    </div>

    <!-- Основные поля варианта -->
    <div class="variant-item__fields">
      <div class="d-flex gap-2 mb-3">
        <v-text-field
          v-model="localVariant.name"
          label="Название варианта"
          hide-details="auto"
          placeholder="Оставьте пустым если не требуется"
          class="flex-grow-1"
          bg-color="surface"
          @update:model-value="emitUpdate"
        />
        <v-text-field
          v-model.number="localVariant.price"
          type="number"
          label="Цена"
          hide-details="auto"
          suffix="IDR"
          :rules="[v => v > 0 || 'Цена должна быть больше 0']"
          required
          style="width: 150px"
          bg-color="surface"
          @update:model-value="emitUpdate"
        />
      </div>

      <!-- Композиция -->
      <div class="composition-section">
        <div class="d-flex align-center mb-2">
          <div class="text-subtitle-2">Состав блюда</div>
          <v-spacer />

          <!-- Две кнопки для добавления -->
          <div class="d-flex gap-1">
            <v-btn size="small" variant="text" color="primary" @click="showDishSelector = true">
              <v-icon icon="mdi-chef-hat" size="16" class="mr-1" />
              Блюдо
            </v-btn>
            <v-btn
              size="small"
              variant="text"
              color="secondary"
              @click="showProductSelector = true"
            >
              <v-icon icon="mdi-package-variant" size="16" class="mr-1" />
              Продукт
            </v-btn>
          </div>
        </div>

        <div
          v-if="!localVariant.composition || localVariant.composition.length === 0"
          class="text-caption text-medium-emphasis mb-2 pa-3 text-center"
          style="border: 1px dashed var(--color-border); border-radius: 8px"
        >
          Добавьте блюда или продукты для создания композитного блюда
        </div>

        <!-- Список компонентов, сгруппированных по ролям -->
        <div v-if="localVariant.composition && localVariant.composition.length > 0">
          <div
            v-for="(roleGroup, roleName) in groupedComposition"
            :key="roleName"
            class="role-group mb-3"
          >
            <div class="role-header text-caption text-medium-emphasis mb-1">
              {{ getRoleDisplayName(roleName) }}
            </div>
            <div
              v-for="(component, compIndex) in roleGroup"
              :key="component.id + compIndex"
              class="composition-item mb-2"
            >
              <div class="d-flex gap-2 align-center">
                <!-- Иконка и название компонента -->
                <div class="component-info d-flex align-center" style="min-width: 200px">
                  <v-icon
                    :icon="getComponentIcon(component)"
                    size="16"
                    class="mr-2"
                    :color="getComponentColor(component)"
                  />
                  <div>
                    <div class="text-body-2">{{ getComponentName(component) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ getComponentTypeLabel(component) }}
                    </div>
                  </div>
                </div>

                <!-- Количество -->
                <v-text-field
                  v-model.number="component.quantity"
                  type="number"
                  label="Кол-во"
                  hide-details="auto"
                  bg-color="background"
                  style="width: 100px"
                  @update:model-value="emitUpdate"
                />

                <!-- Единицы -->
                <v-select
                  v-model="component.unit"
                  :items="unitOptions"
                  label="Ед."
                  hide-details="auto"
                  bg-color="background"
                  style="width: 100px"
                  @update:model-value="emitUpdate"
                />

                <!-- Роль -->
                <v-select
                  v-model="component.role"
                  :items="roleOptions"
                  label="Роль"
                  hide-details="auto"
                  bg-color="background"
                  style="width: 120px"
                  @update:model-value="emitUpdate"
                />

                <!-- Удалить -->
                <v-btn
                  size="small"
                  color="error"
                  variant="text"
                  icon
                  @click="removeComponent(component)"
                >
                  <v-icon icon="mdi-delete" size="16" />
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ✅ Модификаторы перенесены на уровень MenuItem (в MenuItemDialog) -->

      <!-- Предпросмотр -->
      <div class="variant-preview mt-3">
        <div class="variant-preview__label text-caption text-medium-emphasis mb-1">
          Предпросмотр:
        </div>
        <div class="variant-preview__content d-flex justify-space-between align-center">
          <div class="text-body-2">
            {{ getFullItemName(itemName, localVariant.name) }}
          </div>
          <div class="variant-preview__price">{{ formatPrice(localVariant.price) }}</div>
        </div>
      </div>
    </div>

    <!-- Диалог выбора блюда -->
    <v-dialog v-model="showDishSelector" max-width="600">
      <v-card>
        <v-card-title>Добавить блюдо</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="dishSearch"
            label="Поиск блюда"
            prepend-inner-icon="mdi-magnify"
            hide-details="auto"
            class="mb-3"
          />

          <div class="dish-list" style="max-height: 400px; overflow-y: auto">
            <v-list>
              <v-list-item
                v-for="dish in filteredDishes"
                :key="dish.id"
                @click="addDishComponent(dish)"
              >
                <template #prepend>
                  <v-icon
                    :icon="dish.type === 'recipe' ? 'mdi-chef-hat' : 'mdi-food-variant'"
                    :color="dish.type === 'recipe' ? 'primary' : 'secondary'"
                  />
                </template>
                <v-list-item-title>{{ dish.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ dish.type === 'recipe' ? 'Рецепт' : 'Полуфабрикат' }} •
                  {{ dish.outputQuantity }} {{ getUnitLabel(dish.unit) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDishSelector = false">Отмена</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Диалог выбора продукта -->
    <v-dialog v-model="showProductSelector" max-width="600">
      <v-card>
        <v-card-title>Добавить продукт</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="productSearch"
            label="Поиск продукта"
            prepend-inner-icon="mdi-magnify"
            hide-details="auto"
            class="mb-3"
          />

          <div class="product-list" style="max-height: 400px; overflow-y: auto">
            <v-list>
              <v-list-item
                v-for="product in filteredProducts"
                :key="product.id"
                @click="addProductComponent(product)"
              >
                <template #prepend>
                  <v-icon icon="mdi-package-variant" color="info" />
                </template>
                <v-list-item-title>{{ product.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ product.category }} • {{ formatPrice(product.costPerUnit) }}/{{
                    getUnitLabel(product.unit)
                  }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showProductSelector = false">Отмена</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MenuItemVariant, MenuComposition, DishType } from '@/stores/menu'

interface Props {
  variant: MenuItemVariant
  index: number
  canDelete: boolean
  itemName: string
  dishType: DishType // ✨ NEW: тип блюда
  dishOptions: Array<{
    id: string
    name: string
    type: 'recipe' | 'preparation'
    unit: string
    outputQuantity: number
  }>
  productOptions: Array<{
    id: string
    name: string
    category: string
    unit: string
    costPerUnit: number
  }>
  unitOptions: Array<{ title: string; value: string }>
  roleOptions: Array<{ title: string; value: string }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:variant': [MenuItemVariant]
  delete: []
}>()

// Local copy для предотвращения мутаций
const localVariant = ref<MenuItemVariant>({ ...props.variant })

// Dialog states
const showDishSelector = ref(false)
const showProductSelector = ref(false)
const dishSearch = ref('')
const productSearch = ref('')

// Computed
const groupedComposition = computed(() => {
  const groups: Record<string, MenuComposition[]> = {
    main: [],
    garnish: [],
    sauce: [],
    addon: []
  }

  if (localVariant.value.composition) {
    localVariant.value.composition.forEach(comp => {
      const role = comp.role || 'main'
      groups[role].push(comp)
    })
  }

  // Убираем пустые группы
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key]
    }
  })

  return groups
})

const filteredDishes = computed(() => {
  const search = dishSearch.value.toLowerCase()
  return props.dishOptions.filter(dish => dish.name.toLowerCase().includes(search))
})

const filteredProducts = computed(() => {
  const search = productSearch.value.toLowerCase()
  return props.productOptions.filter(
    product =>
      product.name.toLowerCase().includes(search) || product.category.toLowerCase().includes(search)
  )
})

// Methods
let updateTimeout: NodeJS.Timeout | null = null

function emitUpdate() {
  // Debounce для предотвращения частых обновлений
  if (updateTimeout) {
    clearTimeout(updateTimeout)
  }

  updateTimeout = setTimeout(() => {
    emit('update:variant', { ...localVariant.value })
  }, 100)
}

function addDishComponent(dish: {
  id: string
  name: string
  type: 'recipe' | 'preparation'
  unit: string
  outputQuantity: number
}) {
  if (!localVariant.value.composition) {
    localVariant.value.composition = []
  }

  localVariant.value.composition.push({
    type: dish.type,
    id: dish.id,
    quantity: dish.outputQuantity,
    unit: dish.unit,
    role: 'main'
  })

  showDishSelector.value = false
  dishSearch.value = ''
  emitUpdate()
}

function addProductComponent(product: { id: string; name: string; unit: string }) {
  if (!localVariant.value.composition) {
    localVariant.value.composition = []
  }

  localVariant.value.composition.push({
    type: 'product',
    id: product.id,
    quantity: 1,
    unit: product.unit,
    role: 'main'
  })

  showProductSelector.value = false
  productSearch.value = ''
  emitUpdate()
}

function removeComponent(componentToRemove: MenuComposition) {
  if (localVariant.value.composition) {
    const index = localVariant.value.composition.findIndex(
      comp =>
        comp.type === componentToRemove.type &&
        comp.id === componentToRemove.id &&
        comp.quantity === componentToRemove.quantity
    )
    if (index !== -1) {
      localVariant.value.composition.splice(index, 1)
      emitUpdate()
    }
  }
}

function getComponentName(component: MenuComposition): string {
  // Ищем в списках блюд и продуктов
  const dish = props.dishOptions.find(d => d.id === component.id && d.type === component.type)
  if (dish) return dish.name

  const product = props.productOptions.find(p => p.id === component.id)
  if (product) return product.name

  return 'Неизвестный компонент'
}

function getComponentIcon(component: MenuComposition): string {
  switch (component.type) {
    case 'recipe':
      return 'mdi-chef-hat'
    case 'preparation':
      return 'mdi-food-variant'
    case 'product':
      return 'mdi-package-variant'
    default:
      return 'mdi-help-circle'
  }
}

function getComponentColor(component: MenuComposition): string {
  switch (component.type) {
    case 'recipe':
      return 'primary'
    case 'preparation':
      return 'secondary'
    case 'product':
      return 'info'
    default:
      return 'grey'
  }
}

function getComponentTypeLabel(component: MenuComposition): string {
  switch (component.type) {
    case 'recipe':
      return 'Рецепт'
    case 'preparation':
      return 'Полуфабрикат'
    case 'product':
      return 'Продукт'
    default:
      return 'Неизвестно'
  }
}

function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    main: 'Основное',
    garnish: 'Гарниры',
    sauce: 'Соусы',
    addon: 'Дополнения'
  }
  return roleMap[role] || role
}

function getUnitLabel(unit: string): string {
  const unitMap: Record<string, string> = {
    gram: 'г',
    ml: 'мл',
    piece: 'шт',
    liter: 'л',
    kg: 'кг'
  }
  return unitMap[unit] || unit
}

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

// ✅ updateModifierGroups и updateTemplates удалены - модификаторы на уровне MenuItem

// Watch for external changes
watch(
  () => props.variant,
  newVariant => {
    localVariant.value = { ...newVariant }
  },
  { deep: true }
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

.role-group {
  .role-header {
    font-weight: 500;
    padding: 4px 0;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 8px;
  }
}

.component-info {
  background: var(--color-surface);
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

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}
</style>
