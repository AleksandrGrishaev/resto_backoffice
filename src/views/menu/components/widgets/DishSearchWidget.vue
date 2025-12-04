<!-- src/views/menu/components/widgets/DishSearchWidget.vue -->
<template>
  <v-card variant="outlined" class="dish-search-widget">
    <v-card-text class="pa-4">
      <!-- Search and Filters -->
      <div class="d-flex gap-3 mb-4">
        <!-- Search Field -->
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search by dish name..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="flex-grow-1"
        />

        <!-- Type Filter -->
        <v-select
          v-model="selectedType"
          :items="typeOptions"
          label="Type"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          prepend-inner-icon="mdi-filter-variant"
          style="min-width: 180px"
        />

        <!-- Category Filter -->
        <v-select
          v-model="selectedCategory"
          :items="categoryOptions"
          label="Category"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          prepend-inner-icon="mdi-shape"
          style="min-width: 200px"
        />
      </div>

      <!-- Results Summary -->
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-body-2 text-medium-emphasis">
          <template v-if="filteredDishes.length === dishes.length">
            Showing all {{ filteredDishes.length }} dishes
          </template>
          <template v-else>{{ filteredDishes.length }} of {{ dishes.length }} dishes</template>
        </div>

        <!-- Sort Options -->
        <v-btn-toggle v-model="sortBy" size="small" variant="outlined" divided mandatory>
          <v-btn value="name" size="small">
            <v-icon size="18">mdi-sort-alphabetical-ascending</v-icon>
            <span class="ml-1">Name</span>
          </v-btn>
          <v-btn value="type" size="small">
            <v-icon size="18">mdi-shape</v-icon>
            <span class="ml-1">Type</span>
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- Dish List -->
      <div class="dishes-list">
        <div
          v-for="dish in displayedDishes"
          :key="dish.id"
          class="dish-item pa-3 mb-2"
          :class="{ selected: selectedDish?.id === dish.id }"
          @click="selectDish(dish)"
        >
          <div class="d-flex align-center justify-space-between">
            <!-- Dish Info -->
            <div class="d-flex align-center flex-grow-1">
              <v-avatar
                :color="dish.type === 'recipe' ? 'primary' : 'secondary'"
                variant="tonal"
                size="40"
                class="mr-3"
              >
                <v-icon
                  :icon="dish.type === 'recipe' ? 'mdi-chef-hat' : 'mdi-food-variant'"
                  size="20"
                />
              </v-avatar>

              <div class="flex-grow-1">
                <div class="font-weight-bold text-body-1 mb-1">{{ dish.name }}</div>
                <div class="text-caption text-medium-emphasis d-flex align-center gap-2">
                  <v-chip size="x-small" :color="dish.type === 'recipe' ? 'primary' : 'secondary'">
                    {{ dish.type === 'recipe' ? 'Recipe' : 'Semi-finished' }}
                  </v-chip>
                  <span>{{ dish.outputQuantity }} {{ getUnitLabel(dish.unit) }}</span>
                </div>
              </div>
            </div>

            <!-- Selection Indicator -->
            <v-icon
              v-if="selectedDish?.id === dish.id"
              icon="mdi-check-circle"
              color="primary"
              class="ml-3"
            />
          </div>
        </div>

        <!-- No Results -->
        <div v-if="filteredDishes.length === 0" class="text-center pa-8">
          <v-icon icon="mdi-chef-hat" size="64" color="grey-lighten-1" class="mb-3" />
          <div class="text-h6 mb-1">No Dishes Found</div>
          <div class="text-body-2 text-medium-emphasis">Try adjusting your search or filters</div>
        </div>

        <!-- Load More Trigger -->
        <div v-if="hasMore" v-intersect="onIntersect" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary" size="32" />
        </div>

        <!-- End of Results -->
        <div v-else-if="displayedDishes.length > 0" class="text-center pa-2">
          <div class="text-caption text-medium-emphasis">
            All {{ filteredDishes.length }} dishes shown
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface DishOption {
  id: string
  name: string
  type: 'recipe' | 'preparation'
  unit: string
  outputQuantity: number
  category?: string
}

interface Props {
  dishes: DishOption[]
  itemsPerPage?: number
}

interface Emits {
  (e: 'dish-selected', dish: DishOption): void
}

const props = withDefaults(defineProps<Props>(), {
  itemsPerPage: 20
})

const emits = defineEmits<Emits>()

// Local State
const searchQuery = ref('')
const selectedType = ref<'recipe' | 'preparation' | null>(null)
const selectedCategory = ref<string | null>(null)
const selectedDish = ref<DishOption | null>(null)
const sortBy = ref<'name' | 'type'>('name')
const displayCount = ref(props.itemsPerPage)

// Type Options
const typeOptions = [
  { title: 'All Types', value: null },
  { title: 'Recipes', value: 'recipe' },
  { title: 'Semi-finished', value: 'preparation' }
]

// Category Options
const categoryOptions = computed(() => {
  const categories = new Map<string, number>()

  props.dishes.forEach(dish => {
    if (dish.category) {
      const count = categories.get(dish.category) || 0
      categories.set(dish.category, count + 1)
    }
  })

  const options = [{ title: 'All Categories', value: null }]

  categories.forEach((count, category) => {
    options.push({
      title: `${category} (${count})`,
      value: category
    })
  })

  return options
})

// Filtered Dishes
const filteredDishes = computed(() => {
  let result = [...props.dishes]

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(d => d.name.toLowerCase().includes(query))
  }

  // Type filter
  if (selectedType.value) {
    result = result.filter(d => d.type === selectedType.value)
  }

  // Category filter
  if (selectedCategory.value) {
    result = result.filter(d => d.category === selectedCategory.value)
  }

  // Sort
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'type':
        return a.type.localeCompare(b.type)
      default:
        return 0
    }
  })

  return result
})

// Lazy Loading
const displayedDishes = computed(() => {
  return filteredDishes.value.slice(0, displayCount.value)
})

const hasMore = computed(() => {
  return displayCount.value < filteredDishes.value.length
})

// Reset display count when filters change
watch([searchQuery, selectedType, selectedCategory], () => {
  displayCount.value = props.itemsPerPage
})

// Methods
function selectDish(dish: DishOption) {
  selectedDish.value = dish
  emits('dish-selected', dish)
}

function onIntersect(isIntersecting: boolean) {
  if (isIntersecting && hasMore.value) {
    displayCount.value += props.itemsPerPage
  }
}

function getUnitLabel(unit: string): string {
  const unitMap: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pc',
    liter: 'L',
    kg: 'kg'
  }
  return unitMap[unit] || unit
}
</script>

<style scoped lang="scss">
.dish-search-widget {
  .dishes-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .dish-item {
    border-radius: 8px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    background-color: rgb(var(--v-theme-surface));
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border-color: rgb(var(--v-theme-primary));
    }

    &.selected {
      border-color: rgb(var(--v-theme-primary));
      background-color: rgba(var(--v-theme-primary), 0.05);
    }
  }
}
</style>
