/**
 * Sprint 6: API-based sync storage
 *
 * Production implementation of ISyncStorage.
 * Stores sync queue and history via backend API calls.
 *
 * TODO: Implement when backend API is ready.
 */

import type { ISyncStorage, SyncQueueItem, SyncHistoryItem, HistoryFilters } from '../types'

export class ApiSyncStorage implements ISyncStorage {
  private queueUrl = '/api/sync-queue'
  private historyUrl = '/api/sync-history'

  async getQueue(): Promise<SyncQueueItem[]> {
    try {
      const response = await fetch(this.queueUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch sync queue: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error('❌ Failed to fetch sync queue from API:', error)
      throw error
    }
  }

  async saveQueue(queue: SyncQueueItem[]): Promise<void> {
    try {
      const response = await fetch(this.queueUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queue)
      })

      if (!response.ok) {
        throw new Error(`Failed to save sync queue: ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Failed to save sync queue to API:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      const response = await fetch(this.queueUrl, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error(`Failed to clear sync queue: ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Failed to clear sync queue via API:', error)
      throw error
    }
  }

  async getHistory(filters?: HistoryFilters): Promise<SyncHistoryItem[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.entityType) params.append('entityType', filters.entityType)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.priority) params.append('priority', filters.priority)
      if (filters?.entityId) params.append('entityId', filters.entityId)
      if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.append('dateTo', filters.dateTo)

      const url = params.toString() ? `${this.historyUrl}?${params.toString()}` : this.historyUrl
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch sync history: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error('❌ Failed to fetch sync history from API:', error)
      throw error
    }
  }

  async addToHistory(item: SyncHistoryItem): Promise<void> {
    try {
      const response = await fetch(this.historyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })

      if (!response.ok) {
        throw new Error(`Failed to add to sync history: ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Failed to add item to sync history via API:', error)
      throw error
    }
  }

  async clearHistory(): Promise<void> {
    try {
      const response = await fetch(this.historyUrl, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error(`Failed to clear sync history: ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Failed to clear sync history via API:', error)
      throw error
    }
  }
}
