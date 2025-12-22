/**
 * PDF Export Service
 * Uses html2pdf.js to convert Vue components to PDF
 */

import type { Html2PdfOptions, ExportOptions } from './types'

// Dynamic import for html2pdf.js (browser-only)
let html2pdfModule: unknown = null

interface Html2PdfWorker {
  from: (element: HTMLElement) => Html2PdfWorker
  set: (options: Html2PdfOptions) => Html2PdfWorker
  toPdf: () => Html2PdfWorker
  get: (type: string) => Promise<JsPdfInstance>
  save: () => Promise<void>
}

interface JsPdfInstance {
  internal: {
    getNumberOfPages: () => number
    pageSize: {
      getWidth: () => number
      getHeight: () => number
    }
  }
  setPage: (pageNum: number) => void
  setFontSize: (size: number) => void
  setTextColor: (r: number, g: number, b: number) => void
  text: (text: string, x: number, y: number, options?: { align?: string }) => void
  save: (filename: string) => void
}

async function getHtml2Pdf() {
  if (!html2pdfModule) {
    const module = await import('html2pdf.js')
    html2pdfModule = module.default
  }
  return html2pdfModule as () => Html2PdfWorker
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
   * Generate PDF from HTML element and return as Blob
   * Used for sharing/preview without immediate download
   */
  async generatePdfBlob(element: HTMLElement, options: ExportOptions = {}): Promise<Blob> {
    const html2pdf = await getHtml2Pdf()

    // Margins: [top, left, bottom, right]
    const isLandscape = options.orientation === 'landscape'
    const top = isLandscape ? 10 : 15
    // Add extra bottom margin for page numbers
    const showPageNumbers = options.showPageNumbers !== false // Default to true
    const bottom = showPageNumbers ? (isLandscape ? 18 : 22) : isLandscape ? 15 : 20
    const leftRight = isLandscape ? 8 : 12

    // Calculate appropriate scale based on content height
    const contentHeight = element.scrollHeight
    const contentWidth = element.scrollWidth
    const estimatedCanvasHeight = contentHeight * 2 // Default scale is 2
    const MAX_CANVAS_PIXELS = 200_000_000 // Conservative limit (200M pixels)
    const MAX_CANVAS_DIMENSION = 16384

    let scale = 2 // Default high quality
    if (
      estimatedCanvasHeight > MAX_CANVAS_DIMENSION ||
      contentWidth * 2 * estimatedCanvasHeight > MAX_CANVAS_PIXELS
    ) {
      // Calculate safe scale
      const maxScaleByDimension = MAX_CANVAS_DIMENSION / contentHeight
      const maxScaleByArea = Math.sqrt(MAX_CANVAS_PIXELS / (contentWidth * contentHeight))
      scale = Math.min(maxScaleByDimension, maxScaleByArea, 2)
      scale = Math.max(scale, 1) // Don't go below 1
      console.log(
        `[ExportService] Large document detected (${contentWidth}x${contentHeight}), reducing scale from 2 to ${scale.toFixed(2)}`
      )
    }

    const pdfOptions: Html2PdfOptions = {
      margin: [top, leftRight, bottom, leftRight],
      filename: options.filename || 'export.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale,
        useCORS: true,
        logging: false,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0
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
        avoid: options.avoidPageBreaks
          ? '.avoid-break, .menu-item-block, .recipe-card'
          : '.avoid-break'
      }
    }

    try {
      console.log('[ExportService] Starting PDF blob generation...')
      const worker = html2pdf().from(element).set(pdfOptions).toPdf()
      const pdf = await worker.get('pdf')

      // Add page numbers if enabled
      if (showPageNumbers) {
        const totalPages = pdf.internal.getNumberOfPages()
        console.log(`[ExportService] PDF generated with ${totalPages} pages`)

        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()

        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i)
          pdf.setFontSize(9)
          pdf.setTextColor(128, 128, 128) // Gray color
          pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
        }
      }

      // Get PDF as Blob
      const blob = await worker.get('blob')
      console.log('[ExportService] PDF blob generated successfully')
      return blob
    } catch (error) {
      console.error('[ExportService] PDF blob generation failed:', error)
      throw error
    }
  }

  /**
   * Generate PDF from HTML element
   */
  async generatePdf(element: HTMLElement, options: ExportOptions = {}): Promise<void> {
    const html2pdf = await getHtml2Pdf()

    // Margins: [top, left, bottom, right]
    const isLandscape = options.orientation === 'landscape'
    const top = isLandscape ? 10 : 15
    // Add extra bottom margin for page numbers
    const showPageNumbers = options.showPageNumbers !== false // Default to true
    const bottom = showPageNumbers ? (isLandscape ? 18 : 22) : isLandscape ? 15 : 20
    const leftRight = isLandscape ? 8 : 12

    // Calculate appropriate scale based on content height
    // Browser canvas has size limits (~16384px per dimension or ~268M pixels total)
    // For very large documents, reduce scale to stay within limits
    const contentHeight = element.scrollHeight
    const contentWidth = element.scrollWidth
    const estimatedCanvasHeight = contentHeight * 2 // Default scale is 2
    const MAX_CANVAS_PIXELS = 200_000_000 // Conservative limit (200M pixels)
    const MAX_CANVAS_DIMENSION = 16384

    let scale = 2 // Default high quality
    if (
      estimatedCanvasHeight > MAX_CANVAS_DIMENSION ||
      contentWidth * 2 * estimatedCanvasHeight > MAX_CANVAS_PIXELS
    ) {
      // Calculate safe scale
      const maxScaleByDimension = MAX_CANVAS_DIMENSION / contentHeight
      const maxScaleByArea = Math.sqrt(MAX_CANVAS_PIXELS / (contentWidth * contentHeight))
      scale = Math.min(maxScaleByDimension, maxScaleByArea, 2)
      scale = Math.max(scale, 1) // Don't go below 1
      console.log(
        `[ExportService] Large document detected (${contentWidth}x${contentHeight}), reducing scale from 2 to ${scale.toFixed(2)}`
      )
    }

    const pdfOptions: Html2PdfOptions = {
      margin: [top, leftRight, bottom, leftRight],
      filename: options.filename || 'export.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale,
        useCORS: true,
        logging: false, // Disable verbose logging
        allowTaint: true,
        scrollX: 0,
        scrollY: 0
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
        avoid: options.avoidPageBreaks
          ? '.avoid-break, .menu-item-block, .recipe-card'
          : '.avoid-break'
      }
    }

    try {
      // If page numbers are enabled, use callback to add them
      if (showPageNumbers) {
        console.log('[ExportService] Starting PDF generation with page numbers...')
        const worker = html2pdf().from(element).set(pdfOptions).toPdf()
        const pdf = await worker.get('pdf')

        const totalPages = pdf.internal.getNumberOfPages()
        console.log(`[ExportService] PDF generated with ${totalPages} pages`)

        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()

        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i)
          pdf.setFontSize(9)
          pdf.setTextColor(128, 128, 128) // Gray color
          pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
        }

        pdf.save(options.filename || 'export.pdf')
        console.log('[ExportService] PDF saved successfully')
      } else {
        // Simple export without page numbers
        console.log('[ExportService] Starting simple PDF generation...')
        await html2pdf().from(element).set(pdfOptions).save()
        console.log('[ExportService] PDF saved successfully')
      }
    } catch (error) {
      console.error('[ExportService] PDF generation failed:', error)
      throw error
    }
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
