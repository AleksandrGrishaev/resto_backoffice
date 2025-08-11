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
            @input="debouncedSearch"
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
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  activeTab: 'recipes' | 'preparations'
}

interface Emits {
  (e: 'update:activeTab', value: 'recipes' | 'preparations'): void
  (e: 'toggleAllPanels'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Mock counts - TODO: get from store
const recipesCount = ref(12)
const preparationsCount = ref(8)

// Local state - только основные фильтры
const localFilters = ref({
  search: '',
  status: 'active' as 'active' | 'all'
})

const localActiveTab = computed({
  get: () => props.activeTab,
  set: value => emit('update:activeTab', value)
})

const allExpanded = ref(true)

// Methods
const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

const debouncedSearch = debounce((event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value || ''
  // TODO: Implement search filter in store
  console.log('Search:', value)
}, 300)

function toggleAllPanels() {
  allExpanded.value = !allExpanded.value
  emit('toggleAllPanels')
}
</script>

<style scoped>
.tab-toggle {
  width: 100%;
  display: flex;
  justify-content: center;
}

.tab-toggle :deep(.v-btn) {
  flex: 1;
  max-width: 200px;
}

.status-filter {
  min-width: auto;
  justify-content: flex-start;
}

@media (max-width: 768px) {
  .tab-toggle :deep(.v-btn) {
    font-size: 0.875rem;
    padding: 8px 12px;
    max-width: none;
  }

  .status-filter {
    justify-content: center;
  }
}
</style>
