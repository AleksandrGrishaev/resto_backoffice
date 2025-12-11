<!-- src/views/kitchen/preparation/components/RecommendationsList.vue -->
<!-- Recommendations List - Display AI-generated production recommendations -->
<template>
  <div class="recommendations-list">
    <!-- Header -->
    <div class="recommendations-header">
      <div class="header-info">
        <v-icon color="primary" class="mr-2">mdi-lightbulb-outline</v-icon>
        <span class="text-subtitle-1 font-weight-medium">Suggested Production</span>
        <v-chip v-if="recommendations.length > 0" size="small" class="ml-2">
          {{ recommendations.length }}
        </v-chip>
      </div>
      <div class="header-actions">
        <v-btn
          v-if="recommendations.length > 0"
          color="primary"
          variant="flat"
          size="small"
          :loading="loading"
          @click="$emit('apply-all')"
        >
          <v-icon start size="small">mdi-playlist-plus</v-icon>
          Add All to Schedule
        </v-btn>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="recommendations.length === 0" class="recommendations-empty">
      <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-check-circle-outline</v-icon>
      <p class="text-body-2 text-medium-emphasis">All production is up to date</p>
    </div>

    <!-- Recommendations List -->
    <div v-else class="recommendations-items">
      <div
        v-for="rec in sortedRecommendations"
        :key="rec.id"
        class="recommendation-item"
        :class="`urgency-${rec.urgency}`"
      >
        <!-- Urgency Icon -->
        <div class="rec-urgency">
          <v-icon :color="getUrgencyColor(rec.urgency)" size="24">
            {{ getUrgencyIcon(rec.urgency) }}
          </v-icon>
        </div>

        <!-- Recommendation Info -->
        <div class="rec-info">
          <div class="rec-name">{{ rec.preparationName }}</div>
          <div class="rec-details">
            <span class="detail-item">
              <v-icon size="14" class="mr-1">mdi-package-variant</v-icon>
              Stock: {{ formatQuantity(rec.currentStock) }}
            </span>
            <span v-if="rec.avgDailyConsumption > 0" class="detail-item">
              <v-icon size="14" class="mr-1">mdi-trending-down</v-icon>
              Usage: {{ formatQuantity(rec.avgDailyConsumption) }}/day
            </span>
            <span class="detail-item">
              <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
              {{ formatDaysUntilStockout(rec.daysUntilStockout) }}
            </span>
          </div>
          <div class="rec-reason">
            <v-chip
              :color="getUrgencyColor(rec.urgency)"
              size="x-small"
              variant="tonal"
              class="mr-2"
            >
              {{ getUrgencyLabel(rec.urgency) }}
            </v-chip>
            <span class="reason-text">{{ rec.reason }}</span>
          </div>
        </div>

        <!-- Recommended Quantity -->
        <div class="rec-quantity">
          <div class="quantity-label">Recommend</div>
          <div class="quantity-value">{{ formatQuantity(rec.recommendedQuantity) }}</div>
        </div>

        <!-- Actions -->
        <div class="rec-actions">
          <v-btn color="primary" variant="tonal" size="small" @click="$emit('apply', rec)">
            <v-icon start size="small">mdi-plus</v-icon>
            Add
          </v-btn>
          <v-btn variant="text" size="small" color="grey" @click="$emit('dismiss', rec.id)">
            <v-icon size="small">mdi-close</v-icon>
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Summary Footer -->
    <div v-if="recommendations.length > 0" class="recommendations-footer">
      <div v-if="summary.urgent > 0" class="summary-item">
        <v-icon size="16" color="error" class="mr-1">mdi-alert-circle</v-icon>
        {{ summary.urgent }} urgent
      </div>
      <div v-if="summary.morning > 0" class="summary-item">
        <v-icon size="16" color="info" class="mr-1">mdi-weather-sunny</v-icon>
        {{ summary.morning }} morning
      </div>
      <div v-if="summary.afternoon > 0" class="summary-item">
        <v-icon size="16" color="warning" class="mr-1">mdi-weather-partly-cloudy</v-icon>
        {{ summary.afternoon }} afternoon
      </div>
      <div v-if="summary.evening > 0" class="summary-item">
        <v-icon size="16" color="purple" class="mr-1">mdi-weather-night</v-icon>
        {{ summary.evening }} evening
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProductionRecommendation, ProductionScheduleSlot } from '@/stores/preparation/types'

// =============================================
// PROPS
// =============================================

interface Props {
  recommendations: ProductionRecommendation[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// =============================================
// EMITS
// =============================================

defineEmits<{
  apply: [recommendation: ProductionRecommendation]
  'apply-all': []
  dismiss: [id: string]
}>()

// =============================================
// COMPUTED
// =============================================

const sortedRecommendations = computed(() => {
  const urgencyOrder: Record<ProductionScheduleSlot, number> = {
    urgent: 0,
    morning: 1,
    afternoon: 2,
    evening: 3
  }
  return [...props.recommendations].sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  )
})

const summary = computed(() => ({
  urgent: props.recommendations.filter(r => r.urgency === 'urgent').length,
  morning: props.recommendations.filter(r => r.urgency === 'morning').length,
  afternoon: props.recommendations.filter(r => r.urgency === 'afternoon').length,
  evening: props.recommendations.filter(r => r.urgency === 'evening').length
}))

// =============================================
// METHODS
// =============================================

function getUrgencyColor(urgency: ProductionScheduleSlot): string {
  switch (urgency) {
    case 'urgent':
      return 'error'
    case 'morning':
      return 'info'
    case 'afternoon':
      return 'warning'
    case 'evening':
      return 'purple'
    default:
      return 'grey'
  }
}

function getUrgencyIcon(urgency: ProductionScheduleSlot): string {
  switch (urgency) {
    case 'urgent':
      return 'mdi-alert-circle'
    case 'morning':
      return 'mdi-weather-sunny'
    case 'afternoon':
      return 'mdi-weather-partly-cloudy'
    case 'evening':
      return 'mdi-weather-night'
    default:
      return 'mdi-clock-outline'
  }
}

function getUrgencyLabel(urgency: ProductionScheduleSlot): string {
  switch (urgency) {
    case 'urgent':
      return 'Urgent'
    case 'morning':
      return 'Morning'
    case 'afternoon':
      return 'Afternoon'
    case 'evening':
      return 'Evening'
    default:
      return urgency
  }
}

function formatQuantity(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}kg`
  }
  return `${Math.round(value)}g`
}

function formatDaysUntilStockout(days: number): string {
  if (days <= 0) {
    return 'Out of stock'
  }
  if (days < 1) {
    return `${Math.round(days * 24)}h left`
  }
  if (days === 1) {
    return '1 day left'
  }
  return `${Math.round(days)} days left`
}
</script>

<style scoped lang="scss">
.recommendations-list {
  background-color: var(--v-theme-surface);
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: hidden;
}

.recommendations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.header-info {
  display: flex;
  align-items: center;
}

.recommendations-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
}

.recommendations-items {
  max-height: 400px;
  overflow-y: auto;
}

.recommendation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  transition: background-color 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: rgba(var(--v-theme-on-surface), 0.04);
  }

  &.urgency-urgent {
    border-left: 3px solid rgb(var(--v-theme-error));
  }

  &.urgency-morning {
    border-left: 3px solid rgb(var(--v-theme-info));
  }

  &.urgency-afternoon {
    border-left: 3px solid rgb(var(--v-theme-warning));
  }

  &.urgency-evening {
    border-left: 3px solid rgb(var(--v-theme-purple));
  }
}

.rec-urgency {
  flex-shrink: 0;
}

.rec-info {
  flex: 1;
  min-width: 0;
}

.rec-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--v-theme-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rec-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.detail-item {
  display: flex;
  align-items: center;
}

.rec-reason {
  display: flex;
  align-items: center;
  margin-top: 6px;
  font-size: 11px;
}

.reason-text {
  color: rgba(var(--v-theme-on-surface), 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.rec-quantity {
  text-align: right;
  flex-shrink: 0;
  min-width: 80px;
}

.quantity-label {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.quantity-value {
  font-weight: 600;
  font-size: 16px;
  color: rgb(var(--v-theme-primary));
}

.rec-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.recommendations-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: rgba(var(--v-theme-on-surface), 0.02);
}

.summary-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

@media (max-width: 600px) {
  .recommendation-item {
    flex-wrap: wrap;
    gap: 8px;
  }

  .rec-info {
    flex-basis: calc(100% - 50px);
  }

  .rec-quantity {
    order: 2;
    text-align: left;
  }

  .rec-actions {
    order: 3;
    flex-basis: 100%;
    justify-content: flex-end;
  }

  .reason-text {
    max-width: 150px;
  }
}
</style>
