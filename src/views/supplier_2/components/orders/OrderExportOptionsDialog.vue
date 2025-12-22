<!-- src/views/supplier_2/components/orders/OrderExportOptionsDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="400px">
    <v-card>
      <v-card-title class="d-flex align-center pa-4 bg-primary text-white">
        <v-icon icon="mdi-file-eye-outline" class="mr-2" />
        Preview Purchase Order
      </v-card-title>

      <v-card-text class="pa-4">
        <div v-if="order" class="mb-4">
          <div class="text-h6 font-weight-bold">{{ order.orderNumber }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ order.supplierName }}</div>
        </div>

        <v-divider class="mb-4" />

        <div class="text-subtitle-2 mb-3">Export Options</div>

        <v-radio-group v-model="exportMode" class="mt-0">
          <v-radio value="with_prices">
            <template #label>
              <div>
                <div class="font-weight-medium">With Prices</div>
                <div class="text-caption text-medium-emphasis">
                  Include package prices and total amounts
                </div>
              </div>
            </template>
          </v-radio>
          <v-radio value="quantities_only">
            <template #label>
              <div>
                <div class="font-weight-medium">Quantities Only</div>
                <div class="text-caption text-medium-emphasis">
                  Show only items and quantities (no prices)
                </div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="outlined" @click="close">Cancel</v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          :loading="loading"
          prepend-icon="mdi-eye-outline"
          @click="handlePrint"
        >
          Preview Order
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PurchaseOrder } from '@/stores/supplier_2/types'

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

const exportMode = ref<'with_prices' | 'quantities_only'>('with_prices')

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

function close() {
  isOpen.value = false
}

function handlePrint() {
  emits('print', {
    includePrices: exportMode.value === 'with_prices'
  })
}
</script>

<style scoped>
.text-medium-emphasis {
  opacity: 0.7;
}
</style>
