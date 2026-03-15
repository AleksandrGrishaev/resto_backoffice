<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWebsiteStore } from '@/stores/website'
import { supabase } from '@/supabase/client'

const store = useWebsiteStore()

// Categories and menu items for dropdowns
const categories = ref<any[]>([])
const menuItems = ref<any[]>([])

// Dialog state
const addItemDialog = ref(false)
const addItemSectionId = ref<string | null>(null)
const addItemSearch = ref('')

onMounted(async () => {
  await store.loadAll()
  // Load categories for dropdown
  const { data: cats } = await supabase
    .from('menu_categories')
    .select('id, name, parent_id')
    .eq('is_active', true)
    .order('sort_order')
  categories.value = cats || []

  // Load all menu items for picker
  const { data: items } = await supabase
    .from('menu_items')
    .select('id, name, price, category_id, type, image_url')
    .eq('is_active', true)
    .order('sort_order')
  menuItems.value = items || []
})

// Top-level categories only for section assignment
const topCategories = computed(() =>
  categories.value
    .filter(c => !c.parent_id)
    .map(c => ({
      title: c.name,
      value: c.id
    }))
)

// Get child category IDs for a parent
function getCategoryFamily(categoryId: string): string[] {
  const children = categories.value.filter(c => c.parent_id === categoryId).map(c => c.id)
  return [categoryId, ...children]
}

// Items filtered by section's category for add dialog
const filteredMenuItems = computed(() => {
  if (!addItemSectionId.value) return []
  const section = store.sections.find(s => s.id === addItemSectionId.value)
  if (!section) return []

  const familyIds = getCategoryFamily(section.categoryId)
  const existingIds = new Set(store.getSectionItems(section.id).map(i => i.menuItemId))

  let items = menuItems.value.filter(
    item => familyIds.includes(item.category_id) && !existingIds.has(item.id)
  )

  if (addItemSearch.value) {
    const q = addItemSearch.value.toLowerCase()
    items = items.filter(item => item.name.toLowerCase().includes(q))
  }

  return items
})

function formatPrice(price: number): string {
  return price > 0 ? `${Math.round(price / 1000)}k` : '—'
}

// Section CRUD
async function createSlot(slotPosition: number) {
  if (!topCategories.value.length) return
  await store.saveSection({
    slotPosition,
    categoryId: topCategories.value[0].value,
    title: null,
    maxItems: 6,
    isActive: true
  })
}

async function updateSectionCategory(sectionId: string, slotPosition: number, categoryId: string) {
  const section = store.sections.find(s => s.id === sectionId)
  if (!section) return
  await store.saveSection({
    id: sectionId,
    slotPosition,
    categoryId,
    title: section.title,
    maxItems: section.maxItems,
    isActive: section.isActive
  })
}

async function updateSectionTitle(sectionId: string, slotPosition: number, title: string) {
  const section = store.sections.find(s => s.id === sectionId)
  if (!section) return
  await store.saveSection({
    id: sectionId,
    slotPosition,
    categoryId: section.categoryId,
    title: title || null,
    maxItems: section.maxItems,
    isActive: section.isActive
  })
}

// Item management
function openAddItem(sectionId: string) {
  addItemSectionId.value = sectionId
  addItemSearch.value = ''
  addItemDialog.value = true
}

async function addItem(menuItemId: string) {
  if (!addItemSectionId.value) return
  await store.addItemToSection(addItemSectionId.value, menuItemId)
}

function getSection(slot: number) {
  return store.sections.find(s => s.slotPosition === slot)
}
</script>

<template>
  <div class="pa-6">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">Website Homepage</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Manage 4 featured sections on the landing page
        </p>
      </div>
      <v-btn icon="mdi-refresh" variant="tonal" :loading="store.loading" @click="store.loadAll()" />
    </div>

    <!-- Error -->
    <v-alert
      v-if="store.error"
      type="error"
      class="mb-4"
      closable
      @click:close="store.error = null"
    >
      {{ store.error }}
    </v-alert>

    <!-- Loading -->
    <div v-if="store.loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- 4 Slot Cards -->
    <div v-else class="d-flex flex-column ga-6">
      <v-card v-for="slot in 4" :key="slot" variant="outlined" class="pa-0">
        <template v-if="getSection(slot)">
          <v-card-title class="d-flex align-center ga-4 pa-4 pb-2">
            <v-chip color="primary" size="small" variant="flat">Slot {{ slot }}</v-chip>

            <!-- Category selector -->
            <v-select
              :model-value="getSection(slot)!.categoryId"
              :items="topCategories"
              label="Category"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 250px"
              @update:model-value="updateSectionCategory(getSection(slot)!.id, slot, $event)"
            />

            <!-- Custom title -->
            <v-text-field
              :model-value="getSection(slot)!.title || ''"
              label="Custom title (optional)"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              style="max-width: 250px"
              @update:model-value="updateSectionTitle(getSection(slot)!.id, slot, $event || '')"
            />

            <v-spacer />

            <!-- Delete section -->
            <v-btn
              icon="mdi-delete"
              variant="text"
              color="error"
              size="small"
              @click="store.removeSection(getSection(slot)!.id)"
            />
          </v-card-title>

          <!-- Items list -->
          <v-card-text class="pt-2">
            <v-list density="compact" class="pa-0">
              <v-list-item
                v-for="item in store.getSectionItems(getSection(slot)!.id)"
                :key="item.id"
                class="px-2"
              >
                <template #prepend>
                  <v-avatar size="40" rounded="lg" color="surface-variant" class="mr-3">
                    <v-img v-if="item.menuItemImageUrl" :src="item.menuItemImageUrl" />
                    <v-icon v-else>
                      {{ item.menuItemType === 'beverage' ? 'mdi-coffee' : 'mdi-food' }}
                    </v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title class="text-body-2 font-weight-medium">
                  {{ item.menuItemName }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ formatPrice(item.menuItemPrice || 0) }}
                </v-list-item-subtitle>

                <template #append>
                  <v-btn
                    icon="mdi-arrow-up"
                    variant="text"
                    size="x-small"
                    :disabled="item.sortOrder === 0"
                    @click="store.moveItem(getSection(slot)!.id, item.id, 'up')"
                  />
                  <v-btn
                    icon="mdi-arrow-down"
                    variant="text"
                    size="x-small"
                    @click="store.moveItem(getSection(slot)!.id, item.id, 'down')"
                  />
                  <v-btn
                    icon="mdi-close"
                    variant="text"
                    size="x-small"
                    color="error"
                    @click="store.removeItemFromSection(getSection(slot)!.id, item.id)"
                  />
                </template>
              </v-list-item>
            </v-list>

            <!-- Add item button -->
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              prepend-icon="mdi-plus"
              class="mt-3"
              @click="openAddItem(getSection(slot)!.id)"
            >
              Add Dish
            </v-btn>
          </v-card-text>
        </template>

        <!-- Empty slot -->
        <template v-else>
          <v-card-text class="d-flex flex-column align-center justify-center py-8">
            <v-chip color="surface-variant" size="small" class="mb-3">Slot {{ slot }}</v-chip>
            <p class="text-body-2 text-medium-emphasis mb-4">No section configured</p>
            <v-btn
              variant="tonal"
              color="primary"
              prepend-icon="mdi-plus"
              @click="createSlot(slot)"
            >
              Add Section
            </v-btn>
          </v-card-text>
        </template>
      </v-card>
    </div>

    <!-- Add Item Dialog -->
    <v-dialog v-model="addItemDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          Add Dish
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="addItemDialog = false" />
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="addItemSearch"
            label="Search dishes..."
            prepend-inner-icon="mdi-magnify"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            class="mb-4"
          />

          <v-list density="compact" max-height="400" class="overflow-y-auto">
            <v-list-item v-for="item in filteredMenuItems" :key="item.id" @click="addItem(item.id)">
              <template #prepend>
                <v-avatar size="36" rounded="lg" color="surface-variant" class="mr-3">
                  <v-img v-if="item.image_url" :src="item.image_url" />
                  <v-icon v-else size="small">
                    {{ item.type === 'beverage' ? 'mdi-coffee' : 'mdi-food' }}
                  </v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2">{{ item.name }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ formatPrice(item.price) }}
              </v-list-item-subtitle>
              <template #append>
                <v-icon color="primary" size="small">mdi-plus</v-icon>
              </template>
            </v-list-item>

            <v-list-item v-if="!filteredMenuItems.length">
              <v-list-item-title class="text-body-2 text-medium-emphasis text-center">
                No dishes available
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
