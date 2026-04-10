<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    categoryName: string
    categoryEmoji?: string
    taskCount: number
    completedCount?: number
    defaultExpanded?: boolean
  }>(),
  {
    categoryEmoji: '',
    completedCount: 0,
    defaultExpanded: true
  }
)

const expanded = ref(props.defaultExpanded)
</script>

<template>
  <div class="category-group">
    <div class="category-header" @click="expanded = !expanded">
      <v-icon size="16" class="expand-icon" :class="{ rotated: !expanded }">
        mdi-chevron-down
      </v-icon>
      <span v-if="categoryEmoji" class="category-emoji">{{ categoryEmoji }}</span>
      <span class="category-name">{{ categoryName }}</span>
      <v-badge :content="taskCount" color="primary" inline class="ml-1" />
      <v-badge
        v-if="completedCount > 0"
        :content="`${completedCount}`"
        color="success"
        inline
        class="ml-1"
      />
    </div>

    <div v-if="expanded" class="category-items">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.category-group {
  margin-bottom: 2px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background-color: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 6px;
  cursor: pointer;
  user-select: none;

  &:active {
    background-color: rgba(var(--v-theme-on-surface), 0.1);
  }
}

.expand-icon {
  transition: transform 0.2s;

  &.rotated {
    transform: rotate(-90deg);
  }
}

.category-emoji {
  font-size: 16px;
  line-height: 1;
}

.category-name {
  font-size: 13px;
  font-weight: 600;
  flex: 1;
}

.category-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0 4px 4px;
}
</style>
