<!-- src/components/atoms/buttons/LogoutButton.vue -->
<template>
  <v-btn
    :variant="buttonVariant"
    :color="color"
    :size="size"
    :loading="isLoading"
    :disabled="isLoading"
    class="logout-button"
    @click="handleLogout"
  >
    <!-- Иконка -->
    <v-icon :start="variant !== 'icon'" :size="iconSize">mdi-logout</v-icon>

    <!-- Текст -->
    <span v-if="variant !== 'icon'">
      {{ text }}
    </span>
  </v-btn>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/stores/auth/composables'
import { DebugUtils } from '@/utils'

// ===== ТИПЫ =====

type ButtonVariant = 'icon' | 'text' | 'full'
type ButtonSize = 'x-small' | 'small' | 'default' | 'large' | 'x-large'

// ===== ПРОПСЫ =====

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  color?: string
  text?: string
  showConfirmation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'full',
  size: 'default',
  color: 'error',
  text: 'Выход',
  showConfirmation: false
})

// ===== ЭМИТЫ =====

const emit = defineEmits<{
  logout: [success: boolean]
  error: [error: string]
}>()

// ===== КОМПОЗИЦИЯ =====

const { logout } = useAuth()
const isLoading = ref(false)

// ===== ГЕТТЕРЫ =====

const buttonVariant = computed(() => {
  switch (props.variant) {
    case 'icon':
      return 'text'
    case 'text':
      return 'text'
    case 'full':
      return 'flat'
    default:
      return 'flat'
  }
})

const iconSize = computed(() => {
  switch (props.size) {
    case 'x-small':
      return 'small'
    case 'small':
      return 'default'
    case 'large':
    case 'x-large':
      return 'large'
    default:
      return 'default'
  }
})

// ===== МЕТОДЫ =====

const handleLogout = async () => {
  try {
    if (props.showConfirmation) {
      const confirmed = confirm('Вы действительно хотите выйти?')
      if (!confirmed) return
    }

    isLoading.value = true

    await logout()

    emit('logout', true)
    DebugUtils.info('LogoutButton', 'Успешный выход из системы')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Ошибка при выходе'
    emit('error', errorMessage)
    DebugUtils.error('LogoutButton', 'Ошибка при выходе', { error })
  } finally {
    isLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.logout-button {
  font-weight: 500;
  text-transform: none;
  min-height: 44px;

  &:hover {
    transform: translateY(-1px);
    transition: transform 0.2s ease;
  }

  // Варианты отображения
  &.v-btn--variant-text {
    &:hover {
      background-color: rgba(var(--v-theme-error), 0.1);
    }
  }

  &.v-btn--variant-flat {
    &:hover {
      opacity: 0.9;
    }
  }
}

// Touch оптимизация
@media (hover: none) and (pointer: coarse) {
  .logout-button {
    min-height: 48px;
    padding: 8px 16px;
  }
}
</style>
