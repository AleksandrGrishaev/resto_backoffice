<!-- src/views/backoffice/settings/components/WriteOffReasonsSettings.vue -->
<template>
  <div class="writeoff-reasons-settings">
    <!-- Info Alert -->
    <v-alert type="info" variant="tonal" class="mb-4">
      <strong>KPI Write-off Exclusions</strong>
      <p class="mb-0 mt-1">
        Select write-off reasons to
        <strong>exclude</strong>
        from KPI COGS calculation. P&L Report always includes ALL write-offs regardless of this
        setting.
      </p>
    </v-alert>

    <v-row>
      <!-- Storage Write-offs -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start color="blue">mdi-package-variant</v-icon>
            Storage Write-offs
          </v-card-title>
          <v-card-subtitle>Raw products and ingredients</v-card-subtitle>
          <v-card-text>
            <div v-for="reason in STORAGE_REASONS" :key="reason.value" class="mb-2">
              <v-checkbox
                v-model="excludedStorage"
                :value="reason.value"
                :label="reason.label"
                :hint="reason.description"
                persistent-hint
                density="compact"
                hide-details="auto"
                color="primary"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Preparation Write-offs -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start color="orange">mdi-chef-hat</v-icon>
            Preparation Write-offs
          </v-card-title>
          <v-card-subtitle>Semi-finished products</v-card-subtitle>
          <v-card-text>
            <div v-for="reason in PREPARATION_REASONS" :key="reason.value" class="mb-2">
              <v-checkbox
                v-model="excludedPreparation"
                :value="reason.value"
                :label="reason.label"
                :hint="reason.description"
                persistent-hint
                density="compact"
                hide-details="auto"
                color="primary"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Auto-excluded info -->
    <v-alert type="warning" variant="tonal" class="mt-4">
      <v-icon start>mdi-information</v-icon>
      <strong>Always excluded:</strong>
      <code>production_consumption</code>
      and
      <code>sales_consumption</code>
      are automatically excluded from both P&L and KPI because they represent ingredient costs
      already counted in Sales COGS via FIFO.
    </v-alert>

    <!-- Save Button -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-btn color="primary" :loading="saving" :disabled="loading" @click="saveSettings">
          <v-icon start>mdi-content-save</v-icon>
          Save Settings
        </v-btn>
        <v-btn variant="text" class="ml-2" :disabled="saving || loading" @click="resetToDefaults">
          Reset to Defaults
        </v-btn>
      </v-col>
    </v-row>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccess" color="success" timeout="3000" location="top">
      <v-icon start>mdi-check-circle</v-icon>
      {{ successMessage }}
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" timeout="5000" location="top">
      <v-icon start>mdi-alert-circle</v-icon>
      {{ errorMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getKPISettings,
  updateKPISettings,
  getDefaultExcludedReasons
} from '@/stores/kitchenKpi/services/kpiSettingsService'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'WriteOffReasonsSettings'

// Available reasons for user selection
// Note: production_consumption and sales_consumption are NOT shown - they're auto-excluded
const STORAGE_REASONS = [
  { value: 'expired', label: 'Expired', description: 'Products past shelf life' },
  { value: 'spoiled', label: 'Spoiled', description: 'Damaged or contaminated products' },
  { value: 'other', label: 'Other', description: 'Spills, measurement errors, etc.' },
  { value: 'education', label: 'Education', description: 'Staff training usage' },
  { value: 'test', label: 'Test', description: 'Recipe development and testing' }
]

const PREPARATION_REASONS = [
  { value: 'expired', label: 'Expired', description: 'Preparations past shelf life' },
  { value: 'spoiled', label: 'Spoiled', description: 'Damaged preparations' },
  { value: 'other', label: 'Other', description: 'Other reasons' },
  { value: 'education', label: 'Education', description: 'Staff training usage' },
  { value: 'test', label: 'Test', description: 'Recipe testing' }
]

// State
const loading = ref(false)
const saving = ref(false)
const excludedStorage = ref<string[]>([])
const excludedPreparation = ref<string[]>([])

// Notifications
const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Load settings from database
const loadSettings = async () => {
  loading.value = true
  try {
    const settings = await getKPISettings()
    excludedStorage.value = settings.excludedReasons?.storage || []
    excludedPreparation.value = settings.excludedReasons?.preparation || []
    DebugUtils.info(MODULE_NAME, 'Loaded KPI settings', settings)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load KPI settings', { error })
    // Use defaults on error
    const defaults = getDefaultExcludedReasons()
    excludedStorage.value = defaults.storage || []
    excludedPreparation.value = defaults.preparation || []
  } finally {
    loading.value = false
  }
}

// Save settings to database
const saveSettings = async () => {
  saving.value = true
  try {
    await updateKPISettings({
      excludedReasons: {
        storage: excludedStorage.value,
        preparation: excludedPreparation.value
      }
    })
    successMessage.value = 'Write-off exclusions saved successfully'
    showSuccess.value = true
    DebugUtils.info(MODULE_NAME, 'Saved KPI settings', {
      storage: excludedStorage.value,
      preparation: excludedPreparation.value
    })
  } catch (error) {
    errorMessage.value = 'Failed to save settings'
    showError.value = true
    DebugUtils.error(MODULE_NAME, 'Failed to save KPI settings', { error })
  } finally {
    saving.value = false
  }
}

// Reset to default values
const resetToDefaults = () => {
  const defaults = getDefaultExcludedReasons()
  excludedStorage.value = defaults.storage || []
  excludedPreparation.value = defaults.preparation || []
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped lang="scss">
.writeoff-reasons-settings {
  padding: 0;
}
</style>
