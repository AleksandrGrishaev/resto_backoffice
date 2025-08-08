<!-- src/views/preparation/components/PreparationAlerts.vue - Адаптация StorageAlerts -->
<template>
  <div v-if="hasAlerts" class="preparation-alerts">
    <v-alert v-if="alerts.expired > 0" type="error" variant="tonal" class="mb-2" closable>
      <template #prepend>
        <v-icon icon="mdi-alert-circle" />
      </template>

      <div class="d-flex align-center justify-space-between">
        <div>
          <strong>{{ alerts.expired }} expired preparations</strong>
          in {{ department }}
          <div class="text-caption">Remove expired preparations from inventory immediately</div>
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
          <strong>{{ alerts.expiring }} preparations expiring soon</strong>
          in {{ department }}
          <div class="text-caption">Preparations expire within 24 hours - use quickly!</div>
        </div>
        <v-btn size="small" variant="outlined" color="warning" @click="$emit('show-expiring')">
          View Items
        </v-btn>
      </div>
    </v-alert>

    <v-alert v-if="alerts.lowStock > 0" type="info" variant="tonal" class="mb-2" closable>
      <template #prepend>
        <v-icon icon="mdi-chef-hat" />
      </template>

      <div class="d-flex align-center justify-space-between">
        <div>
          <strong>{{ alerts.lowStock }} preparations low in stock</strong>
          in {{ department }}
          <div class="text-caption">Consider producing more of these preparations</div>
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
      No alerts for {{ department }} preparations
      <div class="text-caption">All preparations are fresh and adequately stocked</div>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PreparationDepartment } from '@/stores/preparation'

// Props
interface Props {
  alerts: {
    expiring: number
    expired: number
    lowStock: number
  }
  department: PreparationDepartment
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
.preparation-alerts {
  .v-alert {
    .v-alert__content {
      width: 100%;
    }
  }
}
</style>
