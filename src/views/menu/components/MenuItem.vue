<template>
  <div class="menu-item" :class="{ 'menu-item--inactive': !item.isActive }">
    <!-- Header with name and actions -->
    <div class="menu-item__header">
      <div class="menu-item__title">
        <div class="menu-item__name">{{ item.name }}</div>
        <v-chip v-if="!item.isActive" size="x-small" color="warning" variant="tonal" class="ml-2">
          Archived
        </v-chip>
      </div>

      <div class="menu-item__actions">
        <!-- View button -->
        <v-btn
          icon="mdi-eye"
          variant="text"
          size="small"
          color="info"
          title="View"
          @click.stop="$emit('view', item)"
        />

        <!-- Menu actions -->
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="menuProps" />
          </template>
          <v-list>
            <v-list-item @click="$emit('view', item)">
              <template #prepend>
                <v-icon icon="mdi-eye" />
              </template>
              <v-list-item-title>View Details</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('edit', item)">
              <template #prepend>
                <v-icon icon="mdi-pencil" />
              </template>
              <v-list-item-title>Edit</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="hasComposition" @click="$emit('duplicate', item)">
              <template #prepend>
                <v-icon icon="mdi-content-copy" />
              </template>
              <v-list-item-title>Duplicate</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('view', item)">
              <template #prepend>
                <v-icon icon="mdi-file-pdf-box" />
              </template>
              <v-list-item-title>Export PDF</v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item @click="$emit('convert-dish-type', item)">
              <template #prepend>
                <v-icon :icon="conversionIcon" />
              </template>
              <v-list-item-title>{{ conversionLabel }}</v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item
              :class="{ 'text-error': item.isActive }"
              @click="$emit('toggle-status', item)"
            >
              <template #prepend>
                <v-icon :icon="item.isActive ? 'mdi-archive' : 'mdi-archive-remove'" />
              </template>
              <v-list-item-title>
                {{ item.isActive ? 'Archive' : 'Restore' }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <!-- Meta info -->
    <div class="menu-item__meta">
      <v-chip size="x-small" :color="item.type === 'food' ? 'success' : 'info'" variant="flat">
        <v-icon
          :icon="item.type === 'food' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'"
          size="12"
          class="mr-1"
        />
        {{ item.type === 'food' ? 'Kitchen' : 'Bar' }}
      </v-chip>

      <!-- Dish type indicator -->
      <v-chip
        v-if="itemTypeIndicator"
        size="x-small"
        :color="itemTypeIndicator.color"
        variant="outlined"
      >
        <v-icon :icon="itemTypeIndicator.icon" size="12" class="mr-1" />
        {{ itemTypeIndicator.label }}
      </v-chip>
    </div>

    <!-- Variants -->
    <div class="menu-item__variants">
      <div v-for="variant in sortedVariants" :key="variant.id" class="variant-item">
        <div class="variant-item__content">
          <div class="variant-item__info">
            <div class="variant-item__name">
              {{ variant.name ? variant.name : 'Standard' }}
            </div>

            <!-- Composition chips -->
            <div
              v-if="variant.composition && variant.composition.length > 0"
              class="variant-item__composition"
            >
              <v-chip
                v-for="component in variant.composition.slice(0, 3)"
                :key="`${component.type}-${component.id}`"
                size="x-small"
                :color="getComponentColor(component.role)"
                variant="outlined"
              >
                <v-icon :icon="getSourceIcon(component.type)" size="10" class="mr-1" />
                {{ getComponentDisplayName(component) }}
              </v-chip>
              <span v-if="variant.composition.length > 3" class="text-caption text-medium-emphasis">
                +{{ variant.composition.length - 3 }}
              </span>
            </div>

            <!-- Portion multiplier -->
            <v-chip
              v-if="variant.portionMultiplier && variant.portionMultiplier !== 1"
              size="x-small"
              color="info"
              variant="outlined"
            >
              ×{{ variant.portionMultiplier }}
            </v-chip>
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
import { DISH_TYPES, DISH_TYPE_ICONS } from '@/stores/menu/types'

interface Props {
  item: MenuItem
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'edit', item: MenuItem): void
  (e: 'duplicate', item: MenuItem): void
  (e: 'view', item: MenuItem): void
  (e: 'toggle-status', item: MenuItem): void
  (e: 'convert-dish-type', item: MenuItem): void
}>()

const sortedVariants = computed(() => {
  return [...props.item.variants].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
})

// Проверяем есть ли композиция у блюда
const hasComposition = computed(() => {
  return props.item.variants.some(v => v.composition && v.composition.length > 0)
})

// Определяем тип блюда для индикатора (используем dishType из БД)
const itemTypeIndicator = computed(() => {
  const dishType = props.item.dishType

  if (!dishType) return null

  const colors: Record<string, string> = {
    simple: 'primary',
    modifiable: 'orange'
  }

  return {
    icon: DISH_TYPE_ICONS[dishType] || 'mdi-food',
    label: DISH_TYPES[dishType] || dishType,
    color: colors[dishType] || 'primary'
  }
})

// Определяем текст и иконку для конвертации типа блюда
const conversionLabel = computed(() => {
  return props.item.dishType === 'simple' ? 'Convert to Modifiable' : 'Convert to Simple'
})

const conversionIcon = computed(() => {
  return props.item.dishType === 'simple' ? 'mdi-swap-horizontal' : 'mdi-swap-horizontal'
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

// Получение цвета для роли компонента
function getComponentColor(role?: string): string {
  switch (role) {
    case 'main':
      return 'primary'
    case 'garnish':
      return 'success'
    case 'sauce':
      return 'warning'
    case 'addon':
      return 'info'
    default:
      return 'default'
  }
}

// Получение отображаемого имени компонента
function getComponentDisplayName(component: MenuComposition): string {
  // В реальном приложении здесь будет lookup по stores
  // Пока возвращаем роль или тип
  if (component.role) {
    const roleNames = {
      main: 'Main',
      garnish: 'Side',
      sauce: 'Sauce',
      addon: 'Add-on'
    }
    return roleNames[component.role as keyof typeof roleNames] || component.role
  }

  const typeNames = {
    product: 'Product',
    recipe: 'Dish',
    preparation: 'Semi-finished'
  }
  return typeNames[component.type as keyof typeof typeNames] || component.type
}
</script>

<style lang="scss" scoped>
.menu-item {
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-outline-variant);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;
  height: 100%;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &--inactive {
    opacity: 0.6;
    background: var(--color-surface-variant);

    .menu-item__name {
      color: var(--text-secondary);
    }
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  &__title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    word-break: break-word;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  &__meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__variants {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid var(--color-outline-variant);
  }
}

.variant-item {
  &__content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  &__info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  &__composition {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  &__price {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary);
    padding: 4px 8px;
    background: var(--color-primary-container);
    border-radius: 4px;
    white-space: nowrap;
  }
}

@media (max-width: 600px) {
  .menu-item {
    padding: 12px;

    &__header {
      flex-direction: column;
      gap: 8px;
    }

    &__actions {
      align-self: flex-end;
    }
  }

  .variant-item {
    &__content {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    &__price {
      align-self: flex-end;
    }
  }
}
</style>
