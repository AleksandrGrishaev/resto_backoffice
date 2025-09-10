<template>
  <span class="status-badge" :class="[`status-${status}`, { 'status-badge--compact': compact }]">
    <span class="status-badge__dot" />
    <span v-if="!compact" class="status-badge__label">{{ statusConfig[status].label }}</span>
    <v-icon
      v-if="!compact && showIcon"
      :icon="statusConfig[status].icon"
      size="16"
      class="status-badge__icon"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { TableStatus } from '@/types/table'

export type { TableStatus }

const props = defineProps<{
  status: TableStatus
  compact?: boolean
  showIcon?: boolean
}>()

const statusConfig = {
  free: {
    color: 'success',
    label: 'Free',
    icon: 'mdi-table'
  },
  occupied_unpaid: {
    color: 'warning',
    label: 'Unpaid',
    icon: 'mdi-clock-outline'
  },
  occupied_paid: {
    color: 'primary',
    label: 'Paid',
    icon: 'mdi-check-circle'
  },
  reserved: {
    color: 'purple',
    label: 'Reserved',
    icon: 'mdi-calendar-clock'
  }
}
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1;
}

.status-badge--compact {
  padding: 0;
}

.status-badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-badge__icon {
  opacity: 0.8;
}

/* Status Variants */
.status-free {
  background-color: rgba(var(--v-theme-success), 0.1);
  color: rgb(var(--v-theme-success));
}

.status-free .status-badge__dot {
  background-color: rgb(var(--v-theme-success));
}

.status-occupied_unpaid {
  background-color: rgba(var(--v-theme-warning), 0.1);
  color: rgb(var(--v-theme-warning));
}

.status-occupied_unpaid .status-badge__dot {
  background-color: rgb(var(--v-theme-warning));
}

.status-occupied_paid {
  background-color: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}

.status-occupied_paid .status-badge__dot {
  background-color: rgb(var(--v-theme-primary));
}

.status-reserved {
  background-color: rgba(147, 51, 234, 0.1);
  color: rgb(147, 51, 234);
}

.status-reserved .status-badge__dot {
  background-color: rgb(147, 51, 234);
}

/* Compact Mode */
.status-badge--compact .status-badge__dot {
  width: 8px;
  height: 8px;
}

.status-badge--compact .status-badge__label,
.status-badge--compact .status-badge__icon {
  display: none;
}
</style>
