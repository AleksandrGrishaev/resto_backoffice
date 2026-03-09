<!-- src/views/recipes/components/ConvertEntityDialog.vue -->
<template>
  <v-dialog v-model="dialogModel" max-width="520px" persistent>
    <v-card>
      <v-card-title class="text-h6 pa-4">
        {{ title }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Loading state -->
        <div v-if="checking" class="text-center py-4">
          <v-progress-circular indeterminate color="primary" />
          <div class="text-body-2 mt-2">Checking conversion eligibility...</div>
        </div>

        <template v-else>
          <!-- Blockers (errors) -->
          <v-alert
            v-for="(blocker, i) in checkResult.blockers"
            :key="'b-' + i"
            type="error"
            variant="tonal"
            class="mb-3"
            density="compact"
          >
            {{ blocker }}
          </v-alert>

          <!-- Warnings -->
          <v-alert
            v-for="(warning, i) in checkResult.warnings"
            :key="'w-' + i"
            type="warning"
            variant="tonal"
            class="mb-3"
            density="compact"
          >
            {{ warning }}
          </v-alert>

          <!-- No issues -->
          <v-alert
            v-if="checkResult.blockers.length === 0 && checkResult.warnings.length === 0"
            type="info"
            variant="tonal"
            class="mb-3"
            density="compact"
          >
            No issues found. Ready to convert.
          </v-alert>

          <!-- Required fields for conversion -->
          <template v-if="checkResult.canConvert">
            <div class="text-subtitle-2 mb-2 mt-2">Conversion Settings</div>

            <!-- Recipe → Preparation: select preparation category -->
            <v-select
              v-if="fromType === 'recipe'"
              v-model="newFields.type"
              :items="preparationCategories"
              item-title="name"
              item-value="id"
              label="Preparation Category"
              :rules="[v => !!v || 'Required']"
              density="compact"
              variant="outlined"
              class="mb-2"
            />

            <!-- Preparation → Recipe: select recipe category -->
            <v-select
              v-if="fromType === 'preparation'"
              v-model="newFields.category"
              :items="recipeCategories"
              item-title="name"
              item-value="id"
              label="Recipe Category"
              :rules="[v => !!v || 'Required']"
              density="compact"
              variant="outlined"
              class="mb-2"
            />

            <!-- Summary of what will happen -->
            <div class="text-body-2 text-medium-emphasis mt-2">
              <div>
                <strong>{{ item?.name }}</strong>
                will be converted from
                <v-chip
                  size="x-small"
                  :color="fromType === 'recipe' ? 'blue' : 'orange'"
                  class="mx-1"
                >
                  {{ fromType }}
                </v-chip>
                to
                <v-chip
                  size="x-small"
                  :color="toType === 'recipe' ? 'blue' : 'orange'"
                  class="mx-1"
                >
                  {{ toType }}
                </v-chip>
              </div>
              <div class="mt-1">
                Components and menu item references will be migrated automatically.
              </div>
              <div class="mt-1">The original {{ fromType }} will be archived (not deleted).</div>
            </div>
          </template>
        </template>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="dialogModel = false">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="converting"
          :disabled="!canProceed"
          @click="handleConvert"
        >
          Convert
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useConversionCheck } from '@/stores/recipes/composables/useConversionCheck'
import type { Recipe, Preparation } from '@/stores/recipes/types'

interface Props {
  modelValue: boolean
  item: Recipe | Preparation | null
  fromType: 'recipe' | 'preparation'
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'converted', payload: { newId: string; newType: 'recipe' | 'preparation' }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const recipesStore = useRecipesStore()
const { checkRecipeToPreparation, checkPreparationToRecipe } = useConversionCheck()

const checking = ref(false)
const converting = ref(false)
const checkResult = ref<{ canConvert: boolean; blockers: string[]; warnings: string[] }>({
  canConvert: false,
  blockers: [],
  warnings: []
})

const newFields = ref<Record<string, any>>({})

const dialogModel = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

const toType = computed(() => (props.fromType === 'recipe' ? 'preparation' : 'recipe'))

const title = computed(() =>
  props.fromType === 'recipe' ? 'Convert to Preparation' : 'Convert to Recipe'
)

const preparationCategories = computed(() => recipesStore.activePreparationCategories)
const recipeCategories = computed(() => recipesStore.activeRecipeCategories)

const canProceed = computed(() => {
  if (!checkResult.value.canConvert) return false
  if (props.fromType === 'recipe' && !newFields.value.type) return false
  if (props.fromType === 'preparation' && !newFields.value.category) return false
  return true
})

// Run checks when dialog opens
watch(dialogModel, async val => {
  if (!val || !props.item) return

  checking.value = true
  newFields.value = {}

  try {
    if (props.fromType === 'recipe') {
      checkResult.value = await checkRecipeToPreparation(props.item as Recipe)
      // Pre-select first category
      if (preparationCategories.value.length > 0) {
        newFields.value.type = preparationCategories.value[0].id
      }
    } else {
      checkResult.value = await checkPreparationToRecipe(props.item as Preparation)
      // Pre-select first category
      if (recipeCategories.value.length > 0) {
        newFields.value.category = recipeCategories.value[0].id
      }
    }
  } catch (err) {
    checkResult.value = {
      canConvert: false,
      blockers: ['Failed to check conversion eligibility.'],
      warnings: []
    }
  } finally {
    checking.value = false
  }
})

async function handleConvert() {
  if (!props.item || !canProceed.value) return

  converting.value = true
  try {
    const result = await recipesStore.convertEntity(props.item.id, props.fromType, newFields.value)

    dialogModel.value = false
    emit('converted', { newId: result.newId, newType: toType.value })
  } catch (err: any) {
    checkResult.value = {
      canConvert: false,
      blockers: [`Conversion failed: ${err?.message || 'Unknown error'}`],
      warnings: []
    }
  } finally {
    converting.value = false
  }
}
</script>
