<!-- src/views/pos/order/dialogs/BillItemEditDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Edit Item</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('cancel')" />
      </v-card-title>

      <v-card-text>
        <div v-if="editingItem">
          <h4>{{ editingItem.item.menuItemName }}</h4>
          <p class="text-body-2 text-grey">TODO: Item edit form will be here</p>

          <v-text-field
            label="Quantity"
            :model-value="editingItem.item.quantity"
            type="number"
            readonly
          />

          <v-text-field
            label="Notes"
            :model-value="editingItem.item.notes || ''"
            placeholder="Add special instructions..."
            readonly
          />
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancel')">Cancel</v-btn>
        <v-btn color="primary" @click="$emit('save', editingItem?.item)">Save Changes</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  editingItem: any
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
  save: [item: any]
  cancel: []
}>()
</script>
