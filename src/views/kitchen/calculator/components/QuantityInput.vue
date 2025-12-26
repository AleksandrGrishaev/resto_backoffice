<!-- src/views/kitchen/calculator/components/QuantityInput.vue -->
<template>
  <div class="quantity-input">
    <!-- No Selection State -->
    <div v-if="!preparation" class="no-selection">
      <v-icon size="64" color="grey-darken-1">mdi-gesture-tap</v-icon>
      <span class="no-selection-text">Select a preparation</span>
      <span class="no-selection-hint">Choose from the list on the left</span>
    </div>

    <!-- Input Section -->
    <div v-else class="input-section">
      <!-- Preparation Info -->
      <div class="prep-info">
        <h2 class="prep-name">{{ preparation.name }}</h2>
        <div class="prep-output">
          <span class="label">Recipe output:</span>
          <span class="value">{{ outputInfo }}</span>
        </div>
      </div>

      <!-- Quantity Input with +/- buttons -->
      <div class="quantity-field">
        <label class="field-label">Target quantity</label>
        <div class="input-controls">
          <!-- Minus Button -->
          <v-btn
            icon
            variant="tonal"
            color="primary"
            size="x-large"
            class="control-btn"
            :disabled="modelValue <= 0"
            @click="decrementQuantity"
          >
            <v-icon size="32">mdi-minus</v-icon>
          </v-btn>

          <!-- Quantity Display -->
          <div class="quantity-display" @click="openNumberInput">
            <span class="quantity-value">{{ modelValue }}</span>
            <span class="quantity-unit">{{ currentUnitLabel }}</span>
          </div>

          <!-- Plus Button -->
          <v-btn
            icon
            variant="tonal"
            color="primary"
            size="x-large"
            class="control-btn"
            @click="incrementQuantity"
          >
            <v-icon size="32">mdi-plus</v-icon>
          </v-btn>
        </div>

        <!-- Unit Toggle (only if multiple units available) -->
        <v-btn-toggle
          v-if="availableUnits.length > 1"
          :model-value="selectedUnit"
          mandatory
          color="primary"
          variant="outlined"
          class="unit-toggle"
          @update:model-value="handleUnitChange"
        >
          <v-btn v-for="unit in availableUnits" :key="unit" :value="unit" class="unit-btn">
            {{ getUnitLabel(unit) }}
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- Quick Presets -->
      <div v-if="showPresets" class="presets-section">
        <span class="presets-label">Quick select:</span>
        <div class="presets-buttons">
          <v-btn
            v-for="preset in presets"
            :key="preset"
            variant="tonal"
            size="small"
            class="preset-btn"
            @click="handlePresetClick(preset)"
          >
            {{ preset }}{{ unitSuffix }}
          </v-btn>
        </div>
      </div>

      <!-- Scale Factor Info -->
      <div v-if="modelValue > 0" class="scale-info">
        <v-icon size="18" class="mr-1">mdi-resize</v-icon>
        Scale factor:
        <strong>{{ scaleFactor }}x</strong>
      </div>
    </div>

    <!-- Number Input Dialog -->
    <v-dialog v-model="showNumberDialog" max-width="320">
      <v-card>
        <v-card-title>Enter quantity</v-card-title>
        <v-card-text>
          <v-text-field
            v-model.number="dialogQuantity"
            type="number"
            variant="outlined"
            :suffix="currentUnitLabel"
            autofocus
            hide-details
            class="dialog-input"
            inputmode="decimal"
            @keyup.enter="confirmNumberInput"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showNumberDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="confirmNumberInput">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Preparation } from '@/stores/recipes/types'
import { useRecipeScaling, type TargetUnit } from '../composables/useRecipeScaling'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  preparation: Preparation | null
  modelValue: number
  selectedUnit: TargetUnit
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'update:selectedUnit': [unit: TargetUnit]
}>()

// =============================================
// COMPOSABLES
// =============================================

const { getAvailableUnits, getOutputInfo, getUnitLabel: getUnitLabelFn } = useRecipeScaling()

// =============================================
// STATE
// =============================================

const showNumberDialog = ref(false)
const dialogQuantity = ref(0)

// =============================================
// COMPUTED
// =============================================

const availableUnits = computed(() => getAvailableUnits(props.preparation))

const outputInfo = computed(() => getOutputInfo(props.preparation))

const getUnitLabel = (unit: TargetUnit): string => {
  return getUnitLabelFn(unit, props.preparation)
}

const currentUnitLabel = computed(() => getUnitLabel(props.selectedUnit))

const unitSuffix = computed(() => {
  if (props.selectedUnit === 'portion') return ' pcs'
  if (props.selectedUnit === 'ml') return ' ml'
  if (props.selectedUnit === 'pc') return ' pcs'
  return ' g'
})

/**
 * Step size for +/- buttons
 */
const stepSize = computed(() => {
  if (props.selectedUnit === 'portion' || props.selectedUnit === 'pc') return 1
  if (props.selectedUnit === 'ml') return 50
  return 50 // grams
})

/**
 * Calculate scale factor for display
 */
const scaleFactor = computed(() => {
  if (!props.preparation || props.modelValue <= 0) return 0

  const outputQty = props.preparation.outputQuantity

  // For portion-type preparations
  if (props.preparation.portionType === 'portion') {
    if (props.selectedUnit === 'portion') {
      return Math.round((props.modelValue / outputQty) * 100) / 100
    } else {
      const totalRecipeOutput = outputQty * (props.preparation.portionSize || 1)
      return Math.round((props.modelValue / totalRecipeOutput) * 100) / 100
    }
  }

  // For weight-type
  return Math.round((props.modelValue / outputQty) * 100) / 100
})

/**
 * Show presets only for weight-type preparations (gram/ml)
 */
const showPresets = computed(() => {
  return (
    props.preparation &&
    props.preparation.portionType !== 'portion' &&
    props.selectedUnit !== 'portion' &&
    props.selectedUnit !== 'pc'
  )
})

/**
 * Generate smart presets based on preparation output
 */
const presets = computed(() => {
  if (!props.preparation) return []

  const output = props.preparation.outputQuantity

  // Generate useful presets based on output quantity
  if (output >= 1000) {
    return [100, 250, 500, 1000]
  } else if (output >= 500) {
    return [50, 100, 250, 500]
  } else if (output >= 100) {
    return [25, 50, 100, 200]
  } else {
    return [10, 25, 50, 100]
  }
})

// =============================================
// METHODS
// =============================================

const incrementQuantity = () => {
  emit('update:modelValue', props.modelValue + stepSize.value)
}

const decrementQuantity = () => {
  const newValue = Math.max(0, props.modelValue - stepSize.value)
  emit('update:modelValue', newValue)
}

const openNumberInput = () => {
  dialogQuantity.value = props.modelValue
  showNumberDialog.value = true
}

const confirmNumberInput = () => {
  emit('update:modelValue', dialogQuantity.value || 0)
  showNumberDialog.value = false
}

const handleUnitChange = (unit: TargetUnit) => {
  emit('update:selectedUnit', unit)
}

const handlePresetClick = (preset: number) => {
  emit('update:modelValue', preset)
}
</script>

<style scoped lang="scss">
.quantity-input {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: var(--spacing-xl);
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.no-selection-text {
  font-size: var(--text-xl);
  font-weight: 600;
  margin-top: var(--spacing-md);
}

.no-selection-hint {
  font-size: var(--text-base);
  margin-top: var(--spacing-xs);
  opacity: 0.7;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
}

.prep-info {
  padding: var(--spacing-md);
  background: rgba(var(--v-theme-primary), 0.08);
  border-radius: 12px;
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.prep-name {
  font-size: var(--text-2xl);
  font-weight: 700;
  margin: 0 0 var(--spacing-sm) 0;
  line-height: 1.2;
}

.prep-output {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-lg);
}

.prep-output .label {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.prep-output .value {
  font-weight: 600;
}

.quantity-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  align-items: center;
}

.field-label {
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

/* New +/- control layout */
.input-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.control-btn {
  width: 72px !important;
  height: 72px !important;
  border-radius: 50% !important;
}

.quantity-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 180px;
  padding: var(--spacing-lg) var(--spacing-xl);
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.1);
  }
}

.quantity-value {
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
  color: rgb(var(--v-theme-primary));
}

.quantity-unit {
  font-size: var(--text-xl);
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: var(--spacing-xs);
}

.unit-toggle {
  height: auto;
}

.unit-btn {
  min-width: 100px;
  height: 48px !important;
  font-size: var(--text-base);
  font-weight: 600;
  text-transform: none;
}

.presets-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  align-items: center;
}

.presets-label {
  font-size: var(--text-sm);
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.presets-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  justify-content: center;
}

.preset-btn {
  font-weight: 600;
}

.scale-info {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 8px;
  font-size: var(--text-base);
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.scale-info strong {
  color: rgb(var(--v-theme-primary));
  margin-left: var(--spacing-xs);
}

/* Dialog input */
.dialog-input {
  :deep(.v-field__input) {
    font-size: var(--text-2xl);
    font-weight: 600;
    text-align: center;
  }
}

/* Responsive */
@media (max-width: 600px) {
  .control-btn {
    width: 64px !important;
    height: 64px !important;
  }

  .quantity-display {
    min-width: 140px;
    padding: var(--spacing-md) var(--spacing-lg);
  }

  .quantity-value {
    font-size: 48px;
  }

  .unit-toggle {
    width: 100%;
  }

  .unit-btn {
    flex: 1;
  }
}
</style>
