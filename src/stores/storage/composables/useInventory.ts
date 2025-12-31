// src/stores/storage/composables/useInventory.ts

import { ref, computed } from 'vue'
import { useStorageStore } from '../storageStore'
import { useProductsStore } from '@/stores/productsStore'
import type { Department } from '@/stores/productsStore/types'
import type { InventoryDocument, InventoryItem, CreateInventoryData } from '../types'
import { DebugUtils } from '@/utils'
import { supabase } from '@/supabase'

const MODULE_NAME = 'useInventory'

export function useInventory() {
  const storageStore = useStorageStore()
  const productsStore = useProductsStore()

  // ===========================
  // STATE
  // ===========================

  const loading = ref(false)
  const currentInventory = ref<InventoryDocument | null>(null)
  const selectedDepartment = ref<Department | 'all'>('all')

  // ===========================
  // COMPUTED - Filtered Data
  // ===========================

  /**
   * Balances отфильтрованные по департаменту
   * Фильтрация через Product.usedInDepartments
   * Показываем только активные продукты (isActive = true)
   */
  const filteredBalances = computed(() => {
    if (!storageStore.state?.balances) return []

    let balances = [...storageStore.state.balances]

    // ✅ Фильтр: только активные продукты
    balances = balances.filter(balance => {
      const product = productsStore.products.find(p => p.id === balance.itemId)
      return product?.isActive !== false
    })

    // ✅ Фильтр по Department через Product.usedInDepartments
    if (selectedDepartment.value !== 'all') {
      balances = balances.filter(balance => {
        const product = productsStore.products.find(p => p.id === balance.itemId)
        if (!product) return false

        return product.usedInDepartments.includes(selectedDepartment.value as Department)
      })
    }

    return balances
  })

  /**
   * Инвентаризации отфильтрованные по департаменту
   * Фильтрация по полю inventory.department (кто делал инвентаризацию)
   */
  const filteredInventories = computed(() => {
    if (!storageStore.state?.inventories) return []

    let inventories = [...storageStore.state.inventories]

    // Фильтр по department инвентаризации
    if (selectedDepartment.value !== 'all') {
      inventories = inventories.filter(inv => inv.department === selectedDepartment.value)
    }

    return inventories.sort(
      (a, b) => new Date(b.inventoryDate).getTime() - new Date(a.inventoryDate).getTime()
    )
  })

  /**
   * Счётчики для вкладок (только активные продукты)
   */
  const balancesCounts = computed(() => {
    // Фильтруем только активные продукты
    const activeBalances =
      storageStore.state?.balances?.filter(balance => {
        const product = productsStore.products.find(p => p.id === balance.itemId)
        return product?.isActive !== false
      }) || []

    const all = activeBalances.length

    const kitchen = activeBalances.filter(balance => {
      const product = productsStore.products.find(p => p.id === balance.itemId)
      return product?.usedInDepartments.includes('kitchen')
    }).length

    const bar = activeBalances.filter(balance => {
      const product = productsStore.products.find(p => p.id === balance.itemId)
      return product?.usedInDepartments.includes('bar')
    }).length

    return { all, kitchen, bar }
  })

  const inventoriesCounts = computed(() => {
    const all = storageStore.state?.inventories?.length || 0

    const kitchen =
      storageStore.state?.inventories?.filter(inv => inv.department === 'kitchen').length || 0

    const bar = storageStore.state?.inventories?.filter(inv => inv.department === 'bar').length || 0

    return { all, kitchen, bar }
  })

  // ===========================
  // ACTIONS - CRUD Operations
  // ===========================

  /**
   * Создать новую инвентаризацию
   */
  async function startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, 'Starting inventory', {
        department: data.department,
        responsiblePerson: data.responsiblePerson
      })

      const inventory = await storageStore.startInventory(data)
      currentInventory.value = inventory

      DebugUtils.info(MODULE_NAME, 'Inventory started', {
        inventoryId: inventory.id,
        itemsCount: inventory.items.length
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to start inventory', { error })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Обновить инвентаризацию
   */
  async function updateInventory(
    inventoryId: string,
    items: InventoryItem[]
  ): Promise<InventoryDocument> {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, 'Updating inventory', {
        inventoryId,
        itemsCount: items.length
      })

      const inventory = await storageStore.updateInventory(inventoryId, items)
      currentInventory.value = inventory

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update inventory', { error })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Финализировать инвентаризацию
   */
  async function finalizeInventory(inventoryId: string): Promise<InventoryDocument> {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, 'Finalizing inventory', { inventoryId })

      const inventory = await storageStore.finalizeInventory(inventoryId)
      currentInventory.value = null

      // Update lastCountedAt for all counted products
      const now = new Date().toISOString()
      const countedItemIds = inventory.items
        .filter(item => item.confirmed || item.userInteracted || item.countedBy)
        .map(item => item.itemId)

      if (countedItemIds.length > 0) {
        DebugUtils.info(MODULE_NAME, 'Updating lastCountedAt for products', {
          count: countedItemIds.length
        })

        const { error } = await supabase
          .from('products')
          .update({ last_counted_at: now, updated_at: now })
          .in('id', countedItemIds)

        if (error) {
          DebugUtils.warn(MODULE_NAME, 'Failed to update lastCountedAt', { error })
        } else {
          // Update local productsStore
          countedItemIds.forEach(id => {
            const product = productsStore.products.find(p => p.id === id)
            if (product) {
              product.lastCountedAt = now
            }
          })
          DebugUtils.info(MODULE_NAME, 'lastCountedAt updated successfully', {
            count: countedItemIds.length
          })
        }
      }

      DebugUtils.info(MODULE_NAME, 'Inventory finalized', {
        inventoryId: inventory.id,
        discrepancies: inventory.totalDiscrepancies,
        valueDifference: inventory.totalValueDifference
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to finalize inventory', { error })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Загрузить существующую инвентаризацию для редактирования
   */
  function loadInventory(inventory: InventoryDocument) {
    currentInventory.value = inventory
    DebugUtils.info(MODULE_NAME, 'Loaded existing inventory', {
      inventoryId: inventory.id,
      status: inventory.status
    })
  }

  /**
   * Очистить текущую инвентаризацию
   */
  function clearCurrentInventory() {
    currentInventory.value = null
  }

  // ===========================
  // HELPERS
  // ===========================

  /**
   * Проверка - продукт используется в департаменте
   */
  function isProductUsedInDepartment(productId: string, department: Department): boolean {
    const product = productsStore.products.find(p => p.id === productId)
    return product?.usedInDepartments.includes(department) ?? false
  }

  /**
   * Проверка - продукт общий для нескольких департаментов
   */
  function isSharedProduct(productId: string): boolean {
    const product = productsStore.products.find(p => p.id === productId)
    return (product?.usedInDepartments.length ?? 0) > 1
  }

  /**
   * Получить имя департамента
   */
  function getDepartmentName(department: Department): string {
    return department === 'kitchen' ? 'Kitchen' : 'Bar'
  }

  /**
   * Получить цвет департамента
   */
  function getDepartmentColor(department: Department): string {
    return department === 'kitchen' ? 'success' : 'info'
  }

  /**
   * Получить иконку департамента
   */
  function getDepartmentIcon(department: Department): string {
    return department === 'kitchen' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'
  }

  // ===========================
  // RETURN
  // ===========================

  return {
    // State
    loading,
    currentInventory,
    selectedDepartment,

    // Computed - Filtered Data
    filteredBalances,
    filteredInventories,
    balancesCounts,
    inventoriesCounts,

    // Actions - CRUD
    startInventory,
    updateInventory,
    finalizeInventory,
    loadInventory,
    clearCurrentInventory,

    // Helpers
    isProductUsedInDepartment,
    isSharedProduct,
    getDepartmentName,
    getDepartmentColor,
    getDepartmentIcon
  }
}
