<!-- src/layouts/PosLayout.vue -->
<template>
  <v-app theme="dark" class="pos-app">
    <!-- Header -->
    <v-app-bar app color="surface" elevation="1" class="pos-header" height="56">
      <v-app-bar-title class="pos-title">
        <v-icon start>mdi-cash-register</v-icon>
        Kitchen POS System
      </v-app-bar-title>

      <v-spacer />

      <!-- User Info -->
      <div class="pos-user-section d-flex align-center">
        <v-chip color="success" variant="tonal" size="default" class="me-3">
          <v-icon start>mdi-account</v-icon>
          {{ currentUserName }}
        </v-chip>

        <!-- Connection Status -->
        <v-chip :color="connectionStatus.color" variant="tonal" size="small" class="me-2">
          <v-icon start :icon="connectionStatus.icon" size="16"></v-icon>
          {{ connectionStatus.text }}
        </v-chip>

        <!-- Logout Button -->
        <v-btn icon="mdi-logout" variant="text" size="small" title="Выход" @click="handleLogout" />
      </div>
    </v-app-bar>

    <!-- Main POS Layout -->
    <v-main class="pos-main">
      <div class="pos-layout">
        <!-- Tables sidebar -->
        <div class="pos-sidebar" :style="{ width: sidebarWidth }">
          <slot name="tables">
            <!-- Fallback content if no tables slot -->
            <div class="pa-4 text-center text-medium-emphasis">Tables sidebar</div>
          </slot>
        </div>

        <!-- Main content area -->
        <div class="pos-content">
          <!-- Menu section -->
          <div class="pos-menu">
            <slot name="menu">
              <!-- Fallback content if no menu slot -->
              <div class="pa-4 text-center text-medium-emphasis">Menu section</div>
            </slot>
          </div>

          <!-- Order section -->
          <div class="pos-order">
            <slot name="order">
              <!-- Fallback content if no order slot -->
              <div class="pa-4 text-center text-medium-emphasis">Order section</div>
            </slot>
          </div>
        </div>
      </div>
    </v-main>

    <!-- Footer with shift info -->
    <v-footer app color="surface" class="pos-footer" height="48">
      <div class="d-flex align-center w-100">
        <!-- Shift stats -->
        <v-chip color="info" variant="tonal" size="small">
          <v-icon start size="16">mdi-chart-line</v-icon>
          Смена: {{ shiftInfo.ordersCount }} заказов
        </v-chip>

        <v-spacer />

        <!-- Current time -->
        <div class="pos-datetime text-caption">
          <span class="font-weight-bold me-2">{{ currentTime }}</span>
          <span class="text-medium-emphasis">{{ currentDate }}</span>
        </div>
      </div>
    </v-footer>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router'

// TODO: Интеграция с authStore
// import { useAuth } from '@/stores/auth/composables'

const { width } = useDisplay()
const router = useRouter()

// State
const currentTime = ref('')
const currentDate = ref('')
let timeInterval: NodeJS.Timeout | null = null

const shiftInfo = ref({
  ordersCount: 0,
  startTime: new Date().toISOString()
})

const isOnline = ref(true)

// Computed
const sidebarWidth = computed(() => {
  const calculatedWidth = Math.max(width.value * 0.08, 80)
  return `${calculatedWidth}px`
})

// TODO: Заменить на реальные данные из authStore
const currentUserName = computed(() => 'Кассир')

const connectionStatus = computed(() => {
  if (isOnline.value) {
    return { color: 'success', icon: 'mdi-wifi', text: 'Online' }
  } else {
    return { color: 'error', icon: 'mdi-wifi-off', text: 'Offline' }
  }
})

// Methods
const updateDateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
  currentDate.value = now.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const handleLogout = () => {
  // TODO: Интеграция с authStore
  console.log('Logout clicked')
  router.push('/auth/login')
}

// Lifecycle
onMounted(() => {
  updateDateTime()
  timeInterval = setInterval(updateDateTime, 1000)

  // TODO: Подключить мониторинг сети
  window.addEventListener('online', () => {
    isOnline.value = true
  })
  window.addEventListener('offline', () => {
    isOnline.value = false
  })
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
  window.removeEventListener('online', () => {
    isOnline.value = true
  })
  window.removeEventListener('offline', () => {
    isOnline.value = false
  })
})
</script>

<style scoped>
.pos-app {
  height: 100vh;
  overflow: hidden;
}

.pos-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.pos-title {
  font-size: 1.1rem !important;
  font-weight: 500;
}

.pos-main {
  padding: 0 !important;
  height: calc(100vh - 56px - 48px); /* header + footer */
}

.pos-layout {
  height: 100%;
  display: flex;
  overflow: hidden;
}

.pos-sidebar {
  flex: none;
  background-color: rgb(var(--v-theme-surface));
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  overflow-y: auto;
  overflow-x: hidden;
}

.pos-content {
  flex: 1;
  display: flex;
  min-width: 0;
}

.pos-menu {
  flex: 0 0 62%;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  background-color: rgb(var(--v-theme-background));
}

.pos-order {
  flex: 0 0 38%;
  overflow: hidden;
  background-color: rgb(var(--v-theme-surface));
}

.pos-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.pos-datetime {
  text-align: right;
}

/* Scrollbar styling */
.pos-sidebar::-webkit-scrollbar {
  width: 6px;
}

.pos-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.pos-sidebar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.pos-sidebar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>
