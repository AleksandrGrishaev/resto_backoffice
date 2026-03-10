<!-- src/views/kitchen/inventory/components/QuickListManageDialog.vue -->
<!-- Dialog for managing Quick Inventory Lists -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h6">
          <v-icon start>mdi-playlist-edit</v-icon>
          {{ editingList ? 'Edit List' : 'Quick Inventory Lists' }}
        </span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <!-- LIST VIEW: Show all lists -->
      <template v-if="!editingList">
        <v-card-text class="pa-4">
          <!-- Create new list -->
          <div class="d-flex align-center gap-2 mb-4">
            <v-text-field
              v-model="newListName"
              placeholder="New list name..."
              density="compact"
              hide-details
              variant="outlined"
              @keyup.enter="handleCreateList"
            />
            <v-btn
              color="primary"
              variant="flat"
              :disabled="!newListName.trim()"
              @click="handleCreateList"
            >
              Create
            </v-btn>
          </div>

          <!-- Existing lists -->
          <div v-if="departmentLists.length === 0" class="text-center py-6 text-medium-emphasis">
            No quick lists yet. Create one above.
          </div>

          <v-list v-else density="compact">
            <v-list-item v-for="list in departmentLists" :key="list.id" class="mb-1" rounded>
              <template #prepend>
                <v-icon color="primary" size="20">mdi-format-list-bulleted</v-icon>
              </template>

              <v-list-item-title class="text-body-2 font-weight-medium">
                {{ list.name }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ list.itemIds.length }} items
              </v-list-item-subtitle>

              <template #append>
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="x-small"
                  @click="startEditing(list)"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="x-small"
                  color="error"
                  @click="handleDeleteList(list.id)"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </template>

      <!-- EDIT VIEW: Edit a specific list -->
      <template v-else>
        <v-card-text class="pa-4">
          <!-- List name -->
          <v-text-field
            v-model="editName"
            label="List name"
            density="compact"
            variant="outlined"
            class="mb-3"
          />

          <!-- Search products -->
          <v-text-field
            v-model="productSearch"
            placeholder="Search products..."
            density="compact"
            hide-details
            variant="outlined"
            prepend-inner-icon="mdi-magnify"
            clearable
            class="mb-3"
          />

          <!-- Products list with checkboxes -->
          <div class="products-list">
            <div class="text-caption text-medium-emphasis mb-2">
              {{ editItemIds.length }} selected
            </div>
            <v-virtual-scroll :items="filteredProducts" :height="300" item-height="44">
              <template #default="{ item: product }">
                <v-checkbox
                  :model-value="editItemIds.includes(product.id)"
                  :label="product.name"
                  density="compact"
                  hide-details
                  class="product-checkbox"
                  @update:model-value="toggleProduct(product.id, $event)"
                />
              </template>
            </v-virtual-scroll>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-3">
          <v-btn variant="outlined" @click="cancelEditing">Back</v-btn>
          <v-spacer />
          <v-btn color="primary" variant="flat" :disabled="!editName.trim()" @click="saveEditing">
            Save
          </v-btn>
        </v-card-actions>
      </template>
      <!-- Delete Confirmation -->
      <v-dialog :model-value="!!pendingDeleteId" max-width="340" persistent>
        <v-card>
          <v-card-title class="text-h6">Delete list?</v-card-title>
          <v-card-text>This action cannot be undone.</v-card-text>
          <v-card-actions>
            <v-btn variant="outlined" @click="cancelDelete">Cancel</v-btn>
            <v-spacer />
            <v-btn color="error" variant="flat" @click="confirmDelete">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useQuickInventoryLists } from '../composables/useQuickInventoryLists'
import type { QuickInventoryList } from '../composables/useQuickInventoryLists'
import type { Department } from '@/stores/productsStore/types'

interface Props {
  modelValue: boolean
  department: Department
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const productsStore = useProductsStore()
const { departmentLists, createList, updateList, deleteList } = useQuickInventoryLists(
  () => props.department
)

// List view state
const newListName = ref('')

// Edit view state
const editingList = ref<QuickInventoryList | null>(null)
const editName = ref('')
const editItemIds = ref<string[]>([])
const productSearch = ref('')
// Stable sort order — captured once when editing starts
const editSortOrder = ref<string[]>([])
const pendingDeleteId = ref<string | null>(null)

// Products filtered by department and search, with stable sort order
const filteredProducts = computed(() => {
  let products = productsStore.products.filter(p => p.usedInDepartments?.includes(props.department))
  if (productSearch.value.trim()) {
    const query = productSearch.value.toLowerCase().trim()
    products = products.filter(p => p.name.toLowerCase().includes(query))
  }
  // Use stable sort order (captured on startEditing) to prevent items jumping on toggle
  const orderMap = new Map(editSortOrder.value.map((id, i) => [id, i]))
  return products.sort((a, b) => {
    const aIdx = orderMap.get(a.id) ?? 999999
    const bIdx = orderMap.get(b.id) ?? 999999
    return aIdx - bIdx
  })
})

function handleCreateList() {
  if (!newListName.value.trim()) return
  const list = createList(newListName.value.trim(), props.department)
  newListName.value = ''
  // Auto-open editing to add products
  startEditing(list)
}

function handleDeleteList(id: string) {
  pendingDeleteId.value = id
}

function confirmDelete() {
  if (pendingDeleteId.value) {
    deleteList(pendingDeleteId.value)
    pendingDeleteId.value = null
  }
}

function cancelDelete() {
  pendingDeleteId.value = null
}

function startEditing(list: QuickInventoryList) {
  editingList.value = list
  editName.value = list.name
  editItemIds.value = [...list.itemIds]
  productSearch.value = ''
  // Capture stable sort order: selected items first, then alphabetical
  const allProducts = productsStore.products
    .filter(p => p.usedInDepartments?.includes(props.department))
    .sort((a, b) => {
      const aSelected = list.itemIds.includes(a.id) ? 0 : 1
      const bSelected = list.itemIds.includes(b.id) ? 0 : 1
      if (aSelected !== bSelected) return aSelected - bSelected
      return a.name.localeCompare(b.name)
    })
  editSortOrder.value = allProducts.map(p => p.id)
}

function cancelEditing() {
  editingList.value = null
  editName.value = ''
  editItemIds.value = []
  editSortOrder.value = []
  productSearch.value = ''
}

function saveEditing() {
  if (!editingList.value || !editName.value.trim()) return
  updateList(editingList.value.id, {
    name: editName.value.trim(),
    itemIds: editItemIds.value
  })
  cancelEditing()
}

function toggleProduct(productId: string, checked: boolean | null) {
  if (checked) {
    if (!editItemIds.value.includes(productId)) {
      editItemIds.value.push(productId)
    }
  } else {
    editItemIds.value = editItemIds.value.filter(id => id !== productId)
  }
}

function handleClose() {
  if (editingList.value) {
    cancelEditing()
  } else {
    emit('update:modelValue', false)
  }
}
</script>

<style scoped lang="scss">
.products-list {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 8px;
}

.product-checkbox {
  :deep(.v-label) {
    font-size: 0.875rem;
  }
}
</style>
