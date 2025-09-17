<!-- src/views/pos/order/dialogs/BulkActionsDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6">
        Bulk Actions
        <v-chip size="small" class="ml-2">{{ selectedItems?.length || 0 }} items</v-chip>
      </v-card-title>

      <v-card-text>
        <div class="actions-grid">
          <!-- Move Items -->
          <v-card
            variant="outlined"
            class="pa-4 cursor-pointer action-card"
            @click="showMoveSection = !showMoveSection"
          >
            <div class="d-flex align-center">
              <v-icon icon="mdi-arrow-right" class="mr-3" color="primary" />
              <div>
                <div class="font-weight-medium">Move Items</div>
                <div class="text-caption text-grey">Move to another bill</div>
              </div>
            </div>
          </v-card>

          <!-- Apply Discount -->
          <v-card
            variant="outlined"
            class="pa-4 cursor-pointer action-card"
            @click="showDiscountSection = !showDiscountSection"
          >
            <div class="d-flex align-center">
              <v-icon icon="mdi-percent" class="mr-3" color="success" />
              <div>
                <div class="font-weight-medium">Apply Discount</div>
                <div class="text-caption text-grey">Bulk discount</div>
              </div>
            </div>
          </v-card>

          <!-- Remove Items -->
          <v-card
            variant="outlined"
            class="pa-4 cursor-pointer action-card"
            @click="$emit('remove-items')"
          >
            <div class="d-flex align-center">
              <v-icon icon="mdi-delete" class="mr-3" color="error" />
              <div>
                <div class="font-weight-medium">Remove Items</div>
                <div class="text-caption text-grey">Delete selected</div>
              </div>
            </div>
          </v-card>
        </div>

        <!-- Move Section -->
        <v-expand-transition>
          <div v-if="showMoveSection" class="mt-4">
            <v-divider class="mb-4" />
            <h4 class="text-subtitle-2 mb-2">Select target bill:</h4>
            <v-radio-group v-model="selectedBillId" density="compact">
              <v-radio
                v-for="bill in availableBills"
                :key="bill.id"
                :label="bill.name"
                :value="bill.id"
              />
            </v-radio-group>
            <v-btn
              color="primary"
              :disabled="!selectedBillId"
              class="mt-2"
              @click="$emit('move-items', selectedBillId)"
            >
              Move Items
            </v-btn>
          </div>
        </v-expand-transition>

        <!-- Discount Section -->
        <v-expand-transition>
          <div v-if="showDiscountSection" class="mt-4">
            <v-divider class="mb-4" />
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
              density="compact"
            />

            <v-btn
              color="success"
              class="mt-2"
              @click="$emit('apply-discount', { type: discountType, value: Number(discountValue) })"
            >
              Apply Discount
            </v-btn>
          </div>
        </v-expand-transition>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue: boolean
  selectedItems: any[]
  availableBills: any[]
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
  'move-items': [targetBillId: string]
  'apply-discount': [discount: { type: string; value: number }]
  'remove-items': []
}>()

const showMoveSection = ref(false)
const showDiscountSection = ref(false)
const selectedBillId = ref('')
const discountType = ref('percentage')
const discountValue = ref(0)
</script>

<style scoped>
.actions-grid {
  display: grid;
  gap: 12px;
}

.action-card:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.cursor-pointer {
  cursor: pointer;
}
</style>
