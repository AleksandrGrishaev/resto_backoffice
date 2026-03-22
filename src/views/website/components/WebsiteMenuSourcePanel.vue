<script setup lang="ts">
import { ref, computed } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { formatIDR } from '@/utils'
import type { MenuItem, Category } from '@/stores/menu/types'
import type { WebsiteMenuCategory } from '@/stores/websiteMenu'

const props = defineProps<{
  menuStore: any
  websiteMenuStore: any
}>()

const emit = defineEmits<{
  addItem: [categoryId: string, menuItemId: string]
}>()

const search = ref('')
const filterCategory = ref<string | null>(null)
const showOnlyNotAdded = ref(false)

const categories = computed<Category[]>(() => props.menuStore.categories || [])
const websiteCategories = computed<WebsiteMenuCategory[]>(
  () => props.websiteMenuStore.categories || []
)

const topCategories = computed(() =>
  categories.value
    .filter((c: Category) => !c.parentId && c.isActive)
    .map((c: Category) => ({ title: c.name, value: c.id }))
)

function addToCategory(categoryId: string, menuItemId: string) {
  emit('addItem', categoryId, menuItemId)
}

function addViaButton(menuItemId: string) {
  if (websiteCategories.value.length === 1) {
    emit('addItem', websiteCategories.value[0].id, menuItemId)
  }
}

function getCategoryName(categoryId: string): string {
  const cat = categories.value.find((c: Category) => c.id === categoryId)
  return cat?.name || ''
}

// Filtered and sorted flat list
const filteredItems = computed(() => {
  const allItems: MenuItem[] = props.menuStore.activeMenuItems || []
  let items = allItems

  if (search.value) {
    const q = search.value.toLowerCase()
    items = items.filter((item: MenuItem) => item.name.toLowerCase().includes(q))
  }

  if (filterCategory.value) {
    const familyIds = getCategoryFamily(filterCategory.value)
    items = items.filter((item: MenuItem) => familyIds.includes(item.categoryId))
  }

  if (showOnlyNotAdded.value) {
    items = items.filter((item: MenuItem) => !isItemAdded(item.id))
  }

  return items
})

const notAddedCount = computed(() => {
  const allItems: MenuItem[] = props.menuStore.activeMenuItems || []
  return allItems.filter((item: MenuItem) => !isItemAdded(item.id)).length
})

function getCategoryFamily(categoryId: string): string[] {
  const children = categories.value
    .filter((c: Category) => c.parentId === categoryId)
    .map((c: Category) => c.id)
  return [categoryId, ...children]
}

function getMinPrice(item: MenuItem): number {
  if (!item.variants?.length) return 0
  return Math.min(...item.variants.filter(v => v.isActive).map(v => v.price))
}

function getVariantCount(item: MenuItem): number {
  return item.variants?.filter(v => v.isActive).length || 0
}

function isItemAdded(menuItemId: string): boolean {
  for (const [, items] of props.websiteMenuStore.itemsByCategory) {
    if (items.some((i: any) => i.menuItemId === menuItemId)) return true
  }
  return false
}
</script>

<template>
  <v-card variant="outlined" class="source-panel">
    <v-card-title class="text-subtitle-1 font-weight-bold pb-2">Menu Items</v-card-title>

    <v-card-text class="pt-0">
      <v-text-field
        v-model="search"
        density="compact"
        variant="outlined"
        placeholder="Search..."
        prepend-inner-icon="mdi-magnify"
        clearable
        hide-details
        class="mb-2"
      />
      <v-select
        v-model="filterCategory"
        :items="topCategories"
        density="compact"
        variant="outlined"
        placeholder="All categories"
        clearable
        hide-details
        class="mb-2"
      />

      <!-- Not added filter -->
      <v-chip
        :color="showOnlyNotAdded ? 'primary' : undefined"
        :variant="showOnlyNotAdded ? 'flat' : 'outlined'"
        size="small"
        class="mb-3"
        @click="showOnlyNotAdded = !showOnlyNotAdded"
      >
        Not added ({{ notAddedCount }})
      </v-chip>

      <!-- Items list with drag support -->
      <div class="source-items-list">
        <VueDraggable
          :model-value="filteredItems"
          :group="{ name: 'menu-items', pull: 'clone', put: false }"
          :sort="false"
          :clone="() => ({ _clone: true })"
          ghost-class="ghost"
        >
          <div
            v-for="item in filteredItems"
            :key="item.id"
            :data-menu-item-id="item.id"
            class="source-item d-flex align-center pa-2 rounded mb-1"
            :class="{ 'opacity-50': isItemAdded(item.id) }"
          >
            <v-avatar size="36" rounded class="mr-2 flex-shrink-0" color="grey-lighten-3">
              <v-img v-if="item.imageUrl" :src="item.imageUrl" cover />
              <v-icon v-else size="20" color="grey">mdi-food</v-icon>
            </v-avatar>

            <div class="flex-grow-1 text-body-2 overflow-hidden">
              <div class="font-weight-medium text-truncate">
                {{ item.name }}
              </div>
              <div class="text-caption text-grey-lighten-1">
                {{ formatIDR(getMinPrice(item)) }}
                <span v-if="getVariantCount(item) > 1">· {{ getVariantCount(item) }} var.</span>
                <span class="ml-1 text-grey">· {{ getCategoryName(item.categoryId) }}</span>
              </div>
            </div>

            <!-- Add button -->
            <v-menu v-if="websiteCategories.length > 1" :close-on-content-click="true">
              <template #activator="{ props: menuProps }">
                <v-btn
                  v-bind="menuProps"
                  icon="mdi-plus"
                  size="x-small"
                  variant="text"
                  color="primary"
                  :disabled="isItemAdded(item.id)"
                />
              </template>
              <v-list density="compact">
                <v-list-subheader>Add to category</v-list-subheader>
                <v-list-item
                  v-for="wc in websiteCategories"
                  :key="wc.id"
                  :title="wc.name"
                  @click="addToCategory(wc.id, item.id)"
                />
              </v-list>
            </v-menu>

            <v-btn
              v-else
              icon="mdi-plus"
              size="x-small"
              variant="text"
              color="primary"
              :disabled="isItemAdded(item.id) || websiteCategories.length === 0"
              @click="addViaButton(item.id)"
            />
          </div>
        </VueDraggable>

        <div v-if="filteredItems.length === 0" class="text-center py-4 text-grey text-body-2">
          No items found
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.source-panel {
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 120px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.source-items-list {
  overflow-y: auto;
  max-height: calc(100vh - 310px);
}

.source-item {
  cursor: grab;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.source-item:hover {
  background: rgb(var(--v-theme-primary), 0.04);
  border-color: rgb(var(--v-theme-primary), 0.2);
}

.ghost {
  opacity: 0.5;
}
</style>
