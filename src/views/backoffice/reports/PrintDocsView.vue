<template>
  <div class="print-docs-view">
    <v-container fluid>
      <!-- Header -->
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-2">Print Documents</h1>
          <p class="text-body-2 text-medium-emphasis">
            Generate printable documents for inventory counts and operations
          </p>
        </v-col>
      </v-row>

      <!-- Document Categories -->
      <v-row>
        <!-- Inventory Documents -->
        <v-col cols="12">
          <h2 class="text-h6 mb-3">
            <v-icon start>mdi-clipboard-check-outline</v-icon>
            Inventory
          </h2>
        </v-col>

        <v-col v-for="doc in inventoryDocuments" :key="doc.id" cols="12" sm="6" md="4">
          <v-card variant="outlined" class="document-card">
            <v-card-item>
              <template #prepend>
                <v-avatar color="primary" variant="tonal" size="48">
                  <v-icon>{{ doc.icon }}</v-icon>
                </v-avatar>
              </template>
              <v-card-title>{{ doc.name }}</v-card-title>
              <v-card-subtitle>{{ doc.description }}</v-card-subtitle>
            </v-card-item>
            <v-card-actions>
              <v-spacer />
              <v-btn color="primary" variant="tonal" @click="openDocumentDialog(doc)">
                <v-icon start>mdi-file-document-plus</v-icon>
                Generate
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Future: Operations Documents -->
      <!--
      <v-row class="mt-6">
        <v-col cols="12">
          <h2 class="text-h6 mb-3">
            <v-icon start>mdi-clipboard-list</v-icon>
            Operations
          </h2>
        </v-col>
      </v-row>
      -->
    </v-container>

    <!-- Inventory Sheet Options Dialog -->
    <InventorySheetOptionsDialog
      v-model="showOptionsDialog"
      :document-type="selectedDocumentType"
      :loading="generating"
      @generate="handleGenerate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PRINT_DOCUMENTS, type PrintDocumentConfig } from '@/core/export'
import InventorySheetOptionsDialog from './dialogs/InventorySheetOptionsDialog.vue'
import { useInventorySheet } from './composables/useInventorySheet'

// Filter documents by category
const inventoryDocuments = computed(() =>
  PRINT_DOCUMENTS.filter(doc => doc.category === 'inventory')
)

// Dialog state
const showOptionsDialog = ref(false)
const selectedDocumentType = ref<'products' | 'preparations'>('products')
const generating = ref(false)

// Composable for generating sheets
const { generateProductsSheet, generatePreparationsSheet } = useInventorySheet()

function openDocumentDialog(doc: PrintDocumentConfig) {
  // Determine document type from id
  if (doc.id === 'inventory-products') {
    selectedDocumentType.value = 'products'
  } else if (doc.id === 'inventory-preparations') {
    selectedDocumentType.value = 'preparations'
  }
  showOptionsDialog.value = true
}

async function handleGenerate(options: {
  department: 'kitchen' | 'bar' | 'all'
  includeZeroStock: boolean
  sortBy: 'name' | 'code' | 'category'
  showSignatureLine: boolean
}) {
  generating.value = true

  try {
    if (selectedDocumentType.value === 'products') {
      await generateProductsSheet({
        documentType: 'products',
        department: options.department,
        includeZeroStock: options.includeZeroStock,
        sortBy: options.sortBy,
        showSignatureLine: options.showSignatureLine,
        countDate: new Date().toISOString().split('T')[0]
      })
    } else {
      await generatePreparationsSheet({
        documentType: 'preparations',
        department: options.department,
        includeZeroStock: options.includeZeroStock,
        sortBy: options.sortBy,
        showSignatureLine: options.showSignatureLine,
        countDate: new Date().toISOString().split('T')[0]
      })
    }
    showOptionsDialog.value = false
  } finally {
    generating.value = false
  }
}
</script>

<style scoped lang="scss">
.print-docs-view {
  padding-bottom: 2rem;
}

.document-card {
  height: 100%;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgb(var(--v-theme-primary));
  }
}
</style>
