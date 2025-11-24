<!-- src/views/recipes/components/RecipeFilters.vue - ИСПРАВЛЕННАЯ ВЕРСИЯ -->
<template>
  <v-card class="mb-4">
    <v-card-text>
      <!-- Первая строка: Переключатель табов -->
      <v-row class="mb-3">
        <v-col>
          <v-btn-toggle v-model="localActiveTab" mandatory variant="outlined" class="tab-toggle">
            <v-btn value="recipes" size="large">
              <v-icon start>mdi-book-open-page-variant</v-icon>
              Recipes ({{ recipesCount }})
            </v-btn>
            <v-btn value="preparations" size="large">
              <v-icon start>mdi-chef-hat</v-icon>
              Preparations ({{ preparationsCount }})
            </v-btn>
          </v-btn-toggle>
        </v-col>
      </v-row>

      <!-- Вторая строка: Фильтры -->
      <v-row align="center">
        <!-- Search -->
        <v-col cols="12" md="6">
          <v-text-field
            v-model="localFilters.search"
            label="Search"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            placeholder="Enter name, code, description..."
            @input="handleSearchInput"
            @keyup.enter="applySearch"
          />
        </v-col>

        <!-- Status Filter -->
        <v-col cols="12" md="3">
          <v-chip-group
            v-model="localFilters.status"
            selected-class="text-primary"
            mandatory
            class="status-filter"
          >
            <v-chip value="active" variant="outlined">
              <v-icon start size="14">mdi-check-circle</v-icon>
              Active
            </v-chip>
            <v-chip value="archived" variant="outlined">
              <v-icon start size="14">mdi-archive</v-icon>
              Archive
            </v-chip>
            <v-chip value="all" variant="outlined">
              <v-icon start size="14">mdi-format-list-bulleted</v-icon>
              All
            </v-chip>
          </v-chip-group>
        </v-col>

        <!-- Expand/Collapse -->
        <v-col cols="12" md="3" class="d-flex align-center justify-end">
          <v-btn
            variant="outlined"
            :prepend-icon="
              allExpanded ? 'mdi-unfold-less-horizontal' : 'mdi-unfold-more-horizontal'
            "
            @click="toggleAllPanels"
          >
            {{ allExpanded ? 'Collapse All' : 'Expand All' }}
          </v-btn>
        </v-col>
      </v-row>

      <!-- Third row: Department Filter (Preparations only) -->
      <v-row v-if="localActiveTab === 'preparations'" align="center" class="mt-2">
        <v-col cols="12" md="6">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-domain</v-icon>
            <span class="text-subtitle-2 mr-4">Department:</span>
            <v-chip-group
              v-model="localFilters.department"
              selected-class="text-primary"
              mandatory
              class="status-filter"
            >
              <v-chip value="all" variant="outlined">
                <v-icon start size="14">mdi-format-list-bulleted</v-icon>
                All
              </v-chip>
              <v-chip value="kitchen" variant="outlined">
                <v-icon start size="14">mdi-chef-hat</v-icon>
                Kitchen
              </v-chip>
              <v-chip value="bar" variant="outlined">
                <v-icon start size="14">mdi-glass-cocktail</v-icon>
                Bar
              </v-chip>
            </v-chip-group>
          </div>
        </v-col>
      </v-row>

      <!-- Debug Info (только для разработки) -->
      <v-row v-if="$DEBUG" class="mt-2">
        <v-col>
          <v-chip size="small" variant="outlined" class="mr-2">
            Total R: {{ store.statistics.recipes?.total || 0 }}
          </v-chip>
          <v-chip size="small" variant="outlined" class="mr-2">
            Active R: {{ store.statistics.recipes?.active || 0 }}
          </v-chip>
          <v-chip size="small" variant="outlined" class="mr-2">
            Total P: {{ store.statistics.preparations?.total || 0 }}
          </v-chip>
          <v-chip size="small" variant="outlined" class="mr-2">
            Active P: {{ store.statistics.preparations?.active || 0 }}
          </v-chip>
          <v-chip size="small" variant="outlined" class="mr-2">
            Filtered: {{ filteredCount }}
          </v-chip>
          <v-chip size="small" variant="outlined">Status: {{ localFilters.status }}</v-chip>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'RecipeFilters'

interface Props {
  activeTab: 'recipes' | 'preparations'
}

interface Emits {
  (e: 'update:activeTab', value: 'recipes' | 'preparations'): void
  (e: 'toggleAllPanels'): void
  (e: 'update:filters', filters: FilterState): void
}

interface FilterState {
  search: string
  status: 'active' | 'archived' | 'all'
  department?: 'kitchen' | 'bar' | 'all'
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Store
const store = useRecipesStore()

// =============================================
// STATE
// =============================================

// Local filters state
const localFilters = ref<FilterState>({
  search: '',
  status: 'active',
  department: 'all'
})

// Panel state
const allExpanded = ref(true)

// =============================================
// COMPUTED
// =============================================

const localActiveTab = computed({
  get: () => props.activeTab,
  set: value => emit('update:activeTab', value)
})

// ✅ ИСПРАВЛЕНО: Правильный подсчет количества с защитой от undefined
const recipesCount = computed(() => {
  const stats = store.statistics.recipes
  if (!stats) return 0

  switch (localFilters.value.status) {
    case 'active':
      return stats.active || 0
    case 'archived':
      return stats.inactive || 0
    case 'all':
      return stats.total || 0
    default:
      return stats.active || 0
  }
})

const preparationsCount = computed(() => {
  const stats = store.statistics.preparations
  if (!stats) return 0

  switch (localFilters.value.status) {
    case 'active':
      return stats.active || 0
    case 'archived':
      return stats.inactive || 0
    case 'all':
      return stats.total || 0
    default:
      return stats.active || 0
  }
})

// ✅ НОВОЕ: Filtered data based on current filters
const filteredRecipes = computed(() => {
  let recipes = store.recipes

  // Filter by status
  if (localFilters.value.status === 'active') {
    recipes = recipes.filter(r => r.isActive)
  } else if (localFilters.value.status === 'archived') {
    recipes = recipes.filter(r => !r.isActive)
  }
  // 'all' shows everything

  // Filter by search
  if (localFilters.value.search.trim()) {
    const searchText = localFilters.value.search.toLowerCase()
    recipes = recipes.filter(
      recipe =>
        recipe.name.toLowerCase().includes(searchText) ||
        recipe.code?.toLowerCase().includes(searchText) ||
        recipe.description?.toLowerCase().includes(searchText) ||
        recipe.tags?.some(tag => tag.toLowerCase().includes(searchText))
    )
  }

  return recipes
})

const filteredPreparations = computed(() => {
  let preparations = store.preparations

  // Filter by status
  if (localFilters.value.status === 'active') {
    preparations = preparations.filter(p => p.isActive)
  } else if (localFilters.value.status === 'archived') {
    preparations = preparations.filter(p => !p.isActive)
  }
  // 'all' shows everything

  // Filter by department
  if (localFilters.value.department && localFilters.value.department !== 'all') {
    preparations = preparations.filter(p => p.department === localFilters.value.department)
  }

  // Filter by search
  if (localFilters.value.search.trim()) {
    const searchText = localFilters.value.search.toLowerCase()
    preparations = preparations.filter(
      prep =>
        prep.name.toLowerCase().includes(searchText) ||
        prep.code.toLowerCase().includes(searchText) ||
        prep.description?.toLowerCase().includes(searchText)
    )
  }

  return preparations
})

const filteredCount = computed(() => {
  return props.activeTab === 'recipes'
    ? filteredRecipes.value.length
    : filteredPreparations.value.length
})

// =============================================
// METHODS
// =============================================

// Debounced search function
let searchTimeout: NodeJS.Timeout | null = null

function handleSearchInput() {
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  // Set new timeout for debounced search
  searchTimeout = setTimeout(() => {
    applySearch()
  }, 300)
}

function applySearch() {
  DebugUtils.debug(MODULE_NAME, 'Applying search', {
    search: localFilters.value.search,
    status: localFilters.value.status,
    tab: props.activeTab
  })

  // Emit filters to parent
  emit('update:filters', { ...localFilters.value })
}

function toggleAllPanels() {
  allExpanded.value = !allExpanded.value
  emit('toggleAllPanels')

  DebugUtils.debug(MODULE_NAME, 'Toggle all panels', {
    expanded: allExpanded.value
  })
}

// =============================================
// WATCHERS
// =============================================

// Watch for filter changes and emit to parent
watch(
  () => localFilters.value.status,
  newStatus => {
    DebugUtils.debug(MODULE_NAME, 'Status filter changed', {
      newStatus,
      tab: props.activeTab
    })

    // Apply immediately for status changes
    emit('update:filters', { ...localFilters.value })
  }
)

// Watch for department filter changes
watch(
  () => localFilters.value.department,
  newDepartment => {
    DebugUtils.debug(MODULE_NAME, 'Department filter changed', {
      newDepartment,
      tab: props.activeTab
    })

    // Apply immediately for department changes
    emit('update:filters', { ...localFilters.value })
  }
)

// Watch for tab changes and update counts
watch(
  () => props.activeTab,
  newTab => {
    DebugUtils.debug(MODULE_NAME, 'Active tab changed', {
      newTab,
      recipesCount: recipesCount.value,
      preparationsCount: preparationsCount.value
    })
  }
)

// =============================================
// DEBUG HELPERS
// =============================================

// Global debug flag
const $DEBUG = import.meta.env.DEV

// =============================================
// LIFECYCLE
// =============================================

// Initialize filters on mount
emit('update:filters', { ...localFilters.value })

// Expand all panels by default
setTimeout(() => {
  emit('toggleAllPanels')
}, 100)
</script>

<style lang="scss" scoped>
.tab-toggle {
  width: 100%;
  display: flex;
  justify-content: center;
}

.tab-toggle :deep(.v-btn) {
  flex: 1;
  max-width: 250px;
  min-width: 180px;
}

.status-filter {
  min-width: auto;
  justify-content: flex-start;

  :deep(.v-chip-group__slider) {
    display: none; // Hide the slider for cleaner look
  }
}

// Responsive design
@media (max-width: 768px) {
  .tab-toggle :deep(.v-btn) {
    font-size: 0.875rem;
    padding: 8px 12px;
    max-width: none;
    min-width: 140px;
  }

  .status-filter {
    justify-content: center;

    :deep(.v-chip) {
      font-size: 0.75rem;
      height: 28px;
    }
  }
}

@media (max-width: 960px) {
  .tab-toggle {
    justify-content: stretch;
  }

  .tab-toggle :deep(.v-btn) {
    flex: 1;
    min-width: auto;
  }
}

// Debug info styling
:deep(.v-chip.debug-chip) {
  font-family: monospace;
  font-size: 0.7rem;
}
</style>
