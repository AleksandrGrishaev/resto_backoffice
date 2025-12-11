<!-- src/views/kitchen/preparation/components/SyncStatusIndicator.vue -->
<!-- Sprint 7: Sync Status Indicator Component -->
<template>
  <div class="sync-status-indicator">
    <!-- Compact Mode (default) -->
    <v-tooltip v-if="!expanded" location="bottom" :text="statusMessage">
      <template #activator="{ props }">
        <v-chip
          v-bind="props"
          :color="statusColor"
          :variant="hasPendingSync || hasFailedSync ? 'flat' : 'tonal'"
          size="small"
          class="sync-chip"
          @click="handleChipClick"
        >
          <v-icon start size="small" :class="{ 'sync-rotating': isSyncing }">
            {{ statusIcon }}
          </v-icon>
          <span v-if="hasPendingSync || hasFailedSync">
            {{ pendingCount + failedCount }}
          </span>
        </v-chip>
      </template>
    </v-tooltip>

    <!-- Expanded Mode (shows detailed info) -->
    <v-card v-else class="sync-status-card" variant="outlined" density="compact">
      <v-card-text class="pa-2">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center">
            <v-icon
              :color="statusColor"
              size="small"
              :class="{ 'sync-rotating': isSyncing }"
              class="mr-2"
            >
              {{ statusIcon }}
            </v-icon>
            <span class="text-body-2 font-weight-medium">{{ statusTitle }}</span>
          </div>
          <v-btn icon size="x-small" variant="text" @click="expanded = false">
            <v-icon size="small">mdi-close</v-icon>
          </v-btn>
        </div>

        <!-- Status Details -->
        <div class="sync-details text-body-2">
          <!-- Online/Offline Status -->
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-medium-emphasis">Connection:</span>
            <span :class="isOnline ? 'text-success' : 'text-warning'">
              {{ isOnline ? 'Online' : 'Offline' }}
            </span>
          </div>

          <!-- Pending Items -->
          <div v-if="pendingCount > 0" class="d-flex align-center justify-space-between mb-1">
            <span class="text-medium-emphasis">Pending:</span>
            <span class="text-warning">{{ pendingCount }} items</span>
          </div>

          <!-- Failed Items -->
          <div v-if="failedCount > 0" class="d-flex align-center justify-space-between mb-1">
            <span class="text-medium-emphasis">Failed:</span>
            <span class="text-error">{{ failedCount }} items</span>
          </div>

          <!-- Last Sync -->
          <div v-if="timeSinceLastSync" class="d-flex align-center justify-space-between mb-1">
            <span class="text-medium-emphasis">Last sync:</span>
            <span>{{ timeSinceLastSync }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="sync-actions d-flex gap-2 mt-2">
          <v-btn
            v-if="hasPendingSync"
            size="small"
            variant="tonal"
            color="primary"
            :loading="isSyncing"
            :disabled="!isOnline"
            @click="handleSync"
          >
            <v-icon start size="small">mdi-sync</v-icon>
            Sync Now
          </v-btn>

          <v-btn
            v-if="hasFailedSync"
            size="small"
            variant="tonal"
            color="warning"
            :loading="isSyncing"
            :disabled="!isOnline"
            @click="handleRetry"
          >
            <v-icon start size="small">mdi-refresh</v-icon>
            Retry Failed
          </v-btn>
        </div>

        <!-- Last Sync Report -->
        <div v-if="lastSyncReport" class="sync-report mt-2 pa-2 bg-grey-lighten-4 rounded">
          <div class="text-caption text-medium-emphasis">Last Sync Result:</div>
          <div class="text-caption">
            <span v-if="lastSyncReport.succeeded > 0" class="text-success mr-2">
              {{ lastSyncReport.succeeded }} synced
            </span>
            <span v-if="lastSyncReport.failed > 0" class="text-error mr-2">
              {{ lastSyncReport.failed }} failed
            </span>
            <span v-if="lastSyncReport.skipped > 0" class="text-medium-emphasis">
              {{ lastSyncReport.skipped }} skipped
            </span>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSyncStatus } from '@/stores/kitchenKpi/composables/useSyncStatus'

const {
  isOnline,
  isSyncing,
  pendingCount,
  failedCount,
  hasPendingSync,
  hasFailedSync,
  syncHealth,
  statusMessage,
  statusIcon,
  statusColor,
  timeSinceLastSync,
  lastSyncReport,
  triggerSync,
  retryFailed
} = useSyncStatus()

const expanded = ref(false)

const statusTitle = computed(() => {
  if (isSyncing.value) return 'Syncing...'
  if (!isOnline.value) return 'Offline Mode'
  if (hasFailedSync.value) return 'Sync Error'
  if (hasPendingSync.value) return 'Pending Sync'
  return 'Synced'
})

function handleChipClick(): void {
  if (hasPendingSync.value || hasFailedSync.value || !isOnline.value) {
    expanded.value = true
  }
}

async function handleSync(): Promise<void> {
  await triggerSync()
}

async function handleRetry(): Promise<void> {
  await retryFailed()
}
</script>

<style scoped lang="scss">
.sync-status-indicator {
  position: relative;
}

.sync-chip {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
}

.sync-rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.sync-status-card {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  min-width: 280px;
  margin-top: 4px;
}

.sync-details {
  font-size: 0.875rem;
}

.sync-actions {
  flex-wrap: wrap;
}

.sync-report {
  font-size: 0.75rem;
}
</style>
