// src/integrations/gobiz/gobizService.ts - Client-side GoBiz service

import { supabase } from '@/supabase/client'
import type {
  GobizConfigPublic,
  CreateGobizConfigInput,
  UpdateGobizConfigInput,
  GobizProxyRequest,
  GobizProxyResponse
} from './types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'GobizService'

// DB row → GobizConfigPublic (no secrets)
function mapConfigFromDb(row: Record<string, unknown>): GobizConfigPublic {
  const tokenExpiresAt = row.token_expires_at as string | null
  const isConnected =
    !!row.access_token && !!tokenExpiresAt && new Date(tokenExpiresAt).getTime() > Date.now()

  return {
    id: row.id as string,
    outletId: (row.outlet_id as string) ?? '',
    outletName: (row.outlet_name as string) ?? undefined,
    partnerId: (row.partner_id as string) ?? undefined,
    clientId: row.client_id as string,
    environment: row.environment as 'sandbox' | 'production',
    isActive: row.is_active as boolean,
    isConnected,
    tokenExpiresAt: tokenExpiresAt ?? undefined,
    lastError: (row.last_error as string) ?? undefined,
    lastErrorAt: (row.last_error_at as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export class GobizService {
  // =====================================================
  // CONFIG CRUD (direct Supabase queries, admin-only via RLS)
  // =====================================================

  async getConfigs(): Promise<GobizConfigPublic[]> {
    const { data, error } = await supabase
      .from('gobiz_config')
      .select(
        'id, outlet_id, outlet_name, partner_id, client_id, environment, is_active, access_token, token_expires_at, last_error, last_error_at, created_at, updated_at'
      )
      .order('created_at')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load configs', { error })
      throw error
    }

    return (data || []).map(mapConfigFromDb)
  }

  async createConfig(input: CreateGobizConfigInput): Promise<GobizConfigPublic> {
    const { data, error } = await supabase
      .from('gobiz_config')
      .insert({
        outlet_id: input.outletId ?? '',
        outlet_name: input.outletName ?? null,
        partner_id: input.partnerId ?? null,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        environment: input.environment
      })
      .select(
        'id, outlet_id, outlet_name, partner_id, client_id, environment, is_active, access_token, token_expires_at, last_error, last_error_at, created_at, updated_at'
      )
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create config', { error })
      throw error
    }

    DebugUtils.info(MODULE_NAME, 'Config created', { id: data.id })
    return mapConfigFromDb(data)
  }

  async updateConfig(id: string, updates: UpdateGobizConfigInput): Promise<GobizConfigPublic> {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.outletId !== undefined) dbUpdates.outlet_id = updates.outletId
    if (updates.outletName !== undefined) dbUpdates.outlet_name = updates.outletName
    if (updates.partnerId !== undefined) dbUpdates.partner_id = updates.partnerId
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId
    if (updates.clientSecret !== undefined) dbUpdates.client_secret = updates.clientSecret
    if (updates.environment !== undefined) dbUpdates.environment = updates.environment
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive

    const { data, error } = await supabase
      .from('gobiz_config')
      .update(dbUpdates)
      .eq('id', id)
      .select(
        'id, outlet_id, outlet_name, partner_id, client_id, environment, is_active, access_token, token_expires_at, last_error, last_error_at, created_at, updated_at'
      )
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update config', { error })
      throw error
    }

    DebugUtils.info(MODULE_NAME, 'Config updated', { id })
    return mapConfigFromDb(data)
  }

  async deleteConfig(id: string): Promise<void> {
    const { error } = await supabase.from('gobiz_config').delete().eq('id', id)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete config', { error })
      throw error
    }

    DebugUtils.info(MODULE_NAME, 'Config deleted', { id })
  }

  // =====================================================
  // PROXY CALLS (via Edge Function)
  // =====================================================

  private async callProxy(request: GobizProxyRequest): Promise<GobizProxyResponse> {
    DebugUtils.info(MODULE_NAME, `Proxy call: ${request.action}`, {
      configId: request.configId
    })

    const { data, error } = await supabase.functions.invoke('gobiz-proxy', {
      body: request
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Proxy call failed', { error })
      return { success: false, error: error.message }
    }

    return data as GobizProxyResponse
  }

  async testConnection(configId: string): Promise<GobizProxyResponse> {
    return this.callProxy({ action: 'test_connection', configId })
  }

  async getToken(configId: string): Promise<GobizProxyResponse> {
    return this.callProxy({ action: 'get_token', configId })
  }

  async refreshToken(configId: string): Promise<GobizProxyResponse> {
    return this.callProxy({ action: 'refresh_token', configId })
  }

  async apiCall(
    configId: string,
    method: GobizProxyRequest['method'],
    path: string,
    body?: unknown
  ): Promise<GobizProxyResponse> {
    return this.callProxy({ action: 'api_call', configId, method, path, body })
  }

  // =====================================================
  // CONVENIENCE METHODS
  // =====================================================

  async outletLink(configId: string, body: unknown): Promise<GobizProxyResponse> {
    return this.callProxy({ action: 'outlet_link', configId, body })
  }

  async getCatalog(configId: string, outletId: string): Promise<GobizProxyResponse> {
    return this.apiCall(configId, 'GET', `/integrations/gofood/outlets/${outletId}/v2/catalog`)
  }
}

// Singleton
export const gobizService = new GobizService()
