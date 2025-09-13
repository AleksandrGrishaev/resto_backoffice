<!-- src/components/atoms/indicators/NotificationBadge.vue -->
<!--
  Universal notification badge indicator
  - Shows colored dot/count on top-right of element
  - Can display count number or just dot
  - Used for menu buttons, icons, etc. to show alerts
-->
<template>
  <div class="notification-badge">
    <slot />

    <div
      v-if="show"
      class="notification-badge__indicator"
      :class="[
        `notification-badge__indicator--${variant}`,
        `notification-badge__indicator--${size}`
      ]"
    >
      <span v-if="showCount && count" class="notification-badge__count">
        {{ displayCount }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// =============================================
// PROPS
// =============================================

interface Props {
  show?: boolean
  count?: number
  maxCount?: number
  showCount?: boolean
  variant?: 'error' | 'warning' | 'info' | 'success'
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  maxCount: 99,
  showCount: false,
  variant: 'error',
  size: 'sm'
})

// =============================================
// COMPUTED
// =============================================

const displayCount = computed(() => {
  if (!props.count) return ''
  return props.count > props.maxCount ? `${props.maxCount}+` : props.count.toString()
})
</script>

<style scoped>
.notification-badge {
  position: relative;
  display: inline-block;
  padding: 3px 3px 0 0;
}

.notification-badge__indicator {
  position: absolute;
  top: 0px;
  right: 0px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 10px;
  line-height: 1;
  z-index: 1;
}

/* Size variants */
.notification-badge__indicator--sm {
  min-width: 12px;
  min-height: 12px;
  padding: 1px 3px;
}

.notification-badge__indicator--md {
  min-width: 16px;
  min-height: 16px;
  padding: 2px 4px;
}

/* Color variants */
.notification-badge__indicator--error {
  background-color: var(--color-error);
  color: white;
}

.notification-badge__indicator--warning {
  background-color: var(--color-warning);
  color: var(--black-primary);
}

.notification-badge__indicator--info {
  background-color: var(--color-primary);
  color: white;
}

.notification-badge__indicator--success {
  background-color: var(--color-success);
  color: white;
}

.notification-badge__count {
  white-space: nowrap;
}

/* Animation */
.notification-badge__indicator {
  animation: badge-appear 0.3s ease-out;
}

@keyframes badge-appear {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
