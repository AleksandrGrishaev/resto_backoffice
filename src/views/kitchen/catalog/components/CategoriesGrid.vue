<!-- Category cards grid — drill-down entry point -->
<template>
  <div class="categories-grid">
    <div
      v-for="cat in categories"
      :key="cat.id"
      class="category-card"
      :class="sectionClass"
      @click="emit('select', cat)"
    >
      <div class="cat-info">
        <span class="cat-name">{{ cat.name }}</span>
        <span class="cat-count">{{ cat.count }} items</span>
      </div>
      <v-icon size="20" class="cat-chevron">mdi-chevron-right</v-icon>
    </div>

    <div v-if="categories.length === 0" class="empty-state">
      <v-icon size="48" color="grey-darken-1">mdi-folder-open-outline</v-icon>
      <p>No categories</p>
      <p class="empty-hint">Try adjusting filters</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  categories: Array<{ id: string; name: string; count: number }>
  section: string
}>()

const emit = defineEmits<{
  select: [cat: { id: string; name: string }]
}>()

const sectionClass = computed(() => `section-${props.section}`)
</script>

<style scoped lang="scss">
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.category-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  border-left: 4px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  min-height: 64px;
  transition:
    background 0.15s,
    transform 0.1s;

  &:active {
    background: rgba(255, 255, 255, 0.08);
    transform: scale(0.98);
  }

  // Section-specific border colors
  &.section-menu {
    border-left-color: rgb(var(--v-theme-purple, 156, 39, 176));
  }

  &.section-recipes {
    border-left-color: rgb(var(--v-theme-success, 76, 175, 80));
  }

  &.section-preps {
    border-left-color: rgb(var(--v-theme-warning, 255, 152, 0));
  }

  &.section-products {
    border-left-color: rgb(var(--v-theme-info, 33, 150, 243));
  }
}

.cat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cat-name {
  font-weight: 600;
  font-size: 1rem;
}

.cat-count {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
}

.cat-chevron {
  opacity: 0.3;
  flex-shrink: 0;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 0;
  color: rgba(255, 255, 255, 0.4);
}

.empty-hint {
  font-size: 0.8rem;
  opacity: 0.6;
}
</style>
