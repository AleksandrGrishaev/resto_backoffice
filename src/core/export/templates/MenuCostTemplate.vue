<script setup lang="ts">
/**
 * Menu Cost Summary PDF Template
 * Compact A4 format with all menu items and food cost analysis
 */
import type { MenuCostReportData } from '../types'

defineProps<{
  data: MenuCostReportData
}>()

function formatCurrency(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function getFoodCostClass(percent: number): string {
  if (percent <= 25) return 'fc-low'
  if (percent <= 35) return 'fc-medium'
  return 'fc-high'
}

function getDepartmentLabel(dept: string): string {
  switch (dept) {
    case 'kitchen':
      return 'Kitchen'
    case 'bar':
      return 'Bar'
    default:
      return 'All Departments'
  }
}
</script>

<template>
  <div class="menu-cost-report">
    <!-- Header -->
    <header class="report-header">
      <h1 class="report-title">{{ data.title }}</h1>
      <div class="report-meta">
        <div class="meta-row">
          <span class="meta-label">Department:</span>
          <span class="meta-value">{{ getDepartmentLabel(data.department) }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Date:</span>
          <span class="meta-value">{{ data.date }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Items:</span>
          <span class="meta-value">{{ data.summary.totalItems }}</span>
        </div>
      </div>
    </header>

    <!-- Summary Stats -->
    <div class="summary-stats">
      <div class="stat-item">
        <span class="stat-label">Avg FC%</span>
        <span class="stat-value" :class="getFoodCostClass(data.summary.averageFoodCost)">
          {{ formatPercent(data.summary.averageFoodCost) }}
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Min FC%</span>
        <span class="stat-value fc-low">{{ formatPercent(data.summary.minFoodCost) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Max FC%</span>
        <span class="stat-value fc-high">{{ formatPercent(data.summary.maxFoodCost) }}</span>
      </div>
    </div>

    <!-- Categories with Items -->
    <div v-for="category in data.categories" :key="category.id" class="category-section">
      <h2 class="category-title">
        <span v-if="category.isSubcategory" class="subcategory-indicator">↳</span>
        {{ category.name }}
        <span class="category-count">({{ category.items.length }})</span>
      </h2>

      <table class="cost-table">
        <thead>
          <tr>
            <th class="col-name">Item / Variant</th>
            <th class="col-price">Price</th>
            <th class="col-cost">Cost</th>
            <th class="col-fc">Min FC%</th>
            <th class="col-fc">Max FC%</th>
            <th class="col-margin">Margin</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in category.items" :key="item.id">
            <!-- Item row (if multiple variants, show item name) -->
            <tr v-if="item.variants.length > 1" class="item-row">
              <td class="col-name item-name" colspan="6">
                <span class="dish-type-badge" :class="item.dishType">
                  {{ item.dishType === 'modifiable' ? 'M' : 'S' }}
                </span>
                {{ item.name }}
              </td>
            </tr>
            <!-- Variant rows -->
            <tr
              v-for="(variant, vIdx) in item.variants"
              :key="`${item.id}-${vIdx}`"
              class="variant-row"
              :class="{ 'single-variant': item.variants.length === 1 }"
            >
              <td class="col-name">
                <template v-if="item.variants.length === 1">
                  <span class="dish-type-badge" :class="item.dishType">
                    {{ item.dishType === 'modifiable' ? 'M' : 'S' }}
                  </span>
                  {{ item.name }}
                </template>
                <template v-else>
                  <span class="variant-indent">└</span>
                  {{ variant.name }}
                </template>
              </td>
              <td class="col-price">{{ formatCurrency(variant.price) }}</td>
              <td class="col-cost">{{ formatCurrency(variant.minCost) }}</td>
              <td class="col-fc" :class="getFoodCostClass(variant.minFoodCostPercent)">
                {{ formatPercent(variant.minFoodCostPercent) }}
              </td>
              <td class="col-fc" :class="getFoodCostClass(variant.maxFoodCostPercent)">
                <template v-if="variant.maxFoodCostPercent > variant.minFoodCostPercent">
                  {{ formatPercent(variant.maxFoodCostPercent) }}
                </template>
                <template v-else>
                  <span class="same-value">-</span>
                </template>
              </td>
              <td class="col-margin">{{ formatCurrency(variant.margin) }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <footer class="report-footer">
      <div class="legend">
        <span class="legend-item">
          <span class="legend-badge fc-low"></span>
          FC ≤ 25%
        </span>
        <span class="legend-item">
          <span class="legend-badge fc-medium"></span>
          FC 25-35%
        </span>
        <span class="legend-item">
          <span class="legend-badge fc-high"></span>
          FC &gt; 35%
        </span>
        <span class="legend-item">
          <span class="dish-type-badge simple">S</span>
          Simple
        </span>
        <span class="legend-item">
          <span class="dish-type-badge modifiable">M</span>
          Modifiable
        </span>
      </div>
      <p class="generated-at">Generated: {{ new Date(data.generatedAt).toLocaleString() }}</p>
    </footer>
  </div>
</template>

<style scoped>
.menu-cost-report {
  font-family: Arial, sans-serif;
  font-size: 9px;
  line-height: 1.2;
  color: #000;
  background: #fff;
  padding: 6mm 8mm;
  box-sizing: border-box;
}

/* Header */
.report-header {
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 2px solid #1976d2;
}

.report-title {
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 6px 0;
  color: #1976d2;
}

.report-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.meta-row {
  display: flex;
  gap: 4px;
}

.meta-label {
  font-weight: 600;
  color: #666;
}

.meta-value {
  color: #000;
}

/* Summary Stats */
.summary-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  padding: 6px 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 8px;
  color: #666;
  text-transform: uppercase;
}

.stat-value {
  font-size: 12px;
  font-weight: bold;
}

/* Category Sections */
.category-section {
  margin-bottom: 10px;
  page-break-inside: avoid;
}

.category-title {
  font-size: 11px;
  font-weight: bold;
  margin: 0 0 4px 0;
  padding: 3px 6px;
  background: #e3f2fd;
  color: #1565c0;
  border-left: 3px solid #1976d2;
}

.subcategory-indicator {
  color: #666;
  margin-right: 4px;
}

.category-count {
  font-weight: normal;
  color: #666;
  font-size: 9px;
}

/* Cost Table */
.cost-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 6px;
}

.cost-table th,
.cost-table td {
  border: 1px solid #ddd;
  padding: 3px 4px;
  text-align: left;
}

.cost-table th {
  background: #fafafa;
  font-weight: 600;
  font-size: 8px;
  text-align: center;
  color: #333;
}

.cost-table tbody tr:nth-child(even) {
  background: #fafafa;
}

/* Column widths */
.col-name {
  min-width: 140px;
}

.col-price,
.col-cost,
.col-margin {
  width: 65px;
  text-align: right !important;
  font-family: monospace;
  font-size: 8px;
}

.col-fc {
  width: 45px;
  text-align: center !important;
  font-weight: 600;
}

/* Item & Variant rows */
.item-row {
  background: #f0f0f0 !important;
}

.item-name {
  font-weight: 600;
  font-size: 9px;
}

.variant-row.single-variant .col-name {
  font-weight: 500;
}

.variant-indent {
  color: #999;
  margin-right: 4px;
  margin-left: 8px;
}

/* Dish type badges */
.dish-type-badge {
  display: inline-block;
  width: 12px;
  height: 12px;
  line-height: 12px;
  text-align: center;
  font-size: 7px;
  font-weight: bold;
  border-radius: 2px;
  margin-right: 4px;
}

.dish-type-badge.simple {
  background: #e8f5e9;
  color: #2e7d32;
}

.dish-type-badge.modifiable {
  background: #fff3e0;
  color: #ef6c00;
}

/* Food cost colors */
.fc-low {
  color: #2e7d32;
  background-color: #e8f5e9;
}

.fc-medium {
  color: #f57c00;
  background-color: #fff3e0;
}

.fc-high {
  color: #c62828;
  background-color: #ffebee;
}

.same-value {
  color: #999;
}

/* Footer */
.report-footer {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #ddd;
}

.legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 7px;
  color: #666;
}

.legend-badge {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-badge.fc-low {
  background: #4caf50;
}

.legend-badge.fc-medium {
  background: #ff9800;
}

.legend-badge.fc-high {
  background: #f44336;
}

.generated-at {
  font-size: 7px;
  color: #999;
  margin: 0;
  text-align: center;
}

/* Print optimization */
@media print {
  .menu-cost-report {
    padding: 0;
  }

  .category-section {
    page-break-inside: avoid;
  }

  .cost-table {
    page-break-inside: auto;
  }

  .cost-table tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
}
</style>
