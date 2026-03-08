<!-- Tree view — categories as expandable groups with items, cost display, modifiers, and sorting -->
<template>
  <div class="tree-view">
    <!-- Sort controls -->
    <div class="tree-controls">
      <v-btn-toggle
        v-model="sortMode"
        mandatory
        density="compact"
        color="primary"
        class="sort-toggle"
      >
        <v-btn value="name" size="small">
          <v-icon size="16" start>mdi-sort-alphabetical-ascending</v-icon>
          Name
        </v-btn>
        <v-btn value="cost-asc" size="small">
          <v-icon size="16" start>mdi-sort-numeric-ascending</v-icon>
          Cost
        </v-btn>
        <v-btn value="cost-desc" size="small">
          <v-icon size="16" start>mdi-sort-numeric-descending</v-icon>
          Cost
        </v-btn>
      </v-btn-toggle>

      <v-spacer />

      <!-- Show modifiers toggle (menu section only) -->
      <v-btn
        v-if="section === 'menu'"
        variant="tonal"
        size="small"
        :color="showModifiers ? 'purple' : undefined"
        @click="showModifiers = !showModifiers"
      >
        <v-icon size="16" start>mdi-tune-variant</v-icon>
        Modifiers
      </v-btn>

      <v-btn
        variant="text"
        size="small"
        :icon="allExpanded ? 'mdi-unfold-less-horizontal' : 'mdi-unfold-more-horizontal'"
        @click="toggleAll"
      />
    </div>

    <!-- Category groups -->
    <div v-for="group in sortedGroups" :key="group.id" class="tree-group">
      <div class="group-header" :class="sectionClass" @click="toggleGroup(group.id)">
        <v-icon size="18" class="expand-icon" :class="{ rotated: expandedGroups.has(group.id) }">
          mdi-chevron-right
        </v-icon>
        <span class="group-name">{{ group.name }}</span>
        <span class="group-count">{{ group.items.length }}</span>
        <span v-if="group.avgCost > 0" class="group-avg-cost">
          avg {{ formatIDR(group.avgCost) }}
        </span>
      </div>

      <div v-if="expandedGroups.has(group.id)" class="group-items">
        <template v-for="item in group.sortedItems" :key="item.id">
          <!-- Item row -->
          <div
            class="tree-item"
            :class="[sectionClass, { inactive: item.status !== 'active' }]"
            @click="emit('select', item)"
          >
            <div class="item-main">
              <!-- Expand arrow for items with modifiers -->
              <v-icon
                v-if="showModifiers && itemModifiers.has(item.id)"
                size="16"
                class="item-expand-icon"
                :class="{ rotated: expandedItems.has(item.id) }"
                @click.stop="toggleItem(item.id)"
              >
                mdi-chevron-right
              </v-icon>
              <span class="item-name">{{ item.name }}</span>
              <v-chip
                v-if="item.status !== 'active'"
                :color="item.status === 'draft' ? 'warning' : 'grey'"
                size="x-small"
                variant="flat"
                label
              >
                {{ item.status === 'draft' ? 'Draft' : 'Archived' }}
              </v-chip>
              <!-- Modifier indicator (when modifiers hidden) -->
              <v-icon
                v-if="!showModifiers && itemModifiers.has(item.id)"
                size="14"
                color="purple"
                class="modifier-indicator"
              >
                mdi-tune-variant
              </v-icon>
            </div>
            <div class="item-cost-col">
              <span v-if="item.costDisplay" class="item-cost">{{ item.costDisplay }}</span>
              <span v-else class="item-no-cost">--</span>
            </div>
          </div>

          <!-- Modifier groups (nested under the item) -->
          <div
            v-if="showModifiers && expandedItems.has(item.id) && itemModifiers.has(item.id)"
            class="modifier-section"
          >
            <div v-for="mg in itemModifiers.get(item.id)" :key="mg.id" class="modifier-group">
              <div class="modifier-group-header">
                <v-chip
                  :color="
                    mg.type === 'replacement' ? 'teal' : mg.type === 'addon' ? 'amber' : 'grey'
                  "
                  size="x-small"
                  variant="flat"
                  label
                >
                  {{ mg.type }}
                </v-chip>
                <span class="modifier-group-name">{{ mg.name }}</span>
                <v-chip v-if="mg.isRequired" size="x-small" color="error" variant="outlined" label>
                  required
                </v-chip>
              </div>
              <div class="modifier-options">
                <div
                  v-for="opt in mg.options.filter(o => o.isActive !== false)"
                  :key="opt.id"
                  class="modifier-option"
                >
                  <span class="option-name">
                    {{ opt.name }}
                    <span v-if="opt.isDefault" class="option-default">(default)</span>
                  </span>
                  <span class="option-costs">
                    <span v-if="opt.priceAdjustment" class="option-price">
                      {{ opt.priceAdjustment > 0 ? '+' : '' }}{{ formatIDR(opt.priceAdjustment) }}
                    </span>
                    <span v-if="opt.compositionCost > 0" class="option-cost">
                      cost
                      {{ formatIDR(mg.type === 'replacement' ? opt.netCost : opt.compositionCost) }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-if="sortedGroups.length === 0" class="empty-state">
      <v-icon size="48" color="grey-darken-1">mdi-file-tree-outline</v-icon>
      <p>No items</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CatalogItem, ModifierGroupDisplay } from '../composables/useCatalogData'
import { useCatalogData } from '../composables/useCatalogData'
import { useMenuStore } from '@/stores/menu'
import type { MenuItem } from '@/stores/menu/types'
import { formatIDR } from '@/utils'

const props = defineProps<{
  items: CatalogItem[]
  categories: Array<{ id: string; name: string; count: number }>
  section: string
}>()

const emit = defineEmits<{
  select: [item: CatalogItem]
}>()

type SortMode = 'name' | 'cost-asc' | 'cost-desc'

const sortMode = ref<SortMode>('name')
const expandedGroups = ref(new Set<string>())
const expandedItems = ref(new Set<string>())
const showModifiers = ref(false)

const sectionClass = computed(() => `section-${props.section}`)

const menuStore = useMenuStore()
const { buildModifierDisplayData } = useCatalogData()

// Build modifier display data for all menu items that have modifiers
const itemModifiers = computed(() => {
  const map = new Map<string, ModifierGroupDisplay[]>()
  if (props.section !== 'menu') return map

  for (const item of props.items) {
    const mi = (menuStore.menuItems as MenuItem[]).find(m => m.id === item.id)
    if (mi?.modifierGroups?.length) {
      const display = buildModifierDisplayData(mi)
      if (display.length > 0) {
        map.set(item.id, display)
      }
    }
  }
  return map
})

// Auto-expand items with modifiers when showModifiers is toggled on
watch(showModifiers, val => {
  if (val) {
    // Expand all items that have modifiers
    const ids = new Set<string>()
    for (const id of itemModifiers.value.keys()) {
      ids.add(id)
    }
    expandedItems.value = ids
  } else {
    expandedItems.value = new Set()
  }
})

interface TreeGroup {
  id: string
  name: string
  items: CatalogItem[]
  sortedItems: CatalogItem[]
  avgCost: number
  totalCost: number
}

function sortItems(items: CatalogItem[], mode: SortMode): CatalogItem[] {
  return [...items].sort((a, b) => {
    if (mode === 'name') {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return a.name.localeCompare(b.name)
    }
    const costA = a.cost ?? 0
    const costB = b.cost ?? 0
    if (mode === 'cost-asc') return costA - costB
    return costB - costA
  })
}

const sortedGroups = computed<TreeGroup[]>(() => {
  const itemsByCategory = new Map<string, CatalogItem[]>()

  for (const item of props.items) {
    const catId = item.categoryId || '__uncategorized__'
    if (!itemsByCategory.has(catId)) {
      itemsByCategory.set(catId, [])
    }
    itemsByCategory.get(catId)!.push(item)
  }

  const groups: TreeGroup[] = []

  for (const cat of props.categories) {
    const items = itemsByCategory.get(cat.id) || []
    if (items.length === 0) continue

    const costsSum = items.reduce((s, i) => s + (i.cost ?? 0), 0)
    const withCost = items.filter(i => (i.cost ?? 0) > 0)

    groups.push({
      id: cat.id,
      name: cat.name,
      items,
      sortedItems: sortItems(items, sortMode.value),
      avgCost: withCost.length > 0 ? costsSum / withCost.length : 0,
      totalCost: costsSum
    })
  }

  if (sortMode.value === 'name') {
    groups.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortMode.value === 'cost-asc') {
    groups.sort((a, b) => a.avgCost - b.avgCost)
  } else {
    groups.sort((a, b) => b.avgCost - a.avgCost)
  }

  return groups
})

const allExpanded = computed(
  () =>
    sortedGroups.value.length > 0 && sortedGroups.value.every(g => expandedGroups.value.has(g.id))
)

function toggleGroup(id: string) {
  const set = new Set(expandedGroups.value)
  if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
  }
  expandedGroups.value = set
}

function toggleItem(id: string) {
  const set = new Set(expandedItems.value)
  if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
  }
  expandedItems.value = set
}

function toggleAll() {
  if (allExpanded.value) {
    expandedGroups.value = new Set()
  } else {
    expandedGroups.value = new Set(sortedGroups.value.map(g => g.id))
  }
}
</script>

<style scoped lang="scss">
.tree-view {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tree-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.sort-toggle {
  :deep(.v-btn) {
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.78rem;
  }
}

.tree-group {
  border-radius: 8px;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  user-select: none;
  border-left: 3px solid rgba(255, 255, 255, 0.15);
  transition: background 0.15s;

  &:active {
    background: rgba(255, 255, 255, 0.1);
  }

  &.section-menu {
    border-left-color: rgb(var(--v-theme-purple, 156, 39, 176));
  }
  &.section-recipes {
    border-left-color: rgb(var(--v-theme-success, 76, 175, 80));
  }
  &.section-preps {
    border-left-color: rgb(var(--v-theme-warning, 255, 152, 0));
  }
  &.section-products {
    border-left-color: rgb(var(--v-theme-info, 33, 150, 243));
  }
}

.expand-icon {
  transition: transform 0.2s ease;
  opacity: 0.5;

  &.rotated {
    transform: rotate(90deg);
  }
}

.group-name {
  font-weight: 600;
  font-size: 0.92rem;
  flex: 1;
}

.group-count {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 7px;
  border-radius: 10px;
}

.group-avg-cost {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
}

.group-items {
  display: flex;
  flex-direction: column;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px 9px 40px;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.15s;

  &:active {
    background: rgba(255, 255, 255, 0.07);
  }

  &.inactive {
    opacity: 0.5;
  }

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  &.section-menu {
    border-left-color: rgba(var(--v-theme-purple, 156, 39, 176), 0.2);
  }
  &.section-recipes {
    border-left-color: rgba(var(--v-theme-success, 76, 175, 80), 0.2);
  }
  &.section-preps {
    border-left-color: rgba(var(--v-theme-warning, 255, 152, 0), 0.2);
  }
  &.section-products {
    border-left-color: rgba(var(--v-theme-info, 33, 150, 243), 0.2);
  }
}

.item-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.item-expand-icon {
  flex-shrink: 0;
  opacity: 0.4;
  transition: transform 0.2s ease;
  cursor: pointer;
  margin-left: -4px;

  &.rotated {
    transform: rotate(90deg);
  }

  &:hover {
    opacity: 0.8;
  }
}

.item-name {
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modifier-indicator {
  opacity: 0.5;
  flex-shrink: 0;
}

.item-cost-col {
  flex-shrink: 0;
  text-align: right;
  min-width: 80px;
}

.item-cost {
  font-weight: 500;
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
}

.item-no-cost {
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.2);
}

// --- Modifier section ---
.modifier-section {
  padding: 4px 14px 8px 56px;
  background: rgba(255, 255, 255, 0.01);
  border-left: 3px solid rgba(var(--v-theme-purple, 156, 39, 176), 0.1);
}

.modifier-group {
  margin-bottom: 6px;

  &:last-child {
    margin-bottom: 0;
  }
}

.modifier-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.modifier-group-name {
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.modifier-options {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 8px;
}

.modifier-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.76rem;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}

.option-name {
  color: rgba(255, 255, 255, 0.6);
}

.option-default {
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.35);
}

.option-costs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.option-price {
  color: rgba(255, 255, 255, 0.5);
}

.option-cost {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.72rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 0;
  color: rgba(255, 255, 255, 0.4);
}
</style>
