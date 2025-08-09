<!-- src/views/supplier/components/consolidation/StatusIndicator.vue -->
<template>
  <v-card
    class="status-indicator"
    :class="[`status-${status}`, { compact }]"
    variant="tonal"
    :color="getStatusColor()"
  >
    <v-card-text :class="compact ? 'pa-3' : 'pa-4'">
      <div class="d-flex align-center justify-space-between">
        <!-- Status Info -->
        <div class="d-flex align-center">
          <v-icon
            :icon="getStatusIcon()"
            :color="getStatusColor()"
            :size="compact ? 20 : 24"
            class="mr-3"
          />
          <div>
            <div :class="compact ? 'text-body-2' : 'text-h6'" class="font-weight-medium">
              {{ title }}
            </div>
            <div v-if="description && !compact" class="text-caption text-medium-emphasis">
              {{ description }}
            </div>
          </div>
        </div>

        <!-- Progress/Action -->
        <div class="d-flex align-center gap-2">
          <!-- Progress -->
          <div v-if="showProgress" class="text-right">
            <v-chip :color="getStatusColor()" :size="compact ? 'small' : 'default'" variant="flat">
              {{ progress }}%
            </v-chip>
            <div v-if="!compact && progressText" class="text-caption text-medium-emphasis mt-1">
              {{ progressText }}
            </div>
          </div>

          <!-- Actions -->
          <div v-if="actions && actions.length > 0" class="d-flex gap-1">
            <v-btn
              v-for="action in actions"
              :key="action.label"
              :color="action.color || getStatusColor()"
              :variant="action.variant || 'outlined'"
              :size="compact ? 'small' : 'default'"
              @click="$emit('action', action.id)"
            >
              <v-icon v-if="action.icon" :icon="action.icon" size="16" class="mr-1" />
              {{ action.label }}
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Additional Content -->
      <div v-if="$slots.default" class="mt-3">
        <slot />
      </div>

      <!-- Progress Bar for Compact Mode -->
      <div v-if="compact && showProgress" class="mt-3">
        <v-progress-linear
          :model-value="progress"
          :color="getStatusColor()"
          height="4"
          rounded
          :striped="status === 'processing'"
          :indeterminate="status === 'loading'"
        />
        <div v-if="progressText" class="text-caption text-medium-emphasis mt-1">
          {{ progressText }}
        </div>
      </div>

      <!-- Message -->
      <div v-if="message" class="mt-3">
        <v-alert :type="getAlertType()" variant="tonal" density="compact" :icon="false">
          <div class="text-caption">{{ message }}</div>
        </v-alert>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props
interface Action {
  id: string
  label: string
  icon?: string
  color?: string
  variant?: 'flat' | 'outlined' | 'text'
}

interface Props {
  status: 'success' | 'error' | 'warning' | 'info' | 'processing' | 'loading' | 'pending'
  title: string
  description?: string
  message?: string
  progress?: number
  progressText?: string
  showProgress?: boolean
  compact?: boolean
  actions?: Action[]
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  showProgress: false,
  progress: 0
})

// Emits
const emit = defineEmits<{
  action: [actionId: string]
}>()

// Methods
function getStatusColor(): string {
  const colors = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
    processing: 'primary',
    loading: 'primary',
    pending: 'orange'
  }
  return colors[props.status] || 'default'
}

function getStatusIcon(): string {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information',
    processing: 'mdi-cog',
    loading: 'mdi-loading',
    pending: 'mdi-clock-outline'
  }
  return icons[props.status] || 'mdi-help'
}

function getAlertType(): 'success' | 'info' | 'warning' | 'error' {
  switch (props.status) {
    case 'success':
      return 'success'
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    default:
      return 'info'
  }
}
</script>

<style lang="scss" scoped>
.status-indicator {
  transition: all 0.3s ease;

  &.compact {
    .v-card-text {
      padding: 12px 16px;
    }
  }

  // Status-specific styles
  &.status-success {
    border-left: 4px solid rgb(var(--v-theme-success));
  }

  &.status-error {
    border-left: 4px solid rgb(var(--v-theme-error));
    animation: errorShake 0.5s ease-out;
  }

  &.status-warning {
    border-left: 4px solid rgb(var(--v-theme-warning));
  }

  &.status-info {
    border-left: 4px solid rgb(var(--v-theme-info));
  }

  &.status-processing {
    border-left: 4px solid rgb(var(--v-theme-primary));

    .mdi-cog {
      animation: spin 2s linear infinite;
    }
  }

  &.status-loading {
    border-left: 4px solid rgb(var(--v-theme-primary));

    .mdi-loading {
      animation: spin 1s linear infinite;
    }
  }

  &.status-pending {
    border-left: 4px solid rgb(var(--v-theme-orange));
  }
}

// Animations
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes errorShake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .status-indicator {
    .d-flex.justify-space-between {
      flex-direction: column;
      gap: 12px;
    }
  }
}
</style>
