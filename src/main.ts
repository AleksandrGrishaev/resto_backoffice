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

    // Simple error handling
    console.error('Application bootstrap failed:', error)

    // Show error screen
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial;">
        <div style="text-align: center;">
          <h1>Application Failed to Start</h1>
          <p>Please refresh the page or contact support.</p>
          <button onclick="window.location.reload()">Refresh Page</button>
        </div>
      </div>
    `
  }
}

// Start the app (синхронно!)
initializeApp()
