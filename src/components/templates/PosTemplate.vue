<!-- src/components/templates/PosTemplate.vue -->
<template>
  <v-app theme="dark" class="pos-app">
    <!-- Header -->
    <v-app-bar app color="grey-darken-4" flat class="pos-header" :height="headerHeight">
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

        <!-- Статус подключения -->
        <v-chip :color="connectionStatus.color" variant="flat" size="small" class="mr-2">
          <v-icon start :icon="connectionStatus.icon"></v-icon>
          {{ connectionStatus.text }}
        </v-chip>
      </div>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="pos-main">
      <div class="pos-content-wrapper">
        <slot />
      </div>
    </v-main>

    <!-- Footer -->
    <v-footer app color="grey-darken-4" class="pos-footer" :height="footerHeight">
      <div class="pos-footer-content">
        <!-- Левая секция - статистика дня -->
        <div class="pos-footer-left">
          <v-chip color="info" variant="tonal" size="small" class="mr-2">
            <v-icon start>mdi-chart-line</v-icon>
            Смена: {{ shiftInfo.ordersCount }} заказов
          </v-chip>
        </div>

        <v-spacer />

        <!-- Правая секция - время и дата -->
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

// ===== ПРОПСЫ =====

interface Props {
  headerHeight?: number
  footerHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  headerHeight: 64,
  footerHeight: 56
})

// ===== КОМПОЗИЦИЯ =====

const { currentUser } = useAuth()

// ===== СОСТОЯНИЕ =====

const currentTime = ref('')
const currentDate = ref('')
let timeInterval: NodeJS.Timeout | null = null

// Mock данные для демонстрации
const shiftInfo = ref({
  ordersCount: 0,
  startTime: new Date().toISOString()
})

const isOnline = ref(true) // TODO: Реальная проверка подключения

// ===== ГЕТТЕРЫ =====

const currentUserName = computed(() => currentUser.value?.name || 'Пользователь')

const connectionStatus = computed(() => {
  if (isOnline.value) {
    return {
      color: 'success',
      icon: 'mdi-wifi',
      text: 'Online'
    }
  } else {
    return {
      color: 'error',
      icon: 'mdi-wifi-off',
      text: 'Offline'
    }
  }
})

// ===== МЕТОДЫ =====

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

// TODO: Реальная проверка подключения
const checkConnection = () => {
  isOnline.value = navigator.onLine
}

// ===== LIFECYCLE =====

onMounted(() => {
  updateDateTime()
  timeInterval = setInterval(updateDateTime, 1000)

  // Слушаем изменения подключения
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
// ===== POS APP STYLES =====

.pos-app {
  background-color: #121212;

  // Запрещаем выделение текста для touch устройств
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
}

// ===== HEADER =====

.pos-header {
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);

  .pos-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    display: flex;
    align-items: center;
  }

  .pos-user-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

// ===== MAIN CONTENT =====

.pos-main {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);

  .pos-content-wrapper {
    height: 100%;
    min-height: calc(100vh - 64px - 56px); // header + footer
    padding: 16px;
    display: flex;
    flex-direction: column;
  }
}

// ===== FOOTER =====

.pos-footer {
  border-top: 2px solid rgba(255, 255, 255, 0.1);

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
}

// ===== CHIP CUSTOMIZATIONS =====

:deep(.v-chip) {
  &.v-chip--size-large {
    height: 44px;
    font-size: 1rem;
    font-weight: 500;
    padding: 0 16px;
  }

  &.v-chip--size-small {
    height: 32px;
    font-size: 0.85rem;
    padding: 0 12px;
  }
}

// ===== АДАПТИВНОСТЬ =====

@media (max-width: 1024px) {
  .pos-title {
    font-size: 1.3rem !important;

    .v-icon {
      display: none; // Скрываем иконку на маленьких экранах
    }
  }

  .pos-user-section {
    .v-chip {
      font-size: 0.9rem;
    }
  }
}

@media (max-width: 768px) {
  .pos-header {
    .pos-user-section {
      .v-chip--size-large {
        height: 40px;
        font-size: 0.9rem;
      }
    }
  }

  .pos-datetime {
    .pos-time {
      font-size: 1rem !important;
    }

    .pos-date {
      font-size: 0.8rem !important;
    }
  }
}

@media (orientation: portrait) {
  // Оптимизация для портретной ориентации планшетов
  .pos-content-wrapper {
    padding: 12px;
  }

  .pos-footer-left {
    display: none; // Скрываем статистику в портретном режиме
  }
}

// ===== TOUCH ОПТИМИЗАЦИЯ =====

@media (hover: none) and (pointer: coarse) {
  .pos-header,
  .pos-footer {
    .v-chip {
      min-height: 48px; // Увеличиваем для touch
    }
  }

  .pos-content-wrapper {
    padding: 20px; // Больше отступы для touch
  }
}

// ===== АНИМАЦИИ =====

.pos-header {
  transition: all 0.3s ease;
}

.pos-footer {
  transition: all 0.3s ease;
}

:deep(.v-chip) {
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}
</style>
