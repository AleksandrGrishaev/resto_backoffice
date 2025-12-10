<script setup lang="ts">
/**
 * Combinations Export Template
 * Shows all modifier combinations with costs and unique modifier recipes with portion columns
 * Supports two modes:
 * - Summary mode: Each variant with default modifiers only
 * - Full mode: All combinations grouped by variant
 */

import { computed } from 'vue'
import type {
  CombinationsExportData,
  ExportOptions,
  UniqueModifierRecipeExport,
  VariantCombinationGroup
} from '../types'
import { exportService } from '../ExportService'
import ExportLayout from './ExportLayout.vue'

const props = defineProps<{
  data: CombinationsExportData
  options?: ExportOptions
}>()

const item = computed(() => props.data.item)
const combinations = computed(() => props.data.combinations)
const uniqueRecipes = computed(() => props.data.uniqueRecipes || [])
const variantGroups = computed(() => props.data.variantGroups || [])
const isSummaryMode = computed(() => props.data.isSummaryMode ?? false)

// Get min-max food cost summary by variant (uses pre-calculated values from ALL modifier options)
const variantFoodCostSummary = computed(() => {
  const summary: Array<{
    variantName: string
    price: number
    minFoodCost: number
    maxFoodCost: number
    minPercent: number
    maxPercent: number
  }> = []

  for (const group of variantGroups.value) {
    // Use pre-calculated min/max from ALL possible modifier combinations
    // This ensures accurate range even when combinations are limited for export
    summary.push({
      variantName: group.variantName,
      price: group.variantPrice,
      minFoodCost: group.minCost,
      maxFoodCost: group.maxCost,
      minPercent: group.minFoodCostPercent,
      maxPercent: group.maxFoodCostPercent
    })
  }

  return summary
})

function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return exportService.formatCurrency(0)
  }
  return exportService.formatCurrency(amount)
}

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return exportService.formatPercent(0)
  }
  return exportService.formatPercent(value)
}

function formatNumber(num: number | undefined | null): string {
  // Defensive check for undefined/null/NaN values
  if (num === undefined || num === null || isNaN(num)) {
    return '0'
  }
  // Format with max 2 decimal places, remove trailing zeros
  return Number(num.toFixed(2)).toString()
}

function getDepartmentLabel(dept: 'kitchen' | 'bar'): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function getDishTypeLabel(type: 'simple' | 'modifiable'): string {
  return type === 'simple' ? 'Simple Dish' : 'Customizable Dish'
}

function getRecipeTypeLabel(type: string): string {
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

function getComponentTypeLabel(type: string): string {
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

// Check if recipe yield is weight/volume based (should show as portion, not grams)
function isWeightBasedYield(recipe: UniqueModifierRecipeExport): boolean {
  const weightVolumeUnits = [
    'gram',
    'g',
    'kilogram',
    'kg',
    'milliliter',
    'ml',
    'liter',
    'l',
    'ounce',
    'oz',
    'pound',
    'lb'
  ]
  return weightVolumeUnits.includes((recipe.yield?.unit || '').toLowerCase())
}

/**
 * Extract modifiers from display name by removing variant prefix
 * "No Ice + Banana (0.33) + Dragon" -> "Banana (0.33) + Dragon"
 */
function getModifiersFromDisplay(displayName: string): string {
  // The display name format is "VariantName + Modifier1 + Modifier2 + ..."
  const parts = displayName.split(' + ')
  if (parts.length > 1) {
    // Skip the first part (variant name) and return the rest
    return parts.slice(1).join(' + ')
  }
  return displayName
}

/**
 * Check if any ingredient in the recipe has raw quantity (yield adjustment)
 */
function hasRawQuantity(recipe: UniqueModifierRecipeExport): boolean {
  return recipe.ingredients.some(ing => ing.rawQuantityPerYield !== undefined)
}
</script>

<template>
  <ExportLayout :title="data.title" :date="data.date">
    <!-- Item Header -->
    <div class="item-header">
      <div class="item-meta">
        <span class="meta-item">
          <strong>Category:</strong>
          {{ item.category }}
        </span>
        <span class="meta-item">
          <strong>Department:</strong>
          {{ getDepartmentLabel(item.department) }}
        </span>
        <span class="meta-item">
          <strong>Type:</strong>
          {{ getDishTypeLabel(item.dishType) }}
        </span>
      </div>
      <p v-if="item.description" class="item-description">{{ item.description }}</p>
    </div>

    <!-- Food Cost Summary by Variant -->
    <div v-if="variantFoodCostSummary.length > 0" class="food-cost-summary">
      <h2 class="summary-title">Food Cost Summary</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th class="col-variant">Variant</th>
            <th class="col-price">Price</th>
            <th class="col-min">Min FC%</th>
            <th class="col-max">Max FC%</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, idx) in variantFoodCostSummary" :key="idx">
            <td class="col-variant">{{ s.variantName }}</td>
            <td class="col-price">{{ formatCurrency(s.price) }}</td>
            <td class="col-min">
              <span class="fc-value" :class="{ 'high-cost': s.minPercent > 35 }">
                {{ formatPercent(s.minPercent) }}
              </span>
              <span class="fc-cost">({{ formatCurrency(s.minFoodCost) }})</span>
            </td>
            <td class="col-max">
              <span class="fc-value" :class="{ 'high-cost': s.maxPercent > 35 }">
                {{ formatPercent(s.maxPercent) }}
              </span>
              <span class="fc-cost">({{ formatCurrency(s.maxFoodCost) }})</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Top Modifier Combinations (Min FC%, Max FC%, Default) -->
    <div
      v-if="isSummaryMode && variantGroups.some(g => g.minCombination || g.maxCombination)"
      class="top-combinations-section"
    >
      <h2 class="combinations-title">Modifier Combinations Analysis</h2>
      <table class="top-combinations-table">
        <thead>
          <tr>
            <th class="col-type">Scenario</th>
            <th class="col-combo-name">Modifiers</th>
            <th class="col-combo-price">Price</th>
            <th class="col-combo-cost">Cost</th>
            <th class="col-combo-fc">FC%</th>
            <th class="col-combo-margin">Margin</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(variantGroup, vIdx) in variantGroups" :key="vIdx">
            <!-- Variant Name Header (if multiple variants) -->
            <tr v-if="variantGroups.length > 1" class="variant-header-row">
              <td colspan="6" class="variant-header-cell">{{ variantGroup.variantName }}</td>
            </tr>
            <!-- Min FC% Combination -->
            <tr v-if="variantGroup.minCombination" class="combo-row min-row">
              <td class="col-type">
                <span class="combo-badge min-badge">Min FC%</span>
              </td>
              <td class="col-combo-name">
                {{ variantGroup.minCombination.displayName || 'Default' }}
              </td>
              <td class="col-combo-price">
                {{ formatCurrency(variantGroup.minCombination.price) }}
              </td>
              <td class="col-combo-cost">{{ formatCurrency(variantGroup.minCombination.cost) }}</td>
              <td
                class="col-combo-fc"
                :class="{ 'high-cost': variantGroup.minCombination.foodCostPercent > 35 }"
              >
                {{ formatPercent(variantGroup.minCombination.foodCostPercent) }}
              </td>
              <td class="col-combo-margin margin-positive">
                {{ formatCurrency(variantGroup.minCombination.margin) }}
              </td>
            </tr>
            <!-- Max FC% Combination -->
            <tr v-if="variantGroup.maxCombination" class="combo-row max-row">
              <td class="col-type">
                <span class="combo-badge max-badge">Max FC%</span>
              </td>
              <td class="col-combo-name">
                {{ variantGroup.maxCombination.displayName || 'Default' }}
              </td>
              <td class="col-combo-price">
                {{ formatCurrency(variantGroup.maxCombination.price) }}
              </td>
              <td class="col-combo-cost">{{ formatCurrency(variantGroup.maxCombination.cost) }}</td>
              <td
                class="col-combo-fc"
                :class="{ 'high-cost': variantGroup.maxCombination.foodCostPercent > 35 }"
              >
                {{ formatPercent(variantGroup.maxCombination.foodCostPercent) }}
              </td>
              <td class="col-combo-margin margin-positive">
                {{ formatCurrency(variantGroup.maxCombination.margin) }}
              </td>
            </tr>
            <!-- Default Combination -->
            <tr v-if="variantGroup.defaultCombination" class="combo-row default-row">
              <td class="col-type">
                <span class="combo-badge default-badge">Default</span>
              </td>
              <td class="col-combo-name">
                {{ variantGroup.defaultCombination.displayName || 'Default' }}
              </td>
              <td class="col-combo-price">
                {{ formatCurrency(variantGroup.defaultCombination.price) }}
              </td>
              <td class="col-combo-cost">
                {{ formatCurrency(variantGroup.defaultCombination.cost) }}
              </td>
              <td
                class="col-combo-fc"
                :class="{ 'high-cost': variantGroup.defaultCombination.foodCostPercent > 35 }"
              >
                {{ formatPercent(variantGroup.defaultCombination.foodCostPercent) }}
              </td>
              <td class="col-combo-margin margin-positive">
                {{ formatCurrency(variantGroup.defaultCombination.margin) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Warning if combinations are limited -->
    <div v-if="data.isLimited && !isSummaryMode" class="combinations-warning">
      <span class="warning-icon">&#9888;</span>
      Showing {{ combinations.length }} of {{ data.totalCombinationsCount }} combinations. Export
      with "All combinations" option to see all.
    </div>

    <!-- Summary Mode: Variant Sections with Default Modifiers -->
    <div v-if="isSummaryMode" class="combinations-section">
      <h2 class="section-title">Variants Summary (Default Modifiers)</h2>

      <div v-for="(variantGroup, vIdx) in variantGroups" :key="vIdx" class="variant-section">
        <!-- Variant Header -->
        <div class="variant-header-box">
          <h3 class="variant-title">{{ variantGroup.variantName }}</h3>
          <div class="variant-price-info">
            <span class="variant-price">{{ formatCurrency(variantGroup.variantPrice) }}</span>
          </div>
        </div>

        <!-- Base Cost -->
        <div class="variant-base-cost">
          <span class="base-label">Base Cost (Composition):</span>
          <span class="base-value">{{ formatCurrency(variantGroup.variantBaseCost) }}</span>
        </div>

        <!-- Default Modifiers Table -->
        <table
          v-if="variantGroup.defaultModifiers && variantGroup.defaultModifiers.length > 0"
          class="default-modifiers-table"
        >
          <thead>
            <tr>
              <th class="col-group">Modifier Group</th>
              <th class="col-modifier">Default Modifier</th>
              <th class="col-portion">Portion</th>
              <th class="col-cost">Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(dm, dmIdx) in variantGroup.defaultModifiers"
              :key="dmIdx"
              class="modifier-row"
            >
              <td class="col-group">{{ dm.groupName }}</td>
              <td class="col-modifier">{{ dm.modifierName }}</td>
              <td class="col-portion">{{ formatNumber(dm.portionSize) }}</td>
              <td class="col-cost">{{ formatCurrency(dm.cost) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Total Summary -->
        <div v-if="variantGroup.defaultCombination" class="variant-total-box">
          <div class="total-row">
            <span class="total-label">Total Cost:</span>
            <span class="total-value">
              {{ formatCurrency(variantGroup.defaultCombination.cost) }}
            </span>
          </div>
          <div class="total-row">
            <span class="total-label">Food Cost:</span>
            <span
              class="total-value"
              :class="{ 'high-cost': variantGroup.defaultCombination.foodCostPercent > 35 }"
            >
              {{ formatPercent(variantGroup.defaultCombination.foodCostPercent) }}
            </span>
          </div>
          <div class="total-row">
            <span class="total-label">Margin:</span>
            <span class="total-value margin">
              {{ formatCurrency(variantGroup.defaultCombination.margin) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Full Mode: All Combinations Grouped by Variant -->
    <div v-else class="combinations-section">
      <h2 class="section-title">All Modifier Combinations</h2>

      <div v-for="(variantGroup, vIdx) in variantGroups" :key="vIdx" class="variant-group-section">
        <!-- Variant Group Header -->
        <div class="variant-group-header">
          <h3 class="variant-group-title">{{ variantGroup.variantName }}</h3>
          <div class="variant-group-meta">
            <span>Price: {{ formatCurrency(variantGroup.variantPrice) }}</span>
            <span>Base Cost: {{ formatCurrency(variantGroup.variantBaseCost) }}</span>
          </div>
        </div>

        <!-- Combinations Table for this Variant -->
        <table class="combinations-table">
          <thead>
            <tr>
              <th class="col-combo">Modifiers</th>
              <th class="col-price">Price</th>
              <th class="col-cost">Cost</th>
              <th class="col-fc">FC%</th>
              <th class="col-margin">Margin</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(combo, cIdx) in variantGroup.combinations" :key="cIdx" class="combo-row">
              <td class="col-combo">{{ getModifiersFromDisplay(combo.displayName) }}</td>
              <td class="col-price">{{ formatCurrency(combo.price) }}</td>
              <td class="col-cost">{{ formatCurrency(combo.cost) }}</td>
              <td class="col-fc" :class="{ 'high-cost': combo.foodCostPercent > 35 }">
                {{ formatPercent(combo.foodCostPercent) }}
              </td>
              <td class="col-margin">{{ formatCurrency(combo.margin) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 2: All Recipes Used (Variant + Modifier) -->
    <div v-if="uniqueRecipes.length > 0" class="recipes-section">
      <h2 class="section-title">All Recipes Used</h2>

      <div class="legend">
        <span class="legend-title">Type:</span>
        <span class="legend-item">
          <span class="comp-type product">P</span>
          Product
        </span>
        <span class="legend-item">
          <span class="comp-type recipe">R</span>
          Recipe
        </span>
        <span class="legend-item">
          <span class="comp-type preparation">S</span>
          Semi-finished
        </span>
        <span class="legend-separator">|</span>
        <span class="legend-title">Source:</span>
        <span class="legend-item">
          <span class="source-badge variant">V</span>
          Variant (base)
        </span>
        <span class="legend-item">
          <span class="source-badge modifier">M</span>
          Modifier
        </span>
      </div>

      <div
        v-for="(recipe, rIdx) in uniqueRecipes"
        :key="rIdx"
        class="recipe-card"
        :class="{ 'variant-recipe': recipe.source === 'variant' }"
      >
        <!-- Recipe Header with Name, Type, Code, Source and Yield -->
        <div class="recipe-header">
          <div class="recipe-title">
            <span class="source-badge" :class="recipe.source || 'modifier'">
              {{ recipe.source === 'variant' ? 'V' : 'M' }}
            </span>
            <span class="comp-type" :class="recipe.recipeType">
              {{ getRecipeTypeLabel(recipe.recipeType) }}
            </span>
            <span v-if="recipe.recipeCode" class="recipe-code">{{ recipe.recipeCode }}</span>
            <h3 class="recipe-name">{{ recipe.recipeName }}</h3>
          </div>
          <div class="recipe-meta">
            <!-- Always show yield to explain how portion is defined -->
            <span class="recipe-yield">
              Yield: {{ formatNumber(recipe.yield.quantity) }} {{ recipe.yield.unit }}
            </span>
            <span class="recipe-cost-label">Cost per portion:</span>
            <span class="recipe-cost">{{ formatCurrency(recipe.totalCostPerYield) }}</span>
          </div>
        </div>

        <!-- Portions/Variants Used Info -->
        <div class="portions-info">
          <span class="portions-label">
            {{ recipe.source === 'variant' ? 'Used in variants:' : 'Portions used:' }}
          </span>
          <span v-for="(portion, pIdx) in recipe.portions" :key="pIdx" class="portion-badge">
            {{ formatNumber(portion.portionSize) }}
            <span class="portion-groups">({{ portion.modifierGroups.join(', ') }})</span>
          </span>
        </div>

        <!-- Vertical Ingredients Table - Simple Layout -->
        <table v-if="recipe.ingredients.length > 0" class="ingredients-table-vertical">
          <thead>
            <tr>
              <th class="col-name">Ingredient</th>
              <th class="col-qty">Net Qty</th>
              <th v-if="hasRawQuantity(recipe)" class="col-raw">Raw Qty</th>
              <th class="col-unit">Unit</th>
              <th class="col-total">Cost</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(ing, iIdx) in recipe.ingredients" :key="iIdx">
              <tr
                class="ing-row"
                :class="{ 'has-nested': ing.nestedComponents && ing.nestedComponents.length > 0 }"
              >
                <td class="col-name">
                  <span class="comp-name-wrapper">
                    <span class="comp-type" :class="ing.type">
                      {{ getComponentTypeLabel(ing.type) }}
                    </span>
                    <span>{{ ing.name }}</span>
                    <span
                      v-if="ing.nestedComponents && ing.nestedComponents.length > 0"
                      class="nested-indicator"
                    >
                      ▼
                    </span>
                  </span>
                </td>
                <td class="col-qty">{{ formatNumber(ing.quantityPerYield) }}</td>
                <td v-if="hasRawQuantity(recipe)" class="col-raw">
                  {{ ing.rawQuantityPerYield ? formatNumber(ing.rawQuantityPerYield) : '-' }}
                </td>
                <td class="col-unit">{{ ing.unit }}</td>
                <td class="col-total">{{ formatCurrency(ing.costPerYield) }}</td>
              </tr>
              <!-- Nested components for preparations/recipes -->
              <tr
                v-for="(nested, nIdx) in ing.nestedComponents || []"
                :key="`${iIdx}-${nIdx}`"
                class="nested-ing-row"
              >
                <td class="col-name nested-name">
                  <span class="comp-name-wrapper">
                    <span class="nested-prefix">└</span>
                    <span class="comp-type nested-type" :class="nested.type">
                      {{ getComponentTypeLabel(nested.type) }}
                    </span>
                    <span>{{ nested.name }}</span>
                  </span>
                </td>
                <td class="col-qty nested-qty">{{ formatNumber(nested.quantity) }}</td>
                <td v-if="hasRawQuantity(recipe)" class="col-raw">-</td>
                <td class="col-unit nested-unit">{{ nested.unit }}</td>
                <td class="col-total nested-cost">{{ formatCurrency(nested.cost) }}</td>
              </tr>
            </template>
            <!-- Total Row -->
            <tr class="total-row-simple">
              <td :colspan="hasRawQuantity(recipe) ? 4 : 3" class="col-name">
                <strong>Total Cost per Portion</strong>
              </td>
              <td class="col-total">
                <strong>{{ formatCurrency(recipe.totalCostPerYield) }}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Portion Costs (only show if multiple portions used) -->
        <div v-if="recipe.portions.length > 1" class="portion-costs">
          <span class="portion-costs-label">Cost by portion size:</span>
          <span v-for="(portion, pIdx) in recipe.portions" :key="pIdx" class="portion-cost-item">
            <span class="portion-size">{{ formatNumber(portion.portionSize) }} portion:</span>
            <span class="portion-cost-value">
              {{ formatCurrency(recipe.totalCostPerYield * portion.portionSize) }}
            </span>
          </span>
        </div>

        <div v-if="!recipe.ingredients || recipe.ingredients.length === 0" class="no-ingredients">
          No ingredients defined
        </div>
      </div>
    </div>
  </ExportLayout>
</template>

<style scoped>
/* Food Cost Summary Section */
.food-cost-summary {
  margin-bottom: 20px;
  padding: 12px;
  background: #f0f8ff;
  border: 1px solid #b3d9ff;
  border-radius: 6px;
}

.summary-title {
  font-size: 14px;
  font-weight: bold;
  margin: 0 0 10px 0;
  color: #1565c0;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.summary-table th,
.summary-table td {
  padding: 6px 10px;
  border: 1px solid #b3d9ff;
}

.summary-table th {
  background: #e3f2fd;
  font-weight: bold;
  text-align: left;
}

.summary-table .col-variant {
  width: 40%;
}

.summary-table .col-price {
  width: 15%;
  text-align: right;
}

.summary-table .col-min,
.summary-table .col-max {
  width: 22%;
  text-align: center;
}

.fc-value {
  font-weight: bold;
  font-size: 12px;
}

.fc-cost {
  font-size: 10px;
  color: #666;
  margin-left: 4px;
}

.item-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ddd;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 12px;
}

.meta-item strong {
  color: #333;
}

.item-description {
  font-size: 11px;
  color: #666;
  font-style: italic;
  margin: 8px 0 0;
}

.combinations-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 12px;
  color: #856404;
}

.warning-icon {
  margin-right: 6px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 2px solid #333;
  color: #333;
}

/* Combinations Table */
.combinations-section {
  margin-bottom: 24px;
}

.combinations-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.combinations-table th,
.combinations-table td {
  padding: 6px 8px;
  border: 1px solid #ddd;
}

.combinations-table th {
  background: #f5f5f5;
  font-weight: bold;
  text-align: left;
}

.col-combo {
  width: 50%;
}

.col-price,
.col-cost,
.col-margin {
  width: 12%;
  text-align: right;
}

.col-fc {
  width: 10%;
  text-align: right;
}

.combo-row {
  page-break-inside: avoid;
  break-inside: avoid;
}

.combo-row:nth-child(even) {
  background: #fafafa;
}

.high-cost {
  color: #d32f2f;
  font-weight: 600;
}

/* Recipes Section */
.recipes-section {
  margin-top: 24px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 11px;
}

.legend-title {
  font-weight: bold;
  color: #666;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.recipe-card {
  margin-bottom: 20px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.recipe-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recipe-code {
  font-size: 11px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

.recipe-name {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.recipe-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.recipe-yield {
  font-size: 11px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 3px;
}

.recipe-cost {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

/* Portions Info */
.portions-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 11px;
}

.portions-label {
  color: #666;
}

.portion-badge {
  background: #e3f2fd;
  color: #1565c0;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 500;
}

.portion-groups {
  font-weight: normal;
  font-size: 10px;
  color: #666;
}

/* Ingredients Table with Portion Columns */
.ingredients-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.ingredients-table th,
.ingredients-table td {
  padding: 5px 8px;
  border: 1px solid #ddd;
  vertical-align: middle;
}

.ingredients-table th {
  background: #f5f5f5;
  font-weight: bold;
  text-align: center;
}

.ingredients-table .col-name {
  width: 30%;
  text-align: left;
}

.ingredients-table th.col-name {
  text-align: left;
}

.col-yield,
.col-portion {
  text-align: center;
  min-width: 80px;
}

.col-yield {
  background: #f9f9f9;
}

.col-portion.inactive {
  background: #fafafa;
  color: #ccc;
}

.yield-header,
.portion-header {
  display: block;
  font-weight: bold;
}

.yield-sub {
  display: block;
  font-size: 9px;
  font-weight: normal;
  color: #666;
}

.ing-row {
  background: white;
}

.ing-row:nth-child(even) {
  background: #fafafa;
}

.qty-value {
  display: block;
  font-size: 11px;
}

.cost-value {
  display: block;
  font-size: 10px;
  color: #666;
}

.cost-value.total {
  font-weight: bold;
  color: #333;
  font-size: 11px;
}

.inactive-cell {
  color: #ccc;
}

/* Vertical Ingredients Table - Simpler Layout */
.ingredients-table-vertical {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.ingredients-table-vertical th,
.ingredients-table-vertical td {
  padding: 5px 8px;
  border: 1px solid #ddd;
  vertical-align: middle;
}

.ingredients-table-vertical th {
  background: #f5f5f5;
  font-weight: bold;
  text-align: left;
}

.ingredients-table-vertical .col-name {
  width: 50%;
}

.ingredients-table-vertical .col-qty {
  width: 15%;
  text-align: right;
}

.ingredients-table-vertical .col-unit {
  width: 15%;
  text-align: center;
}

.ingredients-table-vertical .col-total {
  width: 20%;
  text-align: right;
}

.recipe-cost-label {
  font-size: 11px;
  color: #666;
  margin-right: 4px;
}

.total-row-simple {
  background: #f5f5f5;
  border-top: 2px solid #ddd;
}

/* Nested ingredient rows for preparations/recipes */
.ing-row.has-nested {
  background: #f8f9fa;
  font-weight: 500;
}

.nested-indicator {
  font-size: 8px;
  color: #888;
  margin-left: 4px;
}

.nested-ing-row {
  background: #fff;
}

.nested-ing-row td {
  padding-top: 3px;
  padding-bottom: 3px;
  font-size: 10px;
  color: #555;
  border-top: none;
}

.nested-name {
  padding-left: 20px !important;
}

.nested-prefix {
  color: #bbb;
  margin-right: 4px;
  font-family: monospace;
}

.nested-type {
  opacity: 0.8;
  font-size: 8px; /* Use smaller font instead of transform scale */
}

.nested-qty,
.nested-unit,
.nested-cost {
  color: #666;
}

/* Portion Costs Section */
.portion-costs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 10px;
  padding: 8px 12px;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 11px;
}

.portion-costs-label {
  font-weight: bold;
  color: #666;
}

.portion-cost-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e3f2fd;
  padding: 3px 8px;
  border-radius: 3px;
}

.portion-size {
  font-weight: 500;
  color: #1565c0;
}

.portion-cost-value {
  font-weight: bold;
  color: #333;
}

.total-row {
  background: #f5f5f5 !important;
  font-weight: bold;
}

.total-row td {
  border-top: 2px solid #ddd;
}

.comp-name-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.comp-type {
  display: inline-block;
  font-size: 9px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 3px;
  min-width: 14px;
  text-align: center;
}

.comp-type.product {
  background: #e3f2fd;
  color: #1565c0;
}

.comp-type.recipe {
  background: #e8f5e9;
  color: #2e7d32;
}

.comp-type.preparation {
  background: #fff3e0;
  color: #e65100;
}

/* Source badges for variant/modifier distinction */
.source-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 3px;
  min-width: 14px;
  text-align: center;
}

.source-badge.variant {
  background: #ede7f6;
  color: #512da8;
}

.source-badge.modifier {
  background: #fce4ec;
  color: #c2185b;
}

.legend-separator {
  color: #ccc;
  margin: 0 4px;
}

/* Variant recipe card highlight */
.recipe-card.variant-recipe {
  border-color: #b39ddb;
  background: linear-gradient(135deg, #ede7f6 0%, #fff 100%);
}

.no-ingredients {
  padding: 12px;
  text-align: center;
  color: #666;
  font-style: italic;
  font-size: 11px;
}

/* Variant Section Styles (Summary Mode) */
.variant-section {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.variant-header-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #333;
}

.variant-title {
  font-size: 16px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.variant-price {
  font-size: 18px;
  font-weight: bold;
  color: #1976d2;
}

.variant-base-cost {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
}

.base-label {
  color: #666;
}

.base-value {
  font-weight: 600;
  color: #333;
}

/* Default Modifiers Table */
.default-modifiers-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  margin-bottom: 12px;
}

.default-modifiers-table th,
.default-modifiers-table td {
  padding: 6px 10px;
  border: 1px solid #ddd;
}

.default-modifiers-table th {
  background: #f5f5f5;
  font-weight: bold;
  text-align: left;
}

.default-modifiers-table .col-group {
  width: 30%;
}

.default-modifiers-table .col-modifier {
  width: 35%;
}

.default-modifiers-table .col-portion {
  width: 15%;
  text-align: center;
}

.default-modifiers-table .col-cost {
  width: 20%;
  text-align: right;
}

.modifier-row:nth-child(even) {
  background: #fafafa;
}

/* Variant Total Box */
.variant-total-box {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background: #e3f2fd;
  border-radius: 4px;
  margin-top: 12px;
}

.total-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.total-label {
  font-size: 10px;
  color: #666;
}

.total-value {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.total-value.margin {
  color: #2e7d32;
}

/* Variant Group Styles (Full Mode) */
.variant-group-section {
  margin-bottom: 24px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.variant-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f0f0f0;
  border-radius: 4px 4px 0 0;
  border: 1px solid #ddd;
  border-bottom: none;
}

.variant-group-title {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.variant-group-meta {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: #666;
}

.variant-group-section .combinations-table {
  border-radius: 0 0 4px 4px;
}

/* Top Combinations Analysis Section */
.top-combinations-section {
  margin-bottom: 20px;
  padding: 12px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 6px;
}

.combinations-title {
  font-size: 14px;
  font-weight: bold;
  margin: 0 0 10px 0;
  color: #f57c00;
}

.top-combinations-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.top-combinations-table th,
.top-combinations-table td {
  padding: 6px 10px;
  border: 1px solid #ffe082;
}

.top-combinations-table th {
  background: #ffecb3;
  font-weight: bold;
  text-align: left;
}

.top-combinations-table .col-type {
  width: 12%;
  text-align: center;
}

.top-combinations-table .col-combo-name {
  width: 38%;
}

.top-combinations-table .col-combo-price,
.top-combinations-table .col-combo-cost,
.top-combinations-table .col-combo-margin {
  width: 12%;
  text-align: right;
}

.top-combinations-table .col-combo-fc {
  width: 10%;
  text-align: center;
  font-weight: bold;
}

.variant-header-row {
  background: #f5f5f5;
}

.variant-header-cell {
  font-weight: bold;
  font-size: 12px;
  color: #333;
  padding: 8px 10px !important;
}

.combo-row {
  background: white;
}

.combo-row.min-row {
  background: #e8f5e9;
}

.combo-row.max-row {
  background: #ffebee;
}

.combo-row.default-row {
  background: #e3f2fd;
}

.combo-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
}

.combo-badge.min-badge {
  background: #c8e6c9;
  color: #2e7d32;
}

.combo-badge.max-badge {
  background: #ffcdd2;
  color: #c62828;
}

.combo-badge.default-badge {
  background: #bbdefb;
  color: #1565c0;
}

.margin-positive {
  color: #2e7d32;
  font-weight: 500;
}

/* Raw quantity column for yield adjustments */
.ingredients-table-vertical .col-raw {
  width: 15%;
  text-align: right;
  color: #666;
  font-style: italic;
}
</style>
