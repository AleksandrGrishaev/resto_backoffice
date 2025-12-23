<script setup lang="ts">
/**
 * OrderPreviewDialog.vue
 * Simple order preview with HTML display and PDF download
 */
import { ref, computed } from 'vue'
import type { PurchaseOrderExportData } from '@/core/export/types'
import { useExport } from '@/core/export/composables/useExport'
import PurchaseOrderTemplate from '@/core/export/templates/PurchaseOrderTemplate.vue'

interface Props {
  modelValue: boolean
  orderData: PurchaseOrderExportData | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { exportPurchaseOrderAsBlob, isExporting } = useExport()

const isGeneratingPdf = ref(false)
const downloadError = ref<string | null>(null)
const pdfCache = ref<{ blob: Blob; filename: string } | null>(null)

const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// Check if order data is available
const hasOrderData = computed(() => props.orderData !== null)

/**
 * Generate PDF Blob (with caching)
 */
async function generatePdf(): Promise<{ blob: Blob; filename: string } | null> {
  if (!props.orderData) return null

  // Return cached PDF if available
  if (pdfCache.value) {
    return pdfCache.value
  }

  try {
    isGeneratingPdf.value = true
    downloadError.value = null

    const result = await exportPurchaseOrderAsBlob(props.orderData, {
      orientation: 'portrait'
    })

    // Cache the result
    pdfCache.value = result
    return result
  } catch (error) {
    console.error('[OrderPreviewDialog] PDF generation failed:', error)
    downloadError.value = error instanceof Error ? error.message : 'Failed to generate PDF'
    return null
  } finally {
    isGeneratingPdf.value = false
  }
}

/**
 * Download PDF
 */
async function handleDownload() {
  const result = await generatePdf()
  if (!result) return

  try {
    // Ensure we have a valid Blob
    if (!(result.blob instanceof Blob)) {
      throw new Error('Invalid blob type: ' + typeof result.blob)
    }

    // Create download link
    const url = URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('[OrderPreviewDialog] Download failed:', error)
    downloadError.value = error instanceof Error ? error.message : 'Failed to download PDF'
  }
}

/**
 * Close dialog and clear cache
 */
function handleClose() {
  dialog.value = false
  // Clear cache after a short delay to allow smooth transition
  setTimeout(() => {
    pdfCache.value = null
    downloadError.value = null
  }, 300)
}
</script>

<template>
  <v-dialog v-model="dialog" fullscreen :scrim="false" transition="dialog-bottom-transition">
    <v-card>
      <!-- Toolbar -->
      <v-toolbar color="primary" dark>
        <v-btn icon="mdi-close" @click="handleClose" />
        <v-toolbar-title>
          {{ orderData?.orderNumber || 'Purchase Order' }}
        </v-toolbar-title>
        <v-spacer />

        <!-- Download Button -->
        <v-btn
          icon="mdi-download"
          :loading="isGeneratingPdf"
          :disabled="!hasOrderData || isExporting"
          @click="handleDownload"
        />
      </v-toolbar>

      <!-- Error Alert -->
      <v-alert
        v-if="downloadError"
        type="error"
        closable
        class="ma-4"
        @click:close="downloadError = null"
      >
        {{ downloadError }}
      </v-alert>

      <!-- Preview Content -->
      <v-card-text v-if="hasOrderData" class="preview-container">
        <div class="preview-wrapper">
          <PurchaseOrderTemplate :data="orderData!" />
        </div>
      </v-card-text>

      <!-- Empty State -->
      <v-card-text v-else class="text-center pa-8">
        <v-icon size="64" color="grey">mdi-file-document-outline</v-icon>
        <p class="text-h6 mt-4">No order data available</p>
      </v-card-text>

      <!-- Bottom Action Bar -->
      <v-card-actions class="action-bar pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Close</v-btn>
        <v-btn
          color="primary"
          :loading="isGeneratingPdf"
          :disabled="!hasOrderData || isExporting"
          prepend-icon="mdi-download"
          @click="handleDownload"
        >
          Download PDF
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.preview-container {
  overflow-y: auto;
  background: #f5f5f5;
  padding: var(--spacing-lg);

  // Mobile optimization
  @media (max-width: 768px) {
    padding: var(--spacing-sm);
  }
}

.preview-wrapper {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: var(--spacing-lg);

  // Mobile optimization
  @media (max-width: 768px) {
    padding: var(--spacing-md);
  }
}

.action-bar {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  background: white;
  display: flex;
  gap: var(--spacing-md);

  // Touch-optimized buttons
  :deep(.v-btn) {
    min-height: var(--touch-button); // 48px
    font-weight: 500;
  }

  // Mobile layout
  @media (max-width: 768px) {
    flex-direction: column;
    gap: var(--spacing-sm);

    .v-btn {
      width: 100%;
      margin-left: 0 !important;
    }
  }
}

// Purchase Order Template Styling (embedded preview)
:deep(.purchase-order) {
  font-family: 'Roboto', Arial, sans-serif;
  line-height: 1.6;
  color: #333;

  // Responsive typography
  @media (max-width: 768px) {
    font-size: 14px;
  }
}

:deep(.po-header) {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #333;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
  }
}

:deep(.document-title) {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #1a1a1a;

  @media (max-width: 768px) {
    font-size: 24px;
  }
}

:deep(.order-number) {
  font-size: 18px;
  color: #666;

  @media (max-width: 768px) {
    font-size: 16px;
  }
}

:deep(.items-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;

  // Responsive table
  @media (max-width: 768px) {
    font-size: 12px;

    th,
    td {
      padding: 8px 4px !important;
    }
  }
}

:deep(.items-table th) {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
  font-weight: 600;
}

:deep(.items-table td) {
  border: 1px solid #ddd;
  padding: 10px 12px;
}
</style>
