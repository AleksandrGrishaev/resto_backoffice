<!-- Constructor Hub — Timeline dashboard grouped by date periods -->
<template>
  <div class="constructor-hub">
    <!-- Header -->
    <div class="hub-header">
      <h2>CONSTRUCTOR</h2>
      <v-btn color="primary" size="default" rounded @click="showCreateDialog = true">
        <v-icon start>mdi-plus</v-icon>
        Create
      </v-btn>
    </div>

    <!-- View toggle: Items / History -->
    <div class="hub-view-toggle">
      <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
        <v-btn value="items" size="small">
          <v-icon start size="16">mdi-view-list</v-icon>
          Items
        </v-btn>
        <v-btn value="history" size="small">
          <v-icon start size="16">mdi-history</v-icon>
          History
        </v-btn>
      </v-btn-toggle>
    </div>

    <!-- Filters row (only in items mode) -->
    <div v-if="viewMode === 'items'" class="hub-filters">
      <!-- Type filter (multi-select chips) -->
      <div class="type-chips">
        <v-chip
          v-for="t in typeOptions"
          :key="t.value"
          :color="selectedTypes.includes(t.value) ? t.color : undefined"
          :variant="selectedTypes.includes(t.value) ? 'flat' : 'outlined'"
          size="small"
          @click="toggleType(t.value)"
        >
          <v-icon start size="16">{{ t.icon }}</v-icon>
          {{ t.label }}
          <span class="type-count">{{ typeCounts[t.value] }}</span>
        </v-chip>
      </div>

      <!-- Status + Department -->
      <div class="filter-row-2">
        <v-btn-toggle v-model="statusFilter" mandatory density="compact" class="mini-toggle">
          <v-btn value="all" size="x-small">All</v-btn>
          <v-btn value="draft" size="x-small">Draft</v-btn>
          <v-btn value="active" size="x-small">Active</v-btn>
          <v-btn value="archived" size="x-small">Archived</v-btn>
        </v-btn-toggle>

        <v-btn-toggle
          v-model="department"
          mandatory
          density="compact"
          color="primary"
          class="mini-toggle"
        >
          <v-btn value="all" size="x-small">All</v-btn>
          <v-btn value="kitchen" size="x-small">Kitchen</v-btn>
          <v-btn value="bar" size="x-small">Bar</v-btn>
        </v-btn-toggle>

        <v-text-field
          v-model="search"
          placeholder="Search..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          :autofocus="false"
          class="hub-search"
          @vue:mounted="($el: any) => $el?.querySelector?.('input')?.blur()"
        />
      </div>
    </div>

    <!-- Global Change History (history mode) -->
    <div v-if="viewMode === 'history'" class="hub-timeline hub-history">
      <div v-if="historyLoading" class="d-flex justify-center pa-8">
        <v-progress-circular indeterminate color="primary" />
      </div>
      <template v-else-if="historyGroups.length > 0">
        <section v-for="group in historyGroups" :key="group.date" class="timeline-group">
          <div class="timeline-label">
            <span>{{ group.label }}</span>
            <span class="timeline-count">{{ group.entries.length }}</span>
          </div>
          <div class="history-entries">
            <div
              v-for="entry in group.entries"
              :key="entry.id"
              class="history-card"
              :class="{ 'history-card--expanded': expandedEntries.has(entry.id) }"
            >
              <!-- Header row — click to expand -->
              <div class="history-card-header" @click.stop="toggleExpand(entry.id)">
                <v-chip
                  :color="entry.entityType === 'recipe' ? 'green' : 'orange'"
                  size="x-small"
                  variant="flat"
                  label
                >
                  {{ entry.entityType === 'recipe' ? 'Recipe' : 'Prep' }}
                </v-chip>
                <span class="history-card-name">{{ entry.entityName }}</span>
                <v-chip
                  :color="historyChangeColor(entry.changeType)"
                  size="x-small"
                  variant="tonal"
                >
                  {{ entry.changeType }}
                </v-chip>
                <v-icon v-if="hasChanges(entry)" size="16" class="expand-icon">
                  {{ expandedEntries.has(entry.id) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                </v-icon>
              </div>
              <div class="history-card-meta">
                <span class="history-card-time">{{ formatHistoryTime(entry.createdAt) }}</span>
                <span class="history-card-author">by {{ entry.changedByName }}</span>
                <span
                  v-if="hasChanges(entry) && !expandedEntries.has(entry.id)"
                  class="history-card-summary"
                >
                  {{ totalChanges(entry) }} change{{ totalChanges(entry) > 1 ? 's' : '' }}
                </span>
              </div>

              <!-- Expanded details: was → became -->
              <div
                v-if="expandedEntries.has(entry.id) && hasChanges(entry)"
                class="history-details"
              >
                <!-- Field changes -->
                <div v-if="entry.changes.fields?.length" class="details-section">
                  <div v-for="(f, i) in entry.changes.fields" :key="'f' + i" class="detail-row">
                    <span class="detail-label">{{ getFieldLabel(f.field) }}</span>
                    <span class="detail-old">{{ formatFieldVal(f.field, f.old) }}</span>
                    <v-icon size="14" class="detail-arrow">mdi-arrow-right</v-icon>
                    <span class="detail-new">{{ formatFieldVal(f.field, f.new) }}</span>
                  </div>
                </div>

                <!-- Component changes -->
                <div v-if="entry.changes.components?.length" class="details-section">
                  <div class="details-section-title">Components</div>
                  <div
                    v-for="(c, i) in entry.changes.components"
                    :key="'c' + i"
                    class="detail-row detail-row--component"
                  >
                    <template v-if="c.action === 'added'">
                      <v-icon size="14" color="success">mdi-plus-circle</v-icon>
                      <span class="detail-comp-name text-success">{{ c.componentName }}</span>
                      <span v-if="getCompQty(c, 'new')" class="detail-comp-qty">
                        {{ getCompQty(c, 'new') }}
                      </span>
                    </template>
                    <template v-else-if="c.action === 'removed'">
                      <v-icon size="14" color="error">mdi-minus-circle</v-icon>
                      <span class="detail-comp-name text-error text-decoration-line-through">
                        {{ c.componentName }}
                      </span>
                      <span
                        v-if="getCompQty(c, 'old')"
                        class="detail-comp-qty text-medium-emphasis"
                      >
                        was {{ getCompQty(c, 'old') }}
                      </span>
                    </template>
                    <template v-else-if="c.action === 'modified'">
                      <v-icon size="14" color="warning">mdi-pencil-circle</v-icon>
                      <span class="detail-comp-name">{{ c.componentName }}</span>
                      <template v-for="(d, j) in c.details" :key="'d' + j">
                        <span class="detail-old">{{ d.old }}</span>
                        <v-icon size="12" class="detail-arrow">mdi-arrow-right</v-icon>
                        <span class="detail-new">{{ d.new }}</span>
                        <span v-if="d.field === 'unit'" class="detail-unit-label">
                          ({{ d.field }})
                        </span>
                      </template>
                    </template>
                  </div>
                </div>

                <!-- Open entity button -->
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  class="mt-1"
                  @click.stop="
                    emit('viewItem', {
                      id: entry.entityId,
                      type: entry.entityType,
                      status: 'active'
                    })
                  "
                >
                  Open {{ entry.entityType === 'recipe' ? 'recipe' : 'preparation' }}
                  <v-icon end size="14">mdi-open-in-new</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
        </section>
      </template>
      <div v-else class="empty-state">
        <v-icon size="48" color="grey">mdi-history</v-icon>
        <div>No changes recorded yet</div>
      </div>
    </div>

    <!-- Timeline sections (items mode) -->
    <div v-if="viewMode === 'items'" class="hub-timeline">
      <template v-for="group in timelineGroups" :key="group.label">
        <section v-if="group.items.length > 0" class="timeline-group">
          <div class="timeline-label">
            <span>{{ group.label }}</span>
            <span class="timeline-count">{{ group.items.length }}</span>
          </div>
          <div class="timeline-items">
            <div
              v-for="item in group.items"
              :key="`${item.type}-${item.id}`"
              class="timeline-card"
              :class="{ 'timeline-card--inactive': item.status !== 'active' }"
              @click="emit('viewItem', { id: item.id, type: item.type, status: item.status })"
            >
              <!-- Type badge -->
              <div class="card-type-badge" :class="item.type">
                <v-icon size="14">{{ typeIcon(item.type) }}</v-icon>
              </div>

              <!-- Main info -->
              <div class="card-body">
                <div class="card-name-row">
                  <span class="card-name">{{ item.name }}</span>
                  <v-chip
                    v-if="item.status !== 'active'"
                    size="x-small"
                    :color="item.status === 'draft' ? 'warning' : 'grey'"
                    variant="tonal"
                  >
                    {{ item.status === 'draft' ? 'Draft' : 'Archived' }}
                  </v-chip>
                </div>
                <div class="card-meta">
                  <span class="card-type-label">{{ typeLabel(item.type) }}</span>
                  <span v-if="item.categoryName" class="card-sep">·</span>
                  <span v-if="item.categoryName" class="card-category">
                    {{ item.categoryName }}
                  </span>
                  <span v-if="item.department && department === 'all'" class="card-sep">·</span>
                  <span v-if="item.department && department === 'all'" class="card-dept">
                    {{ item.department }}
                  </span>
                  <span class="card-sep">·</span>
                  <span class="card-components">{{ item.componentCount }} comp.</span>
                  <span v-if="item.cost" class="card-sep">·</span>
                  <span v-if="item.cost" class="card-cost">{{ formatIDR(item.cost) }}</span>
                </div>
                <div class="card-date">
                  {{ formatRelativeDate(item.sortDate) }}
                </div>
              </div>

              <!-- Actions (not for products) -->
              <div v-if="item.type !== 'product'" class="card-actions">
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  @click.stop="
                    emit('viewInCatalog', {
                      id: item.id,
                      type: item.type
                    })
                  "
                >
                  <v-icon size="18">mdi-file-tree-outline</v-icon>
                </v-btn>
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  @click.stop="
                    emit('cloneItem', {
                      id: item.id,
                      type: item.type as CreateType,
                      name: item.name
                    })
                  "
                >
                  <v-icon size="18">mdi-content-copy</v-icon>
                </v-btn>
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  color="warning"
                  @click.stop="
                    emit('deleteItem', {
                      id: item.id,
                      type: item.type as CreateType,
                      name: item.name
                    })
                  "
                >
                  <v-icon size="18">mdi-archive-outline</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
        </section>
      </template>

      <div v-if="allFilteredItems.length === 0" class="empty-state">
        <v-icon size="48" color="grey">mdi-folder-open-outline</v-icon>
        <div>No items match your filters</div>
      </div>
    </div>

    <!-- Create Type Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="400">
      <v-card>
        <v-card-title>What to create?</v-card-title>
        <v-card-text class="create-options">
          <div class="create-option" @click="handleCreate('menu')">
            <v-icon size="32" color="purple">mdi-silverware-variant</v-icon>
            <div>
              <div class="create-option-title">Menu Item</div>
              <div class="create-option-desc">Assemble from recipes & preparations</div>
            </div>
          </div>
          <div class="create-option" @click="handleCreate('recipe')">
            <v-icon size="32" color="green">mdi-book-open-variant</v-icon>
            <div>
              <div class="create-option-title">Recipe</div>
              <div class="create-option-desc">New recipe from ingredients</div>
            </div>
          </div>
          <div class="create-option" @click="handleCreate('preparation')">
            <v-icon size="32" color="orange">mdi-flask-outline</v-icon>
            <div>
              <div class="create-option-title">Preparation</div>
              <div class="create-option-desc">Semi-finished product</div>
            </div>
          </div>
          <div class="create-option" @click="handleCreateProduct">
            <v-icon size="32" color="blue">mdi-package-variant</v-icon>
            <div>
              <div class="create-option-title">Product</div>
              <div class="create-option-desc">Raw ingredient / supply item</div>
            </div>
          </div>
          <v-divider class="my-1" />
          <div class="create-option" @click="handleCreateCategory">
            <v-icon size="32" color="teal">mdi-folder-plus-outline</v-icon>
            <div>
              <div class="create-option-title">Category</div>
              <div class="create-option-desc">Menu, recipe or preparation category</div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMenuStore } from '@/stores/menu'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import { formatIDR } from '@/utils'
import { changelogService, getFieldLabel, formatFieldValue } from '@/core/changelog'
import type { ChangeLogEntry } from '@/core/changelog'
import type { MenuItem, Category } from '@/stores/menu/types'
import type { Preparation, Recipe } from '@/stores/recipes/types'
import type { Product } from '@/stores/productsStore/types'
import type { EntityStatus } from '@/types/common'

export type CreateType = 'menu' | 'recipe' | 'preparation'
export type ItemType = 'menu' | 'recipe' | 'preparation' | 'product'

export interface HubItemRef {
  id: string
  type: CreateType
  name: string
}

const emit = defineEmits<{
  createNew: [type: CreateType]
  createProduct: []
  createCategory: []
  viewItem: [ref: { id: string; type: string; status: string }]
  viewInCatalog: [ref: { id: string; type: string }]
  cloneItem: [ref: HubItemRef]
  deleteItem: [ref: HubItemRef]
}>()

const menuStore = useMenuStore()
const recipesStore = useRecipesStore()
const productsStore = useProductsStore()

// --- Filters ---
const selectedTypes = ref<ItemType[]>(['menu', 'recipe', 'preparation', 'product'])
const statusFilter = ref<'all' | 'draft' | 'active' | 'archived'>('all')
const department = ref<'all' | 'kitchen' | 'bar'>('all')
const search = ref('')
const showCreateDialog = ref(false)

const typeOptions = [
  { value: 'menu' as ItemType, label: 'Menu', icon: 'mdi-silverware-variant', color: 'purple' },
  { value: 'recipe' as ItemType, label: 'Recipes', icon: 'mdi-book-open-variant', color: 'green' },
  { value: 'preparation' as ItemType, label: 'Preps', icon: 'mdi-flask-outline', color: 'orange' },
  { value: 'product' as ItemType, label: 'Products', icon: 'mdi-package-variant', color: 'blue' }
]

function toggleType(type: ItemType) {
  const idx = selectedTypes.value.indexOf(type)
  if (idx >= 0) {
    if (selectedTypes.value.length > 1) {
      selectedTypes.value = selectedTypes.value.filter(t => t !== type)
    }
  } else {
    selectedTypes.value = [...selectedTypes.value, type]
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'menu':
      return 'mdi-silverware-variant'
    case 'recipe':
      return 'mdi-book-open-variant'
    case 'preparation':
      return 'mdi-flask-outline'
    case 'product':
      return 'mdi-package-variant'
    default:
      return 'mdi-file'
  }
}

function typeLabel(type: string) {
  switch (type) {
    case 'menu':
      return 'Menu'
    case 'recipe':
      return 'Recipe'
    case 'preparation':
      return 'Prep'
    case 'product':
      return 'Product'
    default:
      return type
  }
}

// --- Unified item interface ---
interface TimelineItem {
  id: string
  name: string
  type: ItemType
  isActive: boolean
  status: EntityStatus
  department?: string
  categoryName?: string
  componentCount: number
  cost?: number
  sortDate: Date
}

// --- Build items from all stores ---
const categories = computed(() => menuStore.categories as Category[])

function findCategoryName(id: string | undefined): string | undefined {
  if (!id) return undefined
  return categories.value.find(c => c.id === id)?.name
}

function parseDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date(0)
  return new Date(dateStr)
}

const menuItems = computed<TimelineItem[]>(() =>
  (menuStore.menuItems as MenuItem[]).map(m => ({
    id: m.id,
    name: m.name,
    type: 'menu' as ItemType,
    isActive: m.isActive,
    status: (m.status || (m.isActive ? 'active' : 'draft')) as EntityStatus,
    department: m.department || 'kitchen',
    categoryName: findCategoryName(m.categoryId),
    componentCount: m.variants?.[0]?.composition?.length ?? 0,
    sortDate: parseDate(m.lastEditedAt || m.updatedAt || m.createdAt)
  }))
)

const recipeItems = computed<TimelineItem[]>(() =>
  (recipesStore.recipes as Recipe[]).map(r => ({
    id: r.id,
    name: r.name,
    type: 'recipe' as ItemType,
    isActive: r.isActive,
    status: (r.status || (r.isActive ? 'active' : 'draft')) as EntityStatus,
    department: r.department || 'kitchen',
    categoryName: undefined,
    componentCount: r.components?.length ?? 0,
    sortDate: parseDate(r.lastEditedAt || r.updatedAt || r.createdAt)
  }))
)

const prepItems = computed<TimelineItem[]>(() =>
  (recipesStore.preparations as Preparation[]).map(p => ({
    id: p.id,
    name: p.name,
    type: 'preparation' as ItemType,
    isActive: p.isActive ?? true,
    status: (p.status || (p.isActive ? 'active' : 'draft')) as EntityStatus,
    department: p.department || 'kitchen',
    categoryName: undefined,
    componentCount: p.components?.length ?? 0,
    cost: p.costPerPortion ?? undefined,
    sortDate: parseDate(p.lastEditedAt || p.updatedAt || p.createdAt)
  }))
)

const productItems = computed<TimelineItem[]>(() =>
  (productsStore.products as Product[]).map(p => ({
    id: p.id,
    name: p.name,
    type: 'product' as ItemType,
    isActive: p.isActive,
    status: (p.status || (p.isActive ? 'active' : 'draft')) as EntityStatus,
    department: undefined,
    categoryName: p.category,
    componentCount: 0,
    cost: p.baseCostPerUnit ?? undefined,
    sortDate: parseDate(p.lastEditedAt || p.updatedAt || p.createdAt)
  }))
)

// --- Counts per type (before filtering) ---
const typeCounts = computed(() => ({
  menu: menuItems.value.length,
  recipe: recipeItems.value.length,
  preparation: prepItems.value.length,
  product: productItems.value.length
}))

// --- Filtered items ---
const allFilteredItems = computed<TimelineItem[]>(() => {
  let items: TimelineItem[] = []

  if (selectedTypes.value.includes('menu')) items.push(...menuItems.value)
  if (selectedTypes.value.includes('recipe')) items.push(...recipeItems.value)
  if (selectedTypes.value.includes('preparation')) items.push(...prepItems.value)
  if (selectedTypes.value.includes('product')) items.push(...productItems.value)

  // Status filter
  if (statusFilter.value !== 'all') {
    items = items.filter(i => i.status === statusFilter.value)
  }

  // Department filter
  if (department.value !== 'all') {
    items = items.filter(i => !i.department || i.department === department.value)
  }

  // Search
  if (search.value && search.value.length >= 2) {
    const q = search.value.toLowerCase()
    items = items.filter(i => i.name.toLowerCase().includes(q))
  }

  // Sort by date descending (newest first)
  items.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())

  return items
})

// --- Timeline grouping ---
interface TimelineGroup {
  label: string
  items: TimelineItem[]
}

const timelineGroups = computed<TimelineGroup[]>(() => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Sunday start
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const today: TimelineItem[] = []
  const thisWeek: TimelineItem[] = []
  const thisMonth: TimelineItem[] = []
  const older: TimelineItem[] = []

  for (const item of allFilteredItems.value) {
    const d = item.sortDate
    if (d >= todayStart) {
      today.push(item)
    } else if (d >= weekStart) {
      thisWeek.push(item)
    } else if (d >= monthStart) {
      thisMonth.push(item)
    } else {
      older.push(item)
    }
  }

  return [
    { label: 'Today', items: today },
    { label: 'This week', items: thisWeek },
    { label: 'This month', items: thisMonth },
    { label: 'Older', items: older }
  ]
})

// --- Date formatting ---
function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function handleCreate(type: CreateType) {
  showCreateDialog.value = false
  emit('createNew', type)
}

function handleCreateProduct() {
  showCreateDialog.value = false
  emit('createProduct')
}

function handleCreateCategory() {
  showCreateDialog.value = false
  emit('createCategory')
}

// --- View Mode: Items / History ---
const viewMode = ref<'items' | 'history'>('items')

// --- Global History ---
const historyEntries = ref<ChangeLogEntry[]>([])
const historyLoading = ref(false)

watch(viewMode, async mode => {
  if (mode === 'history' && historyEntries.value.length === 0) {
    historyLoading.value = true
    try {
      historyEntries.value = await changelogService.getRecentChanges(90, 200)
    } finally {
      historyLoading.value = false
    }
  }
})

interface HistoryGroup {
  label: string
  date: string
  entries: ChangeLogEntry[]
}

const historyGroups = computed<HistoryGroup[]>(() => {
  const dayMap = new Map<string, ChangeLogEntry[]>()

  for (const entry of historyEntries.value) {
    const d = new Date(entry.createdAt)
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!dayMap.has(dayKey)) dayMap.set(dayKey, [])
    dayMap.get(dayKey)!.push(entry)
  }

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const yd = new Date(Date.now() - 86400000)
  const yesterday = `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, '0')}-${String(yd.getDate()).padStart(2, '0')}`

  const groups: HistoryGroup[] = []
  for (const [dayKey, entries] of dayMap) {
    let label: string
    if (dayKey === today) label = 'Today'
    else if (dayKey === yesterday) label = 'Yesterday'
    else
      label = new Date(dayKey + 'T00:00:00').toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    groups.push({ label, date: dayKey, entries })
  }

  return groups
})

function formatHistoryTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function historyChangeColor(type: string): string {
  switch (type) {
    case 'created':
      return 'success'
    case 'updated':
      return 'primary'
    case 'archived':
      return 'error'
    case 'restored':
      return 'info'
    case 'cloned':
      return 'secondary'
    default:
      return 'grey'
  }
}

function hasChanges(entry: ChangeLogEntry): boolean {
  return (entry.changes.fields?.length || 0) > 0 || (entry.changes.components?.length || 0) > 0
}

function totalChanges(entry: ChangeLogEntry): number {
  return (entry.changes.fields?.length || 0) + (entry.changes.components?.length || 0)
}

// --- Expand/collapse ---
const expandedEntries = ref(new Set<string>())

function toggleExpand(id: string) {
  if (expandedEntries.value.has(id)) {
    expandedEntries.value.delete(id)
  } else {
    expandedEntries.value.add(id)
  }
  // Trigger reactivity
  expandedEntries.value = new Set(expandedEntries.value)
}

function formatFieldVal(field: string, value: any): string {
  return formatFieldValue(field, value)
}

function getCompQty(comp: any, which: 'old' | 'new'): string {
  const qty = comp.details?.find((d: any) => d.field === 'quantity')
  const unit = comp.details?.find((d: any) => d.field === 'unit')
  const q = qty?.[which]
  const u = unit?.[which]
  if (q != null) return `${q}${u ? ' ' + u : ''}`
  return ''
}
</script>

<style scoped lang="scss">
.constructor-hub {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hub-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .v-btn {
    text-transform: none;
    letter-spacing: 0;
  }
}

.hub-filters {
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.type-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;

  .v-chip {
    font-size: 0.78rem;
    cursor: pointer;
  }
}

.type-count {
  margin-left: 4px;
  font-size: 0.7rem;
  opacity: 0.6;
}

.filter-row-2 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-toggle {
  flex-shrink: 0;

  :deep(.v-btn) {
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.7rem;
    min-width: 40px;
    padding: 0 6px;
  }
}

.hub-search {
  flex: 1;
  min-width: 80px;

  :deep(.v-field) {
    border-radius: 8px;
  }
}

// --- Timeline ---
.hub-timeline {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 0;
}

.timeline-count {
  font-weight: 500;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
}

.timeline-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;

  &:active {
    background: rgba(255, 255, 255, 0.08);
  }

  &--inactive {
    opacity: 0.55;
  }
}

.card-type-badge {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.menu {
    background: rgba(156, 39, 176, 0.2);
    color: #ce93d8;
  }
  &.recipe {
    background: rgba(76, 175, 80, 0.2);
    color: #81c784;
  }
  &.preparation {
    background: rgba(255, 152, 0, 0.2);
    color: #ffb74d;
  }
  &.product {
    background: rgba(33, 150, 243, 0.2);
    color: #64b5f6;
  }
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-name {
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 1px;
  flex-wrap: wrap;
}

.card-sep {
  color: rgba(255, 255, 255, 0.2);
}

.card-type-label {
  font-weight: 500;
}

.card-cost {
  font-weight: 500;
}

.card-date {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 1px;
}

.card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.9rem;
}

// Create dialog
.create-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px 16px !important;
}

.create-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
  transition: background 0.15s;

  &:active {
    background: rgba(255, 255, 255, 0.08);
  }
}

.create-option-title {
  font-weight: 600;
  font-size: 1rem;
}

.create-option-desc {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

// --- View toggle ---
.hub-view-toggle {
  padding: 0 16px 8px;
}

// --- History mode ---
.hub-history {
  .history-entries {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 4px;
  }
}

.history-card {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
}

.history-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.history-card-name {
  font-weight: 500;
  font-size: 0.9rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-card-meta {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.history-card-changes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.history-card--expanded {
  background: rgba(255, 255, 255, 0.06);
}

.history-card-header {
  cursor: pointer;
}

.expand-icon {
  opacity: 0.5;
  margin-left: auto;
}

.history-card-summary {
  opacity: 0.6;
  font-style: italic;
}

// --- Expanded details ---
.history-details {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.details-section {
  margin-bottom: 8px;
}

.details-section-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 4px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 0.8rem;
}

.detail-row--component {
  padding: 4px 0;
}

.detail-label {
  color: rgba(255, 255, 255, 0.6);
  min-width: 80px;
  font-weight: 500;
}

.detail-old {
  color: #f44336;
  text-decoration: line-through;
}

.detail-new {
  color: #4caf50;
  font-weight: 500;
}

.detail-arrow {
  opacity: 0.4;
  flex-shrink: 0;
}

.detail-comp-name {
  font-weight: 500;
}

.detail-comp-qty {
  font-size: 0.75rem;
  opacity: 0.7;
}

.detail-unit-label {
  font-size: 0.7rem;
  opacity: 0.5;
}
</style>
