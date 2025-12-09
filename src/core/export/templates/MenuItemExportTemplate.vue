<script setup lang="ts">
/**
 * Menu Item Export Template
 * Shows a single menu item with variants, composition, costs, and optional recipe details
 */

import { computed } from 'vue'
import type { MenuItemExportData, ExportOptions } from '../types'
import { exportService } from '../ExportService'
import ExportLayout from './ExportLayout.vue'

const props = defineProps<{
  data: MenuItemExportData
  options?: ExportOptions
}>()

const item = computed(() => props.data.item)
const includeRecipes = computed(() => props.data.includeRecipes ?? false)

function formatCurrency(amount: number): string {
  return exportService.formatCurrency(amount)
}

function formatPercent(value: number): string {
  return exportService.formatPercent(value)
}

function formatQuantity(qty: number | null | undefined, unit: string | null | undefined): string {
  const q = qty ?? 1
  const u = unit ?? 'portion'
  return `${q} ${u}`
}

function getDepartmentLabel(dept: 'kitchen' | 'bar'): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function getDishTypeLabel(type: 'simple' | 'modifiable'): string {
  return type === 'simple' ? 'Simple Dish' : 'Customizable Dish'
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

function getRoleLabel(role?: string): string {
  if (!role) return ''
  const labels: Record<string, string> = {
    main: 'Main',
    garnish: 'Side',
    sauce: 'Sauce',
    addon: 'Add-on'
  }
  return labels[role] || role
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

    <!-- Legend -->
    <div class="legend">
      <span class="legend-title">Components:</span>
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
    </div>

    <!-- Variants -->
    <div class="variants-section">
      <h2 class="section-title">Variants</h2>

      <div v-for="(variant, vIdx) in item.variants" :key="vIdx" class="variant-card">
        <div class="variant-header">
          <h3 class="variant-name">{{ variant.name || 'Standard' }}</h3>
          <div class="variant-price">{{ formatCurrency(variant.price) }}</div>
        </div>

        <!-- Variant Summary -->
        <div class="variant-summary">
          <div class="summary-item">
            <span class="summary-label">Cost:</span>
            <span class="summary-value">{{ formatCurrency(variant.cost) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Food Cost:</span>
            <span class="summary-value" :class="{ 'high-cost': variant.foodCostPercent > 35 }">
              {{ formatPercent(variant.foodCostPercent) }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Margin:</span>
            <span class="summary-value margin">{{ formatCurrency(variant.margin) }}</span>
          </div>
        </div>

        <!-- Composition Table -->
        <table v-if="variant.composition.length > 0" class="composition-table">
          <thead>
            <tr>
              <th class="col-name">Component</th>
              <th v-if="variant.composition.some(c => c.role)" class="col-role">Role</th>
              <th class="col-qty">Quantity</th>
              <th class="col-cost">Cost</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(comp, cIdx) in variant.composition" :key="cIdx">
              <!-- Main component row -->
              <tr class="comp-row">
                <td class="col-name">
                  <span class="comp-name-wrapper">
                    <span class="comp-type" :class="comp.type">
                      {{ getComponentTypeLabel(comp.type) }}
                    </span>
                    <span>{{ comp.name }}</span>
                  </span>
                </td>
                <td v-if="variant.composition.some(c => c.role)" class="col-role">
                  {{ getRoleLabel(comp.role) }}
                </td>
                <td class="col-qty">{{ formatQuantity(comp.quantity, comp.unit) }}</td>
                <td class="col-cost">{{ formatCurrency(comp.cost) }}</td>
              </tr>

              <!-- Nested components (if includeRecipes and has nested) -->
              <template v-if="includeRecipes && comp.nestedComponents?.length">
                <tr
                  v-for="(nested, nIdx) in comp.nestedComponents"
                  :key="`${cIdx}-${nIdx}`"
                  class="nested-row"
                >
                  <td class="col-name nested-name">
                    <span class="comp-name-wrapper">
                      <span class="nested-indent"></span>
                      <span class="comp-type" :class="nested.type">
                        {{ getComponentTypeLabel(nested.type) }}
                      </span>
                      <span>{{ nested.name }}</span>
                    </span>
                  </td>
                  <td v-if="variant.composition.some(c => c.role)" class="col-role"></td>
                  <td class="col-qty nested-qty">
                    {{ formatQuantity(nested.quantity, nested.unit) }}
                  </td>
                  <td class="col-cost nested-cost">{{ formatCurrency(nested.cost) }}</td>
                </tr>
              </template>
            </template>
          </tbody>
          <tfoot>
            <tr>
              <td :colspan="variant.composition.some(c => c.role) ? 3 : 2" class="total-label">
                Total Cost
              </td>
              <td class="col-cost total-value">{{ formatCurrency(variant.cost) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Modifiers Section (if modifiable) -->
    <div
      v-if="item.dishType === 'modifiable' && item.modifierGroups?.length"
      class="modifiers-section"
    >
      <h2 class="section-title">Modifiers</h2>

      <div v-for="(group, gIdx) in item.modifierGroups" :key="gIdx" class="modifier-group">
        <div class="modifier-header">
          <h4 class="modifier-name">{{ group.name }}</h4>
          <div class="modifier-badges">
            <span class="modifier-type" :class="group.type">{{ group.type }}</span>
            <span v-if="group.isRequired" class="required-badge">Required</span>
          </div>
        </div>

        <div class="modifier-options">
          <div v-for="(option, oIdx) in group.options" :key="oIdx" class="modifier-option">
            <span class="option-name">
              {{ option.name }}
              <span v-if="option.isDefault" class="default-badge">default</span>
            </span>
            <span v-if="option.priceAdjustment !== 0" class="option-price">
              {{ option.priceAdjustment > 0 ? '+' : ''
              }}{{ formatCurrency(option.priceAdjustment) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </ExportLayout>
</template>

<style scoped>
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

.section-title {
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 2px solid #333;
  color: #333;
}

.variants-section {
  margin-bottom: 24px;
}

.variant-card {
  margin-bottom: 20px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.variant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.variant-name {
  font-size: 14px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.variant-price {
  font-size: 16px;
  font-weight: bold;
  color: #1976d2;
}

.variant-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
}

.summary-item {
  display: flex;
  gap: 6px;
}

.summary-label {
  color: #666;
}

.summary-value {
  font-weight: 600;
  color: #333;
}

.summary-value.high-cost {
  color: #d32f2f;
}

.summary-value.margin {
  color: #388e3c;
}

.composition-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.composition-table th,
.composition-table td {
  padding: 6px 8px;
  border: 1px solid #ddd;
}

.composition-table th {
  background: #f5f5f5;
  font-weight: bold;
  text-align: left;
}

.col-name {
  width: 45%;
}

.col-role {
  width: 15%;
  text-align: center;
}

.col-qty {
  width: 20%;
  text-align: center;
}

.col-cost {
  width: 20%;
  text-align: right;
}

.comp-row {
  background: white;
}

.nested-row {
  background: #fafafa;
}

.nested-name {
  padding-left: 24px !important;
}

.nested-indent {
  display: inline-block;
  width: 16px;
  margin-right: 4px;
  border-left: 1px solid #ccc;
  height: 12px;
}

.nested-qty,
.nested-cost {
  font-size: 10px;
  color: #666;
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

.total-label {
  text-align: right;
  font-weight: bold;
}

.total-value {
  font-weight: bold;
  background: #f9f9f9;
}

/* Modifiers Section */
.modifiers-section {
  margin-top: 24px;
}

.modifier-group {
  margin-bottom: 16px;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.modifier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.modifier-name {
  font-size: 12px;
  font-weight: bold;
  margin: 0;
}

.modifier-badges {
  display: flex;
  gap: 6px;
}

.modifier-type {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
}

.modifier-type.replacement {
  background: #e3f2fd;
  color: #1565c0;
}

.modifier-type.addon {
  background: #e8f5e9;
  color: #2e7d32;
}

.modifier-type.removal {
  background: #ffebee;
  color: #c62828;
}

.required-badge {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 3px;
  background: #fff3e0;
  color: #e65100;
}

.default-badge {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 2px;
  background: #e0e0e0;
  color: #666;
  margin-left: 4px;
}

.modifier-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modifier-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: #f9f9f9;
  border-radius: 3px;
  font-size: 11px;
}

.option-name {
  color: #333;
}

.option-price {
  font-weight: 600;
  color: #1976d2;
}
</style>
