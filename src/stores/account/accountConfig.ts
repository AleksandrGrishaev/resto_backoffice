// src/stores/account/accountConfig.ts
// Runtime account configuration - supports both string IDs (dev) and UUID (production)

import type { AccountType } from './types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AccountConfig'

interface AccountConfig {
  id: string | null
  name: string
  type: AccountType
}

/**
 * Runtime account configuration
 * IDs are loaded dynamically from database at app startup
 *
 * This approach allows the app to work with both:
 * - Dev environment: string IDs like 'acc_1', 'acc_2', 'acc_3'
 * - Production environment: UUID format like 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
 */
export const ACCOUNT_CONFIG = {
  POS_CASH: {
    id: null as string | null,
    name: 'Main Cash Register',
    type: 'cash' as AccountType
  },
  BANK_PRIMARY: {
    id: null as string | null,
    name: 'Bank Account - BCA',
    type: 'bank' as AccountType
  },
  CARD_TERMINAL: {
    id: null as string | null,
    name: 'Card Terminal',
    type: 'card' as AccountType
  }
} as const

let initialized = false

/**
 * Initialize account IDs from database
 * Call this once on app startup (after critical stores are initialized)
 *
 * @param supabase - Supabase client instance
 *
 * @example
 * ```typescript
 * // In AppInitializer.ts
 * await initializeAccountConfig(supabase)
 * ```
 */
export async function initializeAccountConfig(supabase: any): Promise<void> {
  if (initialized) {
    DebugUtils.debug(MODULE_NAME, 'Account config already initialized, skipping')
    return
  }

  try {
    DebugUtils.info(MODULE_NAME, '🔄 Initializing account configuration from database...')

    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, name, type')
      .in('name', ['Main Cash Register', 'Bank Account - BCA', 'Card Terminal'])

    if (error) {
      throw error
    }

    if (!accounts || accounts.length === 0) {
      DebugUtils.warn(
        MODULE_NAME,
        '⚠️ No operational accounts found in database. Account operations may fail.',
        {
          expectedAccounts: ['Main Cash Register', 'Bank Account - BCA', 'Card Terminal']
        }
      )
      return
    }

    // Map accounts to config by name
    accounts.forEach((acc: any) => {
      if (acc.name === 'Main Cash Register') {
        ACCOUNT_CONFIG.POS_CASH.id = acc.id
      } else if (acc.name === 'Bank Account - BCA') {
        ACCOUNT_CONFIG.BANK_PRIMARY.id = acc.id
      } else if (acc.name === 'Card Terminal') {
        ACCOUNT_CONFIG.CARD_TERMINAL.id = acc.id
      }
    })

    initialized = true

    DebugUtils.info(MODULE_NAME, '✅ Account config initialized successfully', {
      posCash: ACCOUNT_CONFIG.POS_CASH.id,
      bank: ACCOUNT_CONFIG.BANK_PRIMARY.id,
      card: ACCOUNT_CONFIG.CARD_TERMINAL.id,
      format: isUUID(ACCOUNT_CONFIG.POS_CASH.id || '') ? 'UUID' : 'String'
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Failed to initialize account config', { error })
    // Don't throw - allow app to start but warn that account operations may fail
  }
}

/**
 * Get POS cash account ID
 *
 * @returns POS cash account ID (string or UUID)
 * @throws Error if account config not initialized
 *
 * @example
 * ```typescript
 * const accountId = getPOSCashAccountId()
 * await accountStore.createOperation({ accountId, ... })
 * ```
 */
export function getPOSCashAccountId(): string {
  if (!ACCOUNT_CONFIG.POS_CASH.id) {
    throw new Error(
      'Account config not initialized. Call initializeAccountConfig() on app startup.'
    )
  }
  return ACCOUNT_CONFIG.POS_CASH.id
}

/**
 * Get bank account ID
 *
 * @returns Bank account ID (string or UUID)
 * @throws Error if account config not initialized
 */
export function getBankAccountId(): string {
  if (!ACCOUNT_CONFIG.BANK_PRIMARY.id) {
    throw new Error(
      'Account config not initialized. Call initializeAccountConfig() on app startup.'
    )
  }
  return ACCOUNT_CONFIG.BANK_PRIMARY.id
}

/**
 * Get card terminal account ID
 *
 * @returns Card terminal account ID (string or UUID)
 * @throws Error if account config not initialized
 */
export function getCardAccountId(): string {
  if (!ACCOUNT_CONFIG.CARD_TERMINAL.id) {
    throw new Error(
      'Account config not initialized. Call initializeAccountConfig() on app startup.'
    )
  }
  return ACCOUNT_CONFIG.CARD_TERMINAL.id
}

/**
 * Check if account config is initialized
 *
 * @returns true if initialized
 */
export function isAccountConfigInitialized(): boolean {
  return initialized
}

/**
 * Check if an ID is UUID format
 *
 * @param id - ID to check
 * @returns true if UUID format
 */
export function isUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Backwards compatibility: map old string IDs to new UUIDs
 * Only needed if you want to support old code that still uses hardcoded IDs
 *
 * @param id - Account ID (string or UUID)
 * @returns Normalized account ID
 *
 * @example
 * ```typescript
 * const normalizedId = normalizeAccountId('acc_1')
 * // Returns: 'a1b2c3d4-...' in production or 'acc_1' in dev
 * ```
 */
export function normalizeAccountId(id: string): string {
  // If already UUID, return as-is
  if (isUUID(id)) {
    return id
  }

  // Map old string IDs (dev environment)
  const legacyMapping: Record<string, string> = {
    acc_1: ACCOUNT_CONFIG.POS_CASH.id || 'acc_1',
    acc_2: ACCOUNT_CONFIG.BANK_PRIMARY.id || 'acc_2',
    acc_3: ACCOUNT_CONFIG.CARD_TERMINAL.id || 'acc_3'
  }

  return legacyMapping[id] || id
}

/**
 * Get POS cash account ID with fallback for dev environment
 * This is a wrapper that provides backwards compatibility
 *
 * @returns POS cash account ID
 *
 * @example
 * ```typescript
 * // Safer version with fallback
 * const accountId = getPOSCashAccountWithFallback()
 * ```
 */
export function getPOSCashAccountWithFallback(): string {
  try {
    return getPOSCashAccountId()
  } catch (error) {
    // Fallback for dev environment or during initialization
    console.warn('⚠️ Account config not initialized, using fallback POS cash account ID')
    return 'acc_1' // Legacy dev ID
  }
}

/**
 * Reset initialization state (for testing)
 * @internal
 */
export function __resetAccountConfig(): void {
  initialized = false
  ACCOUNT_CONFIG.POS_CASH.id = null
  ACCOUNT_CONFIG.BANK_PRIMARY.id = null
  ACCOUNT_CONFIG.CARD_TERMINAL.id = null
}
