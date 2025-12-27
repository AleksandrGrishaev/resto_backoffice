// src/core/printing/types.ts
// TypeScript interfaces for Bluetooth thermal printer integration

/**
 * Bluetooth Printer Device information
 */
export interface BluetoothPrinterDevice {
  id: string
  name: string
  connected: boolean
  lastConnected?: string // ISO timestamp
}

/**
 * Printer connection state
 */
export type PrinterConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface PrinterConnectionState {
  status: PrinterConnectionStatus
  device: BluetoothPrinterDevice | null
  error?: string
}

/**
 * Printer capabilities (for pos58B thermal printer)
 */
export interface PrinterCapabilities {
  paperWidth: number // mm (57.5 for pos58B)
  printWidth: number // mm (48 for pos58B)
  charsPerLine: number // 32 for 48mm print width
  supportsCut: boolean
  supportsBarcode: boolean
  supportsQR: boolean
}

/**
 * Default capabilities for pos58B printer
 */
export const POS58B_CAPABILITIES: PrinterCapabilities = {
  paperWidth: 57.5,
  printWidth: 48,
  charsPerLine: 32,
  supportsCut: true,
  supportsBarcode: true,
  supportsQR: true
}

// ===== ESC/POS Text Formatting =====

export type TextAlign = 'left' | 'center' | 'right'
export type TextSize = 'normal' | 'double-width' | 'double-height' | 'double'
export type FontType = 'A' | 'B'

export interface TextStyle {
  bold?: boolean
  underline?: boolean
  align?: TextAlign
  size?: TextSize
  font?: FontType
}

// ===== Receipt Data =====

export type ReceiptType = 'pre-bill' | 'payment'

/**
 * Complete receipt data for printing
 */
export interface ReceiptData {
  type: ReceiptType

  // Header
  restaurantName: string
  restaurantAddress?: string
  restaurantPhone?: string

  // Order Info
  orderNumber: string
  tableNumber?: string
  orderType: 'dine_in' | 'takeaway' | 'delivery'
  waiterName?: string
  dateTime: string // Formatted date/time string

  // Items
  items: ReceiptItem[]

  // Discounts
  itemDiscounts?: number
  billDiscount?: number
  billDiscountReason?: string

  // Taxes
  subtotal: number
  subtotalAfterDiscounts?: number
  serviceTax?: number
  serviceTaxPercent?: number
  governmentTax?: number
  governmentTaxPercent?: number
  totalTax?: number

  // Total
  totalAmount: number

  // Payment (only for payment receipt)
  paymentMethod?: string
  receivedAmount?: number
  changeAmount?: number

  // Footer
  paymentNumber?: string
  cashierName?: string
  footerMessage?: string
}

/**
 * Single item in receipt
 */
export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  modifiers?: string[] // e.g., ["No Ice", "Extra Sugar"]
  discount?: number
  notes?: string
}

// ===== Print Result =====

export interface PrintResult {
  success: boolean
  error?: string
  printedAt?: string // ISO timestamp
}

// ===== Printer Settings (stored in database) =====

export interface PrinterSettings {
  id?: string
  restaurantName: string
  restaurantAddress?: string
  restaurantPhone?: string
  footerMessage: string
  autoPrintCashReceipt: boolean
  createdAt?: string
  updatedAt?: string
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  restaurantName: 'Restaurant Name',
  restaurantAddress: '',
  restaurantPhone: '',
  footerMessage: 'Thank you! Come again!',
  autoPrintCashReceipt: true
}

// ===== Bluetooth UUIDs (common for thermal printers) =====

/**
 * Common Bluetooth service and characteristic UUIDs for thermal printers
 * These may vary by printer model - pos58B typically uses these
 */
export const PRINTER_BLUETOOTH_UUIDS = {
  // Common printer service UUIDs (try in order)
  services: [
    '0000ff00-0000-1000-8000-00805f9b34fb', // Most common for cheap thermal printers
    '000018f0-0000-1000-8000-00805f9b34fb', // Some printers use this
    '49535343-fe7d-4ae5-8fa9-9fafd205e455' // Another common UUID
  ],
  // Write characteristic UUIDs
  characteristics: {
    write: [
      '0000ff02-0000-1000-8000-00805f9b34fb', // Most common write characteristic
      '00002af1-0000-1000-8000-00805f9b34fb'
    ]
  }
} as const
