/**
 * useQuickVerifyMode.ts
 *
 * Composable для управления режимом быстрой проверки receipt items.
 * Позволяет пошагово проверять каждое поле каждой позиции.
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'

// =============================================
// TYPES
// =============================================

export type FieldKey = 'packageQuantity' | 'packagePrice' | 'lineTotal'

export interface VerifyField {
  key: FieldKey
  label: string
  value: number
  originalValue: number
  displayValue: string // Formatted for display
  suffix?: string // 'pkg', 'Rp', etc.
  isConfirmed: boolean
  isModified: boolean
  isCurrency: boolean
  allowDecimal: boolean
}

export interface VerifyItem {
  id: string
  itemName: string
  orderedQuantity: number
  orderedUnit: string
  packageName?: string
  packageSize?: number
  packageUnit?: string
  fields: VerifyField[]
  isCompleted: boolean
  isSkipped: boolean
  isNotReceived: boolean
}

export interface QuickVerifyProgress {
  currentItem: number
  totalItems: number
  currentField: number
  totalFields: number
  completedItems: number
  percentComplete: number
}

export interface ReceiptItemInput {
  id: string
  itemName: string
  orderedQuantity: number
  orderedUnit: string
  packageName?: string
  packageSize?: number
  packageUnit?: string
  receivedPackageQuantity: number
  actualPackagePrice: number
  actualLineTotal: number
}

export interface ReceiptItemOutput {
  id: string
  receivedPackageQuantity: number
  actualPackagePrice: number
  actualLineTotal: number
  isModified: boolean
  isNotReceived: boolean
}

// =============================================
// COMPOSABLE
// =============================================

export function useQuickVerifyMode(inputItems: Ref<ReceiptItemInput[]>) {
  // =============================================
  // STATE
  // =============================================

  const isActive = ref(false)
  const currentItemIndex = ref(0)
  const currentFieldIndex = ref(0)
  const items: Ref<VerifyItem[]> = ref([])
  const inputBuffer = ref<string>('') // Buffer for keypad input

  // =============================================
  // INITIALIZATION
  // =============================================

  function initializeItems(): void {
    items.value = inputItems.value.map(item => ({
      id: item.id,
      itemName: item.itemName,
      orderedQuantity: item.orderedQuantity,
      orderedUnit: item.orderedUnit,
      packageName: item.packageName,
      packageSize: item.packageSize,
      packageUnit: item.packageUnit,
      fields: [
        {
          key: 'packageQuantity' as FieldKey,
          label: 'Recv. Pkgs',
          value: item.receivedPackageQuantity,
          originalValue: item.receivedPackageQuantity,
          displayValue: formatNumber(item.receivedPackageQuantity),
          suffix: 'pkg',
          isConfirmed: false,
          isModified: false,
          isCurrency: false,
          allowDecimal: true
        },
        {
          key: 'packagePrice' as FieldKey,
          label: 'Price/pkg',
          value: item.actualPackagePrice,
          originalValue: item.actualPackagePrice,
          displayValue: formatCurrency(item.actualPackagePrice),
          suffix: '',
          isConfirmed: false,
          isModified: false,
          isCurrency: true,
          allowDecimal: false
        },
        {
          key: 'lineTotal' as FieldKey,
          label: 'Line Total',
          value: item.actualLineTotal,
          originalValue: item.actualLineTotal,
          displayValue: formatCurrency(item.actualLineTotal),
          suffix: '',
          isConfirmed: false,
          isModified: false,
          isCurrency: true,
          allowDecimal: false
        }
      ],
      isCompleted: false,
      isSkipped: false,
      isNotReceived: false
    }))
  }

  // =============================================
  // COMPUTED
  // =============================================

  const currentItem: ComputedRef<VerifyItem | null> = computed(() => {
    if (items.value.length === 0) return null
    return items.value[currentItemIndex.value] || null
  })

  const currentField: ComputedRef<VerifyField | null> = computed(() => {
    if (!currentItem.value) return null
    return currentItem.value.fields[currentFieldIndex.value] || null
  })

  const progress: ComputedRef<QuickVerifyProgress> = computed(() => {
    const totalItems = items.value.length
    const completedItems = items.value.filter(
      i => i.isCompleted || i.isSkipped || i.isNotReceived
    ).length
    const totalFields = 3 // packageQuantity, packagePrice, lineTotal

    return {
      currentItem: currentItemIndex.value + 1,
      totalItems,
      currentField: currentFieldIndex.value + 1,
      totalFields,
      completedItems,
      percentComplete: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    }
  })

  const isComplete: ComputedRef<boolean> = computed(() => {
    return (
      items.value.length > 0 &&
      items.value.every(i => i.isCompleted || i.isSkipped || i.isNotReceived)
    )
  })

  const displayValue: ComputedRef<string> = computed(() => {
    // Show input buffer if user is typing, otherwise show current field value
    if (inputBuffer.value !== '') {
      return inputBuffer.value
    }
    return currentField.value?.displayValue || '0'
  })

  const calculatedBaseQuantity: ComputedRef<number> = computed(() => {
    if (!currentItem.value) return 0
    const pkgQtyField = currentItem.value.fields.find(f => f.key === 'packageQuantity')
    const pkgSize = currentItem.value.packageSize || 1
    return (pkgQtyField?.value || 0) * pkgSize
  })

  const calculatedPricePerUnit: ComputedRef<number> = computed(() => {
    if (!currentItem.value) return 0
    const priceField = currentItem.value.fields.find(f => f.key === 'packagePrice')
    const pkgSize = currentItem.value.packageSize || 1
    if (pkgSize === 0) return 0
    return Math.round((priceField?.value || 0) / pkgSize)
  })

  // =============================================
  // NAVIGATION
  // =============================================

  function start(): void {
    initializeItems()
    currentItemIndex.value = 0
    currentFieldIndex.value = 0
    inputBuffer.value = ''
    isActive.value = true
  }

  function exit(): void {
    isActive.value = false
  }

  function nextField(): void {
    if (!currentItem.value) return

    // Confirm current field if has input
    if (inputBuffer.value !== '') {
      confirmCurrentField()
    } else {
      // Mark as confirmed with existing value
      currentItem.value.fields[currentFieldIndex.value].isConfirmed = true
    }

    // Move to next field
    if (currentFieldIndex.value < currentItem.value.fields.length - 1) {
      currentFieldIndex.value++
      inputBuffer.value = ''
    } else {
      // All fields done, mark item complete and move to next
      currentItem.value.isCompleted = true
      moveToNextItem()
    }
  }

  function prevField(): void {
    if (currentFieldIndex.value > 0) {
      inputBuffer.value = ''
      currentFieldIndex.value--
    } else if (currentItemIndex.value > 0) {
      // Go to previous item's last field
      currentItemIndex.value--
      currentFieldIndex.value = items.value[currentItemIndex.value].fields.length - 1
      inputBuffer.value = ''
    }
  }

  function skipItem(): void {
    if (!currentItem.value) return

    // Mark all fields as confirmed
    currentItem.value.fields.forEach(f => {
      f.isConfirmed = true
    })
    currentItem.value.isSkipped = true

    moveToNextItem()
  }

  function markNotReceived(): void {
    if (!currentItem.value) return

    // Set all values to 0
    currentItem.value.fields.forEach(f => {
      f.value = 0
      f.displayValue = f.isCurrency ? formatCurrency(0) : '0'
      f.isConfirmed = true
      f.isModified = f.originalValue !== 0
    })
    currentItem.value.isNotReceived = true

    moveToNextItem()
  }

  function moveToNextItem(): void {
    inputBuffer.value = ''

    // Find next uncompleted item
    const nextIndex = items.value.findIndex(
      (item, index) =>
        index > currentItemIndex.value &&
        !item.isCompleted &&
        !item.isSkipped &&
        !item.isNotReceived
    )

    if (nextIndex !== -1) {
      currentItemIndex.value = nextIndex
      currentFieldIndex.value = 0
    } else {
      // All done - stay on last item but mark complete
      isActive.value = isComplete.value ? false : true
    }
  }

  function goToItem(index: number): void {
    if (index >= 0 && index < items.value.length) {
      currentItemIndex.value = index
      currentFieldIndex.value = 0
      inputBuffer.value = ''
    }
  }

  function goToField(fieldIndex: number): void {
    if (!currentItem.value) return
    if (fieldIndex >= 0 && fieldIndex < currentItem.value.fields.length) {
      // Confirm current field if has input before switching
      if (inputBuffer.value !== '') {
        confirmCurrentField()
      }
      currentFieldIndex.value = fieldIndex
      inputBuffer.value = ''
    }
  }

  // =============================================
  // INPUT HANDLING
  // =============================================

  function handleKeyPress(key: string): void {
    if (!currentField.value) return

    if (key === 'backspace') {
      inputBuffer.value = inputBuffer.value.slice(0, -1)
    } else if (key === 'clear') {
      inputBuffer.value = ''
    } else if (key === '.') {
      // Only add decimal if allowed and not already present
      if (currentField.value.allowDecimal && !inputBuffer.value.includes('.')) {
        inputBuffer.value += '.'
      }
    } else if (/^\d$/.test(key)) {
      // Limit input length
      if (inputBuffer.value.length < 15) {
        inputBuffer.value += key
      }
    }
  }

  function confirmCurrentField(): void {
    if (!currentItem.value || !currentField.value) return

    const field = currentItem.value.fields[currentFieldIndex.value]
    let newValue: number

    if (inputBuffer.value === '') {
      // Keep existing value
      newValue = field.value
    } else {
      // Parse new value
      newValue = parseFloat(inputBuffer.value) || 0

      // For currency, ensure integer
      if (field.isCurrency) {
        newValue = Math.round(newValue)
      }
    }

    // Update field
    field.value = newValue
    field.displayValue = field.isCurrency ? formatCurrency(newValue) : formatNumber(newValue)
    field.isConfirmed = true
    field.isModified = field.value !== field.originalValue

    // Auto-recalculate dependent fields
    if (field.key === 'packageQuantity') {
      // Quantity changed: recalculate Line Total = qty * price
      recalculateLineTotal()
    } else if (field.key === 'packagePrice') {
      // Price changed: recalculate Line Total = qty * price
      recalculateLineTotal()
    } else if (field.key === 'lineTotal') {
      // Total changed: recalculate Price/pkg = total / qty
      recalculatePriceFromTotal()
    }

    inputBuffer.value = ''
  }

  function recalculateLineTotal(): void {
    if (!currentItem.value) return

    const qtyField = currentItem.value.fields.find(f => f.key === 'packageQuantity')
    const priceField = currentItem.value.fields.find(f => f.key === 'packagePrice')
    const totalField = currentItem.value.fields.find(f => f.key === 'lineTotal')

    if (qtyField && priceField && totalField) {
      const newTotal = Math.round(qtyField.value * priceField.value)
      totalField.value = newTotal
      totalField.displayValue = formatCurrency(newTotal)
      totalField.isModified = totalField.value !== totalField.originalValue
    }
  }

  function recalculatePriceFromTotal(): void {
    if (!currentItem.value) return

    const qtyField = currentItem.value.fields.find(f => f.key === 'packageQuantity')
    const priceField = currentItem.value.fields.find(f => f.key === 'packagePrice')
    const totalField = currentItem.value.fields.find(f => f.key === 'lineTotal')

    if (qtyField && priceField && totalField && qtyField.value > 0) {
      const newPrice = Math.round(totalField.value / qtyField.value)
      priceField.value = newPrice
      priceField.displayValue = formatCurrency(newPrice)
      priceField.isModified = priceField.value !== priceField.originalValue
    }
  }

  // =============================================
  // OUTPUT
  // =============================================

  function getModifiedItems(): ReceiptItemOutput[] {
    // Return only items that were actually modified or marked as not received
    return items.value
      .filter(item => item.fields.some(f => f.isModified) || item.isNotReceived)
      .map(item => {
        const pkgQty = item.fields.find(f => f.key === 'packageQuantity')
        const price = item.fields.find(f => f.key === 'packagePrice')
        const total = item.fields.find(f => f.key === 'lineTotal')

        return {
          id: item.id,
          receivedPackageQuantity: pkgQty?.value || 0,
          actualPackagePrice: price?.value || 0,
          actualLineTotal: total?.value || 0,
          isModified: item.fields.some(f => f.isModified),
          isNotReceived: item.isNotReceived
        }
      })
  }

  // =============================================
  // FORMATTERS
  // =============================================

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  function formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return value.toString()
    }
    return value.toFixed(1)
  }

  // =============================================
  // RETURN
  // =============================================

  return {
    // State
    isActive,
    items,
    inputBuffer,
    currentItemIndex,
    currentFieldIndex,

    // Computed
    currentItem,
    currentField,
    progress,
    isComplete,
    displayValue,
    calculatedBaseQuantity,
    calculatedPricePerUnit,

    // Navigation
    start,
    exit,
    nextField,
    prevField,
    skipItem,
    markNotReceived,
    goToItem,
    goToField,

    // Input
    handleKeyPress,
    confirmCurrentField,

    // Output
    getModifiedItems
  }
}
