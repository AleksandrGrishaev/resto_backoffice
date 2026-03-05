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

    <!-- Tabs -->
    <v-tabs v-model="activeTab" density="compact" color="primary">
      <v-tab value="tree">Tree</v-tab>
      <v-tab value="info">Info</v-tab>
      <v-tab value="cost">Cost</v-tab>
      <v-tab value="used-in">Used In</v-tab>
    </v-tabs>

    <!-- Tab content -->
    <div class="detail-content">
      <!-- Tree Tab -->
      <div v-if="activeTab === 'tree'" class="tab-content">
        <DependencyTree
          v-if="treeNodes.length > 0"
          :tree="treeNodes"
          :default-expand-depth="2"
          @navigate="handleTreeNavigate"
          @edit="target => emit('edit', target)"
        />
        <div v-else class="empty-state">No components</div>
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
              :value="`${preparation.outputQuantity} ${preparation.outputUnit}`"
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
          <div class="cost-line">
            <span class="cost-label">Total Cost</span>
            <span class="cost-value">{{ totalCostDisplay }}</span>
          </div>
          <div v-if="recommendedPrice > 0" class="cost-line">
            <span class="cost-label">Rec. Price (35% FC)</span>
            <span class="cost-value">{{ formatIDR(recommendedPrice) }}</span>
          </div>
          <div v-if="totalCost > 0 && recommendedPrice > 0" class="cost-line">
            <span class="cost-label">Food Cost %</span>
            <span class="cost-value">35%</span>
          </div>
        </div>

        <!-- Cost breakdown from tree -->
        <div v-if="treeNodes.length > 0" class="cost-breakdown">
          <h4>Cost Breakdown</h4>
          <div v-for="node in treeNodes" :key="node.id + node.type" class="breakdown-row">
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
            @click="emit('navigate', { id: usage.id, type: usage.type })"
          >
            <v-chip :color="typeColorFor(usage.type)" size="x-small" variant="flat" label>
              {{ usage.typeLabel }}
            </v-chip>
            <span class="usage-name">{{ usage.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useMenuStore } from '@/stores/menu'
import { formatIDR } from '@/utils'
import { useCatalogData } from '../composables/useCatalogData'
import type { CatalogItem } from '../composables/useCatalogData'
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
const { buildTree } = useCatalogData()

const activeTab = ref('tree')

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

function handleTreeNavigate(target: { id: string; type: TreeNode['type'] }) {
  emit('navigate', target)
}

// Cost
const totalCost = computed(() => {
  if (props.item.type === 'product') return product.value?.baseCostPerUnit ?? 0
  return treeNodes.value.reduce((sum, n) => sum + (n.cost ?? 0), 0)
})

const totalCostDisplay = computed(() => {
  if (totalCost.value <= 0) return 'Not calculated'
  if (props.item.type === 'product')
    return formatIDR(totalCost.value) + '/' + (product.value?.baseUnit ?? '')
  return formatIDR(totalCost.value) + '/portion'
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
}

const usedInItems = computed<UsageItem[]>(() => {
  const results: UsageItem[] = []
  const itemId = props.item.id
  const itemType = props.item.type

  // Products → used in preparations, recipes, menu items
  if (itemType === 'product') {
    for (const prep of recipesStore.preparations as Preparation[]) {
      if (prep.recipe?.some(ing => ing.type === 'product' && ing.id === itemId)) {
        results.push({ id: prep.id, name: prep.name, type: 'preparation', typeLabel: 'Prep' })
      }
    }
    for (const rec of recipesStore.recipes as Recipe[]) {
      if (rec.components?.some(c => c.componentType === 'product' && c.componentId === itemId)) {
        results.push({ id: rec.id, name: rec.name, type: 'recipe', typeLabel: 'Recipe' })
      }
    }
    for (const mi of menuStore.menuItems as MenuItem[]) {
      if (
        mi.variants?.some(v => v.composition?.some(c => c.type === 'product' && c.id === itemId))
      ) {
        results.push({ id: mi.id, name: mi.name, type: 'menu', typeLabel: 'Menu' })
      }
    }
  }

  // Preparations → used in other preps, recipes, menu items
  if (itemType === 'preparation') {
    for (const prep of recipesStore.preparations as Preparation[]) {
      if (
        prep.id !== itemId &&
        prep.recipe?.some(ing => ing.type === 'preparation' && ing.id === itemId)
      ) {
        results.push({ id: prep.id, name: prep.name, type: 'preparation', typeLabel: 'Prep' })
      }
    }
    for (const rec of recipesStore.recipes as Recipe[]) {
      if (
        rec.components?.some(c => c.componentType === 'preparation' && c.componentId === itemId)
      ) {
        results.push({ id: rec.id, name: rec.name, type: 'recipe', typeLabel: 'Recipe' })
      }
    }
    for (const mi of menuStore.menuItems as MenuItem[]) {
      if (
        mi.variants?.some(v =>
          v.composition?.some(c => c.type === 'preparation' && c.id === itemId)
        )
      ) {
        results.push({ id: mi.id, name: mi.name, type: 'menu', typeLabel: 'Menu' })
      }
    }
  }

  // Recipes → used in other recipes, menu items
  if (itemType === 'recipe') {
    for (const rec of recipesStore.recipes as Recipe[]) {
      if (
        rec.id !== itemId &&
        rec.components?.some(c => c.componentType === 'recipe' && c.componentId === itemId)
      ) {
        results.push({ id: rec.id, name: rec.name, type: 'recipe', typeLabel: 'Recipe' })
      }
    }
    for (const mi of menuStore.menuItems as MenuItem[]) {
      if (
        mi.variants?.some(v => v.composition?.some(c => c.type === 'recipe' && c.id === itemId))
      ) {
        results.push({ id: mi.id, name: mi.name, type: 'menu', typeLabel: 'Menu' })
      }
    }
  }

  // Menu items → not used in anything else
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
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  cursor: pointer;

  &:active {
    background: rgba(255, 255, 255, 0.08);
  }
}

.usage-name {
  font-weight: 500;
}
</style>
