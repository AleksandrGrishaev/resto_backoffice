```vue
<template>
  <div class="debug-page">
    <v-toolbar color="surface" class="px-2">
      <v-toolbar-title>Debug Stores</v-toolbar-title>
      <v-spacer />
      <v-btn
        v-tooltip="'Go to Cashier'"
        icon="mdi-cash-register"
        variant="text"
        class="mr-2"
        to="/pos"
      />
      <v-btn
        v-tooltip="'Refresh Stores'"
        icon="mdi-refresh"
        variant="text"
        @click="handleRefresh"
      />
    </v-toolbar>

    <v-layout>
      <v-navigation-drawer permanent location="left" width="250">
        <v-list>
          <v-list-subheader>Stores</v-list-subheader>
          <v-list-item
            v-for="storeName in storeNames"
            :key="storeName"
            :value="storeName"
            :active="selectedStore === storeName"
            @click="selectedStore = storeName"
          >
            <template #prepend>
              <v-icon icon="mdi-database" />
            </template>
            <v-list-item-title>{{ storeName }}</v-list-item-title>
          </v-list-item>
        </v-list>

        <template #append>
          <div class="pa-2">
            <v-list-item>
              <template #prepend>
                <v-icon icon="mdi-information" />
              </template>
              <v-list-item-subtitle>Total Stores: {{ storeNames.length }}</v-list-item-subtitle>
            </v-list-item>
          </div>
        </template>
      </v-navigation-drawer>

      <v-main class="main-content">
        <div class="content-scroll">
          <div v-if="selectedStore && stores[selectedStore]">
            <v-card>
              <v-card-title class="text-h6 py-4 px-6 bg-primary d-flex align-center">
                {{ selectedStore }}
                <v-spacer />
                <v-btn
                  v-tooltip="'Copy All Data'"
                  density="comfortable"
                  icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  class="mr-2"
                  @click="handleCopy(formatState(stores[selectedStore]))"
                />
                <v-btn
                  v-tooltip="'Expand All'"
                  density="comfortable"
                  :icon="expandAll ? 'mdi-unfold-less-horizontal' : 'mdi-unfold-more-horizontal'"
                  size="small"
                  variant="text"
                  @click="expandAll = !expandAll"
                />
              </v-card-title>

              <v-card-text class="pa-0">
                <v-tabs v-model="activeTab" color="primary">
                  <v-tab value="formatted">Formatted</v-tab>
                  <v-tab value="raw">Raw</v-tab>
                </v-tabs>

                <div class="pa-4">
                  <template v-if="activeTab === 'formatted'">
                    <v-expansion-panels v-model="expandedPanels" :multiple="expandAll">
                      <v-expansion-panel
                        v-for="(value, key) in getStoreData(stores[selectedStore])"
                        :key="key"
                      >
                        <v-expansion-panel-title class="text-subtitle-2">
                          {{ key }}
                          <template #actions>
                            <v-btn
                              icon="mdi-content-copy"
                              size="small"
                              variant="text"
                              @click.stop="handleCopy(JSON.stringify(value, null, 2))"
                            />
                          </template>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <pre class="store-state">{{ JSON.stringify(value, null, 2) }}</pre>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </template>
                  <pre v-else class="store-state">{{ formatState(stores[selectedStore]) }}</pre>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </v-main>
    </v-layout>

    <!-- Snackbar для уведомлений -->
    <v-snackbar v-model="showSnackbar" timeout="2000" color="success">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useOrderStore } from '@/stores/order.store'
import { useMenuStore } from '@/stores/menu.store'
import { useTablesStore } from '@/stores/tables.store'
import { Store } from 'pinia'

type StoreRecord = {
  [key: string]: Store
}

const orderStore = useOrderStore()
const menuStore = useMenuStore()
const tablesStore = useTablesStore()

const stores: StoreRecord = {
  'Menu Store': menuStore,
  'Order Store': orderStore,
  'Tables Store': tablesStore
}

const storeNames = Object.keys(stores)
const selectedStore = ref(storeNames[0])
const activeTab = ref('formatted')
const expandAll = ref(false)
const expandedPanels = ref<number[]>([])
const showSnackbar = ref(false)
const snackbarText = ref('')

watch(expandAll, newValue => {
  if (newValue) {
    expandedPanels.value = Array.from({ length: 20 }, (_, i) => i)
  } else {
    expandedPanels.value = []
  }
})

const formatState = (store: Store) => {
  const state = { ...(store as Record<string, any>) }
  delete state._customProperties
  delete state.$state
  delete state.$id
  return JSON.stringify(state, null, 2)
}

const getStoreData = (store: Store) => {
  const state = { ...(store as Record<string, any>) }
  const result: Record<string, any> = {}

  Object.entries(state).forEach(([key, value]) => {
    if (key.startsWith('_') || key.startsWith('$')) return
    if (typeof value === 'function') return

    if (Array.isArray(value)) {
      result[`${key} (Array - ${value.length} items)`] = value
    } else if (typeof value === 'object' && value !== null) {
      result[`${key} (Object)`] = value
    } else {
      result[`${key} (${typeof value})`] = value
    }
  })

  return result
}

const handleRefresh = () => {
  window.location.reload()
}

const handleCopy = async (text: string) => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      snackbarText.value = 'Copied to clipboard'
      showSnackbar.value = true
    } else {
      // Fallback для старых браузеров
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      snackbarText.value = 'Copied to clipboard'
      showSnackbar.value = true
    }
  } catch (err) {
    console.error('Failed to copy:', err)
    snackbarText.value = 'Failed to copy to clipboard'
    showSnackbar.value = true
  }
}
</script>

<style scoped>
.debug-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  overflow: hidden;
  padding: 16px;
  background-color: rgb(20, 20, 22);
  margin-left: 250px; /* Отступ для drawer */
  width: calc(100% - 250px); /* Учитываем ширину drawer */
}

.content-scroll {
  height: 100%;
  overflow-y: auto;
}

.store-state {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.87);
  background: var(--color-surface);
  padding: 12px;
  border-radius: 4px;
  margin: 0;
  overflow-x: auto;
}

:deep(.v-expansion-panel) {
  background-color: rgb(26, 26, 30) !important;
  margin-bottom: 8px;
}

:deep(.v-expansion-panel-title) {
  padding: 8px 16px;
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 0 !important;
}
</style>
