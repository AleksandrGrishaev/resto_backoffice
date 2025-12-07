<script setup lang="ts">
/**
 * Menu Export Template
 * Shows menu items with variants, costs, prices, and margins
 */

import { computed } from 'vue'
import type { MenuExportData, ExportOptions } from '../types'
import { exportService } from '../ExportService'
import ExportLayout from './ExportLayout.vue'

const props = defineProps<{
  data: MenuExportData
  options?: ExportOptions
}>()

const hasData = computed(() => {
  return props.data && props.data.categories && props.data.categories.length > 0
})

// Format dish type for display
function formatDishType(type: string): string {
  const types: Record<string, string> = {
    simple: 'S',
    'component-based': 'C',
    'addon-based': 'A'
  }
  return types[type] || type
}

function formatCurrency(amount: number): string {
  return exportService.formatCurrency(amount)
}

function formatPercent(value: number): string {
  return exportService.formatPercent(value)
}
</script>

<template>
  <ExportLayout :title="data?.title || 'Menu Report'" :date="data?.date || ''">
    <!-- Legend -->
    <div class="legend">
      <span class="legend-item">
        <span class="dish-type simple">S</span>
        Simple
      </span>
      <span class="legend-item">
        <span class="dish-type component">C</span>
        Component-based
      </span>
      <span class="legend-item">
        <span class="dish-type addon">A</span>
        Addon-based
      </span>
    </div>

    <!-- Debug info -->
    <div v-if="!hasData" class="no-data">
      <p>No menu data available for export.</p>
    </div>

    <!-- Categories -->
    <template v-if="hasData">
      <div v-for="category in data.categories" :key="category.name" class="category">
        <h2 class="category-name">{{ category.name }}</h2>

        <table class="items-table">
          <thead>
            <tr>
              <th class="col-name">Item / Variant</th>
              <th class="col-number">Cost</th>
              <th class="col-number">Price</th>
              <th class="col-number">Margin</th>
              <th class="col-number">%</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in category.items" :key="item.name">
              <!-- Item header row -->
              <tr class="item-row">
                <td class="col-name item-name" :colspan="item.variants.length === 1 ? 1 : 5">
                  {{ item.name }}
                  <span class="dish-type" :class="item.dishType">
                    {{ formatDishType(item.dishType) }}
                  </span>
                </td>
                <!-- If single variant, show data inline -->
                <template v-if="item.variants.length === 1">
                  <td class="col-number">{{ formatCurrency(item.variants[0].cost) }}</td>
                  <td class="col-number">{{ formatCurrency(item.variants[0].price) }}</td>
                  <td class="col-number">{{ formatCurrency(item.variants[0].margin) }}</td>
                  <td
                    class="col-number"
                    :class="{ 'low-margin': item.variants[0].marginPercent < 30 }"
                  >
                    {{ formatPercent(item.variants[0].marginPercent) }}
                  </td>
                </template>
              </tr>
              <!-- Variant rows (only if multiple variants) -->
              <tr
                v-for="variant in item.variants.length > 1 ? item.variants : []"
                :key="variant.name"
                class="variant-row"
              >
                <td class="col-name variant-name">↳ {{ variant.name }}</td>
                <td class="col-number">{{ formatCurrency(variant.cost) }}</td>
                <td class="col-number">{{ formatCurrency(variant.price) }}</td>
                <td class="col-number">{{ formatCurrency(variant.margin) }}</td>
                <td class="col-number" :class="{ 'low-margin': variant.marginPercent < 30 }">
                  {{ formatPercent(variant.marginPercent) }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div v-if="data.totals" class="totals">
        <p>
          <strong>Total Variants:</strong>
          {{ data.totals.itemCount }}
        </p>
        <p>
          <strong>Total Cost:</strong>
          {{ formatCurrency(data.totals.totalCost) }}
        </p>
      </div>
    </template>
  </ExportLayout>
</template>

<style scoped>
.legend {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 11px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.category {
  margin-bottom: 20px;
  page-break-inside: avoid;
}

.category-name {
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid #ccc;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.items-table th,
.items-table td {
  padding: 4px 8px;
  border: 1px solid #ddd;
}

.items-table th {
  background: #f5f5f5;
  font-weight: bold;
  text-align: left;
}

.col-name {
  width: 40%;
}

.col-number {
  width: 15%;
  text-align: right;
}

.item-row {
  background: #fafafa;
}

.item-name {
  font-weight: bold;
}

.variant-row {
  background: white;
}

.variant-name {
  padding-left: 20px !important;
  color: #555;
}

.dish-type {
  display: inline-block;
  font-size: 9px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 6px;
  vertical-align: middle;
}

.dish-type.simple {
  background: #e8f5e9;
  color: #2e7d32;
}

.dish-type.component-based,
.dish-type.component {
  background: #e3f2fd;
  color: #1565c0;
}

.dish-type.addon-based,
.dish-type.addon {
  background: #fff3e0;
  color: #e65100;
}

.low-margin {
  color: #c00;
  font-weight: bold;
}

.totals {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 2px solid #000;
  font-size: 14px;
}

.totals p {
  margin: 4px 0;
}

.no-data {
  padding: 40px;
  text-align: center;
  color: #666;
}
</style>
