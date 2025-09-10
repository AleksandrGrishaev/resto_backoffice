<template>
  <v-container fluid class="login-container">
    <v-row justify="center" align="center" class="min-height-screen">
      <v-col cols="12" sm="8" md="6" lg="4" xl="3">
        <!-- Заголовок -->
        <div class="text-center mb-8">
          <h1 class="text-h4 text-primary font-weight-bold mb-2">Restaurant POS</h1>
          <p class="text-subtitle-1 text-medium-emphasis">Введите PIN-код для входа</p>
        </div>

        <!-- Форма входа -->
        <v-card class="elevation-8" rounded="lg">
          <v-card-text class="pa-8">
            <PinInput :loading="authStore.state.isLoading" @submit="handleLogin" />

            <!-- Сообщение об ошибке -->
            <v-alert
              v-if="authStore.state.error"
              type="error"
              variant="tonal"
              class="mt-4"
              :text="authStore.state.error"
              closable
              @click:close="authStore.state.error = null"
            />
          </v-card-text>
        </v-card>

        <!-- Информация о доступных пользователях (только в режиме разработки) -->
        <v-card v-if="showUserInfo" class="mt-6 elevation-2" rounded="lg">
          <v-card-title class="text-center">
            <v-icon icon="mdi-information" class="mr-2" />
            Доступные учетные записи
          </v-card-title>

          <v-card-text>
            <v-row>
              <v-col v-for="user in availableUsers" :key="user.pin" cols="12" sm="6" md="4">
                <v-card
                  class="user-card"
                  variant="outlined"
                  :loading="authStore.state.isLoading"
                  @click="quickLogin(user.pin)"
                >
                  <v-card-text class="text-center pa-4">
                    <v-icon
                      :icon="getRoleIcon(user.roles[0])"
                      size="32"
                      :color="getRoleColor(user.roles[0])"
                      class="mb-2"
                    />
                    <div class="text-subtitle-2 font-weight-bold">
                      {{ user.name }}
                    </div>
                    <div class="text-caption text-medium-emphasis mb-2">PIN: {{ user.pin }}</div>
                    <v-chip :color="getRoleColor(user.roles[0])" size="small" variant="tonal">
                      {{ getRoleLabel(user.roles[0]) }}
                    </v-chip>
                    <div class="text-caption mt-1 text-medium-emphasis">
                      {{ user.description }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions class="justify-center pb-4">
            <v-btn variant="text" size="small" @click="showUserInfo = false">Скрыть</v-btn>
          </v-card-actions>
        </v-card>

        <!-- Кнопка показа информации -->
        <div v-else class="text-center mt-4">
          <v-btn variant="text" size="small" @click="showUserInfo = true">
            <v-icon icon="mdi-information" class="mr-1" />
            Показать доступные учетные записи
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import PinInput from '@/components/auth/PinInput.vue'
import type { UserRole } from '@/types/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const showUserInfo = ref(false)
const availableUsers = ref<any[]>([])

// Загрузка доступных пользователей при монтировании
onMounted(() => {
  availableUsers.value = authStore.getAvailableUsers()
})

// Обработка входа
async function handleLogin(pin: string) {
  try {
    const success = await authStore.login(pin)

    if (success) {
      // Определение маршрута для редиректа
      const redirectPath = (route.query.redirect as string) || authStore.getDefaultRoute()

      await router.push(redirectPath)
    }
  } catch (error) {
    console.error('Login failed:', error)
  }
}

// Быстрый вход (для разработки)
async function quickLogin(pin: string) {
  await handleLogin(pin)
}

// Получение иконки роли
function getRoleIcon(role: UserRole): string {
  const icons = {
    admin: 'mdi-shield-crown',
    manager: 'mdi-account-tie',
    cashier: 'mdi-cash-register',
    kitchen: 'mdi-chef-hat',
    bar: 'mdi-glass-cocktail'
  }
  return icons[role] || 'mdi-account'
}

// Получение цвета роли
function getRoleColor(role: UserRole): string {
  const colors = {
    admin: 'red',
    manager: 'purple',
    cashier: 'green',
    kitchen: 'orange',
    bar: 'blue'
  }
  return colors[role] || 'grey'
}

// Получение названия роли
function getRoleLabel(role: UserRole): string {
  const labels = {
    admin: 'Админ',
    manager: 'Менеджер',
    cashier: 'Кассир',
    kitchen: 'Кухня',
    bar: 'Бар'
  }
  return labels[role] || role
}
</script>

<style scoped>
.login-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.min-height-screen {
  min-height: 100vh;
}

.user-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-card:active {
  transform: translateY(0);
}
</style>
