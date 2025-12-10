<script setup lang="ts">
/**
 * Inventory Count Sheet PDF Template
 * A4 Portrait format with table for manual stock counting
 */
import type { InventorySheetData } from '../types'

defineProps<{
  data: InventorySheetData
}>()
</script>

<template>
  <div class="inventory-sheet">
    <!-- Header -->
    <header class="sheet-header">
      <h1 class="sheet-title">{{ data.title }}</h1>
      <div class="sheet-meta">
        <div class="meta-row">
          <span class="meta-label">Department:</span>
          <span class="meta-value">{{ data.subtitle }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Count Date:</span>
          <span class="meta-value">{{ data.date }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Total Items:</span>
          <span class="meta-value">{{ data.summary.totalItems }}</span>
        </div>
      </div>
    </header>

    <!-- Inventory Table -->
    <table class="inventory-table">
      <thead>
        <tr>
          <th class="col-index">#</th>
          <th class="col-name">Item Name</th>
          <th class="col-code">Code</th>
          <th v-if="data.summary.totalCategories > 0" class="col-category">Category</th>
          <th class="col-unit">Unit</th>
          <th class="col-stock">
            System
            <br />
            Stock
          </th>
          <th class="col-actual">
            Actual
            <br />
            Count
          </th>
          <th class="col-diff">Diff</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in data.items" :key="item.index">
          <td class="col-index">{{ item.index }}</td>
          <td class="col-name">{{ item.name }}</td>
          <td class="col-code">{{ item.code }}</td>
          <td v-if="data.summary.totalCategories > 0" class="col-category">
            {{ item.category || '-' }}
          </td>
          <td class="col-unit">{{ item.unit }}</td>
          <td class="col-stock">{{ item.currentStock }}</td>
          <td class="col-actual write-cell"></td>
          <td class="col-diff write-cell"></td>
        </tr>
      </tbody>
    </table>

    <!-- Summary Section -->
    <div class="sheet-summary">
      <div class="summary-box">
        <span class="summary-label">Total Items Counted:</span>
        <span class="summary-line"></span>
      </div>
      <div class="summary-box">
        <span class="summary-label">Items with Discrepancy:</span>
        <span class="summary-line"></span>
      </div>
    </div>

    <!-- Signature Section -->
    <div v-if="data.showSignatureLine" class="signature-section">
      <div class="signature-block">
        <div class="signature-line"></div>
        <p class="signature-label">Counted By (Name & Signature)</p>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <p class="signature-label">Verified By (Name & Signature)</p>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <p class="signature-label">Date</p>
      </div>
    </div>

    <!-- Footer -->
    <footer class="sheet-footer">
      <p>Generated: {{ new Date(data.generatedAt).toLocaleString() }}</p>
    </footer>
  </div>
</template>

<style scoped>
.inventory-sheet {
  font-family: Arial, sans-serif;
  font-size: 11px;
  line-height: 1.3;
  color: #000;
  background: #fff;
  padding: 8mm 10mm;
  box-sizing: border-box;
}

/* Header */
.sheet-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #000;
}

.sheet-title {
  font-size: 18px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.sheet-meta {
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
.inventory-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.inventory-table th,
.inventory-table td {
  border: 1px solid #333;
  padding: 4px 6px;
  text-align: left;
  vertical-align: middle;
}

.inventory-table th {
  background: #f0f0f0;
  font-weight: 600;
  text-align: center;
  font-size: 10px;
}

.inventory-table tbody tr:nth-child(even) {
  background: #fafafa;
}

/* Column widths */
.col-index {
  width: 28px;
  text-align: center !important;
}

.col-name {
  min-width: 120px;
}

.col-code {
  width: 70px;
  font-family: monospace;
  font-size: 10px;
}

.col-category {
  width: 80px;
  font-size: 10px;
}

.col-unit {
  width: 50px;
  text-align: center !important;
}

.col-stock {
  width: 60px;
  text-align: right !important;
  padding-right: 8px !important;
}

.col-actual {
  width: 70px;
  text-align: center !important;
}

.col-diff {
  width: 60px;
  text-align: center !important;
}

/* Write cells (empty for manual entry) */
.write-cell {
  background: #fff !important;
  min-height: 20px;
}

/* Summary */
.sheet-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 8px 0;
}

.summary-box {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.summary-label {
  font-weight: 600;
  font-size: 11px;
}

.summary-line {
  width: 60px;
  border-bottom: 1px solid #000;
}

/* Signatures */
.signature-section {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 24px;
  padding-top: 16px;
}

.signature-block {
  flex: 1;
  text-align: center;
}

.signature-line {
  border-bottom: 1px solid #000;
  margin-bottom: 4px;
  min-height: 30px;
}

.signature-label {
  font-size: 10px;
  color: #666;
  margin: 0;
}

/* Footer */
.sheet-footer {
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px solid #ccc;
  font-size: 9px;
  color: #999;
  text-align: center;
}

.sheet-footer p {
  margin: 0;
}

/* Print optimization */
@media print {
  .inventory-sheet {
    padding: 0;
  }

  .inventory-table {
    page-break-inside: auto;
  }

  .inventory-table tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
}
</style>
