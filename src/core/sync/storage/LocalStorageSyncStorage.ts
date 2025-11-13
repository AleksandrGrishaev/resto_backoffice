/**
 * Sprint 6: LocalStorage-based sync storage
 *
 * Development/mobile implementation of ISyncStorage.
 * Stores sync queue and history in browser localStorage.
 */

import type { ISyncStorage, SyncQueueItem, SyncHistoryItem, HistoryFilters } from '../types'

const SYNC_QUEUE_KEY = 'sync_queue_v2'
const SYNC_HISTORY_KEY = 'sync_history_v2'
const MAX_HISTORY_ITEMS = 1000 // Keep last 1000 sync operations

export class LocalStorageSyncStorage implements ISyncStorage {
  async getQueue(): Promise<SyncQueueItem[]> {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('❌ Failed to load sync queue from localStorage:', error)
      return []
    }
  }

  async saveQueue(queue: SyncQueueItem[]): Promise<void> {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
    } catch (error) {
      console.error('❌ Failed to save sync queue to localStorage:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(SYNC_QUEUE_KEY)
    } catch (error) {
      console.error('❌ Failed to clear sync queue from localStorage:', error)
      throw error
    }
  }

  async getHistory(filters?: HistoryFilters): Promise<SyncHistoryItem[]> {
    try {
      const stored = localStorage.getItem(SYNC_HISTORY_KEY)
      let history: SyncHistoryItem[] = stored ? JSON.parse(stored) : []

      // Apply filters
      if (filters) {
        history = history.filter(item => {
          if (filters.entityType && item.entityType !== filters.entityType) return false
          if (filters.status && item.status !== filters.status) return false
          if (filters.priority && item.priority !== filters.priority) return false
          if (filters.entityId && item.entityId !== filters.entityId) return false
          if (filters.dateFrom && item.completedAt < filters.dateFrom) return false
          if (filters.dateTo && item.completedAt > filters.dateTo) return false
          return true
        })
      }

      // Sort by completedAt descending (newest first)
      return history.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
    } catch (error) {
      console.error('❌ Failed to load sync history from localStorage:', error)
      return []
    }
  }

  async addToHistory(item: SyncHistoryItem): Promise<void> {
    try {
      const history = await this.getHistory()

      // Add new item at the beginning
      history.unshift(item)

      // Keep only last MAX_HISTORY_ITEMS
      const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS)

      localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(trimmedHistory))
    } catch (error) {
      console.error('❌ Failed to add item to sync history:', error)
      throw error
    }
  }

  async clearHistory(): Promise<void> {
    try {
      localStorage.removeItem(SYNC_HISTORY_KEY)
    } catch (error) {
      console.error('❌ Failed to clear sync history from localStorage:', error)
      throw error
    }
  }
}
