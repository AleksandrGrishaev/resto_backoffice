<!-- src/views/auth/LoginView.vue -->
<template>
  <v-container fluid class="fill-height login-container">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="pa-6 login-card">
          <!-- Заголовок -->
          <v-card-title class="text-h4 text-center mb-6 login-title">
            <v-icon size="48" class="mr-3" color="primary">mdi-restaurant</v-icon>
            Kitchen App
          </v-card-title>

          <v-card-subtitle class="text-center mb-6 login-subtitle">
            Система управления рестораном
          </v-card-subtitle>

          <v-card-text>
            <!-- PIN Input -->
            <PinInput
              :loading="isLoading"
              label="Введите PIN для входа"
              button-text="ВОЙТИ"
              auto-submit
              @submit="handleLogin"
              @input="clearError"
            />

            <!-- Ошибки -->
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              closable
              class="mt-4 error-alert"
              @click:close="clearError"
            >
              {{ error }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/stores/auth/composables'
import { DebugUtils } from '@/utils'
import PinInput from '@/components/atoms/inputs/PinInput.vue'

// ===== КОНСТАНТЫ =====

const MODULE_NAME = 'LoginView'

// ===== КОМПОЗИЦИЯ =====

const router = useRouter()
const route = useRoute()
const { login } = useAuth() // 🔧 ИСПРАВЛЕНО: добавлен деструктуринг login из useAuth

// ===== СОСТОЯНИЕ =====

const isLoading = ref(false)
const error = ref('')

// ===== ГЕТТЕРЫ =====

const showTestUsers = computed(() => {
  // Показываем только в development режиме
  return import.meta.env.DEV
})

// ===== МЕТОДЫ =====

const handleLogin = async (pin: string) => {
  try {
    isLoading.value = true
    error.value = ''

    DebugUtils.info(MODULE_NAME, 'Попытка авторизации', { pin: '***' })

    // Используем composable useAuth для авторизации
    const result = await login(pin)

    if (result.success) {
      DebugUtils.info(MODULE_NAME, 'Успешная авторизация', {
        redirectTo: result.redirectTo
      })

      // useAuth автоматически выполнит переадресацию
      // Но можем обработать redirect из query параметров
      const redirectPath = route.query.redirect?.toString()
      if (redirectPath && result.redirectTo !== redirectPath) {
        await router.push(redirectPath)
      }
    } else {
      throw new Error(result.error || 'Ошибка авторизации')
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Ошибка входа в систему'
    error.value = errorMessage
    DebugUtils.error(MODULE_NAME, 'Ошибка авторизации', { error: errorMessage })
  } finally {
    isLoading.value = false
  }
}

const clearError = () => {
  error.value = ''
}

// Заполнение PIN для тестирования (только в dev режиме)
const fillPin = (pin: string) => {
  if (import.meta.env.DEV) {
    // TODO: Найти способ программно заполнить PinInput
    DebugUtils.info(MODULE_NAME, 'Test PIN selected', { pin })
  }
}
</script>

<style lang="scss" scoped>
// ===== LOGIN CONTAINER =====

.login-container {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  min-height: 100vh;
}

// ===== LOGIN CARD =====

.login-card {
  background: rgba(18, 18, 18, 0.95);
  border: 2px solid rgba(var(--v-theme-primary), 0.3);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  .login-title {
    color: white;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .login-subtitle {
    color: #b0b0b0;
    font-size: 1.1rem;
  }
}

// ===== ERROR ALERT =====

.error-alert {
  border-radius: 8px;

  :deep(.v-alert__content) {
    font-weight: 500;
  }
}

// ===== TEST USERS CARD =====

.test-users-card {
  border-radius: 8px;

  .test-users-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;

    .test-user-item {
      .v-chip {
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          transform: scale(1.05);
          opacity: 0.8;
        }
      }
    }
  }
}

// ===== АДАПТИВНОСТЬ =====

@media (max-width: 600px) {
  .login-card {
    margin: 16px;

    .login-title {
      font-size: 1.8rem !important;

      .v-icon {
        display: none; // Скрываем иконку на мобильных
      }
    }

    .login-subtitle {
      font-size: 1rem !important;
    }
  }
}

@media (max-width: 400px) {
  .login-container {
    padding: 8px;
  }

  .login-card {
    .pa-6 {
      padding: 16px !important;
    }
  }
}

// ===== АНИМАЦИИ =====

.login-card {
  animation: slideIn 0.6s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-title {
  animation: fadeIn 0.8s ease-out 0.2s both;
}

.login-subtitle {
  animation: fadeIn 0.8s ease-out 0.4s both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ===== ТЕМНАЯ ТЕМА =====

:deep(.v-text-field) {
  .v-field {
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .v-field--focused {
    box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.3);
  }
}

:deep(.v-btn) {
  border-radius: 8px;
  font-weight: 600;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
  }
}
</style>
