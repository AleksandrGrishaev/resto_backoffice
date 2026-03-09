<!-- Kitchen Catalog — Tablet layout with section rail + drill-down navigation -->
<template>
  <div class="catalog-screen">
    <!-- Section rail (left) -->
    <div class="section-rail" :class="{ expanded: railExpanded }">
      <div
        v-for="section in sections"
        :key="section.id"
        class="rail-item"
        :class="{ active: activeSection === section.id }"
        @click="switchSection(section.id)"
      >
        <v-icon :color="activeSection === section.id ? section.color : undefined" size="22">
          {{ section.icon }}
        </v-icon>
        <span class="rail-label">{{ section.label }}</span>
        <span v-if="railExpanded" class="rail-count">{{ section.count }}</span>
      </div>

      <!-- Rail toggle -->
      <div class="rail-toggle" @click="railExpanded = !railExpanded">
        <v-icon size="18">
          {{ railExpanded ? 'mdi-chevron-left' : 'mdi-chevron-right' }}
        </v-icon>
      </div>
    </div>

    <!-- Main content -->
    <div class="catalog-main">
      <!-- Header: department toggle + search + filter -->
      <div class="catalog-header">
        <div class="header-top">
          <!-- Department toggle -->
          <v-btn-toggle
            v-if="hasDepartments"
            v-model="activeDepartment"
            mandatory
            density="compact"
            color="primary"
            class="dept-toggle"
          >
            <v-btn value="kitchen" size="small">Kitchen</v-btn>
            <v-btn value="bar" size="small">Bar</v-btn>
          </v-btn-toggle>

          <v-text-field
            v-model="searchQuery"
            placeholder="Search..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            :autofocus="false"
            class="search-input"
            @vue:mounted="($el: any) => $el?.querySelector?.('input')?.blur()"
          />

          <!-- View mode toggle -->
          <v-btn
            icon
            variant="text"
            size="small"
            @click="viewMode = viewMode === 'grid' ? 'tree' : 'grid'"
          >
            <v-icon>
              {{ viewMode === 'grid' ? 'mdi-file-tree-outline' : 'mdi-view-grid-outline' }}
            </v-icon>
            <v-tooltip activator="parent" location="bottom">
              {{ viewMode === 'grid' ? 'Tree view' : 'Grid view' }}
            </v-tooltip>
          </v-btn>

          <!-- Recalculate menu costs -->
          <v-btn
            v-if="activeSection === 'menu'"
            icon
            variant="text"
            size="small"
            :loading="isRecalculating"
            @click="showRecalculateDialog = true"
          >
            <v-icon>mdi-calculator-variant</v-icon>
            <v-tooltip activator="parent" location="bottom">Recalculate All Costs</v-tooltip>
          </v-btn>

          <v-btn
            v-if="hasFilters"
            icon
            variant="text"
            size="small"
            :color="isFilterActive ? 'primary' : undefined"
            @click="showFilterDialog = true"
          >
            <v-icon>mdi-filter-variant</v-icon>
          </v-btn>

          <!-- Manage categories -->
          <v-btn icon variant="text" size="small" @click="showCategoryListDialog = true">
            <v-icon>mdi-folder-cog-outline</v-icon>
            <v-tooltip activator="parent" location="bottom">Manage Categories</v-tooltip>
          </v-btn>
        </div>

        <!-- Breadcrumb -->
        <div v-if="breadcrumb.length > 0" class="breadcrumb">
          <span class="breadcrumb-item clickable" @click="goToCategories">
            {{ currentSectionLabel }}
          </span>
          <v-icon size="18" class="breadcrumb-sep">mdi-chevron-right</v-icon>
          <template v-for="(crumb, idx) in breadcrumb" :key="idx">
            <span
              class="breadcrumb-item"
              :class="{ clickable: idx < breadcrumb.length - 1 }"
              @click="idx < breadcrumb.length - 1 && goToBreadcrumb(idx)"
            >
              {{ crumb.label }}
            </span>
            <v-icon v-if="idx < breadcrumb.length - 1" size="18" class="breadcrumb-sep">
              mdi-chevron-right
            </v-icon>
          </template>
        </div>
      </div>

      <!-- Content area -->
      <div class="catalog-content">
        <!-- Search results -->
        <SearchResults
          v-if="isSearching"
          :groups="searchResults"
          :query="searchQuery"
          @select="openDetail"
        />

        <!-- Detail view -->
        <ItemDetailScreen
          v-else-if="selectedItem"
          :item="selectedItem"
          @back="goBack"
          @navigate="handleNavigate"
          @edit="handleEdit"
          @create-based="handleCreateBased"
        />

        <!-- Items in category -->
        <ItemsList
          v-else-if="currentCategory"
          :items="categoryItems"
          :section="activeSection"
          @select="openDetail"
        />

        <!-- Tree view -->
        <TreeView
          v-else-if="viewMode === 'tree'"
          :items="currentSectionItems"
          :categories="visibleCategories"
          :section="activeSection"
          @select="openDetail"
        />

        <!-- Categories grid (default) -->
        <CategoriesGrid
          v-else
          :categories="visibleCategories"
          :section="activeSection"
          @select="selectCategory"
        />
      </div>
    </div>

    <!-- Edit dialogs -->
    <MenuItemDialog
      v-model="showMenuDialog"
      :item="editMenuItem"
      @saved="handleDialogSaved"
      @archive="handleArchiveMenuItem"
    />

    <UnifiedRecipeDialog
      v-model="showRecipeDialog"
      :type="editRecipeType"
      :item="editRecipe"
      tablet
      @saved="handleDialogSaved"
      @archive="handleArchiveRecipe"
      @converted="handleRecipeConverted"
    />

    <ProductDialog
      v-model="showProductDialog"
      :product="editProduct"
      @save="handleProductSave"
      @archive="handleArchiveProduct"
    />

    <!-- Recalculate costs dialog -->
    <v-dialog v-model="showRecalculateDialog" max-width="420">
      <v-card>
        <v-card-title>Recalculate Menu Costs</v-card-title>
        <v-card-text>
          <p>
            This will recalculate the cost for all
            <strong>{{ menuCatalogItems.length }}</strong>
            menu items based on current product prices, preparation costs, and recipe compositions.
          </p>
          <p class="mt-2 text-medium-emphasis">Results will be saved to the database.</p>
          <v-alert v-if="recalculateResult" type="success" variant="tonal" class="mt-3">
            Updated: {{ recalculateResult.updated }} items, Skipped:
            {{ recalculateResult.skipped }} (no composition)
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showRecalculateDialog = false">Close</v-btn>
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

    <!-- Category dialogs -->
    <MenuCategoryDialog
      v-model="showMenuCategoryDialog"
      :category="editMenuCategory"
      @saved="handleMenuCategorySaved"
    />

    <RecipeCategoryDialog
      v-model="showRecipeCategoryDialog"
      :type="editCategoryType"
      :category="editRecipePrepCategory"
      @save="handleRecipePrepCategorySave"
    />

    <RecipeCategoryDialog
      v-model="showProductCategoryDialog"
      type="preparation"
      :category="editProductCategoryAsRecipe"
      @save="handleProductCategorySave"
    />

    <!-- Manage Categories dialog -->
    <v-dialog v-model="showCategoryListDialog" max-width="440" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <span>{{ currentSectionLabel }} Categories</span>
          <v-spacer />
          <v-btn variant="text" size="small" @click="showCategoryListDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0" style="max-height: 60vh">
          <v-list density="compact">
            <v-list-item
              v-for="cat in allSectionCategories"
              :key="cat.id"
              :class="{ 'text-medium-emphasis': !cat.isActive }"
            >
              <template #prepend>
                <v-icon v-if="cat.emoji" size="20" class="mr-1">
                  {{ cat.emoji }}
                </v-icon>
                <v-icon v-else size="18" :color="cat.color || undefined" class="mr-1">
                  mdi-folder
                </v-icon>
              </template>
              <v-list-item-title>
                {{ cat.name }}
                <v-chip
                  v-if="!cat.isActive"
                  size="x-small"
                  color="grey"
                  variant="outlined"
                  class="ml-2"
                >
                  inactive
                </v-chip>
              </v-list-item-title>
              <template #append>
                <v-btn icon variant="text" size="small" @click="editCategoryFromList(cat)">
                  <v-icon size="18">mdi-pencil-outline</v-icon>
                </v-btn>
              </template>
            </v-list-item>
            <v-list-item v-if="allSectionCategories.length === 0">
              <v-list-item-title class="text-medium-emphasis text-center">
                No categories
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Filter dialog -->
    <v-dialog v-model="showFilterDialog" max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>Filters</span>
          <v-spacer />
          <v-btn variant="text" size="small" @click="clearFilters">Clear</v-btn>
        </v-card-title>
        <v-card-text>
          <!-- Nesting filter (Recipes only) -->
          <div v-if="activeSection === 'recipes'" class="filter-group">
            <div class="filter-label">Nesting</div>
            <v-chip-group v-model="filterNesting" selected-class="bg-teal">
              <v-chip value="" variant="outlined">All</v-chip>
              <v-chip value="top" variant="outlined">Top-level</v-chip>
              <v-chip value="nested" variant="outlined">Nested only</v-chip>
            </v-chip-group>
          </div>

          <!-- Status filter -->
          <div class="filter-group">
            <div class="filter-label">Status</div>
            <v-chip-group v-model="filterStatus" selected-class="bg-secondary">
              <v-chip value="" variant="outlined">Active + Draft</v-chip>
              <v-chip value="active" variant="outlined">Active</v-chip>
              <v-chip value="draft" variant="outlined">Draft</v-chip>
              <v-chip value="archived" variant="outlined">Archived</v-chip>
              <v-chip value="all" variant="outlined">All</v-chip>
            </v-chip-group>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="flat" color="primary" @click="showFilterDialog = false">Done</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useCatalogData } from './composables/useCatalogData'
import type { CatalogItem } from './composables/useCatalogData'
import ItemDetailScreen from './detail/ItemDetailScreen.vue'
import SearchResults from './components/SearchResults.vue'
import CategoriesGrid from './components/CategoriesGrid.vue'
import ItemsList from './components/ItemsList.vue'
import TreeView from './components/TreeView.vue'
import MenuItemDialog from '@/views/menu/components/MenuItemDialog.vue'
import UnifiedRecipeDialog from '@/views/recipes/components/UnifiedRecipeDialog.vue'
import ProductDialog from '@/views/products/components/ProductDialog.vue'
import MenuCategoryDialog from '@/views/menu/components/MenuCategoryDialog.vue'
import RecipeCategoryDialog from '@/views/recipes/components/CategoryDialog.vue'
import { useRecipesStore } from '@/stores/recipes'
import { useMenuStore } from '@/stores/menu'
import { useProductsStore } from '@/stores/productsStore'
import type {
  Recipe,
  Preparation,
  PreparationCategory,
  RecipeCategory
} from '@/stores/recipes/types'
import type { MenuItem } from '@/stores/menu'
import type { Category } from '@/stores/menu/types'
import type {
  Product,
  UpdateProductData,
  CreateProductData,
  ProductCategory
} from '@/stores/productsStore'

type SectionId = 'menu' | 'recipes' | 'preps' | 'products'

interface BreadcrumbItem {
  label: string
  categoryId?: string
}

const props = defineProps<{
  pendingItem?: { id: string; type: string } | null
}>()

const emit = defineEmits<{
  createBased: [ref: { id: string; type: string; name: string }]
  pendingItemConsumed: []
}>()

const recipesStore = useRecipesStore()
const menuStore = useMenuStore()
const productsStore = useProductsStore()

// Edit dialog state
const showMenuDialog = ref(false)
const showRecipeDialog = ref(false)
const showProductDialog = ref(false)
const editMenuItem = ref<MenuItem | null>(null)
const editRecipe = ref<Recipe | Preparation | null>(null)
const editRecipeType = ref<'recipe' | 'preparation'>('recipe')
const editProduct = ref<Product | null>(null)

// Category management state
const showCategoryListDialog = ref(false)

// Category dialog state
const showMenuCategoryDialog = ref(false)
const showRecipeCategoryDialog = ref(false)
const showProductCategoryDialog = ref(false)
const editMenuCategory = ref<Category | null>(null)
const editRecipePrepCategory = ref<PreparationCategory | RecipeCategory | null>(null)
const editCategoryType = ref<'preparation' | 'recipe'>('recipe')
const editProductCategoryAsRecipe = ref<PreparationCategory | null>(null)
const editProductCategoryOriginal = ref<ProductCategory | null>(null)

const {
  menuCatalogItems,
  recipeCatalogItems,
  preparationCatalogItems,
  productCatalogItems,
  menuCategories,
  recipeCategories,
  preparationCategories,
  productCategories,
  search
} = useCatalogData()

// --- State ---
const railExpanded = ref(false)
const activeSection = ref<SectionId>('menu')
const activeDepartment = ref<'kitchen' | 'bar'>('kitchen')
const searchQuery = ref('')
const currentCategory = ref<{ id: string; name: string } | null>(null)
const selectedItem = ref<CatalogItem | null>(null)
const viewMode = ref<'grid' | 'tree'>('grid')
const showFilterDialog = ref(false)

// Recalculate costs
const showRecalculateDialog = ref(false)
const isRecalculating = ref(false)
const recalculateResult = ref<{ updated: number; skipped: number } | null>(null)

async function handleRecalculateCosts() {
  isRecalculating.value = true
  recalculateResult.value = null
  try {
    recalculateResult.value = await menuStore.recalculateAllMenuItemCosts()
  } catch (e) {
    console.error('Failed to recalculate costs:', e)
  } finally {
    isRecalculating.value = false
  }
}

// Filters (in dialog)
const filterNesting = ref<string>('')
const filterStatus = ref<string>('')

// Navigation history
const navStack = ref<Array<{ item?: CatalogItem; category?: { id: string; name: string } }>>([])

// --- Sections config ---
const sections = computed(() => [
  {
    id: 'menu' as SectionId,
    label: 'Menu',
    icon: 'mdi-silverware-variant',
    color: 'purple',
    count: currentSectionItems.value.length
  },
  {
    id: 'recipes' as SectionId,
    label: 'Recipes',
    icon: 'mdi-book-open-variant',
    color: 'green',
    count: recipeCatalogItems.value.length
  },
  {
    id: 'preps' as SectionId,
    label: 'Preps',
    icon: 'mdi-flask-outline',
    color: 'orange',
    count: preparationCatalogItems.value.length
  },
  {
    id: 'products' as SectionId,
    label: 'Products',
    icon: 'mdi-package-variant',
    color: 'blue',
    count: productCatalogItems.value.length
  }
])

const currentSectionLabel = computed(
  () => sections.value.find(s => s.id === activeSection.value)?.label ?? ''
)

// Products don't have departments
const hasDepartments = computed(() => activeSection.value !== 'products')

// --- Filters logic ---
const hasFilters = computed(() => true)

const isFilterActive = computed(() => !!filterNesting.value || !!filterStatus.value)

function clearFilters() {
  filterNesting.value = ''
  filterStatus.value = ''
}

// Nested recipe IDs (for nesting filter)
const nestedRecipeIds = computed(() => {
  const ids = new Set<string>()
  for (const r of recipesStore.recipes as Recipe[]) {
    for (const c of r.components || []) {
      if (c.componentType === 'recipe') ids.add(c.componentId)
    }
  }
  return ids
})

// --- Current section items (with filters applied) ---
function applyCommonFilters(items: CatalogItem[]): CatalogItem[] {
  let result = items

  // Department filter (always applied for non-products)
  if (hasDepartments.value) {
    result = result.filter(
      i =>
        i.department === activeDepartment.value ||
        (i.department && i.department.includes(activeDepartment.value))
    )
  }

  if (filterStatus.value === 'all') {
    // Show everything including archived
  } else if (filterStatus.value) {
    result = result.filter(i => i.status === filterStatus.value)
  } else {
    // Default: exclude archived
    result = result.filter(i => i.status !== 'archived')
  }
  return result
}

const currentSectionItems = computed<CatalogItem[]>(() => {
  let items: CatalogItem[]
  switch (activeSection.value) {
    case 'menu':
      items = menuCatalogItems.value
      break
    case 'recipes':
      items = recipeCatalogItems.value
      break
    case 'preps':
      items = preparationCatalogItems.value
      break
    case 'products':
      items = productCatalogItems.value
      break
    default:
      items = []
  }

  items = applyCommonFilters(items)

  // Nesting filter for recipes
  if (activeSection.value === 'recipes' && filterNesting.value) {
    if (filterNesting.value === 'top') {
      items = items.filter(i => !nestedRecipeIds.value.has(i.id))
    } else if (filterNesting.value === 'nested') {
      items = items.filter(i => nestedRecipeIds.value.has(i.id))
    }
  }

  return items
})

// --- Categories for current section ---
const sectionCategories = computed(() => {
  switch (activeSection.value) {
    case 'menu':
      return menuCategories.value
    case 'recipes':
      return recipeCategories.value
    case 'preps':
      return preparationCategories.value
    case 'products':
      return productCategories.value
    default:
      return []
  }
})

// Full category objects for manage dialog (includes inactive, color, emoji)
const allSectionCategories = computed(() => {
  switch (activeSection.value) {
    case 'menu':
      return (menuStore.categories as Category[]).map(c => ({
        id: c.id,
        name: c.name,
        isActive: c.isActive,
        color: '',
        emoji: ''
      }))
    case 'recipes':
      return recipesStore.recipeCategories.map(c => ({
        id: c.id,
        name: c.name,
        isActive: c.isActive,
        color: c.color || '',
        emoji: ('emoji' in c ? (c as any).emoji : c.icon) || ''
      }))
    case 'preps':
      return recipesStore.preparationCategories.map(c => ({
        id: c.id,
        name: c.name,
        isActive: c.isActive,
        color: c.color || '',
        emoji: ('emoji' in c ? (c as any).emoji : '') || ''
      }))
    case 'products':
      return productsStore.categories.map(c => ({
        id: c.id,
        name: c.name,
        isActive: c.isActive,
        color: c.color || '',
        emoji: c.icon || ''
      }))
    default:
      return []
  }
})

const visibleCategories = computed(() => {
  const items = currentSectionItems.value
  const catCounts = new Map<string, number>()
  for (const item of items) {
    if (item.categoryId) {
      catCounts.set(item.categoryId, (catCounts.get(item.categoryId) ?? 0) + 1)
    }
  }

  // Uncategorized count
  const uncategorized = items.filter(i => !i.categoryId).length

  const cats = sectionCategories.value
    .filter(c => catCounts.has(c.id))
    .map(c => ({
      id: c.id,
      name: c.name,
      count: catCounts.get(c.id) ?? 0
    }))

  if (uncategorized > 0) {
    cats.push({ id: '__uncategorized__', name: 'Uncategorized', count: uncategorized })
  }

  return cats
})

// --- Items in selected category ---
const categoryItems = computed<CatalogItem[]>(() => {
  if (!currentCategory.value) return []
  const catId = currentCategory.value.id

  let items = currentSectionItems.value
  if (catId === '__uncategorized__') {
    items = items.filter(i => !i.categoryId)
  } else {
    items = items.filter(i => i.categoryId === catId)
  }

  return items.sort((a, b) => {
    // Active items first, inactive at the bottom
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    return a.name.localeCompare(b.name)
  })
})

// --- Search ---
const isSearching = computed(() => searchQuery.value.length >= 2)
const searchResults = computed(() => {
  const results = search(searchQuery.value)
  // Apply status filter to search results
  if (filterStatus.value === 'all') return results
  return results
    .map(group => ({
      ...group,
      items: group.items.filter(i =>
        filterStatus.value ? i.status === filterStatus.value : i.status !== 'archived'
      )
    }))
    .filter(group => group.items.length > 0)
})

// --- Breadcrumb ---
const breadcrumb = computed<BreadcrumbItem[]>(() => {
  const crumbs: BreadcrumbItem[] = []
  if (currentCategory.value) {
    crumbs.push({ label: currentCategory.value.name, categoryId: currentCategory.value.id })
  }
  if (selectedItem.value) {
    crumbs.push({ label: selectedItem.value.name })
  }
  return crumbs
})

// --- Navigation ---
function switchSection(id: SectionId) {
  activeSection.value = id
  currentCategory.value = null
  selectedItem.value = null
  navStack.value = []
  searchQuery.value = ''
  railExpanded.value = false
}

function selectCategory(cat: { id: string; name: string }) {
  currentCategory.value = cat
  selectedItem.value = null
}

function openDetail(item: CatalogItem) {
  // Clear search when selecting a result
  if (searchQuery.value) {
    searchQuery.value = ''
  }
  navStack.value.push({
    item: selectedItem.value ?? undefined,
    category: currentCategory.value ?? undefined
  })
  selectedItem.value = item
  // Ensure we have a category context
  if (!currentCategory.value && item.categoryId) {
    const cat = sectionCategories.value.find(c => c.id === item.categoryId)
    if (cat) currentCategory.value = { id: cat.id, name: cat.name }
  }
}

function goBack() {
  const prev = navStack.value.pop()
  if (prev?.item) {
    selectedItem.value = prev.item
  } else {
    selectedItem.value = null
    if (!prev?.category && !currentCategory.value) {
      // go all the way back to categories
    }
  }
}

function goToCategories() {
  currentCategory.value = null
  selectedItem.value = null
  navStack.value = []
}

function goToBreadcrumb(idx: number) {
  if (idx === 0) {
    // Go to category level
    selectedItem.value = null
    navStack.value = []
  }
}

function handleNavigate(target: { id: string; type: CatalogItem['type'] }) {
  const allItems = [
    ...menuCatalogItems.value,
    ...recipeCatalogItems.value,
    ...preparationCatalogItems.value,
    ...productCatalogItems.value
  ]
  const found = allItems.find(i => i.id === target.id && i.type === target.type)
  if (found) {
    openDetail(found)
  }
}

function handleCreateBased(ref: { id: string; type: string; name: string }) {
  emit('createBased', ref)
}

function handleEdit(target: { id: string; type: string }) {
  if (target.type === 'menu') {
    editMenuItem.value = menuStore.menuItems.find(m => m.id === target.id) ?? null
    if (editMenuItem.value) showMenuDialog.value = true
  } else if (target.type === 'recipe') {
    editRecipe.value = recipesStore.getRecipeById(target.id) ?? null
    editRecipeType.value = 'recipe'
    if (editRecipe.value) showRecipeDialog.value = true
  } else if (target.type === 'preparation') {
    editRecipe.value = recipesStore.getPreparationById(target.id) ?? null
    editRecipeType.value = 'preparation'
    if (editRecipe.value) showRecipeDialog.value = true
  } else if (target.type === 'product') {
    editProduct.value = productsStore.getProductById(target.id) ?? null
    if (editProduct.value) showProductDialog.value = true
  }
}

function handleDialogSaved() {
  // MenuItemDialog and UnifiedRecipeDialog update stores internally.
  // Computed catalog items auto-refresh reactively.
}

function handleRecipeConverted(payload: { newId: string; newType: 'recipe' | 'preparation' }) {
  showRecipeDialog.value = false
  editRecipe.value = null

  // Open the new entity in edit mode
  if (payload.newType === 'recipe') {
    editRecipe.value = recipesStore.getRecipeById(payload.newId) ?? null
    editRecipeType.value = 'recipe'
  } else {
    editRecipe.value = recipesStore.getPreparationById(payload.newId) ?? null
    editRecipeType.value = 'preparation'
  }
  if (editRecipe.value) {
    showRecipeDialog.value = true
  }
}

// --- Category editing ---
function editCategoryFromList(cat: { id: string; name: string }) {
  showCategoryListDialog.value = false
  editCategory(cat)
}

function editCategory(cat: { id: string; name: string }) {
  if (activeSection.value === 'menu') {
    editMenuCategory.value = menuStore.categories.find(c => c.id === cat.id) ?? null
    if (editMenuCategory.value) showMenuCategoryDialog.value = true
  } else if (activeSection.value === 'recipes') {
    editRecipePrepCategory.value =
      recipesStore.activeRecipeCategories.find(c => c.id === cat.id) ?? null
    editCategoryType.value = 'recipe'
    if (editRecipePrepCategory.value) showRecipeCategoryDialog.value = true
  } else if (activeSection.value === 'preps') {
    editRecipePrepCategory.value =
      recipesStore.activePreparationCategories.find(c => c.id === cat.id) ?? null
    editCategoryType.value = 'preparation'
    if (editRecipePrepCategory.value) showRecipeCategoryDialog.value = true
  } else if (activeSection.value === 'products') {
    const prodCat = productsStore.activeCategories.find(c => c.id === cat.id) ?? null
    if (prodCat) {
      editProductCategoryOriginal.value = prodCat
      // Map ProductCategory to RecipeCategory-like shape for the dialog
      editProductCategoryAsRecipe.value = {
        id: prodCat.id,
        key: prodCat.key,
        name: prodCat.name,
        color: prodCat.color || 'primary',
        emoji: prodCat.icon || '',
        icon: prodCat.icon || '',
        description: '',
        sortOrder: prodCat.sortOrder,
        isActive: prodCat.isActive,
        createdAt: prodCat.createdAt,
        updatedAt: prodCat.updatedAt
      } as any
      showProductCategoryDialog.value = true
    }
  }
}

function handleMenuCategorySaved() {
  showMenuCategoryDialog.value = false
  editMenuCategory.value = null
}

async function handleRecipePrepCategorySave(data: any) {
  showRecipeCategoryDialog.value = false
  const catId = editRecipePrepCategory.value?.id
  if (catId) {
    // Update existing
    if (editCategoryType.value === 'recipe') {
      await recipesStore.updateRecipeCategory(catId, {
        name: data.name,
        description: data.description,
        color: data.color,
        emoji: data.emoji,
        icon: data.icon || data.emoji,
        isActive: data.isActive
      })
    } else {
      await recipesStore.updatePreparationCategory(catId, {
        name: data.name,
        description: data.description,
        color: data.color,
        emoji: data.emoji,
        icon: data.icon || data.emoji,
        isActive: data.isActive
      })
    }
  }
  editRecipePrepCategory.value = null
}

async function handleProductCategorySave(data: any) {
  showProductCategoryDialog.value = false
  const catId = editProductCategoryOriginal.value?.id
  if (catId) {
    await productsStore.updateProductCategory(catId, {
      name: data.name,
      color: data.color,
      icon: data.icon || data.emoji,
      isActive: data.isActive
    })
  }
  editProductCategoryOriginal.value = null
  editProductCategoryAsRecipe.value = null
}

async function handleArchiveMenuItem(item: MenuItem) {
  showMenuDialog.value = false
  await menuStore.toggleMenuItemActive(item.id, !item.isActive)
}

async function handleArchiveRecipe(item: Recipe | Preparation) {
  showRecipeDialog.value = false
  if ('components' in item) {
    await recipesStore.toggleRecipeStatus(item.id)
  } else {
    await recipesStore.togglePreparationStatus(item.id)
  }
}

async function handleArchiveProduct(product: Product) {
  showProductDialog.value = false
  const updateData: UpdateProductData = { id: product.id, isActive: !product.isActive }
  await productsStore.updateProduct(updateData)
}

async function handleProductSave(data: CreateProductData | UpdateProductData, packages: any[]) {
  if ('id' in data) {
    await productsStore.updateProduct(data)

    const original = productsStore.products.find(p => p.id === data.id)
    const originalIds = original?.packageOptions.filter(p => p.isActive).map(p => p.id) || []
    const currentIds = packages.filter(p => p.id && !p.tempId).map(p => p.id)

    for (const pkg of packages) {
      if (pkg.id && !pkg.tempId) {
        await productsStore.updatePackageOption(pkg)
      } else if (pkg.tempId) {
        const { tempId, ...packageData } = pkg
        await productsStore.addPackageOption({ ...packageData, productId: data.id })
      }
    }

    for (const id of originalIds.filter(id => !currentIds.includes(id))) {
      await productsStore.deactivatePackageOption(data.id, id)
    }
  }
  showProductDialog.value = false
}

// Reset on section change
watch(activeSection, () => {
  clearFilters()
})

// Reset drill-down on department change
watch(activeDepartment, () => {
  currentCategory.value = null
  selectedItem.value = null
  navStack.value = []
})

// Navigate to pending item from constructor
function navigateToPendingItem() {
  const pending = props.pendingItem
  if (!pending) return

  const allItems = [
    ...menuCatalogItems.value,
    ...recipeCatalogItems.value,
    ...preparationCatalogItems.value,
    ...productCatalogItems.value
  ]
  const found = allItems.find(i => i.id === pending.id && i.type === pending.type)
  if (found) {
    const sectionMap: Record<string, SectionId> = {
      menu: 'menu',
      recipe: 'recipes',
      preparation: 'preps',
      product: 'products'
    }
    const targetSection = sectionMap[found.type]
    if (targetSection && activeSection.value !== targetSection) {
      activeSection.value = targetSection
    }
    // Reset navigation state before opening detail
    currentCategory.value = null
    selectedItem.value = null
    navStack.value = []
    openDetail(found)
    emit('pendingItemConsumed')
    return true
  }
  return false
}

watch(
  () => props.pendingItem,
  pending => {
    if (!pending) return
    // Try immediately, then retry after renders settle
    if (!navigateToPendingItem()) {
      nextTick(() => {
        if (!navigateToPendingItem()) {
          // Final fallback — wait for async data
          setTimeout(() => {
            navigateToPendingItem()
          }, 100)
        }
      })
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.catalog-screen {
  height: 100%;
  display: flex;
  overflow: hidden;
}

// --- Section rail ---
.section-rail {
  width: 56px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 4px;
  background: rgba(255, 255, 255, 0.03);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  transition: width 0.2s ease;
  overflow: hidden;

  &.expanded {
    width: 140px;
  }
}

.rail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  min-height: 44px;
  transition: background 0.15s;

  &:active {
    background: rgba(255, 255, 255, 0.08);
  }

  &.active {
    background: rgba(255, 255, 255, 0.1);
  }
}

.rail-label {
  font-size: 0.78rem;
  font-weight: 500;
  overflow: hidden;
}

.rail-count {
  font-size: 0.7rem;
  opacity: 0.5;
  margin-left: auto;
}

.rail-toggle {
  margin-top: auto;
  padding: 8px;
  display: flex;
  justify-content: center;
  cursor: pointer;
  opacity: 0.5;

  &:hover {
    opacity: 1;
  }
}

// --- Main content ---
.catalog-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-width: 0;
}

.catalog-header {
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.header-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dept-toggle {
  flex-shrink: 0;

  :deep(.v-btn) {
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.8rem;
    min-width: 70px;
  }
}

.search-input {
  flex: 1;
  min-width: 120px;

  :deep(.v-field) {
    border-radius: 8px;
  }
}

.breadcrumb {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  padding: 4px 0;
}

.breadcrumb-item {
  padding: 6px 8px;
  border-radius: 6px;

  &.clickable {
    cursor: pointer;
    color: rgba(255, 255, 255, 0.7);

    &:active {
      background: rgba(255, 255, 255, 0.08);
    }
  }
}

.breadcrumb-sep {
  opacity: 0.4;
}

.catalog-content {
  flex: 1;
  padding: 12px 16px;
}

// --- Filter dialog ---
.filter-group {
  margin-bottom: 16px;
}

.filter-label {
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.7);
}
</style>
