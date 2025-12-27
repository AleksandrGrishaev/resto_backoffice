<!-- src/views/backoffice/alerts/components/AlertFilters.vue -->
<!--
  Alert Filters Component
  Provides category, severity, and status filters
-->
<template>
  <v-card flat class="alert-filters pa-3">
    <div class="d-flex flex-wrap gap-3 align-center">
      <!-- Category Filter -->
      <div class="filter-group">
        <div class="filter-label text-caption text-medium-emphasis mb-1">Category</div>
        <v-btn-toggle v-model="localCategory" density="compact" divided variant="outlined">
          <v-btn value="" size="small">All</v-btn>
          <v-btn v-for="cat in categories" :key="cat" :value="cat" size="small">
            <v-icon :icon="ALERT_ICONS[cat]" size="16" :color="ALERT_COLORS[cat]" class="me-1" />
            {{ ALERT_CATEGORY_LABELS[cat] }}
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- Severity Filter -->
      <div class="filter-group">
        <div class="filter-label text-caption text-medium-emphasis mb-1">Severity</div>
        <v-btn-toggle v-model="localSeverity" density="compact" divided variant="outlined">
          <v-btn value="" size="small">All</v-btn>
          <v-btn v-for="sev in severities" :key="sev" :value="sev" size="small">
            <v-icon
              :icon="ALERT_SEVERITY_ICONS[sev]"
              size="16"
              :color="ALERT_SEVERITY_COLORS[sev]"
              class="me-1"
            />
            {{ ALERT_SEVERITY_LABELS[sev] }}
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- Status Filter -->
      <div class="filter-group">
        <div class="filter-label text-caption text-medium-emphasis mb-1">Status</div>
        <v-btn-toggle v-model="localStatus" density="compact" divided variant="outlined">
          <v-btn value="" size="small">All</v-btn>
          <v-btn v-for="stat in statuses" :key="stat" :value="stat" size="small">
            {{ ALERT_STATUS_LABELS[stat] }}
          </v-btn>
        </v-btn-toggle>
      </div>

      <v-spacer />

      <!-- Clear Filters -->
      <v-btn
        v-if="hasActiveFilters"
        variant="text"
        size="small"
        color="primary"
        prepend-icon="mdi-filter-remove"
        @click="clearFilters"
      >
        Clear Filters
      </v-btn>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import type { AlertCategory, AlertSeverity, AlertStatus } from '@/stores/alerts'
import {
  ALERT_COLORS,
  ALERT_ICONS,
  ALERT_CATEGORY_LABELS,
  ALERT_SEVERITY_COLORS,
  ALERT_SEVERITY_ICONS,
  ALERT_SEVERITY_LABELS,
  ALERT_STATUS_LABELS
} from '@/stores/alerts'

// =============================================
// PROPS & EMITS
// =============================================

const props = defineProps<{
  category?: AlertCategory | ''
  severity?: AlertSeverity | ''
  status?: AlertStatus | ''
}>()

const emit = defineEmits<{
  'update:category': [value: AlertCategory | undefined]
  'update:severity': [value: AlertSeverity | undefined]
  'update:status': [value: AlertStatus | undefined]
}>()

// =============================================
// STATE
// =============================================

const categories: AlertCategory[] = ['shift', 'account', 'product', 'supplier']
const severities: AlertSeverity[] = ['critical', 'warning', 'info']
const statuses: AlertStatus[] = ['new', 'viewed', 'acknowledged', 'resolved']

// Local state for v-btn-toggle (empty string = all)
const localCategory = ref<AlertCategory | ''>(props.category || '')
const localSeverity = ref<AlertSeverity | ''>(props.severity || '')
const localStatus = ref<AlertStatus | ''>(props.status || '')

// =============================================
// COMPUTED
// =============================================

const hasActiveFilters = computed(() => {
  return localCategory.value || localSeverity.value || localStatus.value
})

// =============================================
// WATCHERS
// =============================================

watch(localCategory, val => {
  emit('update:category', val || undefined)
})

watch(localSeverity, val => {
  emit('update:severity', val || undefined)
})

watch(localStatus, val => {
  emit('update:status', val || undefined)
})

// Sync props to local state
watch(
  () => props.category,
  val => {
    localCategory.value = val || ''
  }
)
watch(
  () => props.severity,
  val => {
    localSeverity.value = val || ''
  }
)
watch(
  () => props.status,
  val => {
    localStatus.value = val || ''
  }
)

// =============================================
// METHODS
// =============================================

function clearFilters() {
  localCategory.value = ''
  localSeverity.value = ''
  localStatus.value = ''
}
</script>

<style scoped lang="scss">
.alert-filters {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
}

.filter-group {
  min-width: 0;
}

.filter-label {
  font-weight: 500;
}

:deep(.v-btn-toggle) {
  .v-btn {
    text-transform: none;
    letter-spacing: normal;
  }
}
</style>
