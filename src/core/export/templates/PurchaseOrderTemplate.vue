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
      <div class="header-left">
        <h1 class="document-title">PURCHASE ORDER</h1>
        <div class="order-number">{{ data.orderNumber }}</div>
      </div>
      <div class="header-right">
        <div v-if="data.company" class="company-info">
          <div class="company-name">{{ data.company.name }}</div>
          <div v-if="data.company.address" class="company-detail">{{ data.company.address }}</div>
          <div v-if="data.company.phone" class="company-detail">{{ data.company.phone }}</div>
        </div>
      </div>
    </header>

    <!-- Order Info Section -->
    <div class="info-section">
      <div class="info-block supplier-block">
        <div class="info-label">SUPPLIER</div>
        <div class="info-content">
          <div class="supplier-name">{{ data.supplier.name }}</div>
          <div v-if="data.supplier.address" class="supplier-detail">
            {{ data.supplier.address }}
          </div>
          <div v-if="data.supplier.phone" class="supplier-detail">
            Tel: {{ data.supplier.phone }}
          </div>
          <div v-if="data.supplier.email" class="supplier-detail">{{ data.supplier.email }}</div>
        </div>
      </div>

      <div class="info-block dates-block">
        <div class="date-row">
          <span class="date-label">Order Date:</span>
          <span class="date-value">{{ formatDate(data.date) }}</span>
        </div>
        <div v-if="data.expectedDeliveryDate" class="date-row">
          <span class="date-label">Expected Delivery:</span>
          <span class="date-value">{{ formatDate(data.expectedDeliveryDate) }}</span>
        </div>
        <div class="date-row">
          <span class="date-label">Status:</span>
          <span class="date-value status-badge" :class="data.status">
            {{ data.status.toUpperCase() }}
          </span>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-index">#</th>
          <th class="col-item">Item Description</th>
          <th class="col-qty">Quantity</th>
          <th class="col-package">Package</th>
          <th v-if="showPrices" class="col-price">Price/Pkg</th>
          <th v-if="showPrices" class="col-total">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in data.items" :key="item.index">
          <td class="col-index">{{ item.index }}</td>
          <td class="col-item">
            <div class="item-name">{{ item.itemName }}</div>
            <div v-if="item.itemCode" class="item-code">{{ item.itemCode }}</div>
          </td>
          <td class="col-qty">
            <div class="qty-main">{{ item.baseQuantity }} {{ item.baseUnit }}</div>
          </td>
          <td class="col-package">
            <div>{{ item.packageQuantity }} × {{ item.packageName }}</div>
          </td>
          <td v-if="showPrices" class="col-price">{{ formatCurrency(item.pricePerPackage) }}</td>
          <td v-if="showPrices" class="col-total">{{ formatCurrency(item.totalPrice) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="totals-row">
          <td :colspan="showPrices ? 2 : 4" class="totals-label">
            <strong>TOTAL</strong>
            <span class="totals-info">({{ data.totals.itemCount }} items)</span>
          </td>
          <td v-if="showPrices" colspan="4" class="totals-value">
            <strong>{{ formatCurrency(data.totals.subtotal) }}</strong>
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Notes Section -->
    <div v-if="data.notes" class="notes-section">
      <div class="notes-label">Notes:</div>
      <div class="notes-content">{{ data.notes }}</div>
    </div>

    <!-- Signature Section -->
    <div class="signature-section">
      <div class="signature-block">
        <div class="signature-line"></div>
        <p class="signature-label">Authorized Signature</p>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <p class="signature-label">Date</p>
      </div>
    </div>

    <!-- Terms -->
    <div class="terms-section">
      <div class="terms-title">Terms & Conditions:</div>
      <ul class="terms-list">
        <li>Please confirm receipt of this order within 24 hours</li>
        <li>Delivery must include a copy of this purchase order</li>
        <li>Prices are as agreed unless otherwise negotiated</li>
        <li>Quality must meet specified standards</li>
      </ul>
    </div>

    <!-- Footer -->
    <footer class="po-footer">
      <p>Generated: {{ new Date(data.generatedAt).toLocaleString() }}</p>
    </footer>
  </div>
</template>

<style scoped>
.purchase-order {
  font-family: Arial, sans-serif;
  font-size: 11px;
  line-height: 1.4;
  color: #000;
  background: #fff;
  padding: 10mm 12mm;
  box-sizing: border-box;
}

/* Header */
.po-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 3px solid #2e7d32;
}

.document-title {
  font-size: 28px;
  font-weight: bold;
  color: #2e7d32;
  margin: 0;
  letter-spacing: 2px;
}

.order-number {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-top: 4px;
}

.company-info {
  text-align: right;
}

.company-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.company-detail {
  font-size: 10px;
  color: #666;
  margin-top: 2px;
}

/* Info Section */
.info-section {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 20px;
}

.info-block {
  flex: 1;
}

.info-label {
  font-size: 10px;
  font-weight: bold;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #ddd;
}

.supplier-name {
  font-size: 14px;
  font-weight: bold;
  color: #000;
  margin-bottom: 4px;
}

.supplier-detail {
  font-size: 11px;
  color: #444;
  margin-top: 2px;
}

.dates-block {
  text-align: right;
  max-width: 200px;
}

.date-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 12px;
}

.date-label {
  color: #666;
  font-size: 10px;
}

.date-value {
  font-weight: 600;
  color: #000;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: bold;
}

.status-badge.draft {
  background: #e0e0e0;
  color: #666;
}

.status-badge.sent {
  background: #e3f2fd;
  color: #1565c0;
}

.status-badge.delivered {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.cancelled {
  background: #ffebee;
  color: #c62828;
}

/* Items Table */
.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.items-table th,
.items-table td {
  border: 1px solid #ddd;
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}

.items-table th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  color: #333;
  border-bottom: 2px solid #2e7d32;
}

.items-table tbody tr:nth-child(even) {
  background: #fafafa;
}

.items-table tbody tr:hover {
  background: #f0f7f0;
}

/* Column widths */
.col-index {
  width: 30px;
  text-align: center !important;
}

.col-item {
  min-width: 150px;
}

.col-qty {
  width: 100px;
  text-align: center !important;
}

.col-package {
  width: 120px;
  text-align: center !important;
}

.col-price {
  width: 100px;
  text-align: right !important;
}

.col-total {
  width: 100px;
  text-align: right !important;
  font-weight: 600;
}

.item-name {
  font-weight: 600;
  font-size: 11px;
}

.item-code {
  font-family: monospace;
  font-size: 9px;
  color: #666;
  margin-top: 2px;
}

.qty-main {
  font-weight: 600;
  font-size: 11px;
  color: #2e7d32;
}

/* Totals */
.totals-row td {
  border-top: 2px solid #2e7d32;
  background: #f5f5f5 !important;
  padding: 12px 10px;
}

.totals-label {
  text-align: left !important;
}

.totals-label strong {
  font-size: 12px;
}

.totals-info {
  font-size: 10px;
  color: #666;
  margin-left: 8px;
  font-weight: normal;
}

.totals-value {
  text-align: right !important;
}

.totals-value strong {
  font-size: 14px;
  color: #2e7d32;
}

/* Notes */
.notes-section {
  margin-bottom: 20px;
  padding: 12px;
  background: #fffde7;
  border: 1px solid #ffd54f;
  border-radius: 4px;
}

.notes-label {
  font-weight: bold;
  font-size: 10px;
  color: #f57f17;
  margin-bottom: 4px;
}

.notes-content {
  font-size: 11px;
  color: #333;
  white-space: pre-wrap;
}

/* Signature */
.signature-section {
  display: flex;
  justify-content: space-between;
  gap: 40px;
  margin: 30px 0 20px;
}

.signature-block {
  flex: 1;
  max-width: 200px;
}

.signature-line {
  border-bottom: 1px solid #000;
  min-height: 40px;
  margin-bottom: 4px;
}

.signature-label {
  font-size: 9px;
  color: #666;
  margin: 0;
  text-align: center;
}

/* Terms */
.terms-section {
  margin-top: 20px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 9px;
}

.terms-title {
  font-weight: bold;
  color: #333;
  margin-bottom: 6px;
}

.terms-list {
  margin: 0;
  padding-left: 16px;
  color: #666;
}

.terms-list li {
  margin-bottom: 2px;
}

/* Footer */
.po-footer {
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid #ddd;
  font-size: 8px;
  color: #999;
  text-align: center;
}

.po-footer p {
  margin: 0;
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

  .signature-section {
    page-break-inside: avoid;
  }
}
</style>
