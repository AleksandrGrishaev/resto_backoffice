// src/views/menu/components/MenuItem.vue
<template>
  <div class="menu-item" :class="{ 'menu-item--inactive': !item.isActive }">
    <!-- Основное блюдо -->
    <div class="menu-item__main">
      <div class="menu-item__content">
        <div class="menu-item__left">
          <div class="menu-item__name">{{ item.name }}</div>
          <div class="menu-item__meta">
            <v-chip size="small" :color="item.type === 'food' ? 'success' : 'info'" variant="flat">
              <v-icon
                :icon="item.type === 'food' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'"
                size="16"
                class="mr-1"
              />
              {{ item.type === 'food' ? 'Кухня' : 'Бар' }}
            </v-chip>

            <!-- Отображаем источник если есть -->
            <v-chip v-if="item.source" size="small" color="primary" variant="outlined" class="ml-2">
              <v-icon :icon="getSourceIcon(item.source.type)" size="14" class="mr-1" />
              {{ getSourceLabel(item.source.type) }}
            </v-chip>

            <!-- Индикатор композитного блюда -->
            <v-chip
              v-else-if="hasCompositionVariants"
              size="small"
              color="orange"
              variant="outlined"
              class="ml-2"
            >
              <v-icon icon="mdi-layers-plus" size="14" class="mr-1" />
              Композиция
            </v-chip>
          </div>
        </div>
      </div>

      <div class="menu-item__actions">
        <v-btn
          size="small"
          variant="text"
          color="primary"
          class="edit-button"
          @click="$emit('edit', item)"
        >
          <v-icon icon="mdi-pencil" size="20" />
        </v-btn>
      </div>
    </div>

    <!-- Варианты блюда -->
    <div class="menu-item__variants">
      <div v-for="variant in sortedVariants" :key="variant.id" class="variant-item">
        <div class="variant-item__content">
          <div class="variant-item__info">
            <div class="variant-item__name">
              {{ variant.name ? variant.name : 'Стандартный' }}
            </div>

            <!-- Источник варианта -->
            <div
              v-if="variant.source && variant.source.id !== item.source?.id"
              class="variant-item__source"
            >
              <v-chip size="x-small" color="secondary" variant="outlined">
                <v-icon :icon="getSourceIcon(variant.source.type)" size="12" class="mr-1" />
                {{ getSourceLabel(variant.source.type) }}
              </v-chip>
            </div>

            <!-- Композиция варианта -->
            <div
              v-else-if="variant.composition && variant.composition.length > 0"
              class="variant-item__composition"
            >
              <div class="composition-summary">
                <v-chip
                  v-for="component in variant.composition"
                  :key="component.id"
                  size="x-small"
                  :color="getComponentColor(component.role)"
                  variant="outlined"
                  class="mr-1 mb-1"
                >
                  <v-icon :icon="getSourceIcon(component.type)" size="10" class="mr-1" />
                  {{ component.role || component.type }}
                </v-chip>
              </div>
            </div>

            <!-- Множитель порции -->
            <div
              v-if="variant.portionMultiplier && variant.portionMultiplier !== 1"
              class="variant-item__portion"
            >
              <v-chip size="x-small" color="info" variant="outlined">
                ×{{ variant.portionMultiplier }}
              </v-chip>
            </div>
          </div>

          <div class="variant-item__price">{{ formatPrice(variant.price) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MenuItem, MenuComposition } from '@/types/menu'

interface Props {
  item: MenuItem
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'edit', item: MenuItem): void
}>()

const sortedVariants = computed(() => {
  return [...props.item.variants].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
})

const hasCompositionVariants = computed(() => {
  return props.item.variants.some(variant => variant.composition && variant.composition.length > 0)
})

// Форматирование цены
function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

// Получение иконки для типа источника
function getSourceIcon(type: string): string {
  switch (type) {
    case 'product':
      return 'mdi-package-variant'
    case 'recipe':
      return 'mdi-chef-hat'
    case 'preparation':
      return 'mdi-food-variant'
    default:
      return 'mdi-help-circle'
  }
}

// Получение подписи для типа источника
function getSourceLabel(type: string): string {
  switch (type) {
    case 'product':
      return 'Продукт'
    case 'recipe':
      return 'Рецепт'
    case 'preparation':
      return 'Полуфабрикат'
    default:
      return 'Неизвестно'
  }
}

// Получение цвета для роли компонента
function getComponentColor(role?: string): string {
  switch (role) {
    case 'main':
      return 'primary'
    case 'garnish':
      return 'success'
    case 'sauce':
      return 'warning'
    default:
      return 'default'
  }
}
</script>

<style lang="scss" scoped>
.menu-item {
  margin-bottom: var(--space-sm);
  background: var(--color-surface);
  border-radius: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  &--inactive {
    opacity: 0.7;
    .menu-item__name {
      color: var(--text-secondary);
    }
  }

  &__main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-radius: 8px;
  }

  &__name {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  &__meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__variants {
    margin-top: 4px;
    margin-left: 40px;
    padding-left: 12px;
    border-left: 2px solid var(--color-background);
  }
}

.variant-item {
  padding: 8px 16px;
  margin-bottom: 4px;
  border-radius: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  &__content {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: center;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__name {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  &__source,
  &__portion {
    display: flex;
    align-items: center;
  }

  &__composition {
    .composition-summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px;
    }
  }

  &__price {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-primary);
    padding: 4px 8px;
    background: var(--color-surface);
    border-radius: 4px;
    min-width: 100px;
    text-align: right;
  }
}
</style>
