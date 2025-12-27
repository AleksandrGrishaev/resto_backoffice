// src/core/printing/ReceiptBuilder.ts
// Receipt template builder for thermal printers

import type { ReceiptData, ReceiptItem } from './types'
import { EscPosCommandBuilder } from './EscPosCommandBuilder'

/**
 * Receipt Builder
 *
 * Builds formatted receipts for thermal printers.
 * Generates ESC/POS commands using EscPosCommandBuilder.
 */
export class ReceiptBuilder {
  private readonly charsPerLine: number

  constructor(charsPerLine: number = 32) {
    this.charsPerLine = charsPerLine
  }

  /**
   * Build pre-bill receipt (before payment)
   * Shows items and total, no payment info
   */
  buildPreBill(data: ReceiptData): Uint8Array {
    const cmd = new EscPosCommandBuilder(this.charsPerLine)

    cmd.init()

    // Header
    this.buildHeader(cmd, data)

    // Order info
    this.buildOrderInfo(cmd, data)

    cmd.dash()

    // Items header
    cmd.textLine('QTY  ITEM              PRICE')
    cmd.dash()

    // Items list
    this.buildItemsList(cmd, data.items)

    cmd.dash()

    // Subtotals and discounts
    this.buildSubtotals(cmd, data)

    // Taxes
    this.buildTaxes(cmd, data)

    // Total
    cmd.hr()
    cmd.setBold(true)
    cmd.leftRight('TOTAL:', cmd.formatIDR(data.totalAmount))
    cmd.setBold(false)
    cmd.hr()

    // Pre-bill notice
    cmd.emptyLine()
    cmd.setAlign('center')
    cmd.setBold(true)
    cmd.textLine('*** PRE-BILL - NOT PAID ***')
    cmd.setBold(false)
    cmd.setAlign('left')

    // Footer
    cmd.emptyLine()
    if (data.footerMessage) {
      cmd.centerText(data.footerMessage)
    }
    cmd.hr()

    // Cut paper
    cmd.cut()

    return cmd.build()
  }

  /**
   * Build payment receipt (after payment)
   * Shows items, payment details, and change
   */
  buildPaymentReceipt(data: ReceiptData): Uint8Array {
    const cmd = new EscPosCommandBuilder(this.charsPerLine)

    cmd.init()

    // Header
    this.buildHeader(cmd, data)

    // Order info
    this.buildOrderInfo(cmd, data)

    cmd.dash()

    // Items header
    cmd.textLine('QTY  ITEM              PRICE')
    cmd.dash()

    // Items list
    this.buildItemsList(cmd, data.items)

    cmd.dash()

    // Subtotals and discounts
    this.buildSubtotals(cmd, data)

    // Taxes
    this.buildTaxes(cmd, data)

    // Total
    cmd.hr()
    cmd.setBold(true)
    cmd.setTextSize('double-width')
    cmd.leftRight('TOTAL:', cmd.formatIDR(data.totalAmount))
    cmd.setTextSize('normal')
    cmd.setBold(false)
    cmd.hr()

    // Payment info
    if (data.paymentMethod) {
      cmd.leftRight('Payment:', data.paymentMethod.toUpperCase())

      if (data.paymentMethod.toLowerCase() === 'cash') {
        if (data.receivedAmount !== undefined) {
          cmd.leftRight('Received:', cmd.formatIDR(data.receivedAmount))
        }
        if (data.changeAmount !== undefined && data.changeAmount > 0) {
          cmd.setBold(true)
          cmd.leftRight('Change:', cmd.formatIDR(data.changeAmount))
          cmd.setBold(false)
        }
      }
    }

    cmd.dash()

    // Receipt details
    if (data.paymentNumber) {
      cmd.leftRight('Receipt:', data.paymentNumber)
    }
    if (data.cashierName) {
      cmd.leftRight('Cashier:', data.cashierName)
    }

    // Footer
    cmd.hr()
    cmd.emptyLine()
    if (data.footerMessage) {
      cmd.centerText(data.footerMessage)
    }
    cmd.hr()

    // Cut paper
    cmd.cut()

    return cmd.build()
  }

  /**
   * Build test print receipt
   */
  buildTestPrint(restaurantName: string): Uint8Array {
    const cmd = new EscPosCommandBuilder(this.charsPerLine)

    cmd.init()
    cmd.hr()

    cmd.setAlign('center')
    cmd.setBold(true)
    cmd.textLine(restaurantName)
    cmd.setBold(false)
    cmd.setAlign('left')

    cmd.hr()
    cmd.emptyLine()
    cmd.centerText('*** TEST PRINT ***')
    cmd.emptyLine()
    cmd.textLine('Printer connection OK!')
    cmd.emptyLine()
    cmd.leftRight('Date:', new Date().toLocaleDateString('en-GB'))
    cmd.leftRight('Time:', new Date().toLocaleTimeString('en-GB'))
    cmd.emptyLine()

    // Test different styles
    cmd.setBold(true)
    cmd.textLine('Bold text')
    cmd.setBold(false)

    cmd.setTextSize('double-width')
    cmd.textLine('Double width')
    cmd.setTextSize('normal')

    cmd.setAlign('center')
    cmd.textLine('Center aligned')
    cmd.setAlign('right')
    cmd.textLine('Right aligned')
    cmd.setAlign('left')

    cmd.emptyLine()
    cmd.hr()
    cmd.centerText('End of test')
    cmd.hr()

    cmd.cut()

    return cmd.build()
  }

  // ===== Private Helpers =====

  private buildHeader(cmd: EscPosCommandBuilder, data: ReceiptData): void {
    cmd.hr()
    cmd.setAlign('center')
    cmd.setBold(true)
    cmd.textLine(data.restaurantName)
    cmd.setBold(false)

    if (data.restaurantAddress) {
      cmd.textLine(data.restaurantAddress)
    }
    if (data.restaurantPhone) {
      cmd.textLine(`Tel: ${data.restaurantPhone}`)
    }

    cmd.setAlign('left')
    cmd.hr()
  }

  private buildOrderInfo(cmd: EscPosCommandBuilder, data: ReceiptData): void {
    cmd.leftRight('Order:', data.orderNumber)

    // Table and waiter on same line if both present
    if (data.tableNumber && data.waiterName) {
      cmd.leftRight(`Table: ${data.tableNumber}`, `Server: ${data.waiterName}`)
    } else {
      if (data.tableNumber) {
        cmd.leftRight('Table:', data.tableNumber)
      }
      if (data.waiterName) {
        cmd.leftRight('Server:', data.waiterName)
      }
    }

    // Order type
    const orderTypeLabels: Record<string, string> = {
      dine_in: 'Dine In',
      takeaway: 'Takeaway',
      delivery: 'Delivery'
    }
    cmd.leftRight('Type:', orderTypeLabels[data.orderType] || data.orderType)

    cmd.textLine(data.dateTime)
  }

  private buildItemsList(cmd: EscPosCommandBuilder, items: ReceiptItem[]): void {
    for (const item of items) {
      // Main item line
      cmd.lineItem(item.quantity, item.name, cmd.formatIDR(item.totalPrice))

      // Modifiers (indented)
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          cmd.textLine(`     - ${mod}`)
        }
      }

      // Item discount (if any)
      if (item.discount && item.discount > 0) {
        cmd.textLine(`     Disc: -${cmd.formatIDR(item.discount)}`)
      }

      // Notes (if any)
      if (item.notes) {
        cmd.textLine(`     Note: ${item.notes}`)
      }
    }
  }

  private buildSubtotals(cmd: EscPosCommandBuilder, data: ReceiptData): void {
    cmd.leftRight('Subtotal:', cmd.formatIDR(data.subtotal))

    // Item discounts
    if (data.itemDiscounts && data.itemDiscounts > 0) {
      cmd.leftRight('Item Disc:', `-${cmd.formatIDR(data.itemDiscounts)}`)
    }

    // Bill discount
    if (data.billDiscount && data.billDiscount > 0) {
      const discountLabel = data.billDiscountReason
        ? `Bill Disc (${data.billDiscountReason}):`
        : 'Bill Discount:'
      cmd.leftRight(discountLabel, `-${cmd.formatIDR(data.billDiscount)}`)
    }

    // After discounts
    if (
      data.subtotalAfterDiscounts !== undefined &&
      data.subtotalAfterDiscounts !== data.subtotal
    ) {
      cmd.leftRight('After Disc:', cmd.formatIDR(data.subtotalAfterDiscounts))
    }
  }

  private buildTaxes(cmd: EscPosCommandBuilder, data: ReceiptData): void {
    // Service tax
    if (data.serviceTax && data.serviceTax > 0) {
      const label = data.serviceTaxPercent ? `Service (${data.serviceTaxPercent}%):` : 'Service:'
      cmd.leftRight(label, cmd.formatIDR(data.serviceTax))
    }

    // Government tax (PPN)
    if (data.governmentTax && data.governmentTax > 0) {
      const label = data.governmentTaxPercent ? `Tax (${data.governmentTaxPercent}%):` : 'Tax:'
      cmd.leftRight(label, cmd.formatIDR(data.governmentTax))
    }
  }
}

/**
 * Create receipt builder with default settings
 */
export function createReceiptBuilder(charsPerLine?: number): ReceiptBuilder {
  return new ReceiptBuilder(charsPerLine)
}
