<!-- src/views/pos/order/dialogs/BillItemCancelDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6">Cancel Item</v-card-title>

      <v-card-text>
        <div v-if="cancellationItem">
          <p>Are you sure you want to cancel this item?</p>
          <div class="item-info pa-3 bg-grey-lighten-4 rounded mt-3">
            <strong>{{ cancellationItem.item.menuItemName }}</strong>
            <br />
            <span class="text-body-2">Quantity: {{ cancellationItem.item.quantity }}</span>
          </div>

          <v-textarea
            label="Reason for cancellation"
            placeholder="Enter reason (optional)..."
            rows="3"
            class="mt-4"
          />
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancel')">Keep Item</v-btn>
        <v-btn color="error" @click="$emit('confirm', cancellationItem?.item.id, 'User cancelled')">
          Cancel Item
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  cancellationItem: any
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [itemId: string, reason: string]
  cancel: []
}>()
</script>
