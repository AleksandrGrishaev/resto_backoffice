<!-- src/layouts/PosLayout.vue - ПРАВИЛЬНЫЙ Layout для router -->
<template>
  <v-app theme="dark" class="pos-layout">
    <!-- Header -->
    <v-app-bar app color="grey-darken-4" flat class="pos-header" height="64">
      <v-app-bar-title class="pos-title">
        <v-icon class="mr-2">mdi-cash-register</v-icon>
        Kitchen POS System
      </v-app-bar-title>

      <v-spacer />

      <!-- User Info -->
      <div class="pos-user-section">
        <v-chip color="success" variant="flat" size="large" class="mr-3">
          <v-icon start>mdi-account</v-icon>
          {{ currentUserName }}
        </v-chip>

        <!-- Connection Status -->
        <v-chip :color="connectionStatus.color" variant="flat" size="small" class="mr-2">
          <v-icon start :icon="connectionStatus.icon"></v-icon>
          {{ connectionStatus.text }}
        </v-chip>
      </div>
    </v-app-bar>

    <!-- Main Content - ROUTER VIEW -->
    <v-main class="pos-main">
      <router-view />
    </v-main>

    <!-- Footer -->
    <v-footer app color="grey-darken-4" class="pos-footer" height="56">
      <div class="pos-footer-content">
        <!-- Left section - shift stats -->
        <div class="pos-footer-left">
          <v-chip color="info" variant="tonal" size="small" class="mr-2">
            <v-icon start>mdi-chart-line</v-icon>
            Shift: {{ shiftInfo.ordersCount }} orders
          </v-chip>
        </div>

        <v-spacer />

        <!-- Right section - time and date -->
        <div class="pos-footer-right">
          <div class="pos-datetime">
            <div class="pos-time">{{ currentTime }}</div>
            <div class="pos-date">{{ currentDate }}</div>
          </div>
        </div>
      </div>
    </v-footer>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/stores/auth/composables'

const { currentUser } = useAuth()

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
const currentUserName = computed(() => currentUser.value?.name || 'User')

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
    minute: '2-digit',
    second: '2-digit'
  })
  currentDate.value = now.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const checkConnection = () => {
  isOnline.value = navigator.onLine
}

// Lifecycle
onMounted(() => {
  updateDateTime()
  timeInterval = setInterval(updateDateTime, 1000)

  window.addEventListener('online', checkConnection)
  window.addEventListener('offline', checkConnection)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }

  window.removeEventListener('online', checkConnection)
  window.removeEventListener('offline', checkConnection)
})
</script>

<style lang="scss" scoped>
.pos-layout {
  background-color: #121212;
  user-select: none;
}

.pos-header {
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.pos-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}

.pos-user-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pos-main {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

.pos-footer {
  border-top: 2px solid rgba(255, 255, 255, 0.1);
}

.pos-footer-content {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 16px;
}

.pos-datetime {
  text-align: right;

  .pos-time {
    font-family: 'Roboto Mono', monospace;
    font-size: 1.2rem;
    font-weight: 600;
    color: #fff;
    line-height: 1.2;
  }

  .pos-date {
    font-size: 0.9rem;
    color: #b0b0b0;
    line-height: 1.2;
  }
}
</style>
