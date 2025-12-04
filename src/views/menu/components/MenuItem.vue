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
              {{ item.type === 'food' ? 'Kitchen' : 'Bar' }}
            </v-chip>

            <!-- Индикатор типа блюда -->
            <v-chip
              v-if="itemTypeIndicator"
              size="small"
              :color="itemTypeIndicator.color"
              variant="outlined"
              class="ml-2"
            >
              <v-icon :icon="itemTypeIndicator.icon" size="14" class="mr-1" />
              {{ itemTypeIndicator.label }}
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

        <!-- Menu actions (только для composition блюд) -->
        <v-menu v-if="hasComposition">
          <template #activator="{ props: menuProps }">
            <v-btn size="small" variant="text" icon="mdi-dots-vertical" v-bind="menuProps" />
          </template>
          <v-list>
            <v-list-item @click="$emit('duplicate', item)">
              <template #prepend>
                <v-icon icon="mdi-content-copy" />
              </template>
              <v-list-item-title>Duplicate</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <!-- Варианты блюда -->
    <div class="menu-item__variants">
      <div v-for="variant in sortedVariants" :key="variant.id" class="variant-item">
        <div class="variant-item__content">
          <div class="variant-item__info">
            <div class="variant-item__name">
              {{ variant.name ? variant.name : 'Standard' }}
            </div>

            <!-- Композиция варианта -->
            <div
              v-if="variant.composition && variant.composition.length > 0"
              class="variant-item__composition"
            >
              <div class="composition-summary">
                <v-chip
                  v-for="component in variant.composition"
                  :key="`${component.type}-${component.id}`"
                  size="x-small"
                  :color="getComponentColor(component.role)"
                  variant="outlined"
                  class="mr-1 mb-1"
                >
                  <v-icon :icon="getSourceIcon(component.type)" size="10" class="mr-1" />
                  {{ getComponentDisplayName(component) }}
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
  (e: 'duplicate', item: MenuItem): void
}>()

const sortedVariants = computed(() => {
  return [...props.item.variants].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
})

// Проверяем есть ли композиция у блюда
const hasComposition = computed(() => {
  return props.item.variants.some(v => v.composition && v.composition.length > 0)
})

// Определяем тип блюда для индикатора
const itemTypeIndicator = computed(() => {
  const variants = props.item.variants

  // Проверяем есть ли композитные варианты
  const hasComposition = variants.some(v => v.composition && v.composition.length > 0)

  if (hasComposition) {
    // Проверяем сложность композиции
    const maxComponents = Math.max(...variants.map(v => v.composition?.length || 0))

    if (maxComponents > 1) {
      return {
        icon: 'mdi-layers-plus',
        label: 'Composition',
        color: 'orange'
      }
    } else {
      return {
        icon: 'mdi-chef-hat',
        label: 'Simple',
        color: 'primary'
      }
    }
  }

  return null
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

  &__composition {
    .composition-summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px;
    }
  }

  &__portion {
    display: flex;
    align-items: center;
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
