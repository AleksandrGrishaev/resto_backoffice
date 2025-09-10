/ src/components/pos/cards/CategoryCard.vue
<template>
  <v-card class="category-card" elevation="0" @click="$emit('select', category.id)">
    <div class="card-content">
      <v-card-title class="text-h6">{{ category.name }}</v-card-title>
      <v-card-subtitle>{{ category.description }}</v-card-subtitle>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { Category } from '@/types/menu'

defineProps<{
  category: Category
}>()

defineEmits<{
  select: [categoryId: string]
}>()
</script>

<style scoped>
.category-card {
  height: 100%;
  width: 100%;
  cursor: pointer;
  transition: transform 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
}

.card-content {
  padding: 4px;
  flex: 1;
}

.category-card:hover {
  transform: translateY(-2px);
  border-color: var(--v-theme-primary);
}
</style>
