<script setup lang="ts">
/**
 * Preparation Export Template
 * Shows semi-finished products grouped by type with components and costs
 */

import { computed } from 'vue'
import type {
  PreparationExportData,
  PreparationCategoryExport,
  PreparationExport,
  ExportOptions
} from '../types'
import { exportService } from '../ExportService'
import ExportLayout from './ExportLayout.vue'

const props = defineProps<{
  data: PreparationExportData
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
        Semi-finished
      </span>
      <span class="legend-divider">|</span>
      <span class="legend-title">Output:</span>
      <span class="legend-item">
        <span class="portion-type weight">W</span>
        Weight (g/ml)
      </span>
      <span class="legend-item">
        <span class="portion-type portion">P</span>
        Portion
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

          <div v-for="prep in category.preparations" :key="prep.id" class="preparation">
            <!-- Preparation content (same as below) -->
            <div class="prep-header">
              <div class="prep-title">
                <h3 class="prep-name">{{ prep.name }}</h3>
                <span class="portion-type" :class="prep.portionType">
                  {{ prep.portionType === 'portion' ? 'P' : 'W' }}
                </span>
              </div>
            </div>
            <div class="prep-info">
              <span class="info-item">
                <strong>Output:</strong>
                {{ formatQuantity(prep.outputQuantity, prep.outputUnit) }}
              </span>
              <span class="info-item">
                <strong>Cost/Unit:</strong>
                {{ formatCurrency(prep.costPerUnit) }}
              </span>
              <span class="info-item">
                <strong>Total Cost:</strong>
                {{ formatCurrency(prep.totalCost) }}
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
                <tr v-for="(comp, idx) in prep.components" :key="idx">
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
      </div>
    </template>

    <!-- Flat Categories (single department or backward compat) -->
    <template v-else>
      <div v-for="category in data.categories" :key="category.name" class="category-section">
        <h2 class="category-title">{{ category.name }}</h2>

        <div v-for="prep in category.preparations" :key="prep.id" class="preparation">
          <div class="prep-header">
            <div class="prep-title">
              <h3 class="prep-name">{{ prep.name }}</h3>
              <span class="portion-type" :class="prep.portionType">
                {{ prep.portionType === 'portion' ? 'P' : 'W' }}
              </span>
            </div>
          </div>
          <div class="prep-info">
            <span class="info-item">
              <strong>Output:</strong>
              {{ formatQuantity(prep.outputQuantity, prep.outputUnit) }}
            </span>
            <span class="info-item">
              <strong>Cost/Unit:</strong>
              {{ formatCurrency(prep.costPerUnit) }}
            </span>
            <span class="info-item">
              <strong>Total Cost:</strong>
              {{ formatCurrency(prep.totalCost) }}
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
              <tr v-for="(comp, idx) in prep.components" :key="idx">
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

.legend-divider {
  color: #ccc;
  margin: 0 4px;
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

.prep-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prep-name {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
}

.prep-info {
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

.portion-type {
  display: inline-block;
  font-size: 9px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 3px;
  min-width: 14px;
  text-align: center;
}

.portion-type.weight {
  background: #f3e5f5;
  color: #7b1fa2;
}

.portion-type.portion {
  background: #e8f5e9;
  color: #2e7d32;
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
