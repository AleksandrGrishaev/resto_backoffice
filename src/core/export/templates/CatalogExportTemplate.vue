<script setup lang="ts">
/**
 * Catalog Export Template
 * Renders menu items / recipes / preparations with full composition trees
 * Same visual style as ModifiersExportTemplate (tree with dotted leaders)
 */

import type { ExportOptions } from '../types'
import type { ExportTreeNode } from './ModifiersExportTemplate.vue'
import { exportService } from '../ExportService'
import ExportLayout from './ExportLayout.vue'

export interface CatalogExportItem {
  id: string
  name: string
  type: 'menu' | 'recipe' | 'preparation'
  categoryName?: string
  department?: string
  /** For menu items: price of the variant */
  price?: number
  /** Total composition cost */
  cost: number
  /** Food cost % (cost/price) */
  foodCostPercent?: number
  /** Output info (e.g., "1 portion", "500 gram") */
  outputQuantity?: number
  outputUnit?: string
  /** Cost per output unit */
  costPerUnit?: number
  /** Instructions / notes */
  instructions?: string
  /** Composition tree */
  tree: ExportTreeNode[]
  /** For menu items with multiple variants */
  variants?: CatalogExportVariant[]
  /** Modifier groups (for menu items) */
  modifierGroups?: CatalogExportModifierGroup[]
}

export interface CatalogExportVariant {
  name: string
  price: number
  cost: number
  foodCostPercent: number
  tree: ExportTreeNode[]
}

export interface CatalogExportModifierGroup {
  name: string
  type: 'replacement' | 'addon' | 'removal'
  options: CatalogExportModifierOption[]
}

export interface CatalogExportModifierOption {
  name: string
  priceAdjustment: number
  cost: number
  isDefault: boolean
  tree: ExportTreeNode[]
}

export interface CatalogExportData {
  title: string
  date: string
  department?: string
  items: CatalogExportItem[]
  summary?: {
    totalItems: number
    totalCost: number
  }
}

const props = defineProps<{
  data: CatalogExportData
  options?: ExportOptions
}>()

function fmt(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount) || amount === 0) return '-'
  return exportService.formatCurrency(amount)
}

function fmtForce(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0'
  return exportService.formatCurrency(amount)
}

function nodeTypeBadge(type: string): string {
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

function nodeTypeBadgeClass(type: string): string {
  switch (type) {
    case 'product':
      return 'node-badge--product'
    case 'recipe':
      return 'node-badge--recipe'
    case 'preparation':
      return 'node-badge--prep'
    default:
      return ''
  }
}

function itemTypeBadge(type: string): string {
  switch (type) {
    case 'menu':
      return 'MENU'
    case 'recipe':
      return 'RECIPE'
    case 'preparation':
      return 'PREP'
    default:
      return type.toUpperCase()
  }
}

function itemTypeBadgeClass(type: string): string {
  switch (type) {
    case 'menu':
      return 'item-badge--menu'
    case 'recipe':
      return 'item-badge--recipe'
    case 'preparation':
      return 'item-badge--prep'
    default:
      return ''
  }
}

function fcColor(fc: number | undefined): string {
  if (!fc) return ''
  if (fc > 35) return 'fc--red'
  if (fc > 25) return 'fc--orange'
  return 'fc--green'
}

/** Format quantity with batch info for preparation/recipe nodes: "40ml / 500ml" */
function fmtQty(node: ExportTreeNode): string {
  const qty = node.quantity != null ? `${node.quantity} ${node.unit || ''}`.trim() : ''
  if (!qty) return ''
  if (node.outputQuantity && node.outputQuantity !== node.quantity) {
    return `${qty} / ${node.outputQuantity} ${node.outputUnit || ''}`.trim()
  }
  return qty
}

// Group items by category
interface CategoryGroup {
  name: string
  items: CatalogExportItem[]
}

function getGroupedItems(): CategoryGroup[] {
  const map = new Map<string, CatalogExportItem[]>()
  for (const item of props.data.items) {
    const key = item.categoryName || 'Uncategorized'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
}
</script>

<template>
  <ExportLayout :title="data.title" :date="data.date">
    <!-- Legend -->
    <div class="legend">
      <span class="legend-item">
        <span class="node-badge node-badge--product">P</span>
        Product
      </span>
      <span class="legend-item">
        <span class="node-badge node-badge--recipe">R</span>
        Recipe
      </span>
      <span class="legend-item">
        <span class="node-badge node-badge--prep">S</span>
        Semi-finished
      </span>
    </div>

    <!-- Items grouped by category -->
    <div v-for="(group, gIdx) in getGroupedItems()" :key="gIdx" class="category-section">
      <h2 class="category-title">{{ group.name }}</h2>

      <div v-for="item in group.items" :key="item.id" class="item-card">
        <!-- Item header -->
        <div class="item-header">
          <span :class="['item-badge', itemTypeBadgeClass(item.type)]">
            {{ itemTypeBadge(item.type) }}
          </span>
          <span class="item-name">{{ item.name }}</span>
          <span v-if="item.price" class="item-price">{{ fmtForce(item.price) }}</span>
          <span v-if="item.cost > 0" class="item-cost">Cost: {{ fmtForce(item.cost) }}</span>
          <span v-if="item.foodCostPercent" :class="['item-fc', fcColor(item.foodCostPercent)]">
            FC {{ item.foodCostPercent.toFixed(1) }}%
          </span>
        </div>

        <!-- Output info for recipes/preparations -->
        <div v-if="item.outputQuantity" class="item-output">
          Output: {{ item.outputQuantity }} {{ item.outputUnit }}
          <span v-if="item.costPerUnit && item.costPerUnit > 0">
            &middot; {{ fmtForce(item.costPerUnit) }}/{{ item.outputUnit }}
          </span>
        </div>

        <!-- Multi-variant display -->
        <template v-if="item.variants && item.variants.length > 1">
          <div v-for="(v, vIdx) in item.variants" :key="vIdx" class="variant-section">
            <div class="variant-header">
              <span class="variant-name">{{ v.name }}</span>
              <span class="variant-price">{{ fmtForce(v.price) }}</span>
              <span class="variant-cost">Cost: {{ fmtForce(v.cost) }}</span>
              <span :class="['item-fc', fcColor(v.foodCostPercent)]">
                FC {{ v.foodCostPercent.toFixed(1) }}%
              </span>
            </div>
            <!-- Variant tree -->
            <div class="tree">
              <div v-for="(node, nIdx) in v.tree" :key="nIdx" class="tree-root">
                <div class="tree-node tree-node--l0">
                  <span :class="['node-badge', nodeTypeBadgeClass(node.type)]">
                    {{ nodeTypeBadge(node.type) }}
                  </span>
                  <span class="node-name">{{ node.name }}</span>
                  <span class="node-dots" />
                  <span v-if="node.quantity" class="node-qty">
                    {{ fmtQty(node) }}
                  </span>
                  <span v-if="node.cost" class="node-cost">{{ fmtForce(node.cost) }}</span>
                </div>
                <div v-for="(child, cIdx) in node.children" :key="cIdx" class="tree-branch">
                  <div class="tree-node tree-node--l1">
                    <span class="tree-line" />
                    <span :class="['node-badge', nodeTypeBadgeClass(child.type)]">
                      {{ nodeTypeBadge(child.type) }}
                    </span>
                    <span class="node-name">{{ child.name }}</span>
                    <span class="node-dots" />
                    <span v-if="child.quantity" class="node-qty">
                      {{ fmtQty(child) }}
                    </span>
                    <span v-if="child.cost" class="node-cost">{{ fmtForce(child.cost) }}</span>
                  </div>
                  <div
                    v-for="(gc, gcIdx) in child.children"
                    :key="gcIdx"
                    class="tree-node tree-node--l2"
                  >
                    <span class="tree-line tree-line--l2" />
                    <span :class="['node-badge', nodeTypeBadgeClass(gc.type)]">
                      {{ nodeTypeBadge(gc.type) }}
                    </span>
                    <span class="node-name">{{ gc.name }}</span>
                    <span class="node-dots" />
                    <span v-if="gc.quantity" class="node-qty">
                      {{ fmtQty(gc) }}
                    </span>
                    <span v-if="gc.cost" class="node-cost">{{ fmtForce(gc.cost) }}</span>
                  </div>
                </div>
                <div v-if="node.totalRecipeCost && node.outputQuantity" class="tree-batch">
                  Full batch: {{ node.outputQuantity }} {{ node.outputUnit }} =
                  <strong>{{ fmtForce(node.totalRecipeCost) }}</strong>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Single variant / recipe / preparation tree -->
        <template v-else-if="item.tree.length > 0">
          <div class="tree">
            <div v-for="(node, nIdx) in item.tree" :key="nIdx" class="tree-root">
              <div class="tree-node tree-node--l0">
                <span :class="['node-badge', nodeTypeBadgeClass(node.type)]">
                  {{ nodeTypeBadge(node.type) }}
                </span>
                <span class="node-name">{{ node.name }}</span>
                <span class="node-dots" />
                <span v-if="node.quantity" class="node-qty">
                  {{ node.quantity }} {{ node.unit }}
                </span>
                <span v-if="node.cost" class="node-cost">{{ fmtForce(node.cost) }}</span>
              </div>
              <div v-for="(child, cIdx) in node.children" :key="cIdx" class="tree-branch">
                <div class="tree-node tree-node--l1">
                  <span class="tree-line" />
                  <span :class="['node-badge', nodeTypeBadgeClass(child.type)]">
                    {{ nodeTypeBadge(child.type) }}
                  </span>
                  <span class="node-name">{{ child.name }}</span>
                  <span class="node-dots" />
                  <span v-if="child.quantity" class="node-qty">
                    {{ child.quantity }} {{ child.unit }}
                  </span>
                  <span v-if="child.cost" class="node-cost">{{ fmtForce(child.cost) }}</span>
                </div>
                <div
                  v-for="(gc, gcIdx) in child.children"
                  :key="gcIdx"
                  class="tree-node tree-node--l2"
                >
                  <span class="tree-line tree-line--l2" />
                  <span :class="['node-badge', nodeTypeBadgeClass(gc.type)]">
                    {{ nodeTypeBadge(gc.type) }}
                  </span>
                  <span class="node-name">{{ gc.name }}</span>
                  <span class="node-dots" />
                  <span v-if="gc.quantity" class="node-qty">{{ gc.quantity }} {{ gc.unit }}</span>
                  <span v-if="gc.cost" class="node-cost">{{ fmtForce(gc.cost) }}</span>
                </div>
              </div>
              <div v-if="node.totalRecipeCost && node.outputQuantity" class="tree-batch">
                Batch: {{ node.outputQuantity }} {{ node.outputUnit }} =
                <strong>{{ fmtForce(node.totalRecipeCost) }}</strong>
                <span v-if="node.outputQuantity > 1">
                  ({{ fmtForce(Math.round(node.totalRecipeCost / node.outputQuantity)) }}/{{
                    node.outputUnit
                  }})
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- Modifier groups -->
        <template v-if="item.modifierGroups && item.modifierGroups.length > 0">
          <div class="modifiers-section">
            <div class="modifiers-title">Modifiers</div>
            <div v-for="(mg, mgIdx) in item.modifierGroups" :key="mgIdx" class="modifier-group">
              <div class="mg-header">
                <span :class="['type-badge', 'badge--' + mg.type]">{{ mg.type }}</span>
                <span class="mg-name">{{ mg.name }}</span>
              </div>
              <div v-for="(opt, oIdx) in mg.options" :key="oIdx" class="modifier-option-block">
                <div class="mo-header">
                  <span class="mo-name">
                    {{ opt.name }}
                    <span v-if="opt.isDefault" class="default-badge">default</span>
                  </span>
                  <span v-if="opt.priceAdjustment" class="mo-price-adj">
                    {{ opt.priceAdjustment > 0 ? '+' : '' }}{{ fmtForce(opt.priceAdjustment) }}
                  </span>
                  <span v-if="opt.cost > 0" class="mo-cost">{{ fmtForce(opt.cost) }}</span>
                </div>
                <!-- Option composition tree -->
                <div v-if="opt.tree.length > 0" class="tree tree--modifier">
                  <div v-for="(node, nIdx) in opt.tree" :key="nIdx" class="tree-root">
                    <div class="tree-node tree-node--l0">
                      <span :class="['node-badge', nodeTypeBadgeClass(node.type)]">
                        {{ nodeTypeBadge(node.type) }}
                      </span>
                      <span class="node-name">{{ node.name }}</span>
                      <span class="node-dots" />
                      <span v-if="node.quantity" class="node-qty">
                        {{ node.quantity }} {{ node.unit }}
                      </span>
                      <span v-if="node.cost" class="node-cost">{{ fmtForce(node.cost) }}</span>
                    </div>
                    <div v-for="(child, cIdx) in node.children" :key="cIdx" class="tree-branch">
                      <div class="tree-node tree-node--l1">
                        <span class="tree-line" />
                        <span :class="['node-badge', nodeTypeBadgeClass(child.type)]">
                          {{ nodeTypeBadge(child.type) }}
                        </span>
                        <span class="node-name">{{ child.name }}</span>
                        <span class="node-dots" />
                        <span v-if="child.quantity" class="node-qty">
                          {{ child.quantity }} {{ child.unit }}
                        </span>
                        <span v-if="child.cost" class="node-cost">
                          {{ fmtForce(child.cost) }}
                        </span>
                      </div>
                      <div
                        v-for="(gc, gcIdx) in child.children"
                        :key="gcIdx"
                        class="tree-node tree-node--l2"
                      >
                        <span class="tree-line tree-line--l2" />
                        <span :class="['node-badge', nodeTypeBadgeClass(gc.type)]">
                          {{ nodeTypeBadge(gc.type) }}
                        </span>
                        <span class="node-name">{{ gc.name }}</span>
                        <span class="node-dots" />
                        <span v-if="gc.quantity" class="node-qty">
                          {{ gc.quantity }} {{ gc.unit }}
                        </span>
                        <span v-if="gc.cost" class="node-cost">{{ fmtForce(gc.cost) }}</span>
                      </div>
                    </div>
                    <div v-if="node.totalRecipeCost && node.outputQuantity" class="tree-batch">
                      Batch: {{ node.outputQuantity }} {{ node.outputUnit }} =
                      <strong>{{ fmtForce(node.totalRecipeCost) }}</strong>
                      <span v-if="node.outputQuantity > 1">
                        ({{ fmtForce(Math.round(node.totalRecipeCost / node.outputQuantity)) }}/{{
                          node.outputUnit
                        }})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Instructions -->
        <div v-if="item.instructions" class="item-instructions">
          <strong>Instructions:</strong>
          {{ item.instructions }}
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div v-if="data.summary" class="export-summary">
      <strong>Total Items:</strong>
      {{ data.summary.totalItems }}
      &middot;
      <strong>Total Cost:</strong>
      {{ fmtForce(data.summary.totalCost) }}
    </div>
  </ExportLayout>
</template>

<style scoped>
/* Legend */
.legend {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 11px;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* Category */
.category-section {
  margin-bottom: 24px;
}
.category-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 2px solid #333;
}

/* Item card */
.item-card {
  margin-bottom: 20px;
  margin-left: 4px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.item-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  color: #fff;
}
.item-badge--menu {
  background: #7b1fa2;
}
.item-badge--recipe {
  background: #388e3c;
}
.item-badge--prep {
  background: #f57c00;
}

.item-name {
  font-size: 15px;
  font-weight: 700;
}

.item-price {
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.item-cost {
  font-size: 12px;
  color: #555;
}

.item-fc {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
}
.fc--green {
  background: #e8f5e9;
  color: #2e7d32;
}
.fc--orange {
  background: #fff3e0;
  color: #e65100;
}
.fc--red {
  background: #ffebee;
  color: #c62828;
}

.item-output {
  font-size: 11px;
  color: #666;
  margin-bottom: 6px;
}

/* Variant sections */
.variant-section {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed #ddd;
}
.variant-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
}
.variant-name {
  font-weight: 600;
}
.variant-price {
  margin-left: auto;
  font-weight: 600;
}
.variant-cost {
  color: #555;
}

/* Tree (same as ModifiersExportTemplate) */
.tree {
  padding: 4px 0;
}
.tree--modifier {
  padding-left: 8px;
}
.tree-root {
  margin-bottom: 6px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 12px;
}
.tree-node--l0 {
  font-weight: 500;
}
.tree-node--l1 {
  padding-left: 24px;
}
.tree-node--l2 {
  padding-left: 48px;
}

.tree-branch {
  border-left: 1px solid #ccc;
  margin-left: 8px;
}
.tree-branch > .tree-node--l1 {
  padding-left: 16px;
}
.tree-branch > .tree-node--l2 {
  padding-left: 40px;
}

.tree-line {
  display: inline-block;
  width: 12px;
  height: 1px;
  background: #ccc;
  vertical-align: middle;
  flex-shrink: 0;
}
.tree-line--l2 {
  width: 12px;
}

.node-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.node-badge--product {
  background: #1976d2;
}
.node-badge--recipe {
  background: #388e3c;
}
.node-badge--prep {
  background: #f57c00;
}

.node-name {
  white-space: nowrap;
}
.node-dots {
  flex: 1;
  border-bottom: 1px dotted #ccc;
  min-width: 20px;
  height: 0;
  align-self: flex-end;
  margin-bottom: 3px;
}
.node-qty {
  white-space: nowrap;
  font-weight: 600;
  font-size: 12px;
  color: #333;
}
.node-cost {
  white-space: nowrap;
  font-weight: 400;
  color: #888;
  font-size: 11px;
  text-align: right;
  min-width: 55px;
}

.tree-batch {
  font-size: 11px;
  color: #888;
  text-align: right;
  padding: 2px 0;
  margin-top: -2px;
}

/* Modifiers */
.modifiers-section {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}
.modifiers-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 6px;
}
.modifier-group {
  margin-bottom: 10px;
}
.mg-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.mg-name {
  font-size: 12px;
  font-weight: 600;
}

.type-badge {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  color: #fff;
}
.badge--addon {
  background: #f9a825;
}
.badge--replacement {
  background: #00897b;
}
.badge--removal {
  background: #757575;
}

.modifier-option-block {
  margin-bottom: 6px;
  margin-left: 4px;
}
.mo-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 2px;
}
.mo-name {
  font-weight: 500;
}
.mo-price-adj {
  color: #666;
  margin-left: auto;
}
.mo-cost {
  font-weight: 600;
}

.default-badge {
  display: inline-block;
  padding: 0 4px;
  margin-left: 4px;
  border-radius: 2px;
  font-size: 9px;
  font-weight: 600;
  background: #e3f2fd;
  color: #1565c0;
  vertical-align: middle;
}

/* Instructions */
.item-instructions {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed #ccc;
  font-size: 11px;
  color: #444;
}

/* Summary */
.export-summary {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px solid #333;
  font-size: 13px;
}
</style>
