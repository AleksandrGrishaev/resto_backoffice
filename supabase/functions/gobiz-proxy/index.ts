import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ENDPOINTS = {
  sandbox: {
    oauth: 'https://integration-goauth.gojekapi.com/oauth2/token',
    api: 'https://api.partner-sandbox.gobiz.co.id'
  },
  production: {
    oauth: 'https://accounts.go-jek.com/oauth2/token',
    api: 'https://api.gobiz.co.id'
  }
} as const

// Scopes for facilitator (POS partner) model
// Note: openid/offline are NOT supported for client_credentials grant
const FACILITATOR_SCOPES = [
  'partner:outlet:read',
  'partner:outlet:write',
  'gofood:catalog:read',
  'gofood:catalog:write',
  'gofood:order:read',
  'gofood:order:write',
  'gofood:outlet:write'
].join(' ')

type Environment = 'sandbox' | 'production'

interface GobizProxyRequest {
  action: 'get_token' | 'refresh_token' | 'test_connection' | 'api_call' | 'outlet_link'
  configId: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path?: string
  body?: unknown
}

interface ConfigRow {
  id: string
  outlet_id: string
  partner_id: string | null
  client_id: string
  client_secret: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  environment: Environment
}

function supabaseAdmin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

async function getConfig(configId: string): Promise<ConfigRow> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('gobiz_config')
    .select(
      'id, outlet_id, partner_id, client_id, client_secret, access_token, refresh_token, token_expires_at, environment'
    )
    .eq('id', configId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error(`Config not found: ${error?.message ?? 'not found'}`)
  }
  return data as ConfigRow
}

async function requestToken(
  config: ConfigRow
): Promise<{ access_token: string; expires_in: number }> {
  const endpoints = ENDPOINTS[config.environment]

  const res = await fetch(endpoints.oauth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.client_id,
      client_secret: config.client_secret,
      scope: FACILITATOR_SCOPES
    })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OAuth failed (${res.status}): ${text}`)
  }

  return await res.json()
}

async function saveToken(configId: string, accessToken: string, expiresIn: number): Promise<void> {
  const sb = supabaseAdmin()
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  await sb
    .from('gobiz_config')
    .update({
      access_token: accessToken,
      token_expires_at: expiresAt,
      last_error: null,
      last_error_at: null
    })
    .eq('id', configId)
}

async function saveError(configId: string, error: string): Promise<void> {
  const sb = supabaseAdmin()
  await sb
    .from('gobiz_config')
    .update({
      last_error: error,
      last_error_at: new Date().toISOString()
    })
    .eq('id', configId)
}

async function ensureValidToken(config: ConfigRow): Promise<{ token: string; refreshed: boolean }> {
  // Check if current token is still valid (with 5 min buffer)
  if (config.access_token && config.token_expires_at) {
    const expiresAt = new Date(config.token_expires_at).getTime()
    const buffer = 5 * 60 * 1000 // 5 minutes
    if (Date.now() < expiresAt - buffer) {
      return { token: config.access_token, refreshed: false }
    }
  }

  // Token expired or missing - get a new one
  const tokenRes = await requestToken(config)
  await saveToken(config.id, tokenRes.access_token, tokenRes.expires_in)
  return { token: tokenRes.access_token, refreshed: true }
}

async function callGobizApi(
  config: ConfigRow,
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const endpoints = ENDPOINTS[config.environment]
  const url = `${endpoints.api}${path}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json'
  }
  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  return await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
}

// === Action Handlers ===

async function handleGetToken(configId: string) {
  const config = await getConfig(configId)
  const tokenRes = await requestToken(config)
  await saveToken(configId, tokenRes.access_token, tokenRes.expires_in)
  return { success: true, data: { expires_in: tokenRes.expires_in } }
}

async function handleTestConnection(configId: string) {
  const config = await getConfig(configId)

  // Step 1: Get token (validates credentials)
  const tokenRes = await requestToken(config)
  await saveToken(configId, tokenRes.access_token, tokenRes.expires_in)

  // Step 2: If outlet_id exists, try fetching catalog
  if (config.outlet_id) {
    const catalogRes = await callGobizApi(
      config,
      tokenRes.access_token,
      'GET',
      `/integrations/gofood/outlets/${config.outlet_id}/v2/catalog`
    )

    if (!catalogRes.ok) {
      const text = await catalogRes.text()
      // Token worked but catalog failed - still a partial success
      return {
        success: true,
        data: {
          message: 'Token obtained, but catalog request failed',
          environment: config.environment,
          partner_id: config.partner_id,
          token_ok: true,
          catalog_error: `${catalogRes.status}: ${text}`
        }
      }
    }

    const catalogData = await catalogRes.json()
    return {
      success: true,
      data: {
        message: 'Connected successfully',
        environment: config.environment,
        partner_id: config.partner_id,
        outlet_id: config.outlet_id,
        token_ok: true,
        catalog_items: Array.isArray(catalogData?.categories) ? catalogData.categories.length : 0
      }
    }
  }

  // No outlet_id - token success is enough for facilitator model
  return {
    success: true,
    data: {
      message: 'Authentication successful (no outlet linked yet)',
      environment: config.environment,
      partner_id: config.partner_id,
      token_ok: true
    }
  }
}

async function handleOutletLink(configId: string, body: unknown) {
  const config = await getConfig(configId)
  const { token } = await ensureValidToken(config)

  const res = await callGobizApi(config, token, 'PUT', '/integrations/partner/v1/outlet-link', body)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Outlet link failed (${res.status}): ${text}`)
  }

  const data = await res.json()

  // If response has outlet_id, save it to config
  if (data?.outlet_id) {
    const sb = supabaseAdmin()
    await sb.from('gobiz_config').update({ outlet_id: data.outlet_id }).eq('id', configId)
  }

  return { success: true, data }
}

async function handleApiCall(configId: string, method: string, path: string, body?: unknown) {
  const config = await getConfig(configId)

  // Ensure we have a valid token
  let { token, refreshed } = await ensureValidToken(config)

  // Make the API call
  let res = await callGobizApi(config, token, method, path, body)

  // If 401, try refreshing token once
  if (res.status === 401 && !refreshed) {
    const tokenRes = await requestToken(config)
    await saveToken(configId, tokenRes.access_token, tokenRes.expires_in)
    token = tokenRes.access_token
    refreshed = true
    res = await callGobizApi(config, token, method, path, body)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GoBiz API error (${res.status}): ${text}`)
  }

  const data = await res.json()
  return { success: true, data, tokenRefreshed: refreshed }
}

// === Main Handler ===

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    })
  }

  try {
    const body: GobizProxyRequest = await req.json()
    const { action, configId } = body

    if (!configId) {
      return jsonResponse({ success: false, error: 'configId is required' }, 400)
    }

    let result

    switch (action) {
      case 'get_token':
        result = await handleGetToken(configId)
        break

      case 'refresh_token':
        result = await handleGetToken(configId) // same flow for client_credentials
        break

      case 'test_connection':
        result = await handleTestConnection(configId)
        break

      case 'outlet_link':
        result = await handleOutletLink(configId, body.body)
        break

      case 'api_call': {
        if (!body.path) {
          return jsonResponse({ success: false, error: 'path is required for api_call' }, 400)
        }
        result = await handleApiCall(configId, body.method ?? 'GET', body.path, body.body)
        break
      }

      default:
        return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400)
    }

    return jsonResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    // Try to save error to config
    try {
      const body = await req.clone().json()
      if (body?.configId) {
        await saveError(body.configId, message)
      }
    } catch {
      // ignore
    }

    return jsonResponse({ success: false, error: message }, 500)
  }
})

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      Connection: 'keep-alive'
    }
  })
}
