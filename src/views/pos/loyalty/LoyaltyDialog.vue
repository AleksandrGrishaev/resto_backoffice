<!-- src/views/pos/loyalty/LoyaltyDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between bg-primary text-white">
        <span>Loyalty</span>
        <v-btn icon variant="text" size="small" @click="$emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-0">
        <LoyaltyPanel
          :order-id="orderId"
          :customer-id="customerId"
          :stamp-card-id="stampCardId"
          :initial-tab="initialTab"
          dialog-mode
          @update:customer="$emit('update:customer', $event)"
          @update:card="$emit('update:card', $event)"
          @convert-card="$emit('convert-card')"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import LoyaltyPanel from './LoyaltyPanel.vue'
import type { Customer } from '@/stores/customers'
import type { StampCardInfo } from '@/stores/loyalty'

defineProps<{
  modelValue: boolean
  orderId?: string
  customerId?: string | null
  stampCardId?: string | null
  initialTab?: 'card' | 'customer'
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  'update:customer': [customer: Customer | null]
  'update:card': [card: StampCardInfo | null]
  'convert-card': []
}>()
</script>
