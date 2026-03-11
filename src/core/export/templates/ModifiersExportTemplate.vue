<script setup lang="ts">
/**
 * Modifiers Export Template
 * Section 1: Summary list of all modifier groups with options
 * Section 2: Detailed composition tree for each option
 */

import type { ExportOptions } from '../types'
import { exportService } from '../ExportService'
import ExportLayout from './ExportLayout.vue'

// Recursive tree node (mirrors DependencyTree's TreeNode)
export interface ExportTreeNode {
  name: string
  type: 'product' | 'recipe' | 'preparation'
  quantity?: number
  unit?: string
  cost?: number
  outputQuantity?: number
  outputUnit?: string
  totalRecipeCost?: number
  children: ExportTreeNode[]
}

export interface ModifierOptionExportData {
  id: string
  name: string
  priceAdjustment: number
  compositionCost: number
  netCost: number
  isDefault: boolean
  isActive: boolean
  compositionTree: ExportTreeNode[]
}

export interface ModifierGroupExportData {
  id: string
  name: string
  type: 'replacement' | 'addon' | 'removal'
  isRequired: boolean
  minSelection?: number
  maxSelection?: number
  targetComponentNames: string[]
  options: ModifierOptionExportData[]
}

export interface ModifiersExportData {
  title: string
  date: string
  department?: string
  categoryName?: string
  modifierGroups: ModifierGroupExportData[]
}

const props = defineProps<{
  data: ModifiersExportData
  options?: ExportOptions
}>()

function fmt(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0'
  return exportService.formatCurrency(amount)
}

function fmtAdj(amount: number): string {
  if (amount === 0) return '-'
  return (amount > 0 ? '+' : '') + exportService.formatCurrency(amount)
}

function typeLabel(type: string): string {
  switch (type) {
    case 'addon':
      return 'Addon'
    case 'replacement':
      return 'Replacement'
    case 'removal':
      return 'Removal'
    default:
      return type
  }
}

function typeBadgeClass(type: string): string {
  switch (type) {
    case 'addon':
      return 'badge--addon'
    case 'replacement':
      return 'badge--replacement'
    case 'removal':
      return 'badge--removal'
    default:
      return ''
  }
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

// Collect options that have composition (for Section 2)
function getOptionsWithComposition(): Array<{
  groupName: string
  groupType: string
  option: ModifierOptionExportData
}> {
  const results: Array<{ groupName: string; groupType: string; option: ModifierOptionExportData }> =
    []
  for (const group of props.data.modifierGroups) {
    for (const opt of group.options) {
      if (opt.compositionTree.length > 0) {
        results.push({ groupName: group.name, groupType: group.type, option: opt })
      }
    }
  }
  return results
}
</script>

<template>
  <ExportLayout :title="data.title" :date="data.date">
    <!-- Subtitle info -->
    <div v-if="data.department || data.categoryName" class="subtitle-info">
      <span v-if="data.department">{{ data.department }}</span>
      <span v-if="data.department && data.categoryName">&middot;</span>
      <span v-if="data.categoryName">{{ data.categoryName }}</span>
    </div>

    <!-- ============================================ -->
    <!-- SECTION 1: Modifier Groups Summary           -->
    <!-- ============================================ -->
    <div class="section">
      <h2 class="section-title">Modifiers Overview</h2>

      <div v-for="group in data.modifierGroups" :key="group.id" class="group-card">
        <!-- Group header -->
        <div class="group-header">
          <span :class="['type-badge', typeBadgeClass(group.type)]">
            {{ typeLabel(group.type) }}
          </span>
          <span class="group-name">{{ group.name }}</span>
          <span class="group-meta">
            <span
              :class="[
                'req-badge',
                group.isRequired ? 'req-badge--required' : 'req-badge--optional'
              ]"
            >
              {{ group.isRequired ? 'Required' : 'Optional' }}
            </span>
            <span v-if="group.minSelection != null || group.maxSelection != null" class="sel-range">
              {{ group.minSelection ?? 0 }}&ndash;{{ group.maxSelection ?? '∞' }} sel
            </span>
          </span>
        </div>

        <!-- Replacement target -->
        <div
          v-if="group.type === 'replacement' && group.targetComponentNames.length > 0"
          class="replaces-info"
        >
          Replaces: {{ group.targetComponentNames.join(', ') }}
        </div>

        <!-- Options table -->
        <table class="options-table">
          <thead>
            <tr>
              <th class="col-name">Option</th>
              <th class="col-price">Price Adj.</th>
              <th class="col-cost">Cost</th>
              <th v-if="group.type === 'replacement'" class="col-net">Net Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="opt in group.options"
              :key="opt.id"
              :class="{ 'row--inactive': !opt.isActive }"
            >
              <td class="col-name">
                {{ opt.name }}
                <span v-if="opt.isDefault" class="default-badge">default</span>
              </td>
              <td class="col-price">{{ fmtAdj(opt.priceAdjustment) }}</td>
              <td class="col-cost">
                {{ opt.compositionCost > 0 ? fmt(opt.compositionCost) : '-' }}
              </td>
              <td
                v-if="group.type === 'replacement'"
                class="col-net"
                :class="{ 'text-green': opt.netCost < 0, 'text-red': opt.netCost > 0 }"
              >
                {{ opt.netCost !== 0 ? (opt.netCost > 0 ? '+' : '') + fmt(opt.netCost) : '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- SECTION 2: Detailed Composition Trees        -->
    <!-- ============================================ -->
    <div v-if="getOptionsWithComposition().length > 0" class="section page-break-before">
      <h2 class="section-title">Modifier Recipes</h2>

      <div v-for="(entry, idx) in getOptionsWithComposition()" :key="idx" class="recipe-card">
        <div class="recipe-header">
          <span :class="['type-badge', typeBadgeClass(entry.groupType)]">
            {{ typeLabel(entry.groupType) }}
          </span>
          <span class="recipe-group-name">{{ entry.groupName }}</span>
          <span class="recipe-sep">&rarr;</span>
          <span class="recipe-option-name">{{ entry.option.name }}</span>
          <span v-if="entry.option.compositionCost > 0" class="recipe-total-cost">
            {{ fmt(entry.option.compositionCost) }}
          </span>
        </div>

        <!-- Tree rendering -->
        <div class="tree">
          <div v-for="(node, nIdx) in entry.option.compositionTree" :key="nIdx" class="tree-root">
            <!-- Level 0 node -->
            <div class="tree-node tree-node--l0">
              <span :class="['node-badge', nodeTypeBadgeClass(node.type)]">
                {{ nodeTypeBadge(node.type) }}
              </span>
              <span class="node-name">{{ node.name }}</span>
              <span class="node-dots" />
              <span v-if="node.quantity" class="node-qty">{{ node.quantity }} {{ node.unit }}</span>
              <span v-if="node.cost" class="node-cost">{{ fmt(node.cost) }}</span>
            </div>

            <!-- Level 1 children -->
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
                <span v-if="child.cost" class="node-cost">{{ fmt(child.cost) }}</span>
              </div>

              <!-- Level 2 grandchildren -->
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
                <span v-if="gc.cost" class="node-cost">{{ fmt(gc.cost) }}</span>
              </div>
            </div>

            <!-- Batch summary for recipe/preparation nodes -->
            <div v-if="node.totalRecipeCost && node.outputQuantity" class="tree-batch">
              Batch: {{ node.outputQuantity }} {{ node.outputUnit }} =
              <strong>{{ fmt(node.totalRecipeCost) }}</strong>
              <span v-if="node.outputQuantity > 1">
                ({{ fmt(Math.round(node.totalRecipeCost / node.outputQuantity)) }}/{{
                  node.outputUnit
                }})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ExportLayout>
</template>

<style scoped>
/* Subtitle */
.subtitle-info {
  font-size: 13px;
  color: #666;
  margin-top: -12px;
  margin-bottom: 16px;
}

/* Sections */
.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 12px 0;
  padding-bottom: 4px;
  border-bottom: 1.5px solid #333;
}

.page-break-before {
  page-break-before: always;
}

/* Group Card */
.group-card {
  margin-bottom: 18px;
  page-break-inside: avoid;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.group-name {
  font-size: 14px;
  font-weight: 600;
}

.group-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

/* Type badges */
.type-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
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

/* Required/Optional badges */
.req-badge {
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}
.req-badge--required {
  background: #ffebee;
  color: #c62828;
}
.req-badge--optional {
  background: #f5f5f5;
  color: #757575;
}

.sel-range {
  color: #888;
  font-size: 11px;
}

.replaces-info {
  font-size: 11px;
  color: #666;
  font-style: italic;
  margin-bottom: 4px;
  padding-left: 4px;
}

/* Options table */
.options-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-top: 2px;
}

.options-table th {
  text-align: left;
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  color: #666;
  padding: 4px 8px;
  border-bottom: 1px solid #ddd;
}

.options-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #eee;
}

.options-table tr:last-child td {
  border-bottom: none;
}

.col-name {
  width: 50%;
}
.col-price {
  width: 18%;
  text-align: right;
}
.col-cost {
  width: 16%;
  text-align: right;
}
.col-net {
  width: 16%;
  text-align: right;
}

.options-table th.col-price,
.options-table th.col-cost,
.options-table th.col-net {
  text-align: right;
}

.row--inactive {
  color: #aaa;
  text-decoration: line-through;
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

.text-green {
  color: #2e7d32;
}
.text-red {
  color: #c62828;
}

/* =========================================
   SECTION 2: Recipe Trees
   ========================================= */

.recipe-card {
  margin-bottom: 20px;
  page-break-inside: avoid;
}

.recipe-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e0e0e0;
}

.recipe-group-name {
  font-size: 12px;
  color: #666;
}

.recipe-sep {
  color: #999;
  font-size: 12px;
}

.recipe-option-name {
  font-size: 13px;
  font-weight: 600;
}

.recipe-total-cost {
  margin-left: auto;
  font-size: 13px;
  font-weight: 700;
}

/* Tree */
.tree {
  padding: 4px 0;
}

.tree-root {
  margin-bottom: 8px;
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

/* Node type badges */
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
  color: #555;
  font-size: 11px;
}

.node-cost {
  white-space: nowrap;
  font-weight: 600;
  text-align: right;
  min-width: 60px;
}

.tree-batch {
  font-size: 11px;
  color: #888;
  text-align: right;
  padding: 2px 0;
  margin-top: -2px;
}
</style>
