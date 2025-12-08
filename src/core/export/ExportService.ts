/**
 * PDF Export Service
 * Uses html2pdf.js to convert Vue components to PDF
 */

import type { Html2PdfOptions, ExportOptions } from './types'

// Dynamic import for html2pdf.js (browser-only)
let html2pdfModule: unknown = null

async function getHtml2Pdf() {
  if (!html2pdfModule) {
    const module = await import('html2pdf.js')
    html2pdfModule = module.default
  }
  return html2pdfModule as {
    (): {
      from: (element: HTMLElement) => {
        set: (options: Html2PdfOptions) => {
          save: () => Promise<void>
        }
      }
    }
  }
}

export class ExportService {
  private static instance: ExportService

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService()
    }
    return ExportService.instance
  }

  /**
   * Generate PDF from HTML element
   */
  async generatePdf(element: HTMLElement, options: ExportOptions = {}): Promise<void> {
    const html2pdf = await getHtml2Pdf()

    // Margins: [top, left, bottom, right]
    const isLandscape = options.orientation === 'landscape'
    const top = isLandscape ? 10 : 15
    const bottom = isLandscape ? 15 : 20 // More bottom margin to prevent overlap
    const leftRight = isLandscape ? 8 : 12

    const pdfOptions: Html2PdfOptions = {
      margin: [top, leftRight, bottom, leftRight],
      filename: options.filename || 'export.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: {
        unit: 'mm',
        format: options.pageSize || 'a4',
        orientation: options.orientation || 'portrait'
      },
      pagebreak: {
        mode: ['css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: '.avoid-break'
      }
    }

    // Use chain API: html2pdf().from(element).set(options).save()
    await html2pdf().from(element).set(pdfOptions).save()
  }

  /**
   * Generate filename with date
   */
  generateFilename(prefix: string, extension = 'pdf'): string {
    const date = new Date().toISOString().split('T')[0]
    return `${prefix}_${date}.${extension}`
  }

  /**
   * Format date for display in PDF
   */
  formatDate(date: Date = new Date()): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  /**
   * Format currency for PDF (IDR)
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format percentage
   */
  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`
  }
}

export const exportService = ExportService.getInstance()
