// src/views/menu/MenuView.vue
<template>
  <div class="menu-view">
    <!-- Toolbar -->
    <div class="menu-toolbar">
      <div class="menu-toolbar__left">
        <v-text-field
          v-model="search"
          placeholder="Search..."
          prepend-inner-icon="mdi-magnify"
          hide-details
          density="compact"
          bg-color="background"
          class="search-field"
        />

        <v-chip-group v-model="filterTypes" multiple class="menu-toolbar__filters">
          <template #default>
            <v-chip
              filter
              value="food"
              variant="flat"
              :color="isFilterActive('food') ? 'primary' : undefined"
            >
              <template #default>
                <v-icon start icon="mdi-silverware-fork-knife" size="16" />
                Kitchen
              </template>
            </v-chip>
            <v-chip
              filter
              value="beverage"
              variant="flat"
              :color="isFilterActive('beverage') ? 'primary' : undefined"
            >
              <template #default>
                <v-icon start icon="mdi-coffee" size="16" />
                Bar
              </template>
            </v-chip>
            <v-chip
              filter
              value="archive"
              variant="flat"
              :color="isFilterActive('archive') ? 'primary' : undefined"
            >
              <template #default>
                <v-icon start icon="mdi-archive" size="16" />
                Archive
              </template>
            </v-chip>
          </template>
        </v-chip-group>
      </div>

      <div class="menu-toolbar__right">
        <v-btn
          variant="outlined"
          class="mr-2"
          prepend-icon="mdi-file-pdf-box"
          :loading="isExporting"
          @click="dialogs.export = true"
        >
          Export PDF
        </v-btn>
        <v-btn color="primary" class="mr-2" prepend-icon="mdi-plus" @click="showCategoryDialog">
          Category
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showItemDialog">Dish</v-btn>
      </div>
    </div>

    <!-- Content -->
    <div class="menu-content">
      <div class="menu-actions">
        <v-btn
          variant="text"
          color="primary"
          :prepend-icon="expandedPanels.length ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          @click="toggleAllPanels"
        >
          {{ expandedPanels.length ? 'Collapse All' : 'Expand All' }}
        </v-btn>
      </div>

      <!-- Loading state -->
      <v-progress-linear v-if="menuStore.isLoading" indeterminate color="primary" />

      <!-- Menu panels - Root categories with nested subcategories -->
      <v-expansion-panels v-model="expandedPanels" multiple>
        <v-expansion-panel
          v-for="category in filteredCategories"
          :key="category.id"
          :value="category.id"
          :class="{
            'category--inactive': !category.isActive,
            'category--empty': getTotalItemsCount(category.id) === 0
          }"
        >
          <v-expansion-panel-title class="text-h6">
            <div class="d-flex align-center justify-space-between w-100">
              <div class="d-flex align-center">
                <span>{{ category.name }}</span>
                <v-chip
                  v-if="!category.isActive"
                  size="small"
                  color="warning"
                  variant="flat"
                  class="ml-2"
                >
                  Archive
                </v-chip>
                <v-chip
                  v-if="hasSubcategories(category.id)"
                  size="x-small"
                  variant="outlined"
                  class="ml-2"
                >
                  {{ getFilteredSubcategories(category.id).length }} subcategories
                </v-chip>
              </div>
              <div class="category-actions">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  class="category-btn"
                  @click.stop="editCategory(category)"
                >
                  <v-icon icon="mdi-pencil" size="20" />
                </v-btn>

                <v-btn
                  v-if="getTotalItemsCount(category.id) === 0 && !hasSubcategories(category.id)"
                  icon
                  size="small"
                  variant="text"
                  color="error"
                  class="category-btn"
                  @click.stop="confirmDeleteCategory(category)"
                >
                  <v-icon icon="mdi-delete" size="20" />
                </v-btn>
              </div>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <!-- Direct items in parent category -->
            <div v-if="getDirectItemsCount(category.id) > 0" class="mb-4">
              <div class="text-subtitle-2 text-medium-emphasis mb-2">
                Items in {{ category.name }}
              </div>
              <div class="menu-items-grid">
                <menu-item-component
                  v-for="item in getCategoryItems(category.id)"
                  :key="item.id"
                  :item="item"
                  @edit="editItem"
                  @duplicate="duplicateItem"
                  @view="viewItem"
                  @toggle-status="toggleItemStatus"
                />
              </div>
            </div>

            <!-- Subcategories with their items -->
            <v-expansion-panels
              v-if="hasSubcategories(category.id)"
              multiple
              class="subcategory-panels"
            >
              <v-expansion-panel
                v-for="subcategory in getFilteredSubcategories(category.id)"
                :key="subcategory.id"
                :value="subcategory.id"
                :class="{
                  'category--inactive': !subcategory.isActive,
                  'category--empty': getCategoryItems(subcategory.id).length === 0
                }"
              >
                <v-expansion-panel-title class="text-subtitle-1">
                  <div class="d-flex align-center justify-space-between w-100">
                    <div class="d-flex align-center">
                      <v-icon icon="mdi-subdirectory-arrow-right" size="18" class="mr-2" />
                      <span>{{ subcategory.name }}</span>
                      <v-chip
                        v-if="!subcategory.isActive"
                        size="x-small"
                        color="warning"
                        variant="flat"
                        class="ml-2"
                      >
                        Archive
                      </v-chip>
                    </div>
                    <div class="category-actions">
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        color="primary"
                        class="category-btn"
                        @click.stop="editCategory(subcategory)"
                      >
                        <v-icon icon="mdi-pencil" size="18" />
                      </v-btn>

                      <v-btn
                        v-if="getCategoryItems(subcategory.id).length === 0"
                        icon
                        size="small"
                        variant="text"
                        color="error"
                        class="category-btn"
                        @click.stop="confirmDeleteCategory(subcategory)"
                      >
                        <v-icon icon="mdi-delete" size="18" />
                      </v-btn>
                    </div>
                  </div>
                </v-expansion-panel-title>

                <v-expansion-panel-text>
                  <div
                    v-if="getCategoryItems(subcategory.id).length === 0"
                    class="text-center py-4 text-medium-emphasis"
                  >
                    No dishes
                  </div>
                  <div v-else class="menu-items-grid">
                    <menu-item-component
                      v-for="item in getCategoryItems(subcategory.id)"
                      :key="item.id"
                      :item="item"
                      @edit="editItem"
                      @duplicate="duplicateItem"
                      @view="viewItem"
                      @toggle-status="toggleItemStatus"
                    />
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <!-- Empty state if no items and no subcategories -->
            <div
              v-if="getDirectItemsCount(category.id) === 0 && !hasSubcategories(category.id)"
              class="text-center py-4 text-medium-emphasis"
            >
              No dishes
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Empty state -->
      <div v-if="filteredCategories.length === 0" class="text-center py-8">
        <v-icon icon="mdi-food-off" size="48" color="medium-emphasis" />
        <div class="text-medium-emphasis mt-2">No categories found</div>
      </div>
    </div>

    <!-- Dialogs -->
    <!-- ✨ NEW: Dish Type Selection Dialog -->
    <dish-type-selection-dialog
      v-model="dialogs.dishTypeSelection"
      @selected="handleDishTypeSelected"
    />

    <menu-category-dialog
      v-model="dialogs.category"
      :category="editingCategory"
      @saved="handleCategorySaved"
    />

    <menu-item-dialog
      v-model="dialogs.item"
      :item="editingItem"
      :dish-type="selectedDishType"
      @saved="handleItemSaved"
    />

    <!-- Duplicate dialog -->
    <v-dialog v-model="dialogs.duplicate" max-width="400px">
      <v-card>
        <v-card-title class="text-h6">Duplicate Dish</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="duplicateName"
            label="New Dish Name"
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

    <!-- Confirm Dialog -->
    <v-dialog v-model="confirmDialog.show" max-width="400">
      <v-card>
        <v-card-title class="text-h5">Delete Category?</v-card-title>
        <v-card-text>
          Are you sure you want to delete this category? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey-darken-1" variant="text" @click="confirmDialog.show = false">
            Cancel
          </v-btn>
          <v-btn color="error" variant="text" @click="handleDeleteCategory">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Export Options Dialog -->
    <ExportOptionsDialog v-model="dialogs.export" export-type="menu" @export="handleExportPdf" />

    <!-- View Item Dialog -->
    <MenuItemViewDialog v-model="dialogs.view" :item="viewingItem" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import type { Category, MenuItem, DishType, MenuItemVariant, MenuComposition } from '@/stores/menu'
import { DebugUtils } from '@/utils'
import { useExport, ExportOptionsDialog } from '@/core/export'
import type {
  MenuExportData,
  MenuCategoryExport,
  MenuItemExport,
  MenuVariantExport,
  DepartmentFilter,
  MenuDetailedExportData,
  CombinationsExportData,
  ExportDialogOptions
} from '@/core/export'
import { buildMenuItemExportData, type CostCalculationContext } from '@/core/export'
import MenuCategoryDialog from './components/MenuCategoryDialog.vue'
import MenuItemDialog from './components/MenuItemDialog.vue'
import MenuItemComponent from './components/MenuItem.vue'
import DishTypeSelectionDialog from './components/DishTypeSelectionDialog.vue'
import MenuItemViewDialog from './components/dialogs/MenuItemViewDialog.vue'

const MODULE_NAME = 'MenuView'
const menuStore = useMenuStore()
const productsStore = useProductsStore()
const recipesStore = useRecipesStore()
const { isExporting, exportMenu, exportMenuDetailed } = useExport()

// State
const expandedPanels = ref<string[]>([])
const search = ref('')
const filterTypes = ref<Array<'food' | 'beverage' | 'archive'>>(['food', 'beverage'])

// Dialogs state
const dialogs = ref({
  dishTypeSelection: false, // ✨ NEW: Диалог выбора типа блюда
  category: false,
  item: false,
  duplicate: false, // ✨ NEW: Диалог дублирования
  export: false, // Export options dialog
  view: false // View item dialog with export
})
const editingCategory = ref<Category | null>(null)
const editingItem = ref<MenuItem | null>(null)
const viewingItem = ref<MenuItem | null>(null) // Item being viewed
const selectedDishType = ref<DishType | null>(null) // ✨ NEW: Выбранный тип блюда
const duplicatingItem = ref<MenuItem | null>(null) // ✨ NEW: Дублируемое блюдо
const duplicateName = ref('') // ✨ NEW: Новое имя для дубликата

const confirmDialog = ref({
  show: false,
  category: null as Category | null
})

// Computed - Only root categories (no parent)
const filteredCategories = computed(() => {
  // Get only root categories (parentId is null/undefined)
  const rootCategories = menuStore.rootCategories.filter(category => {
    // Фильтр по активным категориям если не выбран архив
    if (!filterTypes.value.includes('archive') && !category.isActive) {
      return false
    }
    return true
  })

  // Сортировка категорий по sortOrder
  return rootCategories.sort((a, b) => {
    const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0)
    if (orderDiff !== 0) return orderDiff
    return a.name.localeCompare(b.name)
  })
})

// Get subcategories of a parent (filtered)
function getFilteredSubcategories(parentId: string) {
  return menuStore.getSubcategories(parentId).filter(category => {
    if (!filterTypes.value.includes('archive') && !category.isActive) {
      return false
    }
    return true
  })
}

// Check if category has subcategories
function hasSubcategories(categoryId: string) {
  return menuStore.hasSubcategories(categoryId)
}

// Methods
function isFilterActive(value: string) {
  return filterTypes.value.includes(value as any)
}

function toggleAllPanels() {
  if (expandedPanels.value.length) {
    expandedPanels.value = []
  } else {
    expandedPanels.value = filteredCategories.value.map(c => c.id)
  }
}

// Get items for a category (SEARCH ONLY BY DISH NAME, not category name)
function getCategoryItems(categoryId: string) {
  return menuStore.getItemsByCategory(categoryId).filter(item => {
    // Search only by dish name (NOT category name)
    if (search.value && !item.name.toLowerCase().includes(search.value.toLowerCase())) {
      return false
    }

    if (filterTypes.value.includes('archive') && !item.isActive) {
      return true
    }

    return filterTypes.value.includes(item.type) && item.isActive
  })
}

// Get direct items count (items directly in category, not in subcategories)
function getDirectItemsCount(categoryId: string) {
  return getCategoryItems(categoryId).length
}

// Get total items count (direct items + items in all subcategories)
function getTotalItemsCount(categoryId: string) {
  let count = getDirectItemsCount(categoryId)
  const subcategories = menuStore.getSubcategories(categoryId)
  for (const sub of subcategories) {
    count += getCategoryItems(sub.id).length
  }
  return count
}

function showCategoryDialog() {
  editingCategory.value = null
  dialogs.value.category = true
}

function showItemDialog() {
  editingItem.value = null
  selectedDishType.value = null
  dialogs.value.dishTypeSelection = true // ✨ CHANGED: Сначала выбор типа блюда
}

// ✨ NEW: Handler для выбора типа блюда
function handleDishTypeSelected(dishType: DishType) {
  console.log('🎯 [MenuView] DishType selected:', dishType)
  selectedDishType.value = dishType
  console.log('📦 [MenuView] selectedDishType set to:', selectedDishType.value)
  dialogs.value.dishTypeSelection = false
  dialogs.value.item = true // Открыть основной диалог создания блюда
  console.log('✅ [MenuView] Opening MenuItemDialog with dishType:', selectedDishType.value)
}

function editCategory(category: Category) {
  editingCategory.value = category
  dialogs.value.category = true
}

function editItem(item: MenuItem) {
  editingItem.value = item
  dialogs.value.item = true
}

function duplicateItem(item: MenuItem) {
  duplicatingItem.value = item
  duplicateName.value = `${item.name} (Copy)`
  dialogs.value.duplicate = true
}

function viewItem(item: MenuItem) {
  viewingItem.value = item
  dialogs.value.view = true
}

async function toggleItemStatus(item: MenuItem) {
  try {
    await menuStore.toggleMenuItemActive(item.id, !item.isActive)
    const action = item.isActive ? 'archived' : 'restored'
    DebugUtils.info(MODULE_NAME, `Menu item ${action}`, { id: item.id, name: item.name })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to toggle menu item status', error)
  }
}

async function confirmDuplicate() {
  if (!duplicatingItem.value || !duplicateName.value.trim()) return

  try {
    await menuStore.duplicateMenuItem(duplicatingItem.value.id, duplicateName.value.trim())
    DebugUtils.info(MODULE_NAME, 'Menu item duplicated successfully')

    // Закрываем диалог и сбрасываем состояние
    dialogs.value.duplicate = false
    duplicatingItem.value = null
    duplicateName.value = ''
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to duplicate menu item', error)
  }
}

function confirmDeleteCategory(category: Category) {
  confirmDialog.value = {
    show: true,
    category
  }
}

async function handleDeleteCategory() {
  if (!confirmDialog.value.category) return

  try {
    await menuStore.deleteCategory(confirmDialog.value.category.id)
    confirmDialog.value = {
      show: false,
      category: null
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to delete category', error)
  }
}

async function handleCategorySaved() {
  // Данные уже обновлены в store благодаря реактивности
  dialogs.value.category = false
  editingCategory.value = null
}

async function handleItemSaved() {
  // Данные уже обновлены в store благодаря реактивности
  dialogs.value.item = false
  editingItem.value = null
}

// PDF Export - Calculate cost from composition
function calculateCompositionCost(composition: MenuComposition[]): number {
  let totalCost = 0

  for (const comp of composition) {
    if (comp.type === 'product') {
      const product = productsStore.products.find(p => p.id === comp.id)
      if (product) {
        totalCost += (product.baseCostPerUnit || 0) * comp.quantity
      }
    } else if (comp.type === 'recipe') {
      const costCalc = recipesStore.getRecipeCostCalculation(comp.id)
      if (costCalc) {
        totalCost += (costCalc.costPerPortion || 0) * comp.quantity
      }
    } else if (comp.type === 'preparation') {
      const costCalc = recipesStore.getPreparationCostCalculation(comp.id)
      if (costCalc) {
        totalCost += (costCalc.costPerOutputUnit || 0) * comp.quantity
      }
    }
  }

  return totalCost
}

function exportVariant(variant: MenuItemVariant): MenuVariantExport {
  const cost = calculateCompositionCost(variant.composition || [])
  const price = variant.price || 0
  const foodCostPercent = price > 0 ? (cost / price) * 100 : 0

  return {
    name: variant.name,
    price,
    cost,
    foodCostPercent
  }
}

async function handleExportPdf(options: ExportDialogOptions) {
  try {
    const departmentFilter = options.department
    const includeRecipeDetails = options.includeRecipeDetails || false
    const avoidPageBreaks = options.avoidPageBreaks !== false // Default to true

    DebugUtils.info(MODULE_NAME, 'Starting export', {
      filteredCategoriesCount: filteredCategories.value.length,
      filterTypes: filterTypes.value,
      departmentFilter,
      includeRecipeDetails,
      avoidPageBreaks
    })

    // If includeRecipeDetails, build detailed export with all recipes
    if (includeRecipeDetails) {
      await handleDetailedExport(departmentFilter, avoidPageBreaks)
      return
    }

    // Standard export (without recipe details)
    const categories: MenuCategoryExport[] = filteredCategories.value
      .filter(cat => cat.isActive)
      .map(category => {
        let items = getCategoryItems(category.id)

        // Filter by department if not 'all'
        if (departmentFilter !== 'all') {
          items = items.filter(item => item.department === departmentFilter)
        }

        return {
          name: category.name,
          items: items.map(
            (item): MenuItemExport => ({
              name: item.name,
              dishType: item.dishType,
              variants: (item.variants || []).filter(v => v.isActive).map(exportVariant)
            })
          )
        }
      })
      .filter(cat => cat.items.length > 0)

    // Count total variants
    const totalVariants = categories.reduce(
      (sum, cat) => sum + cat.items.reduce((s, item) => s + item.variants.length, 0),
      0
    )
    const totalCost = categories.reduce(
      (sum, cat) =>
        sum +
        cat.items.reduce(
          (s, item) => s + item.variants.reduce((v, variant) => v + variant.cost, 0),
          0
        ),
      0
    )

    // Build title based on department filter
    const departmentLabel =
      departmentFilter === 'all' ? '' : departmentFilter === 'kitchen' ? ' (Kitchen)' : ' (Bar)'

    const data: MenuExportData = {
      title: `Menu Cost Report${departmentLabel}`,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      categories,
      totals: {
        itemCount: totalVariants,
        totalCost
      }
    }

    DebugUtils.info(MODULE_NAME, 'Export data prepared', {
      categoriesCount: categories.length,
      totalVariants,
      departmentFilter
    })

    await exportMenu(data, { orientation: 'landscape', department: departmentFilter })
    DebugUtils.info(MODULE_NAME, 'Menu exported successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to export menu', error)
  }
}

/**
 * Handle detailed export with recipe information
 * Uses all active menu items (not filtered by page view)
 */
async function handleDetailedExport(departmentFilter: DepartmentFilter, avoidPageBreaks: boolean) {
  const costContext: CostCalculationContext = {
    productsStore,
    recipesStore
  }

  // Get all active items (not filtered by page view filters)
  const allItems: { item: MenuItem; categoryName: string }[] = []

  // Use all active root categories (not page-filtered)
  const allRootCategories = menuStore.rootCategories.filter(cat => cat.isActive)

  for (const category of allRootCategories) {
    // Get all active items directly in this category
    let items = menuStore.getItemsByCategory(category.id).filter(item => item.isActive)

    // Filter by department if not 'all'
    if (departmentFilter !== 'all') {
      items = items.filter(item => item.department === departmentFilter)
    }

    for (const item of items) {
      allItems.push({ item, categoryName: category.name })
    }

    // Also get items from subcategories
    const subcategories = menuStore.getSubcategories(category.id).filter(sub => sub.isActive)
    for (const subcategory of subcategories) {
      let subItems = menuStore.getItemsByCategory(subcategory.id).filter(item => item.isActive)

      // Filter by department if not 'all'
      if (departmentFilter !== 'all') {
        subItems = subItems.filter(item => item.department === departmentFilter)
      }

      for (const item of subItems) {
        // Use format "Parent > Subcategory" for category name
        allItems.push({ item, categoryName: `${category.name} > ${subcategory.name}` })
      }
    }
  }

  if (allItems.length === 0) {
    DebugUtils.info(MODULE_NAME, 'No items to export')
    return
  }

  // Build detailed export data for each item
  const detailedItems: CombinationsExportData[] = allItems.map(({ item, categoryName }) =>
    buildMenuItemExportData(item, categoryName, costContext, {
      includeAllCombinations: false, // Summary mode
      includeRecipes: true // Include recipe details
    })
  )

  // Count total variants
  const totalVariants = detailedItems.reduce((sum, item) => sum + item.variantGroups.length, 0)

  // Build title based on department filter
  const departmentLabel =
    departmentFilter === 'all' ? '' : departmentFilter === 'kitchen' ? ' (Kitchen)' : ' (Bar)'

  const data: MenuDetailedExportData = {
    title: `Menu Detailed Report${departmentLabel}`,
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    department: departmentFilter,
    items: detailedItems,
    summary: {
      totalItems: allItems.length,
      totalVariants
    }
  }

  DebugUtils.info(MODULE_NAME, 'Detailed export data prepared', {
    totalItems: allItems.length,
    totalVariants,
    departmentFilter
  })

  // Use portrait orientation for detailed reports
  await exportMenuDetailed(data, {
    orientation: 'portrait',
    department: departmentFilter,
    avoidPageBreaks
  })
  DebugUtils.info(MODULE_NAME, 'Menu detailed exported successfully')
}

// Initial load
onMounted(async () => {
  DebugUtils.info(MODULE_NAME, 'Component mounted, initializing menu store')
  await menuStore.initialize()
  expandedPanels.value = filteredCategories.value.map(c => c.id)
})
</script>

<style lang="scss" scoped>
.menu-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.menu-toolbar {
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

    .search-field {
      width: 300px;
    }
  }

  &__filters {
    :deep(.v-chip) {
      &.v-chip--selected {
        opacity: 1;
      }

      &:not(.v-chip--selected) {
        opacity: 0.7;
      }
    }
  }
}

.menu-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.category-actions {
  display: none;
  gap: 4px;

  .v-expansion-panel-title:hover & {
    display: flex;
  }
}

:deep(.v-expansion-panels) {
  .v-expansion-panel {
    &--active {
      .category-actions {
        display: flex;
      }
    }
  }
}

.category {
  &--inactive {
    opacity: 0.7;
  }

  &--empty {
    :deep(.v-expansion-panel-title) {
      color: var(--text-secondary);
    }
  }
}

.menu-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
  padding: 8px 0;
}

// Responsive
@media (max-width: 768px) {
  .menu-items-grid {
    grid-template-columns: 1fr;
  }

  .menu-toolbar {
    flex-direction: column;
    align-items: stretch;

    &__left {
      flex-direction: column;

      .search-field {
        width: 100%;
      }
    }

    &__right {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
  }
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 8px 16px 16px;
}

// Nested subcategory panels styling
.subcategory-panels {
  margin-top: 8px;

  :deep(.v-expansion-panel) {
    background: rgba(var(--v-theme-surface-variant), 0.3);
    margin-bottom: 4px;

    &::before {
      display: none;
    }
  }

  :deep(.v-expansion-panel-title) {
    min-height: 48px;
    font-size: 0.95rem;
    padding: 12px 16px;
  }

  :deep(.v-expansion-panel-text__wrapper) {
    padding: 8px 12px 12px;
  }
}
</style>
