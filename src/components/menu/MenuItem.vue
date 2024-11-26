<template>
  <div class="menu-item" :class="{ 'menu-item--inactive': !item.isActive }">
    <!-- Основное блюдо -->
    <div class="menu-item__main">
      <div class="menu-item__content">
        <div class="menu-item__left">
          <div class="menu-item__name">{{ item.name }}</div>
          <div class="menu-item__type">
            <v-chip size="small" :color="item.type === 'food' ? 'success' : 'info'" variant="flat">
              <v-icon
                :icon="item.type === 'food' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'"
                size="16"
                class="mr-1"
              />
              {{ item.type === 'food' ? 'Кухня' : 'Бар' }}
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
          <div class="variant-item__name">
            {{ variant.name ? variant.name : 'Стандартный' }}
          </div>
          <div class="variant-item__price">{{ variant.price }}₽</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MenuItem } from '@/types/menu'

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
  }

  &__type {
    margin-top: 4px;
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

  &__name {
    font-size: 14px;
    color: var(--text-secondary);
  }

  &__price {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-primary);
    padding: 4px 8px;
    background: var(--color-surface);
    border-radius: 4px;
    min-width: 80px;
    text-align: right;
  }
}
</style>
