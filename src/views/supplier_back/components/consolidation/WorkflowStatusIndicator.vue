<!-- src/views/supplier/components/consolidation/WorkflowStatusIndicator.vue -->
<template>
  <v-card class="workflow-status-indicator" :class="[`status-${currentStatus}`, { compact }]">
    <v-card-text :class="compact ? 'pa-3' : 'pa-4'">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="d-flex align-center">
          <v-icon
            :icon="getCurrentStatusIcon()"
            :color="getCurrentStatusColor()"
            :size="compact ? 20 : 24"
            class="mr-2"
          />
          <div>
            <div :class="compact ? 'text-body-2' : 'text-h6'" class="font-weight-medium">
              {{ getCurrentStatusTitle() }}
            </div>
            <div v-if="!compact" class="text-caption text-medium-emphasis">
              {{ getCurrentStatusDescription() }}
            </div>
          </div>
        </div>

        <!-- Progress Percentage -->
        <div v-if="showProgress" class="text-right">
          <v-chip
            :color="getCurrentStatusColor()"
            :size="compact ? 'small' : 'default'"
            variant="flat"
          >
            {{ progressPercentage }}%
          </v-chip>
          <div v-if="!compact" class="text-caption text-medium-emphasis mt-1">
            Step {{ currentStep }} of {{ totalSteps }}
          </div>
        </div>
      </div>

      <!-- Workflow Steps -->
      <div v-if="!compact" class="workflow-steps">
        <v-timeline density="compact" :direction="timelineDirection" class="workflow-timeline">
          <v-timeline-item
            v-for="(step, index) in workflowSteps"
            :key="step.id"
            :dot-color="getStepColor(step, index + 1)"
            :icon="getStepIcon(step, index + 1)"
            size="small"
            :class="{
              'step-completed': isStepCompleted(index + 1),
              'step-current': isStepCurrent(index + 1),
              'step-pending': isStepPending(index + 1)
            }"
          >
            <div class="step-content">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="font-weight-medium step-title">{{ step.title }}</div>
                  <div class="text-caption text-medium-emphasis step-description">
                    {{ step.description }}
                  </div>
                </div>

                <!-- Step Status Badge -->
                <v-chip
                  v-if="step.status"
                  :color="getStepStatusColor(step.status)"
                  size="x-small"
                  variant="tonal"
                >
                  {{ step.status }}
                </v-chip>
              </div>

              <!-- Step Details -->
              <div v-if="step.details && isStepCurrent(index + 1)" class="step-details mt-2">
                <v-card variant="tonal" :color="getStepColor(step, index + 1)">
                  <v-card-text class="pa-2">
                    <div class="text-caption">{{ step.details }}</div>
                  </v-card-text>
                </v-card>
              </div>

              <!-- Step Actions -->
              <div v-if="step.actions && isStepCurrent(index + 1)" class="step-actions mt-2">
                <div class="d-flex gap-1">
                  <v-btn
                    v-for="action in step.actions"
                    :key="action.label"
                    :color="action.color || 'primary'"
                    :variant="action.variant || 'outlined'"
                    size="x-small"
                    @click="$emit('step-action', action.id, step.id)"
                  >
                    <v-icon v-if="action.icon" :icon="action.icon" size="12" class="mr-1" />
                    {{ action.label }}
                  </v-btn>
                </div>
              </div>

              <!-- Estimated Time -->
              <div v-if="step.estimatedTime" class="estimated-time mt-2">
                <v-chip size="x-small" variant="text" color="info">
                  <v-icon icon="mdi-clock-outline" size="10" class="mr-1" />
                  ~{{ step.estimatedTime }}
                </v-chip>
              </div>
            </div>
          </v-timeline-item>
        </v-timeline>
      </div>

      <!-- Compact Progress Bar -->
      <div v-else class="compact-progress mt-3">
        <v-progress-linear
          :model-value="progressPercentage"
          :color="getCurrentStatusColor()"
          height="6"
          rounded
          :striped="isInProgress"
          :indeterminate="isLoading"
        />
        <div class="d-flex justify-space-between align-center mt-2">
          <div class="text-caption text-medium-emphasis">
            {{ currentStep }}/{{ totalSteps }} completed
          </div>
          <div v-if="estimatedTimeRemaining" class="text-caption text-medium-emphasis">
            <v-icon icon="mdi-clock-outline" size="10" class="mr-1" />
            ~{{ estimatedTimeRemaining }} remaining
          </div>
        </div>
      </div>

      <!-- Additional Info -->
      <div v-if="additionalInfo && !compact" class="additional-info mt-3">
        <v-alert :type="additionalInfo.type || 'info'" variant="tonal" density="compact">
          <div class="text-caption">{{ additionalInfo.message }}</div>
        </v-alert>
      </div>

      <!-- Quick Stats -->
      <div v-if="showStats && !compact" class="quick-stats mt-3">
        <v-row>
          <v-col v-for="stat in quickStats" :key="stat.label" :cols="12 / quickStats.length">
            <div class="text-center">
              <div class="text-subtitle-2 font-weight-bold" :class="stat.color">
                {{ stat.value }}
              </div>
              <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
            </div>
          </v-col>
        </v-row>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CONSOLIDATION_WORKFLOW_STEPS,
  getConsolidationStepIcon,
  getConsolidationStepName
} from './index'

// Props
interface WorkflowStep {
  id: string
  title: string
  description: string
  status?: 'completed' | 'current' | 'pending' | 'error' | 'skipped'
  details?: string
  estimatedTime?: string
  actions?: Array<{
    id: string
    label: string
    icon?: string
    color?: string
    variant?: string
  }>
}

interface QuickStat {
  label: string
  value: string | number
  color?: string
}

interface AdditionalInfo {
  type: 'success' | 'info' | 'warning' | 'error'
  message: string
}

interface Props {
  currentStep: number
  totalSteps?: number
  workflowSteps: WorkflowStep[]
  currentStatus?: 'active' | 'completed' | 'error' | 'paused'
  compact?: boolean
  showProgress?: boolean
  showStats?: boolean
  timelineDirection?: 'vertical' | 'horizontal'
  isLoading?: boolean
  estimatedTimeRemaining?: string
  additionalInfo?: AdditionalInfo
  quickStats?: QuickStat[]
}

const props = withDefaults(defineProps<Props>(), {
  totalSteps: 4,
  currentStatus: 'active',
  compact: false,
  showProgress: true,
  showStats: false,
  timelineDirection: 'vertical',
  isLoading: false
})

// Emits
const emit = defineEmits<{
  'step-action': [actionId: string, stepId: string]
}>()

// Computed
const progressPercentage = computed(() => {
  return Math.round((props.currentStep / props.totalSteps) * 100)
})

const isInProgress = computed(() => {
  return props.currentStatus === 'active' && props.currentStep < props.totalSteps
})

// Methods
function getCurrentStatusIcon(): string {
  const icons = {
    active: 'mdi-progress-check',
    completed: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    paused: 'mdi-pause-circle'
  }
  return icons[props.currentStatus] || 'mdi-help'
}

function getCurrentStatusColor(): string {
  const colors = {
    active: 'primary',
    completed: 'success',
    error: 'error',
    paused: 'warning'
  }
  return colors[props.currentStatus] || 'primary'
}

function getCurrentStatusTitle(): string {
  const titles = {
    active: 'Workflow In Progress',
    completed: 'Workflow Completed',
    error: 'Workflow Error',
    paused: 'Workflow Paused'
  }
  return titles[props.currentStatus] || 'Workflow Status'
}

function getCurrentStatusDescription(): string {
  const descriptions = {
    active: `Step ${props.currentStep} of ${props.totalSteps} - ${progressPercentage.value}% complete`,
    completed: 'All steps completed successfully',
    error: 'An error occurred during workflow execution',
    paused: 'Workflow execution is temporarily paused'
  }
  return descriptions[props.currentStatus] || 'Unknown status'
}

function getStepColor(step: WorkflowStep, stepNumber: number): string {
  if (step.status === 'error') return 'error'
  if (step.status === 'completed' || stepNumber < props.currentStep) return 'success'
  if (step.status === 'current' || stepNumber === props.currentStep) return 'primary'
  if (step.status === 'skipped') return 'warning'
  return 'default'
}

function getStepIcon(step: WorkflowStep, stepNumber: number): string {
  if (step.status === 'error') return 'mdi-alert'
  if (step.status === 'completed' || stepNumber < props.currentStep) return 'mdi-check'
  if (step.status === 'current' || stepNumber === props.currentStep) return 'mdi-play'
  if (step.status === 'skipped') return 'mdi-skip-next'

  // Use workflow-specific icons if available
  const workflowIcons = {
    1: 'mdi-clipboard-list',
    2: 'mdi-merge',
    3: 'mdi-package-variant',
    4: 'mdi-file-document'
  }

  return workflowIcons[stepNumber as keyof typeof workflowIcons] || 'mdi-circle'
}

function getStepStatusColor(status: string): string {
  const colors = {
    completed: 'success',
    current: 'primary',
    pending: 'default',
    error: 'error',
    skipped: 'warning'
  }
  return colors[status as keyof typeof colors] || 'default'
}

function isStepCompleted(stepNumber: number): boolean {
  return (
    stepNumber < props.currentStep || props.workflowSteps[stepNumber - 1]?.status === 'completed'
  )
}

function isStepCurrent(stepNumber: number): boolean {
  return (
    stepNumber === props.currentStep || props.workflowSteps[stepNumber - 1]?.status === 'current'
  )
}

function isStepPending(stepNumber: number): boolean {
  return (
    stepNumber > props.currentStep && props.workflowSteps[stepNumber - 1]?.status !== 'completed'
  )
}
</script>

<style lang="scss" scoped>
.workflow-status-indicator {
  transition: all 0.3s ease;

  &.compact {
    .v-card-text {
      padding: 12px 16px;
    }
  }

  &.status-active {
    border-left: 4px solid rgb(var(--v-theme-primary));
  }

  &.status-completed {
    border-left: 4px solid rgb(var(--v-theme-success));
  }

  &.status-error {
    border-left: 4px solid rgb(var(--v-theme-error));
  }

  &.status-paused {
    border-left: 4px solid rgb(var(--v-theme-warning));
  }
}

.workflow-timeline {
  background: transparent;

  :deep(.v-timeline-item) {
    .v-timeline-item__body {
      padding-bottom: 24px;
    }

    .v-timeline-item__opposite {
      flex: 0 0 auto;
      width: auto;
    }
  }
}

.step-content {
  .step-title {
    font-size: 0.875rem;
    line-height: 1.25;
  }

  .step-description {
    font-size: 0.75rem;
    line-height: 1.2;
    opacity: 0.8;
  }
}

.step-completed {
  .step-title {
    text-decoration: line-through;
    opacity: 0.7;
  }
}

.step-current {
  .step-content {
    background: rgba(var(--v-theme-primary), 0.05);
    border-radius: 8px;
    padding: 8px;
    margin: -4px;
  }
}

.step-pending {
  opacity: 0.6;
}

.compact-progress {
  .v-progress-linear {
    border-radius: 4px;
  }
}

.additional-info {
  :deep(.v-alert) {
    .v-alert__content {
      padding: 8px 0;
    }
  }
}

.quick-stats {
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: 8px;
  padding: 12px;
}

// Animations
.step-current {
  animation: currentStepPulse 2s ease-in-out infinite;
}

@keyframes currentStepPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

.status-completed {
  animation: completedBounce 0.6s ease-out;
}

@keyframes completedBounce {
  0%,
  20%,
  53%,
  80%,
  100% {
    transform: scale(1);
  }
  40%,
  43% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(1.02);
  }
}

.status-error {
  animation: errorShake 0.5s ease-out;
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

// Progress bar animations
.v-progress-linear.v-progress-linear--striped {
  :deep(.v-progress-linear__background) {
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(255, 255, 255, 0.1) 10px,
      rgba(255, 255, 255, 0.1) 20px
    );
    animation: progressStripes 1s linear infinite;
  }
}

@keyframes progressStripes {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 20px 0;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .workflow-status-indicator {
    &:not(.compact) {
      .workflow-timeline {
        :deep(.v-timeline-item) {
          .v-timeline-item__body {
            padding-bottom: 16px;
          }
        }
      }

      .step-content {
        .d-flex.justify-space-between {
          flex-direction: column;
          gap: 8px;

          .step-actions {
            justify-content: flex-start;
          }
        }
      }
    }
  }

  .quick-stats {
    .v-row .v-col {
      text-align: left !important;
      margin-bottom: 8px;
    }
  }
}

// Dark theme adjustments
.v-theme--dark {
  .workflow-status-indicator {
    .step-current .step-content {
      background: rgba(var(--v-theme-primary), 0.1);
    }

    .quick-stats {
      background: rgba(var(--v-theme-surface), 0.8);
    }
  }
}
</style>
