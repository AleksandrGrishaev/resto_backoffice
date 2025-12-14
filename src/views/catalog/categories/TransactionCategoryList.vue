<!-- src/views/catalog/categories/TransactionCategoryList.vue -->
<template>
  <v-card class="category-list">
    <v-card-title class="text-h6 px-4 py-3">Transaction Categories</v-card-title>

    <v-list class="py-2">
      <v-list-item
        v-for="category in categories"
        :key="category.id"
        :class="{ 'category-item--inactive': !category.isActive }"
      >
        <template #prepend>
          <v-icon :color="category.type === 'expense' ? 'error' : 'success'" size="24">
            {{ category.type === 'expense' ? 'mdi-arrow-down' : 'mdi-arrow-up' }}
          </v-icon>
        </template>

        <v-list-item-title>
          {{ category.name }}
          <v-chip v-if="category.isSystem" size="x-small" color="info" variant="flat" class="ml-2">
            System
          </v-chip>
        </v-list-item-title>

        <v-list-item-subtitle>
          {{ category.code }} | {{ category.type }}
          <v-chip
            v-if="category.isOpex"
            size="x-small"
            color="warning"
            variant="tonal"
            class="ml-1"
          >
            OPEX
          </v-chip>
        </v-list-item-subtitle>

        <template #append>
          <div class="d-flex align-center">
            <v-chip
              v-if="!category.isActive"
              size="small"
              color="warning"
              variant="flat"
              class="mr-2"
            >
              Inactive
            </v-chip>

            <v-btn
              icon
              size="small"
              variant="text"
              color="primary"
              :disabled="category.isSystem"
              @click.stop="emit('edit', category)"
            >
              <v-icon icon="mdi-pencil" size="20" />
              <v-tooltip activator="parent" location="top">
                {{ category.isSystem ? 'System categories cannot be edited' : 'Edit category' }}
              </v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-list-item>

      <v-list-item v-if="categories.length === 0">
        <v-list-item-title class="text-center text-medium-emphasis">
          No categories configured
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import type { TransactionCategory } from '@/stores/account/types'

defineProps<{
  categories: TransactionCategory[]
}>()

const emit = defineEmits<{
  edit: [category: TransactionCategory]
}>()
</script>

<style lang="scss" scoped>
.category-list {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.category-item {
  &--inactive {
    opacity: 0.7;
  }
}
</style>
