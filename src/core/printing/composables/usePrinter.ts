// src/core/printing/composables/usePrinter.ts
// Vue composable for printer operations

import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePrinterStore } from '@/stores/printing/printerStore'
import type { ReceiptData, PrinterSettings, PrintResult } from '../types'

/**
 * Vue Composable for Printer Operations
 *
 * Provides easy access to printer functionality in Vue components.
 *
 * @example
 * ```vue
 * <script setup>
 * const {
 *   isConnected,
 *   connect,
 *   printPreBill,
 *   printPaymentReceipt
 * } = usePrinter()
 *
 * async function handlePrint() {
 *   if (!isConnected.value) {
 *     await connect()
 *   }
 *   await printPreBill(receiptData)
 * }
 * </script>
 * ```
 */
export function usePrinter() {
  const printerStore = usePrinterStore()

  // Get reactive refs from store
  const { status, device, error, settings, isConnected, isConnecting, isAvailable } =
    storeToRefs(printerStore)

  // Initialize store on first use
  onMounted(() => {
    if (!printerStore.initialized) {
      printerStore.initialize()
    }
  })

  // ===== Connection =====

  /**
   * Connect to a Bluetooth printer
   * Shows browser's Bluetooth device picker
   * Must be called from a user gesture (click event)
   */
  async function connect(): Promise<boolean> {
    return printerStore.connect()
  }

  /**
   * Disconnect from the printer
   */
  async function disconnect(): Promise<void> {
    return printerStore.disconnect()
  }

  // ===== Printing =====

  /**
   * Print a pre-bill receipt
   * @param receiptData Receipt data (order info, items, totals)
   */
  async function printPreBill(receiptData: ReceiptData): Promise<PrintResult> {
    return printerStore.printPreBill(receiptData)
  }

  /**
   * Print a payment receipt
   * @param receiptData Receipt data (order info, items, totals, payment info)
   */
  async function printPaymentReceipt(receiptData: ReceiptData): Promise<PrintResult> {
    return printerStore.printPaymentReceipt(receiptData)
  }

  /**
   * Print a test receipt
   */
  async function testPrint(): Promise<PrintResult> {
    return printerStore.printTest()
  }

  // ===== Settings =====

  /**
   * Update printer settings
   */
  async function updateSettings(newSettings: Partial<PrinterSettings>): Promise<boolean> {
    return printerStore.saveSettings(newSettings)
  }

  // ===== Computed Helpers =====

  /**
   * Should auto-print for cash payments
   */
  const autoPrintCash = computed(() => settings.value.autoPrintCashReceipt)

  /**
   * Device name (if connected)
   */
  const deviceName = computed(() => device.value?.name || null)

  /**
   * Connection status text for display
   */
  const statusText = computed(() => {
    switch (status.value) {
      case 'connected':
        return `Connected: ${device.value?.name || 'Printer'}`
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return error.value || 'Connection error'
      default:
        return 'Not connected'
    }
  })

  return {
    // State (readonly)
    status,
    device,
    error,
    settings,

    // Computed
    isConnected,
    isConnecting,
    isAvailable,
    autoPrintCash,
    deviceName,
    statusText,

    // Connection
    connect,
    disconnect,

    // Printing
    printPreBill,
    printPaymentReceipt,
    testPrint,

    // Settings
    updateSettings
  }
}
