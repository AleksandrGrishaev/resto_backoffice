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
const allCollapsed = ref(true)

onMounted(async () => {
  if (!menuStore.initialized) {
    await menuStore.initialize()
  }
  if (!websiteMenuStore.initialized) {
    await websiteMenuStore.initialize()
  }
  loading.value = false
})

// Groups = top-level categories (no parent_id)
const groups = computed({
  get: () =>
    websiteMenuStore.categories.filter(c => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder),
  set: (val: WebsiteMenuCategory[]) => {
    websiteMenuStore.reorderCategories(val)
  }
})

// Children of a group
function getGroupChildren(groupId: string): WebsiteMenuCategory[] {
  return websiteMenuStore.categories
    .filter(c => c.parentId === groupId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

// Ungrouped categories (have parent_id but parent doesn't exist — safety net)
const ungroupedCategories = computed(() =>
  websiteMenuStore.categories.filter(c => {
    if (!c.parentId) return false
    return !websiteMenuStore.categories.some(g => g.id === c.parentId)
  })
)

// Collapsed state per group
const groupCollapsed = ref<Record<string, boolean>>({})

function isGroupCollapsed(groupId: string): boolean {
  return groupCollapsed.value[groupId] ?? false
}

function toggleGroup(groupId: string) {
  groupCollapsed.value = {
    ...groupCollapsed.value,
    [groupId]: !isGroupCollapsed(groupId)
  }
}

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
        <div v-if="groups.length > 0" class="d-flex justify-end mb-2">
          <v-btn
            size="small"
            variant="text"
            :prepend-icon="
              allCollapsed ? 'mdi-unfold-more-horizontal' : 'mdi-unfold-less-horizontal'
            "
            @click="allCollapsed = !allCollapsed"
          >
            {{ allCollapsed ? 'Expand All' : 'Collapse All' }}
          </v-btn>
        </div>

        <div v-if="groups.length === 0" class="text-center py-12">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-folder-plus-outline</v-icon>
          <p class="text-grey">No website categories yet. Create one to get started.</p>
        </div>

        <!-- Groups (draggable for reorder) -->
        <VueDraggable
          v-model="groups"
          handle=".group-drag-handle"
          animation="200"
          ghost-class="ghost"
        >
          <div v-for="group in groups" :key="group.id" class="mb-4">
            <!-- Group header -->
            <div
              class="group-header d-flex align-center px-3 py-2 rounded mb-2"
              @click="toggleGroup(group.id)"
            >
              <v-icon class="group-drag-handle mr-1 cursor-grab" size="18" color="grey" @click.stop>
                mdi-drag
              </v-icon>
              <v-icon size="18" class="mr-2" color="grey">
                {{ isGroupCollapsed(group.id) ? 'mdi-chevron-right' : 'mdi-chevron-down' }}
              </v-icon>
              <span class="text-subtitle-1 font-weight-bold">{{ group.name }}</span>
              <v-chip size="x-small" class="ml-2" variant="tonal">
                {{ getGroupChildren(group.id).length }} categories
              </v-chip>
              <v-spacer />
              <v-btn
                icon="mdi-pencil"
                size="x-small"
                variant="text"
                color="grey"
                @click.stop="openEditCategory(group)"
              />
              <v-btn
                :icon="group.isActive ? 'mdi-eye' : 'mdi-eye-off'"
                size="x-small"
                variant="text"
                :color="group.isActive ? 'grey' : 'warning'"
                @click.stop="
                  websiteMenuStore.updateCategory(group.id, { isActive: !group.isActive })
                "
              />
            </div>

            <!-- Group children (categories) -->
            <v-expand-transition>
              <div v-show="!isGroupCollapsed(group.id)" class="pl-4">
                <VueDraggable
                  :model-value="getGroupChildren(group.id)"
                  :group="{ name: 'website-categories', pull: false, put: false }"
                  handle=".category-drag-handle"
                  animation="200"
                  ghost-class="ghost"
                >
                  <WebsiteMenuCategoryCard
                    v-for="category in getGroupChildren(group.id)"
                    :key="category.id"
                    :category="category"
                    :items="websiteMenuStore.itemsByCategory.get(category.id) || []"
                    :menu-store="menuStore"
                    :website-menu-store="websiteMenuStore"
                    :force-collapsed="allCollapsed"
                    class="mb-2"
                    @edit="openEditCategory"
                    @delete="handleDeleteCategory"
                    @item-dropped="handleItemDropped"
                  />
                </VueDraggable>
              </div>
            </v-expand-transition>
          </div>
        </VueDraggable>

        <!-- Ungrouped categories (safety net) -->
        <div v-if="ungroupedCategories.length > 0" class="mb-4">
          <div class="text-overline text-grey mb-2">Ungrouped</div>
          <WebsiteMenuCategoryCard
            v-for="category in ungroupedCategories"
            :key="category.id"
            :category="category"
            :items="websiteMenuStore.itemsByCategory.get(category.id) || []"
            :menu-store="menuStore"
            :website-menu-store="websiteMenuStore"
            :force-collapsed="allCollapsed"
            class="mb-2"
            @edit="openEditCategory"
            @delete="handleDeleteCategory"
            @item-dropped="handleItemDropped"
          />
        </div>
      </v-col>
    </v-row>

    <WebsiteCategoryDialog
      v-model="categoryDialog"
      :category="editingCategory"
      :store="websiteMenuStore"
      :groups="groups"
      @saved="handleCategorySaved"
    />
  </div>
</template>

<style scoped>
.ghost {
  opacity: 0.5;
  background: #e3f2fd;
}

.group-header {
  cursor: pointer;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: background 0.15s;
}

.group-header:hover {
  background: rgba(255, 255, 255, 0.08);
}

.cursor-grab {
  cursor: grab;
}
</style>
