<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGobizStore } from '@/stores/gobiz'
import { formatIDR } from '@/utils'
import { TimeUtils } from '@/utils'
import type { MenuSyncPreview, MenuSyncWarning } from '@/integrations/gobiz/catalogTypes'

const gobizStore = useGobizStore()

// Local state
const showConfirmDialog = ref(false)
const showRawJson = ref(false)
const syncError = ref<string | null>(null)

// Computed
const activeConfig = computed(() => gobizStore.activeConfig)
const isConnected = computed(() => gobizStore.isConnected)
const hasOutletId = computed(() => !!activeConfig.value?.outletId)
const preview = computed(() => gobizStore.syncPreview)
const lastResult = computed(() => gobizStore.lastSyncResult)
const isSyncing = computed(() => gobizStore.isSyncing)
const isPreviewLoading = computed(() => gobizStore.isPreviewLoading)

onMounted(async () => {
  if (!gobizStore.initialized) {
    await gobizStore.initialize()
  }
})

// Actions
async function generatePreview() {
  syncError.value = null
  try {
    await gobizStore.loadSyncPreview()
  } catch (err) {
    syncError.value = String(err)
  }
}

async function confirmSync() {
  showConfirmDialog.value = false
  syncError.value = null
  try {
    const result = await gobizStore.executeFullSync()
    if (result && !result.success && result.errors.length > 0) {
      syncError.value = result.errors.map(e => e.message).join('; ')
    }
  } catch (err) {
    syncError.value = String(err)
  }
}

function getWarningColor(type: MenuSyncWarning['type']): string {
  switch (type) {
    case 'missing_image':
      return 'warning'
    case 'description_truncated':
      return 'info'
    case 'removal_modifier_skipped':
      return 'info'
    case 'no_active_variants':
      return 'error'
    case 'zero_price':
      return 'error'
    case 'no_channel_price':
      return 'warning'
    default:
      return 'grey'
  }
}

function getWarningIcon(type: MenuSyncWarning['type']): string {
  switch (type) {
    case 'missing_image':
      return 'mdi-image-off'
    case 'description_truncated':
      return 'mdi-text-box-minus'
    case 'removal_modifier_skipped':
      return 'mdi-minus-circle'
    case 'no_active_variants':
      return 'mdi-alert'
    case 'zero_price':
      return 'mdi-currency-usd-off'
    case 'no_channel_price':
      return 'mdi-cash-remove'
    default:
      return 'mdi-information'
  }
}

function formatPayloadJson(p: MenuSyncPreview): string {
  return JSON.stringify(p.payload, null, 2)
}

function getModifierGroupName(externalId: string): string {
  const vc = preview.value?.payload.variant_categories.find(v => v.external_id === externalId)
  return vc?.name ?? externalId
}
</script>

<template>
  <v-container>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <div class="d-flex align-center gap-2">
          <v-btn icon="mdi-arrow-left" variant="text" to="/integrations/gobiz" />
          <div>
            <h1 class="text-h4">Menu Sync</h1>
            <p class="text-body-2 text-medium-emphasis mt-1">
              Synchronize your menu to GoBiz GoFood catalog
            </p>
          </div>
        </div>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          variant="tonal"
          color="primary"
          :loading="isPreviewLoading"
          :disabled="!activeConfig"
          @click="generatePreview"
        >
          <v-icon start>mdi-eye</v-icon>
          Generate Preview
        </v-btn>
        <v-btn
          color="primary"
          :loading="isSyncing"
          :disabled="!activeConfig || !hasOutletId || !preview"
          @click="showConfirmDialog = true"
        >
          <v-icon start>mdi-sync</v-icon>
          Sync Now
        </v-btn>
      </div>
    </div>

    <!-- No active config warning -->
    <v-alert v-if="!activeConfig" type="warning" variant="tonal" class="mb-4">
      <v-alert-title>No active GoBiz connection</v-alert-title>
      <p class="text-body-2 mt-1">
        Configure and activate a GoBiz connection in
        <router-link to="/integrations/gobiz">GoBiz Settings</router-link>
        first.
      </p>
    </v-alert>

    <!-- Connection status -->
    <v-card v-if="activeConfig" class="mb-4" variant="outlined">
      <v-card-item>
        <template #prepend>
          <v-icon :color="isConnected ? 'success' : 'warning'" size="24">
            {{ isConnected ? 'mdi-check-circle' : 'mdi-alert-circle' }}
          </v-icon>
        </template>
        <v-card-title class="text-body-1">
          {{ activeConfig.outletName || activeConfig.outletId || 'GoBiz Connection' }}
        </v-card-title>
        <v-card-subtitle>
          <v-chip
            :color="activeConfig.environment === 'production' ? 'error' : 'info'"
            size="x-small"
            label
            class="mr-2"
          >
            {{ activeConfig.environment }}
          </v-chip>
          <span v-if="!hasOutletId" class="text-error">Outlet ID not configured</span>
          <span v-else>Outlet: {{ activeConfig.outletId }}</span>
        </v-card-subtitle>
      </v-card-item>
    </v-card>

    <!-- Sync error -->
    <v-alert
      v-if="syncError"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="syncError = null"
    >
      {{ syncError }}
    </v-alert>

    <!-- Last sync result -->
    <v-card v-if="lastResult" class="mb-4" variant="outlined">
      <v-card-item>
        <template #prepend>
          <v-icon :color="lastResult.success ? 'success' : 'error'" size="24">
            {{ lastResult.success ? 'mdi-check-circle' : 'mdi-close-circle' }}
          </v-icon>
        </template>
        <v-card-title class="text-body-1">
          Last Sync: {{ lastResult.success ? 'Successful' : 'Failed' }}
        </v-card-title>
        <v-card-subtitle>
          {{ TimeUtils.formatDateTimeForDisplay(lastResult.syncedAt) }}
          &mdash;
          {{ lastResult.stats.totalItems }} items, {{ lastResult.stats.totalCategories }} categories
        </v-card-subtitle>
      </v-card-item>
      <v-card-text v-if="lastResult.errors.length > 0">
        <v-alert
          v-for="(err, i) in lastResult.errors"
          :key="i"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-1"
        >
          [{{ err.code }}] {{ err.message }}
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Preview Panel -->
    <template v-if="preview">
      <!-- Stats cards -->
      <v-row class="mb-4">
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center">
              <div class="text-h4">{{ preview.stats.totalCategories }}</div>
              <div class="text-caption">Categories</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center">
              <div class="text-h4">{{ preview.stats.totalItems }}</div>
              <div class="text-caption">Menu Items</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal" color="secondary">
            <v-card-text class="text-center">
              <div class="text-h4">{{ preview.stats.totalVariantCategories }}</div>
              <div class="text-caption">Modifier Groups</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="tonal" :color="preview.stats.warnings > 0 ? 'warning' : 'success'">
            <v-card-text class="text-center">
              <div class="text-h4">{{ preview.stats.warnings }}</div>
              <div class="text-caption">Warnings</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Warnings -->
      <v-card v-if="preview.warnings.length > 0" class="mb-4" variant="outlined">
        <v-card-title class="text-body-1">
          <v-icon start color="warning">mdi-alert</v-icon>
          Warnings ({{ preview.warnings.length }})
        </v-card-title>
        <v-list density="compact">
          <v-list-item v-for="(warning, i) in preview.warnings" :key="i">
            <template #prepend>
              <v-icon :color="getWarningColor(warning.type)" size="20">
                {{ getWarningIcon(warning.type) }}
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2">{{ warning.message }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>

      <!-- Category / Item Tree -->
      <v-card class="mb-4" variant="outlined">
        <v-card-title class="text-body-1">
          <v-icon start color="primary">mdi-format-list-bulleted-type</v-icon>
          Catalog Preview
        </v-card-title>
        <v-card-text>
          <div v-for="menu in preview.payload.menus" :key="menu.name" class="mb-4">
            <div class="text-subtitle-2 font-weight-bold mb-2">
              <v-icon size="18" class="mr-1">mdi-folder</v-icon>
              {{ menu.name }}
              <v-chip size="x-small" class="ml-2">{{ menu.menu_items.length }} items</v-chip>
            </div>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>External ID</th>
                  <th class="text-right">Price</th>
                  <th class="text-center">Stock</th>
                  <th class="text-center">Image</th>
                  <th>Modifiers</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in menu.menu_items" :key="item.external_id">
                  <td>{{ item.name }}</td>
                  <td>
                    <code class="text-caption">{{ item.external_id }}</code>
                  </td>
                  <td class="text-right">{{ formatIDR(item.price) }}</td>
                  <td class="text-center">
                    <v-icon :color="item.in_stock ? 'success' : 'error'" size="18">
                      {{ item.in_stock ? 'mdi-check' : 'mdi-close' }}
                    </v-icon>
                  </td>
                  <td class="text-center">
                    <v-icon :color="item.image ? 'success' : 'grey-lighten-1'" size="18">
                      {{ item.image ? 'mdi-image' : 'mdi-image-off' }}
                    </v-icon>
                  </td>
                  <td>
                    <v-chip
                      v-for="vcId in item.variant_category_external_ids ?? []"
                      :key="vcId"
                      size="x-small"
                      variant="tonal"
                      class="mr-1"
                    >
                      {{ getModifierGroupName(vcId) }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card-text>
      </v-card>

      <!-- Modifier Groups -->
      <v-card v-if="preview.payload.variant_categories.length > 0" class="mb-4" variant="outlined">
        <v-card-title class="text-body-1">
          <v-icon start color="secondary">mdi-tune-variant</v-icon>
          Modifier Groups ({{ preview.payload.variant_categories.length }})
        </v-card-title>
        <v-card-text>
          <v-expansion-panels variant="accordion">
            <v-expansion-panel
              v-for="vc in preview.payload.variant_categories"
              :key="vc.external_id"
            >
              <v-expansion-panel-title>
                <span class="font-weight-medium">{{ vc.name }}</span>
                <v-chip size="x-small" class="ml-2">{{ vc.variants.length }} options</v-chip>
                <v-chip size="x-small" variant="tonal" class="ml-1">
                  {{ vc.rules.selection.min_quantity }}-{{ vc.rules.selection.max_quantity }}
                </v-chip>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th>Option</th>
                      <th class="text-right">Price</th>
                      <th class="text-center">In Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="v in vc.variants" :key="v.external_id">
                      <td>{{ v.name }}</td>
                      <td class="text-right">{{ v.price > 0 ? formatIDR(v.price) : 'Free' }}</td>
                      <td class="text-center">
                        <v-icon :color="v.in_stock ? 'success' : 'error'" size="18">
                          {{ v.in_stock ? 'mdi-check' : 'mdi-close' }}
                        </v-icon>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
      </v-card>

      <!-- Raw JSON Toggle -->
      <v-card variant="outlined">
        <v-card-item>
          <v-card-title class="text-body-1">
            <v-icon start>mdi-code-json</v-icon>
            Raw JSON Payload
          </v-card-title>
          <template #append>
            <v-btn variant="text" size="small" @click="showRawJson = !showRawJson">
              {{ showRawJson ? 'Hide' : 'Show' }}
            </v-btn>
          </template>
        </v-card-item>
        <v-card-text v-if="showRawJson">
          <pre
            class="text-caption"
            style="
              max-height: 400px;
              overflow: auto;
              background: #f5f5f5;
              padding: 12px;
              border-radius: 4px;
            "
            >{{ formatPayloadJson(preview) }}</pre
          >
        </v-card-text>
      </v-card>
    </template>

    <!-- Empty state (no preview yet) -->
    <v-card
      v-else-if="activeConfig && !isPreviewLoading"
      class="pa-8 text-center"
      variant="outlined"
    >
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-sync</v-icon>
      <h3 class="text-h6 mb-2">No preview generated</h3>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Click "Generate Preview" to see how your menu will look on GoFood
      </p>
      <v-btn color="primary" variant="tonal" :loading="isPreviewLoading" @click="generatePreview">
        <v-icon start>mdi-eye</v-icon>
        Generate Preview
      </v-btn>
    </v-card>

    <!-- Confirm Sync Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="500" persistent>
      <v-card>
        <v-card-title>Confirm Full Catalog Sync</v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
            This will
            <strong>fully overwrite</strong>
            your GoFood catalog with the current menu. Any items on GoFood that are not in your
            local menu will be removed.
          </v-alert>

          <div v-if="preview" class="text-body-2">
            <div>
              Categories:
              <strong>{{ preview.stats.totalCategories }}</strong>
            </div>
            <div>
              Menu items:
              <strong>{{ preview.stats.totalItems }}</strong>
            </div>
            <div>
              Modifier groups:
              <strong>{{ preview.stats.totalVariantCategories }}</strong>
            </div>
            <div v-if="preview.stats.warnings > 0" class="text-warning mt-2">
              {{ preview.stats.warnings }} warning(s) — review before proceeding
            </div>
          </div>

          <div class="mt-4 text-body-2">
            Target:
            <strong>{{ activeConfig?.outletName || activeConfig?.outletId }}</strong>
            <v-chip
              :color="activeConfig?.environment === 'production' ? 'error' : 'info'"
              size="x-small"
              label
              class="ml-2"
            >
              {{ activeConfig?.environment }}
            </v-chip>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showConfirmDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmSync">
            <v-icon start>mdi-sync</v-icon>
            Sync Now
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
