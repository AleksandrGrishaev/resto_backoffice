<!-- src/views/pos/order/dialogs/CancelOrderDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="450"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        <v-icon color="error" class="mr-2">mdi-cancel</v-icon>
        Cancel Order
      </v-card-title>

      <v-card-text>
        <!-- Order Info -->
        <div v-if="order" class="order-info pa-3 bg-grey-lighten-4 rounded mb-4">
          <div class="d-flex justify-space-between align-center">
            <strong>{{ order.orderNumber }}</strong>
            <v-chip size="small" variant="flat" color="grey">
              {{ itemCount }} item{{ itemCount !== 1 ? 's' : '' }}
            </v-chip>
          </div>
          <div v-if="order.customerName" class="text-body-2 mt-1 text-grey">
            {{ order.customerName }}
          </div>
        </div>

        <p class="text-body-2 mb-3">This will cancel the entire order and all its items.</p>

        <!-- Reason Input -->
        <v-textarea
          v-model="reason"
          label="Cancellation reason"
          placeholder="e.g. Customer changed mind, out of stock..."
          rows="2"
          variant="outlined"
          density="compact"
          :rules="[v => !!v?.trim() || 'Reason is required']"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Back</v-btn>
        <v-btn
          color="error"
          variant="flat"
          :disabled="!reason?.trim()"
          :loading="loading"
          @click="handleConfirm"
        >
          Cancel Order
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PosOrder } from '@/stores/pos/types'

interface Props {
  modelValue: boolean
  order: PosOrder | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [reason: string]
  cancel: []
}>()

const reason = ref('')
const loading = ref(false)

const itemCount = computed(() => {
  if (!props.order) return 0
  return props.order.bills.flatMap(b => b.items).filter(i => i.status !== 'cancelled').length
})

const handleConfirm = () => {
  if (!reason.value?.trim()) return
  emit('confirm', reason.value.trim())
}

const handleCancel = () => {
  reason.value = ''
  emit('cancel')
  emit('update:modelValue', false)
}
</script>
