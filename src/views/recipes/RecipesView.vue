<!-- src/views/recipes/RecipesView.vue - С РАБОЧИМИ ФИЛЬТРАМИ -->
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
          <div class="d-flex align-center ga-2">
            <!-- Actions Menu -->
            <v-menu location="bottom end">
              <template #activator="{ props }">
                <v-btn v-bind="props" variant="outlined" prepend-icon="mdi-menu" size="large">
                  Actions
                  <v-icon end>mdi-chevron-down</v-icon>
                </v-btn>
              </template>
              <v-list density="comfortable">
                <v-list-item
                  prepend-icon="mdi-shape-plus"
                  title="New Category"
                  @click="showCreateCategoryDialog"
                />
                <v-list-item
                  prepend-icon="mdi-calculator-variant"
                  title="Recalculate All Costs"
                  :disabled="isRecalculating"
                  @click="dialogs.recalculate = true"
                />
                <v-list-item
                  prepend-icon="mdi-file-pdf-box"
                  title="Export PDF"
                  :disabled="isExporting"
                  @click="dialogs.export = true"
                />
              </v-list>
            </v-menu>

            <!-- New Recipe/Preparation Button -->
            <v-btn color="primary" prepend-icon="mdi-plus" size="large" @click="showCreateDialog">
              New {{ activeTab === 'recipes' ? 'Recipe' : 'Preparation' }}
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </div>

    <!-- ✅ ИСПРАВЛЕНО: Фильтры с правильными event handlers -->
    <RecipeFilters
      v-model:active-tab="activeTab"
      @toggle-all-panels="handleToggleAllPanels"
      @update:filters="handleFiltersUpdate"
    />

    <!-- Список рецептов и полуфабрикатов -->
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon start>
          {{ activeTab === 'recipes' ? 'mdi-book-open-page-variant' : 'mdi-chef-hat' }}
        </v-icon>
        {{ activeTab === 'recipes' ? 'Recipes' : 'Preparations' }} List
        <v-spacer />
        <div class="d-flex align-center ga-2">
          <!-- ✅ ИСПРАВЛЕНО: Правильный подсчет отфильтрованных элементов -->
          <v-chip
            :color="getFilteredCount() > 0 ? 'primary' : 'default'"
            variant="outlined"
            size="small"
          >
            {{ getFilteredCount() }} of {{ getTotalCount() }}
          </v-chip>

          <!-- ✅ НОВОЕ: Индикатор активных фильтров -->
          <v-chip
            v-if="hasActiveFilters"
            color="warning"
            variant="tonal"
            size="small"
            prepend-icon="mdi-filter"
          >
            Filtered
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

      <!-- ✅ НОВОЕ: Empty state when no results after filtering -->
      <div
        v-if="getFilteredCount() === 0 && !store.loading"
        class="empty-filtered-state pa-8 text-center"
      >
        <v-icon icon="mdi-filter-remove" size="64" class="text-medium-emphasis mb-4" />
        <h3 class="text-h6 mb-2">No {{ activeTab }} found</h3>
        <p class="text-body-2 text-medium-emphasis mb-4">
          <span v-if="hasActiveFilters">Try adjusting your filters or search criteria</span>
          <span v-else>No {{ activeTab }} available in this category</span>
        </p>
        <div class="d-flex gap-2 justify-center">
          <v-btn v-if="hasActiveFilters" variant="outlined" @click="clearAllFilters">
            Clear Filters
          </v-btn>
          <v-btn color="primary" @click="showCreateDialog">
            Create First {{ activeTab.slice(0, -1) }}
          </v-btn>
        </div>
      </div>

      <!-- Content -->
      <div v-else class="recipes-content">
        <!-- Recipes Tab -->
        <div v-if="activeTab === 'recipes'" class="recipes-section">
          <!-- Flat list when searching -->
          <div v-if="isSearchActive" class="items-grid">
            <unified-recipe-item
              v-for="recipe in filteredRecipes"
              :key="recipe.id"
              :item="recipe"
              type="recipe"
              :cost-calculation="getCostCalculation(recipe.id)"
              @view="viewItem"
              @edit="editItem"
              @duplicate="duplicateItem"
              @calculate-cost="calculateCost"
              @toggle-status="toggleStatus"
            />
          </div>

          <!-- Categorized view when not searching -->
          <v-expansion-panels v-else v-model="expandedPanels" multiple>
            <v-expansion-panel
              v-for="category in recipeCategories"
              :key="category.value"
              :value="category.value"
            >
              <v-expansion-panel-title>
                <div class="category-header">
                  <span class="category-header__name">
                    <v-icon :icon="category.icon" size="20" class="mr-2" />
                    {{ category.text }}
                  </span>
                  <div class="d-flex align-center ga-2">
                    <v-chip
                      size="small"
                      variant="tonal"
                      :color="getCategoryRecipes(category.value).length > 0 ? 'primary' : 'grey'"
                    >
                      {{ getCategoryRecipes(category.value).length }}
                    </v-chip>
                    <!-- Category Actions Menu -->
                    <v-menu>
                      <template #activator="{ props: menuProps }">
                        <v-btn
                          icon="mdi-dots-vertical"
                          variant="text"
                          size="small"
                          v-bind="menuProps"
                          @click.stop
                        />
                      </template>
                      <v-list>
                        <v-list-item @click="editRecipeCategory(category.value)">
                          <template #prepend>
                            <v-icon icon="mdi-pencil" />
                          </template>
                          <v-list-item-title>Edit Category</v-list-item-title>
                        </v-list-item>
                        <v-divider />
                        <v-list-item
                          class="text-error"
                          @click="deleteRecipeCategoryConfirm(category.value)"
                        >
                          <template #prepend>
                            <v-icon icon="mdi-delete" />
                          </template>
                          <v-list-item-title>Delete Category</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <div v-if="getCategoryRecipes(category.value).length === 0" class="empty-state">
                  <v-icon icon="mdi-chef-hat" size="48" class="text-medium-emphasis mb-2" />
                  <div class="text-medium-emphasis">
                    {{
                      hasActiveFilters
                        ? 'No recipes match current filters'
                        : 'No recipes in this category'
                    }}
                  </div>
                  <v-btn
                    v-if="!hasActiveFilters"
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
                    @duplicate="duplicateItem"
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
          <!-- Flat list when searching -->
          <div v-if="isSearchActive" class="items-grid">
            <unified-recipe-item
              v-for="preparation in filteredPreparations"
              :key="preparation.id"
              :item="preparation"
              type="preparation"
              :cost-calculation="getCostCalculation(preparation.id)"
              @view="viewItem"
              @edit="editItem"
              @duplicate="duplicateItem"
              @calculate-cost="calculateCost"
              @toggle-status="toggleStatus"
            />
          </div>

          <!-- Categorized view when not searching -->
          <v-expansion-panels v-else v-model="expandedPanels" multiple>
            <v-expansion-panel
              v-for="type in preparationTypes"
              :key="type.value"
              :value="type.value"
            >
              <v-expansion-panel-title>
                <div class="category-header">
                  <span class="category-header__name">
                    <v-icon :icon="type.icon" size="20" class="mr-2" />
                    {{ type.text }}
                  </span>
                  <div class="d-flex align-center ga-2">
                    <v-chip
                      size="small"
                      variant="tonal"
                      :color="getTypePreparations(type.value).length > 0 ? 'primary' : 'grey'"
                    >
                      {{ getTypePreparations(type.value).length }}
                    </v-chip>
                    <!-- Category Actions Menu -->
                    <v-menu>
                      <template #activator="{ props: menuProps }">
                        <v-btn
                          icon="mdi-dots-vertical"
                          variant="text"
                          size="small"
                          v-bind="menuProps"
                          @click.stop
                        />
                      </template>
                      <v-list>
                        <v-list-item @click="editPreparationCategory(type.value)">
                          <template #prepend>
                            <v-icon icon="mdi-pencil" />
                          </template>
                          <v-list-item-title>Edit Category</v-list-item-title>
                        </v-list-item>
                        <v-divider />
                        <v-list-item
                          class="text-error"
                          @click="deletePreparationCategoryConfirm(type.value)"
                        >
                          <template #prepend>
                            <v-icon icon="mdi-delete" />
                          </template>
                          <v-list-item-title>Delete Category</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <div v-if="getTypePreparations(type.value).length === 0" class="empty-state">
                  <v-icon icon="mdi-chef-hat" size="48" class="text-medium-emphasis mb-2" />
                  <div class="text-medium-emphasis">
                    {{
                      hasActiveFilters
                        ? 'No preparations match current filters'
                        : 'No preparations in this category'
                    }}
                  </div>
                  <v-btn
                    v-if="!hasActiveFilters"
                    size="small"
                    variant="outlined"
                    color="primary"
                    class="mt-2"
                    @click="showCreateDialog"
                  >
                    Create First Preparation
                  </v-btn>
                </div>
                <div v-else class="items-grid">
                  <unified-recipe-item
                    v-for="preparation in getTypePreparations(type.value)"
                    :key="preparation.id"
                    :item="preparation"
                    type="preparation"
                    :cost-calculation="getCostCalculation(preparation.id)"
                    @view="viewItem"
                    @edit="editItem"
                    @duplicate="duplicateItem"
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
    <v-overlay :model-value="store.loading" class="align-center justify-center" persistent>
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
        <v-card-title class="text-h6">
          Duplicate {{ duplicateItemType === 'recipe' ? 'Recipe' : 'Preparation' }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="duplicateName"
            :label="`New ${duplicateItemType === 'recipe' ? 'Recipe' : 'Preparation'} Name`"
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

    <!-- Usage Warning Dialog -->
    <usage-warning-dialog
      v-model="dialogs.usageWarning"
      :item-name="usageWarning.itemName"
      :item-type="usageWarning.itemType"
      :usage-locations="usageWarning.usageLocations"
    />

    <!-- Recalculate All Costs Confirmation Dialog -->
    <v-dialog v-model="dialogs.recalculate" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="warning">mdi-calculator-variant</v-icon>
          Recalculate All Costs
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" class="mb-4">
            <div class="text-subtitle-2 mb-2">This will recalculate costs for:</div>
            <ul class="ml-4">
              <li>{{ store.preparations.length }} preparations</li>
              <li>{{ store.recipes.length }} recipes</li>
            </ul>
          </v-alert>
          <p class="text-body-1">
            This operation will recalculate all preparation and recipe costs based on current
            product prices and component quantities, then save the updated costs to the database.
          </p>
          <p class="text-body-2 text-medium-emphasis mt-2">
            This may take a few moments depending on the number of recipes and preparations.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogs.recalculate = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="isRecalculating"
            @click="handleRecalculateCosts"
          >
            Recalculate Now
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Export Options Dialog -->
    <ExportOptionsDialog
      v-model="dialogs.export"
      :export-type="activeTab === 'recipes' ? 'recipes' : 'preparations'"
      @export="handleExportPdf"
    />

    <!-- Category Dialog -->
    <CategoryDialog
      v-model="dialogs.category"
      :type="activeTab === 'recipes' ? 'recipe' : 'preparation'"
      :category="editingCategory"
      @save="handleCategorySaved"
    />

    <!-- Delete Category Confirmation Dialog -->
    <v-dialog v-model="dialogs.deleteCategory" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center ga-2 bg-error-darken-1">
          <v-icon color="white">mdi-alert</v-icon>
          <span class="text-white">Delete Category</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="text-body-1">Are you sure you want to delete this category?</p>
          <v-alert type="info" variant="tonal" class="mt-4">
            <div class="text-body-2">
              <strong>Category is not in use</strong>
              <br />
              This category can be safely deleted as it's not currently used by any {{ activeTab }}.
            </div>
          </v-alert>
          <v-alert type="warning" variant="tonal" class="mt-2">
            This action cannot be undone.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogs.deleteCategory = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDeleteCategory">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import { useUsageCheck } from '@/stores/recipes/composables/useUsageCheck'
import { useCategoryUsageCheck } from '@/stores/recipes/composables/useCategoryUsageCheck'
import { useExport, ExportOptionsDialog } from '@/core/export'
import type {
  RecipeExportData,
  PreparationExportData,
  RecipeCategoryExport,
  PreparationCategoryExport,
  RecipeDepartmentExport,
  PreparationDepartmentExport,
  DepartmentFilter
} from '@/core/export'
import type {
  Recipe,
  Preparation,
  PreparationType,
  RecipeComponent,
  PreparationIngredient,
  PreparationCategory,
  RecipeCategory
} from '@/stores/recipes/types'
import type {
  CreatePreparationCategoryData,
  CreateRecipeCategoryData
} from '@/stores/recipes/composables/useCategoryManagement'
import type { UsageLocation } from '@/stores/recipes/composables/useUsageCheck'
import { DebugUtils } from '@/utils'
import UnifiedRecipeItem from './components/UnifiedRecipeItem.vue'
import UnifiedRecipeDialog from './components/UnifiedRecipeDialog.vue'
import UnifiedViewDialog from './components/UnifiedViewDialog.vue'
import RecipeFilters from './components/RecipeFilters.vue'
import UsageWarningDialog from './components/UsageWarningDialog.vue'
import CategoryDialog from './components/CategoryDialog.vue'

const MODULE_NAME = 'RecipesView'
const store = useRecipesStore()
const productsStore = useProductsStore()
const { checkRecipeUsage, checkPreparationUsage } = useUsageCheck()
const { checkPreparationCategoryUsage, checkRecipeCategoryUsage } = useCategoryUsageCheck()
const { isExporting, exportRecipes, exportPreparations } = useExport()

// =============================================
// STATE
// =============================================

const activeTab = ref<'recipes' | 'preparations'>('recipes')
const expandedPanels = ref<string[]>([])

// ✅ НОВОЕ: Filter state
const currentFilters = ref({
  search: '',
  status: 'active' as 'active' | 'archived' | 'all',
  department: 'all' as 'kitchen' | 'bar' | 'all'
})

// Dialogs
const dialogs = ref({
  create: false,
  view: false,
  duplicate: false,
  usageWarning: false,
  export: false,
  recalculate: false,
  category: false,
  deleteCategory: false
})

// Usage warning state
const usageWarning = ref({
  itemName: '',
  itemType: 'Recipe' as 'Recipe' | 'Preparation',
  usageLocations: [] as UsageLocation[]
})

const editingItem = ref<Recipe | Preparation | null>(null)
const viewingItem = ref<Recipe | Preparation | null>(null)
const viewingItemType = ref<'recipe' | 'preparation'>('recipe')
const duplicateItemRef = ref<Recipe | Preparation | null>(null)
const duplicateItemType = ref<'recipe' | 'preparation'>('recipe')
const duplicateName = ref('')

// Category management state
const editingCategory = ref<PreparationCategory | RecipeCategory | null>(null)
const deletingCategoryId = ref<string | null>(null)
const categoryUsageInfo = ref<{ categoryId: string; count: number } | null>(null)
// Cache для проверок использования категорий (чтобы не делать лишние запросы)
const categoryUsageCache = ref<
  Map<string, { canDelete: boolean; count: number; timestamp: number }>
>(new Map())

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success' as 'success' | 'error' | 'info'
})

// Recalculation state
const isRecalculating = ref(false)

// Validation rules
const rules = {
  required: (value: string) => !!value?.trim() || 'Required field'
}

// ✅ NEW: Load categories from store
const recipeCategories = computed(() =>
  store.activeRecipeCategories.map(cat => ({
    value: cat.id,
    text: cat.name,
    icon: cat.icon || 'mdi-chef-hat'
  }))
)

const preparationTypes = computed(() =>
  store.activePreparationCategories.map(cat => ({
    value: cat.id,
    text: cat.name,
    icon: cat.icon || 'mdi-food-variant',
    emoji: cat.emoji
  }))
)

// ✅ Helper functions for preparation categories
const getPreparationCategoryName = (categoryId: string) =>
  store.getPreparationCategoryName(categoryId)

const getPreparationCategoryColor = (categoryId: string) =>
  store.getPreparationCategoryColor(categoryId)

const getPreparationCategoryEmoji = (categoryId: string) =>
  store.getPreparationCategoryEmoji(categoryId)

// ✅ Helper functions for recipe categories
const getRecipeCategoryName = (categoryId: string) => store.getRecipeCategoryName(categoryId)

const getRecipeCategoryColor = (categoryId: string) => store.getRecipeCategoryColor(categoryId)

const getRecipeCategoryIcon = (categoryId: string) => store.getRecipeCategoryIcon(categoryId)

// =============================================
// COMPUTED PROPERTIES
// =============================================

// ✅ ИСПРАВЛЕНО: Filtered data based on current filters
const filteredRecipes = computed(() => {
  let recipes = store.recipes

  // Filter by status
  if (currentFilters.value.status === 'active') {
    recipes = recipes.filter(r => r.isActive)
  } else if (currentFilters.value.status === 'archived') {
    recipes = recipes.filter(r => !r.isActive)
  }
  // 'all' shows everything

  // ✅ NEW: Filter by department
  if (currentFilters.value.department && currentFilters.value.department !== 'all') {
    recipes = recipes.filter(r => r.department === currentFilters.value.department)
  }

  // Filter by search
  if (currentFilters.value.search.trim()) {
    const searchText = currentFilters.value.search.toLowerCase()
    recipes = recipes.filter(
      recipe =>
        recipe.name?.toLowerCase().includes(searchText) ||
        recipe.code?.toLowerCase().includes(searchText) ||
        recipe.description?.toLowerCase().includes(searchText) ||
        recipe.tags?.some(tag => tag?.toLowerCase().includes(searchText))
    )
  }

  return recipes
})

const filteredPreparations = computed(() => {
  let preparations = store.preparations

  // Filter by status
  if (currentFilters.value.status === 'active') {
    preparations = preparations.filter(p => p.isActive)
  } else if (currentFilters.value.status === 'archived') {
    preparations = preparations.filter(p => !p.isActive)
  }
  // 'all' shows everything

  // Filter by department
  if (currentFilters.value.department && currentFilters.value.department !== 'all') {
    preparations = preparations.filter(p => p.department === currentFilters.value.department)
  }

  // Filter by search
  if (currentFilters.value.search.trim()) {
    const searchText = currentFilters.value.search.toLowerCase()
    preparations = preparations.filter(
      prep =>
        prep.name?.toLowerCase().includes(searchText) ||
        prep.code?.toLowerCase().includes(searchText) ||
        prep.description?.toLowerCase().includes(searchText)
    )
  }

  return preparations
})

// ✅ НОВОЕ: Check if filters are active
const hasActiveFilters = computed(() => {
  return (
    currentFilters.value.search.trim() !== '' ||
    currentFilters.value.status !== 'active' ||
    currentFilters.value.department !== 'all'
  )
})

// ✅ НОВОЕ: Check if search is active (determines flat list vs categorized view)
const isSearchActive = computed(() => {
  return currentFilters.value.search.trim() !== ''
})

// =============================================
// METHODS FOR COUNTS
// =============================================

function getFilteredCount(): number {
  return activeTab.value === 'recipes'
    ? filteredRecipes.value.length
    : filteredPreparations.value.length
}

function getTotalCount(): number {
  return activeTab.value === 'recipes' ? store.recipes.length : store.preparations.length
}

// =============================================
// METHODS FOR CATEGORIZED DATA
// =============================================

function getCategoryRecipes(categoryId: string): Recipe[] {
  return filteredRecipes.value.filter(recipe => recipe.category === categoryId)
}

function getTypePreparations(type: string): Preparation[] {
  // Handle 'all' filter
  if (type === 'all') {
    return filteredPreparations.value
  }
  // Filter by category UUID
  return filteredPreparations.value.filter(preparation => preparation.type === type)
}

// =============================================
// FILTER METHODS
// =============================================

function handleFiltersUpdate(filters: {
  search: string
  status: 'active' | 'archived' | 'all'
  department?: 'kitchen' | 'bar' | 'all'
}) {
  currentFilters.value = { ...filters, department: filters.department || 'all' }

  DebugUtils.debug(MODULE_NAME, 'Filters updated', {
    filters,
    filteredCount: getFilteredCount(),
    totalCount: getTotalCount()
  })
}

function clearAllFilters() {
  currentFilters.value = {
    search: '',
    status: 'active',
    department: 'all'
  }

  showSnackbar('Filters cleared', 'info')
}

function handleToggleAllPanels() {
  if (expandedPanels.value.length > 0) {
    // Collapse all
    expandedPanels.value = []
  } else {
    // Expand all
    expandedPanels.value = [
      ...recipeCategories.value.map(c => c.value),
      ...preparationTypes.value.map(c => c.value)
    ]
  }
}

// =============================================
// EXISTING METHODS
// =============================================

function getCostCalculation(itemId: string) {
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

  // Determine type
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

async function duplicateItem(item: Recipe | Preparation) {
  duplicateItemRef.value = item
  // Определяем тип элемента
  duplicateItemType.value = 'components' in item ? 'recipe' : 'preparation'
  duplicateName.value = `${item.name} (Copy)`
  dialogs.value.duplicate = true
}

async function confirmDuplicate() {
  if (!duplicateItemRef.value || !duplicateName.value.trim()) return

  try {
    if (duplicateItemType.value === 'recipe') {
      await store.duplicateRecipe(duplicateItemRef.value.id, duplicateName.value.trim())
      showSnackbar(`Recipe "${duplicateName.value}" created successfully`, 'success')
    } else {
      await store.duplicatePreparation(duplicateItemRef.value.id, duplicateName.value.trim())
      showSnackbar(`Preparation "${duplicateName.value}" created successfully`, 'success')
    }

    dialogs.value.duplicate = false
    duplicateItemRef.value = null
    duplicateName.value = ''
  } catch (error) {
    const itemType = duplicateItemType.value === 'recipe' ? 'recipe' : 'preparation'
    showSnackbar(`Failed to duplicate ${itemType}`, 'error')
    DebugUtils.error(MODULE_NAME, `Failed to duplicate ${itemType}`, error)
  }
}

async function calculateCost(item: Recipe | Preparation) {
  try {
    if ('components' in item) {
      // Recipe
      const calculation = await store.calculateRecipeCost(item.id)
      if (calculation) {
        showSnackbar(
          `Cost calculated: ${calculation.totalCost.toFixed(2)} IDR total, ${calculation.costPerPortion.toFixed(2)} IDR per portion`,
          'success'
        )
      }
    } else {
      // Preparation
      const calculation = await store.calculatePreparationCost(item.id)
      if (calculation) {
        showSnackbar(
          `Cost calculated: ${calculation.totalCost.toFixed(2)} IDR total, ${calculation.costPerOutputUnit.toFixed(2)} IDR per unit`,
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
    // Если пытаемся архивировать (item.isActive === true), проверяем использование
    if (item.isActive) {
      const isRecipe = 'components' in item
      const usageResult = isRecipe ? checkRecipeUsage(item.id) : checkPreparationUsage(item.id)

      // Если элемент используется, показываем предупреждение
      if (!usageResult.canArchive) {
        usageWarning.value = {
          itemName: item.name,
          itemType: isRecipe ? 'Recipe' : 'Preparation',
          usageLocations: usageResult.usageLocations
        }
        dialogs.value.usageWarning = true

        DebugUtils.info(MODULE_NAME, `Cannot archive ${isRecipe ? 'recipe' : 'preparation'}`, {
          itemName: item.name,
          usageCount: usageResult.usageLocations.length,
          usageLocations: usageResult.usageLocations
        })
        return // Прерываем архивирование
      }
    }

    // Если не используется или восстанавливаем, продолжаем
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

  // Очищаем кэш использования категорий
  invalidateCategoryUsageCache()

  DebugUtils.info(MODULE_NAME, `${itemType} ${action}`, { id: item.id, name: item.name })
}

function showSnackbar(message: string, color: 'success' | 'error' | 'info' = 'success') {
  snackbar.value = { show: true, message, color }
}

// =============================================
// PDF EXPORT
// =============================================

async function handleExportPdf(options: { department: DepartmentFilter }) {
  try {
    const departmentFilter = options.department

    // Helper to find component name and cost
    const getComponentInfo = (
      componentId: string,
      componentType: 'product' | 'preparation',
      quantity: number
    ): { name: string; cost: number } => {
      if (componentType === 'product') {
        const product = productsStore.products.find(p => p.id === componentId)
        return {
          name: product?.name || 'Unknown Product',
          cost: (product?.baseCostPerUnit || 0) * quantity
        }
      } else {
        // It's a preparation (nested)
        const prep = store.preparations.find(p => p.id === componentId)
        const prepCost = store.getPreparationCostCalculation(componentId)
        return {
          name: prep?.name || 'Unknown Preparation',
          cost: (prepCost?.costPerOutputUnit || 0) * quantity
        }
      }
    }

    // Build category names from store
    const categoryNames: Record<string, string> = {
      uncategorized: 'Uncategorized',
      other: 'Other'
    }
    for (const cat of store.activeRecipeCategories) {
      categoryNames[cat.id] = cat.name
    }
    for (const cat of store.activePreparationCategories) {
      categoryNames[cat.id] = cat.name
    }

    // Helper to build recipe categories for a specific department
    const buildRecipeCategories = (recipes: Recipe[]): RecipeCategoryExport[] => {
      const recipesByCategory = new Map<string, Recipe[]>()

      for (const recipe of recipes) {
        const categoryKey = recipe.category || 'uncategorized'
        if (!recipesByCategory.has(categoryKey)) {
          recipesByCategory.set(categoryKey, [])
        }
        recipesByCategory.get(categoryKey)!.push(recipe)
      }

      return Array.from(recipesByCategory.entries())
        .map(([categoryKey, catRecipes]) => ({
          name: categoryNames[categoryKey] || 'Unknown Category',
          recipes: catRecipes.map((recipe: Recipe) => {
            const costCalc = store.getRecipeCostCalculation(recipe.id)
            return {
              id: recipe.id,
              name: recipe.name,
              category: recipe.category,
              outputQuantity: recipe.portionSize || 1,
              outputUnit: recipe.portionUnit || 'portion',
              costPerUnit: costCalc?.costPerPortion || 0,
              totalCost: costCalc?.totalCost || 0,
              components: (recipe.components || []).map((comp: RecipeComponent) => {
                const info = getComponentInfo(comp.componentId, comp.componentType, comp.quantity)
                return {
                  name: info.name,
                  type: comp.componentType,
                  quantity: comp.quantity,
                  unit: comp.unit,
                  cost: info.cost
                }
              }),
              instructions: recipe.instructions
            }
          })
        }))
        .filter(cat => cat.recipes.length > 0)
    }

    // Helper to build preparation categories for a specific department
    const buildPreparationCategories = (preps: Preparation[]): PreparationCategoryExport[] => {
      const prepsByType = new Map<string, Preparation[]>()

      for (const prep of preps) {
        const typeKey = prep.type || 'other'
        if (!prepsByType.has(typeKey)) {
          prepsByType.set(typeKey, [])
        }
        prepsByType.get(typeKey)!.push(prep)
      }

      return Array.from(prepsByType.entries())
        .map(([typeKey, catPreps]) => ({
          name: categoryNames[typeKey] || 'Unknown Category',
          preparations: catPreps.map((prep: Preparation) => {
            const costCalc = store.getPreparationCostCalculation(prep.id)
            return {
              id: prep.id,
              name: prep.name,
              category: prep.type,
              portionType: (prep.portionType || 'weight') as 'weight' | 'portion',
              outputQuantity: prep.outputQuantity || 1,
              outputUnit: prep.outputUnit || 'unit',
              costPerUnit: costCalc?.costPerOutputUnit || 0,
              totalCost: costCalc?.totalCost || 0,
              components: (prep.recipe || []).map((comp: PreparationIngredient) => {
                const info = getComponentInfo(comp.id, comp.type, comp.quantity)
                return {
                  name: info.name,
                  type: comp.type,
                  quantity: comp.quantity,
                  unit: comp.unit,
                  cost: info.cost
                }
              }),
              instructions: prep.instructions
            }
          })
        }))
        .filter(cat => cat.preparations.length > 0)
    }

    if (activeTab.value === 'recipes') {
      let data: RecipeExportData

      if (departmentFilter === 'all') {
        // Group by departments: Kitchen first, then Bar
        const kitchenRecipes = store.activeRecipes.filter(r => r.department === 'kitchen')
        const barRecipes = store.activeRecipes.filter(r => r.department === 'bar')

        const departments: RecipeDepartmentExport[] = []

        if (kitchenRecipes.length > 0) {
          departments.push({
            name: 'Kitchen',
            department: 'kitchen',
            categories: buildRecipeCategories(kitchenRecipes)
          })
        }

        if (barRecipes.length > 0) {
          departments.push({
            name: 'Bar',
            department: 'bar',
            categories: buildRecipeCategories(barRecipes)
          })
        }

        data = {
          title: 'Recipes Cost Report',
          date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          departments,
          categories: [] // Empty, using departments instead
        }
      } else {
        // Single department - use flat categories
        const recipesToExport = store.activeRecipes.filter(r => r.department === departmentFilter)
        const departmentLabel = departmentFilter === 'kitchen' ? ' (Kitchen)' : ' (Bar)'

        data = {
          title: `Recipes Cost Report${departmentLabel}`,
          date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          categories: buildRecipeCategories(recipesToExport)
        }
      }

      await exportRecipes(data, { includeInstructions: true, department: departmentFilter })
    } else {
      // Preparations
      let data: PreparationExportData

      if (departmentFilter === 'all') {
        // Group by departments: Kitchen first, then Bar
        const kitchenPreps = store.activePreparations.filter(p => p.department === 'kitchen')
        const barPreps = store.activePreparations.filter(p => p.department === 'bar')

        const departments: PreparationDepartmentExport[] = []

        if (kitchenPreps.length > 0) {
          departments.push({
            name: 'Kitchen',
            department: 'kitchen',
            categories: buildPreparationCategories(kitchenPreps)
          })
        }

        if (barPreps.length > 0) {
          departments.push({
            name: 'Bar',
            department: 'bar',
            categories: buildPreparationCategories(barPreps)
          })
        }

        data = {
          title: 'Preparations Cost Report',
          date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          departments,
          categories: [] // Empty, using departments instead
        }
      } else {
        // Single department - use flat categories
        const prepsToExport = store.activePreparations.filter(
          p => p.department === departmentFilter
        )
        const departmentLabel = departmentFilter === 'kitchen' ? ' (Kitchen)' : ' (Bar)'

        data = {
          title: `Preparations Cost Report${departmentLabel}`,
          date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          categories: buildPreparationCategories(prepsToExport)
        }
      }

      await exportPreparations(data, { includeInstructions: true, department: departmentFilter })
    }

    showSnackbar(
      `${activeTab.value === 'recipes' ? 'Recipes' : 'Preparations'} exported successfully`,
      'success'
    )
    DebugUtils.info(MODULE_NAME, 'Export completed', { type: activeTab.value, departmentFilter })
  } catch (error) {
    showSnackbar('Failed to export PDF', 'error')
    DebugUtils.error(MODULE_NAME, 'Failed to export', error)
  }
}

async function handleRecalculateCosts() {
  try {
    isRecalculating.value = true
    DebugUtils.info(MODULE_NAME, '🔄 Starting cost recalculation...')

    // Step 1: Recalculate all costs in memory
    await store.recalculateAllCosts()

    // Step 2: Save calculated costs to database
    await store.updateDatabaseCosts()

    // Close dialog
    dialogs.value.recalculate = false

    // Show success message
    showSnackbar(
      `✅ Successfully recalculated costs for ${store.preparations.length} preparations and ${store.recipes.length} recipes`,
      'success'
    )

    DebugUtils.info(MODULE_NAME, '✅ Cost recalculation completed', {
      preparations: store.preparations.length,
      recipes: store.recipes.length
    })
  } catch (error) {
    showSnackbar('❌ Failed to recalculate costs. Please try again.', 'error')
    DebugUtils.error(MODULE_NAME, 'Failed to recalculate costs', error)
  } finally {
    isRecalculating.value = false
  }
}

// =============================================
// CATEGORY MANAGEMENT
// =============================================

function showCreateCategoryDialog() {
  editingCategory.value = null
  dialogs.value.category = true
}

function editPreparationCategory(categoryId: string) {
  const category = store.getPreparationCategoryById(categoryId)
  if (category) {
    editingCategory.value = category
    dialogs.value.category = true
  }
}

function editRecipeCategory(categoryId: string) {
  const category = store.getRecipeCategoryById(categoryId)
  if (category) {
    editingCategory.value = category
    dialogs.value.category = true
  }
}

// Вспомогательная функция для проверки с кэшированием
async function getCategoryUsage(categoryId: string, type: 'preparation' | 'recipe') {
  const cacheKey = `${type}:${categoryId}`
  const cached = categoryUsageCache.value.get(cacheKey)
  const CACHE_TTL = 60000 // 1 минута

  // Проверяем кэш
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached
  }

  // Выполняем проверку
  const usageResult =
    type === 'preparation'
      ? await checkPreparationCategoryUsage(categoryId)
      : await checkRecipeCategoryUsage(categoryId)

  // Сохраняем в кэш
  const cacheData = {
    canDelete: usageResult.canDelete,
    count: usageResult.count,
    timestamp: Date.now()
  }
  categoryUsageCache.value.set(cacheKey, cacheData)

  return cacheData
}

// Очистка кэша (вызывается после создания/удаления элементов)
function invalidateCategoryUsageCache() {
  categoryUsageCache.value.clear()
}

async function deletePreparationCategoryConfirm(categoryId: string) {
  // Проверяем использование категории перед показом диалога
  const usageResult = await getCategoryUsage(categoryId, 'preparation')

  if (!usageResult.canDelete) {
    // Категория используется - показываем предупреждение
    const categoryName = store.getPreparationCategoryById(categoryId)?.name || 'Unknown'
    showSnackbar(
      `Cannot delete category "${categoryName}": it is used by ${usageResult.count} preparation${usageResult.count > 1 ? 's' : ''}. Please reassign or delete those preparations first.`,
      'error'
    )
    return
  }

  // Категория не используется - показываем диалог подтверждения
  deletingCategoryId.value = categoryId
  categoryUsageInfo.value = null // Категория не используется
  dialogs.value.deleteCategory = true
}

async function deleteRecipeCategoryConfirm(categoryId: string) {
  // Проверяем использование категории перед показом диалога
  const usageResult = await getCategoryUsage(categoryId, 'recipe')

  if (!usageResult.canDelete) {
    // Категория используется - показываем предупреждение
    const categoryName = store.getRecipeCategoryById(categoryId)?.name || 'Unknown'
    showSnackbar(
      `Cannot delete category "${categoryName}": it is used by ${usageResult.count} recipe${usageResult.count > 1 ? 's' : ''}. Please reassign or delete those recipes first.`,
      'error'
    )
    return
  }

  // Категория не используется - показываем диалог подтверждения
  deletingCategoryId.value = categoryId
  categoryUsageInfo.value = null // Категория не используется
  dialogs.value.deleteCategory = true
}

async function handleCategorySaved(data: CreatePreparationCategoryData | CreateRecipeCategoryData) {
  try {
    if (activeTab.value === 'preparations') {
      if (editingCategory.value) {
        // Update existing category
        await store.updatePreparationCategory(
          editingCategory.value.id,
          data as CreatePreparationCategoryData
        )
        showSnackbar('Category updated successfully', 'success')
      } else {
        // Create new category
        await store.createPreparationCategory(data as CreatePreparationCategoryData)
        showSnackbar('Category created successfully', 'success')
      }
    } else {
      // Recipes
      if (editingCategory.value) {
        // Update existing category
        await store.updateRecipeCategory(editingCategory.value.id, data as CreateRecipeCategoryData)
        showSnackbar('Category updated successfully', 'success')
      } else {
        // Create new category
        await store.createRecipeCategory(data as CreateRecipeCategoryData)
        showSnackbar('Category created successfully', 'success')
      }
    }

    // Close dialog and reset state
    dialogs.value.category = false
    editingCategory.value = null
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save category'
    showSnackbar(message, 'error')
    DebugUtils.error(MODULE_NAME, 'Failed to save category', error)
  }
}

async function confirmDeleteCategory() {
  if (!deletingCategoryId.value) return

  try {
    if (activeTab.value === 'preparations') {
      await store.deletePreparationCategory(deletingCategoryId.value)
      showSnackbar('Category deleted successfully', 'success')
    } else {
      await store.deleteRecipeCategory(deletingCategoryId.value)
      showSnackbar('Category deleted successfully', 'success')
    }

    // Очищаем кэш использования категорий
    invalidateCategoryUsageCache()

    // Close dialog and reset state
    dialogs.value.deleteCategory = false
    deletingCategoryId.value = null
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category'
    showSnackbar(message, 'error')
    DebugUtils.error(MODULE_NAME, 'Failed to delete category', error)
  }
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  DebugUtils.debug(MODULE_NAME, 'Component mounted')
  try {
    // Initialize both stores
    await Promise.all([
      store.initialize(),
      productsStore.loadProducts() // Use mock data
    ])

    // Expand all categories by default
    expandedPanels.value = [
      ...recipeCategories.value.map((c: { value: string }) => c.value),
      ...preparationTypes.value.map((c: { value: string }) => c.value)
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

.empty-filtered-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;

  .v-btn {
    margin: 0 8px;
  }
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

  .empty-filtered-state {
    padding: 32px 16px;
    min-height: 250px;

    .v-btn {
      width: 100%;
      margin: 4px 0;
    }

    .d-flex {
      flex-direction: column;
      width: 100%;
    }
  }
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 8px 24px 24px;
}

:deep(.v-expansion-panel-title) {
  padding: 16px 24px;
}

// Улучшенная анимация для filtered state
.empty-filtered-state {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
