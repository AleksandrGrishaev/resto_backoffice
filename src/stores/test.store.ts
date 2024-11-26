import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { DebugUtils } from '@/utils'
import { TimeUtils } from '@/utils'

const MODULE_NAME = 'TestStore'

interface TestItem {
  id: string
  message: string
  createdAt: string
}

export const useTestStore = defineStore('test', () => {
  // State
  const items = ref<TestItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isConnected = ref(false)

  // Computed
  const itemsCount = computed(() => items.value.length)

  // Actions
  async function testConnection() {
    isLoading.value = true
    error.value = null

    try {
      const q = query(collection(db, 'test_items'), orderBy('createdAt', 'desc'))
      await getDocs(q)
      isConnected.value = true
      DebugUtils.info(MODULE_NAME, 'Firebase connection successful')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to connect to Firebase'
      isConnected.value = false
      DebugUtils.error(MODULE_NAME, 'Connection error', e)
    } finally {
      isLoading.value = false
    }
  }

  async function addTestItem(message: string) {
    if (!isConnected.value) {
      throw new Error('Not connected to Firebase')
    }

    try {
      const newItem = {
        message,
        createdAt: TimeUtils.getCurrentLocalISO()
      }

      const docRef = await addDoc(collection(db, 'test_items'), newItem)
      DebugUtils.info(MODULE_NAME, 'Test item added', { id: docRef.id, message })

      return docRef.id
    } catch (e) {
      DebugUtils.error(MODULE_NAME, 'Add item error', e)
      throw e
    }
  }

  return {
    // State
    items,
    isLoading,
    error,
    isConnected,
    // Computed
    itemsCount,
    // Actions
    testConnection,
    addTestItem
  }
})
