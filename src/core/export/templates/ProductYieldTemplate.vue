<script setup lang="ts">
/**
 * Product Yield List PDF Template
 * Shows all products with their yield percentages
 */
import type { ProductYieldReportData } from '../types'

defineProps<{
  data: ProductYieldReportData
}>()

function formatYield(value: number): string {
  return `${value}%`
}

function getYieldClass(value: number): string {
  if (value === 100) return 'yield-full'
  if (value >= 80) return 'yield-high'
  if (value >= 50) return 'yield-medium'
  return 'yield-low'
}
</script>

<template>
  <div class="yield-report">
    <!-- Header -->
    <header class="report-header">
      <h1 class="report-title">{{ data.title }}</h1>
      <div class="report-meta">
        <div class="meta-row">
          <span class="meta-label">Department:</span>
          <span class="meta-value">
            {{
              data.department === 'all'
                ? 'All Departments'
                : data.department === 'kitchen'
                  ? 'Kitchen'
                  : 'Bar'
            }}
          </span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Total Products:</span>
          <span class="meta-value">{{ data.summary.totalProducts }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Average Yield:</span>
          <span class="meta-value">{{ data.summary.averageYield.toFixed(1) }}%</span>
        </div>
      </div>
    </header>

    <!-- Products Table -->
    <table class="yield-table">
      <thead>
        <tr>
          <th class="col-index">#</th>
          <th class="col-name">Product Name</th>
          <th class="col-code">Code</th>
          <th class="col-category">Category</th>
          <th class="col-dept">Department</th>
          <th class="col-unit">Unit</th>
          <th class="col-yield">Yield %</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in data.items" :key="item.index">
          <td class="col-index">{{ item.index }}</td>
          <td class="col-name">{{ item.name }}</td>
          <td class="col-code">{{ item.code }}</td>
          <td class="col-category">{{ item.category || '-' }}</td>
          <td class="col-dept">{{ item.department }}</td>
          <td class="col-unit">{{ item.unit }}</td>
          <td class="col-yield" :class="getYieldClass(item.yieldPercentage)">
            {{ formatYield(item.yieldPercentage) }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Legend -->
    <div class="legend">
      <span class="legend-title">Yield Legend:</span>
      <span class="legend-item yield-full">100% (No waste)</span>
      <span class="legend-item yield-high">80-99%</span>
      <span class="legend-item yield-medium">50-79%</span>
      <span class="legend-item yield-low">&lt;50%</span>
    </div>

    <!-- Footer -->
    <footer class="report-footer">
      <p>Generated: {{ new Date(data.generatedAt).toLocaleString() }}</p>
    </footer>
  </div>
</template>

<style scoped>
.yield-report {
  font-family: Arial, sans-serif;
  font-size: 11px;
  line-height: 1.3;
  color: #000;
  background: #fff;
  padding: 8mm 10mm;
  box-sizing: border-box;
}

/* Header */
.report-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #000;
}

.report-title {
  font-size: 18px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.report-meta {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.meta-row {
  display: flex;
  gap: 6px;
}

.meta-label {
  font-weight: 600;
  color: #333;
}

.meta-value {
  color: #000;
}

/* Table */
.yield-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.yield-table th,
.yield-table td {
  border: 1px solid #333;
  padding: 4px 6px;
  text-align: left;
  vertical-align: middle;
}

.yield-table th {
  background: #f0f0f0;
  font-weight: 600;
  text-align: center;
  font-size: 10px;
}

.yield-table tbody tr:nth-child(even) {
  background: #fafafa;
}

/* Column widths */
.col-index {
  width: 28px;
  text-align: center !important;
}

.col-name {
  min-width: 150px;
}

.col-code {
  width: 70px;
  font-family: monospace;
  font-size: 10px;
}

.col-category {
  width: 100px;
  font-size: 10px;
}

.col-dept {
  width: 70px;
  text-align: center !important;
  font-size: 10px;
}

.col-unit {
  width: 50px;
  text-align: center !important;
}

.col-yield {
  width: 60px;
  text-align: center !important;
  font-weight: 600;
}

/* Yield colors */
.yield-full {
  background: #c8e6c9 !important;
  color: #2e7d32;
}

.yield-high {
  background: #dcedc8 !important;
  color: #558b2f;
}

.yield-medium {
  background: #fff9c4 !important;
  color: #f9a825;
}

.yield-low {
  background: #ffcdd2 !important;
  color: #c62828;
}

/* Legend */
.legend {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
  font-size: 10px;
}

.legend-title {
  font-weight: 600;
}

.legend-item {
  padding: 2px 8px;
  border-radius: 3px;
}

/* Footer */
.report-footer {
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px solid #ccc;
  font-size: 9px;
  color: #999;
  text-align: center;
}

.report-footer p {
  margin: 0;
}
</style>
