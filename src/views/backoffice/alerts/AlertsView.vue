<!-- src/views/backoffice/alerts/AlertsView.vue -->
<!--
  Operations Alerts Dashboard
  Shows all alerts with filtering and management capabilities
-->
<template>
  <div class="alerts-view">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Operations Alerts</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Monitor and manage operational alerts requiring attention
        </p>
      </div>

      <v-spacer />

      <!-- Summary Stats -->
      <div class="d-flex gap-3 me-4">
        <v-chip
          v-for="cat in alertsStore.activeCategories"
          :key="cat"
          :color="ALERT_COLORS[cat]"
          variant="tonal"
          size="small"
        >
          <v-icon :icon="ALERT_ICONS[cat]" size="14" class="me-1" />
          {{ alertsStore.alertCounts[cat].total }}
        </v-chip>
      </div>

      <!-- Actions -->
      <v-btn
        variant="tonal"
        color="primary"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="handleRefresh"
      >
        Refresh
      </v-btn>

      <v-btn
        v-if="alertsStore.newAlerts.length > 0"
        variant="tonal"
        color="warning"
        class="ms-2"
        prepend-icon="mdi-eye-check"
        @click="handleMarkAllViewed"
      >
        Mark All Viewed
      </v-btn>
    </div>

    <!-- Filters -->
    <AlertFilters
      v-model:category="filters.category"
      v-model:severity="filters.severity"
      v-model:status="filters.status"
      class="mb-4"
    />

    <!-- Loading State -->
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <!-- Empty State -->
    <v-card v-if="!loading && filteredAlerts.length === 0" flat class="text-center pa-8">
      <v-icon icon="mdi-check-circle" size="64" color="success" class="mb-4" />
      <h3 class="text-h6 mb-2">No Alerts</h3>
      <p class="text-body-2 text-medium-emphasis">
        {{
          hasFilters
            ? 'No alerts match your current filters.'
            : 'All operations are running smoothly.'
        }}
      </p>
      <v-btn v-if="hasFilters" variant="text" color="primary" @click="clearFilters">
        Clear Filters
      </v-btn>
    </v-card>

    <!-- Alerts List -->
    <template v-else>
      <!-- Group by category when no category filter -->
      <template v-if="!filters.category">
        <template v-for="category in orderedCategories" :key="category">
          <div v-if="alertsByCategory[category].length > 0" class="category-section mb-6">
            <div class="d-flex align-center mb-3">
              <v-avatar :color="ALERT_COLORS[category]" size="32" class="me-2">
                <v-icon :icon="ALERT_ICONS[category]" color="white" size="18" />
              </v-avatar>
              <h2 class="text-h6 font-weight-medium">
                {{ ALERT_CATEGORY_LABELS[category] }}
              </h2>
              <v-chip :color="ALERT_COLORS[category]" variant="tonal" size="x-small" class="ms-2">
                {{ alertsByCategory[category].length }}
              </v-chip>
            </div>

            <AlertCard
              v-for="alert in alertsByCategory[category]"
              :key="alert.id"
              :alert="alert"
              :loading="actionLoading === alert.id"
              @acknowledge="handleAcknowledge"
              @resolve="handleOpenResolve"
              @view-order="handleViewOrder"
            />
          </div>
        </template>
      </template>

      <!-- Flat list when category filter is active -->
      <template v-else>
        <AlertCard
          v-for="alert in filteredAlerts"
          :key="alert.id"
          :alert="alert"
          :loading="actionLoading === alert.id"
          @acknowledge="handleAcknowledge"
          @resolve="handleOpenResolve"
          @view-order="handleViewOrder"
        />
      </template>
    </template>

    <!-- Resolve Dialog -->
    <v-dialog v-model="resolveDialog" max-width="500">
      <v-card>
        <v-card-title>Resolve Alert</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="resolveNotes"
            label="Resolution Notes"
            placeholder="Describe how this was resolved..."
            rows="3"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="resolveDialog = false">Cancel</v-btn>
          <v-btn
            variant="tonal"
            color="success"
            :loading="actionLoading === selectedAlert?.id"
            @click="handleResolve"
          >
            Resolve
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAlertsStore } from '@/stores/alerts'
import { useAuthStore } from '@/stores/auth'
import { DebugUtils } from '@/utils'
import type { OperationAlert, AlertCategory, AlertSeverity, AlertStatus } from '@/stores/alerts'
import { ALERT_COLORS, ALERT_ICONS, ALERT_CATEGORY_LABELS } from '@/stores/alerts'
import AlertCard from './components/AlertCard.vue'
import AlertFilters from './components/AlertFilters.vue'

const MODULE_NAME = 'AlertsView'

// =============================================
// STORES & ROUTER
// =============================================

const alertsStore = useAlertsStore()
const authStore = useAuthStore()
const router = useRouter()

// =============================================
// STATE
// =============================================

const loading = ref(false)
const actionLoading = ref<string | null>(null)
const allAlerts = ref<OperationAlert[]>([])

// Filters
const filters = ref<{
  category?: AlertCategory
  severity?: AlertSeverity
  status?: AlertStatus
}>({})

// Resolve dialog
const resolveDialog = ref(false)
const selectedAlert = ref<OperationAlert | null>(null)
const resolveNotes = ref('')

// =============================================
// COMPUTED
// =============================================

const hasFilters = computed(() => {
  return filters.value.category || filters.value.severity || filters.value.status
})

const filteredAlerts = computed(() => {
  let result = allAlerts.value

  if (filters.value.category) {
    result = result.filter(a => a.category === filters.value.category)
  }
  if (filters.value.severity) {
    result = result.filter(a => a.severity === filters.value.severity)
  }
  if (filters.value.status) {
    result = result.filter(a => a.status === filters.value.status)
  }

  return result
})

const alertsByCategory = computed(() => {
  const grouped: Record<AlertCategory, OperationAlert[]> = {
    shift: [],
    account: [],
    product: [],
    supplier: []
  }

  for (const alert of filteredAlerts.value) {
    if (grouped[alert.category]) {
      grouped[alert.category].push(alert)
    }
  }

  return grouped
})

// Order categories by priority (shift first for fraud alerts)
const orderedCategories = computed((): AlertCategory[] => {
  return ['shift', 'account', 'product', 'supplier']
})

// =============================================
// METHODS
// =============================================

async function fetchAlerts() {
  loading.value = true
  try {
    allAlerts.value = await alertsStore.fetchAllAlerts({
      limit: 100
    })
    DebugUtils.debug(MODULE_NAME, 'Fetched alerts', { count: allAlerts.value.length })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch alerts', { error })
  } finally {
    loading.value = false
  }
}

async function handleRefresh() {
  await fetchAlerts()
}

async function handleMarkAllViewed() {
  try {
    await alertsStore.markAllAsViewed()
    await fetchAlerts()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to mark all as viewed', { error })
  }
}

async function handleAcknowledge(alert: OperationAlert) {
  actionLoading.value = alert.id
  try {
    const userId = authStore.currentUser?.id || 'unknown'
    await alertsStore.acknowledgeAlert(alert.id, userId)
    await fetchAlerts()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to acknowledge alert', { error })
  } finally {
    actionLoading.value = null
  }
}

function handleOpenResolve(alert: OperationAlert) {
  selectedAlert.value = alert
  resolveNotes.value = ''
  resolveDialog.value = true
}

async function handleResolve() {
  if (!selectedAlert.value) return

  actionLoading.value = selectedAlert.value.id
  try {
    const userId = authStore.currentUser?.id || 'unknown'
    await alertsStore.resolveAlert(selectedAlert.value.id, userId, resolveNotes.value)
    resolveDialog.value = false
    await fetchAlerts()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to resolve alert', { error })
  } finally {
    actionLoading.value = null
  }
}

function handleViewOrder(alert: OperationAlert) {
  if (alert.orderId) {
    // Navigate to sales transactions with order filter
    router.push({
      path: '/sales/transactions',
      query: { orderId: alert.orderId }
    })
  }
}

function clearFilters() {
  filters.value = {}
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  DebugUtils.debug(MODULE_NAME, 'AlertsView mounted')

  // Initialize store if needed
  if (!alertsStore.initialized) {
    await alertsStore.initialize()
  }

  // Fetch all alerts for the view
  await fetchAlerts()
})

// Refetch when filters change
watch(
  filters,
  () => {
    // Just recompute, no need to refetch
  },
  { deep: true }
)
</script>

<style scoped lang="scss">
.alerts-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.category-section {
  border-left: 3px solid transparent;
  padding-left: 16px;

  &:has(.alert-card) {
    // Dynamic border color based on first card
  }
}
</style>
