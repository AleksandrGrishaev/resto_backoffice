<!-- src/views/recipes/RecipesView.vue -->
<template>
  <div class="recipes-view">
    <!-- Toolbar -->
    <div class="recipes-toolbar">
      <div class="recipes-toolbar__left">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Search recipes and preparations..."
          clearable
          density="compact"
          hide-details
          class="search-field"
        />

        <v-chip-group
          v-model="filterTabs"
          selected-class="text-primary"
          mandatory
          class="recipes-toolbar__tabs"
        >
          <v-chip value="recipes" variant="outlined">
            <v-icon icon="mdi-book-open-page-variant" start />
            Recipes
          </v-chip>
          <v-chip value="preparations" variant="outlined">
            <v-icon icon="mdi-chef-hat" start />
            Preparations
          </v-chip>
        </v-chip-group>
      </div>

      <div class="recipes-toolbar__right">
        <v-btn
          v-if="filterTabs === 'recipes'"
          color="primary"
          prepend-icon="mdi-plus"
          @click="showCreateRecipeDialog"
        >
          New Recipe
        </v-btn>
        <v-btn
          v-if="filterTabs === 'preparations'"
          color="primary"
          prepend-icon="mdi-plus"
          @click="showCreatePreparationDialog"
        >
          New Preparation
        </v-btn>
      </div>
    </div>

    <!-- Content -->
    <div class="recipes-content">
      <!-- Recipes Tab -->
      <div v-if="filterTabs === 'recipes'" class="recipes-section">
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
                No recipes in this category
              </div>
              <div v-else class="recipes-grid">
                <recipe-card
                  v-for="recipe in getCategoryRecipes(category.value)"
                  :key="recipe.id"
                  :recipe="recipe"
                  @view="viewRecipe"
                  @edit="editRecipe"
                  @duplicate="duplicateRecipe"
                  @calculate-cost="calculateCost"
                />
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <!-- Preparations Tab -->
      <div v-if="filterTabs === 'preparations'" class="preparations-section">
        <v-expansion-panels v-model="expandedPanels" multiple>
          <v-expansion-panel
            v-for="category in preparationCategories"
            :key="category.value"
            :value="category.value"
          >
            <v-expansion-panel-title>
              <div class="category-header">
                <span class="category-header__name">
                  <v-chip size="small" variant="tonal" color="primary" class="mr-2">
                    {{ category.prefix }}
                  </v-chip>
                  {{ category.text }}
                </span>
                <v-chip
                  size="small"
                  variant="tonal"
                  :color="getCategoryPreparations(category.value).length > 0 ? 'primary' : 'grey'"
                >
                  {{ getCategoryPreparations(category.value).length }}
                </v-chip>
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <div v-if="getCategoryPreparations(category.value).length === 0" class="empty-state">
                No preparations in this category
              </div>
              <div v-else class="preparations-list">
                <preparation-item
                  v-for="preparation in getCategoryPreparations(category.value)"
                  :key="preparation.id"
                  :preparation="preparation"
                  @edit="editPreparation"
                  @view="viewPreparation"
                />
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </div>

    <!-- Dialogs -->
    <recipe-dialog v-model="dialogs.recipe" :recipe="editingRecipe" @saved="handleRecipeSaved" />

    <preparation-dialog
      v-model="dialogs.preparation"
      :preparation="editingPreparation"
      @saved="handlePreparationSaved"
    />

    <recipe-view-dialog v-model="dialogs.recipeView" :recipe="viewingRecipe" />

    <!-- Loading overlay -->
    <v-overlay v-model="store.state.loading" class="align-center justify-center">
      <v-progress-circular color="primary" indeterminate size="64" />
    </v-overlay>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore' // НОВОЕ
import { RECIPE_CATEGORIES, PREPARATION_CATEGORIES } from '@/stores/recipes/types'
import type { Recipe, Preparation, RecipeCategory, PreparationType } from '@/stores/recipes/types'
import { DebugUtils } from '@/utils'
import RecipeCard from './components/RecipeCard.vue'
import PreparationItem from './components/PreparationItem.vue'
import RecipeDialog from './components/RecipeDialog.vue'
import PreparationDialog from './components/PreparationDialog.vue'
import RecipeViewDialog from './components/RecipeViewDialog.vue'

const MODULE_NAME = 'RecipesView'
const store = useRecipesStore()
const productsStore = useProductsStore() // НОВОЕ

// State
const search = ref('')
const filterTabs = ref<'recipes' | 'preparations'>('recipes')
const expandedPanels = ref<string[]>([])

// Dialogs
const dialogs = ref({
  recipe: false,
  preparation: false,
  recipeView: false
})

const editingRecipe = ref<Recipe | null>(null)
const editingPreparation = ref<Preparation | null>(null)
const viewingRecipe = ref<Recipe | null>(null)

// Constants
const recipeCategories = RECIPE_CATEGORIES
const preparationCategories = PREPARATION_CATEGORIES

// Computed
const filteredRecipes = computed(() => {
  if (!search.value) return store.activeRecipes
  return store.activeRecipes.filter(
    recipe =>
      recipe.name.toLowerCase().includes(search.value.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(search.value.toLowerCase()) ||
      recipe.tags?.some(tag => tag.toLowerCase().includes(search.value.toLowerCase()))
  )
})

const filteredPreparations = computed(() => {
  if (!search.value) return store.activePreparations
  return store.activePreparations.filter(
    preparation =>
      preparation.name.toLowerCase().includes(search.value.toLowerCase()) ||
      preparation.code.toLowerCase().includes(search.value.toLowerCase()) ||
      preparation.description?.toLowerCase().includes(search.value.toLowerCase())
  )
})

// Methods
function getCategoryRecipes(category: RecipeCategory): Recipe[] {
  return filteredRecipes.value.filter(recipe => recipe.category === category)
}

function getCategoryPreparations(category: PreparationType): Preparation[] {
  return filteredPreparations.value.filter(preparation => preparation.category === category)
}

function showCreateRecipeDialog() {
  editingRecipe.value = null
  dialogs.value.recipe = true
}

function showCreatePreparationDialog() {
  editingPreparation.value = null
  dialogs.value.preparation = true
}

function viewRecipe(recipe: Recipe) {
  viewingRecipe.value = recipe
  dialogs.value.recipeView = true
}

function editRecipe(recipe: Recipe) {
  editingRecipe.value = recipe
  dialogs.value.recipe = true
}

function editPreparation(preparation: Preparation) {
  editingPreparation.value = preparation
  dialogs.value.preparation = true
}

function viewPreparation(preparation: Preparation) {
  store.selectPreparation(preparation)
  // Could open preparation details dialog here
}

async function duplicateRecipe(recipe: Recipe) {
  try {
    const newName = `${recipe.name} (Copy)`
    await store.duplicateRecipe(recipe.id, newName)
    DebugUtils.info(MODULE_NAME, 'Recipe duplicated successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to duplicate recipe', error)
  }
}

async function calculateCost(recipe: Recipe) {
  try {
    const calculation = await store.calculateRecipeCost(recipe.id)
    if (calculation) {
      DebugUtils.info(MODULE_NAME, 'Cost calculated', {
        recipe: recipe.name,
        cost: calculation.totalCost,
        costPerPortion: calculation.costPerPortion
      })
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to calculate cost', error)
  }
}

async function handleRecipeSaved() {
  dialogs.value.recipe = false
  editingRecipe.value = null
  await store.fetchRecipes()
}

async function handlePreparationSaved() {
  dialogs.value.preparation = false
  editingPreparation.value = null
  await store.fetchPreparations()
}

// Initialize
onMounted(async () => {
  DebugUtils.debug(MODULE_NAME, 'Component mounted')
  try {
    // Инициализируем оба store
    await Promise.all([
      store.initialize(),
      productsStore.loadProducts(true) // ИСПРАВЛЕНО: используем loadProducts с флагом mock=true
    ])

    // Expand all categories by default
    expandedPanels.value = [
      ...recipeCategories.map(c => c.value),
      ...preparationCategories.map(c => c.value)
    ]
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize', error)
  }
})
</script>

<style lang="scss" scoped>
// Тот же CSS что и раньше, только заменяем ingredients на preparations
.preparations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 0;
}

// Остальные стили остаются без изменений...
</style>
