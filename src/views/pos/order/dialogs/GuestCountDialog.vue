<!-- src/views/pos/order/dialogs/GuestCountDialog.vue -->
<!-- Quick tap dialog to select guest count (1-9) for dine-in orders -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="320"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="guest-count-dialog">
      <v-card-title class="dialog-title">
        <v-icon start>mdi-account-group</v-icon>
        How many guests?
      </v-card-title>

      <v-card-text class="dialog-content">
        <div class="guest-grid">
          <button v-for="n in 9" :key="n" class="guest-btn" @click="handleSelect(n)">
            {{ n }}
          </button>
        </div>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-spacer />
        <v-btn variant="text" @click="handleSkip">Skip</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [count: number]
}>()

function handleSelect(count: number) {
  emit('confirm', count)
  emit('update:modelValue', false)
}

function handleSkip() {
  emit('confirm', 1)
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.guest-count-dialog {
  border-radius: 16px !important;
}

.dialog-title {
  text-align: center;
  font-size: 18px;
  padding: 16px 16px 8px;
}

.dialog-content {
  padding: 8px 16px 16px;
}

.guest-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.guest-btn {
  width: 100%;
  aspect-ratio: 1;
  max-height: 80px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 28px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 60px;

  &:hover {
    background: rgba(var(--v-theme-primary), 0.15);
    border-color: rgb(var(--v-theme-primary));
  }

  &:active {
    transform: scale(0.95);
    background: rgba(var(--v-theme-primary), 0.3);
  }
}

.dialog-actions {
  padding: 0 16px 12px;
}
</style>
