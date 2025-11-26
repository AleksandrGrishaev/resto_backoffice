// src/utils/supabase.ts - Supabase utility functions with retry logic
import { withRetry, type RetryOptions } from '@/core/request/SupabaseRetryHandler'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

/**
 * Execute Supabase query with retry logic (returns array)
 *
 * @param query - Supabase query builder (SELECT)
 * @param operationName - Name for logging (e.g., 'MenuService.getAllCategories')
 * @param options - Retry configuration options
 * @returns Array of results
 *
 * @example
 * ```typescript
 * const products = await executeSupabaseQuery(
 *   supabase.from('products').select('*'),
 *   'ProductsStore.getAllProducts'
 * )
 * ```
 */
export async function executeSupabaseQuery<T>(
  query: PostgrestFilterBuilder<any, any, T[]>,
  operationName: string,
  options?: RetryOptions
): Promise<T[]> {
  return withRetry(
    async () => {
      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    },
    operationName,
    options
  )
}

/**
 * Execute Supabase single query with retry logic (returns single object)
 *
 * @param query - Supabase query builder with .single()
 * @param operationName - Name for logging
 * @param options - Retry configuration options
 * @returns Single object or null if not found
 *
 * @example
 * ```typescript
 * const product = await executeSupabaseSingle(
 *   supabase.from('products').select('*').eq('id', productId),
 *   'ProductsStore.getProductById'
 * )
 * ```
 */
export async function executeSupabaseSingle<T>(
  query: PostgrestFilterBuilder<any, any, T>,
  operationName: string,
  options?: RetryOptions
): Promise<T | null> {
  return withRetry(
    async () => {
      const { data, error } = await query.single()

      if (error) {
        // PGRST116 = Not found (this is OK, return null)
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    },
    operationName,
    options
  )
}

/**
 * Execute Supabase mutation with retry logic (INSERT/UPDATE/DELETE)
 *
 * @param operation - Async function that performs mutation
 * @param operationName - Name for logging
 * @param options - Retry configuration options
 * @returns Result of mutation
 *
 * @example
 * ```typescript
 * await executeSupabaseMutation(
 *   async () => {
 *     const { error } = await supabase
 *       .from('products')
 *       .update({ name: 'New Name' })
 *       .eq('id', productId)
 *     if (error) throw error
 *   },
 *   'ProductsStore.updateProduct'
 * )
 * ```
 */
export async function executeSupabaseMutation<T = void>(
  operation: () => Promise<T>,
  operationName: string,
  options?: RetryOptions
): Promise<T> {
  return withRetry(operation, operationName, options)
}
