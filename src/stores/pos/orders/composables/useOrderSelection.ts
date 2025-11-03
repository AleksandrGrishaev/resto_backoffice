// src/stores/pos/orders/composables/useOrderSelection.ts
import { ref, computed } from 'vue'
import type { PosBill, PosBillItem } from '../../types'

/**
 * Composable для управления выбором (selection) items и bills в заказе
 *
 * Usage:
 * ```typescript
 * const { selectedItems, toggleItemSelection, clearSelection } = useOrderSelection()
 * ```
 */
export function useOrderSelection() {
  // ===== STATE =====

  /**
   * Выбранные позиции (bill items)
   */
  const selectedItems = ref<Set<string>>(new Set())

  /**
   * Выбранные счета (bills)
   */
  const selectedBills = ref<Set<string>>(new Set())

  // ===== COMPUTED =====

  /**
   * Количество выбранных позиций
   */
  const selectedItemsCount = computed(() => selectedItems.value.size)

  /**
   * Количество выбранных счетов
   */
  const selectedBillsCount = computed(() => selectedBills.value.size)

  /**
   * Есть ли выбранные элементы (items или bills)
   */
  const hasSelection = computed(() => selectedItems.value.size > 0 || selectedBills.value.size > 0)

  /**
   * ID выбранных позиций (массив)
   */
  const selectedItemIds = computed(() => Array.from(selectedItems.value))

  /**
   * Проверить является ли весь счет выбранным
   * (все позиции счета выбраны)
   */
  function isFullBillSelected(bill: PosBill | null): boolean {
    if (!bill || bill.items.length === 0) return false

    return bill.items.every(item => selectedItems.value.has(item.id))
  }

  // ===== ACTIONS =====

  /**
   * Toggle выбор позиции (item)
   */
  function toggleItemSelection(itemId: string): void {
    if (selectedItems.value.has(itemId)) {
      selectedItems.value.delete(itemId)
    } else {
      selectedItems.value.add(itemId)
    }

    // Force reactivity update
    selectedItems.value = new Set(selectedItems.value)
  }

  /**
   * Toggle выбор счета (bill)
   * При выборе счета - выбираются/снимаются все его позиции
   */
  function toggleBillSelection(bill: PosBill): void {
    const billItemIds = bill.items.map(item => item.id)

    // Проверяем выбран ли счет (все его items выбраны)
    const isBillSelected = billItemIds.every(id => selectedItems.value.has(id))

    if (isBillSelected) {
      // Снимаем выбор со всех items
      billItemIds.forEach(id => selectedItems.value.delete(id))
      selectedBills.value.delete(bill.id)
    } else {
      // Выбираем все items
      billItemIds.forEach(id => selectedItems.value.add(id))
      selectedBills.value.add(bill.id)
    }

    // Force reactivity update
    selectedItems.value = new Set(selectedItems.value)
    selectedBills.value = new Set(selectedBills.value)
  }

  /**
   * Проверить выбрана ли позиция
   */
  function isItemSelected(itemId: string): boolean {
    return selectedItems.value.has(itemId)
  }

  /**
   * Проверить выбран ли счет (все его позиции выбраны)
   */
  function isBillSelected(bill: PosBill): boolean {
    if (bill.items.length === 0) return false

    return bill.items.every(item => selectedItems.value.has(item.id))
  }

  /**
   * Очистить выбор (items и bills)
   */
  function clearSelection(): void {
    selectedItems.value.clear()
    selectedBills.value.clear()

    // Force reactivity update
    selectedItems.value = new Set(selectedItems.value)
    selectedBills.value = new Set(selectedBills.value)
  }

  /**
   * Выбрать все позиции активного счета
   */
  function selectAllItemsInBill(bill: PosBill | null): void {
    if (!bill) return

    bill.items.forEach(item => {
      selectedItems.value.add(item.id)
    })

    selectedBills.value.add(bill.id)

    // Force reactivity update
    selectedItems.value = new Set(selectedItems.value)
    selectedBills.value = new Set(selectedBills.value)
  }

  /**
   * Снять выбор с позиции (если удалена из заказа)
   */
  function deselectItem(itemId: string): void {
    selectedItems.value.delete(itemId)

    // Force reactivity update
    selectedItems.value = new Set(selectedItems.value)
  }

  /**
   * Снять выбор со счета (если удален из заказа)
   */
  function deselectBill(billId: string): void {
    selectedBills.value.delete(billId)

    // Force reactivity update
    selectedBills.value = new Set(selectedBills.value)
  }

  // ===== RETURN =====

  return {
    // State
    selectedItems,
    selectedBills,

    // Computed
    selectedItemsCount,
    selectedBillsCount,
    hasSelection,
    selectedItemIds,
    isFullBillSelected,

    // Actions
    toggleItemSelection,
    toggleBillSelection,
    isItemSelected,
    isBillSelected,
    clearSelection,
    selectAllItemsInBill,
    deselectItem,
    deselectBill
  }
}
