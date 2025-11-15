<!-- src/views/kitchen/orders/components/NewOrderNotification.vue -->
<template>
  <transition-group name="notification" tag="div" class="notification-container">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      class="notification-card"
      :style="{ backgroundColor: notification.color }"
    >
      <div class="notification-content">
        <v-icon size="32" color="white">mdi-chef-hat</v-icon>

        <div class="notification-text">
          <h3 class="notification-title">New Order!</h3>
          <p class="notification-details">
            {{ notification.orderNumber }} • {{ notification.itemsCount }}
            {{ notification.itemsCount === 1 ? 'dish' : 'dishes' }}
          </p>
          <p v-if="notification.tableNumber" class="notification-table">
            Table {{ notification.tableNumber }}
          </p>
        </div>

        <v-btn
          icon
          size="small"
          variant="text"
          color="white"
          @click="dismissNotification(notification.id)"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
    </div>
  </transition-group>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Notification {
  id: string
  orderNumber: string
  itemsCount: number
  tableNumber?: string
  color: string
}

// =============================================
// STATE
// =============================================

const notifications = ref<Notification[]>([])

// =============================================
// METHODS
// =============================================

/**
 * Show notification for new order
 */
function showNotification(notification: Omit<Notification, 'id'>) {
  const id = `notification_${Date.now()}`

  notifications.value.push({
    id,
    ...notification
  })

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    dismissNotification(id)
  }, 5000)
}

/**
 * Dismiss notification manually
 */
function dismissNotification(id: string) {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index !== -1) {
    notifications.value.splice(index, 1)
  }
}

// =============================================
// EXPOSE
// =============================================

defineExpose({
  showNotification
})
</script>

<style scoped lang="scss">
.notification-container {
  position: fixed;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  pointer-events: none;
}

.notification-card {
  pointer-events: auto;
  min-width: 320px;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  animation: pulse 0.3s ease-in-out;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.notification-text {
  flex: 1;
  color: white;
}

.notification-title {
  font-size: var(--text-lg);
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
  color: white;
}

.notification-details {
  font-size: var(--text-base);
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
  color: rgba(255, 255, 255, 0.95);
}

.notification-table {
  font-size: var(--text-sm);
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);

  &::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.85);
  }
}

// =============================================
// ANIMATIONS
// =============================================

@keyframes pulse {
  0% {
    transform: scale(0.95);
    opacity: 0;
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>
