// src/main.ts - Шаг 1: Добавляем инициализацию

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
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

// 🆕 NEW: App initializer
import { useAppInitializer } from '@/core/appInitializer'

const MODULE_NAME = 'Main'

// Services initialization (existing)
const initServices = async () => {
  const authStore = useAuthStore()
  await authStore.initializeDefaultUsers?.()
}

// App initialization with store loading
async function initializeApp() {
  try {
    DebugUtils.info(MODULE_NAME, '🏁 Starting application bootstrap')

    const app = createApp(App)
    const pinia = createPinia()

    // Register plugins
    app.use(pinia)
    app.use(router)
    app.use(vuetify)

    // Initialize auth services first (existing)
    await initServices()
    DebugUtils.info(MODULE_NAME, '🔐 Auth services initialized')

    // 🆕 NEW: Initialize all stores with proper loading order
    const appInitializer = useAppInitializer()
    await appInitializer.initialize()

    // Mount application
    app.mount('#app')

    DebugUtils.info(MODULE_NAME, '🎉 Application bootstrapped successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '💥 Failed to bootstrap application', { error })

    // Simple error handling
    console.error('Application bootstrap failed:', error)

    // TODO: Show error screen
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
