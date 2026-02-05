// === GoBiz Integration Types ===

export type GobizEnvironment = 'sandbox' | 'production'

// Full config (used server-side / Edge Function)
export interface GobizConfig {
  id: string
  outletId: string
  outletName?: string
  partnerId?: string
  clientId: string
  clientSecret: string
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: string
  environment: GobizEnvironment
  webhookSecret?: string
  settings: Record<string, unknown>
  isActive: boolean
  lastError?: string
  lastErrorAt?: string
  createdAt: string
  updatedAt: string
}

// Public config for UI (no secrets)
export interface GobizConfigPublic {
  id: string
  outletId: string
  outletName?: string
  partnerId?: string
  clientId: string
  environment: GobizEnvironment
  isActive: boolean
  isConnected: boolean
  tokenExpiresAt?: string
  lastError?: string
  lastErrorAt?: string
  createdAt: string
  updatedAt: string
}

// Input for creating a new config
export interface CreateGobizConfigInput {
  outletId?: string
  outletName?: string
  partnerId?: string
  clientId: string
  clientSecret: string
  environment: GobizEnvironment
}

// Input for updating an existing config
export interface UpdateGobizConfigInput {
  outletId?: string
  outletName?: string
  partnerId?: string
  clientId?: string
  clientSecret?: string
  environment?: GobizEnvironment
  isActive?: boolean
}

// === OAuth ===

export interface GobizTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

// === Edge Function Proxy ===

export type GobizProxyAction =
  | 'get_token'
  | 'refresh_token'
  | 'test_connection'
  | 'api_call'
  | 'outlet_link'

export interface GobizProxyRequest {
  action: GobizProxyAction
  configId: string
  // For api_call:
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path?: string
  body?: unknown
}

export interface GobizProxyResponse {
  success: boolean
  data?: unknown
  error?: string
  tokenRefreshed?: boolean
}

// === GoBiz API Response ===

export interface GobizApiError {
  code: string
  message: string
}

export interface GobizApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: GobizApiError
}

// === GoBiz Endpoints by Environment ===

export const GOBIZ_ENDPOINTS = {
  sandbox: {
    oauth: 'https://integration-goauth.gojekapi.com/oauth2/token',
    api: 'https://api.partner-sandbox.gobiz.co.id'
  },
  production: {
    oauth: 'https://accounts.go-jek.com/oauth2/token',
    api: 'https://api.gobiz.co.id'
  }
} as const
