/**
 * Environment Variable Validation
 *
 * Validates environment variables on app startup to prevent
 * deployment with invalid configuration.
 *
 * CRITICAL SECURITY CHECKS:
 * - Prevents SERVICE_KEY usage in production
 * - Ensures required Supabase credentials are set
 * - Validates offline-first configuration for POS
 */

interface EnvironmentValidationError {
  type: 'missing' | 'invalid' | 'security' | 'warning'
  message: string
  variable?: string
}

/**
 * Validate environment variables on app start
 * Throws error if critical validation fails
 */
export function validateEnvironment(): void {
  const errors: EnvironmentValidationError[] = []
  const warnings: EnvironmentValidationError[] = []

  // Check required variables
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

  const missingVars = requiredVars.filter((key) => !import.meta.env[key])

  if (missingVars.length > 0) {
    errors.push({
      type: 'missing',
      message: `Missing required environment variables: ${missingVars.join(', ')}`,
    })
  }

  // CRITICAL: Production-specific validation
  if (import.meta.env.PROD) {
    console.log('🔍 Running production environment validation...')

    // 🚨 CRITICAL: No SERVICE_KEY in production!
    if (import.meta.env.VITE_SUPABASE_USE_SERVICE_KEY === 'true') {
      errors.push({
        type: 'security',
        message:
          '🚨 CRITICAL SECURITY ERROR: SERVICE_KEY cannot be used in production! ' +
          'This bypasses Row Level Security policies and is a major security risk.',
        variable: 'VITE_SUPABASE_USE_SERVICE_KEY',
      })
    }

    // Check if SERVICE_KEY is accidentally set
    if (import.meta.env.VITE_SUPABASE_SERVICE_KEY) {
      errors.push({
        type: 'security',
        message:
          '🚨 CRITICAL: VITE_SUPABASE_SERVICE_KEY should not be set in production build! ' +
          'Remove this variable from .env.production',
        variable: 'VITE_SUPABASE_SERVICE_KEY',
      })
    }

    // Warn if debug is enabled
    if (import.meta.env.VITE_DEBUG_ENABLED === 'true') {
      warnings.push({
        type: 'warning',
        message:
          '⚠️ Debug logging is enabled in production. ' +
          'This may impact performance and expose sensitive data in console.',
        variable: 'VITE_DEBUG_ENABLED',
      })
    }

    // Ensure offline-first is enabled for POS
    if (import.meta.env.VITE_POS_OFFLINE_FIRST !== 'true') {
      warnings.push({
        type: 'warning',
        message:
          '⚠️ POS offline-first mode is disabled in production. ' +
          'This may cause issues when internet connection is lost.',
        variable: 'VITE_POS_OFFLINE_FIRST',
      })
    }

    // Check Supabase URL format
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
      warnings.push({
        type: 'invalid',
        message: '⚠️ Supabase URL should use HTTPS in production',
        variable: 'VITE_SUPABASE_URL',
      })
    }
  }

  // Development-specific validation
  if (import.meta.env.DEV) {
    console.log('🔍 Running development environment validation...')

    // Warn if SERVICE_KEY is used (but allow it in dev)
    if (import.meta.env.VITE_SUPABASE_USE_SERVICE_KEY === 'true') {
      console.warn(
        '⚠️ Using SERVICE_KEY in development mode. ' +
          'This bypasses RLS policies - only use for testing!'
      )
    }

    // Check if Firebase is still enabled (should be removed)
    if (import.meta.env.VITE_USE_FIREBASE === 'true') {
      warnings.push({
        type: 'warning',
        message:
          '⚠️ Firebase is enabled. This is legacy and should be removed. ' +
          'Use VITE_USE_SUPABASE=true instead.',
        variable: 'VITE_USE_FIREBASE',
      })
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    console.group('⚠️ Environment Warnings')
    warnings.forEach((warning) => {
      console.warn(`  ${warning.message}`)
      if (warning.variable) {
        console.warn(`  Variable: ${warning.variable}`)
      }
    })
    console.groupEnd()
  }

  // Handle errors
  if (errors.length > 0) {
    console.group('❌ Environment Validation Failed')
    errors.forEach((error) => {
      console.error(`  ${error.message}`)
      if (error.variable) {
        console.error(`  Variable: ${error.variable}`)
      }
    })
    console.groupEnd()

    // Throw error to prevent app startup with invalid config
    const errorMessage = errors.map((e) => e.message).join('\n')
    throw new Error(`Environment validation failed:\n${errorMessage}`)
  }

  // Success
  const mode = import.meta.env.MODE
  const env = import.meta.env.PROD ? 'production' : 'development'
  console.log(
    `✅ Environment validation passed (mode: ${mode}, env: ${env})`
  )

  // Display key configuration
  console.group('📋 Environment Configuration')
  console.log(
    `  App Title: ${import.meta.env.VITE_APP_TITLE || 'Kitchen App'}`
  )
  console.log(`  Platform: ${import.meta.env.VITE_PLATFORM || 'web'}`)
  console.log(
    `  Supabase: ${import.meta.env.VITE_USE_SUPABASE === 'true' ? '✅' : '❌'}`
  )
  console.log(
    `  Debug: ${import.meta.env.VITE_DEBUG_ENABLED === 'true' ? '✅' : '❌'}`
  )
  console.log(
    `  Offline-first: ${import.meta.env.VITE_POS_OFFLINE_FIRST === 'true' ? '✅' : '❌'}`
  )
  console.groupEnd()
}

/**
 * Get environment mode
 */
export function getEnvironmentMode(): 'development' | 'staging' | 'production' {
  if (import.meta.env.PROD) {
    // Check if staging based on app title or URL
    const isStaging =
      import.meta.env.VITE_APP_TITLE?.includes('STAGING') ||
      import.meta.env.VITE_SUPABASE_URL?.includes('staging')

    return isStaging ? 'staging' : 'production'
  }

  return 'development'
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD && getEnvironmentMode() === 'production'
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV
}

/**
 * Check if running in staging mode
 */
export function isStaging(): boolean {
  return getEnvironmentMode() === 'staging'
}
