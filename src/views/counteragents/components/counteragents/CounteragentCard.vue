<!-- src/views/counteragents/components/counteragents/CounteragentCard.vue -->
<template>
  <!-- Dialog version -->
  <v-dialog
    v-if="!compact"
    :model-value="modelValue"
    max-width="700px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="counteragent-card">
      <v-card-title class="card-header">
        <div class="header-content">
          <div class="title-section">
            <v-icon icon="mdi-store" class="me-2" />
            {{ counteragent?.name || 'Counteragent Details' }}
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            color="white"
            @click="$emit('update:modelValue', false)"
          />
        </div>
      </v-card-title>

      <div v-if="counteragent" class="card-body">
        <!-- ✅ ПРОСТЫЕ ВКЛАДКИ только если поставщик -->
        <v-tabs v-if="counteragent.type === 'supplier'" v-model="activeTab" class="tabs-header">
          <v-tab value="details">Details</v-tab>
          <v-tab value="payments">
            Payments & Balance
            <!-- Показываем индикатор если есть баланс -->
            <v-chip
              v-if="hasBalance"
              :color="balanceColor"
              size="x-small"
              variant="flat"
              class="ml-2"
            >
              {{ balanceText }}
            </v-chip>
          </v-tab>
        </v-tabs>

        <!-- Контент вкладок -->
        <div v-if="counteragent.type === 'supplier'" class="tabs-content">
          <!-- Вкладка Details -->
          <div v-if="activeTab === 'details'" class="pa-4">
            <CounteragentCardContent
              :counteragent="counteragent"
              detailed
              @edit="$emit('edit')"
              @delete="$emit('delete')"
            />
          </div>

          <!-- ✅ ПРОСТАЯ вкладка Payments -->
          <div v-if="activeTab === 'payments'" class="pa-4">
            <CounteragentPaymentsSimple :counteragent="counteragent" />
          </div>
        </div>

        <!-- Если НЕ поставщик - показываем только детали без вкладок -->
        <div v-else class="pa-4">
          <CounteragentCardContent
            :counteragent="counteragent"
            detailed
            @edit="$emit('edit')"
            @delete="$emit('delete')"
          />
        </div>
      </div>

      <div v-else class="card-body">
        <div class="no-data pa-4">No counteragent data available</div>
      </div>
    </v-card>
  </v-dialog>

  <!-- Compact card version (без изменений) -->
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
import { ref, computed } from 'vue'
import type { Counteragent } from '@/stores/counteragents'
import { useCounteragentBalance } from '@/stores/counteragents/composables/useCounteragentBalance'
import CounteragentCardContent from './CounteragentCardContent.vue'
import CounteragentPaymentsSimple from './CounteragentPaymentsSimple.vue'

interface Props {
  modelValue?: boolean
  counteragent?: Counteragent
  compact?: boolean
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
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

// State
const activeTab = ref('details')

// Composables
const { getBalanceColor, getBalanceText } = useCounteragentBalance()

// Computed
const hasBalance = computed(() => {
  return (props.counteragent?.currentBalance || 0) !== 0
})

const balanceColor = computed(() => {
  return getBalanceColor(props.counteragent?.currentBalance || 0)
})

const balanceText = computed(() => {
  const balance = props.counteragent?.currentBalance || 0
  return balance > 0 ? 'Credit' : 'Debt'
})
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
}

.card-body {
  background-color: rgb(var(--v-theme-surface));
}

.tabs-header {
  border-bottom: 1px solid #333;
}

.tabs-content {
  min-height: 400px;
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
