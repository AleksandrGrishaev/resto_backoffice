// src/views/kitchen/inventory/composables/useQuickInventoryLists.ts
// Composable for managing Quick Inventory Lists (localStorage-based)

import { ref, computed, type MaybeRefOrGetter, toValue } from 'vue'
import { generateShortId } from '@/utils'
import type { Department } from '@/stores/productsStore/types'

export interface QuickInventoryList {
  id: string
  name: string
  department: Department
  itemIds: string[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'quick_inventory_lists'

// Shared reactive state (singleton across composable instances)
const lists = ref<QuickInventoryList[]>([])
let initialized = false

function loadFromStorage(): QuickInventoryList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(data: QuickInventoryList[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable
  }
}

export function useQuickInventoryLists(department?: MaybeRefOrGetter<Department>) {
  // Initialize once
  if (!initialized) {
    lists.value = loadFromStorage()
    initialized = true
  }

  const departmentLists = computed(() => {
    if (!department) return lists.value
    const dept = toValue(department)
    return lists.value.filter(l => l.department === dept)
  })

  function createList(name: string, dept: Department, itemIds: string[] = []): QuickInventoryList {
    const now = new Date().toISOString()
    const list: QuickInventoryList = {
      id: generateShortId(),
      name,
      department: dept,
      itemIds,
      createdAt: now,
      updatedAt: now
    }
    lists.value.push(list)
    saveToStorage(lists.value)
    return list
  }

  function updateList(id: string, updates: Partial<Pick<QuickInventoryList, 'name' | 'itemIds'>>) {
    const index = lists.value.findIndex(l => l.id === id)
    if (index === -1) return

    if (updates.name !== undefined) lists.value[index].name = updates.name
    if (updates.itemIds !== undefined) lists.value[index].itemIds = updates.itemIds
    lists.value[index].updatedAt = new Date().toISOString()
    saveToStorage(lists.value)
  }

  function deleteList(id: string) {
    lists.value = lists.value.filter(l => l.id !== id)
    saveToStorage(lists.value)
  }

  function getList(id: string): QuickInventoryList | undefined {
    return lists.value.find(l => l.id === id)
  }

  return {
    lists,
    departmentLists,
    createList,
    updateList,
    deleteList,
    getList
  }
}
