<!-- src/views/recipes/components/widgets/InstructionsWidget.vue -->
<template>
  <div class="instructions-section pa-4">
    <h3 class="text-h6 mb-3 d-flex align-center">
      <v-icon icon="mdi-format-list-numbered" class="mr-2" />
      Instructions
    </h3>

    <div v-if="!getInstructions()" class="text-center text-medium-emphasis py-4">
      No instructions specified
    </div>

    <div v-else class="instructions-content">
      <!-- For preparations: simple text -->
      <div v-if="type === 'preparation'" class="instructions-text">
        <div class="instruction-text">{{ getInstructions() }}</div>
      </div>

      <!-- For recipes: step-by-step -->
      <div
        v-else-if="type === 'recipe' && hasStructuredInstructions()"
        class="structured-instructions"
      >
        <v-timeline density="compact" align="start">
          <v-timeline-item
            v-for="(step, index) in getStructuredInstructions()"
            :key="step.id"
            :dot-color="index === 0 ? 'primary' : 'grey-lighten-1'"
            size="small"
          >
            <div class="step-content">
              <div class="step-header">
                <span class="step-number">Step {{ step.stepNumber }}</span>
                <div v-if="step.duration || step.temperature" class="step-meta">
                  <v-chip
                    v-if="step.duration"
                    size="x-small"
                    color="info"
                    variant="tonal"
                    class="mr-1"
                  >
                    <v-icon icon="mdi-clock" size="12" class="mr-1" />
                    {{ step.duration }}m
                  </v-chip>
                  <v-chip v-if="step.temperature" size="x-small" color="warning" variant="tonal">
                    <v-icon icon="mdi-thermometer" size="12" class="mr-1" />
                    {{ step.temperature }}°C
                  </v-chip>
                </div>
              </div>
              <div class="step-instruction">{{ step.instruction }}</div>
              <div v-if="step.equipment?.length" class="step-equipment">
                <v-icon icon="mdi-tools" size="14" class="mr-1" />
                <span class="equipment-label">Equipment:</span>
                <span class="equipment-list">{{ step.equipment.join(', ') }}</span>
              </div>
            </div>
          </v-timeline-item>
        </v-timeline>
      </div>

      <!-- For recipes: simple text fallback -->
      <div v-else class="instructions-text">
        <div class="instruction-text">{{ getInstructions() }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Recipe, Preparation } from '@/stores/recipes/types'

interface Props {
  item: Recipe | Preparation
  type: 'recipe' | 'preparation'
}

const props = defineProps<Props>()

function getInstructions(): string {
  if (props.type === 'preparation') {
    return (props.item as Preparation).instructions || ''
  } else {
    const recipe = props.item as Recipe
    // Если есть структурированные инструкции, берем первую
    if (recipe.instructions && recipe.instructions.length > 0) {
      return recipe.instructions[0].instruction
    }
    return ''
  }
}

function hasStructuredInstructions(): boolean {
  if (props.type !== 'recipe') return false

  const recipe = props.item as Recipe
  return !!(
    recipe.instructions &&
    recipe.instructions.length > 0 &&
    recipe.instructions[0].stepNumber
  )
}

function getStructuredInstructions() {
  if (props.type !== 'recipe') return []

  const recipe = props.item as Recipe
  return recipe.instructions || []
}
</script>

<style lang="scss" scoped>
.instructions-content {
  line-height: 1.6;
}

.instruction-text {
  white-space: pre-wrap;
  color: var(--color-text-primary);
  padding: 16px;
  background: var(--color-surface-variant);
  border-radius: 8px;
  border-left: 4px solid var(--color-primary);
}

.structured-instructions {
  .step-content {
    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .step-number {
      font-weight: 700;
      color: var(--color-primary);
      font-size: 0.9rem;
    }

    .step-meta {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .step-instruction {
      margin-bottom: 8px;
      line-height: 1.5;
      padding: 12px;
      background: var(--color-surface-variant);
      border-radius: 6px;
    }

    .step-equipment {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
      padding: 8px;
      background: var(--color-info-lighten-5);
      border-radius: 4px;
      border-left: 3px solid var(--color-info);
    }

    .equipment-label {
      font-weight: 500;
    }

    .equipment-list {
      font-style: italic;
    }
  }
}

.instructions-text {
  .instruction-text {
    font-size: 0.95rem;
    line-height: 1.6;
  }
}

// Responsive design
@media (max-width: 768px) {
  .step-content {
    .step-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .step-meta {
      width: 100%;
    }
  }

  .step-equipment {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
