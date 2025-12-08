<script setup lang="ts">
/**
 * Recipe Export Template
 * Shows recipes grouped by category with components, costs, and optional instructions
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

function formatCurrency(amount: number): string {
  return exportService.formatCurrency(amount)
}

function formatQuantity(qty: number, unit: string): string {
  return `${qty} ${unit}`
}
</script>

<template>
  <ExportLayout :title="data.title" :date="data.date">
    <!-- Legend -->
    <div class="legend">
      <span class="legend-title">Components:</span>
      <span class="legend-item">
        <span class="comp-type product">P</span>
        Product
      </span>
      <span class="legend-item">
        <span class="comp-type preparation">S</span>
        Semi-finished (Preparation)
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
              <span class="info-item">
                <strong>Cost/Unit:</strong>
                {{ formatCurrency(recipe.costPerUnit) }}
              </span>
              <span class="info-item">
                <strong>Total Cost:</strong>
                {{ formatCurrency(recipe.totalCost) }}
              </span>
            </div>
            <table class="components-table">
              <thead>
                <tr>
                  <th class="col-name">Component</th>
                  <th class="col-qty">Quantity</th>
                  <th class="col-cost">Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(comp, idx) in recipe.components" :key="idx">
                  <td class="col-name">
                    <span class="comp-name-wrapper">
                      <span class="comp-type" :class="comp.type">
                        {{ comp.type === 'product' ? 'P' : 'S' }}
                      </span>
                      <span>{{ comp.name }}</span>
                    </span>
                  </td>
                  <td class="col-qty">{{ formatQuantity(comp.quantity, comp.unit) }}</td>
                  <td class="col-cost">{{ formatCurrency(comp.cost) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="total-label">Total</td>
                  <td class="col-cost total-value">{{ formatCurrency(recipe.totalCost) }}</td>
                </tr>
              </tfoot>
            </table>
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
            <span class="info-item">
              <strong>Cost/Unit:</strong>
              {{ formatCurrency(recipe.costPerUnit) }}
            </span>
            <span class="info-item">
              <strong>Total Cost:</strong>
              {{ formatCurrency(recipe.totalCost) }}
            </span>
          </div>
          <table class="components-table">
            <thead>
              <tr>
                <th class="col-name">Component</th>
                <th class="col-qty">Quantity</th>
                <th class="col-cost">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(comp, idx) in recipe.components" :key="idx">
                <td class="col-name">
                  <span class="comp-name-wrapper">
                    <span class="comp-type" :class="comp.type">
                      {{ comp.type === 'product' ? 'P' : 'S' }}
                    </span>
                    <span>{{ comp.name }}</span>
                  </span>
                </td>
                <td class="col-qty">{{ formatQuantity(comp.quantity, comp.unit) }}</td>
                <td class="col-cost">{{ formatCurrency(comp.cost) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="total-label">Total</td>
                <td class="col-cost total-value">{{ formatCurrency(recipe.totalCost) }}</td>
              </tr>
            </tfoot>
          </table>
          <div v-if="options?.includeInstructions && recipe.instructions" class="instructions">
            <h4>Instructions</h4>
            <p>{{ recipe.instructions }}</p>
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

.comp-type.preparation {
  background: #fff3e0;
  color: #e65100;
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
</style>
