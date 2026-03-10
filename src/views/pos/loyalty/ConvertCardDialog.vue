<!-- src/views/pos/loyalty/ConvertCardDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="420"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center bg-deep-purple text-white">
        <v-icon class="mr-2">mdi-swap-horizontal</v-icon>
        Convert Stamps to Points
      </v-card-title>

      <v-card-text class="pt-4">
        <!-- Loading -->
        <div v-if="loading" class="text-center py-4">
          <v-progress-circular indeterminate color="deep-purple" />
          <div class="text-body-2 mt-2">Converting...</div>
        </div>

        <!-- Result -->
        <div v-else-if="result" class="text-center py-2">
          <v-icon size="48" color="success" class="mb-2">mdi-check-circle</v-icon>
          <div class="text-h6 mb-3">Conversion Complete!</div>
          <div class="conversion-details pa-3 rounded bg-grey-lighten-4">
            <div class="d-flex justify-space-between mb-1">
              <span class="text-body-2">Stamps converted:</span>
              <span class="text-body-2 font-weight-medium">{{ result.stamps }}</span>
            </div>
            <div class="d-flex justify-space-between mb-1">
              <span class="text-body-2">Base value:</span>
              <span class="text-body-2">{{ formatIDR(result.baseAmount) }}</span>
            </div>
            <div class="d-flex justify-space-between mb-1">
              <span class="text-body-2">Cashback ({{ result.cashbackPct }}%):</span>
              <span class="text-body-2">{{ formatIDR(result.points) }}</span>
            </div>
            <div v-if="result.bonus > 0" class="d-flex justify-space-between mb-1">
              <span class="text-body-2 text-success">Conversion bonus:</span>
              <span class="text-body-2 text-success">+{{ formatIDR(result.bonus) }}</span>
            </div>
            <v-divider class="my-2" />
            <div class="d-flex justify-space-between">
              <span class="text-body-1 font-weight-bold">Total points:</span>
              <span class="text-body-1 font-weight-bold text-deep-purple">
                {{ formatIDR(result.totalPoints) }}
              </span>
            </div>
            <div class="d-flex justify-space-between mt-1">
              <span class="text-body-2 text-medium-emphasis">New balance:</span>
              <span class="text-body-2">{{ formatIDR(result.newBalance) }}</span>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="text-center py-2">
          <v-icon size="48" color="error" class="mb-2">mdi-alert-circle</v-icon>
          <div class="text-body-1">{{ error }}</div>
        </div>

        <!-- Confirmation -->
        <div v-else>
          <div class="text-body-1 mb-3">
            Convert all stamps on card
            <strong>#{{ cardNumber }}</strong>
            into loyalty points for
            <strong>{{ customerName }}</strong>
            ?
          </div>
          <v-alert type="info" variant="tonal" density="compact" class="mb-2">
            <div class="text-body-2">
              {{ stamps }} stamp(s) will be converted using {{ cashbackPct }}% cashback rate
              <template v-if="bonusPct > 0">+ {{ bonusPct }}% conversion bonus</template>
              . The card will be closed after conversion.
            </div>
          </v-alert>
        </div>
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <template v-if="result || error">
          <v-btn variant="flat" color="primary" @click="close">Done</v-btn>
        </template>
        <template v-else>
          <v-btn variant="text" :disabled="loading" @click="close">Cancel</v-btn>
          <v-btn variant="flat" color="deep-purple" :loading="loading" @click="doConvert">
            Convert
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLoyaltyStore } from '@/stores/loyalty'
import type { ConvertResult } from '@/stores/loyalty'
import { formatIDR } from '@/utils'

const props = defineProps<{
  modelValue: boolean
  cardNumber: string
  customerId: string
  customerName: string
  stamps: number
  cashbackPct: number
  bonusPct: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  converted: [result: ConvertResult]
}>()

const loyaltyStore = useLoyaltyStore()
const loading = ref(false)
const result = ref<ConvertResult | null>(null)
const error = ref('')

async function doConvert() {
  loading.value = true
  error.value = ''

  try {
    const r = await loyaltyStore.convertCard(props.cardNumber, props.customerId)
    if (r.success) {
      result.value = r
      emit('converted', r)
    } else {
      error.value = r.error || 'Conversion failed'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Conversion failed'
  } finally {
    loading.value = false
  }
}

function close() {
  result.value = null
  error.value = ''
  emit('update:modelValue', false)
}
</script>
