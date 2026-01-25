// src/stores/analytics/varianceReportStore.ts
// ✅ Product Variance Report Store
// Analyzes discrepancies between purchases and usage

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import { supabase } from '@/supabase/client'
import type { VarianceReport, ProductVarianceRow } from './types'

const MODULE_NAME = 'VarianceReportStore'

export const useVarianceReportStore = defineStore('varianceReport', () => {
  // State
  const currentReport = ref<VarianceReport | null>(null)
  const loading = ref(false)
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
   * Clear current report
   */
  function clearReport(): void {
    currentReport.value = null
    error.value = null
  }

  return {
    // State
    currentReport,
    loading,
    error,

    // Actions
    generateReport,
    exportToCSV,
    exportToJSON,
    downloadCSV,
    clearReport
  }
})
