<script setup lang="ts">
/**
 * Menu Item Export Options Dialog
 * Unified dialog for exporting menu items with various options
 */

import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: boolean
  itemName: string
  isModifiable: boolean
  totalCombinations: number
}

export interface MenuItemExportOptions {
  includeRecipes: boolean
  includeAllCombinations: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  export: [MenuItemExportOptions]
}>()

// Options state
const includeRecipes = ref(true)
const includeAllCombinations = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const showCombinationsWarning = computed(() => {
  return props.isModifiable && includeAllCombinations.value && props.totalCombinations > 50
})

const combinationsCount = computed(() => {
  if (!props.isModifiable) return 0
  return includeAllCombinations.value
    ? props.totalCombinations
    : Math.min(10, props.totalCombinations)
})

function handleExport() {
  emit('export', {
    includeRecipes: includeRecipes.value,
    includeAllCombinations: includeAllCombinations.value
  })
  isOpen.value = false
}

function handleCancel() {
  isOpen.value = false
}

// Reset options when dialog opens
watch(isOpen, newValue => {
  if (newValue) {
    includeRecipes.value = false
    includeAllCombinations.value = false
  }
})
</script>

<template>
  <v-dialog v-model="isOpen" max-width="450" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-file-pdf-box</v-icon>
        Export Menu Item
      </v-card-title>

      <v-card-subtitle class="pb-0">
        {{ itemName }}
      </v-card-subtitle>

      <v-card-text class="pt-4">
        <!-- Recipe Details Option -->
        <div class="option-section">
          <v-checkbox
            v-model="includeRecipes"
            label="Include recipe details"
            hint="Show ingredients and costs for each component"
            persistent-hint
            density="compact"
            hide-details="auto"
            color="primary"
          />
        </div>

        <!-- Combinations Options (only for modifiable items) -->
        <template v-if="isModifiable">
          <v-divider class="my-4" />

          <div class="option-section">
            <p class="text-body-2 font-weight-medium mb-2">
              <v-icon icon="mdi-table-multiple" size="18" class="mr-1" />
              Modifier Combinations
            </p>

            <v-checkbox
              v-model="includeAllCombinations"
              density="compact"
              hide-details="auto"
              color="primary"
            >
              <template #label>
                <span>
                  Include all combinations
                  <span class="text-medium-emphasis">({{ totalCombinations }} total)</span>
                </span>
              </template>
            </v-checkbox>

            <div class="combinations-info mt-2 ml-8">
              <v-chip
                size="small"
                :color="showCombinationsWarning ? 'warning' : 'default'"
                variant="tonal"
              >
                {{ combinationsCount }} combinations will be exported
              </v-chip>
            </div>

            <!-- Warning for large exports -->
            <v-alert
              v-if="showCombinationsWarning"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-3"
            >
              <template #text>
                Exporting {{ totalCombinations }} combinations may result in a large PDF and take
                longer to generate.
              </template>
            </v-alert>
          </div>
        </template>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-download" @click="handleExport">
          Export PDF
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.option-section {
  margin-bottom: 8px;
}

.combinations-info {
  font-size: 0.85rem;
}
</style>
