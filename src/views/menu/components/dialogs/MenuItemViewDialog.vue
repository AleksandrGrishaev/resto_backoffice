<template>
  <v-dialog v-model="dialogModel" max-width="900" scrollable>
    <v-card v-if="item" class="menu-item-view-dialog">
      <!-- Header -->
      <v-card-title class="dialog-header">
        <div class="header-content">
          <div class="header-info">
            <h2 class="item-name">{{ item.name }}</h2>
            <div class="item-badges">
              <v-chip
                size="small"
                :color="item.type === 'food' ? 'success' : 'info'"
                variant="flat"
              >
                <v-icon
                  :icon="item.type === 'food' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'"
                  size="16"
                  class="mr-1"
                />
                {{ item.type === 'food' ? 'Kitchen' : 'Bar' }}
              </v-chip>
              <v-chip size="small" :color="getDishTypeColor(item.dishType)" variant="outlined">
                {{ getDishTypeLabel(item.dishType) }}
              </v-chip>
              <v-chip v-if="!item.isActive" size="small" color="grey" variant="flat">
                Inactive
              </v-chip>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="close" />
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="dialog-content">
        <!-- Category & Description -->
        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Category:</span>
            <span class="info-value">{{ categoryName }}</span>
          </div>
          <div v-if="item.description" class="info-row">
            <span class="info-label">Description:</span>
            <span class="info-value description">{{ item.description }}</span>
          </div>
        </div>

        <!-- Variants Section -->
        <div class="section">
          <h3 class="section-title">
            <v-icon icon="mdi-format-list-bulleted" size="20" class="mr-2" />
            Variants ({{ item.variants.length }})
          </h3>

          <div class="variants-list">
            <div
              v-for="(variant, vIdx) in sortedVariants"
              :key="variant.id"
              class="variant-card"
              :class="{ expanded: expandedVariant === vIdx }"
            >
              <div class="variant-header" @click="toggleVariant(vIdx)">
                <div class="variant-info">
                  <span class="variant-name">{{ variant.name || 'Standard' }}</span>
                  <div class="variant-meta">
                    <span v-if="variantCosts[vIdx]" class="cost-info">
                      Cost: {{ formatCurrency(variantCosts[vIdx].totalCost) }}
                    </span>
                    <!-- Show range for modifiable items, single value for simple items -->
                    <span
                      v-if="
                        variantCosts[vIdx] && variantCosts[vIdx].minFoodCostPercent !== undefined
                      "
                      class="food-cost"
                      :class="{ high: variantCosts[vIdx].maxFoodCostPercent > 35 }"
                    >
                      FC: {{ variantCosts[vIdx].minFoodCostPercent.toFixed(1) }}% -
                      {{ variantCosts[vIdx].maxFoodCostPercent.toFixed(1) }}%
                    </span>
                    <span
                      v-else-if="variantCosts[vIdx]"
                      class="food-cost"
                      :class="{ high: variantCosts[vIdx].foodCostPercent > 35 }"
                    >
                      FC: {{ variantCosts[vIdx].foodCostPercent.toFixed(1) }}%
                    </span>
                  </div>
                </div>
                <div class="variant-price">{{ formatCurrency(variant.price) }}</div>
                <v-icon
                  :icon="expandedVariant === vIdx ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  size="20"
                  class="ml-2"
                />
              </div>

              <v-expand-transition>
                <div v-if="expandedVariant === vIdx" class="variant-details">
                  <!-- Cost Summary -->
                  <div v-if="variantCosts[vIdx]" class="cost-summary">
                    <div class="cost-item">
                      <span class="cost-label">Price:</span>
                      <span class="cost-value price">{{ formatCurrency(variant.price) }}</span>
                    </div>
                    <div class="cost-item">
                      <span class="cost-label">Cost:</span>
                      <span class="cost-value">
                        {{ formatCurrency(variantCosts[vIdx].totalCost) }}
                      </span>
                    </div>
                    <div class="cost-item">
                      <span class="cost-label">Food Cost:</span>
                      <!-- Show range for modifiable items -->
                      <span
                        v-if="variantCosts[vIdx].minFoodCostPercent !== undefined"
                        class="cost-value"
                        :class="{ high: variantCosts[vIdx].maxFoodCostPercent > 35 }"
                      >
                        {{ variantCosts[vIdx].minFoodCostPercent.toFixed(1) }}% -
                        {{ variantCosts[vIdx].maxFoodCostPercent.toFixed(1) }}%
                      </span>
                      <!-- Show single value for simple items -->
                      <span
                        v-else
                        class="cost-value"
                        :class="{ high: variantCosts[vIdx].foodCostPercent > 35 }"
                      >
                        {{ variantCosts[vIdx].foodCostPercent.toFixed(1) }}%
                      </span>
                    </div>
                    <div class="cost-item">
                      <span class="cost-label">Margin:</span>
                      <span class="cost-value margin">
                        {{ formatCurrency(variant.price - variantCosts[vIdx].totalCost) }}
                      </span>
                    </div>
                  </div>

                  <!-- Composition -->
                  <div v-if="variant.composition?.length" class="composition-section">
                    <h4 class="subsection-title">Composition</h4>
                    <v-table density="compact" class="composition-table">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th v-if="hasRoles(variant)" class="text-center">Role</th>
                          <th class="text-center">Qty</th>
                          <th class="text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(comp, cIdx) in variant.composition" :key="cIdx">
                          <td>
                            <div class="comp-name">
                              <v-chip
                                size="x-small"
                                :color="getComponentColor(comp.type)"
                                variant="flat"
                                class="mr-2"
                              >
                                {{ getComponentTypeShort(comp.type) }}
                              </v-chip>
                              {{ getComponentName(comp) }}
                            </div>
                          </td>
                          <td v-if="hasRoles(variant)" class="text-center">
                            <v-chip v-if="comp.role" size="x-small" variant="outlined">
                              {{ getRoleLabel(comp.role) }}
                            </v-chip>
                          </td>
                          <td class="text-center">{{ comp.quantity }} {{ comp.unit }}</td>
                          <td class="text-right">
                            {{ formatCurrency(getComponentCost(comp, vIdx)) }}
                          </td>
                        </tr>
                      </tbody>
                    </v-table>
                  </div>

                  <div v-else class="no-composition">
                    <v-icon icon="mdi-information-outline" size="16" class="mr-1" />
                    No composition defined
                  </div>
                </div>
              </v-expand-transition>
            </div>
          </div>
        </div>

        <!-- Modifiers Section (if modifiable) -->
        <div v-if="item.dishType === 'modifiable' && item.modifierGroups?.length" class="section">
          <h3 class="section-title">
            <v-icon icon="mdi-puzzle-outline" size="20" class="mr-2" />
            Modifiers ({{ item.modifierGroups.length }})
          </h3>

          <div class="modifiers-list">
            <div v-for="(group, gIdx) in item.modifierGroups" :key="gIdx" class="modifier-group">
              <div class="modifier-header">
                <span class="modifier-name">{{ group.name }}</span>
                <div class="modifier-badges">
                  <v-chip size="x-small" :color="getModifierTypeColor(group.type)" variant="flat">
                    {{ group.type }}
                  </v-chip>
                  <v-chip v-if="group.isRequired" size="x-small" color="warning" variant="flat">
                    Required
                  </v-chip>
                </div>
              </div>
              <div class="modifier-options">
                <span
                  v-for="(opt, oIdx) in group.options"
                  :key="oIdx"
                  class="modifier-option"
                  :class="{ default: opt.isDefault }"
                >
                  {{ opt.name }}
                  <span v-if="opt.priceAdjustment !== 0" class="price-adj">
                    {{ opt.priceAdjustment > 0 ? '+' : ''
                    }}{{ formatCurrency(opt.priceAdjustment) }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="dialog-actions">
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="isExportingPdf || isExporting"
          prepend-icon="mdi-file-pdf-box"
          @click="openExportDialog"
        >
          Export PDF
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Export Options Dialog -->
    <MenuItemExportOptionsDialog
      v-model="showExportOptionsDialog"
      :item-name="item?.name || ''"
      :is-modifiable="isModifiable"
      :total-combinations="totalCombinationsCount"
      @export="handleExportWithOptions"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type {
  MenuItem,
  MenuItemVariant,
  MenuComposition,
  ModifierOption
} from '@/stores/menu/types'
import { calculateFoodCostRange, type FoodCostRange } from '@/core/cost/modifierCostCalculator'
import { useMenuStore } from '@/stores/menu'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import {
  useExport,
  generateCombinations,
  calculateTotalCombinations,
  calculateCombinationExport,
  getUniqueModifierOptions,
  buildAllModifierRecipes,
  buildUniqueRecipesWithPortions,
  buildVariantCompositionRecipes,
  getDefaultModifiersForVariant,
  buildModifiersDisplayName,
  MenuItemExportOptionsDialog
} from '@/core/export'
import type { MenuItemExportOptions } from '@/core/export'
import { exportService } from '@/core/export/ExportService'
import type {
  MenuItemExportData,
  MenuItemDetailExport,
  MenuItemVariantDetailExport,
  MenuItemCompositionExport,
  NestedComponentExport,
  ModifierGroupExport,
  CombinationsExportData,
  VariantCombinationGroup,
  VariantDefaultModifier,
  CombinationExport
} from '@/core/export/types'

interface VariantCost {
  totalCost: number
  foodCostPercent: number
  componentCosts: Map<number, number>
  // For modifiable items - food cost range
  minFoodCostPercent?: number
  maxFoodCostPercent?: number
  minCost?: number
  maxCost?: number
}

// Props & Emits
interface Props {
  modelValue: boolean
  item: MenuItem | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  item: null
})

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

// Stores
const menuStore = useMenuStore()
const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

// Export composable
const { exportMenuItem, exportMenuItemCombinations, isExporting } = useExport()

// State
const expandedVariant = ref<number | null>(0)
const variantCosts = ref<VariantCost[]>([])

// Export state
const showExportOptionsDialog = ref(false)
const isExportingPdf = ref(false)
const totalCombinationsCount = ref(0)

// Computed
const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const categoryName = computed(() => {
  if (!props.item) return ''
  const category = menuStore.categories.find(c => c.id === props.item!.categoryId)
  return category?.name || 'Unknown'
})

const sortedVariants = computed(() => {
  if (!props.item) return []
  return [...props.item.variants].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
})

// Methods
function close() {
  dialogModel.value = false
}

function toggleVariant(idx: number) {
  expandedVariant.value = expandedVariant.value === idx ? null : idx
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function getDishTypeLabel(type: string): string {
  return type === 'simple' ? 'Simple' : 'Customizable'
}

function getDishTypeColor(type: string): string {
  return type === 'simple' ? 'primary' : 'orange'
}

function getComponentColor(type: string): string {
  switch (type) {
    case 'product':
      return 'blue'
    case 'recipe':
      return 'green'
    case 'preparation':
      return 'orange'
    default:
      return 'grey'
  }
}

function getComponentTypeShort(type: string): string {
  switch (type) {
    case 'product':
      return 'P'
    case 'recipe':
      return 'R'
    case 'preparation':
      return 'S'
    default:
      return '?'
  }
}

function getComponentName(comp: MenuComposition): string {
  if (comp.type === 'product') {
    const product = productsStore.getProductById(comp.id)
    return product?.name || `Product ${comp.id}`
  } else if (comp.type === 'recipe') {
    const recipe = recipesStore.getRecipeById(comp.id)
    return recipe?.name || `Recipe ${comp.id}`
  } else if (comp.type === 'preparation') {
    const prep = recipesStore.getPreparationById(comp.id)
    return prep?.name || `Preparation ${comp.id}`
  }
  return comp.id
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    main: 'Main',
    garnish: 'Side',
    sauce: 'Sauce',
    addon: 'Add-on'
  }
  return labels[role] || role
}

function hasRoles(variant: MenuItemVariant): boolean {
  return variant.composition?.some(c => c.role) || false
}

function getModifierTypeColor(type: string): string {
  switch (type) {
    case 'replacement':
      return 'blue'
    case 'addon':
      return 'green'
    case 'removal':
      return 'red'
    default:
      return 'grey'
  }
}

function getComponentCost(comp: MenuComposition, variantIdx: number): number {
  const costs = variantCosts.value[variantIdx]
  if (!costs) return 0

  // Find the component in our calculated costs
  const compIndex = sortedVariants.value[variantIdx]?.composition?.findIndex(
    c => c.id === comp.id && c.type === comp.type
  )

  if (compIndex !== undefined && compIndex >= 0) {
    return costs.componentCosts.get(compIndex) || 0
  }
  return 0
}

// Calculate costs for all variants
async function calculateVariantCosts() {
  if (!props.item) return

  const costs: VariantCost[] = []

  for (const variant of sortedVariants.value) {
    let totalCost = 0
    const componentCosts = new Map<number, number>()

    if (variant.composition) {
      for (let i = 0; i < variant.composition.length; i++) {
        const comp = variant.composition[i]
        let compCost = 0

        const quantity = comp.quantity || 1

        if (comp.type === 'product') {
          const product = productsStore.getProductById(comp.id)
          if (product) {
            compCost = quantity * (product.baseCostPerUnit || 0)
          }
        } else if (comp.type === 'recipe') {
          // Use getRecipeCostCalculation (correct method name)
          const recipeCost = recipesStore.getRecipeCostCalculation(comp.id)
          if (recipeCost && recipeCost.costPerPortion > 0) {
            compCost = quantity * recipeCost.costPerPortion
          } else {
            // Fallback: get recipe and use costPerPortion or calculate from components
            const recipe = recipesStore.getRecipeById(comp.id)
            if (recipe?.costPerPortion && recipe.costPerPortion > 0) {
              compCost = quantity * recipe.costPerPortion
            } else if (recipe?.components) {
              // Calculate from recipe components
              let recipeTotalCost = 0
              for (const rc of recipe.components) {
                if (rc.componentType === 'product') {
                  const product = productsStore.getProductById(rc.componentId)
                  recipeTotalCost += rc.quantity * (product?.baseCostPerUnit || 0)
                } else if (rc.componentType === 'preparation') {
                  const prep = recipesStore.getPreparationById(rc.componentId)
                  const prepCostCalc = recipesStore.getPreparationCostCalculation(rc.componentId)
                  recipeTotalCost +=
                    rc.quantity *
                    (prepCostCalc?.costPerOutputUnit ||
                      prep?.lastKnownCost ||
                      prep?.costPerPortion ||
                      0)
                }
              }
              // Cost per portion = total cost / portion size
              const costPerPortion =
                recipe.portionSize > 0 ? recipeTotalCost / recipe.portionSize : recipeTotalCost
              compCost = quantity * costPerPortion
            }
          }
        } else if (comp.type === 'preparation') {
          // Use getPreparationCostCalculation (correct method name)
          const prepCost = recipesStore.getPreparationCostCalculation(comp.id)
          if (prepCost && prepCost.costPerOutputUnit > 0) {
            compCost = quantity * prepCost.costPerOutputUnit
          } else {
            // Fallback to lastKnownCost or costPerPortion
            const prep = recipesStore.getPreparationById(comp.id)
            if (prep?.lastKnownCost && prep.lastKnownCost > 0) {
              compCost = quantity * prep.lastKnownCost
            } else if (prep?.costPerPortion && prep.costPerPortion > 0) {
              compCost = quantity * prep.costPerPortion
            }
          }
        }

        componentCosts.set(i, compCost)
        totalCost += compCost
      }
    }

    const foodCostPercent = variant.price > 0 ? (totalCost / variant.price) * 100 : 0

    // For modifiable items, calculate min/max FC% range
    let minFoodCostPercent: number | undefined
    let maxFoodCostPercent: number | undefined
    let minCost: number | undefined
    let maxCost: number | undefined

    if (props.item?.dishType === 'modifiable' && props.item?.modifierGroups?.length) {
      const context = {
        productsStore,
        recipesStore
      }
      const foodCostRange = calculateFoodCostRange(variant, props.item, context)
      minFoodCostPercent = foodCostRange.minFoodCostPercent
      maxFoodCostPercent = foodCostRange.maxFoodCostPercent
      minCost = foodCostRange.minCost
      maxCost = foodCostRange.maxCost
    }

    costs.push({
      totalCost,
      foodCostPercent,
      componentCosts,
      minFoodCostPercent,
      maxFoodCostPercent,
      minCost,
      maxCost
    })
  }

  variantCosts.value = costs
}

// Build export data
function buildExportData(includeRecipeDetails: boolean = false): MenuItemExportData {
  const item = props.item!

  // Build variants with costs
  const variants: MenuItemVariantDetailExport[] = sortedVariants.value.map((variant, vIdx) => {
    const cost = variantCosts.value[vIdx]?.totalCost || 0
    const foodCostPercent = variantCosts.value[vIdx]?.foodCostPercent || 0

    // Build composition with names and costs
    const composition: MenuItemCompositionExport[] = (variant.composition || []).map(
      (comp, cIdx) => {
        const compCost = variantCosts.value[vIdx]?.componentCosts.get(cIdx) || 0
        const name = getComponentName(comp)

        let nestedComponents: NestedComponentExport[] | undefined

        // If includeRecipeDetails, get nested components for recipes/preparations
        if (includeRecipeDetails && (comp.type === 'recipe' || comp.type === 'preparation')) {
          nestedComponents = []

          if (comp.type === 'recipe') {
            const recipe = recipesStore.getRecipeById(comp.id)
            if (recipe?.components) {
              for (const rc of recipe.components) {
                let nestedName = ''
                let nestedCost = 0

                if (rc.componentType === 'product') {
                  const product = productsStore.getProductById(rc.componentId)
                  nestedName = product?.name || rc.componentId
                  nestedCost = rc.quantity * (product?.baseCostPerUnit || 0)
                } else if (rc.componentType === 'preparation') {
                  const prep = recipesStore.getPreparationById(rc.componentId)
                  nestedName = prep?.name || rc.componentId
                  const prepCost = recipesStore.getPreparationCostCalculation(rc.componentId)
                  nestedCost =
                    rc.quantity *
                    (prepCost?.costPerOutputUnit ||
                      prep?.lastKnownCost ||
                      prep?.costPerPortion ||
                      0)
                }

                nestedComponents.push({
                  name: nestedName,
                  type: rc.componentType as 'product' | 'preparation',
                  quantity: rc.quantity,
                  unit: rc.unit,
                  cost: nestedCost
                })
              }
            }
          } else if (comp.type === 'preparation') {
            const prep = recipesStore.getPreparationById(comp.id)
            if (prep?.recipe) {
              for (const pi of prep.recipe) {
                let nestedName = ''
                let nestedCost = 0

                if (pi.type === 'product') {
                  const product = productsStore.getProductById(pi.id)
                  nestedName = product?.name || pi.id
                  nestedCost = pi.quantity * (product?.baseCostPerUnit || 0)
                } else if (pi.type === 'preparation') {
                  const nestedPrep = recipesStore.getPreparationById(pi.id)
                  nestedName = nestedPrep?.name || pi.id
                  const nestedPrepCost = recipesStore.getPreparationCostCalculation(pi.id)
                  nestedCost =
                    pi.quantity *
                    (nestedPrepCost?.costPerOutputUnit ||
                      nestedPrep?.lastKnownCost ||
                      nestedPrep?.costPerPortion ||
                      0)
                }

                nestedComponents.push({
                  name: nestedName,
                  type: pi.type as 'product' | 'preparation',
                  quantity: pi.quantity,
                  unit: pi.unit,
                  cost: nestedCost
                })
              }
            }
          }
        }

        return {
          name,
          type: comp.type,
          quantity: comp.quantity || 1,
          unit: comp.unit || 'portion',
          cost: compCost,
          role: comp.role,
          nestedComponents: nestedComponents?.length ? nestedComponents : undefined
        }
      }
    )

    return {
      name: variant.name || 'Standard',
      price: variant.price,
      cost,
      foodCostPercent,
      margin: variant.price - cost,
      composition
    }
  })

  // Build modifier groups
  const modifierGroups: ModifierGroupExport[] | undefined = item.modifierGroups?.map(group => ({
    name: group.name,
    type: group.type,
    isRequired: group.isRequired,
    options: group.options.map(opt => ({
      name: opt.name,
      priceAdjustment: opt.priceAdjustment,
      isDefault: opt.isDefault
    }))
  }))

  const itemDetail: MenuItemDetailExport = {
    name: item.name,
    category: categoryName.value,
    department: item.department,
    dishType: item.dishType,
    description: item.description,
    variants,
    modifierGroups
  }

  return {
    title: item.name,
    date: exportService.formatDate(),
    item: itemDetail,
    includeRecipes: includeRecipeDetails
  }
}

// =============================================
// Export
// =============================================

/**
 * Check if item is modifiable (has modifier groups)
 */
const isModifiable = computed(() => {
  return (
    props.item?.dishType === 'modifiable' &&
    props.item?.modifierGroups &&
    props.item.modifierGroups.length > 0
  )
})

/**
 * Calculate total number of possible combinations
 */
function updateTotalCombinations() {
  if (!props.item || !isModifiable.value) {
    totalCombinationsCount.value = 0
    return
  }

  totalCombinationsCount.value = calculateTotalCombinations(
    props.item.variants,
    props.item.modifierGroups || []
  )
}

/**
 * Open export options dialog
 */
function openExportDialog() {
  updateTotalCombinations()
  showExportOptionsDialog.value = true
}

/**
 * Handle export with selected options
 */
async function handleExportWithOptions(options: MenuItemExportOptions) {
  if (!props.item) return

  isExportingPdf.value = true
  try {
    if (isModifiable.value) {
      // Export with combinations for modifiable items
      const data = buildCombinationsExportData(
        options.includeAllCombinations,
        options.includeRecipes
      )
      await exportMenuItemCombinations(data, {
        includeAllCombinations: options.includeAllCombinations,
        maxCombinations: options.includeAllCombinations ? undefined : 10
      })
    } else {
      // Export simple item
      const data = buildExportData(options.includeRecipes)
      await exportMenuItem(data)
    }
  } catch (error) {
    console.error('Export failed:', error)
  } finally {
    isExportingPdf.value = false
  }
}

/**
 * Build export data for combinations
 */
function buildCombinationsExportData(
  includeAllCombinations: boolean = false,
  includeRecipes: boolean = false
): CombinationsExportData {
  const item = props.item!
  const maxCombinations = includeAllCombinations ? undefined : 10

  // Determine if this is summary mode (default modifiers only) or full mode
  const isSummaryMode = !includeAllCombinations

  // Generate combinations
  const combinations = generateCombinations(item.variants, item.modifierGroups || [], {
    maxCombinations,
    includeAll: includeAllCombinations
  })

  // Create cost calculation context
  const costContext = {
    productsStore,
    recipesStore
  }

  // Calculate costs for each combination
  const combinationExports = combinations.map(combo =>
    calculateCombinationExport(combo, costContext)
  )

  // Get unique modifier options
  const uniqueOptions = getUniqueModifierOptions(combinations)

  // Build modifier recipes (legacy format)
  const modifierRecipes = buildAllModifierRecipes(uniqueOptions, costContext)

  // Build unique recipes with portion columns (new format)
  // Include both variant composition recipes AND modifier recipes
  let uniqueRecipes = undefined
  if (includeRecipes) {
    // Build modifier recipes
    const modifierUniqueRecipes = buildUniqueRecipesWithPortions(uniqueOptions, costContext)
    // Mark them as from modifiers
    modifierUniqueRecipes.forEach(r => (r.source = 'modifier'))

    // Build variant composition recipes (main dish ingredients)
    const variantRecipes = buildVariantCompositionRecipes(item.variants, costContext)

    // Combine and deduplicate (prefer variant recipes if same recipeId)
    const recipeMap = new Map<string, (typeof modifierUniqueRecipes)[0]>()
    for (const recipe of variantRecipes) {
      recipeMap.set(recipe.recipeId, recipe)
    }
    for (const recipe of modifierUniqueRecipes) {
      if (!recipeMap.has(recipe.recipeId)) {
        recipeMap.set(recipe.recipeId, recipe)
      }
    }

    uniqueRecipes = Array.from(recipeMap.values()).sort((a, b) => {
      // Sort: variant recipes first, then by name
      if (a.source !== b.source) {
        return a.source === 'variant' ? -1 : 1
      }
      return a.recipeName.localeCompare(b.recipeName)
    })
  }

  // Helper: calculate modifier option cost
  function calculateModifierOptionCost(option: ModifierOption, portionMultiplier: number): number {
    let cost = 0
    if (option.composition && option.composition.length > 0) {
      for (const comp of option.composition) {
        const quantity = comp.quantity || 1
        let unitCost = 0

        if (comp.type === 'product') {
          const product = productsStore.getProductById(comp.id)
          unitCost = product?.baseCostPerUnit || 0
        } else if (comp.type === 'recipe') {
          const recipeCost = recipesStore.getRecipeCostCalculation(comp.id)
          if (recipeCost && recipeCost.costPerPortion > 0) {
            unitCost = recipeCost.costPerPortion
          } else {
            const recipe = recipesStore.getRecipeById(comp.id)
            unitCost = recipe?.costPerPortion || 0
          }
        } else if (comp.type === 'preparation') {
          const prep = recipesStore.getPreparationById(comp.id)
          const prepCost = recipesStore.getPreparationCostCalculation(comp.id)
          unitCost = prepCost?.costPerOutputUnit || prep?.lastKnownCost || prep?.costPerPortion || 0
        }

        cost += quantity * unitCost * portionMultiplier
      }
    }
    return cost
  }

  // Helper: calculate min/max food cost for a variant based on all modifier options
  function calculateVariantFoodCostRange(variant: MenuItemVariant, baseCost: number) {
    const modifierGroups = item.modifierGroups || []
    const portionMultiplier = variant.portionMultiplier || 1

    let minModifierCost = 0
    let maxModifierCost = 0

    for (const group of modifierGroups) {
      if (!group.isRequired) continue

      const activeOptions = group.options.filter(opt => opt.isActive !== false)
      if (activeOptions.length === 0) continue

      // Calculate costs for all options in this group
      const optionCosts = activeOptions.map(opt =>
        calculateModifierOptionCost(opt, portionMultiplier)
      )

      minModifierCost += Math.min(...optionCosts)
      maxModifierCost += Math.max(...optionCosts)
    }

    const minTotalCost = baseCost + minModifierCost
    const maxTotalCost = baseCost + maxModifierCost
    const price = variant.price

    return {
      minCost: minTotalCost,
      maxCost: maxTotalCost,
      minFoodCostPercent: price > 0 ? (minTotalCost / price) * 100 : 0,
      maxFoodCostPercent: price > 0 ? (maxTotalCost / price) * 100 : 0
    }
  }

  // Build variant groups for new structured view
  const variantGroups: VariantCombinationGroup[] = sortedVariants.value.map((variant, vIdx) => {
    const variantBaseCost = variantCosts.value[vIdx]?.totalCost || 0

    // Calculate min/max food cost range for this variant (from ALL possible modifier combinations)
    const foodCostRange = calculateVariantFoodCostRange(variant, variantBaseCost)

    // Get combinations for this variant
    const variantCombos = combinationExports.filter(
      c => c.variantName === (variant.name || 'Standard')
    )

    // For summary mode: build default modifiers list
    let defaultModifiers: VariantDefaultModifier[] | undefined
    let defaultCombination: CombinationExport | undefined

    if (isSummaryMode) {
      // Get default modifiers from required groups
      const defaultModifierInfos = getDefaultModifiersForVariant(item.modifierGroups || [])

      defaultModifiers = defaultModifierInfos.map(dm => {
        // Calculate cost for this modifier option
        let modifierCost = 0
        const portionMultiplier = variant.portionMultiplier || 1

        if (dm.option.composition && dm.option.composition.length > 0) {
          for (const comp of dm.option.composition) {
            const quantity = comp.quantity || 1
            let unitCost = 0

            if (comp.type === 'product') {
              const product = productsStore.getProductById(comp.id)
              unitCost = product?.baseCostPerUnit || 0
            } else if (comp.type === 'recipe') {
              // Use pre-calculated recipe cost
              const recipeCost = recipesStore.getRecipeCostCalculation(comp.id)
              if (recipeCost && recipeCost.costPerPortion > 0) {
                unitCost = recipeCost.costPerPortion
              } else {
                // Fallback to stored field
                const recipe = recipesStore.getRecipeById(comp.id)
                unitCost = recipe?.costPerPortion || 0
              }
            } else if (comp.type === 'preparation') {
              const prep = recipesStore.getPreparationById(comp.id)
              const prepCost = recipesStore.getPreparationCostCalculation(comp.id)
              unitCost =
                prepCost?.costPerOutputUnit || prep?.lastKnownCost || prep?.costPerPortion || 0
            }

            modifierCost += quantity * unitCost * portionMultiplier
          }
        }

        // Get portion size from first composition item
        const portionSize = dm.option.composition?.[0]?.quantity || 1

        return {
          groupName: dm.groupName,
          modifierName: dm.modifierName,
          portionSize: portionSize * portionMultiplier,
          cost: modifierCost
        }
      })

      // Build default combination for this variant
      const totalModifierCost = defaultModifiers.reduce((sum, dm) => sum + dm.cost, 0)
      const totalCost = variantBaseCost + totalModifierCost
      const totalPrice = variant.price // Default modifiers have 0 price adjustment

      defaultCombination = {
        variantName: variant.name || 'Standard',
        displayName: buildModifiersDisplayName(
          defaultModifierInfos.map(dm => ({
            group: item.modifierGroups!.find(g => g.id === dm.groupId)!,
            option: dm.option
          }))
        ),
        price: totalPrice,
        cost: totalCost,
        foodCostPercent: totalPrice > 0 ? (totalCost / totalPrice) * 100 : 0,
        margin: totalPrice - totalCost
      }
    }

    return {
      variantName: variant.name || 'Standard',
      variantPrice: variant.price,
      variantBaseCost,
      // Theoretical min/max from ALL modifier options (not just exported combinations)
      minFoodCostPercent: foodCostRange.minFoodCostPercent,
      maxFoodCostPercent: foodCostRange.maxFoodCostPercent,
      minCost: foodCostRange.minCost,
      maxCost: foodCostRange.maxCost,
      defaultCombination,
      defaultModifiers,
      combinations: variantCombos
    }
  })

  // Build item detail for export
  const itemDetail: MenuItemDetailExport = {
    name: item.name,
    category: categoryName.value,
    department: item.department,
    dishType: item.dishType,
    description: item.description,
    variants: sortedVariants.value.map((variant, vIdx) => ({
      name: variant.name || 'Standard',
      price: variant.price,
      cost: variantCosts.value[vIdx]?.totalCost || 0,
      foodCostPercent: variantCosts.value[vIdx]?.foodCostPercent || 0,
      margin: variant.price - (variantCosts.value[vIdx]?.totalCost || 0),
      composition: []
    }))
  }

  // Calculate total combinations count
  const totalCount = calculateTotalCombinations(item.variants, item.modifierGroups || [])

  return {
    title: item.name,
    date: exportService.formatDate(),
    item: itemDetail,
    variantGroups,
    combinations: combinationExports,
    modifierRecipes,
    uniqueRecipes,
    totalCombinationsCount: totalCount,
    isLimited: !includeAllCombinations && combinationExports.length < totalCount,
    isSummaryMode
  }
}

// Watch for item changes
watch(
  () => props.item,
  async newItem => {
    if (newItem) {
      expandedVariant.value = 0
      await calculateVariantCosts()
    }
  },
  { immediate: true }
)

// Watch for dialog open
watch(
  () => props.modelValue,
  async isOpen => {
    if (isOpen && props.item) {
      await calculateVariantCosts()
    }
  }
)
</script>

<style lang="scss" scoped>
.menu-item-view-dialog {
  max-height: 90vh;
}

.dialog-header {
  padding: 16px 20px;
  background: var(--v-theme-surface);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.header-info {
  flex: 1;
}

.item-name {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.item-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dialog-content {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.info-section {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
}

.info-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }
}

.info-label {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
  min-width: 80px;
}

.info-value {
  color: rgba(var(--v-theme-on-surface), 1);

  &.description {
    font-style: italic;
    color: rgba(var(--v-theme-on-surface), 0.8);
  }
}

.section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.3);
}

.variants-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.variant-card {
  border: 1px solid rgba(var(--v-theme-outline), 0.3);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;

  &.expanded {
    border-color: rgba(var(--v-theme-primary), 0.5);
  }
}

.variant-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  background: rgba(var(--v-theme-surface-variant), 0.2);
  transition: background 0.2s ease;

  &:hover {
    background: rgba(var(--v-theme-surface-variant), 0.4);
  }
}

.variant-info {
  flex: 1;
}

.variant-name {
  font-weight: 500;
  font-size: 0.95rem;
}

.variant-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.cost-info {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.food-cost {
  &.high {
    color: rgb(var(--v-theme-error));
    font-weight: 500;
  }
}

.variant-price {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.variant-details {
  padding: 16px;
  border-top: 1px solid rgba(var(--v-theme-outline), 0.2);
  background: rgba(var(--v-theme-surface), 1);
}

.cost-summary {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 6px;
}

.cost-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cost-label {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.cost-value {
  font-weight: 600;
  font-size: 0.9rem;

  &.price {
    color: rgb(var(--v-theme-primary));
  }

  &.margin {
    color: rgb(var(--v-theme-success));
  }

  &.high {
    color: rgb(var(--v-theme-error));
  }
}

.subsection-title {
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.composition-table {
  font-size: 0.85rem;

  th {
    font-weight: 500;
    background: rgba(var(--v-theme-surface-variant), 0.3) !important;
  }
}

.comp-name {
  display: flex;
  align-items: center;
}

.no-composition {
  padding: 16px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-style: italic;
}

.modifiers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modifier-group {
  padding: 12px 16px;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 6px;
}

.modifier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.modifier-name {
  font-weight: 500;
}

.modifier-badges {
  display: flex;
  gap: 6px;
}

.modifier-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modifier-option {
  padding: 4px 10px;
  background: rgba(var(--v-theme-surface-variant), 0.4);
  border-radius: 4px;
  font-size: 0.85rem;

  &.default {
    background: rgba(var(--v-theme-primary), 0.1);
    border: 1px solid rgba(var(--v-theme-primary), 0.3);
  }
}

.price-adj {
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  margin-left: 4px;
}

.dialog-actions {
  padding: 12px 20px;
  gap: 8px;
}
</style>
