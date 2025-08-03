<!-- src/components/recipes/IngredientItem.vue -->
<template>
  <div class="ingredient-item" :class="{ 'ingredient-item--inactive': !ingredient.isActive }">
    <div class="ingredient-item__main">
      <div class="ingredient-item__left">
        <div class="ingredient-item__header">
          <div class="ingredient-item__code">{{ ingredient.code }}</div>
          <div class="ingredient-item__name">{{ ingredient.name }}</div>
          <v-chip
            v-if="ingredient.isComposite"
            size="x-small"
            color="warning"
            variant="tonal"
            class="ml-2"
          >
            Composite
          </v-chip>
        </div>

        <div v-if="ingredient.description" class="ingredient-item__description">
          {{ ingredient.description }}
        </div>

        <div class="ingredient-item__details">
          <div class="ingredient-item__unit">
            <v-icon icon="mdi-scale" size="14" class="mr-1" />
            {{ ingredient.unit.name }} ({{ ingredient.unit.shortName }})
          </div>

          <div v-if="ingredient.costPerUnit" class="ingredient-item__cost">
            <v-icon icon="mdi-currency-usd" size="14" class="mr-1" />
            ${{ ingredient.costPerUnit.toFixed(2) }} per {{ ingredient.unit.shortName }}
          </div>

          <div v-if="ingredient.supplier" class="ingredient-item__supplier">
            <v-icon icon="mdi-truck" size="14" class="mr-1" />
            {{ ingredient.supplier }}
          </div>
        </div>

        <div v-if="ingredient.allergens?.length" class="ingredient-item__allergens">
          <v-icon icon="mdi-alert" size="14" class="mr-1" />
          <span class="allergens-label">Allergens:</span>
          <v-chip
            v-for="allergen in ingredient.allergens"
            :key="allergen"
            size="x-small"
            color="error"
            variant="outlined"
            class="ml-1"
          >
            {{ allergen }}
          </v-chip>
        </div>
      </div>

      <div class="ingredient-item__actions">
        <v-menu>
          <template #activator="{ props }">
            <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
          </template>
          <v-list>
            <v-list-item @click="$emit('view', ingredient)">
              <template #prepend>
                <v-icon icon="mdi-eye" />
              </template>
              <v-list-item-title>View Details</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('edit', ingredient)">
              <template #prepend>
                <v-icon icon="mdi-pencil" />
              </template>
              <v-list-item-title>Edit</v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item
              :class="{ 'text-error': ingredient.isActive }"
              @click="$emit('toggle-status', ingredient)"
            >
              <template #prepend>
                <v-icon :icon="ingredient.isActive ? 'mdi-archive' : 'mdi-archive-remove'" />
              </template>
              <v-list-item-title>
                {{ ingredient.isActive ? 'Archive' : 'Restore' }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ingredient } from '@/stores/recipes/types'

interface Props {
  ingredient: Ingredient
}

interface Emits {
  (e: 'view', ingredient: Ingredient): void
  (e: 'edit', ingredient: Ingredient): void
  (e: 'toggle-status', ingredient: Ingredient): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style lang="scss" scoped>
.ingredient-item {
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

  &__unit,
  &__cost,
  &__supplier {
    display: flex;
    align-items: center;
  }

  &__cost {
    color: var(--color-success);
    font-weight: 500;
  }

  &__allergens {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    font-size: 0.85rem;

    .allergens-label {
      color: var(--text-secondary);
      margin-right: 4px;
    }
  }

  &__actions {
    margin-left: 16px;
  }
}

// Responsive design
@media (max-width: 768px) {
  .ingredient-item {
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
