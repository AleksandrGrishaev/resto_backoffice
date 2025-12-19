<template>
  <v-card v-if="showWidget" class="used-in-widget" elevation="1">
    <v-card-title class="text-subtitle-1">
      <v-icon start size="small">mdi-link-variant</v-icon>
      Used In ({{ totalUsages }})
    </v-card-title>

    <v-card-text>
      <div v-if="loading" class="text-center py-4">
        <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
      </div>

      <div v-else-if="totalUsages === 0" class="text-center py-4 text-medium-emphasis">
        <v-icon size="48" color="grey-lighten-1">mdi-link-off</v-icon>
        <p class="mt-2">Not used anywhere</p>
      </div>

      <div v-else>
        <!-- Recipe: Menu Items -->
        <div v-if="type === 'recipe' && usage.menuItems && usage.menuItems.length > 0">
          <div class="text-subtitle-2 mb-2">
            <v-icon start size="small">mdi-food</v-icon>
            Menu Items ({{ usage.menuItems.length }})
          </div>
          <v-list density="compact" class="mb-3">
            <v-list-item
              v-for="item in usage.menuItems"
              :key="`menu-${item.menuItemId}-${item.variantId}`"
              :class="{ 'text-medium-emphasis': !item.isActive }"
              @click="navigateToMenuItem(item.menuItemId)"
            >
              <template #prepend>
                <v-icon size="small" color="primary">mdi-food-variant</v-icon>
              </template>
              <v-list-item-title>
                {{ item.menuItemName }}
                <span v-if="item.variantName" class="text-caption text-medium-emphasis">
                  ({{ item.variantName }})
                </span>
              </v-list-item-title>
              <v-list-item-subtitle>
                Quantity: {{ item.quantity }} {{ item.unit }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip v-if="!item.isActive" size="x-small" color="grey">Inactive</v-chip>
                <v-icon size="small">mdi-chevron-right</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </div>

        <!-- Recipe: Parent Recipes (nested) -->
        <div v-if="type === 'recipe' && usage.parentRecipes && usage.parentRecipes.length > 0">
          <div class="text-subtitle-2 mb-2">
            <v-icon start size="small">mdi-book-open-variant</v-icon>
            Recipes ({{ usage.parentRecipes.length }})
          </div>
          <v-list density="compact" class="mb-3">
            <v-list-item
              v-for="item in usage.parentRecipes"
              :key="item.recipeId"
              :class="{ 'text-medium-emphasis': !item.isActive }"
              @click="navigateToRecipe(item.recipeId)"
            >
              <template #prepend>
                <v-icon size="small" color="secondary">mdi-book-variant</v-icon>
              </template>
              <v-list-item-title>
                {{ item.recipeName }}
                <span class="text-caption text-medium-emphasis">({{ item.recipeCode }})</span>
              </v-list-item-title>
              <v-list-item-subtitle>
                Quantity: {{ item.quantity }} {{ item.unit }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip v-if="!item.isActive" size="x-small" color="grey">Inactive</v-chip>
                <v-icon size="small">mdi-chevron-right</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </div>

        <!-- Preparation: Recipes -->
        <div v-if="type === 'preparation' && usage.recipes && usage.recipes.length > 0">
          <div class="text-subtitle-2 mb-2">
            <v-icon start size="small">mdi-book-open-variant</v-icon>
            Recipes ({{ usage.recipes.length }})
          </div>
          <v-list density="compact" class="mb-3">
            <v-list-item
              v-for="item in usage.recipes"
              :key="item.recipeId"
              :class="{ 'text-medium-emphasis': !item.isActive }"
              @click="navigateToRecipe(item.recipeId)"
            >
              <template #prepend>
                <v-icon size="small" color="secondary">mdi-book-variant</v-icon>
              </template>
              <v-list-item-title>
                {{ item.recipeName }}
                <span class="text-caption text-medium-emphasis">({{ item.recipeCode }})</span>
              </v-list-item-title>
              <v-list-item-subtitle>
                Quantity: {{ item.quantity }} {{ item.unit }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip v-if="!item.isActive" size="x-small" color="grey">Inactive</v-chip>
                <v-icon size="small">mdi-chevron-right</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </div>

        <!-- Preparation: Parent Preparations (nested) -->
        <div
          v-if="
            type === 'preparation' &&
            usage.parentPreparations &&
            usage.parentPreparations.length > 0
          "
        >
          <div class="text-subtitle-2 mb-2">
            <v-icon start size="small">mdi-package-variant</v-icon>
            Preparations ({{ usage.parentPreparations.length }})
          </div>
          <v-list density="compact">
            <v-list-item
              v-for="item in usage.parentPreparations"
              :key="item.preparationId"
              :class="{ 'text-medium-emphasis': !item.isActive }"
              @click="navigateToPreparation(item.preparationId)"
            >
              <template #prepend>
                <v-icon size="small" color="orange">mdi-package</v-icon>
              </template>
              <v-list-item-title>
                {{ item.preparationName }}
                <span class="text-caption text-medium-emphasis">({{ item.preparationCode }})</span>
              </v-list-item-title>
              <v-list-item-subtitle>
                Quantity: {{ item.quantity }} {{ item.unit }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip v-if="!item.isActive" size="x-small" color="grey">Inactive</v-chip>
                <v-icon size="small">mdi-chevron-right</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRecipeUsage } from '@/stores/recipes/composables/useRecipeUsage'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import { useMenuStore } from '@/stores/menu/menuStore'
import type {
  RecipeUsageInfo,
  PreparationUsageInfo
} from '@/stores/recipes/composables/useRecipeUsage'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'UsedInWidget'

// =============================================
// PROPS
// =============================================

interface Props {
  type: 'recipe' | 'preparation'
  itemId: string
}

const props = defineProps<Props>()

// =============================================
// STATE
// =============================================

const router = useRouter()
const recipesStore = useRecipesStore()
const menuStore = useMenuStore()
const { findRecipeUsage, findPreparationUsage } = useRecipeUsage()

const loading = ref(false)
const usage = ref<RecipeUsageInfo | PreparationUsageInfo | null>(null)

// =============================================
// COMPUTED
// =============================================

const totalUsages = computed(() => {
  if (!usage.value) return 0
  return usage.value.totalUsages
})

const showWidget = computed(() => {
  // Always show widget (even if no usages, to inform user)
  return true
})

// =============================================
// METHODS
// =============================================

async function loadUsageData() {
  loading.value = true

  try {
    if (props.type === 'recipe') {
      usage.value = findRecipeUsage(
        props.itemId,
        recipesStore.recipes,
        menuStore.menuItems
      ) as RecipeUsageInfo
    } else if (props.type === 'preparation') {
      usage.value = findPreparationUsage(
        props.itemId,
        recipesStore.preparations,
        recipesStore.recipes
      ) as PreparationUsageInfo
    }

    DebugUtils.info(MODULE_NAME, 'Usage data loaded', {
      type: props.type,
      itemId: props.itemId,
      totalUsages: usage.value?.totalUsages
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load usage data', { error })
  } finally {
    loading.value = false
  }
}

function navigateToMenuItem(menuItemId: string) {
  router.push({ name: 'menu', query: { itemId: menuItemId } })
}

function navigateToRecipe(recipeId: string) {
  // Trigger recipe edit dialog (implementation depends on parent component)
  // For now, just log
  DebugUtils.info(MODULE_NAME, 'Navigate to recipe', { recipeId })
  // You can emit an event to parent or use event bus
}

function navigateToPreparation(preparationId: string) {
  // Trigger preparation edit dialog (implementation depends on parent component)
  DebugUtils.info(MODULE_NAME, 'Navigate to preparation', { preparationId })
  // You can emit an event to parent or use event bus
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  loadUsageData()
})

// Watch for changes in itemId
watch(
  () => props.itemId,
  () => {
    loadUsageData()
  }
)
</script>

<style scoped lang="scss">
.used-in-widget {
  margin-top: 16px;
}

.v-list-item {
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
}
</style>
