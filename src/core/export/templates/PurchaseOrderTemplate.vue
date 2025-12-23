<script setup lang="ts">
/**
 * Purchase Order PDF Template
 * Professional A4 format for sending to suppliers
 */
import { computed } from 'vue'
import type { PurchaseOrderExportData } from '../types'

const props = defineProps<{
  data: PurchaseOrderExportData
}>()

// Show prices unless explicitly disabled
const showPrices = computed(() => props.data.includePrices !== false)

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="purchase-order">
    <!-- Header -->
    <header class="po-header">
      <h1 class="document-title">Purchase Order</h1>
      <div class="order-number">{{ data.orderNumber }}</div>
    </header>

    <!-- Order Info Section - Minimal -->
    <div class="info-section">
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">{{ formatDate(data.date) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Supplier:</span>
        <span class="info-value">{{ data.supplier.name }}</span>
      </div>
    </div>

    <!-- Items Table - Simplified -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-index">#</th>
          <th class="col-item">Item Name</th>
          <th class="col-total">Total</th>
          <th class="col-package">Package</th>
          <th class="col-qty">Quantity</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in data.items" :key="item.index">
          <td class="col-index">{{ item.index }}</td>
          <td class="col-item">{{ item.itemName }}</td>
          <td class="col-total">{{ item.baseQuantity }} {{ item.baseUnit }}</td>
          <td class="col-package">{{ item.packageName }}</td>
          <td class="col-qty">{{ item.packageQuantity }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.purchase-order {
  font-family: Arial, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  color: #000;
  background: #fff;
  padding: 20px;
  box-sizing: border-box;
}

/* Header - Simplified */
.po-header {
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #333;
}

.document-title {
  font-size: 24px;
  font-weight: bold;
  color: #000;
  margin: 0 0 8px 0;
}

.order-number {
  font-size: 16px;
  color: #666;
  margin: 0;
}

/* Info Section - Minimal */
.info-section {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  gap: 12px;
}

.info-label {
  font-weight: 600;
  color: #666;
  min-width: 70px;
}

.info-value {
  color: #000;
}

/* Items Table - Clean and Simple */
.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.items-table th,
.items-table td {
  border: 1px solid #ddd;
  padding: 10px 12px;
  text-align: left;
}

.items-table th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  color: #555;
}

.items-table tbody tr:nth-child(even) {
  background: #fafafa;
}

/* Column widths */
.col-index {
  width: 40px;
  text-align: center !important;
}

.col-item {
  width: auto;
  min-width: 180px;
}

.col-total {
  width: 120px;
  text-align: right !important;
  font-weight: 600;
}

.col-package {
  width: 120px;
}

.col-qty {
  width: 80px;
  text-align: center !important;
}

/* Print optimization */
@media print {
  .purchase-order {
    padding: 0;
  }

  .items-table {
    page-break-inside: auto;
  }

  .items-table tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
}
</style>
