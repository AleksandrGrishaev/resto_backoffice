// src/stores/analytics/varianceReportStore.ts
// ✅ Product Variance Report Store
// Analyzes discrepancies between purchases and usage
// V3: Theoretical sales from orders + actual write-offs for comparison

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import { supabase } from '@/supabase/client'
import type {
  VarianceReport,
  ProductVarianceRow,
  VarianceReportV2,
  ProductVarianceRowV2,
  ProductVarianceDetail,
  ProductVarianceDetailV2
} from './types'

const MODULE_NAME = 'VarianceReportStore'

export const useVarianceReportStore = defineStore('varianceReport', () => {
  // State
  const currentReport = ref<VarianceReport | null>(null)
  const currentReportV2 = ref<VarianceReportV2 | null>(null)
  const currentDetail = ref<ProductVarianceDetail | null>(null)
  const currentDetailV2 = ref<ProductVarianceDetailV2 | null>(null)
  const loading = ref(false)
  const loadingDetail = ref(false)
  const loadingDetailV2 = ref(false)
  const error = ref<string | null>(null)

  /**
   * Generate Product Variance Report for a specific period
   * Formula: Opening + Received - Sales - Prep - Loss - Closing = Variance
   */
  async function generateReport(
    dateFrom: string,
    dateTo: string,
    department: 'kitchen' | 'bar' | null = null
  ): Promise<VarianceReport> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Generating variance report', {
        dateFrom,
        dateTo,
        department
      })

      // Call the RPC function
      const { data, error: rpcError } = await supabase.rpc('get_product_variance_report', {
        p_start_date: dateFrom,
        p_end_date: dateTo,
        p_department: department
      })

      if (rpcError) {
        throw new Error(`RPC error: ${rpcError.message}`)
      }

      if (!data) {
        throw new Error('No data returned from RPC function')
      }

      // Transform the response to match our TypeScript types
      const report: VarianceReport = {
        period: {
          dateFrom: data.period.dateFrom,
          dateTo: data.period.dateTo
        },
        summary: {
          totalProducts: data.summary.totalProducts,
          productsWithVariance: data.summary.productsWithVariance,
          totalVarianceAmount: data.summary.totalVarianceAmount,
          totalReceivedAmount: data.summary.totalReceivedAmount,
          totalSalesWriteOffAmount: data.summary.totalSalesWriteOffAmount,
          totalPrepWriteOffAmount: data.summary.totalPrepWriteOffAmount,
          totalLossWriteOffAmount: data.summary.totalLossWriteOffAmount
        },
        byDepartment: {
          kitchen: {
            count: data.byDepartment.kitchen?.count || 0,
            varianceAmount: data.byDepartment.kitchen?.varianceAmount || 0
          },
          bar: {
            count: data.byDepartment.bar?.count || 0,
            varianceAmount: data.byDepartment.bar?.varianceAmount || 0
          }
        },
        items: (data.items || []).map(
          (item: any): ProductVarianceRow => ({
            productId: item.productId,
            productName: item.productName,
            productCode: item.productCode,
            unit: item.unit,
            department: item.department,
            openingStock: item.openingStock,
            received: item.received,
            salesWriteOff: item.salesWriteOff,
            prepWriteOff: item.prepWriteOff,
            lossWriteOff: item.lossWriteOff,
            closingStock: item.closingStock,
            variance: item.variance
          })
        ),
        generatedAt: data.generatedAt,
        departmentFilter: data.departmentFilter
      }

      currentReport.value = report

      DebugUtils.info(MODULE_NAME, 'Variance report generated', {
        totalProducts: report.summary.totalProducts,
        productsWithVariance: report.summary.productsWithVariance,
        totalVariance: report.summary.totalVarianceAmount
      })

      return report
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate variance report'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Generate Product Variance Report V2 (V3 backend) with theoretical sales from orders
   * Shows:
   * - Theoretical Sales (from orders decomposition) - MAIN metric
   * - Actual Write-offs (from storage_operations) - for comparison
   * Formula: Variance = Opening + Received - Sales - Loss - Closing
   */
  async function generateReportV2(
    dateFrom: string,
    dateTo: string,
    department: 'kitchen' | 'bar' | null = null
  ): Promise<VarianceReportV2> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Generating variance report V3', {
        dateFrom,
        dateTo,
        department
      })

      // Call the V3 RPC function (theoretical sales from orders)
      const { data, error: rpcError } = await supabase.rpc('get_product_variance_report_v3', {
        p_start_date: dateFrom,
        p_end_date: dateTo,
        p_department: department
      })

      if (rpcError) {
        throw new Error(`RPC error: ${rpcError.message}`)
      }

      if (!data) {
        throw new Error('No data returned from RPC function')
      }

      // Transform the response to match our TypeScript types
      const report: VarianceReportV2 = {
        period: {
          dateFrom: data.period.dateFrom,
          dateTo: data.period.dateTo
        },
        summary: {
          totalProducts: data.summary.totalProducts,
          productsWithActivity: data.summary.productsWithActivity,
          // V3: Use theoretical sales as main sales amount
          totalSalesAmount: data.summary.totalTheoreticalSalesAmount || 0,
          totalLossAmount: data.summary.totalLossAmount,
          totalInPrepsAmount: data.summary.totalInPrepsAmount || 0,
          totalVarianceAmount: data.summary.totalVarianceAmount || 0,
          overallLossPercent: data.summary.overallLossPercent
        },
        byDepartment: {
          kitchen: {
            count: data.byDepartment.kitchen?.count || 0,
            // V3: Use theoretical sales
            salesAmount: data.byDepartment.kitchen?.theoreticalSalesAmount || 0,
            lossAmount: data.byDepartment.kitchen?.lossAmount || 0,
            inPrepsAmount: data.byDepartment.kitchen?.inPrepsAmount || 0,
            varianceAmount: data.byDepartment.kitchen?.varianceAmount || 0,
            lossPercent: data.byDepartment.kitchen?.lossPercent || 0
          },
          bar: {
            count: data.byDepartment.bar?.count || 0,
            // V3: Use theoretical sales
            salesAmount: data.byDepartment.bar?.theoreticalSalesAmount || 0,
            lossAmount: data.byDepartment.bar?.lossAmount || 0,
            inPrepsAmount: data.byDepartment.bar?.inPrepsAmount || 0,
            varianceAmount: data.byDepartment.bar?.varianceAmount || 0,
            lossPercent: data.byDepartment.bar?.lossPercent || 0
          }
        },
        items: (data.items || []).map(
          (item: any): ProductVarianceRowV2 => ({
            productId: item.productId,
            productName: item.productName,
            productCode: item.productCode,
            unit: item.unit,
            department: item.department,
            // Stock movement
            opening: item.opening || { quantity: 0, amount: 0 },
            received: item.received || { quantity: 0, amount: 0 },
            // V3: Theoretical sales from orders (MAIN)
            sales: item.sales || { quantity: 0, amount: 0 },
            // V3: Actual write-offs (for comparison)
            writeoffs: item.writeoffs || { quantity: 0, amount: 0 },
            directWriteoffs: item.directWriteoffs || { quantity: 0, amount: 0 },
            tracedWriteoffs: item.tracedWriteoffs || { quantity: 0, amount: 0 },
            // Loss
            loss: item.loss || { quantity: 0, amount: 0 },
            directLoss: item.directLoss || { quantity: 0, amount: 0 },
            tracedLoss: item.tracedLoss || { quantity: 0, amount: 0 },
            // Closing & Variance
            closing: item.closing || { quantity: 0, amount: 0 },
            inPreps: item.inPreps || { quantity: 0, amount: 0 },
            stockTotal: item.stockTotal || { quantity: 0, amount: 0 },
            variance: item.variance || { quantity: 0, amount: 0 },
            // V3: Sales vs Writeoffs difference
            salesWriteoffDiff: item.salesWriteoffDiff || { quantity: 0, amount: 0 },
            // Flags & calculated
            hasPreparations: item.hasPreparations || false,
            lossPercent: item.lossPercent ?? 0
          })
        ),
        generatedAt: data.generatedAt,
        departmentFilter: data.departmentFilter
      }

      currentReportV2.value = report

      DebugUtils.info(MODULE_NAME, 'Variance report V3 generated', {
        totalProducts: report.summary.totalProducts,
        productsWithActivity: report.summary.productsWithActivity,
        totalSalesAmount: report.summary.totalSalesAmount,
        overallLossPercent: report.summary.overallLossPercent
      })

      return report
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate variance report'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get detailed variance breakdown for a single product
   * Shows all preparations that use this product with their sales/losses
   */
  async function getProductDetail(
    productId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<ProductVarianceDetail> {
    try {
      loadingDetail.value = true

      DebugUtils.info(MODULE_NAME, 'Getting product variance detail', {
        productId,
        dateFrom,
        dateTo
      })

      // Call the detail RPC function
      const { data, error: rpcError } = await supabase.rpc('get_product_variance_details', {
        p_product_id: productId,
        p_start_date: dateFrom,
        p_end_date: dateTo
      })

      if (rpcError) {
        throw new Error(`RPC error: ${rpcError.message}`)
      }

      if (!data) {
        throw new Error('No data returned from RPC function')
      }

      // Transform the response
      const detail: ProductVarianceDetail = {
        product: {
          id: data.product.id,
          name: data.product.name,
          code: data.product.code,
          unit: data.product.unit,
          department: data.product.department
        },
        period: {
          dateFrom: data.period.dateFrom,
          dateTo: data.period.dateTo
        },
        directSales: data.directSales,
        directLoss: data.directLoss,
        production: data.production,
        lossByReason: data.lossByReason || [],
        preparations: (data.preparations || []).map((prep: any) => ({
          preparationId: prep.preparationId,
          preparationName: prep.preparationName,
          production: prep.production,
          tracedSales: prep.tracedSales,
          tracedLoss: prep.tracedLoss
        })),
        tracedTotals: data.tracedTotals,
        generatedAt: data.generatedAt
      }

      currentDetail.value = detail

      DebugUtils.info(MODULE_NAME, 'Product variance detail retrieved', {
        productName: detail.product.name,
        preparationsCount: detail.preparations.length
      })

      return detail
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get product variance detail'
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loadingDetail.value = false
    }
  }

  /**
   * Export report to CSV format
   */
  function exportToCSV(report: VarianceReport): string {
    const headers = [
      'Product',
      'Code',
      'Unit',
      'Department',
      'Opening Qty',
      'Opening Amount',
      'Received Qty',
      'Received Amount',
      'Sales W/O Qty',
      'Sales W/O Amount',
      'Prep W/O Qty',
      'Prep W/O Amount',
      'Loss W/O Qty',
      'Loss W/O Amount',
      'Closing Qty',
      'Closing Amount',
      'Variance Qty',
      'Variance Amount'
    ]

    const rows = report.items.map(item => [
      `"${item.productName}"`,
      item.productCode || '',
      item.unit,
      item.department,
      item.openingStock.quantity,
      item.openingStock.amount,
      item.received.quantity,
      item.received.amount,
      item.salesWriteOff.quantity,
      item.salesWriteOff.amount,
      item.prepWriteOff.quantity,
      item.prepWriteOff.amount,
      item.lossWriteOff.quantity,
      item.lossWriteOff.amount,
      item.closingStock.quantity,
      item.closingStock.amount,
      item.variance.quantity,
      item.variance.amount
    ])

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

    return csvContent
  }

  /**
   * Export report to JSON format
   */
  function exportToJSON(report: VarianceReport): string {
    return JSON.stringify(report, null, 2)
  }

  /**
   * Download CSV file
   */
  function downloadCSV(report: VarianceReport): void {
    const csv = exportToCSV(report)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `variance-report-${report.period.dateFrom}-${report.period.dateTo}.csv`
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Export V2 report to CSV format (V3 with theoretical sales + write-offs)
   */
  function exportToCSVV2(report: VarianceReportV2): string {
    const headers = [
      'Product',
      'Code',
      'Unit',
      'Department',
      'Opening Qty',
      'Opening Amount',
      'Received Qty',
      'Received Amount',
      'Sales (Theoretical) Qty',
      'Sales (Theoretical) Amount',
      'Write-offs (Actual) Qty',
      'Write-offs (Actual) Amount',
      'Sales-Writeoff Diff Qty',
      'Sales-Writeoff Diff Amount',
      'Loss Qty',
      'Loss Amount',
      'Raw Stock Qty',
      'Raw Stock Amount',
      'In Preps Qty',
      'In Preps Amount',
      'Stock Total Qty',
      'Stock Total Amount',
      'Variance Qty',
      'Variance Amount',
      'Loss %',
      'Has Preparations'
    ]

    const rows = report.items.map(item => [
      `"${item.productName}"`,
      item.productCode || '',
      item.unit,
      item.department,
      item.opening.quantity,
      item.opening.amount,
      item.received.quantity,
      item.received.amount,
      item.sales.quantity,
      item.sales.amount,
      item.writeoffs?.quantity ?? 0,
      item.writeoffs?.amount ?? 0,
      item.salesWriteoffDiff?.quantity ?? 0,
      item.salesWriteoffDiff?.amount ?? 0,
      item.loss.quantity,
      item.loss.amount,
      item.closing.quantity,
      item.closing.amount,
      item.inPreps?.quantity ?? 0,
      item.inPreps?.amount ?? 0,
      item.stockTotal?.quantity ?? 0,
      item.stockTotal?.amount ?? 0,
      item.variance.quantity,
      item.variance.amount,
      (item.lossPercent ?? 0).toFixed(2),
      item.hasPreparations ? 'Yes' : 'No'
    ])

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

    return csvContent
  }

  /**
   * Download V2 CSV file
   */
  function downloadCSVV2(report: VarianceReportV2): void {
    const csv = exportToCSVV2(report)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `variance-report-v2-${report.period.dateFrom}-${report.period.dateTo}.csv`
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Get detailed variance breakdown V2 for a single product
   * Enhanced version with complete drill-down into source documents
   */
  async function getProductDetailV2(
    productId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<ProductVarianceDetailV2> {
    try {
      loadingDetailV2.value = true

      DebugUtils.info(MODULE_NAME, 'Getting product variance detail V2', {
        productId,
        dateFrom,
        dateTo
      })

      // Call the V2 detail RPC function
      const { data, error: rpcError } = await supabase.rpc('get_product_variance_details_v2', {
        p_product_id: productId,
        p_start_date: dateFrom,
        p_end_date: dateTo
      })

      if (rpcError) {
        throw new Error(`RPC error: ${rpcError.message}`)
      }

      if (!data) {
        throw new Error('No data returned from RPC function')
      }

      // Transform the response to match TypeScript types
      const detail: ProductVarianceDetailV2 = {
        product: {
          id: data.product?.id || productId,
          name: data.product?.name || 'Unknown Product',
          code: data.product?.code || null,
          unit: data.product?.unit || 'unit',
          department: data.product?.department || 'kitchen'
        },
        period: {
          dateFrom: data.period?.dateFrom || dateFrom,
          dateTo: data.period?.dateTo || dateTo
        },
        opening: {
          quantity: data.opening?.quantity ?? 0,
          amount: data.opening?.amount ?? 0,
          snapshot: data.opening?.snapshot || null
        },
        received: {
          quantity: data.received?.quantity ?? 0,
          amount: data.received?.amount ?? 0,
          receipts: data.received?.receipts || [],
          totalReceiptsCount: data.received?.totalReceiptsCount ?? 0
        },
        sales: {
          quantity: data.sales?.quantity ?? 0,
          amount: data.sales?.amount ?? 0,
          direct: data.sales?.direct || { quantity: 0, amount: 0 },
          viaPreparations: data.sales?.viaPreparations || { quantity: 0, amount: 0 },
          topMenuItems: data.sales?.topMenuItems || [],
          totalMenuItemsCount: data.sales?.totalMenuItemsCount ?? 0,
          preparations: data.sales?.preparations || []
        },
        loss: {
          quantity: data.loss?.quantity ?? 0,
          amount: data.loss?.amount ?? 0,
          byReason: data.loss?.byReason || [],
          details: data.loss?.details || [],
          tracedFromPreps: data.loss?.tracedFromPreps || {
            quantity: 0,
            amount: 0,
            preparations: []
          }
        },
        closing: {
          rawStock: {
            quantity: data.closing?.rawStock?.quantity ?? 0,
            amount: data.closing?.rawStock?.amount ?? 0,
            batches: data.closing?.rawStock?.batches || []
          },
          inPreparations: {
            quantity: data.closing?.inPreparations?.quantity ?? 0,
            amount: data.closing?.inPreparations?.amount ?? 0,
            preparations: data.closing?.inPreparations?.preparations || []
          },
          total: data.closing?.total || { quantity: 0, amount: 0 }
        },
        variance: {
          quantity: data.variance?.quantity ?? 0,
          amount: data.variance?.amount ?? 0,
          interpretation: data.variance?.interpretation || 'balanced',
          possibleReasons: data.variance?.possibleReasons || []
        },
        // Analysis section - actual write-offs vs theoretical
        actualWriteOffs: data.actualWriteOffs
          ? {
              salesConsumption: {
                quantity: data.actualWriteOffs.salesConsumption?.quantity ?? 0,
                amount: data.actualWriteOffs.salesConsumption?.amount ?? 0,
                operationsCount: data.actualWriteOffs.salesConsumption?.operationsCount ?? 0
              },
              productionConsumption: {
                quantity: data.actualWriteOffs.productionConsumption?.quantity ?? 0,
                amount: data.actualWriteOffs.productionConsumption?.amount ?? 0,
                operationsCount: data.actualWriteOffs.productionConsumption?.operationsCount ?? 0,
                details: data.actualWriteOffs.productionConsumption?.details || []
              },
              corrections: {
                quantity: data.actualWriteOffs.corrections?.quantity ?? 0,
                amount: data.actualWriteOffs.corrections?.amount ?? 0,
                operationsCount: data.actualWriteOffs.corrections?.operationsCount ?? 0,
                details: data.actualWriteOffs.corrections?.details || []
              },
              total: {
                quantity: data.actualWriteOffs.total?.quantity ?? 0,
                amount: data.actualWriteOffs.total?.amount ?? 0
              },
              differenceFromTheoretical: {
                quantity: data.actualWriteOffs.differenceFromTheoretical?.quantity ?? 0,
                amount: data.actualWriteOffs.differenceFromTheoretical?.amount ?? 0,
                interpretation:
                  data.actualWriteOffs.differenceFromTheoretical?.interpretation || 'matched'
              }
            }
          : undefined,
        generatedAt: data.generatedAt || new Date().toISOString()
      }

      currentDetailV2.value = detail

      DebugUtils.info(MODULE_NAME, 'Product variance detail V2 retrieved', {
        productName: detail.product.name,
        variance: detail.variance.interpretation
      })

      return detail
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to get product variance detail V2'
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loadingDetailV2.value = false
    }
  }

  /**
   * Clear current report
   */
  function clearReport(): void {
    currentReport.value = null
    currentReportV2.value = null
    currentDetail.value = null
    currentDetailV2.value = null
    error.value = null
  }

  return {
    // State
    currentReport,
    currentReportV2,
    currentDetail,
    currentDetailV2,
    loading,
    loadingDetail,
    loadingDetailV2,
    error,

    // Actions - V1 (legacy)
    generateReport,
    exportToCSV,
    exportToJSON,
    downloadCSV,

    // Actions - V2 (with preparation traceability)
    generateReportV2,
    getProductDetail,
    getProductDetailV2,
    exportToCSVV2,
    downloadCSVV2,

    // Common
    clearReport
  }
})
