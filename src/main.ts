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

// Global components
import { NumericInputField, NumericKeypad } from '@/components/input'

// App
import App from './App.vue'
import { DebugUtils } from './utils'
import { validateEnvironment } from '@/config/validateEnv'
import { ENV } from '@/config/environment'

const MODULE_NAME = 'Main'

// HMR Test: Force full reload
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
