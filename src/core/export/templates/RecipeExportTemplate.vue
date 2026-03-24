<script setup lang="ts">
/**
 * Recipe Export Template
 * Shows recipes grouped by category with components, costs, and optional instructions
 * Includes dependent preparations section (unique, no duplicates)
 */

import { computed } from 'vue'
import type { RecipeExportData, RecipeCategoryExport, RecipeExport, ExportOptions } from '../types'
import { exportService } from '../ExportService'
import ExportLayout from './ExportLayout.vue'

const props = defineProps<{
  data: RecipeExportData
  options?: ExportOptions
}>()

// Check if we have department sections or flat categories
const hasDepartments = computed(() => {
  return props.data.departments && props.data.departments.length > 0
})

const showCosts = computed(() => props.options?.includeCosts !== false)

function formatCurrency(amount: number): string {
  return exportService.formatCurrency(amount)
}

function formatQuantity(qty: number, unit: string): string {
  return `${qty} ${unit}`
}

function badgeLabel(type: string): string {
  switch (type) {
    case 'product':
      return 'ING'
    case 'preparation':
      return 'PREP'
    case 'recipe':
      return 'REC'
    default:
      return type.charAt(0).toUpperCase()
  }
}
</script>

<template>
  <ExportLayout :title="data.title" :date="data.date">
    <!-- Legend -->
    <div class="legend">
      <span class="legend-title">Components:</span>
      <span class="legend-item">
        <span class="badge badge-ingredient">ING</span>
        Ingredient
      </span>
      <span class="legend-item">
        <span class="badge badge-prep">PREP</span>
        Preparation
      </span>
    </div>

    <!-- Department Sections (when exporting all) -->
    <template v-if="hasDepartments">
      <div
        v-for="(dept, idx) in data.departments"
        :key="dept.department"
        class="department-section"
        :class="{ 'page-break-before': idx > 0 }"
      >
        <h1 class="department-title">
          <span class="department-icon">{{ dept.department === 'kitchen' ? '🍳' : '🍸' }}</span>
          {{ dept.name }}
        </h1>

        <div v-for="category in dept.categories" :key="category.name" class="category-section">
          <h2 class="category-title">{{ category.name }}</h2>

          <div v-for="recipe in category.recipes" :key="recipe.id" class="recipe">
            <div class="recipe-header">
              <h3 class="recipe-name">{{ recipe.name }}</h3>
            </div>
            <div class="recipe-info">
              <span class="info-item">
                <strong>Output:</strong>
                {{ formatQuantity(recipe.outputQuantity, recipe.outputUnit) }}
              </span>
              <span v-if="showCosts" class="info-item">
                <strong>Cost/Unit:</strong>
                {{ formatCurrency(recipe.costPerUnit) }}
              </span>
              <span v-if="showCosts" class="info-item">
                <strong>Total Cost:</strong>
                {{ formatCurrency(recipe.totalCost) }}
              </span>
            </div>
            <table class="components-table">
              <thead>
                <tr>
                  <th class="col-name">Component</th>
                  <th class="col-qty">Quantity</th>
                  <th v-if="showCosts" class="col-cost">Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(comp, cidx) in recipe.components" :key="cidx">
                  <td class="col-name">
                    <span class="comp-name-wrapper">
                      <span
                        class="badge"
                        :class="
                          'badge-' +
                          (comp.type === 'product'
                            ? 'ingredient'
                            : comp.type === 'preparation'
                              ? 'prep'
                              : 'recipe')
                        "
                      >
                        {{ badgeLabel(comp.type) }}
                      </span>
                      <span>{{ comp.name }}</span>
                    </span>
                  </td>
                  <td class="col-qty">{{ formatQuantity(comp.quantity, comp.unit) }}</td>
                  <td v-if="showCosts" class="col-cost">{{ formatCurrency(comp.cost) }}</td>
                </tr>
              </tbody>
              <tfoot v-if="showCosts">
                <tr>
                  <td colspan="2" class="total-label">Total</td>
                  <td class="col-cost total-value">{{ formatCurrency(recipe.totalCost) }}</td>
                </tr>
              </tfoot>
            </table>
            <!-- Modifier groups (inline with dish) -->
            <template v-if="recipe.modifierGroups?.length">
              <div v-for="(mg, mgIdx) in recipe.modifierGroups" :key="mgIdx" class="modifier-group">
                <div class="modifier-group-header">
                  <span class="badge badge-modifier">{{ mg.type.toUpperCase() }}</span>
                  <strong>{{ mg.name }}</strong>
                </div>
                <div v-for="(opt, oIdx) in mg.options" :key="oIdx" class="modifier-option">
                  <div class="modifier-option-header">
                    <span class="modifier-option-name">
                      {{ opt.name }}
                      <span v-if="opt.isDefault" class="default-mark">(default)</span>
                    </span>
                    <span v-if="showCosts && opt.priceAdjustment" class="modifier-price-adj">
                      {{ opt.priceAdjustment > 0 ? '+' : ''
                      }}{{ formatCurrency(opt.priceAdjustment) }}
                    </span>
                    <span v-if="showCosts" class="modifier-option-cost">
                      {{ formatCurrency(opt.totalCost) }}
                    </span>
                  </div>
                  <table v-if="opt.components.length > 0" class="components-table modifier-table">
                    <tbody>
                      <tr v-for="(comp, cidx2) in opt.components" :key="cidx2">
                        <td class="col-name">
                          <span class="comp-name-wrapper">
                            <span
                              class="badge"
                              :class="
                                'badge-' +
                                (comp.type === 'product'
                                  ? 'ingredient'
                                  : comp.type === 'preparation'
                                    ? 'prep'
                                    : 'recipe')
                              "
                            >
                              {{ badgeLabel(comp.type) }}
                            </span>
                            <span>{{ comp.name }}</span>
                          </span>
                        </td>
                        <td class="col-qty">{{ formatQuantity(comp.quantity, comp.unit) }}</td>
                        <td v-if="showCosts" class="col-cost">{{ formatCurrency(comp.cost) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
            <div v-if="options?.includeInstructions && recipe.instructions" class="instructions">
              <h4>Instructions</h4>
              <p>{{ recipe.instructions }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Flat Categories (single department or backward compat) -->
    <template v-else>
      <div v-for="category in data.categories" :key="category.name" class="category-section">
        <h2 class="category-title">{{ category.name }}</h2>

        <div v-for="recipe in category.recipes" :key="recipe.id" class="recipe">
          <div class="recipe-header">
            <h3 class="recipe-name">{{ recipe.name }}</h3>
          </div>
          <div class="recipe-info">
            <span class="info-item">
              <strong>Output:</strong>
              {{ formatQuantity(recipe.outputQuantity, recipe.outputUnit) }}
            </span>
            <span v-if="showCosts" class="info-item">
              <strong>Cost/Unit:</strong>
              {{ formatCurrency(recipe.costPerUnit) }}
            </span>
            <span v-if="showCosts" class="info-item">
              <strong>Total Cost:</strong>
              {{ formatCurrency(recipe.totalCost) }}
            </span>
          </div>
          <table v-if="recipe.components.length > 0" class="components-table">
            <thead>
              <tr>
                <th class="col-name">Component</th>
                <th class="col-qty">Quantity</th>
                <th v-if="showCosts" class="col-cost">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(comp, cidx) in recipe.components" :key="cidx">
                <td class="col-name">
                  <span class="comp-name-wrapper">
                    <span
                      class="badge"
                      :class="
                        'badge-' +
                        (comp.type === 'product'
                          ? 'ingredient'
                          : comp.type === 'preparation'
                            ? 'prep'
                            : 'recipe')
                      "
                    >
                      {{ badgeLabel(comp.type) }}
                    </span>
                    <span>{{ comp.name }}</span>
                  </span>
                </td>
                <td class="col-qty">{{ formatQuantity(comp.quantity, comp.unit) }}</td>
                <td v-if="showCosts" class="col-cost">{{ formatCurrency(comp.cost) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="showCosts">
              <tr>
                <td colspan="2" class="total-label">Total</td>
                <td class="col-cost total-value">{{ formatCurrency(recipe.totalCost) }}</td>
              </tr>
            </tfoot>
          </table>
          <!-- Modifier groups (inline with dish) -->
          <template v-if="recipe.modifierGroups?.length">
            <div v-for="(mg, mgIdx) in recipe.modifierGroups" :key="mgIdx" class="modifier-group">
              <div class="modifier-group-header">
                <span class="badge badge-modifier">{{ mg.type.toUpperCase() }}</span>
                <strong>{{ mg.name }}</strong>
              </div>
              <div v-for="(opt, oIdx) in mg.options" :key="oIdx" class="modifier-option">
                <div class="modifier-option-header">
                  <span class="modifier-option-name">
                    {{ opt.name }}
                    <span v-if="opt.isDefault" class="default-mark">(default)</span>
                  </span>
                  <span v-if="showCosts && opt.priceAdjustment" class="modifier-price-adj">
                    {{ opt.priceAdjustment > 0 ? '+' : ''
                    }}{{ formatCurrency(opt.priceAdjustment) }}
                  </span>
                  <span v-if="showCosts" class="modifier-option-cost">
                    {{ formatCurrency(opt.totalCost) }}
                  </span>
                </div>
                <table v-if="opt.components.length > 0" class="components-table modifier-table">
                  <tbody>
                    <tr v-for="(comp, cidx2) in opt.components" :key="cidx2">
                      <td class="col-name">
                        <span class="comp-name-wrapper">
                          <span
                            class="badge"
                            :class="
                              'badge-' +
                              (comp.type === 'product'
                                ? 'ingredient'
                                : comp.type === 'preparation'
                                  ? 'prep'
                                  : 'recipe')
                            "
                          >
                            {{ badgeLabel(comp.type) }}
                          </span>
                          <span>{{ comp.name }}</span>
                        </span>
                      </td>
                      <td class="col-qty">{{ formatQuantity(comp.quantity, comp.unit) }}</td>
                      <td v-if="showCosts" class="col-cost">{{ formatCurrency(comp.cost) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
          <div v-if="options?.includeInstructions && recipe.instructions" class="instructions">
            <h4>Instructions</h4>
            <p>{{ recipe.instructions }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Dependent Preparations (unique, no duplicates) -->
    <template v-if="data.dependentPreparations?.length">
      <div class="dependent-preps-section">
        <h2 class="section-title">Referenced Preparations</h2>
        <div v-for="prep in data.dependentPreparations" :key="prep.id" class="preparation">
          <div class="prep-header">
            <h3 class="prep-name">
              <span class="badge badge-prep">PREP</span>
              {{ prep.name }}
            </h3>
          </div>
          <div class="prep-info">
            <span class="info-item">
              <strong>Output:</strong>
              {{ formatQuantity(prep.outputQuantity, prep.outputUnit) }}
            </span>
            <span v-if="showCosts" class="info-item">
              <strong>Cost/Unit:</strong>
              {{ formatCurrency(prep.costPerUnit) }}
            </span>
            <span v-if="showCosts" class="info-item">
              <strong>Total Cost:</strong>
              {{ formatCurrency(prep.totalCost) }}
            </span>
          </div>
          <table class="components-table">
            <thead>
              <tr>
                <th class="col-name">Component</th>
                <th class="col-qty">Quantity</th>
                <th v-if="showCosts" class="col-cost">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(comp, cidx) in prep.components" :key="cidx">
                <td class="col-name">
                  <span class="comp-name-wrapper">
                    <span
                      class="badge"
                      :class="'badge-' + (comp.type === 'product' ? 'ingredient' : 'prep')"
                    >
                      {{ badgeLabel(comp.type) }}
                    </span>
                    <span>{{ comp.name }}</span>
                  </span>
                </td>
                <td class="col-qty">{{ formatQuantity(comp.quantity, comp.unit) }}</td>
                <td v-if="showCosts" class="col-cost">{{ formatCurrency(comp.cost) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="showCosts">
              <tr>
                <td colspan="2" class="total-label">Total</td>
                <td class="col-cost total-value">{{ formatCurrency(prep.totalCost) }}</td>
              </tr>
            </tfoot>
          </table>
          <div v-if="options?.includeInstructions && prep.instructions" class="instructions">
            <h4>Instructions</h4>
            <p>{{ prep.instructions }}</p>
          </div>
        </div>
      </div>
    </template>
  </ExportLayout>
</template>

<style scoped>
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

/* Print-friendly badges — high contrast, visible in B&W */
.badge {
  display: inline-block;
  font-size: 8px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 2px;
  min-width: 24px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.4;
}

.badge-ingredient {
  border: 1.5px solid #333;
  color: #333;
  background: white;
}

.badge-prep {
  border: 1.5px solid #333;
  color: #333;
  background: #e0e0e0;
}

.badge-recipe {
  border: 1.5px solid #333;
  color: white;
  background: #333;
}

/* Department Section */
.department-section {
  margin-bottom: 32px;
}

/* Page break class - used by html2pdf */
.page-break-before {
  page-break-before: always;
  break-before: page;
}

.department-title {
  font-size: 22px;
  font-weight: bold;
  margin: 0 0 20px 0;
  padding: 12px 16px;
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  color: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.department-icon {
  font-size: 24px;
}

.category-section {
  margin-top: 20px;
  margin-bottom: 20px;
}

.category-section:first-child {
  margin-top: 16px;
}

.category-title {
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 2px solid #333;
  color: #333;
}

.recipe {
  margin-bottom: 20px;
  margin-left: 8px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.recipe-header {
  margin-bottom: 8px;
}

.recipe-name {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
}

.recipe-info {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 11px;
  color: #666;
}

.info-item strong {
  color: #000;
}

.components-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  margin-bottom: 8px;
}

.components-table th,
.components-table td {
  padding: 4px 8px;
  border: 1px solid #ddd;
}

.components-table th {
  background: #f5f5f5;
  font-weight: bold;
  text-align: left;
}

.col-name {
  width: 50%;
}

.comp-name-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.col-qty {
  width: 25%;
  text-align: center;
}

.col-cost {
  width: 25%;
  text-align: right;
}

.total-label {
  text-align: right;
  font-weight: bold;
}

.total-value {
  font-weight: bold;
  background: #f9f9f9;
}

/* Modifier groups inline with dish */
.modifier-group {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #bbb;
}

.modifier-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 11px;
}

.badge-modifier {
  border: 1.5px solid #555;
  color: #555;
  background: white;
  font-size: 7px;
  padding: 0 3px;
}

.modifier-option {
  margin-left: 8px;
  margin-bottom: 6px;
}

.modifier-option-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  margin-bottom: 3px;
}

.modifier-option-name {
  font-weight: 500;
}

.default-mark {
  font-size: 9px;
  color: #888;
  font-weight: 400;
}

.modifier-price-adj {
  color: #666;
  margin-left: auto;
}

.modifier-option-cost {
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

.modifier-table {
  margin-top: 2px;
  margin-bottom: 4px;
}

.modifier-table td {
  padding: 2px 8px;
  font-size: 10px;
}

.instructions {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed #ccc;
}

.instructions h4 {
  font-size: 12px;
  margin: 0 0 4px 0;
}

.instructions p {
  font-size: 11px;
  margin: 0;
  color: #444;
  white-space: pre-wrap;
}

/* Dependent Preparations Section */
.dependent-preps-section {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 3px solid #333;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  margin: 0 0 16px 0;
  color: #333;
}

.preparation {
  margin-bottom: 20px;
  margin-left: 8px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.prep-header {
  margin-bottom: 8px;
}

.prep-name {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.prep-info {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 11px;
  color: #666;
}
</style>
