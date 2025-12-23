/**
 * WhatsApp Export Composable
 * Handles WhatsApp message formatting and sending for purchase orders
 */

import { ref } from 'vue'
import type { PurchaseOrder } from '../types'
import { useCounteragentsStore } from '@/stores/counteragents'
import { TimeUtils } from '@/utils'
import {
  buildWhatsAppUrl,
  openWhatsApp,
  validateMessageLength,
  truncateMessage,
  isValidPhoneNumber,
  getPhoneValidationError
} from '@/utils/whatsapp'

export interface WhatsAppExportResult {
  success: boolean
  url?: string
  error?: string
  canCopy?: boolean // If phone missing, offer copy option
  message?: string // Formatted message for copying
}

export function useWhatsAppExport() {
  const counteragentsStore = useCounteragentsStore()
  const isSending = ref(false)
  const lastGeneratedMessage = ref<string>('')

  /**
   * Format purchase order as WhatsApp message
   * Simplified format: order number, date, supplier, items (no prices, no notes, no delivery date)
   */
  function formatOrderMessage(order: PurchaseOrder): string {
    // Format date
    const formattedDate = TimeUtils.formatDateForDisplay(new Date(order.orderDate))

    // Build items list
    const itemsList = order.items
      .map((item, index) => {
        const num = index + 1

        // Format: Name - TotalQuantity unit (PackageName × PackageQty)
        // Example: Ginger - 2250 kg (1000 kg × 2.25)
        const totalQuantity = item.orderedQuantity
        const unit = item.unit

        let itemLine = `${num}. ${item.itemName} - ${totalQuantity} ${unit}`

        // Add package info in parentheses if available
        if (item.packageName && item.packageQuantity) {
          itemLine += ` (${item.packageName} × ${item.packageQuantity})`
        }

        return itemLine
      })
      .join('\n')

    // Calculate total items count
    const totalItems = order.items.length

    // Build message (minimal format, no emojis for compatibility)
    const message = `Purchase Order: ${order.orderNumber}
Date: ${formattedDate}
Supplier: ${order.supplierName}

Total: ${totalItems} items

Items:
${itemsList}`

    return message
  }

  /**
   * Validate if order can be sent via WhatsApp
   */
  function validateOrder(order: PurchaseOrder): WhatsAppExportResult {
    // Check if order has items
    if (!order.items || order.items.length === 0) {
      return {
        success: false,
        error: 'Order has no items'
      }
    }

    // Get supplier details
    const supplier = counteragentsStore.counteragents?.find(c => c.id === order.supplierId)

    // Check if supplier has phone number
    if (!supplier?.phone) {
      // Allow copying message even without phone
      const message = formatOrderMessage(order)
      return {
        success: false,
        error: 'Supplier phone number not set',
        canCopy: true,
        message
      }
    }

    // Validate phone number format
    if (!isValidPhoneNumber(supplier.phone)) {
      const validationError = getPhoneValidationError(supplier.phone)
      return {
        success: false,
        error: `Invalid phone number: ${validationError}`,
        canCopy: true,
        message: formatOrderMessage(order)
      }
    }

    // Format message and check length
    let message = formatOrderMessage(order)
    const lengthValidation = validateMessageLength(message)

    // If message too long, truncate
    if (!lengthValidation.isValid) {
      message = truncateMessage(message, '\n\n...and more items')
    }

    // Build WhatsApp URL
    const url = buildWhatsAppUrl({
      phone: supplier.phone,
      message
    })

    if (!url) {
      return {
        success: false,
        error: 'Failed to build WhatsApp URL',
        canCopy: true,
        message
      }
    }

    return {
      success: true,
      url,
      message
    }
  }

  /**
   * Send order via WhatsApp
   */
  async function sendOrder(order: PurchaseOrder): Promise<WhatsAppExportResult> {
    isSending.value = true

    try {
      // Validate order
      const validation = validateOrder(order)

      if (!validation.success) {
        return validation
      }

      // Store message for potential copying
      if (validation.message) {
        lastGeneratedMessage.value = validation.message
      }

      // Open WhatsApp
      if (validation.url) {
        const opened = openWhatsApp({
          phone:
            counteragentsStore.counteragents?.find(c => c.id === order.supplierId)?.phone || '',
          message: validation.message || ''
        })

        if (!opened) {
          return {
            success: false,
            error: 'Failed to open WhatsApp',
            canCopy: true,
            message: validation.message
          }
        }
      }

      return validation
    } finally {
      isSending.value = false
    }
  }

  /**
   * Get formatted message for copying
   */
  function getMessageForCopy(order: PurchaseOrder): string {
    const message = formatOrderMessage(order)
    lastGeneratedMessage.value = message
    return message
  }

  /**
   * Copy message to clipboard
   */
  async function copyMessageToClipboard(order: PurchaseOrder): Promise<boolean> {
    try {
      const message = getMessageForCopy(order)
      await navigator.clipboard.writeText(message)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }

  /**
   * Check if supplier has valid WhatsApp number
   */
  function hasValidWhatsAppNumber(order: PurchaseOrder): boolean {
    const supplier = counteragentsStore.counteragents?.find(c => c.id === order.supplierId)
    if (!supplier?.phone) return false
    return isValidPhoneNumber(supplier.phone)
  }

  /**
   * Get supplier phone number (formatted for display)
   */
  function getSupplierPhone(order: PurchaseOrder): string | null {
    const supplier = counteragentsStore.counteragents?.find(c => c.id === order.supplierId)
    return supplier?.phone || null
  }

  return {
    // State
    isSending,
    lastGeneratedMessage,
    // Methods
    formatOrderMessage,
    validateOrder,
    sendOrder,
    getMessageForCopy,
    copyMessageToClipboard,
    hasValidWhatsAppNumber,
    getSupplierPhone
  }
}
