<!-- Enhanced StorageAlerts.vue with Transit Support -->
<template>
  <div v-if="hasAlerts" class="storage-alerts">
    <v-card elevation="2" class="rounded-lg">
      <v-card-title class="d-flex align-center py-4 px-4">
        <v-icon icon="mdi-alert" class="mr-3" color="warning" />
        <span class="text-h6 font-weight-bold">Storage Alerts</span>
        <v-spacer />
        <v-chip
          size="small"
          :color="getTotalSeverityColor()"
          variant="flat"
          class="font-weight-bold"
        >
          {{ totalAlertsCount }} alert{{ totalAlertsCount !== 1 ? 's' : '' }}
        </v-chip>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <div class="alert-grid">
          <!-- Transit Alerts -->
          <div
            v-if="
              transitMetrics &&
              (transitMetrics.overdueCount > 0 || transitMetrics.dueTodayCount > 0)
            "
            class="alert-item"
            :class="getTransitAlertClass()"
            role="button"
            tabindex="0"
            @click="handleTransitClick"
            @keydown.enter="handleTransitClick"
            @keydown.space="handleTransitClick"
          >
            <div class="alert-content">
              <div class="alert-icon">
                <v-icon
                  :icon="transitMetrics.overdueCount > 0 ? 'mdi-truck-alert' : 'mdi-truck-delivery'"
                  :color="transitMetrics.overdueCount > 0 ? 'error' : 'info'"
                  size="32"
                />
              </div>
              <div class="alert-info">
                <div class="alert-count">
                  {{ transitMetrics.overdueCount + transitMetrics.dueTodayCount }}
                </div>
                <div class="alert-description">
                  {{
                    transitMetrics.overdueCount > 0
                      ? `${transitMetrics.overdueCount} overdue, ${transitMetrics.dueTodayCount} due today`
                      : `${transitMetrics.dueTodayCount} deliveries due today`
                  }}
                </div>
              </div>
            </div>
            <v-icon
              icon="mdi-chevron-right"
              color="medium-emphasis"
              size="20"
              class="alert-arrow"
            />
          </div>

          <!-- Expired Items Alert -->
          <div
            v-if="alerts.expired > 0"
            class="alert-item alert-item--error"
            role="button"
            tabindex="0"
            @click="handleExpiredClick"
            @keydown.enter="handleExpiredClick"
            @keydown.space="handleExpiredClick"
          >
            <div class="alert-content">
              <div class="alert-icon">
                <v-icon icon="mdi-alert-circle" color="error" size="32" />
              </div>
              <div class="alert-info">
                <div class="alert-count">{{ alerts.expired }}</div>
                <div class="alert-description">Expired products</div>
              </div>
            </div>
            <v-icon
              icon="mdi-chevron-right"
              color="medium-emphasis"
              size="20"
              class="alert-arrow"
            />
          </div>

          <!-- Expiring Soon Alert -->
          <div
            v-if="alerts.expiring > 0"
            class="alert-item alert-item--warning"
            role="button"
            tabindex="0"
            @click="handleExpiringClick"
            @keydown.enter="handleExpiringClick"
            @keydown.space="handleExpiringClick"
          >
            <div class="alert-content">
              <div class="alert-icon">
                <v-icon icon="mdi-clock-alert-outline" color="warning" size="32" />
              </div>
              <div class="alert-info">
                <div class="alert-count">{{ alerts.expiring }}</div>
                <div class="alert-description">Expiring soon</div>
              </div>
            </div>
            <v-icon
              icon="mdi-chevron-right"
              color="medium-emphasis"
              size="20"
              class="alert-arrow"
            />
          </div>

          <!-- Low Stock Alert -->
          <div
            v-if="alerts.lowStock > 0"
            class="alert-item alert-item--info"
            role="button"
            tabindex="0"
            @click="handleLowStockClick"
            @keydown.enter="handleLowStockClick"
            @keydown.space="handleLowStockClick"
          >
            <div class="alert-content">
              <div class="alert-icon">
                <v-icon icon="mdi-package-variant" color="info" size="32" />
              </div>
              <div class="alert-info">
                <div class="alert-count">{{ alerts.lowStock }}</div>
                <div class="alert-description">Below minimum stock</div>
              </div>
            </div>
            <v-icon
              icon="mdi-chevron-right"
              color="medium-emphasis"
              size="20"
              class="alert-arrow"
            />
          </div>

          <!-- All Good State -->
          <div v-if="!hasAnyAlerts" class="alert-item alert-item--success">
            <div class="alert-content">
              <div class="alert-icon">
                <v-icon icon="mdi-check-circle" color="success" size="32" />
              </div>
              <div class="alert-info">
                <div class="alert-count">All Good</div>
                <div class="alert-description">
                  {{ formatDepartment(department) }} stock is healthy
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Transit Summary Bar -->
        <div v-if="transitMetrics && transitMetrics.totalTransitItems > 0" class="transit-summary">
          <v-divider />
          <div class="pa-4">
            <div class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon icon="mdi-truck-delivery" color="orange" size="24" class="mr-3" />
                <div>
                  <div class="text-body-1 font-weight-medium">
                    {{ transitMetrics.totalTransitItems }} items in transit
                  </div>
                  <div class="text-body-2 text-medium-emphasis">
                    Total value: {{ formatCurrency(transitMetrics.totalTransitValue) }}
                  </div>
                </div>
              </div>
              <v-btn
                size="small"
                variant="outlined"
                color="orange"
                append-icon="mdi-chevron-right"
                @click="handleTransitClick"
              >
                View Transit
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StorageDepartment } from '@/stores/storage'

// Props
interface Props {
  alerts: {
    expired: number
    expiring: number
    lowStock: number
    transit?: number
    overdue?: number
  }
  department: StorageDepartment
  transitMetrics?: {
    totalTransitItems: number
    totalTransitValue: number
    overdueCount: number
    dueTodayCount: number
  }
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'show-transit': []
  'show-expired': []
  'show-expiring': []
  'show-low-stock': []
}>()

// Computed properties
const hasAlerts = computed(() => {
  return hasAnyAlerts.value || (props.transitMetrics && props.transitMetrics.totalTransitItems > 0)
})

const hasAnyAlerts = computed(() => {
  return (
    props.alerts.expired > 0 ||
    props.alerts.expiring > 0 ||
    props.alerts.lowStock > 0 ||
    (props.transitMetrics &&
      (props.transitMetrics.overdueCount > 0 || props.transitMetrics.dueTodayCount > 0))
  )
})

const totalAlertsCount = computed(() => {
  let count = props.alerts.expired + props.alerts.expiring + props.alerts.lowStock
  if (props.transitMetrics) {
    count += props.transitMetrics.overdueCount + props.transitMetrics.dueTodayCount
  }
  return count
})

// Methods
const getTotalSeverityColor = () => {
  if (props.alerts.expired > 0 || (props.transitMetrics && props.transitMetrics.overdueCount > 0)) {
    return 'error'
  }
  if (props.alerts.expiring > 0) {
    return 'warning'
  }
  if (
    props.alerts.lowStock > 0 ||
    (props.transitMetrics && props.transitMetrics.dueTodayCount > 0)
  ) {
    return 'info'
  }
  return 'success'
}

const getTransitAlertClass = () => {
  if (props.transitMetrics?.overdueCount > 0) {
    return 'alert-item--error'
  }
  return 'alert-item--info'
}

const formatDepartment = (dept: StorageDepartment): string => {
  return dept.charAt(0).toUpperCase() + dept.slice(1).toLowerCase()
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Event handlers
const handleTransitClick = () => {
  emit('show-transit')
}

const handleExpiredClick = () => {
  emit('show-expired')
}

const handleExpiringClick = () => {
  emit('show-expiring')
}

const handleLowStockClick = () => {
  emit('show-low-stock')
}
</script>

<style scoped>
.storage-alerts {
  margin-bottom: 1rem;
}

.alert-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1px;
  background-color: rgb(var(--v-theme-surface-variant));
}

.alert-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: rgb(var(--v-theme-surface));
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 80px;
  position: relative;
  overflow: hidden;
}

.alert-item:hover {
  background-color: rgb(var(--v-theme-surface-bright));
  transform: translateY(-1px);
}

.alert-item:focus {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.alert-item:active {
  transform: translateY(0);
}

.alert-item--error {
  border-left: 4px solid rgb(var(--v-theme-error));
}

.alert-item--warning {
  border-left: 4px solid rgb(var(--v-theme-warning));
}

.alert-item--info {
  border-left: 4px solid rgb(var(--v-theme-info));
}

.alert-item--success {
  border-left: 4px solid rgb(var(--v-theme-success));
  cursor: default;
}

.alert-item--success:hover {
  transform: none;
  background-color: rgb(var(--v-theme-surface));
}

.alert-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.alert-icon {
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-info {
  flex: 1;
}

.alert-count {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-on-surface));
}

.alert-description {
  font-size: 0.875rem;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 0.25rem;
}

.alert-arrow {
  opacity: 0.7;
  transition: all 0.2s ease;
}

.alert-item:hover .alert-arrow {
  opacity: 1;
  transform: translateX(2px);
}

.transit-summary {
  background-color: rgb(var(--v-theme-surface));
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .alert-grid {
    grid-template-columns: 1fr;
  }

  .alert-item {
    min-height: 70px;
    padding: 0.75rem;
  }

  .alert-count {
    font-size: 1.1rem;
  }

  .alert-description {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .transit-summary .d-flex {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .transit-summary .justify-space-between {
    justify-content: flex-start;
  }
}
</style>
