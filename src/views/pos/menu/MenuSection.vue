<!-- src/views/pos/menu/MenuSection.vue -->
<template>
  <div class="menu-section">
    <!-- Header with navigation -->
    <div class="menu-header">
      <div v-if="currentView === 'categories'" class="d-flex align-center justify-space-between">
        <h2 class="text-h5 font-weight-medium">{{ currentTitle }}</h2>
        <v-btn
          icon="mdi-refresh"
          variant="text"
          size="small"
          :loading="loading"
          @click="refreshMenu"
        />
      </div>

      <div v-else class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-btn icon="mdi-arrow-left" variant="text" size="small" @click="goBack" />
          <h2 class="text-h5 font-weight-medium ml-2">{{ currentTitle }}</h2>
        </div>
        <v-btn
          icon="mdi-refresh"
          variant="text"
          size="small"
          :loading="loading"
          @click="refreshMenu"
        />
      </div>
    </div>

    <!-- Content Area -->
    <div class="menu-content">
      <!-- Loading State -->
      <div v-if="loading" class="d-flex justify-center align-center" style="height: 200px">
        <v-progress-circular indeterminate color="primary" size="48" />
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="d-flex flex-column justify-center align-center"
        style="height: 200px"
      >
        <v-icon icon="mdi-alert-circle" size="48" color="error" class="mb-4" />
        <div class="text-h6 text-error mb-2">Error Loading Menu</div>
        <div class="text-body-2 text-medium-emphasis mb-4">{{ error }}</div>
        <v-btn color="primary" @click="refreshMenu">Try Again</v-btn>
      </div>

      <!-- Categories View -->
      <div v-else-if="currentView === 'categories'" class="categories-grid">
        <v-container fluid>
          <v-row>
            <v-col
              v-for="category in activeCategories"
              :key="category.id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <v-card class="category-card" hover @click="selectCategory(category.id)">
                <v-card-text class="text-center pa-6">
                  <v-icon
                    :icon="category.icon || 'mdi-food'"
                    size="48"
                    class="mb-3"
                    color="primary"
                  />
                  <div class="text-h6 font-weight-medium mb-1">
                    {{ category.name }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ getCategoryItemsCount(category.id) }} items
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </div>

      <!-- Items View -->
      <div v-else-if="currentView === 'items'" class="items-grid">
        <v-container fluid>
          <v-row>
            <v-col v-for="item in categoryItems" :key="item.id" cols="12" sm="6" md="4">
              <v-card class="item-card" hover @click="selectItem(item)">
                <v-img v-if="item.imageUrl" :src="item.imageUrl" height="120" cover />
                <v-card-text class="pa-4">
                  <div class="text-h6 font-weight-medium mb-1">
                    {{ item.name }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis mb-2">
                    {{ item.description }}
                  </div>
                  <div class="d-flex justify-space-between align-center">
                    <div class="text-h6 font-weight-bold text-primary">
                      {{ formatPrice(item.variants[0]?.price || 0) }}
                    </div>
                    <v-btn
                      size="small"
                      color="primary"
                      variant="elevated"
                      @click.stop="handleQuickAdd(item)"
                    >
                      Add
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </div>

      <!-- Variants View -->
      <div v-else-if="currentView === 'variants'" class="variants-grid">
        <v-container fluid>
          <v-row>
            <v-col v-for="variant in itemVariants" :key="variant.id" cols="12" sm="6" md="4">
              <v-card class="variant-card" hover @click="handleAddItem(selectedItem!, variant)">
                <v-card-text class="pa-4">
                  <div class="text-h6 font-weight-medium mb-1">
                    {{ variant.name }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis mb-2">
                    {{ variant.description }}
                  </div>
                  <div class="d-flex justify-space-between align-center">
                    <div class="text-h6 font-weight-bold text-primary">
                      {{ formatPrice(variant.price) }}
                    </div>
                    <v-chip
                      v-if="variant.isPopular"
                      color="success"
                      size="small"
                      variant="elevated"
                    >
                      Popular
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </div>

      <!-- Empty State -->
      <div v-else class="d-flex flex-column justify-center align-center" style="height: 200px">
        <v-icon icon="mdi-food-off" size="48" color="grey" class="mb-4" />
        <div class="text-h6 text-medium-emphasis mb-2">No Items Available</div>
        <div class="text-body-2 text-medium-emphasis">
          {{
            currentView === 'items'
              ? 'This category has no available items'
              : 'No variants available'
          }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMenuStore } from '@/stores/menu/menuStore'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { DebugUtils } from '@/utils'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'

// Компоненты (предполагаем что они существуют)
// import CategoryCard from './components/CategoryCard.vue'
// import MenuItemCard from './components/MenuItemCard.vue'

const MODULE_NAME = 'MenuSection'

// ===== EMITS =====
const emit = defineEmits<{
  'add-item': [item: MenuItem, variant: MenuItemVariant]
}>()

// ===== STORES =====
const menuStore = useMenuStore()
const ordersStore = usePosOrdersStore()

// ===== STATE =====
const loading = ref(false)
const error = ref<string | null>(null)

type ViewMode = 'categories' | 'items' | 'variants'
const currentView = ref<ViewMode>('categories')
const selectedCategoryId = ref<string | null>(null)
const selectedItem = ref<MenuItem | null>(null)

// ===== COMPUTED =====

/**
 * Активные категории (только доступные)
 */
const activeCategories = computed(() => {
  return menuStore.categories.filter(category => category.isActive)
})

/**
 * Товары текущей категории
 */
const categoryItems = computed(() => {
  if (!selectedCategoryId.value) return []

  return menuStore.menuItems.filter(
    item => item.categoryId === selectedCategoryId.value && item.isActive
  )
})

/**
 * Варианты выбранного товара
 */
const itemVariants = computed(() => {
  if (!selectedItem.value) return []
  return selectedItem.value.variants.filter(variant => variant.isActive)
})

/**
 * Текущие отображаемые элементы в зависимости от режима
 */
const currentItems = computed(() => {
  switch (currentView.value) {
    case 'categories':
      return activeCategories.value
    case 'items':
      return categoryItems.value
    case 'variants':
      return itemVariants.value
    default:
      return []
  }
})

/**
 * Заголовок текущего вида
 */
const currentTitle = computed(() => {
  switch (currentView.value) {
    case 'categories':
      return 'Menu Categories'
    case 'items':
      const category = activeCategories.value.find(c => c.id === selectedCategoryId.value)
      return category?.name || 'Items'
    case 'variants':
      return selectedItem.value?.name || 'Variants'
    default:
      return 'Menu'
  }
})

/**
 * Может ли пользователь вернуться назад
 */
const canGoBack = computed(() => {
  return currentView.value !== 'categories'
})

/**
 * Счетчик товаров в категории
 */
const getCategoryItemsCount = (categoryId: string): number => {
  return menuStore.menuItems.filter(item => item.categoryId === categoryId && item.isActive).length
}

// ===== METHODS =====

/**
 * Форматирование цены
 */
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

/**
 * Выбор категории
 */
const selectCategory = (categoryId: string): void => {
  DebugUtils.debug(MODULE_NAME, 'Category selected', {
    categoryId,
    categoryName: activeCategories.value.find(c => c.id === categoryId)?.name
  })

  selectedCategoryId.value = categoryId
  currentView.value = 'items'
  selectedItem.value = null
}

/**
 * Выбор товара
 */
const selectItem = (item: MenuItem): void => {
  DebugUtils.debug(MODULE_NAME, 'Item selected', {
    itemId: item.id,
    itemName: item.name,
    variantsCount: item.variants.length
  })

  selectedItem.value = item

  // Если у товара только один вариант, сразу его используем
  if (item.variants.length === 1) {
    const variant = item.variants[0]
    if (variant.isActive) {
      handleAddItem(item, variant)
      return
    }
  }

  // Иначе показываем варианты
  currentView.value = 'variants'
}

/**
 * КЛЮЧЕВАЯ ФУНКЦИЯ: Добавление товара в заказ
 * Эта функция эмитирует событие в родительский компонент (PosMainView)
 */
const handleAddItem = (item: MenuItem, variant: MenuItemVariant): void => {
  try {
    DebugUtils.debug(MODULE_NAME, 'Adding item to order', {
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
      timestamp: new Date().toISOString(),
      hasActiveOrder: !!ordersStore.currentOrder
    })

    // Проверяем доступность товара и варианта
    if (!item.isActive) {
      throw new Error(`Item ${item.name} is not available`)
    }

    if (!variant.isActive) {
      throw new Error(`Variant ${variant.name} is not available`)
    }

    // Эмитируем событие в родительский компонент
    emit('add-item', item, variant)

    DebugUtils.debug(MODULE_NAME, 'Add item event emitted successfully')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add item'
    DebugUtils.error(MODULE_NAME, 'Error adding item', {
      error: message,
      item: item.name,
      variant: variant.name
    })

    // TODO: Показать уведомление об ошибке
    console.error('❌ MenuSection - Failed to add item:', message)
  }
}

/**
 * Быстрое добавление товара (без выбора вариантов)
 */
const handleQuickAdd = (item: MenuItem): void => {
  // Берем первый активный вариант
  const activeVariant = item.variants.find(v => v.isActive)

  if (!activeVariant) {
    DebugUtils.error(MODULE_NAME, 'No active variants found for item', {
      itemId: item.id,
      itemName: item.name
    })
    return
  }

  handleAddItem(item, activeVariant)
}

/**
 * Возврат к предыдущему виду
 */
const goBack = (): void => {
  switch (currentView.value) {
    case 'items':
      DebugUtils.debug(MODULE_NAME, 'Going back to categories')
      currentView.value = 'categories'
      selectedCategoryId.value = null
      break
    case 'variants':
      DebugUtils.debug(MODULE_NAME, 'Going back to items')
      currentView.value = 'items'
      selectedItem.value = null
      break
  }
}

/**
 * Обновление меню
 */
const refreshMenu = async (): Promise<void> => {
  try {
    loading.value = true
    error.value = null

    DebugUtils.debug(MODULE_NAME, 'Refreshing menu data')

    await menuStore.fetchCategories()
    await menuStore.fetchMenuItems()

    DebugUtils.debug(MODULE_NAME, 'Menu refreshed successfully')
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to refresh menu'
    error.value = errorMessage
    DebugUtils.error(MODULE_NAME, 'Failed to refresh menu', { error: errorMessage })
  } finally {
    loading.value = false
  }
}

/**
 * Инициализация меню
 */
const initializeMenu = async (): Promise<void> => {
  try {
    loading.value = true
    error.value = null

    DebugUtils.debug(MODULE_NAME, 'Initializing menu')

    // Загружаем категории и товары из MenuStore
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
    const errorMessage = err instanceof Error ? err.message : 'Failed to initialize menu'
    error.value = errorMessage
    DebugUtils.error(MODULE_NAME, 'Failed to initialize menu', { error: errorMessage })
  } finally {
    loading.value = false
  }
}

// ===== WATCHERS =====

/**
 * Отслеживание изменений текущего заказа
 */
watch(
  () => ordersStore.currentOrder,
  (newOrder, oldOrder) => {
    if (newOrder?.id !== oldOrder?.id) {
      DebugUtils.debug(MODULE_NAME, 'Current order changed', {
        oldOrderId: oldOrder?.id,
        newOrderId: newOrder?.id
      })
    }
  }
)

// ===== LIFECYCLE =====

onMounted(async () => {
  DebugUtils.debug(MODULE_NAME, 'MenuSection mounted')
  await initializeMenu()
})

// ===== EXPOSE FOR PARENT =====
defineExpose({
  refreshMenu,
  goBack,
  selectCategory,
  selectItem,
  handleAddItem
})

// ===== DEBUG (DEV MODE) =====
if (import.meta.env.DEV) {
  ;(window as any).menuSection = {
    store: menuStore,
    currentView,
    selectedCategoryId,
    selectedItem,
    activeCategories,
    categoryItems,
    methods: { selectCategory, selectItem, handleAddItem, goBack, refreshMenu }
  }
}
</script>

<style scoped>
/* =============================================
   MENU SECTION LAYOUT
   ============================================= */

.menu-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-background));
  overflow: hidden;
}

.menu-header {
  flex-shrink: 0;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgb(var(--v-theme-surface));
}

.menu-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* =============================================
   GRIDS
   ============================================= */

.categories-grid,
.items-grid,
.variants-grid {
  padding: 16px 0;
}

/* =============================================
   CARDS
   ============================================= */

.category-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 12px;
  min-height: 140px;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.item-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 12px;
  overflow: hidden;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.variant-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 12px;
}

.variant-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* =============================================
   RESPONSIVE BEHAVIOR
   ============================================= */

@media (max-width: 768px) {
  .menu-header {
    padding: 12px 16px;
  }

  .categories-grid,
  .items-grid,
  .variants-grid {
    padding: 12px 0;
  }
}

/* =============================================
   TOUCH OPTIMIZATIONS
   ============================================= */

.category-card,
.item-card,
.variant-card {
  min-height: 44px; /* Touch target minimum */
}

@media (hover: none) {
  .category-card:hover,
  .item-card:hover,
  .variant-card:hover {
    transform: none;
  }
}

/* =============================================
   ACCESSIBILITY
   ============================================= */

.category-card:focus,
.item-card:focus,
.variant-card:focus {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .category-card,
  .item-card,
  .variant-card {
    transition: none !important;
  }
}

/* =============================================
   SCROLLBAR STYLING
   ============================================= */

.menu-content::-webkit-scrollbar {
  width: 6px;
}

.menu-content::-webkit-scrollbar-track {
  background: transparent;
}

.menu-content::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 3px;
}

.menu-content::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}
</style>
