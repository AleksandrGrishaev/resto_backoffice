<!-- src/components/navigation/StorageAlertsBadge.vue -->
<template>
  <div v-if="hasAlerts" class="storage-alerts-badge">
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

// Store
const storageStore = useStorageStore()

// Computed
const alertCounts = computed(() => storageStore.alertCounts)

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
    // Load storage data to calculate alerts
    await storageStore.fetchBalances()
  } catch (error) {
    console.warn('Failed to load storage alerts:', error)
  }
})
</script>

<style lang="scss" scoped>
.storage-alerts-badge {
  display: flex;
  align-items: center;
}
</style>
