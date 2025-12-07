/**
 * Type declarations for html2pdf.js
 */

declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | [number, number, number, number]
    filename?: string
    image?: { type: string; quality: number }
    html2canvas?: { scale: number; useCORS?: boolean; logging?: boolean }
    jsPDF?: { unit: string; format: string; orientation: string }
    pagebreak?: { mode?: string | string[]; before?: string[]; after?: string[]; avoid?: string[] }
  }

  interface Html2PdfWorker {
    from(element: HTMLElement | string): Html2PdfWorker
    set(options: Html2PdfOptions): Html2PdfWorker
    save(): Promise<void>
    output(type: 'blob'): Promise<Blob>
    output(type: 'datauristring'): Promise<string>
    outputPdf(type: 'blob'): Promise<Blob>
    outputPdf(type: 'datauristring'): Promise<string>
  }

  function html2pdf(): Html2PdfWorker
  function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Html2PdfWorker

  export default html2pdf
}
