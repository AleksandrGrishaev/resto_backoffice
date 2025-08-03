<!-- src/views/recipes/RecipesView.vue -->
<template>
  <div class="recipes-view">
    <!-- Toolbar -->
    <div class="recipes-toolbar">
      <div class="recipes-toolbar__left">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Search recipes and ingredients..."
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
          <v-chip value="ingredients" variant="outlined">
            <v-icon icon="mdi-food-apple" start />
            Ingredients
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
          v-if="filterTabs === 'ingredients'"
          color="primary"
          prepend-icon="mdi-plus"
          @click="showCreateIngredientDialog"
        >
          New Ingredient
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

      <!-- Ingredients Tab -->
      <div v-if="filterTabs === 'ingredients'" class="ingredients-section">
        <v-expansion-panels v-model="expandedPanels" multiple>
          <v-expansion-panel
            v-for="category in ingredientCategories"
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
                  :color="getCategoryIngredients(category.value).length > 0 ? 'primary' : 'grey'"
                >
                  {{ getCategoryIngredients(category.value).length }}
                </v-chip>
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <div v-if="getCategoryIngredients(category.value).length === 0" class="empty-state">
                No ingredients in this category
              </div>
              <div v-else class="ingredients-list">
                <ingredient-item
                  v-for="ingredient in getCategoryIngredients(category.value)"
                  :key="ingredient.id"
                  :ingredient="ingredient"
                  @edit="editIngredient"
                  @view="viewIngredient"
                />
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </div>

    <!-- Dialogs -->
    <recipe-dialog v-model="dialogs.recipe" :recipe="editingRecipe" @saved="handleRecipeSaved" />

    <ingredient-dialog
      v-model="dialogs.ingredient"
      :ingredient="editingIngredient"
      @saved="handleIngredientSaved"
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
import { RECIPE_CATEGORIES, INGREDIENT_CATEGORIES } from '@/stores/recipes/types'
import type { Recipe, Ingredient, RecipeCategory, IngredientCategory } from '@/stores/recipes/types'
import { DebugUtils } from '@/utils'
import RecipeCard from './components/RecipeCard.vue'
import IngredientItem from './components/IngredientItem.vue'
import RecipeDialog from './components/RecipeDialog.vue'
import IngredientDialog from './components/IngredientDialog.vue'
import RecipeViewDialog from './components/RecipeViewDialog.vue'

const MODULE_NAME = 'RecipesView'
const store = useRecipesStore()

// State
const search = ref('')
const filterTabs = ref<'recipes' | 'ingredients'>('recipes')
const expandedPanels = ref<string[]>([])

// Dialogs
const dialogs = ref({
  recipe: false,
  ingredient: false,
  recipeView: false
})

const editingRecipe = ref<Recipe | null>(null)
const editingIngredient = ref<Ingredient | null>(null)
const viewingRecipe = ref<Recipe | null>(null)

// Constants
const recipeCategories = RECIPE_CATEGORIES
const ingredientCategories = INGREDIENT_CATEGORIES

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

const filteredIngredients = computed(() => {
  if (!search.value) return store.activeIngredients
  return store.activeIngredients.filter(
    ingredient =>
      ingredient.name.toLowerCase().includes(search.value.toLowerCase()) ||
      ingredient.code.toLowerCase().includes(search.value.toLowerCase()) ||
      ingredient.description?.toLowerCase().includes(search.value.toLowerCase())
  )
})

// Methods
function getCategoryRecipes(category: RecipeCategory): Recipe[] {
  return filteredRecipes.value.filter(recipe => recipe.category === category)
}

function getCategoryIngredients(category: IngredientCategory): Ingredient[] {
  return filteredIngredients.value.filter(ingredient => ingredient.category === category)
}

function showCreateRecipeDialog() {
  editingRecipe.value = null
  dialogs.value.recipe = true
}

function showCreateIngredientDialog() {
  editingIngredient.value = null
  dialogs.value.ingredient = true
}

function viewRecipe(recipe: Recipe) {
  viewingRecipe.value = recipe
  dialogs.value.recipeView = true
}

function editRecipe(recipe: Recipe) {
  editingRecipe.value = recipe
  dialogs.value.recipe = true
}

function editIngredient(ingredient: Ingredient) {
  editingIngredient.value = ingredient
  dialogs.value.ingredient = true
}

function viewIngredient(ingredient: Ingredient) {
  store.selectIngredient(ingredient)
  // Could open ingredient details dialog here
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

async function handleIngredientSaved() {
  dialogs.value.ingredient = false
  editingIngredient.value = null
  await store.fetchIngredients()
}

// Initialize
onMounted(async () => {
  DebugUtils.debug(MODULE_NAME, 'Component mounted')
  try {
    await store.initialize()
    // Expand all categories by default
    expandedPanels.value = [
      ...recipeCategories.map(c => c.value),
      ...ingredientCategories.map(c => c.value)
    ]
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize', error)
  }
})
</script>

<style lang="scss" scoped>
.recipes-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recipes-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  padding: 16px;
  border-radius: 8px;

  &__left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;

    .search-field {
      max-width: 400px;
    }
  }

  &__tabs {
    :deep(.v-chip) {
      &.v-chip--selected {
        opacity: 1;
      }

      &:not(.v-chip--selected) {
        opacity: 0.7;
      }
    }
  }

  &__right {
    display: flex;
    gap: 8px;
  }
}

.recipes-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
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

.recipes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding: 16px 0;
}

.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 0;
}

.empty-state {
  text-align: center;
  color: var(--text-secondary);
  padding: 32px;
  font-style: italic;
}

// Expansion panels styling
:deep(.v-expansion-panels) {
  .v-expansion-panel {
    background: var(--color-surface);
    margin-bottom: 8px;
    border-radius: 8px;

    .v-expansion-panel-title {
      padding: 16px 20px;
      min-height: 56px;

      &--active {
        min-height: 56px;
      }
    }

    .v-expansion-panel-text {
      .v-expansion-panel-text__wrapper {
        padding: 0 20px 16px;
      }
    }
  }
}

// Responsive design
@media (max-width: 768px) {
  .recipes-toolbar {
    flex-direction: column;
    align-items: stretch;

    &__left {
      flex-direction: column;
      gap: 12px;

      .search-field {
        max-width: none;
      }
    }

    &__right {
      justify-content: center;
    }
  }

  .recipes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
