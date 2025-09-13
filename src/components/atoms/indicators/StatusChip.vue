<!-- src/components/atoms/indicators/StatusChip.vue -->
<!--
  Universal status indicator chip component
  - Shows status with colored dot and optional label
  - Can be used anywhere in the app for any status indication
  - Supports 4 standard status types with predefined colors
-->
<template>
  <div class="status-chip" :class="chipClasses">
    <div class="status-dot" />
    <span v-if="showLabel" class="status-label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// =============================================
// PROPS
// =============================================

interface Props {
  status: 'success' | 'error' | 'warning' | 'info'
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: true,
  size: 'sm'
})

// =============================================
// COMPUTED
// =============================================

const chipClasses = computed(() => [`status-chip--${props.status}`, `status-chip--${props.size}`])
</script>

<style scoped>
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-lg);
  white-space: nowrap;
}

.status-chip--sm {
  min-height: 20px;
}

.status-chip--md {
  min-height: 24px;
  padding: var(--spacing-sm) var(--spacing-md);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-label {
  font-size: var(--text-xs);
  font-weight: 500;
}

/* Status variants */
.status-chip--success {
  background-color: rgba(146, 201, 175, 0.15);
  color: var(--color-success);
}

.status-chip--success .status-dot {
  background-color: var(--color-success);
}

.status-chip--error {
  background-color: rgba(255, 150, 118, 0.15);
  color: var(--color-error);
}

.status-chip--error .status-dot {
  background-color: var(--color-error);
}

.status-chip--warning {
  background-color: rgba(255, 176, 118, 0.15);
  color: var(--color-warning);
}

.status-chip--warning .status-dot {
  background-color: var(--color-warning);
}

.status-chip--info {
  background-color: rgba(163, 149, 233, 0.15);
  color: var(--color-primary);
}

.status-chip--info .status-dot {
  background-color: var(--color-primary);
}
</style>
