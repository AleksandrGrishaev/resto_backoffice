<!-- src/views/kitchen/orders/components/ScheduledOrderCard.vue -->
<!-- Compact card for scheduled orders (not yet sent to kitchen) -->
<template>
  <v-card
    class="scheduled-card"
    :class="{ urgent: countdown.isUrgent, overdue: countdown.isOverdue }"
    elevation="2"
  >
    <div class="scheduled-content">
      <!-- Order info -->
      <div class="order-info">
        <span class="order-number">{{ orderNumber }}</span>
        <v-chip color="cyan" size="x-small" variant="flat">
          <v-icon start size="x-small">mdi-timer-sand</v-icon>
          Scheduled
        </v-chip>
      </div>

      <!-- Items summary -->
      <div class="items-summary">
        <span class="items-text">{{ itemsSummary }}</span>
      </div>

      <!-- Pickup time + countdown -->
      <div class="time-info">
        <div class="pickup-time">
          <v-icon size="16">mdi-clock-outline</v-icon>
          <span>Pickup {{ pickupTime }}</span>
        </div>
        <div
          class="countdown"
          :class="{ urgent: countdown.isUrgent, overdue: countdown.isOverdue }"
        >
          {{ countdown.label }}
        </div>
      </div>

      <!-- Send Now button -->
      <v-btn
        color="cyan"
        variant="flat"
        size="small"
        :loading="isSending"
        prepend-icon="mdi-send"
        @click="handleSendNow"
      >
        Send Now
      </v-btn>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { KitchenDish } from '@/stores/kitchen/composables'
import { formatCountdown } from '@/stores/kitchen/scheduledOrdersService'

interface Props {
  dishes: KitchenDish[]
  pickupTime: string
  orderNumber: string
  orderId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'send-now': [orderId: string]
}>()

const isSending = ref(false)
const countdown = ref(formatCountdown(props.pickupTime))

// Update countdown every 30 seconds
let countdownInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  countdown.value = formatCountdown(props.pickupTime)
  countdownInterval = setInterval(() => {
    countdown.value = formatCountdown(props.pickupTime)
  }, 30_000)
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})

const itemsSummary = computed(() => {
  const names = props.dishes.map(d => d.name)
  if (names.length <= 2) return names.join(', ')
  return `${names[0]}, +${names.length - 1} more`
})

const handleSendNow = async () => {
  isSending.value = true
  emit('send-now', props.orderId)
  // Reset after a short delay (actual state change comes via realtime)
  setTimeout(() => {
    isSending.value = false
  }, 2000)
}
</script>

<style scoped lang="scss">
.scheduled-card {
  background-color: rgba(0, 188, 212, 0.08);
  border: 1px solid rgba(0, 188, 212, 0.3);
  border-radius: 8px;
  transition: all 0.2s ease;

  &.urgent {
    border-color: rgba(255, 152, 0, 0.6);
    background-color: rgba(255, 152, 0, 0.1);
  }

  &.overdue {
    border-color: rgba(244, 67, 54, 0.6);
    background-color: rgba(244, 67, 54, 0.1);
    animation: pulse-border 2s infinite;
  }
}

@keyframes pulse-border {
  0%,
  100% {
    border-color: rgba(244, 67, 54, 0.6);
  }
  50% {
    border-color: rgba(244, 67, 54, 1);
  }
}

.scheduled-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  flex-wrap: wrap;
}

.order-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.order-number {
  font-weight: 700;
  font-size: var(--text-base);
  color: white;
}

.items-summary {
  flex: 1;
  min-width: 120px;
}

.items-text {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
}

.time-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.pickup-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.countdown {
  font-size: var(--text-xs);
  color: rgba(0, 188, 212, 0.9);
  font-weight: 600;

  &.urgent {
    color: rgb(var(--v-theme-warning));
  }

  &.overdue {
    color: rgb(var(--v-theme-error));
  }
}
</style>
