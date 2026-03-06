<!-- Detail screen with dependency tree, info, cost, used-in tabs -->
<template>
  <div class="detail-screen">
    <!-- Header -->
    <div class="detail-header">
      <v-btn icon="mdi-arrow-left" variant="text" size="default" @click="emit('back')" />
      <div class="detail-title">
        <h2>{{ item.name }}</h2>
        <div class="detail-subtitle">
          <v-chip :color="typeColor" size="small" variant="flat" label>
            {{ typeLabel }}
          </v-chip>
          <span v-if="item.code" class="subtitle-text">{{ item.code }}</span>
          <span v-if="item.department" class="subtitle-text">{{ item.department }}</span>
          <span v-if="item.categoryName" class="subtitle-text">{{ item.categoryName }}</span>
          <v-chip v-if="!item.isActive" color="grey" size="small" variant="flat" label>
            Inactive
          </v-chip>
        </div>
      </div>
      <v-btn
        variant="tonal"
        color="primary"
        size="small"
        prepend-icon="mdi-pencil"
        @click="emit('edit', { id: item.id, type: item.type })"
      >
        Edit
      </v-btn>
    </div>

    <!-- Tabs — products have no tree (leaf entities), show Used In first -->
    <v-tabs v-model="activeTab" density="compact" color="primary">
      <template v-if="item.type === 'product'">
        <v-tab value="used-in">Used In</v-tab>
        <v-tab value="info">Info</v-tab>
        <v-tab value="cost">Cost</v-tab>
      </template>
      <template v-else>
        <v-tab value="tree">Tree</v-tab>
        <v-tab v-if="modifierGroups.length > 0" value="modifiers">Modifiers</v-tab>
        <v-tab value="info">Info</v-tab>
        <v-tab value="cost">Cost</v-tab>
        <v-tab value="used-in">Used In</v-tab>
      </template>
    </v-tabs>

    <!-- Tab content -->
    <div class="detail-content">
      <!-- Tree Tab -->
      <div v-if="activeTab === 'tree'" class="tab-content">
        <!-- Output summary for recipes/preparations -->
        <div v-if="outputDisplay && treeNodes.length > 0" class="tree-output-header">
          <span class="tree-output-label">Output:</span>
          <span class="tree-output-value">{{ outputDisplay }}</span>
          <span class="tree-output-sep">|</span>
          <span class="tree-output-label">Cost:</span>
          <span class="tree-output-value">{{ totalCostDisplay }}</span>
          <span v-if="costPerUnit" class="tree-output-per-unit">({{ costPerUnit }})</span>
        </div>
        <DependencyTree
          v-if="treeNodes.length > 0"
          :tree="treeNodes"
          :default-expand-depth="2"
          @navigate="handleTreeNavigate"
          @edit="target => emit('edit', target)"
        />
        <div v-else class="empty-state">No components</div>
      </div>

      <!-- Modifiers Tab -->
      <div v-if="activeTab === 'modifiers'" class="tab-content">
        <div v-if="modifierGroups.length === 0" class="empty-state">No modifiers</div>
        <div v-else class="modifiers-list">
          <div v-for="group in modifierGroups" :key="group.id" class="modifier-group-card">
            <!-- Group header -->
            <div class="modifier-group-header">
              <div class="modifier-group-header-left">
                <v-chip :color="modifierTypeColor(group.type)" size="small" variant="flat" label>
                  {{ group.type }}
                </v-chip>
                <span class="modifier-group-name">{{ group.name }}</span>
              </div>
              <div class="modifier-group-header-right">
                <v-chip
                  :color="group.isRequired ? 'error' : 'grey'"
                  size="x-small"
                  variant="tonal"
                  label
                >
                  {{ group.isRequired ? 'Required' : 'Optional' }}
                </v-chip>
                <span
                  v-if="group.minSelection != null || group.maxSelection != null"
                  class="modifier-selection-range"
                >
                  {{ group.minSelection ?? 0 }}-{{ group.maxSelection ?? '∞' }} sel
                </span>
              </div>
            </div>

            <!-- Replacement target info -->
            <div
              v-if="group.type === 'replacement' && group.targetComponentNames.length > 0"
              class="modifier-replaces"
            >
              Replaces: {{ group.targetComponentNames.join(', ') }}
              <span v-if="getReplacedCost(group) > 0" class="modifier-replaces-cost">
                ({{ formatIDR(getReplacedCost(group)) }})
              </span>
            </div>

            <!-- Options list -->
            <div class="modifier-options">
              <div
                v-for="option in group.options"
                :key="option.id"
                class="modifier-option"
                :class="{ 'modifier-option--inactive': !option.isActive }"
              >
                <div
                  class="modifier-option-row"
                  :class="{ clickable: option.compositionTree.length > 0 }"
                  @click="
                    option.compositionTree.length > 0 &&
                      toggleModifierExpand(group.id + ':' + option.id)
                  "
                >
                  <!-- Expand toggle -->
                  <v-btn
                    v-if="option.compositionTree.length > 0"
                    icon
                    variant="text"
                    size="x-small"
                    density="compact"
                    class="expand-btn"
                    @click.stop="toggleModifierExpand(group.id + ':' + option.id)"
                  >
                    <v-icon size="16">
                      {{
                        isModifierExpanded(group.id + ':' + option.id)
                          ? 'mdi-chevron-down'
                          : 'mdi-chevron-right'
                      }}
                    </v-icon>
                  </v-btn>
                  <div v-else class="expand-placeholder" />

                  <span class="modifier-option-name">
                    {{ option.name }}
                    <v-chip
                      v-if="option.isDefault"
                      size="x-small"
                      variant="tonal"
                      color="primary"
                      label
                      class="ml-1"
                    >
                      default
                    </v-chip>
                  </span>
                  <span class="modifier-option-dots" />
                  <span v-if="option.priceAdjustment !== 0" class="modifier-option-price">
                    {{ option.priceAdjustment > 0 ? '+' : ''
                    }}{{ formatIDR(option.priceAdjustment) }}
                  </span>
                  <span v-if="option.compositionCost > 0" class="modifier-option-cost">
                    <template
                      v-if="
                        group.type === 'replacement' && option.netCost !== option.compositionCost
                      "
                    >
                      <span
                        class="modifier-option-cost--net"
                        :class="{
                          'text-green': option.netCost < 0,
                          'text-red': option.netCost > 0
                        }"
                      >
                        {{ option.netCost >= 0 ? '+' : '' }}{{ formatIDR(option.netCost) }}
                      </span>
                    </template>
                    <template v-else>
                      {{ formatIDR(option.compositionCost) }}
                    </template>
                  </span>
                </div>
                <!-- Expanded composition tree -->
                <div
                  v-if="
                    option.compositionTree.length > 0 &&
                    isModifierExpanded(group.id + ':' + option.id)
                  "
                  class="modifier-option-tree"
                >
                  <DependencyTree
                    :tree="option.compositionTree"
                    :default-expand-depth="1"
                    @navigate="handleTreeNavigate"
                    @edit="target => emit('edit', target)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Tab -->
      <div v-if="activeTab === 'info'" class="tab-content">
        <div class="info-grid">
          <template v-if="item.type === 'menu' && menuItem">
            <InfoRow label="Department" :value="menuItem.department" />
            <InfoRow label="Category" :value="item.categoryName" />
            <InfoRow label="Type" :value="menuItem.type" />
            <InfoRow label="Dish Type" :value="menuItem.dishType" />
            <InfoRow label="Variants" :value="String(menuItem.variants?.length ?? 0)" />
            <InfoRow label="Status" :value="menuItem.isActive ? 'Active' : 'Inactive'" />
          </template>
          <template v-else-if="item.type === 'recipe' && recipe">
            <InfoRow label="Code" :value="recipe.code" />
            <InfoRow label="Department" :value="recipe.department" />
            <InfoRow label="Category" :value="item.categoryName" />
            <InfoRow label="Portion" :value="`${recipe.portionSize} ${recipe.portionUnit}`" />
            <InfoRow v-if="recipe.prepTime" label="Prep Time" :value="recipe.prepTime + ' min'" />
            <InfoRow v-if="recipe.cookTime" label="Cook Time" :value="recipe.cookTime + ' min'" />
            <InfoRow v-if="recipe.difficulty" label="Difficulty" :value="recipe.difficulty" />
            <InfoRow label="Components" :value="String(recipe.components?.length ?? 0)" />
            <InfoRow label="Status" :value="recipe.isActive ? 'Active' : 'Inactive'" />
          </template>
          <template v-else-if="item.type === 'preparation' && preparation">
            <InfoRow label="Code" :value="preparation.code" />
            <InfoRow label="Department" :value="preparation.department" />
            <InfoRow label="Category" :value="item.categoryName" />
            <InfoRow
              label="Output"
              :value="`${preparation.outputQuantity} ${getUnitShortName(preparation.outputUnit)}`"
            />
            <InfoRow
              v-if="preparation.preparationTime"
              label="Prep Time"
              :value="preparation.preparationTime + ' min'"
            />
            <InfoRow
              v-if="preparation.shelfLife"
              label="Shelf Life"
              :value="preparation.shelfLife + ' days'"
            />
            <InfoRow label="Ingredients" :value="String(preparation.recipe?.length ?? 0)" />
            <InfoRow label="Status" :value="preparation.isActive ? 'Active' : 'Inactive'" />
          </template>
          <template v-else-if="item.type === 'product' && product">
            <InfoRow label="Category" :value="item.categoryName" />
            <InfoRow label="Base Unit" :value="product.baseUnit" />
            <InfoRow
              label="Cost per Unit"
              :value="formatIDR(product.baseCostPerUnit) + '/' + product.baseUnit"
            />
            <InfoRow
              v-if="product.yieldPercentage"
              label="Yield"
              :value="product.yieldPercentage + '%'"
            />
            <InfoRow label="Departments" :value="product.usedInDepartments?.join(', ') || '-'" />
            <InfoRow label="Status" :value="product.isActive ? 'Active' : 'Inactive'" />
          </template>
        </div>
      </div>

      <!-- Cost Tab -->
      <div v-if="activeTab === 'cost'" class="tab-content">
        <div class="cost-summary">
          <!-- Product-specific cost with yield -->
          <template v-if="item.type === 'product' && product">
            <div class="cost-line">
              <span class="cost-label">Purchase Cost</span>
              <span class="cost-value">
                {{ formatIDR(product.baseCostPerUnit) }}/{{ product.baseUnit }}
              </span>
            </div>
            <div v-if="product.yieldPercentage && product.yieldPercentage < 100" class="cost-line">
              <span class="cost-label">Yield</span>
              <span class="cost-value">{{ product.yieldPercentage }}%</span>
            </div>
            <div
              v-if="product.yieldPercentage && product.yieldPercentage < 100"
              class="cost-line cost-line--highlight"
            >
              <span class="cost-label">Effective Cost</span>
              <span class="cost-value">
                {{
                  formatIDR(Math.round(product.baseCostPerUnit / (product.yieldPercentage / 100)))
                }}/{{ product.baseUnit }}
              </span>
            </div>
          </template>

          <!-- Non-product items -->
          <template v-else>
            <!-- Food cost range for modifiable menu items -->
            <template v-if="foodCostRange">
              <div class="cost-line">
                <span class="cost-label">Base Cost</span>
                <span class="cost-value">{{ formatIDR(foodCostRange.baseCost) }}</span>
              </div>
              <div v-if="foodCostRange.defaultCombination" class="cost-line">
                <span class="cost-label">Default FC%</span>
                <span class="cost-value">
                  {{ foodCostRange.defaultCombination.foodCostPercent.toFixed(1) }}%
                </span>
              </div>
              <div class="cost-line cost-line--highlight">
                <span class="cost-label">FC% Range</span>
                <span class="cost-value">
                  {{ foodCostRange.minFoodCostPercent.toFixed(1) }}% —
                  {{ foodCostRange.maxFoodCostPercent.toFixed(1) }}%
                </span>
              </div>
            </template>
            <template v-else>
              <!-- Output info for recipes/preparations -->
              <div v-if="outputDisplay" class="cost-line">
                <span class="cost-label">Output</span>
                <span class="cost-value">{{ outputDisplay }}</span>
              </div>
              <div class="cost-line">
                <span class="cost-label">Total Cost</span>
                <span class="cost-value">{{ totalCostDisplay }}</span>
              </div>
              <div v-if="costPerUnit" class="cost-line">
                <span class="cost-label">Cost per Unit</span>
                <span class="cost-value">{{ costPerUnit }}</span>
              </div>
            </template>
            <!-- Rec. price and food cost only for non-modifiable menu items and recipes -->
            <template v-if="!foodCostRange && (item.type === 'menu' || item.type === 'recipe')">
              <div v-if="recommendedPrice > 0" class="cost-line">
                <span class="cost-label">Rec. Price (35% FC)</span>
                <span class="cost-value">{{ formatIDR(recommendedPrice) }}</span>
              </div>
              <div v-if="totalCost > 0 && recommendedPrice > 0" class="cost-line">
                <span class="cost-label">Food Cost %</span>
                <span class="cost-value">35%</span>
              </div>
            </template>
          </template>
        </div>

        <!-- Cost breakdown from tree (sorted by cost descending) -->
        <div v-if="treeNodes.length > 0" class="cost-breakdown">
          <h4>Cost Breakdown</h4>
          <div v-for="node in sortedTreeNodes" :key="node.id + node.type" class="breakdown-row">
            <v-chip
              :color="typeColorFor(node.type)"
              size="x-small"
              variant="flat"
              label
              class="breakdown-badge"
            >
              {{ node.type.charAt(0).toUpperCase() }}
            </v-chip>
            <span class="breakdown-name">{{ node.name }}</span>
            <span class="breakdown-dots" />
            <span v-if="node.quantity" class="breakdown-qty">
              {{ node.quantity }} {{ node.unit }}
            </span>
            <span class="breakdown-cost">{{ node.cost ? formatIDR(node.cost) : '-' }}</span>
          </div>
        </div>
      </div>

      <!-- Used In Tab -->
      <div v-if="activeTab === 'used-in'" class="tab-content">
        <div v-if="usedInItems.length === 0" class="empty-state">Not used in any other items</div>
        <div v-else class="usage-list">
          <div
            v-for="usage in usedInItems"
            :key="usage.id + usage.type"
            class="usage-row"
            :class="{ 'usage-row--inactive': !usage.isActive }"
            @click="emit('navigate', { id: usage.id, type: usage.type })"
          >
            <v-chip
              :color="usage.isActive ? typeColorFor(usage.type) : 'grey'"
              size="x-small"
              variant="flat"
              label
            >
              {{ usage.typeLabel }}
            </v-chip>
            <span class="usage-name">{{ usage.name }}</span>
            <span class="usage-dots" />
            <span v-if="usage.quantity" class="usage-quantity">
              {{ usage.quantity }} {{ usage.unit }}
            </span>
            <v-icon size="16" class="usage-arrow">mdi-chevron-right</v-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useMenuStore } from '@/stores/menu'
import { formatIDR } from '@/utils'
import { getUnitShortName } from '@/types/measurementUnits'
import { useCatalogData } from '../composables/useCatalogData'
import type { CatalogItem, ModifierGroupDisplay } from '../composables/useCatalogData'
import { calculateFoodCostRange } from '@/core/cost/modifierCostCalculator'
import type { FoodCostRange } from '@/core/cost/modifierCostCalculator'
import DependencyTree from './DependencyTree.vue'
import type { TreeNode } from './DependencyTree.vue'
import type { Product } from '@/stores/productsStore/types'
import type { Preparation, Recipe } from '@/stores/recipes/types'
import type { MenuItem } from '@/stores/menu/types'

const InfoRow = {
  props: { label: String, value: [String, Number] },
  setup(props: { label?: string; value?: string | number }) {
    return () =>
      h('div', { class: 'info-row' }, [
        h('span', { class: 'info-label' }, props.label),
        h('span', { class: 'info-value' }, props.value || '-')
      ])
  }
}

const props = defineProps<{
  item: CatalogItem
}>()

const emit = defineEmits<{
  back: []
  navigate: [{ id: string; type: CatalogItem['type'] }]
  edit: [{ id: string; type: CatalogItem['type'] }]
}>()

const productsStore = useProductsStore()
const recipesStore = useRecipesStore()
const menuStore = useMenuStore()
const { buildTree, buildModifierDisplayData } = useCatalogData()

const defaultTab = (type: CatalogItem['type']) => (type === 'product' ? 'used-in' : 'tree')
const activeTab = ref(defaultTab(props.item.type))

// Reset to default tab when navigating to a different item
watch(
  () => props.item.id,
  () => {
    activeTab.value = defaultTab(props.item.type)
  }
)

// Resolve full entity
const menuItem = computed<MenuItem | undefined>(() =>
  props.item.type === 'menu'
    ? (menuStore.menuItems as MenuItem[]).find(m => m.id === props.item.id)
    : undefined
)
const recipe = computed<Recipe | undefined>(() =>
  props.item.type === 'recipe'
    ? (recipesStore.getRecipeById(props.item.id) as Recipe | undefined)
    : undefined
)
const preparation = computed<Preparation | undefined>(() =>
  props.item.type === 'preparation'
    ? (recipesStore.getPreparationById(props.item.id) as Preparation | undefined)
    : undefined
)
const product = computed<Product | undefined>(() =>
  props.item.type === 'product'
    ? (productsStore.getProductById(props.item.id) as Product | undefined)
    : undefined
)

// Modifier display data
const modifierGroups = computed<ModifierGroupDisplay[]>(() => {
  if (!menuItem.value) return []
  return buildModifierDisplayData(menuItem.value)
})

// Modifier expand state
const expandedModifiers = ref(new Set<string>())

function toggleModifierExpand(key: string) {
  if (expandedModifiers.value.has(key)) {
    expandedModifiers.value.delete(key)
  } else {
    expandedModifiers.value.add(key)
  }
}

function isModifierExpanded(key: string): boolean {
  return expandedModifiers.value.has(key)
}

function getReplacedCost(group: ModifierGroupDisplay): number {
  if (group.type !== 'replacement' || !group.options.length) return 0
  const first = group.options[0]
  // replacedCost = compositionCost - netCost
  return first.compositionCost - first.netCost
}

function modifierTypeColor(type: string): string {
  switch (type) {
    case 'replacement':
      return 'teal'
    case 'addon':
      return 'amber'
    case 'removal':
      return 'grey'
    default:
      return 'grey'
  }
}

// Food cost range for modifiable items
const foodCostRange = computed<FoodCostRange | null>(() => {
  if (!menuItem.value || !menuItem.value.modifierGroups?.length) return null
  const variant = menuItem.value.variants?.[0]
  if (!variant) return null
  return calculateFoodCostRange(variant, menuItem.value, {
    productsStore,
    recipesStore
  })
})

// Type display
const typeColor = computed(() => typeColorFor(props.item.type))
const typeLabel = computed(() => {
  switch (props.item.type) {
    case 'menu':
      return 'Menu'
    case 'recipe':
      return 'Recipe'
    case 'preparation':
      return 'Prep'
    case 'product':
      return 'Product'
    default:
      return props.item.type
  }
})

function typeColorFor(type: string) {
  switch (type) {
    case 'menu':
      return 'purple'
    case 'recipe':
      return 'green'
    case 'preparation':
      return 'orange'
    case 'product':
      return 'blue'
    default:
      return 'grey'
  }
}

// Build tree
const treeNodes = computed<TreeNode[]>(() => buildTree(props.item.type, props.item.id))

// Sorted by cost descending for the Cost tab
const sortedTreeNodes = computed<TreeNode[]>(() =>
  [...treeNodes.value].sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
)

function handleTreeNavigate(target: { id: string; type: TreeNode['type'] }) {
  emit('navigate', target)
}

// Cost
const totalCost = computed(() => {
  if (props.item.type === 'product') return product.value?.baseCostPerUnit ?? 0
  return treeNodes.value.reduce((sum, n) => sum + (n.cost ?? 0), 0)
})

// Output display for recipes/preparations
const outputDisplay = computed<string | null>(() => {
  if (props.item.type === 'recipe' && recipe.value) {
    return `${recipe.value.portionSize} ${recipe.value.portionUnit}`
  }
  if (props.item.type === 'preparation' && preparation.value) {
    const unit =
      preparation.value.portionType === 'portion' ? 'portion' : preparation.value.outputUnit
    return `${preparation.value.outputQuantity} ${getUnitShortName(unit)}`
  }
  return null
})

const totalCostDisplay = computed(() => {
  if (totalCost.value <= 0) return 'Not calculated'
  if (props.item.type === 'product')
    return formatIDR(totalCost.value) + '/' + (product.value?.baseUnit ?? '')
  return formatIDR(totalCost.value)
})

// Cost per unit (for recipes/preparations with output > 1 or weight-based)
const costPerUnit = computed<string | null>(() => {
  if (totalCost.value <= 0) return null
  if (props.item.type === 'recipe' && recipe.value) {
    const size = recipe.value.portionSize || 1
    const perUnit = Math.round(totalCost.value / size)
    return `${formatIDR(perUnit)}/${recipe.value.portionUnit}`
  }
  if (props.item.type === 'preparation' && preparation.value) {
    const qty = preparation.value.outputQuantity || 1
    const unit =
      preparation.value.portionType === 'portion' ? 'portion' : preparation.value.outputUnit
    const perUnit = Math.round(totalCost.value / qty)
    return `${formatIDR(perUnit)}/${getUnitShortName(unit)}`
  }
  return null
})

const recommendedPrice = computed(() =>
  totalCost.value > 0 ? Math.round(totalCost.value / 0.35) : 0
)

// Used In — reverse lookup
interface UsageItem {
  id: string
  name: string
  type: CatalogItem['type']
  typeLabel: string
  quantity?: number
  unit?: string
  isActive: boolean
}

const usedInItems = computed<UsageItem[]>(() => {
  const results: UsageItem[] = []
  const itemId = props.item.id
  const itemType = props.item.type

  // Products → used in preparations, recipes, menu items
  if (itemType === 'product') {
    for (const prep of recipesStore.preparations as Preparation[]) {
      const ing = prep.recipe?.find(i => i.type === 'product' && i.id === itemId)
      if (ing) {
        results.push({
          id: prep.id,
          name: prep.name,
          type: 'preparation',
          typeLabel: 'Prep',
          quantity: ing.quantity,
          unit: ing.unit,
          isActive: prep.isActive
        })
      }
    }
    for (const rec of recipesStore.recipes as Recipe[]) {
      const comp = rec.components?.find(
        c => c.componentType === 'product' && c.componentId === itemId
      )
      if (comp) {
        results.push({
          id: rec.id,
          name: rec.name,
          type: 'recipe',
          typeLabel: 'Recipe',
          quantity: comp.quantity,
          unit: comp.unit,
          isActive: rec.isActive
        })
      }
    }
    for (const mi of menuStore.menuItems as MenuItem[]) {
      for (const v of mi.variants ?? []) {
        const comp = v.composition?.find(c => c.type === 'product' && c.id === itemId)
        if (comp) {
          results.push({
            id: mi.id,
            name: mi.name,
            type: 'menu',
            typeLabel: 'Menu',
            quantity: comp.quantity,
            unit: comp.unit,
            isActive: mi.isActive
          })
          break
        }
      }
    }
  }

  // Preparations → used in other preps, recipes, menu items
  if (itemType === 'preparation') {
    for (const prep of recipesStore.preparations as Preparation[]) {
      if (prep.id === itemId) continue
      const ing = prep.recipe?.find(i => i.type === 'preparation' && i.id === itemId)
      if (ing) {
        results.push({
          id: prep.id,
          name: prep.name,
          type: 'preparation',
          typeLabel: 'Prep',
          quantity: ing.quantity,
          unit: ing.unit,
          isActive: prep.isActive
        })
      }
    }
    for (const rec of recipesStore.recipes as Recipe[]) {
      const comp = rec.components?.find(
        c => c.componentType === 'preparation' && c.componentId === itemId
      )
      if (comp) {
        results.push({
          id: rec.id,
          name: rec.name,
          type: 'recipe',
          typeLabel: 'Recipe',
          quantity: comp.quantity,
          unit: comp.unit,
          isActive: rec.isActive
        })
      }
    }
    for (const mi of menuStore.menuItems as MenuItem[]) {
      for (const v of mi.variants ?? []) {
        const comp = v.composition?.find(c => c.type === 'preparation' && c.id === itemId)
        if (comp) {
          results.push({
            id: mi.id,
            name: mi.name,
            type: 'menu',
            typeLabel: 'Menu',
            quantity: comp.quantity,
            unit: comp.unit,
            isActive: mi.isActive
          })
          break
        }
      }
    }
  }

  // Recipes → used in other recipes, menu items
  if (itemType === 'recipe') {
    for (const rec of recipesStore.recipes as Recipe[]) {
      if (rec.id === itemId) continue
      const comp = rec.components?.find(
        c => c.componentType === 'recipe' && c.componentId === itemId
      )
      if (comp) {
        results.push({
          id: rec.id,
          name: rec.name,
          type: 'recipe',
          typeLabel: 'Recipe',
          quantity: comp.quantity,
          unit: comp.unit,
          isActive: rec.isActive
        })
      }
    }
    for (const mi of menuStore.menuItems as MenuItem[]) {
      for (const v of mi.variants ?? []) {
        const comp = v.composition?.find(c => c.type === 'recipe' && c.id === itemId)
        if (comp) {
          results.push({
            id: mi.id,
            name: mi.name,
            type: 'menu',
            typeLabel: 'Menu',
            quantity: comp.quantity,
            unit: comp.unit,
            isActive: mi.isActive
          })
          break
        }
      }
    }
  }

  // Sort: active first, then alphabetically; inactive at the end
  results.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return results
})
</script>

<style scoped lang="scss">
.detail-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

.detail-title {
  flex: 1;
  min-width: 0;

  h2 {
    font-size: 1.15rem;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.detail-subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.subtitle-text {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tree-output-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  font-size: 0.85rem;
}

.tree-output-label {
  color: rgba(255, 255, 255, 0.5);
}

.tree-output-value {
  font-weight: 600;
}

.tree-output-sep {
  color: rgba(255, 255, 255, 0.2);
}

.tree-output-per-unit {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.8rem;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: rgba(255, 255, 255, 0.4);
}

// Info
.info-grid {
  display: flex;
  flex-direction: column;
}

:deep(.info-row) {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

:deep(.info-label) {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}

:deep(.info-value) {
  font-weight: 500;
  text-transform: capitalize;
}

// Cost
.cost-summary {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cost-line {
  display: flex;
  justify-content: space-between;

  &--highlight {
    padding: 6px 8px;
    margin: 4px -8px 0;
    background: rgba(var(--v-theme-warning), 0.1);
    border-radius: 6px;
    font-weight: 600;
  }
}

.cost-label {
  color: rgba(255, 255, 255, 0.6);
}

.cost-value {
  font-weight: 600;
}

.cost-breakdown {
  margin-top: 16px;

  h4 {
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
  }
}

.breakdown-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
}

.breakdown-badge {
  flex-shrink: 0;
  font-size: 0.6rem;
  font-weight: 700;
  min-width: 20px;
  height: 16px;
  padding: 0 3px;
}

.breakdown-name {
  white-space: nowrap;
  font-size: 0.9rem;
}

.breakdown-dots {
  flex: 1;
  border-bottom: 1px dotted rgba(255, 255, 255, 0.15);
  min-width: 12px;
  margin-bottom: 4px;
}

.breakdown-qty {
  white-space: nowrap;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.breakdown-cost {
  white-space: nowrap;
  font-weight: 500;
  min-width: 70px;
  text-align: right;
}

// Modifiers
.modifiers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modifier-group-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px;
}

.modifier-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.modifier-group-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.modifier-group-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.modifier-group-name {
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modifier-selection-range {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
}

.modifier-replaces {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  padding: 4px 0 8px;
  font-style: italic;
}

.modifier-replaces-cost {
  font-style: normal;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}

.modifier-option-cost--net {
  &.text-green {
    color: rgb(var(--v-theme-success));
  }
  &.text-red {
    color: rgb(var(--v-theme-error));
  }
}

.modifier-options {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
}

.modifier-option {
  &--inactive {
    opacity: 0.4;
  }
}

.modifier-option-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;

  &.clickable {
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 4px;
    }
  }
}

.expand-btn {
  flex-shrink: 0;
}

.expand-placeholder {
  width: 24px;
  flex-shrink: 0;
}

.modifier-option-name {
  font-size: 0.9rem;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.modifier-option-dots {
  flex: 1;
  border-bottom: 1px dotted rgba(255, 255, 255, 0.12);
  min-width: 12px;
  margin-bottom: 4px;
}

.modifier-option-price {
  white-space: nowrap;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.modifier-option-cost {
  white-space: nowrap;
  font-size: 0.85rem;
  font-weight: 500;
  min-width: 60px;
  text-align: right;
}

.modifier-option-tree {
  padding-left: 24px;
  padding-bottom: 4px;
}

// Used In
.usage-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.usage-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  &:active {
    background: rgba(255, 255, 255, 0.08);
  }

  &--inactive {
    opacity: 0.45;
  }
}

.usage-name {
  font-weight: 500;
  white-space: nowrap;
}

.usage-dots {
  flex: 1;
  border-bottom: 1px dotted rgba(255, 255, 255, 0.12);
  min-width: 12px;
  margin-bottom: 4px;
}

.usage-quantity {
  white-space: nowrap;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.usage-arrow {
  flex-shrink: 0;
  opacity: 0.3;
}
</style>
