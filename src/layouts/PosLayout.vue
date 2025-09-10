<!-- src/layouts/PosLayout.vue -->
<template>
  <v-app theme="dark" class="pos-app">
    <!-- Loading Screen -->
    <div v-if="!posStore.isReady" class="pos-loading">
      <v-container class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" class="text-center">
            <v-progress-circular size="64" width="4" color="primary" indeterminate class="mb-4" />
            <h2 class="mb-2">Инициализация POS системы</h2>
            <p class="text-medium-emphasis">
              {{ loadingMessage }}
            </p>

            <!-- Error State -->
            <div v-if="posStore.error" class="mt-4">
              <v-alert color="error" variant="tonal" class="mb-4">
                <div class="text-subtitle-2 mb-2">Ошибка инициализации:</div>
                <div>{{ posStore.error }}</div>
              </v-alert>

              <v-btn color="primary" :loading="initializing" @click="retryInitialization">
                Повторить
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Main POS Interface -->
    <template v-else>
      <!-- Header -->
      <v-app-bar app color="surface" elevation="1" class="pos-header" height="56">
        <v-app-bar-title class="pos-title">
          <v-icon start>mdi-cash-register</v-icon>
          Kitchen POS System
        </v-app-bar-title>

        <v-spacer />

        <!-- System Status -->
        <div class="pos-status-section d-flex align-center me-3">
          <!-- Online/Offline Status -->
          <v-chip :color="connectionStatus.color" variant="tonal" size="small" class="me-2">
            <v-icon start :icon="connectionStatus.icon" size="16"></v-icon>
            {{ connectionStatus.text }}
          </v-chip>

          <!-- System Health -->
          <v-chip :color="systemHealthColor" variant="tonal" size="small" class="me-2">
            <v-icon start :icon="systemHealthIcon" size="16"></v-icon>
            {{ systemHealthText }}
          </v-chip>
        </div>

        <!-- User Info -->
        <div class="pos-user-section d-flex align-center">
          <v-chip color="success" variant="tonal" size="default" class="me-3">
            <v-icon start>mdi-account</v-icon>
            {{ currentUserName }}
          </v-chip>

          <!-- Shift Info -->
          <v-chip
            v-if="posStore.currentShift"
            color="info"
            variant="tonal"
            size="small"
            class="me-2"
          >
            <v-icon start size="16">mdi-clock-outline</v-icon>
            Смена {{ formatShiftTime(posStore.currentShift.startTime) }}
          </v-chip>

          <!-- Settings Menu -->
          <v-menu>
            <template #activator="{ props }">
              <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
            </template>

            <v-list>
              <v-list-item v-if="!shiftsStore.isShiftActive" @click="startShift">
                <template #prepend>
                  <v-icon>mdi-play</v-icon>
                </template>
                <v-list-item-title>Start Shift</v-list-item-title>
              </v-list-item>

              <v-list-item v-if="shiftsStore.isShiftActive" @click="endShift">
                <template #prepend>
                  <v-icon>mdi-stop</v-icon>
                </template>
                <v-list-item-title>End Shift</v-list-item-title>
              </v-list-item>

              <v-list-item @click="syncData">
                <template #prepend>
                  <v-icon>mdi-sync</v-icon>
                </template>
                <v-list-item-title>Синхронизация</v-list-item-title>
              </v-list-item>

              <v-divider />

              <v-list-item @click="handleLogout">
                <template #prepend>
                  <v-icon>mdi-logout</v-icon>
                </template>
                <v-list-item-title>Выход</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </v-app-bar>

      <!-- Main POS Layout -->
      <v-main class="pos-main">
        <div class="pos-layout">
          <!-- Tables sidebar -->
          <div class="pos-sidebar" :style="{ width: sidebarWidth }">
            <slot name="tables">
              <div class="pa-4 text-center text-medium-emphasis">Tables sidebar</div>
            </slot>
          </div>

          <!-- Main content area -->
          <div class="pos-content">
            <!-- Menu section -->
            <div class="pos-menu">
              <slot name="menu">
                <div class="pa-4 text-center text-medium-emphasis">Menu section</div>
              </slot>
            </div>

            <!-- Order section -->
            <div class="pos-order">
              <slot name="order">
                <div class="pa-4 text-center text-medium-emphasis">Order section</div>
              </slot>
            </div>
          </div>
        </div>
      </v-main>

      <!-- Footer with shift info -->
      <v-footer app color="surface" class="pos-footer" height="48">
        <div class="d-flex align-center w-100">
          <!-- Daily Stats -->
          <v-chip color="info" variant="tonal" size="small" class="me-2">
            <v-icon start size="16">mdi-chart-line</v-icon>
            Сегодня: {{ posOverview.orders.today }} заказов
          </v-chip>

          <v-chip color="success" variant="tonal" size="small" class="me-2">
            <v-icon start size="16">mdi-cash</v-icon>
            ₽{{ posOverview.payments.todayTotal.toFixed(0) }}
          </v-chip>

          <v-spacer />

          <!-- Current time -->
          <div class="pos-datetime text-caption">
            <span class="font-weight-bold me-2">{{ currentTime }}</span>
            <span class="text-medium-emphasis">{{ currentDate }}</span>
          </div>
        </div>
      </v-footer>
    </template>

    <StartShiftDialog v-model="showStartShiftDialog" @shift-started="handleShiftStarted" />
    <EndShiftDialog v-model="showEndShiftDialog" @shift-ended="handleShiftEnded" />
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router'
import { usePosStore } from '@/stores/pos'

// SHIFT
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import StartShiftDialog from '@/views/pos/shifts/dialogs/StartShiftDialog.vue'
import EndShiftDialog from '@/views/pos/shifts/dialogs/EndShiftDialog.vue'

const { width } = useDisplay()
const router = useRouter()
const posStore = usePosStore()
const shiftsStore = useShiftsStore()

// State
const currentTime = ref('')
const currentDate = ref('')
const initializing = ref(false)
const loadingMessage = ref('Загрузка столов...')
const showStartShiftDialog = ref(false)
const showEndShiftDialog = ref(false)
let timeInterval: NodeJS.Timeout | null = null

// Computed
const sidebarWidth = computed(() => {
  const calculatedWidth = Math.max(width.value * 0.08, 80)
  return `${calculatedWidth}px`
})

// TODO: Заменить на реальные данные из authStore
const currentUserName = computed(() => 'Кассир')

const connectionStatus = computed(() => {
  if (posStore.isOnline) {
    return { color: 'success', icon: 'mdi-wifi', text: 'Online' }
  } else {
    return { color: 'error', icon: 'mdi-wifi-off', text: 'Offline' }
  }
})

const systemHealth = computed(() => posStore.checkSystemHealth())

const systemHealthColor = computed(() => {
  const colors = {
    healthy: 'success',
    warning: 'warning',
    error: 'error'
  }
  return colors[systemHealth.value.status]
})

const systemHealthIcon = computed(() => {
  const icons = {
    healthy: 'mdi-check-circle',
    warning: 'mdi-alert-circle',
    error: 'mdi-close-circle'
  }
  return icons[systemHealth.value.status]
})

const systemHealthText = computed(() => {
  const texts = {
    healthy: 'Система',
    warning: 'Предупреждения',
    error: 'Ошибки'
  }
  return texts[systemHealth.value.status]
})

const posOverview = computed(() => posStore.getPOSOverview())

// Methods
// Методы
function startShift() {
  showStartShiftDialog.value = true
}

function endShift() {
  showEndShiftDialog.value = true
}

function handleShiftStarted(shiftData: any) {
  console.log('Shift started:', shiftData)
  // Обновить статус в header если нужно
}

function handleShiftEnded(shiftData: any) {
  console.log('Shift ended:', shiftData)
  // Обновить статус в header если нужно
}

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

const updateLoadingMessage = () => {
  const messages = [
    'Загрузка столов...',
    'Загрузка заказов...',
    'Загрузка платежей...',
    'Инициализация системы...'
  ]

  let messageIndex = 0
  const messageInterval = setInterval(() => {
    if (posStore.isReady) {
      clearInterval(messageInterval)
      return
    }

    loadingMessage.value = messages[messageIndex]
    messageIndex = (messageIndex + 1) % messages.length
  }, 800)
}

async function retryInitialization() {
  initializing.value = true
  posStore.clearAllErrors()

  try {
    await posStore.initializePOS()
  } finally {
    initializing.value = false
  }
}

async function syncData() {
  try {
    await posStore.syncData()
    console.log('✅ Данные синхронизированы')
  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error)
  }
}

function handleLogout() {
  // TODO: Интеграция с authStore
  console.log('Logout clicked')
  router.push('/auth/login')
}

function formatShiftTime(startTime: string): string {
  return new Date(startTime).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  updateDateTime()
  updateLoadingMessage()
  timeInterval = setInterval(updateDateTime, 1000)

  // TODO: Подключить мониторинг сети
  window.addEventListener('online', () => {
    posStore.isOnline = true
  })
  window.addEventListener('offline', () => {
    posStore.isOnline = false
  })
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
  window.removeEventListener('online', () => {
    posStore.isOnline = true
  })
  window.removeEventListener('offline', () => {
    posStore.isOnline = false
  })
})
</script>

<style scoped>
.pos-app {
  height: 100vh;
  overflow: hidden;
}

.pos-loading {
  height: 100vh;
  background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
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
