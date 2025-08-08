<!-- src/components/navigation/AlertsBadge.vue -->
<template>
  <div v-if="hasAlerts" class="alerts-badge">
    <!-- Critical alerts (expired items) -->
    <v-badge
      v-if="alertCounts.expired > 0"
      :content="alertCounts.expired"
      color="error"
      inline
      class="mr-1"
    >
      <v-icon icon="mdi-alert-circle" size="16" color="error" />
    </v-badge>

    <!-- Warning alerts (expiring or low stock) -->
    <v-badge v-else-if="warningCount > 0" :content="warningCount" color="warning" inline>
      <v-icon icon="mdi-alert" size="16" color="warning" />
    </v-badge>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'

// Types
interface AlertCounts {
  expired: number
  expiring: number
  lowStock: number
}

type AlertType = 'storage' | 'preparation'

interface Props {
  type: AlertType
}

const props = defineProps<Props>()

// Stores
const storageStore = useStorageStore()
const preparationStore = usePreparationStore()

// Computed
const alertCounts = computed(() => {
  try {
    if (props.type === 'storage') {
      return storageStore.alertCounts || { expired: 0, expiring: 0, lowStock: 0 }
    } else if (props.type === 'preparation') {
      return preparationStore.alertCounts || { expired: 0, expiring: 0, lowStock: 0 }
    }
    return { expired: 0, expiring: 0, lowStock: 0 }
  } catch (error) {
    console.warn(`Failed to get ${props.type} alert counts:`, error)
    return { expired: 0, expiring: 0, lowStock: 0 }
  }
})

const warningCount = computed(() => alertCounts.value.expiring + alertCounts.value.lowStock)

const hasAlerts = computed(
  () =>
    alertCounts.value.expired > 0 ||
    alertCounts.value.expiring > 0 ||
    alertCounts.value.lowStock > 0
)

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
