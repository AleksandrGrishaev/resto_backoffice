<!-- src/views/pos/tables/dialogs/OrderTypeDialog.vue -->
<template>
  <v-dialog v-model="show" max-width="400" persistent @keydown.esc="onCancel">
    <v-card>
      <v-card-title class="text-h6 pa-4">New Order</v-card-title>

      <v-card-text class="pa-4">
        <div class="order-types d-flex flex-column gap-3">
          <!-- Dine-in Option -->
          <v-btn variant="outlined" size="large" color="primary" @click="selectDineIn">
            <v-icon icon="mdi-table-chair" class="me-2" />
            Dine-in
            <v-spacer />
            <span class="text-caption">Select table →</span>
          </v-btn>

          <!-- Takeaway Option -->
          <v-btn variant="outlined" size="large" color="primary" @click="createOrder('takeaway')">
            <v-icon icon="mdi-shopping" class="me-2" />
            Takeaway
          </v-btn>

          <!-- Delivery Option -->
          <v-btn variant="outlined" size="large" color="primary" @click="createOrder('delivery')">
            <v-icon icon="mdi-bike-fast" class="me-2" />
            Delivery
          </v-btn>
        </div>

        <!-- Instruction for dine-in -->
        <v-alert
          v-if="showDineInInstruction"
          type="info"
          variant="tonal"
          class="mt-4"
          density="compact"
        >
          Please select a free table to create dine-in order
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="onCancel">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { OrderType } from '@/stores/pos/types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'create-order': [type: OrderType]
  'select-dine-in': []
}>()

const show = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const showDineInInstruction = ref(false)

const createOrder = (type: OrderType) => {
  emit('create-order', type)
  show.value = false
  showDineInInstruction.value = false
}

const selectDineIn = () => {
  showDineInInstruction.value = true
  emit('select-dine-in')
  // Don't close dialog yet - let user see the instruction
  setTimeout(() => {
    show.value = false
    showDineInInstruction.value = false
  }, 1500)
}

const onCancel = () => {
  show.value = false
  showDineInInstruction.value = false
}
</script>

<style scoped>
.order-types .v-btn {
  justify-content: flex-start;
  text-transform: none;
  font-size: 16px;
  height: 56px;
}

.gap-3 {
  gap: 12px;
}
</style>
