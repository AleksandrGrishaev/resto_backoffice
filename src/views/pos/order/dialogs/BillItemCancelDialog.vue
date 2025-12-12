<!-- src/views/pos/order/dialogs/BillItemCancelDialog.vue -->
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
        Cancel Item
      </v-card-title>

      <v-card-text>
        <div v-if="item">
          <!-- Item Info -->
          <div class="item-info pa-3 bg-grey-lighten-4 rounded mb-4">
            <div class="d-flex justify-space-between align-center">
              <div>
                <strong>{{ item.menuItemName }}</strong>
                <span v-if="item.variantName" class="text-body-2 ml-2 text-grey">
                  ({{ item.variantName }})
                </span>
              </div>
              <v-chip :color="getStatusColor(item.status)" size="small" variant="flat">
                {{ getStatusText(item.status) }}
              </v-chip>
            </div>
            <div class="text-body-2 mt-1">
              Quantity: {{ item.quantity }} &bull; {{ formatPrice(item.totalPrice) }}
            </div>
          </div>

          <!-- Blocked state for served/paid items -->
          <v-alert v-if="!canCancelResult.allowed" type="error" variant="tonal" class="mb-4">
            {{ canCancelResult.reason }}
          </v-alert>

          <!-- Draft items - simple confirmation -->
          <div v-else-if="isDraft">
            <p class="text-body-1">
              This item hasn't been sent to kitchen yet. It will be removed from the order.
            </p>
          </div>

          <!-- Non-draft items - require reason -->
          <div v-else>
            <p class="text-body-2 text-grey mb-3">
              This item has been sent to kitchen. Please select a reason for cancellation.
            </p>

            <!-- Cancellation Reason -->
            <v-select
              v-model="selectedReason"
              :items="reasonOptions"
              item-title="label"
              item-value="value"
              label="Cancellation Reason *"
              :rules="[v => !!v || 'Reason is required']"
              variant="outlined"
              density="comfortable"
            >
              <template #item="{ item: reasonItem, props: itemProps }">
                <v-list-item v-bind="itemProps">
                  <template #prepend>
                    <v-icon :color="reasonItem.raw.color" size="small">mdi-circle</v-icon>
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <!-- Notes for "Other" reason -->
            <v-textarea
              v-if="selectedReason === 'other'"
              v-model="notes"
              label="Please specify reason *"
              placeholder="Enter cancellation reason..."
              rows="2"
              variant="outlined"
              density="comfortable"
              :rules="[v => !!v || 'Please specify reason']"
              class="mt-2"
            />

            <!-- Write-off checkbox (for cooking/ready items) -->
            <v-checkbox
              v-if="showWriteOffOption"
              v-model="shouldWriteOff"
              color="warning"
              density="comfortable"
              class="mt-2"
            >
              <template #label>
                <div>
                  <span class="font-weight-medium">Write off ingredients</span>
                  <div class="text-caption text-grey">Deduct used ingredients from inventory</div>
                </div>
              </template>
            </v-checkbox>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="handleClose">Keep Item</v-btn>
        <v-btn
          color="error"
          :disabled="!canCancelResult.allowed || (!isDraft && !isFormValid)"
          :loading="loading"
          @click="handleConfirm"
        >
          {{ isDraft ? 'Remove Item' : 'Cancel Item' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PosBillItem, CancellationReason } from '@/stores/pos/types'
import { CANCELLATION_REASON_OPTIONS } from '@/stores/pos/types'
import { useCancellation } from '@/stores/pos/orders/composables'
import { formatIDR } from '@/utils/currency'

interface Props {
  modelValue: boolean
  cancellationItem: {
    item: PosBillItem
    orderId: string
    billId: string
  } | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [
    data: {
      itemId: string
      reason?: CancellationReason
      notes?: string
      shouldWriteOff: boolean
    }
  ]
  cancel: []
}>()

const { canCancel, shouldOfferWriteOff } = useCancellation()

// Form state
const selectedReason = ref<CancellationReason | null>(null)
const notes = ref('')
const shouldWriteOff = ref(false)
const loading = ref(false)

// Computed
const item = computed(() => props.cancellationItem?.item)

const isDraft = computed(() => item.value?.status === 'draft')

const canCancelResult = computed(() => {
  if (!item.value) return { allowed: false, reason: 'No item selected' }
  return canCancel(item.value)
})

const showWriteOffOption = computed(() => {
  if (!item.value) return false
  return shouldOfferWriteOff(item.value)
})

const isFormValid = computed(() => {
  if (isDraft.value) return true
  if (!selectedReason.value) return false
  if (selectedReason.value === 'other' && !notes.value.trim()) return false
  return true
})

const reasonOptions = CANCELLATION_REASON_OPTIONS

// Reset form when dialog opens
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      selectedReason.value = null
      notes.value = ''
      shouldWriteOff.value = showWriteOffOption.value // Default to true for cooking/ready
      loading.value = false
    }
  }
)

// Methods
const formatPrice = formatIDR

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'orange',
    waiting: 'info',
    cooking: 'purple',
    ready: 'success',
    served: 'primary',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    draft: 'Draft',
    waiting: 'Waiting',
    cooking: 'Cooking',
    ready: 'Ready',
    served: 'Served',
    cancelled: 'Cancelled'
  }
  return texts[status] || status
}

function handleClose() {
  emit('update:modelValue', false)
  emit('cancel')
}

function handleConfirm() {
  if (!item.value) return

  emit('confirm', {
    itemId: item.value.id,
    reason: isDraft.value ? undefined : selectedReason.value || undefined,
    notes: selectedReason.value === 'other' ? notes.value : undefined,
    shouldWriteOff: shouldWriteOff.value
  })
}
</script>
