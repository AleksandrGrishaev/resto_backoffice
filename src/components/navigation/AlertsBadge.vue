<!-- src/components/navigation/AlertsBadge.vue -->
<template>
  <div v-if="hasAlerts" class="alerts-badge">
    <!-- Critical alerts (expired items, overdue orders) -->
    <v-badge
      v-if="alertCounts.expired > 0 || alertCounts.overdue > 0"
      :content="criticalCount"
      color="error"
      inline
      class="mr-1"
    >
      <v-icon icon="mdi-alert-circle" size="16" color="error" />
    </v-badge>

    <!-- Warning alerts (expiring, low stock, pending orders) -->
    <v-badge v-else-if="warningCount > 0" :content="warningCount" color="warning" inline>
      <v-icon icon="mdi-alert" size="16" color="warning" />
    </v-badge>

    <!-- Info alerts (pending requests) -->
    <v-badge v-else-if="infoCount > 0" :content="infoCount" color="info" inline>
      <v-icon icon="mdi-information" size="16" color="info" />
    </v-badge>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useSupplierStore } from '@/stores/supplier'

// Types
interface AlertCounts {
  expired: number
  expiring: number
  lowStock: number
  overdue?: number
  pending?: number
  discrepancies?: number
}

type AlertType = 'storage' | 'preparation' | 'supplier'

interface Props {
  type: AlertType
}

const props = defineProps<Props>()

// Stores
const storageStore = useStorageStore()
const preparationStore = usePreparationStore()
const supplierStore = useSupplierStore()

// Computed
const alertCounts = computed(() => {
  try {
    if (props.type === 'storage') {
      return storageStore.alertCounts || { expired: 0, expiring: 0, lowStock: 0 }
    } else if (props.type === 'preparation') {
      return preparationStore.alertCounts || { expired: 0, expiring: 0, lowStock: 0 }
    } else if (props.type === 'supplier') {
      return getSupplierAlerts()
    }
    return { expired: 0, expiring: 0, lowStock: 0 }
  } catch (error) {
    console.warn(`Failed to get ${props.type} alert counts:`, error)
    return { expired: 0, expiring: 0, lowStock: 0 }
  }
})

const criticalCount = computed(
  () => (alertCounts.value.expired || 0) + (alertCounts.value.overdue || 0)
)

const warningCount = computed(
  () =>
    (alertCounts.value.expiring || 0) +
    (alertCounts.value.lowStock || 0) +
    (alertCounts.value.discrepancies || 0)
)

const infoCount = computed(() => alertCounts.value.pending || 0)

const hasAlerts = computed(
  () => criticalCount.value > 0 || warningCount.value > 0 || infoCount.value > 0
)

// Supplier-specific alert calculations
function getSupplierAlerts(): AlertCounts {
  if (!supplierStore.state) {
    return { expired: 0, expiring: 0, lowStock: 0, overdue: 0, pending: 0, discrepancies: 0 }
  }

  const orders = supplierStore.state.purchaseOrders || []
  const requests = supplierStore.state.procurementRequests || []
  const acceptances = supplierStore.state.receiptAcceptances || []
  const now = new Date()

  // Count overdue orders (expected delivery date passed)
  const overdue = orders.filter(order => {
    if (
      !order.expectedDeliveryDate ||
      order.status === 'delivered' ||
      order.status === 'cancelled'
    ) {
      return false
    }
    return new Date(order.expectedDeliveryDate) < now
  }).length

  // Count pending requests (submitted but not approved)
  const pending = requests.filter(request => request.status === 'submitted').length

  // Count acceptances with discrepancies
  const discrepancies = acceptances.filter(
    acceptance => acceptance.hasDiscrepancies && acceptance.status === 'draft'
  ).length

  return {
    expired: 0,
    expiring: 0,
    lowStock: 0,
    overdue,
    pending,
    discrepancies
  }
}

// Initialize store data for alerts
onMounted(async () => {
  try {
    if (props.type === 'storage') {
      // Load storage data to calculate alerts
      await storageStore.fetchBalances()
    } else if (props.type === 'preparation') {
      // Load preparation data to calculate alerts
      if (preparationStore.initialize) {
        await preparationStore.initialize()
      }
    } else if (props.type === 'supplier') {
      // Load supplier data to calculate alerts
      await supplierStore.initialize()
    }
  } catch (error) {
    console.warn(`Failed to load ${props.type} alerts:`, error)
  }
})
</script>

<style lang="scss" scoped>
.alerts-badge {
  display: flex;
  align-items: center;
}
</style>
