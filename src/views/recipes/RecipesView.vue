<!-- src/views/recipes/RecipesView.vue - В СТИЛЕ КОНТРАГЕНТОВ -->
<template>
  <div class="recipes-view">
    <!-- Заголовок и кнопка добавления -->
    <div class="recipes-toolbar">
      <v-row align="center" class="mb-4">
        <v-col>
          <div class="d-flex align-center ga-3">
            <v-icon size="40" color="primary">mdi-chef-hat</v-icon>
            <div>
              <h1 class="text-h4">Recipes & Preparations</h1>
              <p class="text-subtitle-1 text-medium-emphasis mt-1">
                Manage recipes and preparations for your restaurant menu
              </p>
            </div>
          </div>
        </v-col>
        <v-col cols="auto">
          <v-btn color="primary" prepend-icon="mdi-plus" size="large" @click="showCreateDialog">
            New {{ activeTab === 'recipes' ? 'Recipe' : 'Preparation' }}
          </v-btn>
        </v-col>
      </v-row>
    </div>

    <!-- Фильтры и поиск -->
    <RecipeFilters v-model:active-tab="activeTab" @toggle-all-panels="handleToggleAllPanels" />

    <!-- Список рецептов и полуфабрикатов -->
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon start>
          {{ activeTab === 'recipes' ? 'mdi-book-open-page-variant' : 'mdi-chef-hat' }}
        </v-icon>
        {{ activeTab === 'recipes' ? 'Recipes' : 'Preparations' }} List
        <v-spacer />
        <div class="d-flex align-center ga-2">
          <v-chip
            :color="getFilteredCount() > 0 ? 'primary' : 'default'"
            variant="outlined"
            size="small"
          >
            {{ getFilteredCount() }} of {{ getTotalCount() }}
          </v-chip>

          <!-- Индикатор загрузки -->
          <v-progress-circular
            v-if="store.loading"
            size="20"
            width="2"
            color="primary"
            indeterminate
          />
        </div>
      </v-card-title>

      <v-divider />

      <!-- Прогресс-бар загрузки -->
      <v-progress-linear v-if="store.loading" indeterminate color="primary" />

      <!-- Алерт с ошибкой -->
      <v-alert
        v-if="store.error"
        type="error"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="store.clearError"
      >
        <template #title>Error loading data</template>
        {{ store.error }}
      </v-alert>

      <!-- Content -->
      <div class="recipes-content">
        <!-- Recipes Tab -->
        <div v-if="activeTab === 'recipes'" class="recipes-section">
          <v-expansion-panels v-model="expandedPanels" multiple>
            <v-expansion-panel
              v-for="category in recipeCategories"
              :key="category.value"
              :value="category.value"
            >
              <v-expansion-panel-title>
                <div class="category-header">
                  <span class="category-header__name">{{ category.text }}</span>
                  <v-chip
                    size="small"
                    variant="tonal"
                    :color="getCategoryRecipes(category.value).length > 0 ? 'primary' : 'grey'"
                  >
                    {{ getCategoryRecipes(category.value).length }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <div v-if="getCategoryRecipes(category.value).length === 0" class="empty-state">
                  <v-icon icon="mdi-chef-hat" size="48" class="text-medium-emphasis mb-2" />
                  <div class="text-medium-emphasis">No recipes in this category</div>
                  <v-btn
                    size="small"
                    variant="outlined"
                    color="primary"
                    class="mt-2"
                    @click="showCreateDialog"
                  >
                    Create First Recipe
                  </v-btn>
                </div>
                <div v-else class="items-grid">
                  <unified-recipe-item
                    v-for="recipe in getCategoryRecipes(category.value)"
                    :key="recipe.id"
                    :item="recipe"
                    type="recipe"
                    :cost-calculation="getCostCalculation(recipe.id)"
                    @view="viewItem"
                    @edit="editItem"
                    @duplicate="duplicateRecipe"
                    @calculate-cost="calculateCost"
                    @toggle-status="toggleStatus"
                  />
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>

        <!-- Preparations Tab -->
        <div v-if="activeTab === 'preparations'" class="preparations-section">
          <v-expansion-panels v-model="expandedPanels" multiple>
            <v-expansion-panel
              v-for="type in preparationTypes"
              :key="type.value"
              :value="type.value"
            >
              <v-expansion-panel-title>
                <div class="category-header">
                  <span class="category-header__name">
                    <v-chip size="small" variant="tonal" color="primary" class="mr-2">
                      {{ type.prefix }}
                    </v-chip>
                    {{ type.text }}
                  </span>
                  <v-chip
                    size="small"
                    variant="tonal"
                    :color="getTypePreparations(type.value).length > 0 ? 'primary' : 'grey'"
                  >
                    {{ getTypePreparations(type.value).length }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <div v-if="getTypePreparations(type.value).length === 0" class="empty-state">
                  <v-icon icon="mdi-chef-hat" size="48" class="text-medium-emphasis mb-2" />
                  <div class="text-medium-emphasis">No preparations in this category</div>
                  <v-btn
                    size="small"
                    variant="outlined"
                    color="primary"
                    class="mt-2"
                    @click="showCreateDialog"
                  >
                    Create First Preparation
                  </v-btn>
                </div>
                <!-- ✅ ИСПРАВЛЕНО: Полуфабрикаты теперь тоже в два столбца -->
                <div v-else class="items-grid">
                  <unified-recipe-item
                    v-for="preparation in getTypePreparations(type.value)"
                    :key="preparation.id"
                    :item="preparation"
                    type="preparation"
                    :cost-calculation="getCostCalculation(preparation.id)"
                    @view="viewItem"
                    @edit="editItem"
                    @calculate-cost="calculateCost"
                    @toggle-status="toggleStatus"
                  />
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </div>
    </v-card>

    <!-- Dialogs -->
    <unified-recipe-dialog
      v-model="dialogs.create"
      :type="activeTab === 'recipes' ? 'recipe' : 'preparation'"
      :item="editingItem"
      @saved="handleItemSaved"
    />

    <unified-view-dialog
      v-model="dialogs.view"
      :type="viewingItemType"
      :item="viewingItem"
      @edit="editItem"
      @calculate-cost="calculateCost"
    />

    <!-- Loading overlay -->
    <v-overlay v-model="store.loading" class="align-center justify-center">
      <v-progress-circular color="primary" indeterminate size="64" />
    </v-overlay>

    <!-- Snackbar for messages -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top right"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" icon="mdi-close" @click="snackbar.show = false" />
      </template>
    </v-snackbar>

    <!-- Duplicate dialog -->
    <v-dialog v-model="dialogs.duplicate" max-width="400px">
      <v-card>
        <v-card-title class="text-h6">Duplicate Recipe</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="duplicateName"
            label="New Recipe Name"
            :rules="[rules.required]"
            variant="outlined"
            autofocus
            @keyup.enter="confirmDuplicate"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogs.duplicate = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!duplicateName.trim()" @click="confirmDuplicate">
            Duplicate
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import { RECIPE_CATEGORIES, PREPARATION_TYPES } from '@/stores/recipes/types'
import type { Recipe, Preparation, RecipeCategory, PreparationType } from '@/stores/recipes/types'
import { DebugUtils } from '@/utils'
import UnifiedRecipeItem from './components/UnifiedRecipeItem.vue'
import UnifiedRecipeDialog from './components/UnifiedRecipeDialog.vue'
import UnifiedViewDialog from './components/UnifiedViewDialog.vue'
import RecipeFilters from './components/RecipeFilters.vue'

const MODULE_NAME = 'RecipesView'
const store = useRecipesStore()
const productsStore = useProductsStore()

// State
const activeTab = ref<'recipes' | 'preparations'>('recipes')
const expandedPanels = ref<string[]>([])

// Dialogs
const dialogs = ref({
  create: false,
  view: false,
  duplicate: false
})

const editingItem = ref<Recipe | Preparation | null>(null)
const viewingItem = ref<Recipe | Preparation | null>(null)
const viewingItemType = ref<'recipe' | 'preparation'>('recipe')
const duplicateRecipeRef = ref<Recipe | null>(null)
const duplicateName = ref('')

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Validation rules
const rules = {
  required: (value: string) => !!value?.trim() || 'Required field'
}

// Constants
const recipeCategories = RECIPE_CATEGORIES
const preparationTypes = PREPARATION_TYPES

// ✅ ОБНОВЛЕННЫЕ COMPUTED - будут управляться из RecipeFilters
const filteredRecipes = computed(() => store.activeRecipes)
const filteredPreparations = computed(() => store.activePreparations)

// Methods для подсчета
function getFilteredCount(): number {
  return activeTab.value === 'recipes'
    ? filteredRecipes.value.length
    : filteredPreparations.value.length
}

function getTotalCount(): number {
  return activeTab.value === 'recipes' ? store.recipes.length : store.preparations.length
}

// ✅ НОВЫЙ МЕТОД: Обработка переключения панелей из фильтров
function handleToggleAllPanels() {
  if (expandedPanels.value.length > 0) {
    // Сворачиваем все
    expandedPanels.value = []
  } else {
    // Разворачиваем все
    expandedPanels.value = [
      ...recipeCategories.map(c => c.value),
      ...preparationTypes.map(c => c.value)
    ]
  }
}

// Methods
function getCategoryRecipes(category: RecipeCategory): Recipe[] {
  return filteredRecipes.value.filter(recipe => recipe.category === category)
}

function getTypePreparations(type: PreparationType): Preparation[] {
  return filteredPreparations.value.filter(preparation => preparation.type === type)
}

// ✅ ИСПРАВЛЕНИЕ: Главная функция, которая вызывала ошибку
function getCostCalculation(itemId: string) {
  // Определяем тип по активной вкладке и используем правильные методы store
  if (activeTab.value === 'recipes') {
    return store.getRecipeCostCalculation(itemId)
  } else {
    return store.getPreparationCostCalculation(itemId)
  }
}

function showCreateDialog() {
  editingItem.value = null
  dialogs.value.create = true
}

function viewItem(item: Recipe | Preparation) {
  viewingItem.value = item

  // ✅ ИСПРАВЛЕНО: Правильное определение типа
  if ('components' in item && Array.isArray(item.components)) {
    viewingItemType.value = 'recipe'
  } else if ('recipe' in item && Array.isArray(item.recipe)) {
    viewingItemType.value = 'preparation'
  } else {
    // Fallback: если не можем определить по полям, используем другие признаки
    if ((item as any).category && (item as any).portionSize) {
      viewingItemType.value = 'recipe'
    } else if ((item as any).type && (item as any).outputQuantity) {
      viewingItemType.value = 'preparation'
    } else {
      // Последний fallback - по коду
      if (item.code?.startsWith('R-')) {
        viewingItemType.value = 'recipe'
      } else if (item.code?.startsWith('P-')) {
        viewingItemType.value = 'preparation'
      } else {
        // Совсем последний fallback
        viewingItemType.value = 'recipe'
      }
    }
  }

  DebugUtils.info('RecipesView', `🔍 Opening view dialog`, {
    itemName: item.name,
    detectedType: viewingItemType.value,
    hasComponents: 'components' in item,
    hasRecipe: 'recipe' in item,
    itemKeys: Object.keys(item)
  })

  dialogs.value.view = true
}

function editItem(item: Recipe | Preparation) {
  editingItem.value = item
  dialogs.value.create = true
}

async function duplicateRecipe(recipe: Recipe) {
  duplicateRecipeRef.value = recipe
  duplicateName.value = `${recipe.name} (Copy)`
  dialogs.value.duplicate = true
}

async function confirmDuplicate() {
  if (!duplicateRecipeRef.value || !duplicateName.value.trim()) return

  try {
    await store.duplicateRecipe(duplicateRecipeRef.value.id, duplicateName.value.trim())
    showSnackbar(`Recipe "${duplicateName.value}" created successfully`, 'success')
    dialogs.value.duplicate = false
    duplicateRecipeRef.value = null
    duplicateName.value = ''
  } catch (error) {
    showSnackbar('Failed to duplicate recipe', 'error')
    DebugUtils.error(MODULE_NAME, 'Failed to duplicate recipe', error)
  }
}

async function calculateCost(item: Recipe | Preparation) {
  try {
    if ('components' in item) {
      // Recipe
      const calculation = await store.calculateRecipeCost(item.id)
      if (calculation) {
        showSnackbar(
          `Cost calculated: $${calculation.totalCost.toFixed(2)} total, $${calculation.costPerPortion.toFixed(2)} per portion`,
          'success'
        )
      }
    } else {
      // Preparation
      const calculation = await store.calculatePreparationCost(item.id)
      if (calculation) {
        showSnackbar(
          `Cost calculated: $${calculation.totalCost.toFixed(2)} total, $${calculation.costPerOutputUnit.toFixed(2)} per unit`,
          'success'
        )
      }
    }
  } catch (error) {
    showSnackbar('Failed to calculate cost', 'error')
    DebugUtils.error(MODULE_NAME, 'Failed to calculate cost', error)
  }
}

async function toggleStatus(item: Recipe | Preparation) {
  try {
    if ('components' in item) {
      // Recipe
      await store.toggleRecipeStatus(item.id)
    } else {
      // Preparation
      await store.togglePreparationStatus(item.id)
    }

    const action = item.isActive ? 'archived' : 'restored'
    showSnackbar(`${item.name} ${action} successfully`, 'success')
  } catch (error) {
    showSnackbar('Failed to update status', 'error')
    DebugUtils.error(MODULE_NAME, 'Failed to toggle status', error)
  }
}

async function handleItemSaved(item: Recipe | Preparation) {
  dialogs.value.create = false
  editingItem.value = null

  const itemType = 'components' in item ? 'recipe' : 'preparation'
  const action = editingItem.value ? 'updated' : 'created'

  showSnackbar(`${item.name} ${action} successfully`, 'success')

  // ✅ ИСПРАВЛЕНИЕ: Не нужно fetchRecipes/fetchPreparations
  // Данные уже обновлены через composables
  DebugUtils.info(MODULE_NAME, `${itemType} ${action}`, { id: item.id, name: item.name })
}

function showSnackbar(message: string, color: 'success' | 'error' | 'info' = 'success') {
  snackbar.value = { show: true, message, color }
}

// Initialize
onMounted(async () => {
  DebugUtils.debug(MODULE_NAME, 'Component mounted')
  try {
    // Initialize both stores
    await Promise.all([
      store.initialize(),
      productsStore.loadProducts(true) // Use mock data
    ])

    // ✅ ИСПРАВЛЕНО: Expand all categories by default (следим за состоянием)
    expandedPanels.value = [
      ...recipeCategories.map(c => c.value),
      ...preparationTypes.map(c => c.value)
    ]

    DebugUtils.info(MODULE_NAME, 'Initialization complete', {
      recipes: store.activeRecipes.length,
      preparations: store.activePreparations.length,
      products: productsStore.products.length
    })
  } catch (error) {
    showSnackbar('Failed to initialize data', 'error')
    DebugUtils.error(MODULE_NAME, 'Failed to initialize', error)
  }
})
</script>

<style lang="scss" scoped>
.recipes-view {
  padding: 0;
}

.recipes-toolbar {
  margin-bottom: 1rem;
}

.recipes-content {
  padding: 24px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  &__name {
    display: flex;
    align-items: center;
    font-weight: 500;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
  padding: 16px 0;
}

// Responsive design
@media (max-width: 768px) {
  .items-grid {
    grid-template-columns: 1fr;
  }
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 8px 24px 24px;
}

:deep(.v-expansion-panel-title) {
  padding: 16px 24px;
}
</style>
