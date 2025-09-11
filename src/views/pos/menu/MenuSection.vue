<!-- src/views/pos/menu/MenuSection.vue -->
<template>
  <div class="menu-section">
    <!-- Category Tabs -->
    <div class="category-tabs pa-3">
      <v-btn-toggle
        v-model="selectedCategoryIndex"
        color="primary"
        variant="outlined"
        divided
        mandatory
      >
        <v-btn
          v-for="(category, index) in activeCategories"
          :key="category.id"
          :value="index"
          size="large"
          class="category-btn"
        >
          {{ category.name }}
        </v-btn>
      </v-btn-toggle>
    </div>

    <v-divider />

    <!-- Menu Items Grid -->
    <div class="menu-items pa-3">
      <div v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" />
        <div class="mt-2 text-body-2">Loading menu...</div>
      </div>

      <div v-else-if="error" class="text-center pa-8">
        <v-icon icon="mdi-alert-circle" size="48" color="error" class="mb-2" />
        <div class="text-body-2 text-error">{{ error }}</div>
        <v-btn variant="outlined" class="mt-2" @click="initializeMenu">Retry</v-btn>
      </div>

      <div v-else class="menu-grid">
        <v-card
          v-for="item in currentCategoryItems"
          :key="item.id"
          class="menu-item-card"
          :disabled="!item.isActive"
          @click="handleItemClick(item)"
        >
          <v-card-text class="pa-3">
            <div class="item-name text-subtitle-1 font-weight-bold mb-2">
              {{ item.name }}
            </div>

            <div
              v-if="item.description"
              class="item-description text-caption text-medium-emphasis mb-2"
            >
              {{ item.description }}
            </div>

            <!-- Variants - показываем если больше одного варианта -->
            <div v-if="item.variants.length > 1" class="variants mb-2">
              <v-chip
                v-for="variant in activeVariants(item)"
                :key="variant.id"
                size="small"
                variant="outlined"
                class="me-1 mb-1"
                @click.stop="addToOrder(item, variant)"
              >
                {{ variant.name }} - {{ formatPrice(variant.price) }}
              </v-chip>
            </div>

            <!-- Single variant price -->
            <div
              v-else-if="item.variants.length === 1"
              class="item-price text-h6 font-weight-bold text-primary"
            >
              {{ formatPrice(item.variants[0].price) }}
            </div>

            <!-- No variants available -->
            <div v-else class="text-caption text-error">No variants available</div>
          </v-card-text>

          <!-- Add Button Overlay for single variant items -->
          <v-overlay
            v-if="item.variants.length === 1"
            :model-value="false"
            contained
            class="add-overlay"
          >
            <v-btn icon="mdi-plus" color="primary" size="large" />
          </v-overlay>
        </v-card>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="!loading && !error && currentCategoryItems.length === 0"
      class="empty-state pa-8 text-center"
    >
      <v-icon icon="mdi-food-off" size="48" class="text-medium-emphasis mb-2" />
      <div class="text-body-2 text-medium-emphasis">No items in this category</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PosMenuSection'

// Store
const menuStore = useMenuStore()

// State
const selectedCategoryIndex = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

// Computed
const activeCategories = computed(() => menuStore.activeCategories)

const selectedCategory = computed(() => {
  return activeCategories.value[selectedCategoryIndex.value] || null
})

const currentCategoryItems = computed(() => {
  if (!selectedCategory.value) return []
  return menuStore.getActiveItemsByCategory(selectedCategory.value.id)
})

// Emits
const emit = defineEmits<{
  'add-item': [item: MenuItem, variant: MenuItemVariant]
}>()

// Methods
const activeVariants = (item: MenuItem) => {
  return item.variants.filter(variant => variant.isActive)
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const handleItemClick = (item: MenuItem) => {
  if (!item.isActive) return

  const activeVars = activeVariants(item)

  if (activeVars.length === 1) {
    // Single variant - add directly
    addToOrder(item, activeVars[0])
  } else if (activeVars.length > 1) {
    // Multiple variants - handled by chip clicks
    DebugUtils.debug(MODULE_NAME, 'Item with multiple variants clicked', {
      itemId: item.id,
      variantsCount: activeVars.length
    })
  } else {
    DebugUtils.warn(MODULE_NAME, 'Item clicked but no active variants', { itemId: item.id })
  }
}

const addToOrder = (item: MenuItem, variant: MenuItemVariant) => {
  if (!item.isActive || !variant.isActive) return

  DebugUtils.debug(MODULE_NAME, 'Adding item to order', {
    itemId: item.id,
    itemName: item.name,
    variantId: variant.id,
    variantName: variant.name,
    price: variant.price
  })

  emit('add-item', item, variant)

  // TODO: Интеграция с OrderStore/BillStore
  // После интеграции здесь будет:
  // await billStore.addItem({
  //   dishId: item.id,
  //   variantId: variant.id,
  //   quantity: 1,
  //   price: variant.price,
  //   status: 'pending'
  // })
}

const initializeMenu = async () => {
  try {
    loading.value = true
    error.value = null

    DebugUtils.debug(MODULE_NAME, 'Initializing menu')

    // Load categories and menu items
    await menuStore.loadActiveCategories()
    await menuStore.loadActiveItems()

    // Set first category as selected if available
    if (activeCategories.value.length > 0) {
      selectedCategoryIndex.value = 0
    }

    DebugUtils.debug(MODULE_NAME, 'Menu initialized successfully', {
      categoriesCount: activeCategories.value.length,
      selectedCategory: selectedCategory.value?.name
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load menu'
    DebugUtils.error(MODULE_NAME, 'Failed to initialize menu:', err)
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  DebugUtils.debug(MODULE_NAME, 'PosMenuSection mounted')
  initializeMenu()
})
</script>

<style scoped>
.menu-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--v-theme-surface);
}

.category-tabs {
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.02);
}

.category-btn {
  text-transform: none;
  font-weight: 500;
}

.menu-items {
  flex: 1;
  overflow-y: auto;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.menu-item-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  position: relative;
  min-height: 140px;
}

.menu-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: rgb(var(--v-theme-primary));
}

.menu-item-card:active {
  transform: translateY(0);
}

.menu-item-card[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-item-card[disabled]:hover {
  transform: none;
  box-shadow: none;
  border-color: transparent;
}

.item-name {
  line-height: 1.2;
  color: var(--v-theme-on-surface);
}

.item-description {
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-price {
  color: rgb(var(--v-theme-primary));
}

.variants {
  max-height: 80px;
  overflow-y: auto;
}

.variants::-webkit-scrollbar {
  width: 4px;
}

.variants::-webkit-scrollbar-track {
  background: transparent;
}

.variants::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.add-overlay {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.menu-item-card:hover .add-overlay {
  opacity: 1;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Custom scrollbar */
.menu-items::-webkit-scrollbar {
  width: 6px;
}

.menu-items::-webkit-scrollbar-track {
  background: transparent;
}

.menu-items::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.menu-items::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
