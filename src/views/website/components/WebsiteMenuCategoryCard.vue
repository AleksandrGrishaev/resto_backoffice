<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import WebsiteMenuItemRow from './WebsiteMenuItemRow.vue'
import type { WebsiteMenuCategory, WebsiteMenuItem } from '@/stores/websiteMenu'
import type { MenuItem } from '@/stores/menu/types'

const props = defineProps<{
  category: WebsiteMenuCategory
  items: WebsiteMenuItem[]
  menuStore: any
  websiteMenuStore: any
  forceCollapsed?: boolean
}>()

const emit = defineEmits<{
  edit: [category: WebsiteMenuCategory]
  delete: [id: string]
  itemDropped: [categoryId: string, menuItemId: string]
}>()

const collapsed = ref(props.forceCollapsed ?? false)

watch(
  () => props.forceCollapsed,
  val => {
    if (val !== undefined) collapsed.value = val
  }
)
const confirmDelete = ref(false)

const orderedItems = computed({
  get: () => [...props.items].sort((a, b) => a.sortOrder - b.sortOrder),
  set: (val: WebsiteMenuItem[]) => {
    // Only reorder real items (ignore cloned source items without id)
    const realItems = val.filter(i => i.id)
    if (realItems.length > 0) {
      props.websiteMenuStore.reorderItems(props.category.id, realItems)
    }
  }
})

function getMenuItem(menuItemId: string): MenuItem | undefined {
  const allItems = props.menuStore.menuItems || []
  return allItems.find((i: MenuItem) => i.id === menuItemId)
}

function handleDragAdd(event: any) {
  // Read menu item ID from data attribute on the dropped DOM element
  const menuItemId = event.item?.dataset?.menuItemId
  if (menuItemId) {
    emit('itemDropped', props.category.id, menuItemId)
  }
}

async function handleRemoveItem(itemId: string) {
  await props.websiteMenuStore.removeItem(itemId, props.category.id)
}

async function handleToggleActive() {
  await props.websiteMenuStore.updateCategory(props.category.id, {
    isActive: !props.category.isActive
  })
}

function doDelete() {
  confirmDelete.value = false
  emit('delete', props.category.id)
}
</script>

<template>
  <v-card variant="outlined" :class="{ 'border-opacity-50': !category.isActive }">
    <!-- Header -->
    <div class="d-flex align-center pa-3">
      <v-icon class="category-drag-handle mr-2 cursor-grab" size="20" color="grey">mdi-drag</v-icon>

      <div class="flex-grow-1" style="cursor: pointer" @click="collapsed = !collapsed">
        <span class="text-subtitle-2 font-weight-bold">{{ category.name }}</span>
        <v-chip size="x-small" class="ml-2" variant="tonal">{{ items.length }} items</v-chip>
        <v-chip
          v-if="!category.isActive"
          size="x-small"
          color="warning"
          class="ml-1"
          variant="tonal"
        >
          Hidden
        </v-chip>
      </div>

      <v-btn
        :icon="category.isActive ? 'mdi-eye' : 'mdi-eye-off'"
        size="x-small"
        variant="text"
        :color="category.isActive ? 'grey' : 'warning'"
        title="Toggle visibility"
        @click="handleToggleActive"
      />
      <v-btn
        icon="mdi-pencil"
        size="x-small"
        variant="text"
        color="grey"
        @click="emit('edit', category)"
      />
      <v-btn
        icon="mdi-delete"
        size="x-small"
        variant="text"
        color="error"
        @click="confirmDelete = true"
      />
      <v-btn
        :icon="collapsed ? 'mdi-chevron-down' : 'mdi-chevron-up'"
        size="x-small"
        variant="text"
        color="grey"
        @click="collapsed = !collapsed"
      />
    </div>

    <!-- Items drop zone -->
    <v-expand-transition>
      <div v-show="!collapsed">
        <v-divider />
        <div class="pa-2">
          <VueDraggable
            v-model="orderedItems"
            :group="{ name: 'menu-items', put: true }"
            handle=".item-drag-handle"
            animation="200"
            ghost-class="ghost"
            :class="['drop-zone', { 'drop-zone--empty': orderedItems.length === 0 }]"
            @add="handleDragAdd"
          >
            <WebsiteMenuItemRow
              v-for="item in orderedItems"
              :key="item.id"
              :item="item"
              :menu-item="getMenuItem(item.menuItemId)"
              :website-menu-store="websiteMenuStore"
              :category-id="category.id"
              @remove="handleRemoveItem"
            />
          </VueDraggable>
        </div>
      </div>
    </v-expand-transition>

    <!-- Delete confirmation -->
    <v-dialog v-model="confirmDelete" max-width="360">
      <v-card>
        <v-card-title class="text-subtitle-1">Delete Category?</v-card-title>
        <v-card-text>
          This will delete "{{ category.name }}" and all its item assignments.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDelete = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="doDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.cursor-grab {
  cursor: grab;
}

.ghost {
  opacity: 0.5;
  background: #e3f2fd;
}

.drop-zone {
  min-height: 48px;
}

.drop-zone--empty {
  min-height: 80px;
  border: 2px dashed rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-zone--empty::after {
  content: 'Drag items here or use + button';
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.875rem;
}
</style>
