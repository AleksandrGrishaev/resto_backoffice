// src/stores/analytics/varianceReportStore.ts
// ✅ Product Variance Report Store
// Analyzes discrepancies between purchases and usage
// V2: Includes preparation traceability

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import { supabase } from '@/supabase/client'
import type {
  VarianceReport,
  ProductVarianceRow,
  VarianceReportV2,
  ProductVarianceRowV2,
  ProductVarianceDetail
} from './types'

const MODULE_NAME = 'VarianceReportStore'

export const useVarianceReportStore = defineStore('varianceReport', () => {
  // State
  const currentReport = ref<VarianceReport | null>(null)
  const currentReportV2 = ref<VarianceReportV2 | null>(null)
  const currentDetail = ref<ProductVarianceDetail | null>(null)
  const loading = ref(false)
  const loadingDetail = ref(false)
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
   * Generate Product Variance Report V2 with preparation traceability
   * Shows combined Sales and Loss (direct + traced through preparations)
   * Formula: Loss % = (Total Loss) / (Total Sales) × 100
   */
  async function generateReportV2(
    dateFrom: string,
    dateTo: string,
    department: 'kitchen' | 'bar' | null = null
  ): Promise<VarianceReportV2> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Generating variance report V2', {
        dateFrom,
        dateTo,
        department
      })

      // Call the V2 RPC function
      const { data, error: rpcError } = await supabase.rpc('get_product_variance_report_v2', {
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
          totalSalesAmount: data.summary.totalSalesAmount,
          totalLossAmount: data.summary.totalLossAmount,
          overallLossPercent: data.summary.overallLossPercent
        },
        byDepartment: {
          kitchen: {
            count: data.byDepartment.kitchen?.count || 0,
            salesAmount: data.byDepartment.kitchen?.salesAmount || 0,
            lossAmount: data.byDepartment.kitchen?.lossAmount || 0,
            lossPercent: data.byDepartment.kitchen?.lossPercent || 0
          },
          bar: {
            count: data.byDepartment.bar?.count || 0,
            salesAmount: data.byDepartment.bar?.salesAmount || 0,
            lossAmount: data.byDepartment.bar?.lossAmount || 0,
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
            opening: item.opening,
            received: item.received,
            sales: item.sales,
            loss: item.loss,
            closing: item.closing,
            variance: item.variance,
            directSales: item.directSales,
            directLoss: item.directLoss,
            tracedSales: item.tracedSales,
            tracedLoss: item.tracedLoss,
            hasPreparations: item.hasPreparations,
            lossPercent: item.lossPercent
          })
        ),
        generatedAt: data.generatedAt,
        departmentFilter: data.departmentFilter
      }

      currentReportV2.value = report

      DebugUtils.info(MODULE_NAME, 'Variance report V2 generated', {
        totalProducts: report.summary.totalProducts,
        productsWithActivity: report.summary.productsWithActivity,
        overallLossPercent: report.summary.overallLossPercent
      })

      return report
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate variance report V2'
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
   * Export V2 report to CSV format (simplified view)
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
      'Sales Qty',
      'Sales Amount',
      'Loss Qty',
      'Loss Amount',
      'Stock Qty',
      'Stock Amount',
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
      item.loss.quantity,
      item.loss.amount,
      item.closing.quantity,
      item.closing.amount,
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
   * Clear current report
   */
  function clearReport(): void {
    currentReport.value = null
    currentReportV2.value = null
    currentDetail.value = null
    error.value = null
  }

  return {
    // State
    currentReport,
    currentReportV2,
    currentDetail,
    loading,
    loadingDetail,
    error,

    // Actions - V1 (legacy)
    generateReport,
    exportToCSV,
    exportToJSON,
    downloadCSV,

    // Actions - V2 (with preparation traceability)
    generateReportV2,
    getProductDetail,
    exportToCSVV2,
    downloadCSVV2,

    // Common
    clearReport
  }
})
