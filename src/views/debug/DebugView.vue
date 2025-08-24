<!-- src/views/debug/DebugView.vue -->
<template>
  <div class="debug-view">
    <!-- Header -->
    <v-app-bar flat color="surface" class="debug-header">
      <v-toolbar-title class="d-flex align-center">
        <v-icon class="me-2">mdi-bug</v-icon>
        Debug Stores
        <v-chip v-if="!isLoading" class="ms-3" size="small" color="primary" variant="tonal">
          {{ globalSummary.loadedStores }}/{{ globalSummary.totalStores }} stores
        </v-chip>
      </v-toolbar-title>

      <v-spacer />

      <!-- Global Actions -->
      <v-btn :loading="isLoading" icon="mdi-refresh" variant="text" @click="refreshAllStores">
        <v-icon>mdi-refresh</v-icon>
        <v-tooltip activator="parent">Refresh All Stores</v-tooltip>
      </v-btn>

      <v-btn
        v-if="selectedStoreData"
        icon="mdi-content-copy"
        variant="text"
        @click="copyFullDataWithFeedback"
      >
        <v-icon>mdi-content-copy</v-icon>
        <v-tooltip activator="parent">Copy Full Data</v-tooltip>
      </v-btn>
    </v-app-bar>

    <!-- Main Content -->
    <div class="debug-content d-flex fill-height">
      <!-- Stores List Sidebar -->
      <v-navigation-drawer permanent width="320" class="debug-sidebar" border="opacity-12">
        <div class="pa-4">
          <h3 class="text-h6 mb-3">Available Stores</h3>

          <!-- Global Summary -->
          <v-card variant="tonal" class="mb-4" color="primary">
            <v-card-text class="py-3">
              <div class="text-body-2">
                <div class="d-flex justify-space-between mb-1">
                  <span>Total Records:</span>
                  <span class="font-weight-medium">
                    {{ formatNumber(globalSummary.totalRecords) }}
                  </span>
                </div>
                <div class="d-flex justify-space-between mb-1">
                  <span>History Entries:</span>
                  <span class="font-weight-medium">
                    {{ formatNumber(globalSummary.historyEntries) }}
                  </span>
                </div>
                <div class="d-flex justify-space-between">
                  <span>Recent Activity:</span>
                  <span class="font-weight-medium">{{ globalSummary.recentActivity }}</span>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- Stores List -->
          <v-list density="compact" class="debug-stores-list">
            <v-list-item
              v-for="store in availableStores"
              :key="store.id"
              :active="selectedStoreId === store.id"
              :loading="isLoading && selectedStoreId === store.id"
              class="mb-1"
              @click="selectStore(store.id)"
            >
              <template #prepend>
                <v-icon :icon="store.icon" />
              </template>

              <v-list-item-title>{{ store.displayName }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ store.description }}
              </v-list-item-subtitle>

              <template #append>
                <div class="text-end">
                  <v-chip v-if="store.isLoaded" size="x-small" color="success" variant="tonal">
                    {{ formatNumber(store.recordCount) }}
                  </v-chip>
                  <v-chip v-else size="x-small" color="surface" variant="tonal">Not loaded</v-chip>
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ store.size }}
                  </div>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-navigation-drawer>

      <!-- Main Content Area -->
      <div class="debug-main flex-grow-1 d-flex flex-column">
        <!-- Store Header -->
        <div v-if="selectedStore" class="debug-store-header pa-4 border-b">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon :icon="selectedStore.icon" size="large" class="me-3" />
              <div>
                <h2 class="text-h5">{{ selectedStore.displayName }}</h2>
                <p class="text-body-2 text-medium-emphasis ma-0">
                  {{ selectedStore.description }}
                </p>
              </div>
            </div>

            <div class="d-flex align-center gap-2">
              <!-- Store Summary -->
              <v-chip
                v-if="storeSummary"
                :color="getHealthColor(storeSummary.healthStatus)"
                variant="tonal"
                size="small"
              >
                {{ storeSummary.totalItems }} items
              </v-chip>

              <!-- Last Updated -->
              <v-chip v-if="storeSummary" color="surface" variant="tonal" size="small">
                {{ formatTimestamp(storeSummary.lastUpdated) }}
              </v-chip>

              <!-- Refresh Button -->
              <v-btn
                :loading="isLoading"
                icon="mdi-refresh"
                variant="text"
                size="small"
                @click="refreshCurrentStore"
              >
                <v-icon>mdi-refresh</v-icon>
                <v-tooltip activator="parent">Refresh Store</v-tooltip>
              </v-btn>
            </div>
          </div>
        </div>

        <!-- No Store Selected -->
        <div v-else class="d-flex align-center justify-center fill-height">
          <div class="text-center">
            <v-icon icon="mdi-database-search" size="64" class="mb-4 text-medium-emphasis" />
            <h3 class="text-h6 mb-2">Select a Store</h3>
            <p class="text-body-2 text-medium-emphasis">
              Choose a store from the sidebar to view debug information
            </p>
          </div>
        </div>

        <!-- Store Content -->
        <div v-if="selectedStore && selectedStoreData" class="flex-grow-1 d-flex flex-column">
          <!-- Tabs -->
          <v-tabs
            v-model="selectedTab"
            align-tabs="start"
            class="debug-tabs border-b"
            color="primary"
            @update:model-value="selectTab"
          >
            <v-tab value="raw">
              <v-icon start>mdi-code-json</v-icon>
              Raw JSON
            </v-tab>
            <v-tab value="structured">
              <v-icon start>mdi-format-list-bulleted</v-icon>
              Structured
            </v-tab>
            <v-tab value="history">
              <v-icon start>mdi-history</v-icon>
              History
              <v-chip
                v-if="selectedStoreHistory.length > 0"
                size="x-small"
                color="primary"
                variant="tonal"
                class="ms-2"
              >
                {{ selectedStoreHistory.length }}
              </v-chip>
            </v-tab>
          </v-tabs>

          <!-- Tab Content -->
          <div class="flex-grow-1 overflow-hidden">
            <v-window v-model="selectedTab" class="fill-height">
              <!-- Raw JSON Tab with Navigator -->
              <v-window-item value="raw" class="fill-height">
                <json-navigator
                  :data="selectedStoreData.state"
                  @navigate="handleJsonNavigate"
                  @copy="handleCopyContent"
                />
              </v-window-item>

              <!-- Structured Tab -->
              <v-window-item value="structured" class="fill-height">
                <div class="debug-tab-content fill-height d-flex flex-column">
                  <!-- Structured Header -->
                  <div
                    class="debug-tab-header pa-3 border-b d-flex align-center justify-space-between"
                  >
                    <h4 class="text-subtitle-1">Structured Analysis</h4>
                    <v-btn
                      prepend-icon="mdi-content-copy"
                      variant="tonal"
                      size="small"
                      @click="copyStructuredDataWithFeedback"
                    >
                      Copy Analysis
                    </v-btn>
                  </div>

                  <!-- Structured Content -->
                  <div class="flex-grow-1 overflow-auto pa-3">
                    <div v-if="formattedStructuredData" class="debug-structured-content">
                      <!-- Overview -->
                      <v-card class="mb-4" variant="tonal">
                        <v-card-title class="d-flex align-center">
                          <v-icon start>mdi-information</v-icon>
                          Overview
                        </v-card-title>
                        <v-card-text>
                          <v-row>
                            <v-col cols="6" sm="3">
                              <div class="text-center">
                                <div class="text-h6 text-primary">
                                  {{ formatNumber(formattedStructuredData.overview.totalItems) }}
                                </div>
                                <div class="text-caption">Total Items</div>
                              </div>
                            </v-col>
                            <v-col cols="6" sm="3">
                              <div class="text-center">
                                <div class="text-h6 text-success">
                                  {{ formatNumber(formattedStructuredData.overview.activeItems) }}
                                </div>
                                <div class="text-caption">Active</div>
                              </div>
                            </v-col>
                            <v-col cols="6" sm="3">
                              <div class="text-center">
                                <div class="text-h6 text-warning">
                                  {{ formatNumber(formattedStructuredData.overview.inactiveItems) }}
                                </div>
                                <div class="text-caption">Inactive</div>
                              </div>
                            </v-col>
                            <v-col cols="6" sm="3">
                              <div class="text-center">
                                <v-chip
                                  :color="
                                    getHealthColor(formattedStructuredData.overview.health.status)
                                  "
                                  variant="tonal"
                                  size="small"
                                >
                                  {{ formattedStructuredData.overview.health.status }}
                                </v-chip>
                                <div class="text-caption mt-1">Health</div>
                              </div>
                            </v-col>
                          </v-row>
                        </v-card-text>
                      </v-card>

                      <!-- Health Issues -->
                      <v-card
                        v-if="
                          formattedStructuredData.health.issues.length > 0 ||
                          formattedStructuredData.health.warnings.length > 0
                        "
                        class="mb-4"
                        variant="tonal"
                        color="warning"
                      >
                        <v-card-title class="d-flex align-center">
                          <v-icon start>mdi-alert</v-icon>
                          Health Issues
                        </v-card-title>
                        <v-card-text>
                          <div v-if="formattedStructuredData.health.issues.length > 0" class="mb-3">
                            <h5 class="text-subtitle-2 text-error mb-2">Issues:</h5>
                            <v-chip
                              v-for="issue in formattedStructuredData.health.issues"
                              :key="issue"
                              size="small"
                              color="error"
                              variant="tonal"
                              class="me-2 mb-1"
                            >
                              {{ issue }}
                            </v-chip>
                          </div>
                          <div v-if="formattedStructuredData.health.warnings.length > 0">
                            <h5 class="text-subtitle-2 text-warning mb-2">Warnings:</h5>
                            <v-chip
                              v-for="warning in formattedStructuredData.health.warnings"
                              :key="warning"
                              size="small"
                              color="warning"
                              variant="tonal"
                              class="me-2 mb-1"
                            >
                              {{ warning }}
                            </v-chip>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Store-Specific Metrics -->
                      <v-card
                        v-if="
                          formattedStructuredData.specificMetrics &&
                          Object.keys(formattedStructuredData.specificMetrics).length > 0
                        "
                        class="mb-4"
                      >
                        <v-card-title class="d-flex align-center">
                          <v-icon start>mdi-chart-line</v-icon>
                          Store Metrics
                        </v-card-title>
                        <v-card-text>
                          <pre
                            class="debug-json-content"
                          ><code>{{ JSON.stringify(formattedStructuredData.specificMetrics, null, 2) }}</code></pre>
                        </v-card-text>
                      </v-card>

                      <!-- Actions -->
                      <v-card>
                        <v-card-title class="d-flex align-center">
                          <v-icon start>mdi-function</v-icon>
                          Available Actions ({{ formattedStructuredData.actions.length }})
                        </v-card-title>
                        <v-card-text>
                          <div class="d-flex flex-wrap gap-2">
                            <v-chip
                              v-for="action in formattedStructuredData.actions"
                              :key="action"
                              size="small"
                              variant="outlined"
                            >
                              {{ action }}()
                            </v-chip>
                          </div>
                        </v-card-text>
                      </v-card>
                    </div>
                  </div>
                </div>
              </v-window-item>

              <!-- Enhanced History Tab -->
              <v-window-item value="history" class="fill-height">
                <enhanced-history-view
                  :history-entries="formattedHistory"
                  @clear-history="clearCurrentStoreHistory"
                  @copy-content="handleCopyContent"
                />
              </v-window-item>
            </v-window>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <v-overlay v-model="isLoading" class="d-flex align-center justify-center" contained>
      <v-progress-circular indeterminate size="64" color="primary" />
    </v-overlay>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccessSnackbar" color="success" timeout="3000">
      {{ successMessage }}
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showErrorSnackbar" color="error" timeout="5000">
      {{ error }}
      <template #actions>
        <v-btn variant="text" @click="clearError">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDebugStores } from '@/stores/debug'
import { DebugUtils } from '@/utils'
import type { DebugTabId } from '@/stores/debug'
import EnhancedHistoryView from './components/EnhancedHistoryView.vue'

// Import new components
import JsonNavigator from './components/JsonNavigator.vue'

const MODULE_NAME = 'DebugView'

// =============================================
// SETUP
// =============================================

const {
  // State
  isLoading,
  error,
  selectedStoreId,
  selectedTab,

  // Data
  availableStores,
  selectedStore,
  selectedStoreData,
  selectedStoreHistory,

  // Formatted data
  formattedStructuredData,

  // Summaries
  storeSummary,
  globalSummary,

  // Actions
  initialize,
  selectStore,
  selectTab,
  refreshCurrentStore,
  refreshAllStores,

  // Copy operations
  copyStructuredData,
  copyFullData,

  // History
  clearCurrentStoreHistory,

  // Utilities
  getHealthColor,
  formatTimestamp,
  formatNumber,
  clearError
} = useDebugStores()

// =============================================
// LOCAL STATE
// =============================================

const showErrorSnackbar = ref(false)
const showSuccessSnackbar = ref(false)
const successMessage = ref('')

// =============================================
// METHODS
// =============================================

async function handleCopyOperation(operation: () => Promise<any>, message: string) {
  try {
    await operation()
    successMessage.value = message
    showSuccessSnackbar.value = true
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Copy operation failed', { error })
  }
}

async function copyStructuredDataWithFeedback() {
  await handleCopyOperation(copyStructuredData, 'Structured data copied to clipboard!')
}

async function copyFullDataWithFeedback() {
  await handleCopyOperation(copyFullData, 'Full store data copied to clipboard!')
}

function handleJsonNavigate(path: string[]) {
  DebugUtils.debug(MODULE_NAME, 'JSON navigation', { path })
  // TODO: Could implement breadcrumb or path tracking here
}

function handleCopyContent(content: string) {
  successMessage.value = 'Content copied to clipboard!'
  showSuccessSnackbar.value = true
  DebugUtils.info(MODULE_NAME, 'Content copied via component', {
    size: content.length
  })
}

// =============================================
// WATCHERS
// =============================================

watch(error, newError => {
  if (newError) {
    showErrorSnackbar.value = true
  }
})

watch(showErrorSnackbar, show => {
  if (!show) {
    clearError()
  }
})

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  try {
    DebugUtils.info(MODULE_NAME, 'Initializing DebugView with enhanced components')
    await initialize()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize debug view', { error })
  }
})
</script>

<style lang="scss" scoped>
.debug-view {
  height: 100vh;
  background: rgb(var(--v-theme-background));
}

.debug-header {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.debug-content {
  height: calc(100vh - 64px); // Subtract header height
}

.debug-sidebar {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.debug-stores-list {
  .v-list-item {
    border-radius: 8px;
    margin-bottom: 4px;

    &.v-list-item--active {
      background: rgba(var(--v-theme-primary), 0.12);
    }
  }
}

.debug-main {
  background: rgb(var(--v-theme-surface));
}

.debug-store-header {
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.debug-tabs {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.debug-tab-content {
  background: rgb(var(--v-theme-background));
}

.debug-tab-header {
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.debug-json-content {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: 4px;
  padding: 16px;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
}

.debug-structured-content {
  .v-card {
    margin-bottom: 16px;
  }
}

// Border utilities
.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
