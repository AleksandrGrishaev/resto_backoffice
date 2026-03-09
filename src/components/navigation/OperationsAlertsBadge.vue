<!-- src/components/navigation/OperationsAlertsBadge.vue -->
<!--
  Operations Alerts Badge for Navigation
  Shows color-coded badges for each alert category with counts
-->
<template>
  <div v-if="hasAlerts" class="operations-alerts-badge">
    <template v-for="category in activeCategories" :key="category">
      <v-badge
        :content="getCategoryCount(category)"
        :color="ALERT_COLORS[category]"
        inline
        class="category-badge"
      >
        <v-icon :icon="ALERT_ICONS[category]" size="14" :color="ALERT_COLORS[category]" />
      </v-badge>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useAlertsStore, ALERT_COLORS, ALERT_ICONS, type AlertCategory } from '@/stores/alerts'

// =============================================
// STORE
// =============================================

const alertsStore = useAlertsStore()

// =============================================
// COMPUTED
// =============================================

// Only count NEW (unread) alerts for the navigation badge
const newCountsByCategory = computed(() => {
  const counts: Record<AlertCategory, number> = {
    shift: 0,
    account: 0,
    product: 0,
    supplier: 0
  }
  for (const alert of alertsStore.newAlerts) {
    if (counts[alert.category] !== undefined) {
      counts[alert.category]++
    }
  }
  return counts
})

const hasAlerts = computed(() => alertsStore.newAlerts.length > 0)

const activeCategories = computed(() => {
  const categories: AlertCategory[] = ['shift', 'account', 'product', 'supplier']
  return categories.filter(cat => newCountsByCategory.value[cat] > 0)
})

// =============================================
// METHODS
// =============================================

function getCategoryCount(category: AlertCategory): number {
  return newCountsByCategory.value[category] || 0
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  // Initialize if not already done
  if (!alertsStore.initialized) {
    await alertsStore.initialize()
  }
})

onUnmounted(() => {
  // Cleanup is handled by the store itself
})
</script>

<style scoped lang="scss">
.operations-alerts-badge {
  display: flex;
  align-items: center;
  gap: 4px;
}

.category-badge {
  :deep(.v-badge__badge) {
    font-size: 10px;
    height: 16px;
    min-width: 16px;
    padding: 0 4px;
  }
}
</style>
