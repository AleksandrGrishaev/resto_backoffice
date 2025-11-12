<!-- src/views/pos/menu/MenuSection.vue -->
<template>
  <div class="menu-section">
    <!-- Header with navigation -->
    <div class="menu-header">
      <div v-if="currentView === 'categories'" class="d-flex align-center justify-space-between">
        <h2 class="text-h5 font-weight-medium">Menu</h2>
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

    <!-- Customization Dialog -->
    <CustomizationDialog
      v-model="showCustomizationDialog"
      :menu-item="customizingItem"
      :variant="customizingVariant"
      @add-to-bill="handleAddWithModifiers"
      @cancel="handleCancelCustomization"
    />

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
              <CategoryCard
                :category="category"
                :items-count="getCategoryItemsCount(category.id)"
                @select="selectCategory"
              />
            </v-col>
          </v-row>
        </v-container>
      </div>

      <!-- Items View -->
      <div v-else-if="currentView === 'items'" class="items-grid">
        <v-container fluid>
          <v-row>
            <v-col v-for="item in categoryItems" :key="item.id" cols="12" sm="6" md="4">
              <MenuItemCard :item="item" @add-item="handleAddAndReturn" @select-item="selectItem" />
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
                    <v-btn size="small" color="primary" variant="flat">Add</v-btn>
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
import { ref, computed, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu/menuStore'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import type { MenuItem, MenuItemVariant, SelectedModifier } from '@/stores/menu/types'

// Components
import CategoryCard from './components/CategoryCard.vue'
import MenuItemCard from './components/MenuItemCard.vue'
import CustomizationDialog from './dialogs/CustomizationDialog.vue'

// ===== EMITS =====
const emit = defineEmits<{
  'add-item': [item: MenuItem, variant: MenuItemVariant, selectedModifiers?: SelectedModifier[]]
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

// Customization Dialog State
const showCustomizationDialog = ref(false)
const customizingItem = ref<MenuItem | null>(null)
const customizingVariant = ref<MenuItemVariant | null>(null)

// ===== COMPUTED =====

/**
 * Активные категории
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
 * Заголовок текущего вида
 */
const currentTitle = computed(() => {
  switch (currentView.value) {
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
  selectedCategoryId.value = categoryId
  currentView.value = 'items'
  selectedItem.value = null
}

/**
 * Выбор товара
 */
const selectItem = (item: MenuItem): void => {
  selectedItem.value = item
  currentView.value = 'variants'
}

/**
 * Добавление товара с возвратом в главное меню
 */
const handleAddAndReturn = (item: MenuItem, variant: MenuItemVariant): void => {
  // Добавляем товар
  handleAddItem(item, variant)

  // Возвращаемся в главное меню
  currentView.value = 'categories'
  selectedCategoryId.value = null
  selectedItem.value = null
}

/**
 * КЛЮЧЕВАЯ ФУНКЦИЯ: Добавление товара в заказ
 */
const handleAddItem = (item: MenuItem, variant: MenuItemVariant): void => {
  try {
    // Проверяем доступность товара и варианта
    if (!item.isActive) {
      throw new Error(`Item ${item.name} is not available`)
    }

    if (!variant.isActive) {
      throw new Error(`Variant ${variant.name} is not available`)
    }

    // ✨ UPDATED: Check if item has modifiers (moved from variant to MenuItem level)
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      // Open customization dialog
      customizingItem.value = item
      customizingVariant.value = variant
      showCustomizationDialog.value = true
      return
    }

    // No modifiers - add directly
    emit('add-item', item, variant)

    // Возвращаемся в главное меню после добавления из variants view
    if (currentView.value === 'variants') {
      currentView.value = 'categories'
      selectedCategoryId.value = null
      selectedItem.value = null
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add item'
    console.error('Failed to add item:', message)
  }
}

/**
 * ✨ NEW: Handle adding item with modifiers from CustomizationDialog
 */
const handleAddWithModifiers = (selectedModifiers: SelectedModifier[]): void => {
  if (!customizingItem.value || !customizingVariant.value) return

  try {
    // Emit with modifiers
    emit('add-item', customizingItem.value, customizingVariant.value, selectedModifiers)

    // Close dialog
    showCustomizationDialog.value = false
    customizingItem.value = null
    customizingVariant.value = null

    // Return to main menu
    currentView.value = 'categories'
    selectedCategoryId.value = null
    selectedItem.value = null
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add item with modifiers'
    console.error('Failed to add item with modifiers:', message)
  }
}

/**
 * ✨ NEW: Handle customization dialog cancel
 */
const handleCancelCustomization = (): void => {
  showCustomizationDialog.value = false
  customizingItem.value = null
  customizingVariant.value = null
}

/**
 * Возврат к предыдущему виду
 */
const goBack = (): void => {
  switch (currentView.value) {
    case 'items':
      currentView.value = 'categories'
      selectedCategoryId.value = null
      break
    case 'variants':
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

    await menuStore.fetchCategories()
    await menuStore.fetchMenuItems()
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to refresh menu'
    error.value = errorMessage
  } finally {
    loading.value = false
  }
}

// ===== LIFECYCLE =====

onMounted(async () => {
  await refreshMenu()
})
</script>

<style scoped>
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

.categories-grid,
.items-grid,
.variants-grid {
  padding: 16px 0;
}

.variant-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 12px;
  min-height: 44px;
}

.variant-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

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

@media (hover: none) {
  .variant-card:hover {
    transform: none;
  }
}

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
</style>
