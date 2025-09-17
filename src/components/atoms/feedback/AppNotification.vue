<!-- src/components/atoms/feedback/AppNotification.vue -->
<template>
  <teleport to="body">
    <transition name="notification" appear>
      <div
        v-if="show"
        :class="['app-notification', `app-notification--${type}`, `app-notification--${location}`]"
      >
        <div class="app-notification__content">
          <v-icon v-if="icon" :icon="icon" size="20" class="app-notification__icon" />

          <div class="app-notification__message">
            {{ message }}
          </div>

          <v-btn
            v-if="showCloseButton"
            icon="mdi-close"
            variant="text"
            size="small"
            color="white"
            class="app-notification__close"
            @click="handleClose"
          />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'

// =============================================
// TYPES & INTERFACES
// =============================================

interface Props {
  show: boolean
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  location?: 'top' | 'bottom'
  timeout?: number
  showCloseButton?: boolean
}

// =============================================
// PROPS & EMITS
// =============================================

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  location: 'top',
  timeout: 3000,
  showCloseButton: true
})

const emit = defineEmits<{
  close: []
}>()

// =============================================
// STATE
// =============================================

let timeoutId: number | null = null

// =============================================
// COMPUTED
// =============================================

const icon = computed(() => {
  switch (props.type) {
    case 'success':
      return 'mdi-check-circle'
    case 'error':
      return 'mdi-alert-circle'
    case 'warning':
      return 'mdi-alert'
    case 'info':
      return 'mdi-information'
    default:
      return null
  }
})

// =============================================
// METHODS
// =============================================

const handleClose = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  emit('close')
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  if (props.show && props.timeout > 0) {
    timeoutId = window.setTimeout(() => {
      handleClose()
    }, props.timeout)
  }
})

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})
</script>

<style scoped>
/* =============================================
   NOTIFICATION POSITIONING
   ============================================= */

.app-notification {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  min-width: 300px;
  max-width: 500px;
  z-index: 2500; /* Выше всех overlay */
  pointer-events: auto;
}

.app-notification--top {
  top: 20px;
}

.app-notification--bottom {
  bottom: 20px;
}

/* =============================================
   NOTIFICATION CONTENT
   ============================================= */

.app-notification__content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  /* ВАЖНО: Никаких backdrop-filter! */
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.app-notification__message {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.4;
  color: white;
}

.app-notification__icon {
  flex-shrink: 0;
  color: white;
}

.app-notification__close {
  flex-shrink: 0;
}

/* =============================================
   NOTIFICATION TYPES
   ============================================= */

.app-notification--success .app-notification__content {
  background: rgb(var(--v-theme-success));
}

.app-notification--error .app-notification__content {
  background: rgb(var(--v-theme-error));
}

.app-notification--warning .app-notification__content {
  background: rgb(var(--v-theme-warning));
}

.app-notification--info .app-notification__content {
  background: rgb(var(--v-theme-info));
}

/* =============================================
   ANIMATIONS
   ============================================= */

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* =============================================
   RESPONSIVE DESIGN
   ============================================= */

@media (max-width: 768px) {
  .app-notification {
    left: 16px;
    right: 16px;
    transform: none;
    min-width: auto;
    max-width: none;
  }

  .app-notification--top {
    top: 16px;
  }

  .app-notification--bottom {
    bottom: 16px;
  }

  .notification-enter-from {
    transform: translateY(-20px);
  }

  .notification-leave-to {
    transform: translateY(-20px);
  }
}
</style>
