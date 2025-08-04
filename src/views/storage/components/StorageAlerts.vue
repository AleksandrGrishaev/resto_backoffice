<!-- src/views/storage/components/StorageAlerts.vue -->
<template>
  <div v-if="hasAlerts" class="storage-alerts">
    <v-alert v-if="alerts.expired > 0" type="error" variant="tonal" class="mb-2" closable>
      <template #prepend>
        <v-icon icon="mdi-alert-circle" />
      </template>

      <div class="d-flex align-center justify-space-between">
        <div>
          <strong>{{ alerts.expired }} expired items</strong>
          in {{ department }}
          <div class="text-caption">Remove expired items from inventory</div>
        </div>
        <v-btn size="small" variant="outlined" color="error" @click="$emit('show-expired')">
          View Items
        </v-btn>
      </div>
    </v-alert>

    <v-alert v-if="alerts.expiring > 0" type="warning" variant="tonal" class="mb-2" closable>
      <template #prepend>
        <v-icon icon="mdi-clock-alert-outline" />
      </template>

      <div class="d-flex align-center justify-space-between">
        <div>
          <strong>{{ alerts.expiring }} items expiring soon</strong>
          in {{ department }}
          <div class="text-caption">Items expire within 3 days</div>
        </div>
        <v-btn size="small" variant="outlined" color="warning" @click="$emit('show-expiring')">
          View Items
        </v-btn>
      </div>
    </v-alert>

    <v-alert v-if="alerts.lowStock > 0" type="info" variant="tonal" class="mb-2" closable>
      <template #prepend>
        <v-icon icon="mdi-package-variant" />
      </template>

      <div class="d-flex align-center justify-space-between">
        <div>
          <strong>{{ alerts.lowStock }} items low in stock</strong>
          in {{ department }}
          <div class="text-caption">Consider reordering these items</div>
        </div>
        <v-btn size="small" variant="outlined" color="info" @click="$emit('show-low-stock')">
          View Items
        </v-btn>
      </div>
    </v-alert>
  </div>

  <!-- No alerts message -->
  <v-alert v-else type="success" variant="tonal" class="mb-2">
    <template #prepend>
      <v-icon icon="mdi-check-circle" />
    </template>

    <div>
      <strong>All good!</strong>
      No alerts for {{ department }} inventory
      <div class="text-caption">All items are in stock and fresh</div>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StorageDepartment } from '@/stores/storage'

// Props
interface Props {
  alerts: {
    expiring: number
    expired: number
    lowStock: number
  }
  department: StorageDepartment
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  'show-expiring': []
  'show-expired': []
  'show-low-stock': []
}>()

// Computed
const hasAlerts = computed(
  () => props.alerts.expired > 0 || props.alerts.expiring > 0 || props.alerts.lowStock > 0
)
</script>

<style lang="scss" scoped>
.storage-alerts {
  .v-alert {
    .v-alert__content {
      width: 100%;
    }
  }
}
</style>
