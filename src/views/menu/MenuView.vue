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

      <!-- Menu panels -->
      <v-expansion-panels v-model="expandedPanels" multiple>
        <v-expansion-panel
          v-for="category in filteredCategories"
          :key="category.id"
          :value="category.id"
          :class="{
            'category--inactive': !category.isActive,
            'category--empty': getCategoryItems(category.id).length === 0
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
                  v-if="getCategoryItems(category.id).length === 0"
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
            <div
              v-if="getCategoryItems(category.id).length === 0"
              class="text-center py-4 text-medium-emphasis"
            >
              No dishes
            </div>
            <div v-for="item in getCategoryItems(category.id)" :key="item.id">
              <menu-item-component :item="item" @edit="editItem" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'
import type { Category, MenuItem, DishType } from '@/stores/menu'
import { DebugUtils } from '@/utils'
import MenuCategoryDialog from './components/MenuCategoryDialog.vue'
import MenuItemDialog from './components/MenuItemDialog.vue'
import MenuItemComponent from './components/MenuItem.vue'
import DishTypeSelectionDialog from './components/DishTypeSelectionDialog.vue'

const MODULE_NAME = 'MenuView'
const menuStore = useMenuStore()

// State
const expandedPanels = ref<string[]>([])
const search = ref('')
const filterTypes = ref<Array<'food' | 'beverage' | 'archive'>>(['food'])

// Dialogs state
const dialogs = ref({
  dishTypeSelection: false, // ✨ NEW: Диалог выбора типа блюда
  category: false,
  item: false
})
const editingCategory = ref<Category | null>(null)
const editingItem = ref<MenuItem | null>(null)
const selectedDishType = ref<DishType | null>(null) // ✨ NEW: Выбранный тип блюда

const confirmDialog = ref({
  show: false,
  category: null as Category | null
})

// Computed
const filteredCategories = computed(() => {
  const categories = menuStore.categories.filter(category => {
    // Фильтр по поиску
    if (search.value && !category.name.toLowerCase().includes(search.value.toLowerCase())) {
      return false
    }

    // Фильтр по активным категориям если не выбран архив
    if (!filterTypes.value.includes('archive') && !category.isActive) {
      return false
    }

    return true
  })

  // Сортировка категорий по sortOrder
  return categories.sort((a, b) => {
    const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0)
    if (orderDiff !== 0) return orderDiff
    return a.name.localeCompare(b.name)
  })
})

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

function getCategoryItems(categoryId: string) {
  return menuStore.getItemsByCategory(categoryId).filter(item => {
    if (search.value && !item.name.toLowerCase().includes(search.value.toLowerCase())) {
      return false
    }

    if (filterTypes.value.includes('archive') && !item.isActive) {
      return true
    }

    return filterTypes.value.includes(item.type) && item.isActive
  })
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
</style>
