// src/main.ts - ОБНОВЛЕННЫЙ с правильным импортом
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth' // 🔄 ИЗМЕНЕН ИМПОРТ
import router from '@/router'

// Styles
import '@/styles/main.scss'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

// Plugins
import { vuetify } from '@/plugins/vuetify'

// App
import App from './App.vue'
import { DebugUtils } from './utils'

// App initializer
import { useAppInitializer } from '@/core/appInitializer'

const MODULE_NAME = 'Main'

// ===== ИНИЦИАЛИЗАЦИЯ СЕРВИСОВ =====
const initServices = async () => {
  const authStore = useAuthStore()

  // 🔄 УПРОЩЕНО: убираем initializeDefaultUsers, так как пользователи теперь в CoreUserService
  DebugUtils.info(MODULE_NAME, '🔐 Auth store ready')
}

// ===== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ =====
async function initializeApp() {
  try {
    DebugUtils.info(MODULE_NAME, '🏁 Starting application bootstrap')

    const app = createApp(App)
    const pinia = createPinia()

    // Register plugins
    app.use(pinia)
    app.use(router)
    app.use(vuetify)

    // Initialize auth services first
    await initServices()
    DebugUtils.info(MODULE_NAME, '🔐 Auth services initialized')

    // Initialize all stores with proper loading order
    try {
      const appInitializer = useAppInitializer()
      await appInitializer.initialize()
      DebugUtils.info(MODULE_NAME, '🗄️ All stores initialized')
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Some stores failed to initialize (non-critical)', { error })
      // Продолжаем работу даже если stores не загрузились
    }

    // Mount application
    app.mount('#app')

    DebugUtils.info(MODULE_NAME, '🎉 Application bootstrapped successfully')
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

// Start the app
initializeApp()
