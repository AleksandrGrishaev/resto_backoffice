<!-- src/views/storage/components/AddReceiptItemDialog.vue - SIMPLE PLACEHOLDER -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>
        <h3>Add Product</h3>
      </v-card-title>

      <v-card-text class="pa-6">
        <!-- Simple Placeholder -->
        <div class="text-center py-8">
          <v-icon icon="mdi-hammer-wrench" size="64" class="text-medium-emphasis mb-4" />
          <div class="text-h6 mb-2">Under Construction</div>
          <div class="text-body-2 text-medium-emphasis">Add dialog will be here</div>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="handleClose">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// Props
interface Props {
  modelValue: boolean
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'add-item': [item: any] // Placeholder type
}>()

// Methods
function handleClose() {
  emit('update:modelValue', false)
}
</script>

<style lang="scss" scoped>
.v-card {
  .v-card-title {
    background: rgba(var(--v-theme-primary), 0.05);
  }
}
</style>
