<!-- src/views/pos/order/dialogs/MoveItemsDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6">Move Items to Bill</v-card-title>

      <v-card-text>
        <!-- No target bills available -->
        <div v-if="!targetBills?.length" class="text-center py-4">
          <v-icon size="48" color="grey" class="mb-2">mdi-alert-circle-outline</v-icon>
          <p class="text-body-1 text-grey">No other bills available to move items to.</p>
          <p class="text-body-2 text-grey">Create a new bill first.</p>
        </div>

        <!-- Normal flow with target bills -->
        <div v-else-if="selectedItems?.length">
          <p class="mb-4">Moving {{ selectedItems.length }} item(s) to:</p>

          <v-radio-group v-model="selectedBillId">
            <v-radio
              v-for="bill in targetBills"
              :key="bill.id"
              :label="bill.name"
              :value="bill.id"
            />
          </v-radio-group>

          <v-divider class="my-4" />

          <div class="items-preview">
            <h4 class="text-subtitle-2 mb-2">Items to move:</h4>
            <div
              v-for="item in selectedItems"
              :key="item.id"
              class="item-preview pa-2 bg-grey-lighten-5 rounded mb-1"
            >
              <span class="font-weight-medium">{{ item.menuItemName }}</span>
              <span class="text-body-2 ml-2">× {{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancel')">Cancel</v-btn>
        <v-btn
          v-if="targetBills?.length"
          color="primary"
          :disabled="!selectedBillId"
          @click="$emit('confirm', selectedBillId)"
        >
          Move Items
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue: boolean
  sourceBill: any
  targetBills: any[]
  selectedItems: any[]
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [targetBillId: string]
  cancel: []
}>()

const selectedBillId = ref<string>('')
</script>
