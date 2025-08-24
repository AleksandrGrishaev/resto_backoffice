<!-- src/views/storage/components/StorageAlerts.vue - UPDATED: Added Zero Stock Support -->
<template>
  <div v-if="hasAlerts || hasZeroStock" class="storage-alerts">
    <!-- Expired Alert -->
    <v-alert v-if="alerts.expired > 0" type="error" variant="tonal" class="mb-2" closable>
      <template #prepend>
        <v-icon icon="mdi-alert-circle" />
      </template>

      <div class="d-flex align-center justify-space-between">
        <div>
          <strong>{{ alerts.expired }} expired items</strong>
          in {{ formatDepartment(department) }}
          <div class="text-caption">Remove expired items from inventory</div>
        </div>
        <v-btn size="small" variant="outlined" color="error" @click="$emit('show-expired')">
          View Items
        </v-btn>
      </div>
    </v-alert>

    <!-- Expiring Soon Alert -->
    <v-alert v-if="alerts.expiring > 0" type="warning" variant="tonal" class="mb-2" closable>
      <template #prepend>
        <v-icon icon="mdi-clock-alert-outline" />
      </template>

      <div class="d-flex align-center justify-space-between">
        <div>
          <strong>{{ alerts.expiring }} items expiring soon</strong>
          in {{ formatDepartment(department) }}
          <div class="text-caption">Items expire within 3 days</div>
        </div>
        <v-btn size="small" variant="outlined" color="warning" @click="$emit('show-expiring')">
          View Items
        </v-btn>
      </div>
    </v-alert>

    <!-- Low Stock Alert -->
    <v-alert v-if="alerts.lowStock > 0" type="info" variant="tonal" class="mb-2" closable>
      <template #prepend>
        <v-icon icon="mdi-package-variant" />
      </template>

      <div class="d-flex align-center justify-space-between">
        <div>
          <strong>{{ alerts.lowStock }} items low in stock</strong>
          in {{ formatDepartment(department) }}
          <div class="text-caption">Consider reordering these items</div>
        </div>
        <v-btn size="small" variant="outlined" color="info" @click="$emit('show-low-stock')">
          View Items
        </v-btn>
      </div>
    </v-alert>
  </div>

  <!-- All Good Message -->
  <v-alert v-else type="success" variant="tonal" class="mb-2">
    <template #prepend>
      <v-icon icon="mdi-check-circle" />
    </template>

    <div>
      <strong>All good!</strong>
      No alerts for {{ formatDepartment(department) }} inventory
      <div class="text-caption">All items are in stock and fresh</div>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StorageDepartment } from '@/stores/storage'

// Props with alerts interface (removed zeroStock)
interface Props {
  alerts: {
    expiring: number
    expired: number
    lowStock: number
  }
  department: StorageDepartment
}

const props = defineProps<Props>()

// Emits (removed show-zero-stock)
defineEmits<{
  'show-expiring': []
  'show-expired': []
  'show-low-stock': []
}>()

// Computed properties (removed hasZeroStock)
const hasAlerts = computed(
  () => props.alerts.expired > 0 || props.alerts.expiring > 0 || props.alerts.lowStock > 0
)

// Helper method
function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}
</script>

<style lang="scss" scoped>
.storage-alerts {
  .v-alert {
    .v-alert__content {
      width: 100%;
    }
  }

  .quick-actions-bar {
    .v-card {
      border: 1px solid rgba(var(--v-theme-outline), 0.2);
    }

    .d-flex.gap-2 {
      gap: 8px;
    }
  }
}

/* Responsive improvements */
@media (max-width: 960px) {
  .storage-alerts {
    .v-alert {
      .d-flex.justify-space-between {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
    }

    .quick-actions-bar {
      .d-flex.justify-space-between {
        flex-direction: column;
        gap: 12px;
      }

      .d-flex.gap-2 {
        flex-wrap: wrap;
        justify-content: flex-start;
      }
    }
  }
}

@media (max-width: 600px) {
  .storage-alerts {
    .quick-actions-bar {
      .d-flex.gap-2 {
        .v-btn {
          flex: 1;
          min-width: 0;
          font-size: 0.875rem;
        }
      }
    }
  }
}
</style>
