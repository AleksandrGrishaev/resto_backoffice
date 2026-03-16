// src/views/kitchen/inventory/composables/useQuickInventoryLists.ts
// Composable for managing Quick Inventory Lists (Supabase-backed)

import { ref, computed, type MaybeRefOrGetter, toValue } from 'vue'
import { supabase } from '@/supabase/client'
import { generateShortId } from '@/utils'
import { DebugUtils } from '@/utils'
import type { Department } from '@/stores/productsStore/types'

const MODULE_NAME = 'QuickInventoryLists'

export interface QuickInventoryList {
  id: string
  name: string
  department: Department
  itemIds: string[]
  createdAt: string
  updatedAt: string
}

interface DbRow {
  id: string
  name: string
  department: string
  item_ids: string[]
  created_at: string
  updated_at: string
}

function mapFromDb(row: DbRow): QuickInventoryList {
  return {
    id: row.id,
    name: row.name,
    department: row.department as Department,
    itemIds: row.item_ids || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Shared reactive state (singleton across composable instances)
const lists = ref<QuickInventoryList[]>([])
let loaded = false
let loadingPromise: Promise<void> | null = null

async function fetchAll(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('inventory_quick_lists')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch lists', { error })
      return
    }

    lists.value = (data || []).map(mapFromDb)
    loaded = true
    DebugUtils.info(MODULE_NAME, 'Lists loaded', { count: lists.value.length })
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Fetch error', { err })
  }
}

export function useQuickInventoryLists(department?: MaybeRefOrGetter<Department>) {
  // Load once on first use
  if (!loaded && !loadingPromise) {
    loadingPromise = fetchAll().finally(() => {
      loadingPromise = null
    })
  }

  const departmentLists = computed(() => {
    if (!department) return lists.value
    const dept = toValue(department)
    return lists.value.filter(l => l.department === dept)
  })

  async function createList(
    name: string,
    dept: Department,
    itemIds: string[] = []
  ): Promise<QuickInventoryList> {
    const id = generateShortId()

    const { data, error } = await supabase
      .from('inventory_quick_lists')
      .insert({ id, name, department: dept, item_ids: itemIds })
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create list', { error })
      // Fallback: add locally so UI doesn't break
      const now = new Date().toISOString()
      const list: QuickInventoryList = {
        id,
        name,
        department: dept,
        itemIds,
        createdAt: now,
        updatedAt: now
      }
      lists.value.push(list)
      return list
    }

    const list = mapFromDb(data)
    lists.value.push(list)
    return list
  }

  async function updateList(
    id: string,
    updates: Partial<Pick<QuickInventoryList, 'name' | 'itemIds'>>
  ) {
    const index = lists.value.findIndex(l => l.id === id)
    if (index === -1) return

    const dbUpdates: Record<string, unknown> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.itemIds !== undefined) dbUpdates.item_ids = updates.itemIds

    const { error } = await supabase.from('inventory_quick_lists').update(dbUpdates).eq('id', id)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update list', { error })
    }

    // Update local state regardless (optimistic)
    if (updates.name !== undefined) lists.value[index].name = updates.name
    if (updates.itemIds !== undefined) lists.value[index].itemIds = updates.itemIds
    lists.value[index].updatedAt = new Date().toISOString()
  }

  async function deleteList(id: string) {
    const { error } = await supabase.from('inventory_quick_lists').delete().eq('id', id)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete list', { error })
    }

    // Remove locally regardless (optimistic)
    lists.value = lists.value.filter(l => l.id !== id)
  }

  function getList(id: string): QuickInventoryList | undefined {
    return lists.value.find(l => l.id === id)
  }

  async function refresh() {
    await fetchAll()
  }

  return {
    lists,
    departmentLists,
    createList,
    updateList,
    deleteList,
    getList,
    refresh
  }
}
