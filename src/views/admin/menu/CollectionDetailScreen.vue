<!-- src/views/admin/menu/CollectionDetailScreen.vue -->
<template>
  <div class="collection-detail">
    <!-- Header -->
    <div class="detail-header">
      <v-btn icon="mdi-arrow-left" variant="text" @click="emit('back')" />
      <div class="header-info">
        <h2>{{ collection.name }}</h2>
        <div class="header-meta">
          <v-chip :color="statusColor" size="x-small" variant="flat" label>
            {{ collection.status }}
          </v-chip>
          <span>{{ items.length }} dishes</span>
        </div>
      </div>
      <v-btn
        v-if="collection.status === 'draft'"
        color="success"
        size="small"
        @click="handlePublish"
      >
        Publish
      </v-btn>
      <v-btn
        v-if="collection.status === 'published'"
        variant="outlined"
        size="small"
        @click="handleArchive"
      >
        Archive
      </v-btn>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <v-text-field
        v-model="search"
        placeholder="Search dishes..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="search-input"
      />
      <v-chip-group v-model="deptFilter" selected-class="text-primary">
        <v-chip value="all" size="small" variant="outlined">All</v-chip>
        <v-chip value="kitchen" size="small" variant="outlined">Kitchen</v-chip>
        <v-chip value="bar" size="small" variant="outlined">Bar</v-chip>
      </v-chip-group>
    </div>

    <!-- Dishes list -->
    <div class="dishes-list">
      <div v-for="menuItem in filteredMenuItems" :key="menuItem.id" class="dish-card">
        <div class="dish-info">
          <h4>{{ menuItem.name }}</h4>
          <span class="dish-dept">{{ menuItem.department }}</span>
        </div>
        <!-- Variant pricing (read-only cost, editable price in admin) -->
        <div class="variant-pricing">
          <div v-for="variant in menuItem.variants" :key="variant.id" class="variant-row">
            <span class="variant-name">{{ variant.name || 'Standard' }}</span>
            <span class="variant-price">{{ formatIDR(variant.price) }}</span>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          size="x-small"
          variant="text"
          @click="handleRemoveItem(menuItem.id)"
        />
      </div>

      <div v-if="filteredMenuItems.length === 0" class="empty-dishes">
        No dishes in this collection
      </div>
    </div>

    <!-- Add dish actions -->
    <div class="add-actions">
      <v-btn variant="outlined" size="small" @click="showAddDish = true">
        <v-icon start>mdi-plus</v-icon>
        Add dish
      </v-btn>
    </div>

    <!-- Add dish bottom sheet -->
    <BottomSheet v-model="showAddDish" title="Add Dish to Collection">
      <v-text-field
        v-model="addSearch"
        placeholder="Search menu items..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="mb-3"
      />
      <div class="add-results">
        <div
          v-for="item in availableMenuItems"
          :key="item.id"
          class="add-item"
          @click="handleAddItem(item.id)"
        >
          <span>{{ item.name }}</span>
          <span class="add-dept">{{ item.department }}</span>
        </div>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'
import { useMenuCollectionsStore } from '@/stores/menuCollections'
import { formatIDR } from '@/utils'
import BottomSheet from '@/components/tablet/BottomSheet.vue'
import type { MenuCollection } from '@/stores/menuCollections/types'
import type { MenuItem } from '@/stores/menu/types'

const props = defineProps<{
  collection: MenuCollection
}>()

const emit = defineEmits<{
  back: []
}>()

const menuStore = useMenuStore()
const collectionsStore = useMenuCollectionsStore()

const search = ref('')
const deptFilter = ref('all')
const addSearch = ref('')
const showAddDish = ref(false)

// Load collection items on mount
const items = computed(() => collectionsStore.collectionItems.get(props.collection.id) || [])

onMounted(async () => {
  await collectionsStore.loadCollectionItems(props.collection.id)
})

const statusColor = computed(() => {
  switch (props.collection.status) {
    case 'published':
      return 'success'
    case 'draft':
      return 'warning'
    case 'archived':
      return 'grey'
    default:
      return undefined
  }
})

// Resolve menu items from collection
const filteredMenuItems = computed(() => {
  const itemIds = new Set(items.value.map(i => i.menuItemId))
  let menuItems = (menuStore.menuItems as MenuItem[]).filter(mi => itemIds.has(mi.id))

  if (search.value) {
    const q = search.value.toLowerCase()
    menuItems = menuItems.filter(mi => mi.name.toLowerCase().includes(q))
  }

  if (deptFilter.value && deptFilter.value !== 'all') {
    menuItems = menuItems.filter(mi => mi.department === deptFilter.value)
  }

  return menuItems
})

// Available items not yet in collection
const availableMenuItems = computed(() => {
  const existingIds = new Set(items.value.map(i => i.menuItemId))
  let available = (menuStore.menuItems as MenuItem[]).filter(
    mi => !existingIds.has(mi.id) && mi.isActive
  )

  if (addSearch.value) {
    const q = addSearch.value.toLowerCase()
    available = available.filter(mi => mi.name.toLowerCase().includes(q))
  }

  return available.slice(0, 30)
})

async function handleAddItem(menuItemId: string) {
  await collectionsStore.addItemToCollection(props.collection.id, menuItemId)
  showAddDish.value = false
}

async function handleRemoveItem(menuItemId: string) {
  await collectionsStore.removeItemFromCollection(props.collection.id, menuItemId)
}

async function handlePublish() {
  await collectionsStore.publishCollection(props.collection.id)
}

async function handleArchive() {
  await collectionsStore.archiveCollection(props.collection.id)
}
</script>

<style scoped lang="scss">
.collection-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.header-info {
  flex: 1;

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
  }
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.filter-bar {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.search-input {
  max-width: 300px;
}

.dishes-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dish-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.dish-info {
  flex: 1;

  h4 {
    font-weight: 600;
  }
}

.dish-dept {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: capitalize;
}

.variant-pricing {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
}

.variant-row {
  display: flex;
  gap: 8px;
  font-size: 0.85rem;
}

.variant-name {
  color: rgba(255, 255, 255, 0.6);
}

.variant-price {
  font-weight: 500;
}

.empty-dishes {
  text-align: center;
  padding: 48px 0;
  color: rgba(255, 255, 255, 0.4);
}

.add-actions {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.add-results {
  max-height: 40vh;
  overflow-y: auto;
}

.add-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 8px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

.add-dept {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: capitalize;
}
</style>
