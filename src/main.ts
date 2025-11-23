// src/main.ts - МИНИМАЛЬНАЯ инициализация (БЕЗ загрузки stores)
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'

// ✅ ПРАВИЛЬНЫЙ ПОРЯДОК ЗАГРУЗКИ СТИЛЕЙ:
// 1. Сначала Vuetify стили
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

// 2. Потом наши кастомные стили (они переопределят Vuetify)
import '@/styles/main.scss'

// Plugins
import { vuetify } from '@/plugins/vuetify'

// App
import App from './App.vue'
import { DebugUtils } from './utils'
import { validateEnvironment } from '@/config/validateEnv'

const MODULE_NAME = 'Main'

// ===== МИНИМАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ =====
function initializeApp() {
  try {
    // CRITICAL: Validate environment before anything else
    validateEnvironment()

    DebugUtils.info(MODULE_NAME, '🏁 Starting minimal application bootstrap')

    const app = createApp(App)
    const pinia = createPinia()

    // Регистрируем только базовые плагины
    app.use(pinia)
    app.use(router)
    app.use(vuetify)

    // Монтируем приложение
    app.mount('#app')

    DebugUtils.info(MODULE_NAME, '✅ Minimal application bootstrapped')
    DebugUtils.info(MODULE_NAME, '📝 Note: Stores will be loaded after authentication')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '💥 Failed to bootstrap application', { error })

    // DIAGNOSTIC: Get all VITE_ environment variables
    const viteEnvVars: Record<string, string> = {}
    Object.keys(import.meta.env).forEach(key => {
      if (key.startsWith('VITE_')) {
        const value = import.meta.env[key]
        // Mask sensitive values
        if (key.includes('KEY') || key.includes('SECRET')) {
          viteEnvVars[key] = value ? `${String(value).slice(0, 20)}...` : 'undefined'
        } else {
          viteEnvVars[key] = String(value)
        }
      }
    })

    // Get error details
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ''

    // CRITICAL: Log to console (may be stripped in production, but we're temporarily disabling that)
    console.error('=== APPLICATION BOOTSTRAP FAILED ===')
    console.error('Error:', errorMessage)
    console.error('Stack:', errorStack)
    console.error('Available VITE_* env vars:', viteEnvVars)

    // Show detailed error screen (this CAN'T be stripped by Terser)
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; background: #141416; color: #fff; padding: 20px;">
        <div style="max-width: 800px; width: 100%;">
          <h1 style="color: #FF9676; margin-bottom: 10px;">⚠️ Application Failed to Start</h1>
          <p style="color: #92C9AF; margin-bottom: 30px;">Diagnostic information below:</p>

          <div style="background: #1A1A1E; border: 1px solid #333; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #A395E9; font-size: 18px;">Error Details:</h2>
            <pre style="background: #0d0d0f; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 14px; color: #FF9676;">${errorMessage}</pre>
          </div>

          <div style="background: #1A1A1E; border: 1px solid #333; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #A395E9; font-size: 18px;">Environment Variables (VITE_*):</h2>
            <pre style="background: #0d0d0f; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(viteEnvVars, null, 2)}</pre>
          </div>

          <div style="background: #1A1A1E; border: 1px solid #333; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #A395E9; font-size: 18px;">Required Variables:</h2>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
              <li><code>VITE_SUPABASE_URL</code> - Supabase project URL</li>
              <li><code>VITE_SUPABASE_ANON_KEY</code> - Supabase anonymous key</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <button onclick="window.location.reload()" style="background: #A395E9; color: #141416; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: bold;">
              Refresh Page
            </button>
          </div>

          <details style="margin-top: 30px; background: #1A1A1E; border: 1px solid #333; border-radius: 8px; padding: 15px;">
            <summary style="cursor: pointer; color: #BFB5F2; font-weight: bold;">Stack Trace (click to expand)</summary>
            <pre style="background: #0d0d0f; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 11px; margin-top: 10px;">${errorStack || 'No stack trace available'}</pre>
          </details>
        </div>
      </div>
    `
  }
}

// Start the app (синхронно!)
initializeApp()
