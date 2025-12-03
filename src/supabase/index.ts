// src/supabase/index.ts - Supabase exports

export {
  supabase,
  getSupabaseClient,
  resetSupabaseClient,
  isSupabaseClientInitialized,
  ensureAuthSession,
  getCurrentUserId
} from './client'
export { supabaseConfig, isSupabaseConfigured, getSupabaseErrorMessage } from './config'
export type {
  Database,
  Json,
  PaymentMethod,
  CorrectionOperation,
  ExpenseOperation,
  OrderItem,
  PaymentDetails
} from './types'
