<!-- src/views/kitchen/calculator/components/PreparationSelector.vue -->
<template>
  <div class="preparation-selector">
    <!-- Search Field -->
    <div class="search-section">
      <v-text-field
        v-model="searchQuery"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search preparations..."
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        class="search-field"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" size="32" />
      <span class="mt-2 text-medium-emphasis">Loading preparations...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPreparations.length === 0" class="empty-state">
      <v-icon size="48" color="grey-lighten-1">mdi-food-off</v-icon>
      <span class="mt-2 text-medium-emphasis">
        {{ searchQuery ? 'No preparations found' : 'No preparations available' }}
      </span>
    </div>

    <!-- Preparations List -->
    <div v-else class="preparations-list">
      <div v-for="group in groupedPreparations" :key="group.categoryId" class="category-group">
        <!-- Category Header -->
        <div class="category-header">
          <span class="category-emoji">{{ group.emoji }}</span>
          <span class="category-name">{{ group.name }}</span>
          <v-chip size="x-small" variant="tonal" class="ml-2">
            {{ group.preparations.length }}
          </v-chip>
        </div>

        <!-- Preparations in Category -->
        <div class="preparations-items">
          <v-btn
            v-for="prep in group.preparations"
            :key="prep.id"
            :variant="selectedId === prep.id ? 'flat' : 'outlined'"
            :color="selectedId === prep.id ? 'primary' : undefined"
            class="preparation-item"
            @click="handleSelect(prep.id)"
          >
            <div class="prep-content">
              <span class="prep-name">{{ prep.name }}</span>
              <span class="prep-output">
                {{ formatOutput(prep) }}
              </span>
            </div>
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import type { Preparation } from '@/stores/recipes/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  selectedId: string | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  select: [preparationId: string]
}>()

// =============================================
// COMPOSABLES
// =============================================

const recipesStore = useRecipesStore()

// =============================================
// STATE
// =============================================

const searchQuery = ref('')

// =============================================
// COMPUTED
// =============================================

/**
 * Get kitchen preparations with recipes
 */
const kitchenPreparations = computed((): Preparation[] => {
  return recipesStore.preparations.filter(
    p => p.isActive && p.department === 'kitchen' && p.recipe && p.recipe.length > 0
  )
})

/**
 * Filter preparations by search query
 */
const filteredPreparations = computed((): Preparation[] => {
  if (!searchQuery.value) {
    return kitchenPreparations.value
  }

  const query = searchQuery.value.toLowerCase().trim()
  return kitchenPreparations.value.filter(
    p => p.name.toLowerCase().includes(query) || p.code?.toLowerCase().includes(query)
  )
})

/**
 * Group preparations by category
 */
interface PreparationGroup {
  categoryId: string
  name: string
  emoji: string
  preparations: Preparation[]
}

const groupedPreparations = computed((): PreparationGroup[] => {
  const groups: Map<string, PreparationGroup> = new Map()

  for (const prep of filteredPreparations.value) {
    const categoryId = prep.type || 'other'

    if (!groups.has(categoryId)) {
      const categoryName = recipesStore.getPreparationCategoryName(categoryId)
      const categoryEmoji = recipesStore.getPreparationCategoryEmoji(categoryId)

      groups.set(categoryId, {
        categoryId,
        name: categoryName,
        emoji: categoryEmoji,
        preparations: []
      })
    }

    groups.get(categoryId)!.preparations.push(prep)
  }

  // Sort groups by name and preparations within groups
  const sortedGroups = Array.from(groups.values())
  sortedGroups.sort((a, b) => a.name.localeCompare(b.name))

  for (const group of sortedGroups) {
    group.preparations.sort((a, b) => a.name.localeCompare(b.name))
  }

  return sortedGroups
})

// =============================================
// METHODS
// =============================================

const handleSelect = (preparationId: string) => {
  emit('select', preparationId)
}

const formatOutput = (prep: Preparation): string => {
  const unitLabel = prep.outputUnit === 'ml' ? 'ml' : 'g'

  if (prep.portionType === 'portion' && prep.portionSize) {
    const portions = Math.round(prep.outputQuantity / prep.portionSize)
    return `${portions} pcs (${prep.outputQuantity}${unitLabel})`
  }

  return `${prep.outputQuantity}${unitLabel}`
}
</script>

<style scoped lang="scss">
.preparation-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.search-section {
  padding: var(--spacing-sm);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  flex-shrink: 0;
}

.search-field {
  :deep(.v-field) {
    font-size: var(--text-base);
  }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  flex: 1;
  text-align: center;
}

.preparations-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.category-group {
  margin-bottom: var(--spacing-md);

  &:last-child {
    margin-bottom: 0;
  }
}

.category-header {
  display: flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
  font-weight: 600;
  font-size: var(--text-sm);
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-emoji {
  font-size: var(--text-lg);
  margin-right: var(--spacing-xs);
}

.category-name {
  flex: 1;
}

.preparations-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.preparation-item {
  width: 100%;
  min-height: 56px;
  justify-content: flex-start;
  text-transform: none;
  letter-spacing: normal;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: 8px;

  :deep(.v-btn__content) {
    width: 100%;
  }
}

.prep-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
}

.prep-name {
  font-size: var(--text-base);
  font-weight: 500;
  line-height: 1.3;
}

.prep-output {
  font-size: var(--text-sm);
  opacity: 0.7;
}

/* Scrollbar styling */
.preparations-list::-webkit-scrollbar {
  width: 6px;
}

.preparations-list::-webkit-scrollbar-track {
  background: transparent;
}

.preparations-list::-webkit-scrollbar-thumb {
  background-color: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 3px;
}

.preparations-list::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.3);
}
</style>
