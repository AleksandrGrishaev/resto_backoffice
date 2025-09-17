<!-- src/views/pos/order/dialogs/OrderTypeDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6">Change Order Type</v-card-title>

      <v-card-text>
        <p class="mb-4">Select new order type:</p>

        <v-radio-group v-model="selectedType">
          <v-radio value="dine_in">
            <template #label>
              <div class="d-flex align-center">
                <v-icon icon="mdi-table-chair" class="mr-2" />
                <div>
                  <div>Dine In</div>
                  <div class="text-caption text-grey">Table service</div>
                </div>
              </div>
            </template>
          </v-radio>

          <v-radio value="takeaway">
            <template #label>
              <div class="d-flex align-center">
                <v-icon icon="mdi-shopping" class="mr-2" />
                <div>
                  <div>Takeaway</div>
                  <div class="text-caption text-grey">Customer pickup</div>
                </div>
              </div>
            </template>
          </v-radio>

          <v-radio value="delivery">
            <template #label>
              <div class="d-flex align-center">
                <v-icon icon="mdi-bike-fast" class="mr-2" />
                <div>
                  <div>Delivery</div>
                  <div class="text-caption text-grey">Deliver to customer</div>
                </div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" @click="$emit('confirm', selectedType)">Change Type</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  currentOrder: any
}

const props = defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [orderType: string]
}>()

const selectedType = ref('dine_in')

watch(
  () => props.currentOrder,
  order => {
    if (order?.type) {
      selectedType.value = order.type
    }
  },
  { immediate: true }
)
</script>
