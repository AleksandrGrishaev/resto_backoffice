<!-- src/views/pos/menu/components/CategoryCard.vue -->
<template>
  <v-card
    class="category-card pos-card"
    :class="{
      'category-disabled': !category.isActive,
      'category-subcategory': isSubcategory
    }"
    elevation="2"
    @click="handleClick"
  >
    <div class="card-content d-flex flex-column h-100">
      <!-- Header with status indicator -->
      <div class="d-flex justify-space-between align-start mb-2">
        <div class="flex-grow-1">
          <v-card-title class="category-title pa-0 text-h6">
            {{ category.name }}
          </v-card-title>

          <v-card-subtitle
            v-if="category.description"
            class="category-description pa-0 mt-1 text-body-2"
          >
            {{ category.description }}
          </v-card-subtitle>
        </div>

        <!-- Status indicators -->
        <div class="d-flex flex-column align-end gap-1">
          <v-chip v-if="!category.isActive" size="x-small" color="error" variant="flat">
            Unavailable
          </v-chip>
          <v-chip v-if="hasSubcategories" size="x-small" color="primary" variant="outlined">
            <v-icon start size="12">mdi-folder-multiple</v-icon>
            Subcategories
          </v-chip>
        </div>
      </div>

      <!-- Footer with item count -->
      <v-spacer />

      <div class="category-footer d-flex justify-space-between align-center mt-auto pt-2">
        <div class="text-caption text-medium-emphasis">{{ itemsCount }} {{ itemsCountText }}</div>

        <v-icon :color="category.isActive ? 'primary' : 'disabled'" size="20">
          mdi-chevron-right
        </v-icon>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Category } from '@/stores/menu/types'

// Props
interface Props {
  category: Category
  itemsCount?: number
  hasSubcategories?: boolean // NEW: Indicates category has subcategories
  isSubcategory?: boolean // NEW: Visual indicator for subcategory styling
}

const props = withDefaults(defineProps<Props>(), {
  itemsCount: 0,
  hasSubcategories: false,
  isSubcategory: false
})

// Emits
const emit = defineEmits<{
  select: [categoryId: string]
}>()

// Computed
const itemsCountText = computed(() => {
  const count = props.itemsCount
  if (count === 1) return 'item'
  return 'items'
})

// Methods
const handleClick = (): void => {
  if (!props.category.isActive) {
    console.log('🚫 Category disabled:', props.category.name)
    return
  }

  console.log('📂 Category selected:', {
    id: props.category.id,
    name: props.category.name,
    itemsCount: props.itemsCount
  })

  emit('select', props.category.id)
}
</script>

<style scoped>
/* =============================================
   CARD STYLES
   ============================================= */

.category-card {
  height: 100%;
  min-height: var(--touch-card);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 2px solid transparent;
  background: rgb(var(--v-theme-surface));
}

.category-card:hover:not(.category-disabled) {
  transform: translateY(-2px);
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 8px 16px rgba(var(--v-theme-primary), 0.15) !important;
}

.category-card.category-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: rgba(var(--v-theme-surface), 0.5);
}

.category-card.category-disabled:hover {
  transform: none;
  border-color: transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12) !important;
}

/* =============================================
   CONTENT STYLES
   ============================================= */

.card-content {
  padding: var(--spacing-md);
  height: 100%;
}

.category-title {
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.2;
  color: rgb(var(--v-theme-on-surface));
}

.category-disabled .category-title {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.category-description {
  font-size: 0.875rem;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.7);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.category-disabled .category-description {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.category-footer {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-xs);
}

/* =============================================
   RESPONSIVE ADJUSTMENTS
   ============================================= */

@media (max-width: 768px) {
  .category-card {
    min-height: calc(var(--touch-card) * 0.9);
  }

  .card-content {
    padding: var(--spacing-sm);
  }

  .category-title {
    font-size: 1rem;
  }

  .category-description {
    font-size: 0.8rem;
  }
}

/* =============================================
   TOUCH OPTIMIZATIONS
   ============================================= */

@media (hover: none) {
  .category-card:hover:not(.category-disabled) {
    transform: none;
    border-color: transparent;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12) !important;
  }

  .category-card:active:not(.category-disabled) {
    transform: scale(0.98);
    border-color: rgb(var(--v-theme-primary));
  }
}

/* =============================================
   LOADING STATE (для будущего использования)
   ============================================= */

.category-card.loading {
  pointer-events: none;
}

.category-card.loading .card-content {
  opacity: 0.7;
}

/* =============================================
   SUBCATEGORY STYLING
   ============================================= */

.category-card.category-subcategory {
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.category-card.category-subcategory .category-title {
  font-size: 1rem;
}
</style>
