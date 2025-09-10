<!-- src/components/pos/MenuSection.vue -->
<template>
  <div class="menu-section">
    <!-- Categories chips -->
    <div class="menu-header">
      <div v-if="viewMode === 'categories'" class="d-flex align-center">
        <v-chip-group selected-class="primary">
          <v-chip
            v-for="category in activeCategories"
            :key="category.id"
            filter
            variant="elevated"
            @click="selectCategory(category.id)"
          >
            {{ category.name }}
          </v-chip>
        </v-chip-group>
      </div>
      <div v-else class="d-flex align-center">
        <v-btn variant="text" icon="mdi-arrow-left" @click="goBack" />
        <span class="text-h6 ms-2">{{ currentTitle }}</span>
      </div>
    </div>

    <!-- Content grid -->
    <div class="menu-content">
      <v-container fluid>
        <v-row>
          <template v-if="viewMode === 'categories'">
            <v-col
              v-for="item in currentItems"
              :key="item.id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
              class="menu-item-col"
            >
              <category-card :category="item" @select="selectCategory" />
            </v-col>
          </template>

          <template v-else-if="viewMode === 'items'">
            <v-col
              v-for="item in currentItems"
              :key="item.id"
              cols="12"
              sm="6"
              md="4"
              class="menu-item-col"
            >
              <menu-item-card
                :item="item"
                @select="selectItem"
                @add="handleAddItem"
                @add-with-note="openAddNoteDialog"
              />
            </v-col>
          </template>

          <template v-else>
            <v-col cols="12" class="menu-item-col">
              <menu-item-card
                v-if="selectedItem"
                :item="selectedItem"
                :show-variants="true"
                class="full-height"
                @add="handleAddItem"
                @add-with-note="openAddNoteDialog"
              />
            </v-col>
          </template>
        </v-row>
      </v-container>
    </div>

    <!-- Add Item Dialog -->
    <add-item-dialog
      v-if="dialogItem"
      v-model="showDialog"
      :item="dialogItem"
      :variant="dialogVariant"
      :loading="loading"
      @confirm="handleDialogConfirm"
      @cancel="handleDialogCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMenuStore } from '@/stores/menu.store'
import { useBillStore } from '@/stores/bill.store'
import { useOrderStore } from '@/stores/order.store'
import { useTablesStore } from '@/stores/tables.store'
import { MenuItem, MenuItemVariant } from '@/types/menu'
import { AddItemData } from '@/types/bill'
import { DebugUtils } from '@/utils'
import CategoryCard from './cards/CategoryCard.vue'
import MenuItemCard from './cards/MenuItemCard.vue'
import AddItemDialog from './dialogs/AddItemDialog.vue'

const MODULE_NAME = 'MenuSection'
const menuStore = useMenuStore()
const billStore = useBillStore()
const orderStore = useOrderStore()
const tablesStore = useTablesStore()

type ViewMode = 'categories' | 'items' | 'variants'
const viewMode = ref<ViewMode>('categories')
const selectedCategoryId = ref<string | null>(null)
const selectedItem = ref<MenuItem | null>(null)
const showDialog = ref(false)
const dialogItem = ref<MenuItem | null>(null)
const dialogVariant = ref<MenuItemVariant | null>(null)
const loading = ref(false)

const activeCategories = computed(() => menuStore.activeCategories)

const currentTitle = computed(() => {
  if (viewMode.value === 'items') {
    return activeCategories.value.find(c => c.id === selectedCategoryId.value)?.name
  }
  return selectedItem.value?.name || ''
})

const currentItems = computed(() => {
  if (viewMode.value === 'categories') {
    return activeCategories.value as unknown as MenuItem[]
  }
  if (viewMode.value === 'items') {
    return menuStore.itemsByCategory(selectedCategoryId.value!)
  }
  return []
})

function selectCategory(categoryId: string) {
  selectedCategoryId.value = categoryId
  viewMode.value = 'items'
}

function selectItem(item: MenuItem) {
  if (item.variants.length === 1) {
    return
  }
  selectedItem.value = item
  viewMode.value = 'variants'
}

function goBack() {
  if (viewMode.value === 'items') {
    viewMode.value = 'categories'
    selectedCategoryId.value = null
  } else if (viewMode.value === 'variants') {
    viewMode.value = 'items'
    selectedItem.value = null
  }
}

// Методы для работы с заказом
async function handleAddItem(item: MenuItem, variant: MenuItemVariant) {
  try {
    if (!billStore.activeBill) {
      throw new Error('No active bill selected')
    }

    // Проверяем статус активного счета
    if (billStore.activeBill.paymentStatus === 'paid') {
      // Создаем новый счет
      const orderStore = useOrderStore()
      const order = tablesStore.activeOrder
      if (!order) {
        throw new Error('No active order found')
      }

      const result = await orderStore.addBill(order.id)
      if (!result.isValid) {
        throw new Error(result.message)
      }

      DebugUtils.debug(MODULE_NAME, 'Created new bill as current bill is paid')
    }

    const itemData: AddItemData = {
      dishId: item.id,
      variantId: variant.id,
      quantity: 1,
      price: variant.price,
      status: 'pending',
      notes: ''
    }

    await billStore.addItem(itemData)
    resetToCategories()
  } catch (error) {
    console.error('Failed to add item:', error)
  }
}

function resetToCategories() {
  viewMode.value = 'categories'
  selectedCategoryId.value = null
  selectedItem.value = null
}

// Методы для работы с диалогом
async function handleDialogConfirm(variant: MenuItemVariant, note: string) {
  if (!dialogItem.value || !billStore.activeBill) return

  try {
    loading.value = true

    // Проверяем статус активного счета
    if (billStore.activeBill.paymentStatus === 'paid') {
      const orderStore = useOrderStore()
      const order = tablesStore.activeOrder
      if (!order) {
        throw new Error('No active order found')
      }

      const result = await orderStore.addBill(order.id)
      if (!result.isValid) {
        throw new Error(result.message)
      }

      DebugUtils.debug(MODULE_NAME, 'Created new bill as current bill is paid')
    }

    await billStore.addItem({
      dishId: dialogItem.value.id,
      variantId: variant.id,
      quantity: 1,
      price: variant.price,
      status: 'pending',
      notes: note
    })

    showDialog.value = false
    dialogItem.value = null
    dialogVariant.value = null
    resetToCategories()
  } catch (error) {
    console.error('Failed to add item with note:', error)
  } finally {
    loading.value = false
  }
}

function openAddNoteDialog(item: MenuItem, variant: MenuItemVariant) {
  if (!billStore.activeBill) {
    return
  }
  dialogItem.value = item
  dialogVariant.value = variant
  showDialog.value = true
}

function handleDialogCancel() {
  showDialog.value = false
  dialogItem.value = null
  dialogVariant.value = null
}
</script>

<style scoped>
.menu-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--v-theme-background);
}

.menu-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background-color: var(--v-theme-surface);
}

.menu-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.menu-item-col {
  display: flex;
  padding: 8px;
  height: 100%;
}

.full-height {
  height: 100%;
  width: 100%;
}

/* Стилизация скроллбара */
.menu-content::-webkit-scrollbar {
  width: 8px;
}

.menu-content::-webkit-scrollbar-track {
  background: transparent;
}

.menu-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.menu-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.card-wrapper {
  height: 100%;
  min-height: 120px; /* Минимальная высота для карточек */
  width: 100%;
}

.card-wrapper > * {
  height: 100%;
  width: 100%;
}
</style>
