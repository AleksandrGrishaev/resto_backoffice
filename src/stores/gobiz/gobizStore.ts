// src/stores/gobiz/gobizStore.ts - GoBiz integration state management

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GobizConfigPublic, GobizProxyResponse } from '@/integrations/gobiz/types'
import type { MenuSyncPreview, MenuSyncResult } from '@/integrations/gobiz/catalogTypes'
import { gobizService } from '@/integrations/gobiz/gobizService'
import { gobizMenuSyncService } from '@/integrations/gobiz/gobizMenuSyncService'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'GobizStore'

export type ConnectionStatus = 'connected' | 'error' | 'checking' | 'unknown'

export const useGobizStore = defineStore('gobiz', () => {
  // State
  const configs = ref<GobizConfigPublic[]>([])
  const isLoading = ref(false)
  const initialized = ref(false)
  const connectionStatuses = ref<Map<string, ConnectionStatus>>(new Map())

  // Menu sync state
  const syncPreview = ref<MenuSyncPreview | null>(null)
  const lastSyncResult = ref<MenuSyncResult | null>(null)
  const isSyncing = ref(false)
  const isPreviewLoading = ref(false)

  // Getters
  const activeConfig = computed(() => configs.value.find(c => c.isActive))

  const isConnected = computed(() => {
    const active = activeConfig.value
    if (!active) return false
    return active.isConnected && connectionStatuses.value.get(active.id) !== 'error'
  })

  function getConnectionStatus(configId: string): ConnectionStatus {
    return connectionStatuses.value.get(configId) ?? 'unknown'
  }

  // Actions
  async function initialize(): Promise<void> {
    if (initialized.value) return
    isLoading.value = true

    try {
      await loadConfigs()
      initialized.value = true
      DebugUtils.store(MODULE_NAME, 'Initialized', { count: configs.value.length })
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize', { err })
    } finally {
      isLoading.value = false
    }
  }

  async function loadConfigs(): Promise<void> {
    configs.value = await gobizService.getConfigs()
  }

  async function createConfig(
    input: Parameters<typeof gobizService.createConfig>[0]
  ): Promise<GobizConfigPublic> {
    const config = await gobizService.createConfig(input)
    configs.value.push(config)
    connectionStatuses.value.set(config.id, 'unknown')
    DebugUtils.store(MODULE_NAME, 'Config created', { id: config.id })
    return config
  }

  async function updateConfig(
    id: string,
    updates: Parameters<typeof gobizService.updateConfig>[1]
  ): Promise<GobizConfigPublic> {
    const updated = await gobizService.updateConfig(id, updates)
    const index = configs.value.findIndex(c => c.id === id)
    if (index !== -1) {
      configs.value[index] = updated
    }
    DebugUtils.store(MODULE_NAME, 'Config updated', { id })
    return updated
  }

  async function deleteConfig(id: string): Promise<void> {
    await gobizService.deleteConfig(id)
    configs.value = configs.value.filter(c => c.id !== id)
    connectionStatuses.value.delete(id)
    DebugUtils.store(MODULE_NAME, 'Config deleted', { id })
  }

  async function testConnection(configId: string): Promise<GobizProxyResponse> {
    connectionStatuses.value.set(configId, 'checking')

    const result = await gobizService.testConnection(configId)

    if (result.success) {
      connectionStatuses.value.set(configId, 'connected')
      // Refresh config to get updated token info
      await reloadConfig(configId)
    } else {
      connectionStatuses.value.set(configId, 'error')
      await reloadConfig(configId)
    }

    DebugUtils.store(MODULE_NAME, 'Test connection', {
      configId,
      success: result.success
    })
    return result
  }

  async function getToken(configId: string): Promise<GobizProxyResponse> {
    const result = await gobizService.getToken(configId)
    if (result.success) {
      await reloadConfig(configId)
      connectionStatuses.value.set(configId, 'connected')
    }
    return result
  }

  async function refreshToken(configId: string): Promise<GobizProxyResponse> {
    const result = await gobizService.refreshToken(configId)
    if (result.success) {
      await reloadConfig(configId)
      connectionStatuses.value.set(configId, 'connected')
    }
    return result
  }

  // Reload a single config from DB (to pick up token updates from Edge Function)
  async function reloadConfig(configId: string): Promise<void> {
    try {
      const freshConfigs = await gobizService.getConfigs()
      const fresh = freshConfigs.find(c => c.id === configId)
      if (fresh) {
        const index = configs.value.findIndex(c => c.id === configId)
        if (index !== -1) {
          configs.value[index] = fresh
        }
      }
    } catch {
      // non-critical, config will refresh on next load
    }
  }

  // =====================================================
  // MENU SYNC ACTIONS
  // =====================================================

  async function loadSyncPreview(): Promise<MenuSyncPreview | null> {
    const config = activeConfig.value
    if (!config) {
      DebugUtils.error(MODULE_NAME, 'No active config for preview')
      return null
    }

    isPreviewLoading.value = true
    try {
      syncPreview.value = await gobizMenuSyncService.generatePreview(config)
      DebugUtils.store(MODULE_NAME, 'Preview loaded', {
        items: syncPreview.value.stats.totalItems,
        warnings: syncPreview.value.stats.warnings
      })
      return syncPreview.value
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to load preview', { err })
      syncPreview.value = null
      return null
    } finally {
      isPreviewLoading.value = false
    }
  }

  async function executeFullSync(): Promise<MenuSyncResult | null> {
    const config = activeConfig.value
    if (!config) {
      DebugUtils.error(MODULE_NAME, 'No active config for sync')
      return null
    }

    isSyncing.value = true
    try {
      const result = await gobizMenuSyncService.syncFullCatalog(config)
      lastSyncResult.value = result
      DebugUtils.store(MODULE_NAME, 'Full sync completed', {
        success: result.success,
        items: result.stats.totalItems
      })
      return result
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Full sync failed', { err })
      lastSyncResult.value = {
        success: false,
        syncedAt: new Date().toISOString(),
        stats: {
          totalCategories: 0,
          totalItems: 0,
          totalVariantCategories: 0,
          totalVariants: 0,
          skippedItems: 0,
          warnings: 0
        },
        warnings: [],
        errors: [{ code: 'EXCEPTION', message: String(err) }]
      }
      return lastSyncResult.value
    } finally {
      isSyncing.value = false
    }
  }

  async function toggleItemStock(
    externalId: string,
    inStock: boolean
  ): Promise<MenuSyncResult | null> {
    const config = activeConfig.value
    if (!config) return null

    isSyncing.value = true
    try {
      const result = await gobizMenuSyncService.syncItemStock(config, [
        { external_id: externalId, in_stock: inStock }
      ])
      DebugUtils.store(MODULE_NAME, 'Item stock toggled', { externalId, inStock })
      return result
    } finally {
      isSyncing.value = false
    }
  }

  async function fetchRemoteCatalog(): Promise<unknown> {
    const config = activeConfig.value
    if (!config) {
      throw new Error('No active GoBiz config')
    }
    return gobizMenuSyncService.fetchCurrentCatalog(config)
  }

  return {
    // State
    configs,
    isLoading,
    initialized,
    connectionStatuses,
    syncPreview,
    lastSyncResult,
    isSyncing,
    isPreviewLoading,

    // Getters
    activeConfig,
    isConnected,
    getConnectionStatus,

    // Actions
    initialize,
    loadConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    testConnection,
    getToken,
    refreshToken,

    // Menu sync actions
    loadSyncPreview,
    executeFullSync,
    toggleItemStock,
    fetchRemoteCatalog
  }
})
