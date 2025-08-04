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
          v-model="activeTab"
          selected-class="text-primary"
          mandatory
          class="recipes-toolbar__tabs"
        >
          <v-chip value="recipes" variant="outlined">
            <v-icon icon="mdi-book-open-page-variant" start />
            Recipes ({{ filteredRecipes.length }})
          </v-chip>
          <v-chip value="preparations" variant="outlined">
            <v-icon icon="mdi-chef-hat" start />
            Preparations ({{ filteredPreparations.length }})
          </v-chip>
        </v-chip-group>
      </div>

      <div class="recipes-toolbar__right">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog">
          New {{ activeTab === 'recipes' ? 'Recipe' : 'Preparation' }}
        </v-btn>
      </div>
    </div>

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
          <v-expansion-panel v-for="type in preparationTypes" :key="type.value" :value="type.value">
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
              <div v-else class="items-list">
                <unified-recipe-item
                  v-for="preparation in getTypePreparations(type.value)"
                  :key="preparation.id"
                  :item="preparation"
                  type="preparation"
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

    <!-- Dialogs -->
    <unified-recipe-dialog
      v-model="dialogs.create"
      :type="activeTab === 'recipes' ? 'recipe' : 'preparation'"
      :item="editingItem"
      @saved="handleItemSaved"
    />

    <!-- TODO: Unified view dialog for both types -->
    <unified-view-dialog
      v-model="dialogs.view"
      :type="viewingItemType"
      :item="viewingItem"
      @edit="editItem"
      @calculate-cost="calculateCost"
    />

    <!-- Loading overlay -->
    <v-overlay v-model="store.state.loading" class="align-center justify-center">
      <v-progress-circular color="primary" indeterminate size="64" />
    </v-overlay>

    <!-- Snackbar for messages -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="bottom right"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
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

const MODULE_NAME = 'RecipesView'
const store = useRecipesStore()
const productsStore = useProductsStore()

// State
const search = ref('')
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

function getTypePreparations(type: PreparationType): Preparation[] {
  return filteredPreparations.value.filter(preparation => preparation.type === type)
}

function getCostCalculation(itemId: string) {
  return store.state.costCalculations.get(itemId)
}

function showCreateDialog() {
  editingItem.value = null
  dialogs.value.create = true
}

function viewItem(item: Recipe | Preparation) {
  viewingItem.value = item
  viewingItemType.value = 'code' in item ? 'preparation' : 'recipe'
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
      // Preparation - TODO: implement preparation cost calculation
      showSnackbar('Preparation cost calculation not implemented yet', 'info')
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

  // Refresh data
  if (itemType === 'recipe') {
    await store.fetchRecipes()
  } else {
    await store.fetchPreparations()
  }
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

    // Expand all categories by default
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
  height: 100%;
  display: flex;
  flex-direction: column;
}

.recipes-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-outline-variant);

  &__left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
  }

  &__tabs {
    flex-shrink: 0;
  }

  .search-field {
    min-width: 300px;
    max-width: 400px;
  }
}

.recipes-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
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

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 0;
}

// Responsive design
@media (max-width: 768px) {
  .recipes-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;

    &__left {
      flex-direction: column;
      gap: 12px;
    }

    .search-field {
      min-width: auto;
      max-width: none;
    }
  }

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
