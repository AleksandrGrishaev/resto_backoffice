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

        <!-- Structured Reason Dropdown -->
        <v-select
          v-model="selectedReason"
          :items="reasonOptions"
          item-title="label"
          item-value="value"
          label="Cancellation Reason"
          variant="outlined"
          density="compact"
          class="mb-3"
          :rules="[v => !!v || 'Reason is required']"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps">
              <template #prepend>
                <v-icon :color="item.raw.color" size="small">mdi-circle</v-icon>
              </template>
            </v-list-item>
          </template>
        </v-select>

        <!-- Notes Textarea -->
        <v-textarea
          v-model="notes"
          label="Additional notes"
          placeholder="e.g. Customer changed mind, specific details..."
          rows="2"
          variant="outlined"
          density="compact"
          :rules="
            selectedReason === 'other' ? [v => !!v?.trim() || 'Notes required for Other'] : []
          "
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Back</v-btn>
        <v-btn color="error" variant="flat" :disabled="!isValid" @click="handleConfirm">
          Cancel Order
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PosOrder, CancellationReason } from '@/stores/pos/types'
import { CANCELLATION_REASON_OPTIONS } from '@/stores/pos/types'

interface Props {
  modelValue: boolean
  order: PosOrder | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: { reason: CancellationReason; notes: string }]
  cancel: []
}>()

const selectedReason = ref<CancellationReason | null>(null)
const notes = ref('')

// Filter out 'staff_cancelled' — it's an internal reason, not user-selectable
const reasonOptions = CANCELLATION_REASON_OPTIONS.filter(o => o.value !== 'staff_cancelled')

// Reset when dialog opens
watch(
  () => props.modelValue,
  open => {
    if (open) {
      selectedReason.value = null
      notes.value = ''
    }
  }
)

const itemCount = computed(() => {
  if (!props.order) return 0
  return props.order.bills.flatMap(b => b.items).filter(i => i.status !== 'cancelled').length
})

const isValid = computed(() => {
  if (!selectedReason.value) return false
  if (selectedReason.value === 'other' && !notes.value?.trim()) return false
  return true
})

const handleConfirm = () => {
  if (!isValid.value || !selectedReason.value) return
  emit('confirm', {
    reason: selectedReason.value,
    notes: notes.value.trim()
  })
}

const handleCancel = () => {
  selectedReason.value = null
  notes.value = ''
  emit('cancel')
  emit('update:modelValue', false)
}
</script>
