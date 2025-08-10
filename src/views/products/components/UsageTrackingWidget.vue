<!-- src/views/products/components/UsageTrackingWidget.vue -->
<template>
  <v-card>
    <v-card-title class="d-flex align-center pb-2">
      <v-icon start color="primary">mdi-sitemap</v-icon>
      <span>Где используется</span>
      <v-spacer />
      <div class="d-flex align-center ga-2">
        <v-chip v-if="totalUsageCount > 0" color="primary" size="small" variant="tonal">
          {{ totalUsageCount }} мест
        </v-chip>
        <v-btn
          size="small"
          variant="outlined"
          color="primary"
          :loading="loading"
          @click="generateMockUsage"
        >
          <v-icon start size="small">mdi-refresh</v-icon>
          Обновить
        </v-btn>
      </div>
    </v-card-title>

    <v-divider />

    <!-- Loading state -->
    <div v-if="loading" class="text-center pa-6">
      <v-progress-circular size="32" color="primary" indeterminate />
      <div class="text-body-2 text-medium-emphasis mt-2">Анализ использования продукта...</div>
    </div>

    <!-- Error state -->
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      class="ma-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- Content -->
    <div v-else>
      <!-- Usage Summary -->
      <v-card-text v-if="usage" class="pb-2">
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <div class="usage-metric">
              <div class="usage-metric__value text-h6 primary--text">
                {{ usage.usedInRecipes.length }}
              </div>
              <div class="usage-metric__label">Рецепты</div>
              <div class="text-caption text-medium-emphasis">{{ activeRecipesCount }} активных</div>
            </div>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <div class="usage-metric">
              <div class="usage-metric__value text-h6 secondary--text">
                {{ usage.usedInPreparations.length }}
              </div>
              <div class="usage-metric__label">Полуфабрикаты</div>
              <div class="text-caption text-medium-emphasis">
                {{ activePreparationsCount }} активных
              </div>
            </div>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <div class="usage-metric">
              <div class="usage-metric__value text-h6 success--text">
                {{ usage.directMenuItems?.length || 0 }}
              </div>
              <div class="usage-metric__label">Меню</div>
              <div class="text-caption text-medium-emphasis">
                {{ product.canBeSold ? 'Прямые продажи' : 'Не продается' }}
              </div>
            </div>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <div class="usage-metric">
              <div class="usage-metric__value text-h6 info--text">
                {{ formatQuantity(totalDailyUsage) }}
              </div>
              <div class="usage-metric__label">В день</div>
              <div class="text-caption text-medium-emphasis">
                {{ formatUnit(product.unit) }}
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <!-- Recipes Section -->
      <div v-if="usage?.usedInRecipes.length > 0" class="pa-4">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="section-title">
            <v-icon color="primary" class="me-2">mdi-chef-hat</v-icon>
            <span class="text-subtitle-1 font-weight-medium">Рецепты</span>
            <v-chip color="primary" size="x-small" variant="outlined" class="ms-2">
              {{ usage.usedInRecipes.length }}
            </v-chip>
          </div>
          <v-btn
            size="small"
            variant="text"
            color="primary"
            @click="expandedSections.recipes = !expandedSections.recipes"
          >
            {{ expandedSections.recipes ? 'Скрыть' : 'Показать все' }}
          </v-btn>
        </div>

        <div class="usage-items">
          <div
            v-for="recipe in displayedRecipes"
            :key="recipe.recipeId"
            class="usage-item"
            :class="{ 'usage-item--inactive': !recipe.isActive }"
          >
            <div class="usage-item__icon">
              <v-avatar size="32" :color="recipe.isActive ? 'primary' : 'grey-lighten-1'">
                <v-icon size="16" color="white">mdi-chef-hat</v-icon>
              </v-avatar>
            </div>

            <div class="usage-item__content">
              <div class="usage-item__name">
                {{ recipe.recipeName }}
                <v-chip
                  v-if="!recipe.isActive"
                  size="x-small"
                  color="error"
                  variant="outlined"
                  class="ms-2"
                >
                  Неактивен
                </v-chip>
              </div>
              <div class="usage-item__details">
                {{ formatQuantity(recipe.quantityPerPortion) }} {{ formatUnit(product.unit) }} на
                порцию
              </div>
            </div>

            <div class="usage-item__stats">
              <div class="text-body-2 font-weight-medium">
                {{
                  formatQuantity(recipe.quantityPerPortion * getRecipePopularity(recipe.recipeId))
                }}
              </div>
              <div class="text-caption text-medium-emphasis">в день</div>
            </div>

            <div class="usage-item__actions">
              <v-btn
                icon="mdi-eye"
                size="small"
                variant="text"
                color="primary"
                @click="$emit('view-recipe', recipe.recipeId)"
              >
                <v-icon>mdi-eye</v-icon>
                <v-tooltip activator="parent">Открыть рецепт</v-tooltip>
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- Preparations Section -->
      <div v-if="usage?.usedInPreparations.length > 0" class="pa-4">
        <v-divider class="mb-4" />

        <div class="d-flex align-center justify-space-between mb-3">
          <div class="section-title">
            <v-icon color="secondary" class="me-2">mdi-food-variant</v-icon>
            <span class="text-subtitle-1 font-weight-medium">Полуфабрикаты</span>
            <v-chip color="secondary" size="x-small" variant="outlined" class="ms-2">
              {{ usage.usedInPreparations.length }}
            </v-chip>
          </div>
          <v-btn
            size="small"
            variant="text"
            color="secondary"
            @click="expandedSections.preparations = !expandedSections.preparations"
          >
            {{ expandedSections.preparations ? 'Скрыть' : 'Показать все' }}
          </v-btn>
        </div>

        <div class="usage-items">
          <div
            v-for="prep in displayedPreparations"
            :key="prep.preparationId"
            class="usage-item"
            :class="{ 'usage-item--inactive': !prep.isActive }"
          >
            <div class="usage-item__icon">
              <v-avatar size="32" :color="prep.isActive ? 'secondary' : 'grey-lighten-1'">
                <v-icon size="16" color="white">mdi-food-variant</v-icon>
              </v-avatar>
            </div>

            <div class="usage-item__content">
              <div class="usage-item__name">
                {{ prep.preparationName }}
                <v-chip
                  v-if="!prep.isActive"
                  size="x-small"
                  color="error"
                  variant="outlined"
                  class="ms-2"
                >
                  Неактивен
                </v-chip>
              </div>
              <div class="usage-item__details">
                {{ formatQuantity(prep.quantityPerOutput) }} {{ formatUnit(product.unit) }} на выход
              </div>
            </div>

            <div class="usage-item__stats">
              <div class="text-body-2 font-weight-medium">
                {{
                  formatQuantity(prep.quantityPerOutput * getPreparationUsage(prep.preparationId))
                }}
              </div>
              <div class="text-caption text-medium-emphasis">в день</div>
            </div>

            <div class="usage-item__actions">
              <v-btn
                icon="mdi-eye"
                size="small"
                variant="text"
                color="secondary"
                @click="$emit('view-preparation', prep.preparationId)"
              >
                <v-icon>mdi-eye</v-icon>
                <v-tooltip activator="parent">Открыть полуфабрикат</v-tooltip>
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- Direct Menu Items Section -->
      <div v-if="usage?.directMenuItems?.length > 0" class="pa-4">
        <v-divider class="mb-4" />

        <div class="d-flex align-center justify-space-between mb-3">
          <div class="section-title">
            <v-icon color="success" class="me-2">mdi-silverware-fork-knife</v-icon>
            <span class="text-subtitle-1 font-weight-medium">Прямые продажи</span>
            <v-chip color="success" size="x-small" variant="outlined" class="ms-2">
              {{ usage.directMenuItems.length }}
            </v-chip>
          </div>
        </div>

        <div class="usage-items">
          <div
            v-for="item in usage.directMenuItems"
            :key="`${item.menuItemId}-${item.variantId}`"
            class="usage-item"
            :class="{ 'usage-item--inactive': !item.isActive }"
          >
            <div class="usage-item__icon">
              <v-avatar size="32" :color="item.isActive ? 'success' : 'grey-lighten-1'">
                <v-icon size="16" color="white">mdi-silverware-fork-knife</v-icon>
              </v-avatar>
            </div>

            <div class="usage-item__content">
              <div class="usage-item__name">
                {{ item.menuItemName }}
                <v-chip size="x-small" color="info" variant="outlined" class="ms-1">
                  {{ item.variantName }}
                </v-chip>
                <v-chip
                  v-if="!item.isActive"
                  size="x-small"
                  color="error"
                  variant="outlined"
                  class="ms-1"
                >
                  Неактивен
                </v-chip>
              </div>
              <div class="usage-item__details">
                {{ formatQuantity(item.quantityPerItem) }} {{ formatUnit(product.unit) }} на порцию
              </div>
            </div>

            <div class="usage-item__stats">
              <div class="text-body-2 font-weight-medium">
                {{ formatQuantity(item.quantityPerItem * getMenuItemPopularity(item.menuItemId)) }}
              </div>
              <div class="text-caption text-medium-emphasis">в день</div>
            </div>

            <div class="usage-item__actions">
              <v-btn
                icon="mdi-eye"
                size="small"
                variant="text"
                color="success"
                @click="$emit('view-menu-item', item.menuItemId, item.variantId)"
              >
                <v-icon>mdi-eye</v-icon>
                <v-tooltip activator="parent">Открыть в меню</v-tooltip>
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- No Usage State -->
      <div v-if="!hasAnyUsage" class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-package-variant-closed</v-icon>
        <h3 class="text-h6 text-medium-emphasis mb-2">Продукт не используется</h3>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Этот продукт пока не используется ни в одном рецепте, полуфабрикате или позиции меню
        </p>

        <div class="d-flex justify-center ga-2">
          <v-btn
            v-if="product.canBeSold"
            color="success"
            variant="outlined"
            prepend-icon="mdi-plus"
            @click="$emit('add-to-menu', product)"
          >
            Добавить в меню
          </v-btn>
          <v-btn
            v-else
            color="primary"
            variant="outlined"
            prepend-icon="mdi-plus"
            @click="$emit('add-to-recipe', product)"
          >
            Добавить в рецепт
          </v-btn>
        </div>
      </div>

      <!-- Dependency Warning -->
      <div v-if="hasActiveDependencies" class="pa-4">
        <v-divider class="mb-4" />
        <v-alert type="warning" variant="tonal" density="compact">
          <template #prepend>
            <v-icon>mdi-alert-triangle</v-icon>
          </template>
          <span class="text-body-2">
            Продукт используется в {{ activeDependenciesCount }} активных позициях. Деактивация
            может повлиять на доступность блюд.
          </span>
        </v-alert>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Product } from '@/stores/productsStore'
import type { ProductUsage } from '@/stores/productsStore/types'
import { useMeasurementUnits } from '@/composables/useMeasurementUnits'

// Props
interface Props {
  product: Product
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'view-recipe', recipeId: string): void
  (e: 'view-preparation', preparationId: string): void
  (e: 'view-menu-item', menuItemId: string, variantId: string): void
  (e: 'add-to-menu', product: Product): void
  (e: 'add-to-recipe', product: Product): void
}

defineEmits<Emits>()

// Composables
const { getUnitName } = useMeasurementUnits()

// State
const loading = ref(false)
const error = ref<string | null>(null)
const usage = ref<ProductUsage | null>(null)
const expandedSections = ref({
  recipes: false,
  preparations: false
})

// Mock recipe popularity data
const recipePopularity = ref<Record<string, number>>({})
const preparationUsageData = ref<Record<string, number>>({})
const menuItemPopularity = ref<Record<string, number>>({})

// Mock data generation
const generateMockUsage = async (): Promise<void> => {
  loading.value = true
  error.value = null

  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600))

    const mockUsage: ProductUsage = {
      id: `usage-${props.product.id}`,
      productId: props.product.id,
      usedInRecipes: [],
      usedInPreparations: [],
      directMenuItems: [],
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Generate mock recipes based on product type
    if (!props.product.canBeSold) {
      // Raw materials - used in recipes
      const recipeNames = getRecipeNamesForProduct(props.product)
      mockUsage.usedInRecipes = recipeNames.map((name, index) => {
        const recipeId = `recipe-${props.product.id}-${index}`
        const popularity = Math.random() * 20 + 5 // 5-25 portions per day
        const isActive = Math.random() > 0.1 // 90% active

        recipePopularity.value[recipeId] = popularity

        return {
          recipeId,
          recipeName: name,
          quantityPerPortion: generateQuantityForProduct(props.product),
          isActive
        }
      })

      // Some raw materials might be used in preparations too
      if (Math.random() > 0.6) {
        const prepNames = getPreparationNamesForProduct(props.product)
        mockUsage.usedInPreparations = prepNames.map((name, index) => {
          const prepId = `prep-${props.product.id}-${index}`
          const usage = Math.random() * 3 + 1 // 1-4 uses per day
          const isActive = Math.random() > 0.2 // 80% active

          preparationUsageData.value[prepId] = usage

          return {
            preparationId: prepId,
            preparationName: name,
            quantityPerOutput: generateQuantityForProduct(props.product) * 2,
            isActive
          }
        })
      }
    } else {
      // Sellable products - direct menu items
      const menuItems = getMenuItemsForProduct(props.product)
      mockUsage.directMenuItems = menuItems.map((item, index) => {
        const menuItemId = `menu-${props.product.id}-${index}`
        const popularity = Math.random() * 15 + 3 // 3-18 sales per day

        menuItemPopularity.value[menuItemId] = popularity

        return {
          menuItemId,
          menuItemName: item.name,
          variantId: `variant-${index}`,
          variantName: item.variant,
          quantityPerItem: item.quantity,
          isActive: Math.random() > 0.05 // 95% active for menu items
        }
      })
    }

    usage.value = mockUsage
  } catch (err) {
    error.value = 'Ошибка загрузки данных об использовании'
  } finally {
    loading.value = false
  }
}

// Mock data helpers
const getRecipeNamesForProduct = (product: Product): string[] => {
  const recipesByCategory = {
    meat: ['Стейк Рибай', 'Говяжий гуляш', 'Бургер Классик'],
    vegetables: ['Овощное рагу', 'Картофель фри', 'Салат Цезарь', 'Томатный соус'],
    dairy: ['Соус Альфредо', 'Крем-суп', 'Десерт Тирамису'],
    spices: ['Маринад универсальный', 'Соус Барбекю', 'Приправа для мяса'],
    other: ['Салатная заправка', 'Маринад для овощей']
  }

  const available = recipesByCategory[product.category] || ['Фирменное блюдо']
  const count = Math.min(available.length, Math.floor(Math.random() * 3) + 1)

  return available.slice(0, count)
}

const getPreparationNamesForProduct = (product: Product): string[] => {
  const prepsByCategory = {
    meat: ['Фарш домашний'],
    vegetables: ['Овощная нарезка', 'Соус томатный'],
    dairy: ['Соус сливочный'],
    spices: ['Смесь специй'],
    other: ['Заготовка базовая']
  }

  const available = prepsByCategory[product.category] || []
  return available.slice(0, 1) // Usually 1 preparation
}

const getMenuItemsForProduct = (
  product: Product
): Array<{ name: string; variant: string; quantity: number }> => {
  const menuByCategory = {
    beverages: [
      { name: 'Пиво разливное', variant: 'Малое', quantity: 1 },
      { name: 'Пиво разливное', variant: 'Большое', quantity: 1 }
    ],
    other: [
      { name: 'Торт на заказ', variant: 'Классический', quantity: 1 },
      { name: 'Хлебная корзина', variant: 'Микс', quantity: 2 }
    ]
  }

  return (
    menuByCategory[product.category] || [
      { name: `${product.name} порционно`, variant: 'Стандарт', quantity: 1 }
    ]
  )
}

const generateQuantityForProduct = (product: Product): number => {
  const quantityByUnit = {
    kg: () => Math.round((Math.random() * 0.5 + 0.1) * 100) / 100, // 0.1-0.6 kg
    liter: () => Math.round((Math.random() * 0.3 + 0.05) * 100) / 100, // 0.05-0.35 L
    piece: () => Math.floor(Math.random() * 3) + 1, // 1-3 pieces
    pack: () => Math.floor(Math.random() * 2) + 1 // 1-2 packs
  }

  const generator = quantityByUnit[product.unit] || quantityByUnit.kg
  return generator()
}

// Computed properties
const totalUsageCount = computed(() => {
  if (!usage.value) return 0
  return (
    usage.value.usedInRecipes.length +
    usage.value.usedInPreparations.length +
    (usage.value.directMenuItems?.length || 0)
  )
})

const hasAnyUsage = computed(() => totalUsageCount.value > 0)

const activeRecipesCount = computed(() => {
  return usage.value?.usedInRecipes.filter(r => r.isActive).length || 0
})

const activePreparationsCount = computed(() => {
  return usage.value?.usedInPreparations.filter(p => p.isActive).length || 0
})

const totalDailyUsage = computed(() => {
  if (!usage.value) return 0

  let total = 0

  // From recipes
  usage.value.usedInRecipes.forEach(recipe => {
    if (recipe.isActive) {
      const popularity = getRecipePopularity(recipe.recipeId)
      total += recipe.quantityPerPortion * popularity
    }
  })

  // From preparations
  usage.value.usedInPreparations.forEach(prep => {
    if (prep.isActive) {
      const usage = getPreparationUsage(prep.preparationId)
      total += prep.quantityPerOutput * usage
    }
  })

  // From direct menu items
  usage.value.directMenuItems?.forEach(item => {
    if (item.isActive) {
      const popularity = getMenuItemPopularity(item.menuItemId)
      total += item.quantityPerItem * popularity
    }
  })

  return total
})

const hasActiveDependencies = computed(() => {
  if (!usage.value) return false

  return (
    usage.value.usedInRecipes.some(r => r.isActive) ||
    usage.value.usedInPreparations.some(p => p.isActive) ||
    usage.value.directMenuItems?.some(i => i.isActive) ||
    false
  )
})

const activeDependenciesCount = computed(() => {
  if (!usage.value) return 0

  return (
    usage.value.usedInRecipes.filter(r => r.isActive).length +
    usage.value.usedInPreparations.filter(p => p.isActive).length +
    (usage.value.directMenuItems?.filter(i => i.isActive).length || 0)
  )
})

const displayedRecipes = computed(() => {
  if (!usage.value?.usedInRecipes) return []
  return expandedSections.value.recipes
    ? usage.value.usedInRecipes
    : usage.value.usedInRecipes.slice(0, 3)
})

const displayedPreparations = computed(() => {
  if (!usage.value?.usedInPreparations) return []
  return expandedSections.value.preparations
    ? usage.value.usedInPreparations
    : usage.value.usedInPreparations.slice(0, 3)
})

// Helper methods
const formatQuantity = (quantity: number): string => {
  return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(2)
}

const formatUnit = (unit: string): string => {
  return getUnitName(unit as any)
}

const getRecipePopularity = (recipeId: string): number => {
  return recipePopularity.value[recipeId] || 0
}

const getPreparationUsage = (preparationId: string): number => {
  return preparationUsageData.value[preparationId] || 0
}

const getMenuItemPopularity = (menuItemId: string): number => {
  return menuItemPopularity.value[menuItemId] || 0
}

// Mount
onMounted(() => {
  generateMockUsage()
})
</script>

<style scoped>
.usage-metric {
  text-align: center;
  padding: 8px;
}

.usage-metric__value {
  font-weight: 600;
  margin-bottom: 4px;
}

.usage-metric__label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 2px;
}

.section-title {
  display: flex;
  align-items: center;
}

.usage-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.usage-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.usage-item:hover {
  background: rgba(var(--v-theme-primary), 0.02);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.usage-item--inactive {
  opacity: 0.6;
}

.usage-item__icon {
  flex-shrink: 0;
}

.usage-item__content {
  flex: 1;
  min-width: 0;
}

.usage-item__name {
  font-weight: 500;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.usage-item__details {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.usage-item__stats {
  text-align: center;
  min-width: 80px;
}

.usage-item__actions {
  flex-shrink: 0;
}
</style>
