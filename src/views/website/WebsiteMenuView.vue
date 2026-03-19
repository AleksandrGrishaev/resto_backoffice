<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWebsiteMenuStore } from '@/stores/websiteMenu'
import { useMenuStore } from '@/stores/menu'
import WebsiteMenuSourcePanel from './components/WebsiteMenuSourcePanel.vue'
import WebsiteMenuCategoryCard from './components/WebsiteMenuCategoryCard.vue'
import WebsiteCategoryDialog from './dialogs/WebsiteCategoryDialog.vue'
import { VueDraggable } from 'vue-draggable-plus'
import type { WebsiteMenuCategory } from '@/stores/websiteMenu'

const websiteMenuStore = useWebsiteMenuStore()
const menuStore = useMenuStore()

const loading = ref(true)
const categoryDialog = ref(false)
const editingCategory = ref<WebsiteMenuCategory | null>(null)

onMounted(async () => {
  if (!menuStore.initialized) {
    await menuStore.initialize()
  }
  if (!websiteMenuStore.initialized) {
    await websiteMenuStore.initialize()
  }
  loading.value = false
})

const orderedCategories = computed({
  get: () => [...websiteMenuStore.categories].sort((a, b) => a.sortOrder - b.sortOrder),
  set: (val: WebsiteMenuCategory[]) => {
    websiteMenuStore.reorderCategories(val)
  }
})

function openCreateCategory() {
  editingCategory.value = null
  categoryDialog.value = true
}

function openEditCategory(category: WebsiteMenuCategory) {
  editingCategory.value = category
  categoryDialog.value = true
}

async function handleCategorySaved() {
  categoryDialog.value = false
  editingCategory.value = null
}

async function handleDeleteCategory(id: string) {
  await websiteMenuStore.deleteCategory(id)
}

async function handleItemDropped(categoryId: string, menuItemId: string) {
  // Check if already exists in this category
  const existingItems = websiteMenuStore.itemsByCategory.get(categoryId) || []
  if (existingItems.some(i => i.menuItemId === menuItemId && !i.variantId)) return

  await websiteMenuStore.addItem({
    categoryId,
    menuItemId,
    variantDisplayMode: 'options'
  })
}
</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5 font-weight-bold">Website Menu</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateCategory">
        Add Category
      </v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-row v-else>
      <!-- Source Panel (left) -->
      <v-col cols="5">
        <WebsiteMenuSourcePanel
          :menu-store="menuStore"
          :website-menu-store="websiteMenuStore"
          @add-item="handleItemDropped"
        />
      </v-col>

      <!-- Categories Panel (right) -->
      <v-col cols="7">
        <div v-if="orderedCategories.length === 0" class="text-center py-12">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-folder-plus-outline</v-icon>
          <p class="text-grey">No website categories yet. Create one to get started.</p>
        </div>

        <VueDraggable
          v-else
          v-model="orderedCategories"
          handle=".category-drag-handle"
          animation="200"
          ghost-class="ghost"
        >
          <WebsiteMenuCategoryCard
            v-for="category in orderedCategories"
            :key="category.id"
            :category="category"
            :items="websiteMenuStore.itemsByCategory.get(category.id) || []"
            :menu-store="menuStore"
            :website-menu-store="websiteMenuStore"
            class="mb-3"
            @edit="openEditCategory"
            @delete="handleDeleteCategory"
            @item-dropped="handleItemDropped"
          />
        </VueDraggable>
      </v-col>
    </v-row>

    <WebsiteCategoryDialog
      v-model="categoryDialog"
      :category="editingCategory"
      :store="websiteMenuStore"
      @saved="handleCategorySaved"
    />
  </div>
</template>

<style scoped>
.ghost {
  opacity: 0.5;
  background: #e3f2fd;
}
</style>
