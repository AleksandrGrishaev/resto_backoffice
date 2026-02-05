// src/stores/gobiz/gobizStore.ts - GoBiz integration state management

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GobizConfigPublic, GobizProxyResponse } from '@/integrations/gobiz/types'
import { gobizService } from '@/integrations/gobiz/gobizService'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'GobizStore'

export type ConnectionStatus = 'connected' | 'error' | 'checking' | 'unknown'

export const useGobizStore = defineStore('gobiz', () => {
  // State
  const configs = ref<GobizConfigPublic[]>([])
  const isLoading = ref(false)
  const initialized = ref(false)
  const connectionStatuses = ref<Map<string, ConnectionStatus>>(new Map())

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

  return {
    // State
    configs,
    isLoading,
    initialized,
    connectionStatuses,

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
    refreshToken
  }
})
