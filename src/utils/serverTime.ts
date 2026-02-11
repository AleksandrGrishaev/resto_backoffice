// src/utils/serverTime.ts
// Server time synchronization utility
// Calculates the delta between client clock and server clock
// to handle device clock skew (common on tablets/kiosks)

import { supabaseConfig } from '@/supabase/config'
import { DebugUtils } from '@/utils/debugger'

const MODULE_NAME = 'ServerTime'

/** Delta in ms: serverTime - clientTime. Positive = client is behind. */
let serverTimeDelta = 0
let synced = false

/**
 * Sync client clock with server by reading HTTP Date header
 * from a lightweight Supabase REST API request.
 *
 * Uses HEAD request to minimize bandwidth.
 * Accounts for network latency by measuring round-trip time.
 */
export async function syncServerTime(): Promise<void> {
  try {
    const url = supabaseConfig.url
    const key = supabaseConfig.anonKey

    if (!url || !key) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not configured, skipping time sync')
      return
    }

    const clientBefore = Date.now()

    const response = await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    })

    const clientAfter = Date.now()
    const dateHeader = response.headers.get('Date')

    if (!dateHeader) {
      DebugUtils.warn(MODULE_NAME, 'No Date header in response, skipping time sync')
      return
    }

    const serverTime = new Date(dateHeader).getTime()
    // Assume server timestamp was captured at the midpoint of the round-trip
    const roundTrip = clientAfter - clientBefore
    const estimatedClientAtServer = clientBefore + roundTrip / 2

    serverTimeDelta = serverTime - estimatedClientAtServer
    synced = true

    const absDeltaSec = Math.abs(serverTimeDelta / 1000)

    if (absDeltaSec > 30) {
      DebugUtils.warn(MODULE_NAME, `Clock skew detected: ${Math.round(serverTimeDelta / 1000)}s`, {
        serverTimeDelta,
        roundTripMs: roundTrip,
        serverDate: dateHeader,
        clientDate: new Date(estimatedClientAtServer).toISOString()
      })
    } else {
      DebugUtils.info(MODULE_NAME, 'Time synced', {
        deltaMs: serverTimeDelta,
        roundTripMs: roundTrip
      })
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to sync server time', { error })
    // Keep delta at 0 — client time is used as fallback
  }
}

/**
 * Get current time adjusted to server clock.
 * Returns Date.now() + delta so it matches server timestamps.
 */
export function getServerNow(): number {
  return Date.now() + serverTimeDelta
}

/**
 * Whether server time has been synced at least once.
 */
export function isTimeSynced(): boolean {
  return synced
}

/**
 * Get the current server-client time delta in ms.
 */
export function getTimeDelta(): number {
  return serverTimeDelta
}
