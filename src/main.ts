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
import { piniaResetPlugin } from '@/plugins/piniaReset'

// Global components
import { NumericInputField, NumericKeypad } from '@/components/input'

// App
import App from './App.vue'
import { DebugUtils } from './utils'
import { validateEnvironment } from '@/config/validateEnv'
import { ENV } from '@/config/environment'

const MODULE_NAME = 'Main'

// ===== CHUNK LOADING ERROR HANDLER =====
// Handles stale chunk errors after deployment (when old chunks no longer exist)
window.addEventListener('vite:preloadError', event => {
  // Prevent default error handling
  event.preventDefault()

  console.warn('[Main] Chunk loading failed, reloading page...', event)

  // Check if we haven't already reloaded recently (prevent infinite loops)
  const lastReload = sessionStorage.getItem('chunk-reload-time')
  const now = Date.now()

  if (lastReload && now - parseInt(lastReload) < 10000) {
    // Already reloaded in the last 10 seconds, don't reload again
    console.error('[Main] Recent reload detected, not reloading again')
    return
  }

  // Mark reload time and refresh
  sessionStorage.setItem('chunk-reload-time', String(now))
  window.location.reload()
})

// ===== МИНИМАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ =====
function initializeApp() {
  try {
    // CRITICAL: Validate environment before anything else
    validateEnvironment()

    DebugUtils.info(MODULE_NAME, '🏁 Starting minimal application bootstrap')

    const app = createApp(App)
    const pinia = createPinia()
    pinia.use(piniaResetPlugin)

    // Регистрируем только базовые плагины
    app.use(pinia)
    app.use(router)
    app.use(vuetify)

    // Регистрируем глобальные компоненты для tablet-friendly input
    app.component('NumericInputField', NumericInputField)
    app.component('NumericKeypad', NumericKeypad)

    // Монтируем приложение
    app.mount('#app')

    DebugUtils.info(MODULE_NAME, '✅ Minimal application bootstrapped')
    DebugUtils.info(MODULE_NAME, '📝 Note: Stores will be loaded after authentication')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '💥 Failed to bootstrap application', { error })

    // Log error to console for debugging
    console.error('Application bootstrap failed:', error)

    // Show user-friendly error screen
    const errorMessage = error instanceof Error ? error.message : String(error)
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; background: #141416; color: #fff; padding: 20px;">
        <div style="max-width: 600px; text-align: center;">
          <h1 style="color: #FF9676; margin-bottom: 20px;">Application Failed to Start</h1>
          <p style="color: #BFB5F2; margin-bottom: 30px;">
            Please check your configuration or contact support if the problem persists.
          </p>
          <details style="background: #1A1A1E; border: 1px solid #333; border-radius: 8px; padding: 20px; text-align: left; margin-bottom: 30px;">
            <summary style="cursor: pointer; color: #A395E9; font-weight: bold; margin-bottom: 10px;">Error Details</summary>
            <pre style="background: #0d0d0f; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 13px; color: #FF9676; margin-top: 10px;">${errorMessage}</pre>
          </details>
          <button onclick="window.location.reload()" style="background: #A395E9; color: #141416; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: bold;">
            Refresh Page
          </button>
        </div>
      </div>
    `
  }
}

// Start the app (синхронно!)
initializeApp()
