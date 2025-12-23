<!-- src/views/supplier_2/components/orders/OrderExportOptionsDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="450px">
    <v-card>
      <v-card-title class="d-flex align-center pa-4 bg-primary text-white">
        <v-icon icon="mdi-file-eye-outline" class="mr-2" />
        Export Purchase Order
      </v-card-title>

      <v-card-text class="pa-4">
        <div v-if="order" class="mb-4">
          <div class="text-h6 font-weight-bold">{{ order.orderNumber }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ order.supplierName }}</div>
        </div>

        <v-divider class="mb-4" />

        <div class="text-subtitle-2 mb-3">Export Options</div>

        <v-radio-group v-model="exportMode" class="mt-0">
          <v-radio value="preview">
            <template #label>
              <div>
                <div class="font-weight-medium">
                  <v-icon icon="mdi-file-pdf-box" size="small" class="mr-1" />
                  Preview HTML/PDF
                </div>
                <div class="text-caption text-medium-emphasis">
                  View and download as PDF document
                </div>
              </div>
            </template>
          </v-radio>
          <v-radio value="whatsapp">
            <template #label>
              <div>
                <div class="font-weight-medium">
                  <v-icon icon="mdi-whatsapp" size="small" class="mr-1" color="success" />
                  Send via WhatsApp
                </div>
                <div class="text-caption text-medium-emphasis">
                  Open WhatsApp with pre-filled message
                </div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>

        <!-- WhatsApp Warning -->
        <v-alert
          v-if="exportMode === 'whatsapp' && !hasValidPhone"
          type="warning"
          variant="tonal"
          class="mt-3"
          density="compact"
        >
          <div class="text-caption">
            <strong>Supplier phone not set</strong>
            <br />
            You can copy the message and send manually
          </div>
        </v-alert>

        <!-- WhatsApp Success Message -->
        <v-alert
          v-if="exportMode === 'whatsapp' && hasValidPhone"
          type="success"
          variant="tonal"
          class="mt-3"
          density="compact"
        >
          <div class="text-caption">
            <v-icon icon="mdi-check-circle" size="small" class="mr-1" />
            Will open WhatsApp to
            <strong>{{ supplierPhone }}</strong>
          </div>
        </v-alert>

        <!-- Copy Success Snackbar -->
        <v-snackbar v-model="showCopySuccess" :timeout="2000" color="success">
          <v-icon icon="mdi-check" class="mr-2" />
          Message copied to clipboard!
        </v-snackbar>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="outlined" @click="close">Cancel</v-btn>
        <v-spacer />

        <!-- Preview Button -->
        <v-btn
          v-if="exportMode === 'preview'"
          color="primary"
          :loading="loading"
          prepend-icon="mdi-eye-outline"
          @click="handlePreview"
        >
          Preview Order
        </v-btn>

        <!-- WhatsApp Send/Copy Buttons -->
        <template v-else-if="exportMode === 'whatsapp'">
          <v-btn
            v-if="!hasValidPhone"
            color="primary"
            :loading="loading"
            prepend-icon="mdi-content-copy"
            @click="handleCopyMessage"
          >
            Copy Message
          </v-btn>
          <v-btn
            v-else
            color="success"
            :loading="loading"
            prepend-icon="mdi-whatsapp"
            @click="handleWhatsAppSend"
          >
            Send WhatsApp
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PurchaseOrder } from '@/stores/supplier_2/types'
import { useWhatsAppExport } from '@/stores/supplier_2/composables/useWhatsAppExport'

interface Props {
  modelValue: boolean
  order: PurchaseOrder | null
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'print', options: { includePrices: boolean }): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emits = defineEmits<Emits>()

const { sendOrder, copyMessageToClipboard, hasValidWhatsAppNumber, getSupplierPhone } =
  useWhatsAppExport()

const exportMode = ref<'preview' | 'whatsapp'>('preview')
const showCopySuccess = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

// Check if supplier has valid WhatsApp phone
const hasValidPhone = computed(() => {
  if (!props.order) return false
  return hasValidWhatsAppNumber(props.order)
})

// Get supplier phone for display
const supplierPhone = computed(() => {
  if (!props.order) return null
  return getSupplierPhone(props.order)
})

function close() {
  isOpen.value = false
}

function handlePreview() {
  // Always use quantities only for simplified HTML template
  emits('print', {
    includePrices: false
  })
}

async function handleWhatsAppSend() {
  if (!props.order) return

  const result = await sendOrder(props.order)

  if (result.success) {
    // WhatsApp opened successfully
    close()
  } else {
    // Show error (if needed, could add error alert)
    console.error('WhatsApp send failed:', result.error)
  }
}

async function handleCopyMessage() {
  if (!props.order) return

  const success = await copyMessageToClipboard(props.order)

  if (success) {
    showCopySuccess.value = true
    // Close dialog after short delay
    setTimeout(() => {
      close()
    }, 1500)
  }
}
</script>

<style scoped>
.text-medium-emphasis {
  opacity: 0.7;
}
</style>
