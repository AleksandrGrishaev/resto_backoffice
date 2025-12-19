<!-- src/views/recipes/components/widgets/RecipeSearchWidget.vue -->
<template>
  <div class="recipe-search-widget pa-4">
    <!-- Search Field -->
    <v-text-field
      v-model="searchQuery"
      prepend-inner-icon="mdi-magnify"
      placeholder="Search by recipe name or code..."
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="mb-4"
    />

    <!-- ⭐ Cycle Warning -->
    <v-alert
      v-if="hasFilteredOutRecipes"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      <div class="text-caption">
        {{ filteredOutCount }} recipe(s) hidden to prevent circular dependencies
      </div>
    </v-alert>

    <!-- ⭐ Depth Warning -->
    <v-alert
      v-if="currentRecipeDepth >= 4"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      <div class="text-caption">
        Current nesting depth: {{ currentRecipeDepth }}/{{ maxDepth }}
        <span v-if="currentRecipeDepth >= maxDepth">- Maximum depth reached!</span>
      </div>
    </v-alert>

    <!-- Results Summary -->
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-body-2 text-medium-emphasis">
        <template v-if="filteredRecipes.length === totalRecipes">
          Showing all {{ filteredRecipes.length }} recipes
        </template>
        <template v-else>{{ filteredRecipes.length }} of {{ totalRecipes }} recipes</template>
      </div>
    </div>

    <!-- Recipe List -->
    <div v-if="filteredRecipes.length === 0" class="text-center py-8 text-medium-emphasis">
      <v-icon icon="mdi-book-off" size="48" class="mb-2" />
      <div>No recipes available</div>
      <div v-if="searchQuery" class="text-caption mt-1">Try different search terms</div>
    </div>

    <div v-else class="recipes-list" style="max-height: 400px; overflow-y: auto">
      <div
        v-for="recipe in filteredRecipes"
        :key="recipe.id"
        class="recipe-item pa-3 mb-2"
        :class="{ selected: selectedRecipe?.id === recipe.id }"
        @click="selectRecipe(recipe)"
      >
        <div class="d-flex align-center justify-space-between">
          <!-- Recipe Info -->
          <div class="d-flex align-center flex-grow-1">
            <v-avatar color="success" variant="tonal" size="40" class="mr-3">
              <v-icon icon="mdi-book-open-variant" size="20" />
            </v-avatar>

            <div class="flex-grow-1">
              <div class="font-weight-bold text-body-1 mb-1">{{ recipe.name }}</div>
              <div class="text-caption text-medium-emphasis d-flex align-center gap-2">
                <v-chip size="x-small" color="grey">{{ recipe.code }}</v-chip>
                <span>{{ recipe.portionSize }} {{ recipe.portionUnit }}</span>
                <span v-if="recipe.cost" class="text-success">
                  {{ formatIDR(recipe.cost) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Selection Indicator -->
          <v-icon
            v-if="selectedRecipe?.id === recipe.id"
            icon="mdi-check-circle"
            color="success"
            class="ml-3"
          />
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="d-flex justify-end gap-2 mt-4">
      <v-btn variant="text" @click="$emit('cancel')">Cancel</v-btn>
      <v-btn color="success" variant="flat" :disabled="!selectedRecipe" @click="confirmSelection">
        Select Recipe
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useRecipeGraph } from '@/stores/recipes/composables/useRecipeGraph'
import { formatIDR } from '@/utils/currency'
import type { Recipe } from '@/stores/recipes/types'

const MODULE_NAME = 'RecipeSearchWidget'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  currentRecipeId?: string // Current recipe being edited (to exclude from list)
  currentRecipeComponents?: any[] // Current components (to check for cycles)
}

interface Emits {
  (e: 'select', recipe: Recipe): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// =============================================
// STATE
// =============================================

const recipesStore = useRecipesStore()
const { detectCycle, getRecipeDepth, MAX_RECIPE_DEPTH } = useRecipeGraph()

const searchQuery = ref('')
const selectedRecipe = ref<Recipe | null>(null)

// =============================================
// COMPUTED
// =============================================

const maxDepth = MAX_RECIPE_DEPTH

const totalRecipes = computed(() => {
  return recipesStore.recipes.filter(r => r.isActive).length
})

// Calculate current recipe depth
const currentRecipeDepth = computed(() => {
  if (!props.currentRecipeId) return 0
  return getRecipeDepth(props.currentRecipeId, recipesStore.recipes)
})

// Filter recipes to prevent cycles
const availableRecipes = computed(() => {
  let recipes = recipesStore.recipes.filter(r => r.isActive)

  // Exclude current recipe (can't add self)
  if (props.currentRecipeId) {
    recipes = recipes.filter(r => r.id !== props.currentRecipeId)
  }

  // Filter out recipes that would create cycles
  if (props.currentRecipeId && props.currentRecipeComponents) {
    recipes = recipes.filter(recipe => {
      // Create test components with this recipe added
      const testComponents = [
        ...(props.currentRecipeComponents || []),
        {
          id: 'test-' + Date.now(),
          componentId: recipe.id,
          componentType: 'recipe',
          quantity: 1,
          unit: 'portion'
        }
      ]

      // Check if adding this recipe would create a cycle
      const cycleResult = detectCycle(props.currentRecipeId!, testComponents, recipesStore.recipes)

      return !cycleResult.hasCycle
    })
  }

  return recipes
})

const filteredOutCount = computed(() => {
  return totalRecipes.value - availableRecipes.value.length
})

const hasFilteredOutRecipes = computed(() => {
  return filteredOutCount.value > 0
})

// Search filter
const filteredRecipes = computed(() => {
  if (!searchQuery.value) {
    return availableRecipes.value
  }

  const query = searchQuery.value.toLowerCase().trim()
  return availableRecipes.value.filter(recipe => {
    return recipe.name.toLowerCase().includes(query) || recipe.code?.toLowerCase().includes(query)
  })
})

// =============================================
// METHODS
// =============================================

function selectRecipe(recipe: Recipe) {
  selectedRecipe.value = recipe
}

function confirmSelection() {
  if (selectedRecipe.value) {
    emit('select', selectedRecipe.value)
  }
}

// Auto-select if only one result
watch(filteredRecipes, newRecipes => {
  if (newRecipes.length === 1) {
    selectedRecipe.value = newRecipes[0]
  }
})
</script>

<style scoped lang="scss">
.recipes-list {
  border-radius: 4px;
}

.recipe-item {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.2);
  }

  &.selected {
    background-color: rgba(76, 175, 80, 0.08);
    border-color: #4caf50;
  }
}
</style>
