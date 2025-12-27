// src/stores/pos/utils/preBillTracking.ts
// Pre-bill tracking utilities for fraud protection

import type { PosBill, PosBillItem, PreBillSnapshot, PreBillSnapshotItem } from '../types'

/**
 * Create a simple hash from bill items for quick comparison
 */
export function createItemsHash(items: PosBillItem[]): string {
  // Sort items by ID for consistent ordering
  const sortedItems = [...items]
    .filter(item => item.status !== 'cancelled')
    .sort((a, b) => a.id.localeCompare(b.id))

  // Create a string representation of key item properties
  const itemsString = sortedItems
    .map(item => `${item.menuItemId}:${item.quantity}:${item.unitPrice}:${item.totalPrice}`)
    .join('|')

  // Simple hash function (FNV-1a)
  let hash = 2166136261
  for (let i = 0; i < itemsString.length; i++) {
    hash ^= itemsString.charCodeAt(i)
    hash = (hash * 16777619) >>> 0
  }

  return hash.toString(16)
}

/**
 * Create a snapshot of bill state for fraud detection
 */
export function createPreBillSnapshot(bill: PosBill, totalWithTaxes: number): PreBillSnapshot {
  const activeItems = bill.items.filter(item => item.status !== 'cancelled')

  const snapshotItems: PreBillSnapshotItem[] = activeItems.map(item => ({
    menuItemId: item.menuItemId,
    menuItemName: item.menuItemName,
    variantName: item.variantName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    discountAmount:
      item.discounts?.reduce((sum, d) => {
        if (d.type === 'percentage') {
          return sum + (item.totalPrice * d.value) / 100
        }
        return sum + d.value
      }, 0) || 0
  }))

  return {
    itemsHash: createItemsHash(activeItems),
    itemCount: activeItems.length,
    subtotal: bill.subtotal,
    discountAmount: bill.discountAmount,
    total: totalWithTaxes,
    items: snapshotItems
  }
}

/**
 * Compare current bill state with pre-bill snapshot
 * Returns detailed change information
 */
export interface PreBillChangeInfo {
  hasChanges: boolean
  changes: PreBillChange[]
  summary: string
}

export interface PreBillChange {
  type:
    | 'item_removed'
    | 'item_added'
    | 'quantity_changed'
    | 'price_changed'
    | 'discount_added'
    | 'discount_changed'
  itemName: string
  details: string
  severity: 'warning' | 'critical' // critical = potential fraud
}

export function compareWithSnapshot(
  currentBill: PosBill,
  currentTotalWithTaxes: number,
  snapshot: PreBillSnapshot
): PreBillChangeInfo {
  const changes: PreBillChange[] = []
  const activeItems = currentBill.items.filter(item => item.status !== 'cancelled')

  // Quick check using hash
  const currentHash = createItemsHash(activeItems)
  if (
    currentHash === snapshot.itemsHash &&
    currentBill.discountAmount === snapshot.discountAmount
  ) {
    return { hasChanges: false, changes: [], summary: '' }
  }

  // Detailed comparison
  const snapshotItemMap = new Map(snapshot.items.map(item => [item.menuItemId, item]))
  const currentItemMap = new Map(activeItems.map(item => [item.menuItemId, item]))

  // Check for removed items
  for (const [menuItemId, snapshotItem] of snapshotItemMap) {
    const currentItem = currentItemMap.get(menuItemId)

    if (!currentItem) {
      // Item was removed
      changes.push({
        type: 'item_removed',
        itemName: snapshotItem.menuItemName,
        details: `${snapshotItem.quantity}x ${snapshotItem.menuItemName} was removed`,
        severity: 'critical'
      })
    } else if (currentItem.quantity < snapshotItem.quantity) {
      // Quantity decreased
      const diff = snapshotItem.quantity - currentItem.quantity
      changes.push({
        type: 'quantity_changed',
        itemName: snapshotItem.menuItemName,
        details: `Quantity reduced from ${snapshotItem.quantity} to ${currentItem.quantity} (-${diff})`,
        severity: 'critical'
      })
    } else if (currentItem.quantity > snapshotItem.quantity) {
      // Quantity increased (less suspicious, customer may have added)
      const diff = currentItem.quantity - snapshotItem.quantity
      changes.push({
        type: 'quantity_changed',
        itemName: snapshotItem.menuItemName,
        details: `Quantity increased from ${snapshotItem.quantity} to ${currentItem.quantity} (+${diff})`,
        severity: 'warning'
      })
    }

    // Check for item discount changes
    if (currentItem) {
      const currentDiscount =
        currentItem.discounts?.reduce((sum, d) => {
          if (d.type === 'percentage') {
            return sum + (currentItem.totalPrice * d.value) / 100
          }
          return sum + d.value
        }, 0) || 0

      if (currentDiscount > snapshotItem.discountAmount) {
        changes.push({
          type: 'discount_added',
          itemName: snapshotItem.menuItemName,
          details: `Discount added/increased: Rp ${formatNumber(snapshotItem.discountAmount)} → Rp ${formatNumber(currentDiscount)}`,
          severity: 'critical'
        })
      }
    }
  }

  // Check for added items
  for (const [menuItemId, currentItem] of currentItemMap) {
    if (!snapshotItemMap.has(menuItemId)) {
      changes.push({
        type: 'item_added',
        itemName: currentItem.menuItemName,
        details: `${currentItem.quantity}x ${currentItem.menuItemName} was added`,
        severity: 'warning'
      })
    }
  }

  // Check for bill-level discount changes
  if (currentBill.discountAmount > snapshot.discountAmount) {
    changes.push({
      type: 'discount_changed',
      itemName: 'Bill Discount',
      details: `Bill discount added/increased: Rp ${formatNumber(snapshot.discountAmount)} → Rp ${formatNumber(currentBill.discountAmount)}`,
      severity: 'critical'
    })
  }

  // Build summary
  const criticalCount = changes.filter(c => c.severity === 'critical').length
  const warningCount = changes.filter(c => c.severity === 'warning').length

  let summary = ''
  if (criticalCount > 0) {
    summary = `⚠️ ${criticalCount} suspicious change(s) detected after pre-bill print`
  } else if (warningCount > 0) {
    summary = `${warningCount} change(s) detected after pre-bill print`
  }

  return {
    hasChanges: changes.length > 0,
    changes,
    summary
  }
}

/**
 * Check if bill requires re-print before payment
 * Critical changes require mandatory re-print
 */
export function requiresRePrint(changeInfo: PreBillChangeInfo): boolean {
  return changeInfo.changes.some(c => c.severity === 'critical')
}

/**
 * Format number with thousand separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString('id-ID')
}

/**
 * Get time since pre-bill was printed
 */
export function getTimeSincePreBill(preBillPrintedAt: string): string {
  const printedAt = new Date(preBillPrintedAt)
  const now = new Date()
  const diffMs = now.getTime() - printedAt.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes === 1) return '1 minute ago'
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours === 1) return '1 hour ago'
  return `${diffHours} hours ago`
}
