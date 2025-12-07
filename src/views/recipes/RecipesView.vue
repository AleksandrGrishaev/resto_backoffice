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
          <v-btn
            variant="outlined"
            class="mr-2"
            prepend-icon="mdi-file-pdf-box"
            size="large"
            :loading="isExporting"
            @click="handleExportPdf"
          >
            Export PDF
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-plus" size="large" @click="showCreateDialog">
            New {{ activeTab === 'recipes' ? 'Recipe' : 'Preparation' }}
          </v-btn>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import { useUsageCheck } from '@/stores/recipes/composables/useUsageCheck'
import { useExport } from '@/core/export'
import type {
  RecipeExportData,
  PreparationExportData,
  RecipeCategoryExport,
  PreparationCategoryExport
} from '@/core/export'
import type {
  Recipe,
  Preparation,
  PreparationType,
  RecipeComponent,
  PreparationIngredient
} from '@/stores/recipes/types'
import type { UsageLocation } from '@/stores/recipes/composables/useUsageCheck'
import { DebugUtils } from '@/utils'
import UnifiedRecipeItem from './components/UnifiedRecipeItem.vue'
import UnifiedRecipeDialog from './components/UnifiedRecipeDialog.vue'
import UnifiedViewDialog from './components/UnifiedViewDialog.vue'
import RecipeFilters from './components/RecipeFilters.vue'
import UsageWarningDialog from './components/UsageWarningDialog.vue'

const MODULE_NAME = 'RecipesView'
const store = useRecipesStore()
const productsStore = useProductsStore()
const { checkRecipeUsage, checkPreparationUsage } = useUsageCheck()
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
  usageWarning: false
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

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success' as 'success' | 'error' | 'info'
})

// Validation rules
const rules = {
  required: (value: string) => !!value?.trim() || 'Required field'
}

// ✅ NEW: Load categories from store
const recipeCategories = computed(() =>
  store.activeRecipeCategories.map(cat => ({
    value: cat.id,
    text: cat.name
  }))
)

const preparationTypes = computed(() => [
  { value: 'all', text: 'All Types' },
  ...store.activePreparationCategories.map(cat => ({
    value: cat.id,
    text: cat.name
  }))
])

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

  DebugUtils.info(MODULE_NAME, `${itemType} ${action}`, { id: item.id, name: item.name })
}

function showSnackbar(message: string, color: 'success' | 'error' | 'info' = 'success') {
  snackbar.value = { show: true, message, color }
}

// =============================================
// PDF EXPORT
// =============================================

async function handleExportPdf() {
  try {
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

    if (activeTab.value === 'recipes') {
      // Group recipes by category
      const recipesByCategory = new Map<string, Recipe[]>()

      for (const recipe of store.activeRecipes) {
        const categoryKey = recipe.category || 'uncategorized'
        if (!recipesByCategory.has(categoryKey)) {
          recipesByCategory.set(categoryKey, [])
        }
        recipesByCategory.get(categoryKey)!.push(recipe)
      }

      // Build category names from store
      const categoryNames: Record<string, string> = {
        uncategorized: 'Uncategorized'
      }
      for (const cat of store.activeRecipeCategories) {
        categoryNames[cat.id] = cat.name
      }

      const categories: RecipeCategoryExport[] = Array.from(recipesByCategory.entries()).map(
        ([categoryKey, recipes]) => ({
          name: categoryNames[categoryKey] || 'Unknown Category',
          recipes: recipes.map((recipe: Recipe) => {
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
        })
      )

      const data: RecipeExportData = {
        title: 'Recipes Cost Report',
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        categories
      }

      await exportRecipes(data, { includeInstructions: true })
    } else {
      // Group preparations by type
      const prepsByType = new Map<string, Preparation[]>()

      for (const prep of store.activePreparations) {
        const typeKey = prep.type || 'other'
        if (!prepsByType.has(typeKey)) {
          prepsByType.set(typeKey, [])
        }
        prepsByType.get(typeKey)!.push(prep)
      }

      // Format type names
      const typeNames: Record<string, string> = {
        sauce: 'Sauces',
        base: 'Bases',
        garnish: 'Garnishes',
        marinade: 'Marinades',
        dough: 'Doughs',
        filling: 'Fillings',
        other: 'Other'
      }

      const categories: PreparationCategoryExport[] = Array.from(prepsByType.entries()).map(
        ([typeKey, preps]) => ({
          name: typeNames[typeKey] || typeKey,
          preparations: preps.map((prep: Preparation) => {
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
        })
      )

      const data: PreparationExportData = {
        title: 'Preparations Cost Report',
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        categories
      }

      await exportPreparations(data, { includeInstructions: true })
    }

    showSnackbar(
      `${activeTab.value === 'recipes' ? 'Recipes' : 'Preparations'} exported successfully`,
      'success'
    )
    DebugUtils.info(MODULE_NAME, 'Export completed', { type: activeTab.value })
  } catch (error) {
    showSnackbar('Failed to export PDF', 'error')
    DebugUtils.error(MODULE_NAME, 'Failed to export', error)
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
      ...recipeCategories.value.map(c => c.value),
      ...preparationTypes.value.map(c => c.value)
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
