// src/core/printing/EscPosCommandBuilder.ts
// ESC/POS command generator for thermal printers (pos58B compatible)

import type { TextAlign, TextSize, FontType } from './types'
import { POS58B_CAPABILITIES } from './types'

/**
 * ESC/POS Command Builder
 *
 * Generates ESC/POS commands for thermal printers.
 * Uses builder pattern for chaining commands.
 *
 * Reference: ESC/POS Command Reference for pos58B and similar printers
 */
export class EscPosCommandBuilder {
  private buffer: number[] = []
  private readonly charsPerLine: number

  // ESC/POS Command Constants
  private static readonly ESC = 0x1b // Escape
  private static readonly GS = 0x1d // Group Separator
  private static readonly LF = 0x0a // Line Feed
  private static readonly CR = 0x0d // Carriage Return
  private static readonly HT = 0x09 // Horizontal Tab
  private static readonly NUL = 0x00 // Null

  constructor(charsPerLine: number = POS58B_CAPABILITIES.charsPerLine) {
    this.charsPerLine = charsPerLine
  }

  /**
   * Initialize printer - ESC @
   * Clears buffer and resets printer to default settings
   */
  init(): this {
    this.buffer.push(EscPosCommandBuilder.ESC, 0x40)
    return this
  }

  /**
   * Line feed - LF
   * @param lines Number of lines to feed (default: 1)
   */
  lineFeed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(EscPosCommandBuilder.LF)
    }
    return this
  }

  /**
   * Cut paper - GS V
   * @param mode 'full' for full cut, 'partial' for partial cut
   */
  cut(mode: 'full' | 'partial' = 'partial'): this {
    // Feed paper before cut
    this.lineFeed(3)
    // GS V m - Cut paper
    // m = 0: Full cut, m = 1: Partial cut (some printers use 66 for partial)
    this.buffer.push(EscPosCommandBuilder.GS, 0x56, mode === 'full' ? 0x00 : 0x01)
    return this
  }

  // ===== Text Styling =====

  /**
   * Set text alignment - ESC a n
   * @param align 'left' | 'center' | 'right'
   */
  setAlign(align: TextAlign): this {
    const alignCode = align === 'left' ? 0 : align === 'center' ? 1 : 2
    this.buffer.push(EscPosCommandBuilder.ESC, 0x61, alignCode)
    return this
  }

  /**
   * Set bold mode - ESC E n
   * @param enabled Enable or disable bold
   */
  setBold(enabled: boolean): this {
    this.buffer.push(EscPosCommandBuilder.ESC, 0x45, enabled ? 1 : 0)
    return this
  }

  /**
   * Set underline mode - ESC - n
   * @param enabled Enable or disable underline
   */
  setUnderline(enabled: boolean): this {
    // ESC - n: n=0 off, n=1 one-dot underline, n=2 two-dot underline
    this.buffer.push(EscPosCommandBuilder.ESC, 0x2d, enabled ? 1 : 0)
    return this
  }

  /**
   * Set text size - GS ! n
   * @param size Text size mode
   */
  setTextSize(size: TextSize): this {
    let n = 0x00
    switch (size) {
      case 'normal':
        n = 0x00
        break
      case 'double-width':
        n = 0x10
        break
      case 'double-height':
        n = 0x01
        break
      case 'double':
        n = 0x11
        break
    }
    this.buffer.push(EscPosCommandBuilder.GS, 0x21, n)
    return this
  }

  /**
   * Set font type - ESC M n
   * @param font Font type A or B
   */
  setFont(font: FontType): this {
    this.buffer.push(EscPosCommandBuilder.ESC, 0x4d, font === 'A' ? 0 : 1)
    return this
  }

  /**
   * Reset all text styles to default
   */
  resetStyle(): this {
    this.setBold(false)
    this.setUnderline(false)
    this.setAlign('left')
    this.setTextSize('normal')
    this.setFont('A')
    return this
  }

  // ===== Content Methods =====

  /**
   * Print raw text (no line feed)
   * Uses CP437/ASCII encoding for thermal printers
   */
  text(content: string): this {
    const bytes = this.encodeText(content)
    this.buffer.push(...bytes)
    return this
  }

  /**
   * Print text followed by line feed
   */
  textLine(content: string): this {
    return this.text(content).lineFeed()
  }

  /**
   * Print horizontal rule
   * @param char Character to use for rule (default: '=')
   */
  hr(char: string = '='): this {
    const line = char.repeat(this.charsPerLine)
    return this.textLine(line)
  }

  /**
   * Print dashed line
   */
  dash(): this {
    return this.hr('-')
  }

  /**
   * Print spaces
   * @param count Number of spaces
   */
  space(count: number = 1): this {
    return this.text(' '.repeat(count))
  }

  /**
   * Print empty line
   */
  emptyLine(): this {
    return this.lineFeed()
  }

  // ===== Layout Helpers =====

  /**
   * Print left-right aligned text on same line
   * @param left Left-aligned text
   * @param right Right-aligned text
   */
  leftRight(left: string, right: string): this {
    const availableWidth = this.charsPerLine
    const leftLen = this.getDisplayWidth(left)
    const rightLen = this.getDisplayWidth(right)
    const spacesNeeded = availableWidth - leftLen - rightLen

    if (spacesNeeded < 1) {
      // If text is too long, truncate left side
      const truncatedLeft = this.truncate(left, availableWidth - rightLen - 1)
      return this.textLine(truncatedLeft + ' ' + right)
    }

    return this.textLine(left + ' '.repeat(spacesNeeded) + right)
  }

  /**
   * Print three-column layout (left, center, right)
   */
  threeColumn(left: string, center: string, right: string): this {
    const leftLen = this.getDisplayWidth(left)
    const centerLen = this.getDisplayWidth(center)
    const rightLen = this.getDisplayWidth(right)

    const totalContent = leftLen + centerLen + rightLen
    const totalSpaces = this.charsPerLine - totalContent

    if (totalSpaces < 2) {
      // Fallback to simple line if too long
      return this.textLine(`${left} ${center} ${right}`)
    }

    const leftSpaces = Math.floor(totalSpaces / 2)
    const rightSpaces = totalSpaces - leftSpaces

    return this.textLine(left + ' '.repeat(leftSpaces) + center + ' '.repeat(rightSpaces) + right)
  }

  /**
   * Center text on the line
   */
  centerText(content: string): this {
    this.setAlign('center')
    this.textLine(content)
    this.setAlign('left')
    return this
  }

  /**
   * Print a receipt line item (qty, name, price)
   * Format: " 2   Nasi Goreng      Rp 90.000"
   */
  lineItem(qty: number, name: string, price: string): this {
    const qtyStr = qty.toString().padStart(2, ' ')
    const priceLen = price.length
    const qtyLen = 3 // "XX "
    const nameMaxLen = this.charsPerLine - qtyLen - priceLen - 1

    const truncatedName = this.truncate(name, nameMaxLen).padEnd(nameMaxLen, ' ')
    return this.textLine(`${qtyStr} ${truncatedName} ${price}`)
  }

  // ===== Currency Formatting =====

  /**
   * Format number as Indonesian Rupiah
   */
  formatIDR(amount: number, withPrefix: boolean = true): string {
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount))

    const prefix = withPrefix ? 'Rp ' : ''
    const sign = amount < 0 ? '-' : ''
    return `${sign}${prefix}${formatted}`
  }

  // ===== Build =====

  /**
   * Get the final command buffer as Uint8Array
   */
  build(): Uint8Array {
    return new Uint8Array(this.buffer)
  }

  /**
   * Reset the builder (clear buffer)
   */
  reset(): this {
    this.buffer = []
    return this
  }

  // ===== Private Helpers =====

  /**
   * Encode text to bytes using ASCII/CP437
   * Handles basic Latin characters, replaces unsupported chars
   */
  private encodeText(text: string): number[] {
    const bytes: number[] = []

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i)

      // ASCII printable characters (32-126)
      if (code >= 32 && code <= 126) {
        bytes.push(code)
      } else {
        // Replace non-ASCII with closest equivalent or '?'
        const replacement = this.getAsciiReplacement(code)
        bytes.push(replacement)
      }
    }

    return bytes
  }

  /**
   * Get ASCII replacement for non-ASCII character
   */
  private getAsciiReplacement(code: number): number {
    // Common replacements
    const replacements: Record<number, number> = {
      // Currency symbols
      0x20b9: 0x52, // ₹ -> R
      // Accented characters -> base
      0x00e0: 0x61, // à -> a
      0x00e1: 0x61, // á -> a
      0x00e8: 0x65, // è -> e
      0x00e9: 0x65 // é -> e
      // Add more as needed
    }

    return replacements[code] || 0x3f // Default to '?'
  }

  /**
   * Get display width of string (for layout calculations)
   */
  private getDisplayWidth(text: string): number {
    // For now, assume 1 char = 1 width (ASCII only)
    return text.length
  }

  /**
   * Truncate text to max length
   */
  private truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text
    return text.substring(0, maxLen - 1) + '.'
  }
}
