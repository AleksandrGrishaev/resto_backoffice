<!-- src/views/backoffice/alerts/components/AlertCard.vue -->
<!--
  Single Alert Card Component
  Displays alert information with actions
-->
<template>
  <v-card
    class="alert-card mb-3"
    :class="`alert-card--${alert.severity}`"
    elevation="1"
    :style="{ borderLeftColor: categoryColor }"
  >
    <v-card-item>
      <template #prepend>
        <v-avatar :color="categoryColor" size="40" class="me-3">
          <v-icon :icon="categoryIcon" color="white" />
        </v-avatar>
      </template>

      <template #title>
        <div class="d-flex align-center gap-2">
          <v-icon :icon="severityIcon" :color="severityColor" size="18" />
          <span class="text-body-1 font-weight-medium">{{ alert.title }}</span>
        </div>
      </template>

      <template #subtitle>
        <div class="d-flex align-center gap-2 mt-1 text-medium-emphasis">
          <v-chip
            :color="categoryColor"
            size="x-small"
            variant="tonal"
            class="text-uppercase font-weight-bold"
          >
            {{ ALERT_CATEGORY_LABELS[alert.category] }}
          </v-chip>
          <span class="text-caption">{{ ALERT_TYPE_LABELS[alert.type] || alert.type }}</span>
          <span class="text-caption">•</span>
          <span class="text-caption">{{ formattedTime }}</span>
        </div>
      </template>

      <template #append>
        <v-chip :color="statusColor" size="small" variant="tonal">
          {{ ALERT_STATUS_LABELS[alert.status] }}
        </v-chip>
      </template>
    </v-card-item>

    <!-- Summary line (always visible) + Toggle -->
    <v-card-text v-if="hasMetadata && isKnownAlertType" class="pt-0 pb-2">
      <div class="d-flex align-center">
        <!-- Quick Summary -->
        <div class="text-body-2 text-medium-emphasis flex-grow-1">
          <template v-if="alert.type === 'manual_correction' && alert.metadata">
            {{ alert.metadata.accountName }}:
            <span
              :class="alert.metadata.correctionAmount >= 0 ? 'text-success' : 'text-error'"
              class="font-weight-medium"
            >
              {{ alert.metadata.correctionAmount >= 0 ? '+' : ''
              }}{{ formatCurrency(alert.metadata.correctionAmount) }}
            </span>
          </template>
          <template v-else-if="alert.type === 'balance_correction' && alert.metadata">
            {{ alert.metadata.supplierName }}:
            <span
              :class="alert.metadata.correctionAmount >= 0 ? 'text-success' : 'text-error'"
              class="font-weight-medium"
            >
              {{ alert.metadata.correctionAmount >= 0 ? '+' : ''
              }}{{ formatCurrency(alert.metadata.correctionAmount) }}
            </span>
          </template>
          <template v-else-if="alert.type === 'large_refund' && alert.metadata">
            <span class="text-error font-weight-medium">
              -{{ formatCurrency(alert.metadata.refundAmount) }}
            </span>
            via {{ alert.metadata.method }}
          </template>
          <template v-else-if="alert.type === 'pre_bill_modified' && alert.metadata">
            <span class="text-error font-weight-medium">
              {{
                formatCurrency(
                  (alert.metadata.currentTotal || 0) - (alert.metadata.originalTotal || 0)
                )
              }}
            </span>
            difference
          </template>
        </div>
        <!-- Toggle Button -->
        <v-btn
          variant="text"
          size="small"
          density="compact"
          :icon="showDetails ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          @click="showDetails = !showDetails"
        />
      </div>
    </v-card-text>

    <!-- Collapsible Details -->
    <v-expand-transition>
      <v-card-text v-if="showDetails" class="pt-0">
        <!-- Manual Correction Details -->
        <div v-if="alert.type === 'manual_correction' && alert.metadata" class="alert-details">
          <div class="details-grid mb-2">
            <div class="detail-item">
              <span class="detail-label">Account</span>
              <span class="detail-value font-weight-medium">
                {{ alert.metadata.accountName || 'Unknown' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Previous Balance</span>
              <span class="detail-value">{{ formatCurrency(alert.metadata.previousBalance) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">New Balance</span>
              <span class="detail-value">{{ formatCurrency(alert.metadata.newBalance) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Correction</span>
              <span
                class="detail-value font-weight-bold"
                :class="alert.metadata.correctionAmount >= 0 ? 'text-success' : 'text-error'"
              >
                {{ alert.metadata.correctionAmount >= 0 ? '+' : ''
                }}{{ formatCurrency(alert.metadata.correctionAmount) }}
              </span>
            </div>
            <div v-if="alert.metadata.performedBy" class="detail-item">
              <span class="detail-label">Performed by</span>
              <span class="detail-value">{{ alert.metadata.performedBy }}</span>
            </div>
          </div>
          <div v-if="alert.metadata.reason" class="reason-text">
            <v-icon icon="mdi-message-text-outline" size="14" class="me-1" />
            {{ alert.metadata.reason }}
          </div>
        </div>

        <!-- Supplier Balance Correction Details -->
        <div
          v-else-if="alert.type === 'balance_correction' && alert.metadata"
          class="alert-details"
        >
          <div class="details-grid mb-2">
            <div class="detail-item">
              <span class="detail-label">Supplier</span>
              <span class="detail-value font-weight-medium">
                {{ alert.metadata.supplierName || 'Unknown' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Previous Balance</span>
              <span class="detail-value">{{ formatCurrency(alert.metadata.previousBalance) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">New Balance</span>
              <span class="detail-value">{{ formatCurrency(alert.metadata.newBalance) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Correction</span>
              <span
                class="detail-value font-weight-bold"
                :class="alert.metadata.correctionAmount >= 0 ? 'text-success' : 'text-error'"
              >
                {{ alert.metadata.correctionAmount >= 0 ? '+' : ''
                }}{{ formatCurrency(alert.metadata.correctionAmount) }}
              </span>
            </div>
            <div v-if="alert.metadata.performedBy" class="detail-item">
              <span class="detail-label">Performed by</span>
              <span class="detail-value">{{ alert.metadata.performedBy }}</span>
            </div>
            <div v-if="alert.metadata.reason" class="detail-item">
              <span class="detail-label">Reason</span>
              <span class="detail-value">{{ alert.metadata.reason }}</span>
            </div>
          </div>
          <div v-if="alert.metadata.notes" class="reason-text">
            <v-icon icon="mdi-message-text-outline" size="14" class="me-1" />
            {{ alert.metadata.notes }}
          </div>
        </div>

        <!-- Refund Details -->
        <div v-else-if="alert.type === 'large_refund' && alert.metadata" class="alert-details">
          <div class="details-grid mb-2">
            <div class="detail-item">
              <span class="detail-label">Payment #</span>
              <span class="detail-value font-weight-medium">
                {{ alert.metadata.paymentNumber || 'N/A' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Amount</span>
              <span class="detail-value font-weight-bold text-error">
                -{{ formatCurrency(alert.metadata.refundAmount) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Method</span>
              <span class="detail-value text-uppercase">{{ alert.metadata.method }}</span>
            </div>
            <div v-if="alert.metadata.refundedBy" class="detail-item">
              <span class="detail-label">Refunded by</span>
              <span class="detail-value">{{ alert.metadata.refundedBy }}</span>
            </div>
          </div>
          <div v-if="alert.metadata.reason" class="reason-text">
            <v-icon icon="mdi-message-text-outline" size="14" class="me-1" />
            {{ alert.metadata.reason }}
          </div>
        </div>

        <!-- Pre-bill Modified Details -->
        <div v-else-if="alert.type === 'pre_bill_modified' && alert.metadata" class="alert-details">
          <div class="details-grid mb-2">
            <div v-if="alert.metadata.orderNumber" class="detail-item">
              <span class="detail-label">Order</span>
              <span class="detail-value font-weight-medium">#{{ alert.metadata.orderNumber }}</span>
            </div>
            <div v-if="alert.metadata.tableNumber" class="detail-item">
              <span class="detail-label">Table</span>
              <span class="detail-value">{{ alert.metadata.tableNumber }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Original Total</span>
              <span class="detail-value">{{ formatCurrency(alert.metadata.originalTotal) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Current Total</span>
              <span class="detail-value">{{ formatCurrency(alert.metadata.currentTotal) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Difference</span>
              <span class="detail-value font-weight-bold text-error">
                {{
                  formatCurrency(
                    (alert.metadata.currentTotal || 0) - (alert.metadata.originalTotal || 0)
                  )
                }}
              </span>
            </div>
            <div v-if="alert.metadata.timeSincePrint" class="detail-item">
              <span class="detail-label">Time since print</span>
              <span class="detail-value">{{ alert.metadata.timeSincePrint }}</span>
            </div>
          </div>
          <div
            v-if="alert.metadata.changes && alert.metadata.changes.length"
            class="changes-section"
          >
            <div class="text-caption text-medium-emphasis mb-1">Changes:</div>
            <v-chip
              v-for="(change, idx) in alert.metadata.changes"
              :key="idx"
              size="x-small"
              variant="tonal"
              color="error"
              class="me-1 mb-1"
            >
              {{ change }}
            </v-chip>
          </div>
        </div>
      </v-card-text>
    </v-expand-transition>

    <!-- Generic Description (fallback for unknown types) -->
    <v-card-text v-if="!isKnownAlertType && alert.description" class="pt-0">
      <div class="text-body-2">{{ alert.description }}</div>
    </v-card-text>

    <!-- Raw Metadata (for debugging or unknown types) -->
    <v-card-text v-if="hasMetadata && !isKnownAlertType" class="pt-0">
      <v-expansion-panels variant="accordion" class="alert-metadata">
        <v-expansion-panel>
          <v-expansion-panel-title class="text-caption">
            <v-icon icon="mdi-information-outline" size="16" class="me-2" />
            Raw Details
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <pre class="text-caption">{{ formattedMetadata }}</pre>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>

    <!-- Timestamp -->
    <v-card-text class="pt-0 pb-2">
      <div class="text-caption text-medium-emphasis">
        <v-icon icon="mdi-clock-outline" size="12" class="me-1" />
        {{ formattedDateTime }}
      </div>
    </v-card-text>

    <!-- Resolution Notes -->
    <v-card-text v-if="alert.resolutionNotes" class="pt-0">
      <v-alert type="success" variant="tonal" density="compact" class="text-caption">
        <strong>Resolution:</strong>
        {{ alert.resolutionNotes }}
      </v-alert>
    </v-card-text>

    <!-- Actions -->
    <v-card-actions v-if="showActions">
      <v-spacer />

      <!-- View Order (if orderId present) -->
      <v-btn
        v-if="alert.orderId"
        variant="text"
        size="small"
        color="primary"
        prepend-icon="mdi-receipt"
        @click="$emit('view-order', alert)"
      >
        View Order
      </v-btn>

      <!-- Acknowledge -->
      <v-btn
        v-if="canAcknowledge"
        variant="tonal"
        size="small"
        color="warning"
        prepend-icon="mdi-check"
        :loading="loading"
        @click="$emit('acknowledge', alert)"
      >
        Acknowledge
      </v-btn>

      <!-- Resolve -->
      <v-btn
        v-if="canResolve"
        variant="tonal"
        size="small"
        color="success"
        prepend-icon="mdi-check-all"
        :loading="loading"
        @click="$emit('resolve', alert)"
      >
        Resolve
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { TimeUtils, formatIDR } from '@/utils'
import type { OperationAlert } from '@/stores/alerts'
import {
  ALERT_COLORS,
  ALERT_ICONS,
  ALERT_SEVERITY_COLORS,
  ALERT_SEVERITY_ICONS,
  ALERT_CATEGORY_LABELS,
  ALERT_TYPE_LABELS,
  ALERT_STATUS_LABELS
} from '@/stores/alerts'

// =============================================
// PROPS & EMITS
// =============================================

const props = defineProps<{
  alert: OperationAlert
  loading?: boolean
}>()

defineEmits<{
  acknowledge: [alert: OperationAlert]
  resolve: [alert: OperationAlert]
  'view-order': [alert: OperationAlert]
}>()

// =============================================
// STATE
// =============================================

const showDetails = ref(false)

// =============================================
// HELPERS
// =============================================

const formatCurrency = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A'
  return formatIDR(value)
}

// Known alert types with custom UI
const KNOWN_ALERT_TYPES = [
  'manual_correction',
  'large_refund',
  'pre_bill_modified',
  'balance_correction'
]

// =============================================
// COMPUTED
// =============================================

const categoryColor = computed(() => ALERT_COLORS[props.alert.category])
const categoryIcon = computed(() => ALERT_ICONS[props.alert.category])

const severityColor = computed(() => ALERT_SEVERITY_COLORS[props.alert.severity])
const severityIcon = computed(() => ALERT_SEVERITY_ICONS[props.alert.severity])

const statusColor = computed(() => {
  switch (props.alert.status) {
    case 'new':
      return 'error'
    case 'viewed':
      return 'warning'
    case 'acknowledged':
      return 'info'
    case 'resolved':
      return 'success'
    default:
      return 'grey'
  }
})

const formattedTime = computed(() => {
  return TimeUtils.getRelativeTime(props.alert.createdAt)
})

const formattedDateTime = computed(() => {
  return TimeUtils.formatDateTimeForDisplay(props.alert.createdAt)
})

const hasMetadata = computed(() => {
  return props.alert.metadata && Object.keys(props.alert.metadata).length > 0
})

const formattedMetadata = computed(() => {
  if (!props.alert.metadata) return ''
  return JSON.stringify(props.alert.metadata, null, 2)
})

const isKnownAlertType = computed(() => {
  return KNOWN_ALERT_TYPES.includes(props.alert.type)
})

const showActions = computed(() => {
  return props.alert.status !== 'resolved'
})

const canAcknowledge = computed(() => {
  return props.alert.status === 'new' || props.alert.status === 'viewed'
})

const canResolve = computed(() => {
  return props.alert.status === 'acknowledged'
})
</script>

<style scoped lang="scss">
.alert-card {
  border-left: 4px solid;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &--critical {
    background: linear-gradient(90deg, rgba(244, 67, 54, 0.05) 0%, rgba(255, 255, 255, 0) 50%);
  }

  &--warning {
    background: linear-gradient(90deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 255, 255, 0) 50%);
  }

  &--info {
    background: linear-gradient(90deg, rgba(33, 150, 243, 0.05) 0%, rgba(255, 255, 255, 0) 50%);
  }
}

.alert-details {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  padding: 12px 16px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px 24px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-weight: 500;
  white-space: nowrap;
}

.detail-value {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.87);
  line-height: 1.4;
}

.reason-text {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  margin-top: 8px;
}

.changes-section {
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  margin-top: 8px;
}

.alert-metadata {
  :deep(.v-expansion-panel) {
    background: rgba(0, 0, 0, 0.02);
  }

  pre {
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }
}
</style>
