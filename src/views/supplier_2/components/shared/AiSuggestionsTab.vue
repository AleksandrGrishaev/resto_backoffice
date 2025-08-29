<!-- AiSuggestionsTab.vue -->
<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
      <div class="text-body-1">Analyzing stock levels...</div>
    </div>

    <!-- Empty State -->
    <div v-else-if="categorizedSuggestions.length === 0" class="text-center pa-8">
      <v-icon icon="mdi-check-circle" size="64" color="success" class="mb-4" />
      <div class="text-h6 mb-2">All Stock Levels OK</div>
      <div class="text-body-2 text-medium-emphasis">
        No urgent items needed for {{ selectedDepartment }}
      </div>
      <v-btn color="primary" class="mt-4" @click="$emit('refresh')">Refresh Suggestions</v-btn>
    </div>

    <!-- Suggestions by Categories -->
    <div v-else>
      <div v-for="category in categorizedSuggestions" :key="category.name" class="mb-4">
        <v-card variant="outlined" class="overflow-hidden">
          <!-- Category Header -->
          <v-card-title class="d-flex align-center pa-3" :class="`bg-${category.color}-lighten-4`">
            <v-icon :icon="category.icon" :color="category.color" class="mr-2" size="20" />
            <span class="font-weight-bold">{{ category.name }}</span>
            <v-spacer />
            <v-chip size="small" :color="category.color">
              {{ category.items.length }} item{{ category.items.length > 1 ? 's' : '' }}
            </v-chip>
          </v-card-title>

          <!-- Category Items -->
          <div class="pa-0">
            <div
              v-for="(suggestion, index) in category.items"
              :key="suggestion.itemId"
              class="pa-4"
              :class="{ 'border-b': index < category.items.length - 1 }"
            >
              <div class="d-flex align-start">
                <!-- Product Info -->
                <div class="flex-grow-1 mr-4">
                  <div class="d-flex align-center mb-2">
                    <div class="font-weight-bold text-subtitle-2 mr-2">
                      {{ suggestion.itemName }}
                    </div>
                    <v-chip
                      size="small"
                      :color="getUrgencyColor(suggestion.urgency)"
                      :prepend-icon="getUrgencyIcon(suggestion.urgency)"
                    >
                      {{ suggestion.urgency }}
                    </v-chip>
                  </div>

                  <!-- Stock Information (without cost) -->
                  <div class="text-body-2 text-medium-emphasis mb-2">
                    {{ formatSuggestionQuantityRange(suggestion) }}
                  </div>

                  <!-- Reason -->
                  <div v-if="suggestion.reason" class="text-caption text-medium-emphasis">
                    <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
                    {{ formatReason(suggestion.reason) }}
                  </div>
                </div>

                <!-- Actions -->
                <div class="d-flex flex-column align-center">
                  <v-btn
                    v-if="!isSuggestionAdded(suggestion.itemId)"
                    color="success"
                    size="small"
                    prepend-icon="mdi-plus"
                    @click="$emit('addSuggestion', suggestion)"
                  >
                    Add to Request
                  </v-btn>
                  <v-chip v-else color="success" size="small" prepend-icon="mdi-check">
                    Added
                  </v-chip>
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </div>

      <!-- Quick Actions -->
      <div class="d-flex gap-2 mt-4">
        <v-btn
          color="error"
          variant="outlined"
          prepend-icon="mdi-alert"
          :disabled="urgentSuggestions.length === 0"
          @click="$emit('addAllUrgent')"
        >
          Add All Urgent ({{ urgentSuggestions.length }})
        </v-btn>
        <v-spacer />
        <v-btn color="primary" prepend-icon="mdi-refresh" @click="$emit('refresh')">Refresh</v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OrderSuggestion } from '@/stores/supplier_2/types'

// Props
interface Props {
  isLoading: boolean
  categorizedSuggestions: any[]
  urgentSuggestions: OrderSuggestion[]
  selectedDepartment: string
  isSuggestionAdded: (itemId: string) => boolean
}

defineProps<Props>()

// Emits
defineEmits<{
  refresh: []
  addSuggestion: [suggestion: OrderSuggestion]
  addAllUrgent: []
}>()

// Utility Functions
function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'high':
      return 'error'
    case 'medium':
      return 'warning'
    case 'low':
      return 'success'
    default:
      return 'grey'
  }
}

function getUrgencyIcon(urgency: string): string {
  switch (urgency) {
    case 'high':
      return 'mdi-alert'
    case 'medium':
      return 'mdi-alert-outline'
    case 'low':
      return 'mdi-information-outline'
    default:
      return 'mdi-help'
  }
}

function formatSuggestionQuantityRange(suggestion: OrderSuggestion): string {
  // Simple formatting without complex unit conversions
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}kg`
    }
    return `${num}g`
  }

  return `Current: ${formatNumber(suggestion.currentStock)} • Min: ${formatNumber(suggestion.minStock)} • Suggested: ${formatNumber(suggestion.suggestedQuantity)}`
}

function formatReason(reason: string): string {
  const reasons: Record<string, string> = {
    below_minimum: 'Stock below minimum threshold',
    running_low: 'Stock running low',
    optimization: 'Optimization opportunity',
    expired_soon: 'Items expiring soon'
  }
  return reasons[reason] || reason
}
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
