<!-- src/App.vue - КОНТРОЛЛЕР авторизации и загрузки -->
<template>
  <v-app>
    <!-- Загрузка stores после авторизации -->
    <div v-if="isLoadingStores" class="app-loading">
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate size="64" color="primary" />
            <h3 class="mt-4">{{ loadingMessage }}</h3>
            <p class="text-medium-emphasis">{{ loadingDetail }}</p>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Основное приложение -->
    <router-view v-else />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppInitializer } from '@/core/appInitializer'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'App'

// ===== СОСТОЯНИЕ =====
const router = useRouter()
const authStore = useAuthStore()
const isLoadingStores = ref(false)
const loadingMessage = ref('Инициализация...')
const loadingDetail = ref('Подготовка системы')
const storesLoaded = ref(false)

// ===== МЕТОДЫ =====

/**
 * Загрузка всех stores после успешной авторизации
 */
async function loadStoresAfterAuth() {
  if (storesLoaded.value || isLoadingStores.value) {
    DebugUtils.debug(MODULE_NAME, 'Stores already loaded or loading')
    return
  }

  try {
    isLoadingStores.value = true
    loadingMessage.value = 'Загрузка данных...'
    loadingDetail.value = 'Инициализация хранилищ данных'

    DebugUtils.info(MODULE_NAME, '🗄️ Starting stores initialization after auth')

    const appInitializer = useAppInitializer()

    // Показываем прогресс
    loadingDetail.value = 'Загрузка продуктов и рецептов...'
    await new Promise(resolve => setTimeout(resolve, 500)) // Небольшая задержка для UX

    await appInitializer.initialize()

    storesLoaded.value = true

    DebugUtils.info(MODULE_NAME, '✅ All stores loaded successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Failed to load stores', { error })

    // Не блокируем приложение если stores не загрузились
    storesLoaded.value = true
    loadingDetail.value = 'Приложение запущено с ограниченным функционалом'

    setTimeout(() => {
      isLoadingStores.value = false
    }, 2000)
  } finally {
    setTimeout(() => {
      isLoadingStores.value = false
    }, 500) // Небольшая задержка чтобы показать завершение
  }
}

// ===== WATCHERS =====

// Следим за авторизацией - загружаем stores после входа
watch(
  () => authStore.isAuthenticated,
  async isAuthenticated => {
    if (isAuthenticated && !storesLoaded.value) {
      DebugUtils.info(MODULE_NAME, '🔐 User authenticated, loading stores')
      await loadStoresAfterAuth()
    }
  },
  { immediate: true }
)

// ===== LIFECYCLE =====

onMounted(async () => {
  DebugUtils.info(MODULE_NAME, '🚀 App mounted')

  // Проверяем есть ли сохраненная сессия
  const hasSession = authStore.checkSession()

  if (hasSession && authStore.isAuthenticated) {
    DebugUtils.info(MODULE_NAME, '🔑 Existing session found, loading stores')
    await loadStoresAfterAuth()
  } else {
    DebugUtils.info(MODULE_NAME, '🔓 No session found, waiting for login')
    // Переадресуем на логин если не на странице авторизации
    if (!router.currentRoute.value.path.startsWith('/auth')) {
      router.push('/auth/login')
    }
  }
})
</script>

<style lang="scss" scoped>
.app-loading {
  background: var(--black-primary);
  min-height: 100vh;

  h3 {
    color: rgba(255, 255, 255, 0.87);
  }

  p {
    color: rgba(255, 255, 255, 0.6);
  }
}

// Анимация появления
.v-progress-circular {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
</style>
