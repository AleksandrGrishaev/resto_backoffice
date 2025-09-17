<!-- src/views/pos/order/dialogs/BillDiscountDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6">Apply Discount</v-card-title>

      <v-card-text>
        <div v-if="discountItem">
          <div class="item-info pa-3 bg-grey-lighten-4 rounded mb-4">
            <strong>{{ discountItem.item.menuItemName }}</strong>
            <br />
            <span class="text-body-2">
              Current Price: ${{ discountItem.item.totalPrice.toFixed(2) }}
            </span>
          </div>

          <v-radio-group v-model="discountType" inline>
            <v-radio label="Percentage" value="percentage" />
            <v-radio label="Fixed Amount" value="fixed" />
          </v-radio-group>

          <v-text-field
            v-model="discountValue"
            :label="discountType === 'percentage' ? 'Discount %' : 'Discount Amount'"
            :prefix="discountType === 'fixed' ? '$' : ''"
            :suffix="discountType === 'percentage' ? '%' : ''"
            type="number"
            min="0"
            :max="discountType === 'percentage' ? 100 : discountItem.item.totalPrice"
          />
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancel')">Cancel</v-btn>
        <v-btn
          color="primary"
          @click="
            $emit('apply', discountItem?.item.id, {
              type: discountType,
              value: Number(discountValue)
            })
          "
        >
          Apply Discount
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue: boolean
  discountItem: any
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
  apply: [itemId: string, discount: { type: string; value: number }]
  cancel: []
}>()

const discountType = ref('percentage')
const discountValue = ref(0)
</script>
