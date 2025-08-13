<!-- src/views/debug/components/EnhancedHistoryEntry.vue -->
<template>
  <div class="enhanced-history-entry" :class="[`view-${viewMode}`, `type-${entry.changeType}`]">
    <!-- Entry Header -->
    <div class="entry-header d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <!-- Action Info -->
        <div class="action-info">
          <h5 class="text-subtitle-2 mb-1">{{ formatActionName(entry.action) }}</h5>
          <div class="text-caption text-medium-emphasis">
            {{ formatTimestamp(entry.timestamp) }} • {{ getTimeAgo(entry.timestamp) }}
          </div>
        </div>

        <!-- Change Type Badge -->
        <v-chip
          :color="getChangeTypeColor(entry.changeType)"
          size="small"
          variant="tonal"
          class="ms-3"
        >
          {{ entry.changeType }}
        </v-chip>
      </div>

      <!-- Entry Actions -->
      <div class="entry-actions d-flex align-center gap-1">
        <v-btn
          v-if="viewMode !== 'detailed'"
          icon="mdi-eye"
          size="small"
          variant="text"
          @click="$emit('view-details', entry)"
        >
          <v-icon size="16">mdi-eye</v-icon>
          <v-tooltip activator="parent">View Details</v-tooltip>
        </v-btn>

        <v-btn icon="mdi-content-copy" size="small" variant="text" @click="copyChanges">
          <v-icon size="16">mdi-content-copy</v-icon>
          <v-tooltip activator="parent">Copy Changes</v-tooltip>
        </v-btn>
      </div>
    </div>

    <!-- Summary -->
    <div class="entry-summary mt-2">
      <div class="d-flex align-center gap-2 mb-2">
        <!-- Change Stats -->
        <v-chip size="small" variant="outlined" color="info">
          {{ entry.summary.totalChanges }} changes
        </v-chip>

        <v-chip
          v-if="entry.summary.significantChanges > 0"
          size="small"
          variant="outlined"
          color="warning"
        >
          {{ entry.summary.significantChanges }} significant
        </v-chip>

        <!-- Data Size -->
        <v-chip size="small" variant="outlined">
          {{ formatDataSize(entry.summary.dataSize) }}
        </v-chip>
      </div>

      <!-- Affected Areas -->
      <div v-if="entry.summary.affectedKeys.length > 0" class="text-body-2 mb-2">
        <strong>Affected:</strong>
        <span class="affected-keys">
          {{ entry.summary.affectedKeys.slice(0, 3).join(', ') }}
          <span v-if="entry.summary.affectedKeys.length > 3">
            and {{ entry.summary.affectedKeys.length - 3 }} more
          </span>
        </span>
      </div>
    </div>

    <!-- Changes Preview -->
    <div v-if="viewMode !== 'timeline'" class="changes-preview mt-3">
      <!-- Diff Summary -->
      <div v-if="entry.diff" class="diff-summary mb-2">
        <div class="d-flex gap-2 flex-wrap">
          <v-chip v-if="entry.diff.added.length > 0" size="small" color="success" variant="tonal">
            +{{ entry.diff.added.length }} added
          </v-chip>
          <v-chip
            v-if="entry.diff.modified.length > 0"
            size="small"
            color="warning"
            variant="tonal"
          >
            ~{{ entry.diff.modified.length }} modified
          </v-chip>
          <v-chip v-if="entry.diff.deleted.length > 0" size="small" color="error" variant="tonal">
            -{{ entry.diff.deleted.length }} deleted
          </v-chip>
        </div>
      </div>

      <!-- Important Changes -->
      <div v-if="importantChanges.length > 0" class="important-changes">
        <h6 class="text-subtitle-2 mb-2">Key Changes:</h6>
        <div class="changes-list">
          <div
            v-for="change in importantChanges.slice(0, maxPreviewChanges)"
            :key="change.path"
            class="change-item d-flex align-center pa-2 rounded mb-1"
            :class="getChangeClass(change.type)"
          >
            <v-icon
              :icon="getChangeIcon(change.type)"
              :color="getChangeColor(change.type)"
              size="16"
              class="me-2"
            />
            <div class="flex-grow-1">
              <div class="change-path text-body-2">{{ change.path }}</div>
              <div class="change-details text-caption text-medium-emphasis">
                {{ formatChangeDetails(change) }}
              </div>
            </div>
            <v-chip size="x-small" variant="tonal">
              {{ change.type }}
            </v-chip>
          </div>

          <!-- Show More Button -->
          <v-btn
            v-if="importantChanges.length > maxPreviewChanges"
            variant="text"
            size="small"
            @click="$emit('view-details', entry)"
          >
            Show {{ importantChanges.length - maxPreviewChanges }} more changes
          </v-btn>
        </div>
      </div>

      <!-- Detailed View Only: All Changes -->
      <div v-if="viewMode === 'detailed' && entry.changes.length > 0" class="all-changes mt-3">
        <v-expansion-panels variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title>
              All Changes ({{ entry.changes.length }})
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="detailed-changes">
                <div
                  v-for="change in entry.changes"
                  :key="change.path"
                  class="detailed-change-item pa-2 mb-2 rounded border"
                >
                  <div class="d-flex align-center justify-space-between mb-1">
                    <span class="font-weight-medium">{{ change.path }}</span>
                    <v-chip size="x-small" :color="getChangeColor(change.type)" variant="tonal">
                      {{ change.type }}
                    </v-chip>
                  </div>

                  <div class="change-context text-caption mb-2">
                    Context: {{ change.context }} • Depth: {{ change.depth }}
                  </div>

                  <!-- Value Snapshots -->
                  <div v-if="change.type === 'modified'" class="value-comparison">
                    <div class="d-flex gap-4">
                      <div class="flex-1">
                        <div class="text-caption text-error">Previous:</div>
                        <pre class="value-snapshot">{{
                          formatSnapshot(change.previousSnapshot)
                        }}</pre>
                      </div>
                      <div class="flex-1">
                        <div class="text-caption text-success">Current:</div>
                        <pre class="value-snapshot">{{
                          formatSnapshot(change.currentSnapshot)
                        }}</pre>
                      </div>
                    </div>
                  </div>

                  <div v-else-if="change.type === 'added'" class="value-addition">
                    <div class="text-caption text-success">Added Value:</div>
                    <pre class="value-snapshot">{{ formatSnapshot(change.currentSnapshot) }}</pre>
                  </div>

                  <div v-else-if="change.type === 'deleted'" class="value-deletion">
                    <div class="text-caption text-error">Deleted Value:</div>
                    <pre class="value-snapshot">{{ formatSnapshot(change.previousSnapshot) }}</pre>
                  </div>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DebugUtils } from '@/utils'
import type {
  EnhancedHistoryEntry,
  DetailedChange
} from '@/stores/debug/composables/useEnhancedHistory'

const MODULE_NAME = 'EnhancedHistoryEntry'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  entry: EnhancedHistoryEntry
  viewMode: 'timeline' | 'list' | 'detailed'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'view-details': [entry: EnhancedHistoryEntry]
  'copy-changes': [content: string]
}>()

// =============================================
// COMPUTED
// =============================================

const maxPreviewChanges = computed(() => {
  switch (props.viewMode) {
    case 'timeline':
      return 2
    case 'list':
      return 5
    case 'detailed':
      return 10
    default:
      return 3
  }
})

const importantChanges = computed(() => {
  return props.entry.changes
    .filter(change => change.depth <= 2 && change.changeSize > 10)
    .sort((a, b) => b.changeSize - a.changeSize)
})

// =============================================
// METHODS
// =============================================

function formatActionName(action: string): string {
  return action
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}

function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
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

function getChangeIcon(changeType: string): string {
  switch (changeType) {
    case 'added':
      return 'mdi-plus'
    case 'modified':
      return 'mdi-pencil'
    case 'deleted':
      return 'mdi-minus'
    default:
      return 'mdi-swap-horizontal'
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

function getChangeClass(changeType: string): string {
  return `change-${changeType}`
}

function formatChangeDetails(change: DetailedChange): string {
  if (change.type === 'added') {
    return `Added new value`
  } else if (change.type === 'deleted') {
    return `Deleted value`
  } else if (change.type === 'modified') {
    const oldPreview = formatValuePreview(change.oldValue)
    const newPreview = formatValuePreview(change.newValue)
    return `${oldPreview} → ${newPreview}`
  }
  return ''
}

function formatValuePreview(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') {
    return value.length > 20 ? `"${value.substring(0, 17)}..."` : `"${value}"`
  }
  if (typeof value === 'object') {
    return Array.isArray(value) ? `[${value.length} items]` : `{${Object.keys(value).length} keys}`
  }
  return String(value)
}

function formatSnapshot(snapshot: any): string {
  if (!snapshot) return ''

  try {
    if (typeof snapshot === 'object' && snapshot.type) {
      // Formatted snapshot from our enhanced tracking
      switch (snapshot.type) {
        case 'array':
          return `Array(${snapshot.length}) ${snapshot.hasMore ? '[preview]' : ''}\n${JSON.stringify(snapshot.preview, null, 2)}`
        case 'object':
          return `Object {${snapshot.keys.join(', ')}} ${snapshot.hasMore ? '[preview]' : ''}\n${JSON.stringify(snapshot.preview, null, 2)}`
        case 'string':
          return `String(${snapshot.length}): "${snapshot.preview}"`
        default:
          return JSON.stringify(snapshot, null, 2)
      }
    }

    return JSON.stringify(snapshot, null, 2)
  } catch {
    return String(snapshot)
  }
}

function formatDataSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

async function copyChanges() {
  try {
    const content = JSON.stringify(
      {
        action: props.entry.action,
        timestamp: props.entry.timestamp,
        summary: props.entry.summary,
        changes: props.entry.changes,
        diff: props.entry.diff
      },
      null,
      2
    )

    await navigator.clipboard.writeText(content)
    emit('copy-changes', content)

    DebugUtils.info(MODULE_NAME, 'Changes copied to clipboard', {
      entryId: props.entry.id,
      size: content.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to copy changes', { error })
  }
}
</script>

<style lang="scss" scoped>
.enhanced-history-entry {
  padding: 12px;
  border-radius: 8px;
  transition: all 0.2s;

  &.view-timeline {
    background: rgba(var(--v-theme-surface), 0.8);
    padding: 8px 12px;
  }

  &.view-list {
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  &.view-detailed {
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  &.type-error {
    border-left: 4px solid rgb(var(--v-theme-error));
  }

  &.type-state {
    border-left: 4px solid rgb(var(--v-theme-info));
  }

  &.type-data {
    border-left: 4px solid rgb(var(--v-theme-primary));
  }

  .entry-header {
    .action-info {
      h5 {
        margin: 0;
      }
    }
  }

  .affected-keys {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.875em;
  }

  .changes-list {
    .change-item {
      background: rgba(var(--v-theme-surface), 0.5);
      border: 1px solid rgba(var(--v-border-color), 0.3);

      &.change-added {
        border-left: 3px solid rgb(var(--v-theme-success));
      }

      &.change-modified {
        border-left: 3px solid rgb(var(--v-theme-warning));
      }

      &.change-deleted {
        border-left: 3px solid rgb(var(--v-theme-error));
      }

      .change-path {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-weight: 500;
      }
    }
  }

  .detailed-change-item {
    background: rgba(var(--v-theme-surface), 0.3);
    border: 1px solid rgba(var(--v-border-color), 0.3);

    .change-context {
      opacity: 0.7;
    }

    .value-snapshot {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 11px;
      background: rgba(var(--v-theme-surface), 0.5);
      padding: 8px;
      border-radius: 4px;
      margin: 4px 0;
      max-height: 120px;
      overflow-y: auto;
    }

    .value-comparison {
      .flex-1 {
        min-width: 0;
      }
    }
  }
}
</style>
