<!-- src/views/pos/menu/MenuSection.vue -->
<template>
  <div class="menu-section h-100 d-flex flex-column">
    <!-- Header with navigation -->
    <div class="menu-header d-flex align-center pa-3 border-b">
      <!-- Back button -->
      <v-btn v-if="currentView !== 'categories'" icon variant="text" size="small" @click="goBack">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <!-- Title -->
      <div class="flex-grow-1">
        <h3 class="text-h6 font-weight-medium">
          {{ currentTitle }}
        </h3>
        <div v-if="currentSubtitle" class="text-caption text-medium-emphasis">
          {{ currentSubtitle }}
        </div>
      </div>

      <!-- Actions -->
      <div class="header-actions">
        <v-btn icon variant="text" size="small" :loading="loading" @click="refreshMenu">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Content area -->
    <div class="menu-content flex-grow-1 overflow-y-auto pa-3">
      <!-- Loading state -->
      <div v-if="loading && !hasData" class="d-flex justify-center align-center h-100">
        <v-progress-circular indeterminate color="primary" size="48" />
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="d-flex flex-column justify-center align-center h-100 text-center"
      >
        <v-icon icon="mdi-alert-circle" size="48" class="text-error mb-2" />
        <div class="text-h6 mb-2">Ошибка загрузки меню</div>
        <div class="text-body-2 text-medium-emphasis mb-4">{{ error }}</div>
        <v-btn color="primary" @click="initializeMenu">Попробовать снова</v-btn>
      </div>

      <!-- Categories view -->
      <div v-else-if="currentView === 'categories'" class="categories-grid">
        <div
          v-if="!activeCategories.length"
          class="d-flex flex-column justify-center align-center h-100 text-center"
        >
          <v-icon icon="mdi-folder-off" size="48" class="text-medium-emphasis mb-2" />
          <div class="text-body-2 text-medium-emphasis">Нет доступных категорий</div>
        </div>

        <CategoryCard
          v-for="category in activeCategories"
          :key="category.id"
          :category="category"
          :items-count="getCategoryItemsCount(category.id)"
          @select="selectCategory"
        />
      </div>

      <!-- Items view -->
      <div v-else-if="currentView === 'items'" class="items-grid">
        <div
          v-if="!currentCategoryItems.length"
          class="d-flex flex-column justify-center align-center h-100 text-center"
        >
          <v-icon icon="mdi-food-off" size="48" class="text-medium-emphasis mb-2" />
          <div class="text-body-2 text-medium-emphasis">Нет товаров в этой категории</div>
        </div>

        <MenuItemCard
          v-for="item in currentCategoryItems"
          :key="item.id"
          :item="item"
          :show-variant-chips="true"
          @select-item="handleItemClick"
          @select-variant="handleVariantSelect"
        />
      </div>

      <!-- Variants view (если нужен отдельный вид для вариантов) -->
      <div v-else-if="currentView === 'variants' && selectedItem" class="variants-view">
        <div class="variants-header mb-4 pa-3 bg-surface-variant rounded">
          <div class="text-h6">{{ selectedItem.name }}</div>
          <div v-if="selectedItem.description" class="text-body-2 text-medium-emphasis mt-1">
            {{ selectedItem.description }}
          </div>
        </div>

        <div class="variants-grid">
          <v-card
            v-for="variant in selectedItemActiveVariants"
            :key="variant.id"
            class="variant-card pos-card"
            :class="{ 'variant-disabled': !variant.isActive }"
            elevation="2"
            @click="handleVariantSelect(selectedItem, variant)"
          >
            <v-card-text class="pa-4">
              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-subtitle-1 font-weight-medium">{{ variant.name }}</div>
                  <div class="text-h6 text-primary font-weight-bold mt-1">
                    {{ formatPrice(variant.price) }}
                  </div>
                </div>
                <v-icon color="primary">mdi-plus</v-icon>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'
import type { MenuItem, MenuItemVariant, Category } from '@/stores/menu/types'
import CategoryCard from './components/CategoryCard.vue'
import MenuItemCard from './components/MenuItemCard.vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PosMenuSection'

// Store
const menuStore = useMenuStore()

// State
type ViewMode = 'categories' | 'items' | 'variants'

const currentView = ref<ViewMode>('categories')
const selectedCategoryId = ref<string | null>(null)
const selectedItem = ref<MenuItem | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Computed
const activeCategories = computed(() => menuStore.activeCategories)

const selectedCategory = computed((): Category | null => {
  if (!selectedCategoryId.value) return null
  return activeCategories.value.find(cat => cat.id === selectedCategoryId.value) || null
})

const currentCategoryItems = computed((): MenuItem[] => {
  if (!selectedCategoryId.value) return []
  return menuStore.getActiveItemsByCategory(selectedCategoryId.value)
})

const selectedItemActiveVariants = computed((): MenuItemVariant[] => {
  if (!selectedItem.value) return []
  return selectedItem.value.variants?.filter(v => v.isActive) || []
})

const hasData = computed(() => {
  return activeCategories.value.length > 0 || currentCategoryItems.value.length > 0
})

const currentTitle = computed((): string => {
  switch (currentView.value) {
    case 'categories':
      return 'Меню'
    case 'items':
      return selectedCategory.value?.name || 'Категория'
    case 'variants':
      return selectedItem.value?.name || 'Варианты'
    default:
      return 'Меню'
  }
})

const currentSubtitle = computed((): string | null => {
  switch (currentView.value) {
    case 'categories':
      return `${activeCategories.value.length} категорий`
    case 'items':
      return `${currentCategoryItems.value.length} товаров`
    case 'variants':
      return `${selectedItemActiveVariants.value.length} вариантов`
    default:
      return null
  }
})

// Emits
const emit = defineEmits<{
  'add-item': [item: MenuItem, variant: MenuItemVariant]
}>()

// Methods
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const getCategoryItemsCount = (categoryId: string): number => {
  return menuStore.getActiveItemsByCategory(categoryId).length
}

const selectCategory = (categoryId: string): void => {
  console.log('📂 Navigating to category:', categoryId)

  selectedCategoryId.value = categoryId
  selectedItem.value = null
  currentView.value = 'items'
}

const handleItemClick = (item: MenuItem): void => {
  console.log('🍽️ Item clicked for variants selection:', {
    itemId: item.id,
    itemName: item.name,
    variantsCount: item.variants?.filter(v => v.isActive).length || 0
  })

  selectedItem.value = item
  currentView.value = 'variants'
}

const handleVariantSelect = (item: MenuItem, variant: MenuItemVariant): void => {
  console.log('🎯 FINAL SELECTION - Adding to order:', {
    item: {
      id: item.id,
      name: item.name,
      type: item.type,
      categoryId: item.categoryId,
      isActive: item.isActive
    },
    variant: {
      id: variant.id,
      name: variant.name,
      price: variant.price,
      isActive: variant.isActive
    },
    formattedPrice: formatPrice(variant.price),
    timestamp: new Date().toISOString()
  })

  // TODO: Здесь будет интеграция с OrderStore
  emit('add-item', item, variant)
}

const goBack = (): void => {
  switch (currentView.value) {
    case 'items':
      console.log('📂 Going back to categories')
      currentView.value = 'categories'
      selectedCategoryId.value = null
      break
    case 'variants':
      console.log('📂 Going back to items')
      currentView.value = 'items'
      selectedItem.value = null
      break
  }
}

const refreshMenu = async (): Promise<void> => {
  console.log('🔄 Refreshing menu data')
  await initializeMenu()
}

const initializeMenu = async (): Promise<void> => {
  try {
    loading.value = true
    error.value = null

    DebugUtils.debug(MODULE_NAME, 'Initializing menu')

    // Загружаем категории и товары из MenuStore
    // Используем правильные методы из MenuStore
    await menuStore.fetchCategories()
    await menuStore.fetchMenuItems()

    DebugUtils.debug(MODULE_NAME, 'Menu initialized successfully', {
      categoriesCount: activeCategories.value.length,
      totalItems: menuStore.menuItems.length,
      activeItems: menuStore.activeMenuItems.length
    })

    console.log('📋 Menu initialization complete:', {
      categories: activeCategories.value.map(cat => ({
        id: cat.id,
        name: cat.name,
        itemsCount: getCategoryItemsCount(cat.id),
        isActive: cat.isActive
      })),
      totalActiveCategories: activeCategories.value.length,
      totalActiveItems: menuStore.activeMenuItems.length
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load menu'
    error.value = errorMessage

    DebugUtils.error(MODULE_NAME, 'Menu initialization failed', { error: err })
    console.error('❌ Menu initialization error:', errorMessage)
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  console.log('🚀 MenuSection mounted, initializing...')
  initializeMenu()
})
</script>

<style scoped>
/* =============================================
   MAIN LAYOUT
   ============================================= */

.menu-section {
  background: rgb(var(--v-theme-background));
}

.menu-header {
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  min-height: 64px;
}

.menu-content {
  background: rgb(var(--v-theme-background));
}

/* =============================================
   GRID LAYOUTS
   ============================================= */

.categories-grid,
.items-grid {
  display: grid;
  gap: var(--spacing-md);
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.variants-grid {
  display: grid;
  gap: var(--spacing-md);
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

/* =============================================
   VARIANT CARDS (for variants view)
   ============================================= */

.variant-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 2px solid transparent;
  min-height: var(--touch-card);
}

.variant-card:hover:not(.variant-disabled) {
  transform: translateY(-2px);
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 8px 16px rgba(var(--v-theme-primary), 0.15) !important;
}

.variant-card.variant-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.variant-card.variant-disabled:hover {
  transform: none;
  border-color: transparent;
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 1200px) {
  .categories-grid,
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

@media (max-width: 768px) {
  .menu-header {
    padding: var(--spacing-sm) !important;
    min-height: 56px;
  }

  .menu-content {
    padding: var(--spacing-sm) !important;
  }

  .categories-grid,
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--spacing-sm);
  }

  .variants-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
}

@media (max-width: 480px) {
  .categories-grid,
  .items-grid,
  .variants-grid {
    grid-template-columns: 1fr;
  }
}

/* =============================================
   UTILITIES
   ============================================= */

.border-b {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.bg-surface-variant {
  background-color: rgb(var(--v-theme-surface-variant)) !important;
}

/* =============================================
   LOADING AND ERROR STATES
   ============================================= */

.menu-content .v-progress-circular {
  margin: auto;
}

/* =============================================
   HEADER ACTIONS
   ============================================= */

.header-actions .v-btn {
  margin-left: var(--spacing-xs);
}
</style>
