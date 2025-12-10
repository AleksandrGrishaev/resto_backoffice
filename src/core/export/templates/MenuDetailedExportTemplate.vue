<script setup lang="ts">
/**
 * Menu Detailed Export Template
 * Shows multiple menu items with full recipe details
 * Each item is rendered with the same format as CombinationsExportTemplate
 */

import { computed } from 'vue'
import type { MenuDetailedExportData, ExportOptions } from '../types'
import { exportService } from '../ExportService'
import CombinationsExportTemplate from './CombinationsExportTemplate.vue'

const props = defineProps<{
  data: MenuDetailedExportData
  options?: ExportOptions
}>()

const items = computed(() => props.data.items)
const summary = computed(() => props.data.summary)

function formatCurrency(amount: number): string {
  return exportService.formatCurrency(amount)
}

function getDepartmentLabel(dept: string): string {
  if (dept === 'all') return 'All Departments'
  if (dept === 'kitchen') return 'Kitchen'
  return 'Bar'
}
</script>

<template>
  <div class="menu-detailed-export">
    <!-- Report Header -->
    <div class="report-header">
      <h1 class="report-title">{{ data.title }}</h1>
      <div class="report-meta">
        <span class="report-date">{{ data.date }}</span>
        <span class="report-department">{{ getDepartmentLabel(data.department) }}</span>
      </div>
    </div>

    <!-- Summary -->
    <div class="report-summary">
      <div class="summary-item">
        <span class="summary-label">Total Items:</span>
        <span class="summary-value">{{ summary.totalItems }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Variants:</span>
        <span class="summary-value">{{ summary.totalVariants }}</span>
      </div>
    </div>

    <!-- Each Menu Item -->
    <div v-for="(item, idx) in items" :key="idx" class="menu-item-section menu-item-block">
      <div v-if="idx > 0" class="item-divider">
        <hr class="section-divider" />
      </div>

      <!-- Render each item using CombinationsExportTemplate -->
      <CombinationsExportTemplate :data="item" :options="options" />
    </div>
  </div>
</template>

<style scoped>
.menu-detailed-export {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 11px;
  color: #333;
}

.report-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #1565c0;
}

.report-title {
  font-size: 24px;
  font-weight: bold;
  color: #1565c0;
  margin: 0 0 10px 0;
}

.report-meta {
  display: flex;
  justify-content: center;
  gap: 20px;
  color: #666;
  font-size: 12px;
}

.report-summary {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 25px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
}

.summary-item {
  display: flex;
  gap: 8px;
}

.summary-label {
  font-weight: 600;
  color: #666;
}

.summary-value {
  font-weight: bold;
  color: #1565c0;
}

.menu-item-section {
  margin-bottom: 20px;
}

/* menu-item-block class is used by html2pdf for page break avoidance */
.menu-item-block {
  page-break-inside: avoid;
}

.item-divider {
  margin: 15px 0;
}

.section-divider {
  border: none;
  border-top: 1px solid #ddd;
  margin: 10px 0;
}

/* Deep styles for nested CombinationsExportTemplate */
:deep(.export-layout) {
  /* Remove the outer wrapper styles since we have our own header */
}

:deep(.export-layout > .export-header) {
  /* Keep item-level headers but make them smaller */
  padding: 10px;
  margin-bottom: 15px;
}

:deep(.export-layout > .export-header .export-title) {
  font-size: 16px;
}
</style>
