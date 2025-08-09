<!-- src/views/counteragents/components/counteragents/CounteragentCard.vue -->
<template>
  <!-- Dialog version -->
  <v-dialog
    v-if="!compact"
    :model-value="modelValue"
    max-width="600"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="counteragent-card">
      <v-card-title class="card-header">
        <div class="header-content">
          <div class="title-section">
            <v-icon icon="mdi-store" class="me-2" />
            Counteragent Details
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            color="white"
            @click="$emit('update:modelValue', false)"
          />
        </div>
      </v-card-title>

      <v-card-text v-if="counteragent" class="card-content">
        <CounteragentCardContent
          :counteragent="counteragent"
          detailed
          @edit="$emit('edit')"
          @delete="$emit('delete')"
        />
      </v-card-text>
      <v-card-text v-else class="card-content">
        <div class="no-data">No counteragent data available</div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Compact card version -->
  <v-card
    v-else-if="counteragent"
    class="counteragent-card compact"
    :class="{ selected: selected }"
    elevation="0"
    @click="$emit('click')"
  >
    <CounteragentCardContent
      :counteragent="counteragent"
      @edit="$emit('edit')"
      @delete="$emit('delete')"
    />
  </v-card>

  <!-- No data fallback -->
  <v-card v-else class="counteragent-card no-data-card" elevation="0">
    <v-card-text class="text-center pa-4">
      <v-icon icon="mdi-alert-circle" size="48" color="warning" />
      <div class="mt-2">No counteragent data</div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Counteragent } from '@/stores/counteragents'
import CounteragentCardContent from './CounteragentCardContent.vue'

interface Props {
  modelValue?: boolean
  counteragent?: Counteragent
  compact?: boolean
  selected?: boolean
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  compact: false,
  selected: false
})

defineEmits<{
  'update:modelValue': [value: boolean]
  edit: []
  delete: []
  click: []
}>()
</script>

<style scoped>
.counteragent-card {
  border: 1px solid #333;
  background-color: rgb(var(--v-theme-surface));
}

.counteragent-card.compact {
  cursor: pointer;
  transition: all 0.3s ease;
}

.counteragent-card.compact:hover {
  border-color: #1976d2;
}

.counteragent-card.selected {
  border: 2px solid #1976d2;
  background-color: rgba(25, 118, 210, 0.1);
}

.card-header {
  background: #000;
  color: white;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.title-section {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 1.1rem;
  color: white;
}

.card-content {
  padding: 20px;
  background-color: rgb(var(--v-theme-surface));
}

.no-data {
  text-align: center;
  color: #ccc;
  font-style: italic;
}

.no-data-card {
  border: 1px solid #333;
  background-color: rgb(var(--v-theme-surface));
}
</style>
