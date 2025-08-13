<!-- src/views/debug/components/HistoryEntryDetails.vue -->
<template>
  <div class="history-entry-details">
    <!-- Basic Info -->
    <v-card class="mb-4" variant="tonal">
      <v-card-title>Entry Information</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="6">
            <div class="text-caption">Action</div>
            <div class="text-body-2 font-weight-medium">{{ entry.action }}</div>
          </v-col>
          <v-col cols="6">
            <div class="text-caption">Change Type</div>
            <v-chip size="small" :color="getChangeTypeColor(entry.changeType)">
              {{ entry.changeType }}
            </v-chip>
          </v-col>
          <v-col cols="6">
            <div class="text-caption">Timestamp</div>
            <div class="text-body-2">{{ formatTimestamp(entry.timestamp) }}</div>
          </v-col>
          <v-col cols="6">
            <div class="text-caption">Total Changes</div>
            <div class="text-body-2 font-weight-medium">
              {{ entry.summary?.totalChanges || entry.changes.length }}
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Changes List -->
    <v-card v-if="entry.changes.length > 0">
      <v-card-title>Changes ({{ entry.changes.length }})</v-card-title>
      <v-card-text>
        <div class="changes-list">
          <div
            v-for="(change, index) in entry.changes"
            :key="index"
            class="change-item pa-3 mb-2 border rounded"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="font-weight-medium">{{ change.path }}</span>
              <v-chip size="small" :color="getChangeColor(change.type)">
                {{ change.type }}
              </v-chip>
            </div>

            <div class="change-values">
              <div v-if="change.type === 'modified'" class="d-flex gap-4">
                <div class="flex-1">
                  <div class="text-caption text-error">Old:</div>
                  <pre class="value-display">{{ formatValue(change.oldValue) }}</pre>
                </div>
                <div class="flex-1">
                  <div class="text-caption text-success">New:</div>
                  <pre class="value-display">{{ formatValue(change.newValue) }}</pre>
                </div>
              </div>
              <div v-else-if="change.type === 'added'">
                <div class="text-caption text-success">Added:</div>
                <pre class="value-display">{{ formatValue(change.newValue) }}</pre>
              </div>
              <div v-else-if="change.type === 'deleted'">
                <div class="text-caption text-error">Deleted:</div>
                <pre class="value-display">{{ formatValue(change.oldValue) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Snapshot -->
    <v-card v-if="entry.snapshot" class="mt-4">
      <v-card-title>Snapshot</v-card-title>
      <v-card-text>
        <pre class="snapshot-display">{{ JSON.stringify(entry.snapshot, null, 2) }}</pre>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { EnhancedHistoryEntry } from '@/stores/debug/composables/useEnhancedHistory'

interface Props {
  entry: EnhancedHistoryEntry
}

defineProps<Props>()

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}

function getChangeTypeColor(changeType: string): string {
  switch (changeType) {
    case 'state':
      return 'info'
    case 'data':
      return 'primary'
    case 'error':
      return 'error'
    default:
      return 'default'
  }
}

function getChangeColor(changeType: string): string {
  switch (changeType) {
    case 'added':
      return 'success'
    case 'modified':
      return 'warning'
    case 'deleted':
      return 'error'
    default:
      return 'info'
  }
}

function formatValue(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}
</script>

<style lang="scss" scoped>
.history-entry-details {
  .change-item {
    background: rgba(var(--v-theme-surface), 0.5);
  }

  .value-display {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    background: rgba(var(--v-theme-surface), 0.3);
    padding: 8px;
    border-radius: 4px;
    margin: 4px 0;
    max-height: 100px;
    overflow-y: auto;
  }

  .snapshot-display {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    background: rgba(var(--v-theme-surface), 0.3);
    padding: 12px;
    border-radius: 4px;
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>
