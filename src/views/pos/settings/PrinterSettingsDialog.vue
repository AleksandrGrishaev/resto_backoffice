<!-- src/views/pos/settings/PrinterSettingsDialog.vue -->
<!--
  Printer Settings Dialog
  Allows configuring printer connection and receipt settings
-->
<template>
  <v-dialog v-model="dialogModel" max-width="500" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-printer-settings</v-icon>
        Printer Settings
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Connection Section -->
        <div class="settings-section">
          <div class="section-title text-subtitle-2 font-weight-bold mb-3">
            <v-icon start size="small">mdi-bluetooth</v-icon>
            Connection
          </div>

          <!-- Connection Status -->
          <div class="connection-status pa-3 rounded mb-3" :class="connectionStatusClass">
            <div class="d-flex align-center">
              <v-icon :color="isConnected ? 'success' : 'grey'" class="mr-2">
                {{ isConnected ? 'mdi-printer-check' : 'mdi-printer-off' }}
              </v-icon>
              <div>
                <div class="font-weight-medium">
                  {{ isConnected ? 'Connected' : 'Not Connected' }}
                </div>
                <div v-if="isConnected && deviceName" class="text-caption text-medium-emphasis">
                  {{ deviceName }}
                </div>
              </div>
            </div>
          </div>

          <!-- Connection Buttons -->
          <div class="d-flex gap-2 mb-3">
            <v-btn
              v-if="!isConnected"
              color="primary"
              variant="flat"
              :loading="isConnecting"
              :disabled="!isAvailable"
              @click="handleConnect"
            >
              <v-icon start>mdi-bluetooth-connect</v-icon>
              Connect Printer
            </v-btn>

            <v-btn v-else color="error" variant="outlined" @click="handleDisconnect">
              <v-icon start>mdi-bluetooth-off</v-icon>
              Disconnect
            </v-btn>

            <v-btn
              v-if="isConnected"
              color="secondary"
              variant="outlined"
              :loading="isPrinting"
              @click="handleTestPrint"
            >
              <v-icon start>mdi-printer</v-icon>
              Test Print
            </v-btn>
          </div>

          <!-- Bluetooth not available warning -->
          <v-alert
            v-if="!isAvailable"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            <div class="text-caption">
              Web Bluetooth is not available in this browser. Use Chrome on Android, ChromeOS,
              Windows, or macOS.
            </div>
          </v-alert>

          <!-- Test print result -->
          <v-alert
            v-if="testPrintMessage"
            :type="testPrintSuccess ? 'success' : 'error'"
            variant="tonal"
            density="compact"
            closable
            class="mb-3"
            @click:close="testPrintMessage = ''"
          >
            {{ testPrintMessage }}
          </v-alert>
        </div>

        <v-divider class="my-4" />

        <!-- Restaurant Info Section -->
        <div class="settings-section">
          <div class="section-title text-subtitle-2 font-weight-bold mb-3">
            <v-icon start size="small">mdi-store</v-icon>
            Restaurant Info
          </div>

          <v-text-field
            v-model="localSettings.restaurantName"
            label="Restaurant Name"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
          />

          <v-text-field
            v-model="localSettings.restaurantAddress"
            label="Address"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
          />

          <v-text-field
            v-model="localSettings.restaurantPhone"
            label="Phone"
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details
          />
        </div>

        <v-divider class="my-4" />

        <!-- Receipt Settings Section -->
        <div class="settings-section">
          <div class="section-title text-subtitle-2 font-weight-bold mb-3">
            <v-icon start size="small">mdi-receipt</v-icon>
            Receipt Settings
          </div>

          <v-text-field
            v-model="localSettings.footerMessage"
            label="Footer Message"
            variant="outlined"
            density="compact"
            class="mb-3"
            hint="Shown at bottom of receipt"
            persistent-hint
          />

          <v-switch
            v-model="localSettings.autoPrintCashReceipt"
            label="Auto-print receipt for cash payments"
            color="primary"
            density="compact"
            hide-details
          />
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="handleClose">Cancel</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" :loading="isSaving" @click="handleSave">
          Save Settings
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { usePrinter } from '@/core/printing'
import type { PrinterSettings } from '@/core/printing/types'
import { DEFAULT_PRINTER_SETTINGS } from '@/core/printing/types'

// Props
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Printer
const {
  isConnected,
  isConnecting,
  isAvailable,
  deviceName,
  settings,
  connect,
  disconnect,
  testPrint,
  updateSettings
} = usePrinter()

// Local settings (editable copy)
const localSettings = reactive<PrinterSettings>({ ...DEFAULT_PRINTER_SETTINGS })

// State
const isSaving = ref(false)
const isPrinting = ref(false)
const testPrintSuccess = ref(false)
const testPrintMessage = ref('')

// Computed
const connectionStatusClass = computed(() => ({
  'bg-success-lighten-5': isConnected.value,
  'bg-grey-lighten-4': !isConnected.value
}))

// Watch dialog open - copy settings to local
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      // Copy current settings to local
      Object.assign(localSettings, settings.value)
      testPrintMessage.value = ''
    }
  }
)

// Methods
async function handleConnect(): Promise<void> {
  await connect()
}

async function handleDisconnect(): Promise<void> {
  await disconnect()
}

async function handleTestPrint(): Promise<void> {
  isPrinting.value = true
  testPrintMessage.value = ''

  try {
    const result = await testPrint()

    if (result.success) {
      testPrintSuccess.value = true
      testPrintMessage.value = 'Test print successful!'
    } else {
      testPrintSuccess.value = false
      testPrintMessage.value = result.error || 'Test print failed'
    }
  } catch (err) {
    testPrintSuccess.value = false
    testPrintMessage.value = err instanceof Error ? err.message : 'Test print failed'
  } finally {
    isPrinting.value = false
  }
}

async function handleSave(): Promise<void> {
  isSaving.value = true

  try {
    await updateSettings(localSettings)
    dialogModel.value = false
  } catch (err) {
    console.error('Failed to save settings:', err)
  } finally {
    isSaving.value = false
  }
}

function handleClose(): void {
  dialogModel.value = false
}
</script>

<style scoped>
.settings-section {
  margin-bottom: 8px;
}

.section-title {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.connection-status {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
</style>
