<!-- src/components/molecules/navigation/StatusBar.vue -->
<!--
  Status bar composition showing system and shift status
  - Combines StatusChip atoms to display multiple statuses
  - Shows shift info, connection status and current time
  - Used in navigation components across the app
-->
<template>
  <div class="status-bar">
    <!-- Shift Status -->
    <StatusChip
      v-if="shiftStatus"
      :status="shiftStatus"
      :label="shiftLabel"
      size="sm"
      class="shift-chip"
    />

    <!-- Connection Status -->
    <StatusChip
      :status="connectionStatus"
      :label="connectionLabel"
      size="sm"
      :show-label="false"
      class="connection-chip"
    />

    <!-- Current Time -->
    <div class="time-display">{{ currentTime }}</div>
  </div>
</template>

<script setup lang="ts">
// Import atoms
import StatusChip from '@/components/atoms/indicators/StatusChip.vue'

// =============================================
// PROPS
// =============================================

interface Props {
  // Shift information
  shiftStatus?: 'success' | 'warning' | 'info'
  shiftLabel?: string

  // Connection information
  connectionStatus: 'success' | 'error' | 'warning'
  connectionLabel?: string

  // Time display
  currentTime: string
}

withDefaults(defineProps<Props>(), {
  connectionLabel: 'Connection'
})
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.shift-chip {
  flex: 1;
  min-width: 0;
}

.connection-chip {
  flex-shrink: 0;
}

.time-display {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  margin-left: var(--spacing-xs);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .status-bar {
    gap: 4px;
    padding: 4px var(--spacing-xs);
  }

  .time-display {
    font-size: 10px;
  }
}
</style>
