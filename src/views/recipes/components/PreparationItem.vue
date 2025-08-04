<!-- src/views/recipes/components/PreparationItem.vue -->
<template>
  <div class="preparation-item" :class="{ 'preparation-item--inactive': !preparation.isActive }">
    <div class="preparation-item__main">
      <div class="preparation-item__left">
        <div class="preparation-item__header">
          <div class="preparation-item__code">{{ preparation.code }}</div>
          <div class="preparation-item__name">{{ preparation.name }}</div>
          <v-chip
            size="x-small"
            :color="getCategoryColor(preparation.category)"
            variant="tonal"
            class="ml-2"
          >
            {{ getCategoryText(preparation.category) }}
          </v-chip>
        </div>

        <div v-if="preparation.description" class="preparation-item__description">
          {{ preparation.description }}
        </div>

        <div class="preparation-item__details">
          <div class="preparation-item__output">
            <v-icon icon="mdi-package-variant" size="14" class="mr-1" />
            Output: {{ preparation.outputQuantity }} {{ preparation.outputUnit }}
          </div>

          <div v-if="preparation.preparationTime" class="preparation-item__time">
            <v-icon icon="mdi-clock-outline" size="14" class="mr-1" />
            {{ preparation.preparationTime }} minutes
          </div>

          <div v-if="preparation.costPerPortion" class="preparation-item__cost">
            <v-icon icon="mdi-currency-usd" size="14" class="mr-1" />
            ${{ preparation.costPerPortion.toFixed(2) }} per portion
          </div>
        </div>

        <div v-if="preparation.recipe?.length" class="preparation-item__recipe">
          <v-icon icon="mdi-format-list-bulleted" size="14" class="mr-1" />
          <span class="recipe-label">Recipe:</span>
          <span class="recipe-count">{{ preparation.recipe.length }} products</span>
        </div>

        <div v-if="preparation.instructions" class="preparation-item__instructions">
          <v-icon icon="mdi-text" size="14" class="mr-1" />
          <span class="instructions-preview">{{ getInstructionsPreview() }}</span>
        </div>
      </div>

      <div class="preparation-item__actions">
        <v-menu>
          <template #activator="{ props }">
            <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
          </template>
          <v-list>
            <v-list-item @click="$emit('view', preparation)">
              <template #prepend>
                <v-icon icon="mdi-eye" />
              </template>
              <v-list-item-title>View Details</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('edit', preparation)">
              <template #prepend>
                <v-icon icon="mdi-pencil" />
              </template>
              <v-list-item-title>Edit</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('calculate-cost', preparation)">
              <template #prepend>
                <v-icon icon="mdi-calculator" />
              </template>
              <v-list-item-title>Calculate Cost</v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item
              :class="{ 'text-error': preparation.isActive }"
              @click="$emit('toggle-status', preparation)"
            >
              <template #prepend>
                <v-icon :icon="preparation.isActive ? 'mdi-archive' : 'mdi-archive-remove'" />
              </template>
              <v-list-item-title>
                {{ preparation.isActive ? 'Archive' : 'Restore' }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PREPARATION_CATEGORIES } from '@/stores/recipes/types'
import type { Preparation } from '@/stores/recipes/types'

interface Props {
  preparation: Preparation
}

interface Emits {
  (e: 'view', preparation: Preparation): void
  (e: 'edit', preparation: Preparation): void
  (e: 'calculate-cost', preparation: Preparation): void
  (e: 'toggle-status', preparation: Preparation): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

// Methods
function getCategoryColor(category: string): string {
  const categoryData = PREPARATION_CATEGORIES.find(c => c.value === category)
  switch (category) {
    case 'sauce':
      return 'red'
    case 'garnish':
      return 'green'
    case 'marinade':
      return 'blue'
    case 'semifinished':
      return 'orange'
    case 'seasoning':
      return 'purple'
    default:
      return 'grey'
  }
}

function getCategoryText(category: string): string {
  const categoryData = PREPARATION_CATEGORIES.find(c => c.value === category)
  return categoryData?.text || category
}

function getInstructionsPreview(): string {
  if (!props.preparation.instructions) return ''
  const preview = props.preparation.instructions.slice(0, 80)
  return preview.length < props.preparation.instructions.length ? `${preview}...` : preview
}
</script>

<style lang="scss" scoped>
.preparation-item {
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-outline-variant);
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    transform: translateX(2px);
  }

  &--inactive {
    opacity: 0.6;
    background: var(--color-surface-variant);
  }

  &__main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px;
  }

  &__left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__code {
    background: var(--color-primary);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.75rem;
    font-weight: 600;
    min-width: 40px;
    text-align: center;
  }

  &__name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__description {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  &__details {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  &__output,
  &__time,
  &__cost {
    display: flex;
    align-items: center;
  }

  &__output {
    color: var(--color-info);
    font-weight: 500;
  }

  &__cost {
    color: var(--color-success);
    font-weight: 500;
  }

  &__recipe {
    display: flex;
    align-items: center;
    font-size: 0.85rem;

    .recipe-label {
      color: var(--text-secondary);
      margin-right: 4px;
    }

    .recipe-count {
      color: var(--text-primary);
      font-weight: 500;
    }
  }

  &__instructions {
    display: flex;
    align-items: flex-start;
    font-size: 0.85rem;

    .instructions-preview {
      color: var(--text-secondary);
      line-height: 1.3;
    }
  }

  &__actions {
    margin-left: 16px;
  }
}

// Responsive design
@media (max-width: 768px) {
  .preparation-item {
    &__main {
      flex-direction: column;
      gap: 12px;
    }

    &__actions {
      margin-left: 0;
      align-self: flex-end;
    }

    &__details {
      flex-direction: column;
      gap: 8px;
    }
  }
}
</style>
