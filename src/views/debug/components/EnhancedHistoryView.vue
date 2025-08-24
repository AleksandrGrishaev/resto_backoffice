<!-- src/views/debug/components/EnhancedHistoryView.vue -->
<template>
  <div class="enhanced-history-view fill-height d-flex flex-column">
    <!-- History Header -->
    <div class="history-header pa-3 border-b">
      <div class="d-flex align-center justify-space-between mb-3">
        <h4 class="text-subtitle-1">Enhanced Store History</h4>
        <div class="d-flex gap-2">
          <!-- View Mode Toggle -->
          <v-btn-toggle v-model="viewMode" variant="outlined" size="small" mandatory>
            <v-btn value="timeline" icon="mdi-timeline">
              <v-icon>mdi-timeline</v-icon>
              <v-tooltip activator="parent">Timeline View</v-tooltip>
            </v-btn>
            <v-btn value="list" icon="mdi-format-list-bulleted">
              <v-icon>mdi-format-list-bulleted</v-icon>
              <v-tooltip activator="parent">List View</v-tooltip>
            </v-btn>
            <v-btn value="detailed" icon="mdi-details">
              <v-icon>mdi-details</v-icon>
              <v-tooltip activator="parent">Detailed View</v-tooltip>
            </v-btn>
          </v-btn-toggle>

          <!-- Clear History -->
          <v-btn
            v-if="historyEntries.length > 0"
            prepend-icon="mdi-delete"
            variant="tonal"
            size="small"
            color="warning"
            @click="$emit('clear-history')"
          >
            Clear
          </v-btn>
        </div>
      </div>

      <!-- Filters -->
      <div class="d-flex flex-wrap gap-2 mb-2">
        <v-chip
          v-for="filter in availableFilters"
          :key="filter.key"
          :color="selectedFilters.includes(filter.key) ? 'primary' : 'default'"
          :variant="selectedFilters.includes(filter.key) ? 'flat' : 'outlined'"
          size="small"
          @click="toggleFilter(filter.key)"
        >
          <v-icon start>{{ filter.icon }}</v-icon>
          {{ filter.label }}
          <v-chip v-if="filter.count > 0" size="x-small" class="ms-1">
            {{ filter.count }}
          </v-chip>
        </v-chip>
      </div>

      <!-- Summary Stats -->
      <v-card variant="tonal" color="info" class="pa-3">
        <div class="d-flex justify-space-between align-center">
          <div class="text-body-2">
            <strong>{{ filteredEntries.length }}</strong>
            entries
            <span v-if="filteredEntries.length !== historyEntries.length">
              ({{ historyEntries.length }} total)
            </span>
          </div>
          <div class="text-body-2">
            Recent activity:
            <strong>{{ recentActivityCount }}</strong>
            in last hour
          </div>
        </div>
      </v-card>
    </div>

    <!-- History Content -->
    <div class="history-content flex-grow-1 overflow-auto pa-3">
      <!-- Empty State -->
      <div v-if="filteredEntries.length === 0" class="text-center py-8">
        <v-icon
          :icon="historyEntries.length === 0 ? 'mdi-history' : 'mdi-filter-off'"
          size="48"
          class="mb-3 text-medium-emphasis"
        />
        <h4 class="text-h6 mb-2">
          {{ historyEntries.length === 0 ? 'No History' : 'No Matching Entries' }}
        </h4>
        <p class="text-body-2 text-medium-emphasis">
          {{
            historyEntries.length === 0
              ? 'Store changes will appear here'
              : 'Try adjusting your filters'
          }}
        </p>
      </div>

      <!-- Timeline View -->
      <div v-else-if="viewMode === 'timeline'" class="history-timeline">
        <v-timeline side="end" density="compact">
          <v-timeline-item
            v-for="entry in filteredEntries"
            :key="entry.id"
            size="small"
            :dot-color="getChangeTypeColor(entry.changeType)"
            :icon="getActionIcon(entry.action)"
          >
            <enhanced-history-entry-component
              :entry="entry"
              :view-mode="'timeline'"
              @view-details="handleViewDetails"
              @copy-changes="handleCopyChanges"
            />
          </v-timeline-item>
        </v-timeline>
      </div>

      <!-- List View -->
      <div v-else-if="viewMode === 'list'" class="history-list">
        <enhanced-history-entry-component
          v-for="entry in filteredEntries"
          :key="entry.id"
          :entry="entry"
          :view-mode="'list'"
          class="mb-3"
          @view-details="handleViewDetails"
          @copy-changes="handleCopyChanges"
        />
      </div>

      <!-- Detailed View -->
      <div v-else class="history-detailed">
        <enhanced-history-entry-component
          v-for="entry in filteredEntries"
          :key="entry.id"
          :entry="entry"
          :view-mode="'detailed'"
          class="mb-4"
          @view-details="handleViewDetails"
          @copy-changes="handleCopyChanges"
        />
      </div>
    </div>

    <!-- Entry Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="900" scrollable>
      <v-card v-if="selectedEntry">
        <v-card-title class="d-flex align-center">
          <v-icon :icon="getActionIcon(selectedEntry.action)" class="me-2" />
          {{ selectedEntry.action }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="showDetailsDialog = false" />
        </v-card-title>

        <v-card-text>
          <history-entry-details :entry="selectedEntry" />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDetailsDialog = false">Close</v-btn>
          <v-btn color="primary" @click="copyEntryDetails">Copy Details</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import type { EnhancedHistoryEntry } from '@/stores/debug/composables/useEnhancedHistory'
import EnhancedHistoryEntryComponent from './EnhancedHistoryEntry.vue'
import HistoryEntryDetails from './HistoryEntryDetails.vue'

const MODULE_NAME = 'EnhancedHistoryView'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  historyEntries: EnhancedHistoryEntry[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'clear-history': []
  'copy-content': [content: string]
}>()

// =============================================
// STATE
// =============================================

const viewMode = ref<'timeline' | 'list' | 'detailed'>('timeline')
const selectedFilters = ref<string[]>([])
const showDetailsDialog = ref(false)
const selectedEntry = ref<EnhancedHistoryEntry | null>(null)

// =============================================
// COMPUTED
// =============================================

const availableFilters = computed(() => {
  const entries = props.historyEntries

  return [
    {
      key: 'state',
      label: 'State Changes',
      icon: 'mdi-state-machine',
      count: entries.filter(e => e.changeType === 'state').length
    },
    {
      key: 'data',
      label: 'Data Changes',
      icon: 'mdi-database',
      count: entries.filter(e => e.changeType === 'data').length
    },
    {
      key: 'error',
      label: 'Errors',
      icon: 'mdi-alert-circle',
      count: entries.filter(e => e.changeType === 'error').length
    },
    {
      key: 'significant',
      label: 'Significant',
      icon: 'mdi-star',
      count: entries.filter(e => e.summary?.significantChanges > 0 || e.changes.length > 3).length
    },
    {
      key: 'recent',
      label: 'Recent (1h)',
      icon: 'mdi-clock',
      count: entries.filter(e => isRecent(e.timestamp)).length
    }
  ].filter(f => f.count > 0)
})

const filteredEntries = computed(() => {
  let entries = [...props.historyEntries]

  // Apply filters
  if (selectedFilters.value.length > 0) {
    entries = entries.filter(entry => {
      return selectedFilters.value.some(filter => {
        switch (filter) {
          case 'state':
            return entry.changeType === 'state'
          case 'data':
            return entry.changeType === 'data'
          case 'error':
            return entry.changeType === 'error'
          case 'significant':
            return entry.summary.significantChanges > 0
          case 'recent':
            return isRecent(entry.timestamp)
          default:
            return false
        }
      })
    })
  }

  // Sort by timestamp (newest first)
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

const recentActivityCount = computed(() => {
  return props.historyEntries.filter(e => isRecent(e.timestamp)).length
})

// =============================================
// METHODS
// =============================================

function isRecent(timestamp: string): boolean {
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  return new Date(timestamp).getTime() > oneHourAgo
}

function toggleFilter(filterKey: string) {
  const index = selectedFilters.value.indexOf(filterKey)
  if (index > -1) {
    selectedFilters.value.splice(index, 1)
  } else {
    selectedFilters.value.push(filterKey)
  }

  DebugUtils.debug(MODULE_NAME, 'Filter toggled', {
    filter: filterKey,
    activeFilters: selectedFilters.value
  })
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

function getActionIcon(action: string): string {
  if (action.includes('fetch') || action.includes('load')) return 'mdi-download'
  if (action.includes('create')) return 'mdi-plus'
  if (action.includes('update')) return 'mdi-pencil'
  if (action.includes('delete')) return 'mdi-delete'
  if (action.includes('state_change')) return 'mdi-swap-horizontal'
  if (action.includes('error')) return 'mdi-alert-circle'
  if (action.includes('refresh')) return 'mdi-refresh'
  return 'mdi-cog'
}

function handleViewDetails(entry: EnhancedHistoryEntry) {
  selectedEntry.value = entry
  showDetailsDialog.value = true

  DebugUtils.debug(MODULE_NAME, 'Viewing entry details', {
    entryId: entry.id,
    action: entry.action
  })
}

function handleCopyChanges(content: string) {
  emit('copy-content', content)

  DebugUtils.info(MODULE_NAME, 'Changes copied to clipboard', {
    size: content.length
  })
}

async function copyEntryDetails() {
  if (!selectedEntry.value) return

  try {
    const details = JSON.stringify(
      {
        id: selectedEntry.value.id,
        timestamp: selectedEntry.value.timestamp,
        action: selectedEntry.value.action,
        changeType: selectedEntry.value.changeType,
        summary: selectedEntry.value.summary,
        changes: selectedEntry.value.changes,
        diff: selectedEntry.value.diff,
        snapshot: selectedEntry.value.snapshot
      },
      null,
      2
    )

    await navigator.clipboard.writeText(details)
    emit('copy-content', details)

    DebugUtils.info(MODULE_NAME, 'Entry details copied to clipboard', {
      entryId: selectedEntry.value.id,
      size: details.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to copy entry details', { error })
  }
}
</script>

<style lang="scss" scoped>
.enhanced-history-view {
  background: rgb(var(--v-theme-background));
}

.history-header {
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.history-content {
  background: rgb(var(--v-theme-background));
}

.history-timeline {
  .v-timeline {
    padding-top: 0;
  }
}

.history-list,
.history-detailed {
  .enhanced-history-entry-component {
    border-radius: 8px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    background: rgb(var(--v-theme-surface));
  }
}

// Border utilities
.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
