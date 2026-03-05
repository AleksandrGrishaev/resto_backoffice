<!-- src/views/admin/menu/MenuScreen.vue -->
<template>
  <div class="menu-screen">
    <!-- Collection list or detail view -->
    <CollectionDetailScreen
      v-if="selectedCollection"
      :collection="selectedCollection"
      @back="selectedCollectionId = null"
    />

    <template v-else>
      <div class="screen-header">
        <h2>MENU COLLECTIONS</h2>
        <v-btn color="primary" size="small" @click="showCreateDialog = true">
          <v-icon start>mdi-plus</v-icon>
          New
        </v-btn>
      </div>

      <div class="collections-list">
        <div
          v-for="collection in collections"
          :key="collection.id"
          class="collection-card"
          @click="selectedCollectionId = collection.id"
        >
          <div class="collection-info">
            <h3>{{ collection.name }}</h3>
            <div class="collection-meta">
              <v-chip :color="statusColor(collection.status)" size="x-small" variant="flat" label>
                {{ collection.status }}
              </v-chip>
              <v-chip size="x-small" variant="outlined" label>
                {{ collection.type }}
              </v-chip>
            </div>
          </div>
          <v-icon>mdi-chevron-right</v-icon>
        </div>

        <div v-if="collections.length === 0" class="empty-state">
          <v-icon size="48" color="grey">mdi-book-open-variant</v-icon>
          <p>No collections yet</p>
        </div>
      </div>

      <!-- Create dialog -->
      <v-dialog v-model="showCreateDialog" max-width="400">
        <v-card>
          <v-card-title>New Collection</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newName"
              label="Name"
              variant="outlined"
              hide-details
              class="mb-3"
            />
            <v-select
              v-model="newType"
              :items="['active', 'draft', 'seasonal']"
              label="Type"
              variant="outlined"
              hide-details
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showCreateDialog = false">Cancel</v-btn>
            <v-btn color="primary" :disabled="!newName.trim()" @click="handleCreate">Create</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMenuCollectionsStore } from '@/stores/menuCollections'
import type { MenuCollection, CollectionType } from '@/stores/menuCollections/types'
import CollectionDetailScreen from './CollectionDetailScreen.vue'

const collectionsStore = useMenuCollectionsStore()

const collections = computed(() => collectionsStore.collections)
const selectedCollectionId = ref<string | null>(null)

// Use computed so it always reflects latest store state after publish/archive
const selectedCollection = computed<MenuCollection | null>(() => {
  if (!selectedCollectionId.value) return null
  return collectionsStore.collections.find(c => c.id === selectedCollectionId.value) || null
})

const showCreateDialog = ref(false)
const newName = ref('')
const newType = ref<CollectionType>('active')

function statusColor(status: string) {
  switch (status) {
    case 'published':
      return 'success'
    case 'draft':
      return 'warning'
    case 'archived':
      return 'grey'
    default:
      return undefined
  }
}

async function handleCreate() {
  await collectionsStore.createCollection({
    name: newName.value.trim(),
    type: newType.value
  })
  showCreateDialog.value = false
  newName.value = ''
}
</script>

<style scoped lang="scss">
.menu-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.screen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
  }
}

.collections-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.collection-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
}

.collection-info {
  flex: 1;

  h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 4px;
  }
}

.collection-meta {
  display: flex;
  gap: 6px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0;
  color: rgba(255, 255, 255, 0.5);
}
</style>
