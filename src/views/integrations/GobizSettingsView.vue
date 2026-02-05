<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGobizStore } from '@/stores/gobiz'
import type {
  GobizConfigPublic,
  CreateGobizConfigInput,
  GobizEnvironment
} from '@/integrations/gobiz/types'
import { TimeUtils } from '@/utils'

const gobizStore = useGobizStore()

// State
const showDialog = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const isTesting = ref<string | null>(null) // configId being tested
const testResult = ref<{ success: boolean; message: string } | null>(null)

// Form
const form = ref({
  outletId: '',
  outletName: '',
  partnerId: '',
  clientId: '',
  clientSecret: '',
  environment: 'sandbox' as GobizEnvironment
})

const formValid = computed(() => form.value.clientId.trim() && form.value.clientSecret.trim())

// Computed
const configs = computed(() => gobizStore.configs)
const isLoading = computed(() => gobizStore.isLoading)

onMounted(async () => {
  if (!gobizStore.initialized) {
    await gobizStore.initialize()
  }
})

// Helpers
function getStatusColor(config: GobizConfigPublic): string {
  const status = gobizStore.getConnectionStatus(config.id)
  if (status === 'checking') return 'info'
  if (status === 'connected' || config.isConnected) return 'success'
  if (status === 'error' || config.lastError) return 'error'
  return 'grey'
}

function getStatusText(config: GobizConfigPublic): string {
  const status = gobizStore.getConnectionStatus(config.id)
  if (status === 'checking') return 'Checking...'
  if (status === 'connected' || config.isConnected) return 'Connected'
  if (status === 'error') return 'Error'
  if (config.lastError) return 'Error'
  return 'Not connected'
}

function getStatusIcon(config: GobizConfigPublic): string {
  const status = gobizStore.getConnectionStatus(config.id)
  if (status === 'checking') return 'mdi-loading mdi-spin'
  if (status === 'connected' || config.isConnected) return 'mdi-check-circle'
  if (status === 'error' || config.lastError) return 'mdi-alert-circle'
  return 'mdi-help-circle-outline'
}

function formatExpiry(config: GobizConfigPublic): string {
  if (!config.tokenExpiresAt) return 'No token'
  const expires = new Date(config.tokenExpiresAt)
  if (expires.getTime() < Date.now()) return 'Expired'
  return TimeUtils.formatDateTimeForDisplay(config.tokenExpiresAt)
}

// Dialog actions
function openCreateDialog() {
  isEditing.value = false
  editingId.value = null
  form.value = {
    outletId: '',
    outletName: '',
    partnerId: '',
    clientId: '',
    clientSecret: '',
    environment: 'sandbox'
  }
  testResult.value = null
  showDialog.value = true
}

function openEditDialog(config: GobizConfigPublic) {
  isEditing.value = true
  editingId.value = config.id
  form.value = {
    outletId: config.outletId,
    outletName: config.outletName ?? '',
    partnerId: config.partnerId ?? '',
    clientId: config.clientId,
    clientSecret: '', // never pre-filled
    environment: config.environment
  }
  testResult.value = null
  showDialog.value = true
}

async function saveConfig() {
  if (!formValid.value) return

  try {
    if (isEditing.value && editingId.value) {
      const updates: Record<string, unknown> = {
        outletId: form.value.outletId || undefined,
        outletName: form.value.outletName || undefined,
        partnerId: form.value.partnerId || undefined,
        clientId: form.value.clientId,
        environment: form.value.environment
      }
      // Only send secret if changed
      if (form.value.clientSecret.trim()) {
        updates.clientSecret = form.value.clientSecret
      }
      await gobizStore.updateConfig(editingId.value, updates)
    } else {
      await gobizStore.createConfig({
        outletId: form.value.outletId || undefined,
        outletName: form.value.outletName || undefined,
        partnerId: form.value.partnerId || undefined,
        clientId: form.value.clientId,
        clientSecret: form.value.clientSecret,
        environment: form.value.environment
      } as CreateGobizConfigInput)
    }
    showDialog.value = false
  } catch (err) {
    console.error('Failed to save config:', err)
  }
}

async function handleTestConnection(configId: string) {
  isTesting.value = configId
  testResult.value = null

  const result = await gobizStore.testConnection(configId)

  if (result.success) {
    const data = result.data as Record<string, unknown>
    testResult.value = {
      success: true,
      message: (data.message as string) ?? `Connected to ${data.environment}`
    }
  } else {
    testResult.value = {
      success: false,
      message: result.error ?? 'Connection failed'
    }
  }

  isTesting.value = null
}

async function handleRefreshToken(configId: string) {
  isTesting.value = configId
  await gobizStore.refreshToken(configId)
  isTesting.value = null
}

async function handleDelete(config: GobizConfigPublic) {
  if (!confirm(`Delete GoBiz config for outlet "${config.outletName || config.outletId}"?`)) return
  await gobizStore.deleteConfig(config.id)
}

async function toggleActive(config: GobizConfigPublic) {
  await gobizStore.updateConfig(config.id, { isActive: !config.isActive })
}
</script>

<template>
  <v-container>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4">GoBiz Integration</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Connect to GoFood / GoBiz for online orders and menu sync
        </p>
      </div>
      <v-btn color="primary" @click="openCreateDialog">
        <v-icon start>mdi-plus</v-icon>
        Add Connection
      </v-btn>
    </div>

    <!-- Loading -->
    <v-progress-linear v-if="isLoading" indeterminate class="mb-4" />

    <!-- Empty state -->
    <v-card v-if="!isLoading && configs.length === 0" class="pa-8 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-moped</v-icon>
      <h3 class="text-h6 mb-2">No GoBiz connections</h3>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Add your GoBiz credentials to start receiving online orders
      </p>
      <v-btn color="primary" @click="openCreateDialog">
        <v-icon start>mdi-plus</v-icon>
        Add Connection
      </v-btn>
    </v-card>

    <!-- Config cards -->
    <v-row>
      <v-col v-for="config in configs" :key="config.id" cols="12">
        <v-card>
          <!-- Status bar -->
          <v-card-item>
            <template #prepend>
              <v-icon :color="getStatusColor(config)" size="28">
                {{ getStatusIcon(config) }}
              </v-icon>
            </template>

            <v-card-title>
              {{ config.outletName || config.outletId }}
            </v-card-title>

            <v-card-subtitle>
              <v-chip
                :color="config.environment === 'production' ? 'error' : 'info'"
                size="x-small"
                label
                class="mr-2"
              >
                {{ config.environment }}
              </v-chip>
              {{ getStatusText(config) }}
            </v-card-subtitle>

            <template #append>
              <v-switch
                :model-value="config.isActive"
                color="success"
                hide-details
                density="compact"
                @update:model-value="toggleActive(config)"
              />
            </template>
          </v-card-item>

          <v-divider />

          <!-- Details -->
          <v-card-text>
            <v-row dense>
              <v-col cols="12" sm="3">
                <div class="text-caption text-medium-emphasis">Partner ID</div>
                <div class="text-body-2 font-weight-medium">{{ config.partnerId || '—' }}</div>
              </v-col>
              <v-col cols="12" sm="3">
                <div class="text-caption text-medium-emphasis">Outlet ID</div>
                <div class="text-body-2 font-weight-medium">
                  {{ config.outletId || 'Not linked' }}
                </div>
              </v-col>
              <v-col cols="12" sm="3">
                <div class="text-caption text-medium-emphasis">Client ID</div>
                <div class="text-body-2 font-weight-medium">{{ config.clientId }}</div>
              </v-col>
              <v-col cols="12" sm="3">
                <div class="text-caption text-medium-emphasis">Token Expires</div>
                <div class="text-body-2 font-weight-medium">{{ formatExpiry(config) }}</div>
              </v-col>
            </v-row>

            <!-- Error display -->
            <v-alert
              v-if="config.lastError"
              type="error"
              variant="tonal"
              density="compact"
              class="mt-3"
            >
              <div class="text-body-2">{{ config.lastError }}</div>
              <div v-if="config.lastErrorAt" class="text-caption mt-1">
                {{ TimeUtils.formatDateTimeForDisplay(config.lastErrorAt) }}
              </div>
            </v-alert>

            <!-- Test result (inline) -->
            <v-alert
              v-if="testResult && isTesting === null"
              :type="testResult.success ? 'success' : 'error'"
              variant="tonal"
              density="compact"
              closable
              class="mt-3"
              @click:close="testResult = null"
            >
              {{ testResult.message }}
            </v-alert>
          </v-card-text>

          <v-divider />

          <!-- Actions -->
          <v-card-actions>
            <v-btn
              variant="tonal"
              color="primary"
              :loading="isTesting === config.id"
              @click="handleTestConnection(config.id)"
            >
              <v-icon start>mdi-connection</v-icon>
              Test Connection
            </v-btn>
            <v-btn
              variant="tonal"
              :loading="isTesting === config.id"
              @click="handleRefreshToken(config.id)"
            >
              <v-icon start>mdi-refresh</v-icon>
              Refresh Token
            </v-btn>
            <v-spacer />
            <v-btn icon="mdi-pencil" variant="text" @click="openEditDialog(config)" />
            <v-btn icon="mdi-delete" variant="text" color="error" @click="handleDelete(config)" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create / Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="600" persistent>
      <v-card>
        <v-card-title>
          {{ isEditing ? 'Edit Connection' : 'New GoBiz Connection' }}
        </v-card-title>

        <v-card-text>
          <v-row dense>
            <v-col cols="12">
              <v-btn-toggle
                v-model="form.environment"
                mandatory
                color="primary"
                density="compact"
                class="mb-4"
              >
                <v-btn value="sandbox">
                  <v-icon start>mdi-flask</v-icon>
                  Sandbox
                </v-btn>
                <v-btn value="production" color="error">
                  <v-icon start>mdi-earth</v-icon>
                  Production
                </v-btn>
              </v-btn-toggle>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.partnerId"
                label="Partner ID"
                placeholder="Facilitator partner ID"
                density="compact"
                variant="outlined"
                hint="From GoBiz Developer Portal"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.outletName"
                label="Outlet Name"
                placeholder="e.g. My Restaurant"
                density="compact"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.outletId"
                label="Outlet ID"
                placeholder="Sandbox outlet ID (optional)"
                density="compact"
                variant="outlined"
                hint="Generate from developer portal sandbox"
                persistent-hint
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="form.clientId"
                label="Client ID"
                placeholder="OAuth Client ID"
                required
                density="compact"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="form.clientSecret"
                :label="isEditing ? 'Client Secret (leave empty to keep current)' : 'Client Secret'"
                placeholder="OAuth Client Secret"
                :required="!isEditing"
                type="password"
                density="compact"
                variant="outlined"
              />
            </v-col>
          </v-row>

          <v-alert
            v-if="form.environment === 'production'"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            Production environment will connect to live GoBiz API
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDialog = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!formValid" @click="saveConfig">
            {{ isEditing ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
