<!-- src/views/storage/components/ProductionDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>Production - {{ formatDepartment(department) }}</h3>
          <div class="text-caption text-medium-emphasis">Create preparations from recipes</div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="isFormValid" @submit.prevent="handleSubmit">
          <!-- Responsible Person -->
          <v-text-field
            v-model="formData.responsiblePerson"
            label="Responsible Person"
            :rules="[v => !!v || 'Required field']"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            class="mb-4"
          />

          <!-- Recipe Selection -->
          <div class="mb-4">
            <v-label class="mb-2">Select Preparation Recipe</v-label>
            <v-select
              v-model="formData.preparationId"
              :items="availablePreparations"
              item-title="label"
              item-value="id"
              label="Choose preparation"
              :rules="[v => !!v || 'Please select a preparation']"
              variant="outlined"
              @update:model-value="handlePreparationChange"
            >
              <template #selection="{ item }">
                <div class="d-flex align-center">
                  <v-chip size="small" color="primary" variant="tonal" class="mr-2">
                    {{ item.raw.code }}
                  </v-chip>
                  {{ item.raw.name }}
                </div>
              </template>

              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps">
                  <template #prepend>
                    <v-chip size="small" color="primary" variant="tonal" class="mr-2">
                      {{ item.raw.code }}
                    </v-chip>
                  </template>

                  <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    Output: {{ item.raw.outputQuantity }} {{ item.raw.outputUnit }} •
                    {{ item.raw.preparationTime }} min
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-select>
          </div>

          <!-- Recipe Info -->
          <div v-if="selectedPreparation" class="mb-4">
            <v-card variant="tonal" color="info">
              <v-card-text class="pa-4">
                <div class="d-flex justify-space-between align-center mb-2">
                  <div>
                    <div class="text-subtitle-1 font-weight-medium">
                      {{ selectedPreparation.name }}
                    </div>
                    <div class="text-caption">
                      {{ selectedPreparation.description || 'No description' }}
                    </div>
                  </div>
                  <v-chip size="small" color="primary" variant="flat">
                    {{ selectedPreparation.code }}
                  </v-chip>
                </div>

                <div class="d-flex gap-4 text-body-2">
                  <div>
                    <v-icon icon="mdi-package-variant" size="14" class="mr-1" />
                    Output: {{ selectedPreparation.outputQuantity }}
                    {{ selectedPreparation.outputUnit }}
                  </div>
                  <div>
                    <v-icon icon="mdi-clock-outline" size="14" class="mr-1" />
                    Time: {{ selectedPreparation.preparationTime }} min
                  </div>
                  <div>
                    <v-icon icon="mdi-format-list-bulleted" size="14" class="mr-1" />
                    Ingredients: {{ selectedPreparation.recipe?.length || 0 }}
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Batch Count -->
          <div class="mb-4">
            <v-text-field
              v-model.number="formData.batchCount"
              label="Number of Batches"
              type="number"
              min="1"
              step="1"
              :rules="[v => (!!v && v > 0) || 'Must be at least 1']"
              variant="outlined"
              hint="How many recipe batches to produce"
              @update:model-value="calculateIngredients"
            />
          </div>

          <!-- Total Output Preview -->
          <div v-if="selectedPreparation && formData.batchCount > 0" class="mb-4">
            <v-card variant="outlined">
              <v-card-text class="pa-4">
                <div class="text-subtitle-2 mb-2">Production Summary</div>
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-h6 font-weight-bold text-success">
                      {{ totalOutput }} {{ selectedPreparation.outputUnit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formData.batchCount }} batch{{ formData.batchCount !== 1 ? 'es' : '' }} ×
                      {{ selectedPreparation.outputQuantity }} {{ selectedPreparation.outputUnit }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-h6 font-weight-bold text-primary">
                      {{ formatCurrency(totalCost) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">Total cost</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Required Ingredients -->
          <div v-if="requiredIngredients.length > 0" class="mb-4">
            <div class="d-flex justify-space-between align-center mb-3">
              <v-label>Required Ingredients</v-label>
              <v-chip
                :color="hasInsufficientIngredients ? 'error' : 'success'"
                size="small"
                variant="flat"
              >
                {{ hasInsufficientIngredients ? 'Insufficient stock' : 'Stock available' }}
              </v-chip>
            </div>

            <v-card variant="outlined">
              <v-list density="compact">
                <v-list-item
                  v-for="ingredient in requiredIngredients"
                  :key="ingredient.itemId"
                  class="px-4"
                >
                  <template #prepend>
                    <div class="ingredient-icon mr-3">🥩</div>
                  </template>

                  <v-list-item-title>
                    <div class="d-flex align-center justify-space-between">
                      <div>
                        <div class="font-weight-medium">{{ ingredient.itemName }}</div>
                        <div class="text-caption text-medium-emphasis">
                          Available: {{ getAvailableQuantity(ingredient.itemId) }}
                          {{ ingredient.unit }}
                        </div>
                      </div>
                      <div class="text-right">
                        <div
                          class="font-weight-medium"
                          :class="
                            isIngredientSufficient(ingredient) ? 'text-success' : 'text-error'
                          "
                        >
                          {{ ingredient.quantity }} {{ ingredient.unit }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ formatCurrency(ingredient.totalCost) }}
                        </div>
                      </div>
                    </div>
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </div>

          <!-- Expiry Date -->
          <div class="mb-4">
            <v-text-field
              v-model="formData.expiryDate"
              label="Expiry Date (optional)"
              type="date"
              variant="outlined"
              hint="When will the prepared items expire"
            />
          </div>

          <!-- Notes -->
          <v-textarea
            v-model="formData.notes"
            label="Notes (optional)"
            variant="outlined"
            rows="2"
            class="mb-4"
          />

          <!-- Validation Messages -->
          <v-alert v-if="validationError" type="error" variant="tonal" class="mb-4">
            {{ validationError }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn
          color="success"
          variant="flat"
          :loading="loading"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          Start Production
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStorageOperations } from '@/stores/storage/composables/useStorageOperations'
import { useRecipesStore } from '@/stores/recipes'
import type { StorageDepartment, CreateProductionData, StorageBatch } from '@/stores/storage'
import type { Preparation } from '@/stores/recipes/types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProductionDialog'

// Props
interface Props {
  modelValue: boolean
  department: StorageDepartment
  availableBatches: StorageBatch[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'create-production': [data: CreateProductionData]
  success: [message: string]
  error: [message: string]
}>()

// Stores & Composables
const recipesStore = useRecipesStore()
const storageOps = useStorageOperations()

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)
const validationError = ref('')

const formData = ref<CreateProductionData>({
  preparationId: '',
  batchCount: 1,
  department: props.department,
  responsiblePerson: '',
  expiryDate: '',
  notes: ''
})

// Computed
const availablePreparations = computed(() => {
  return storageOps.availablePreparations.value.map(prep => ({
    id: prep.id,
    label: `${prep.code} - ${prep.name}`,
    code: prep.code,
    name: prep.name,
    outputQuantity: prep.outputQuantity,
    outputUnit: prep.outputUnit,
    preparationTime: prep.preparationTime
  }))
})

const selectedPreparation = computed(() => {
  if (!formData.value.preparationId) return null
  return recipesStore.preparations.find(p => p.id === formData.value.preparationId) || null
})

const totalOutput = computed(() => {
  if (!selectedPreparation.value || !formData.value.batchCount) return 0
  return selectedPreparation.value.outputQuantity * formData.value.batchCount
})

const requiredIngredients = ref<any[]>([])
const totalCost = computed(() =>
  requiredIngredients.value.reduce((sum, ing) => sum + ing.totalCost, 0)
)

const hasInsufficientIngredients = computed(() =>
  requiredIngredients.value.some(ing => !isIngredientSufficient(ing))
)

const canSubmit = computed(
  () =>
    isFormValid.value &&
    !loading.value &&
    selectedPreparation.value &&
    !hasInsufficientIngredients.value &&
    requiredIngredients.value.length > 0
)

// Methods
function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function formatCurrency(amount: number): string {
  return storageOps.formatCurrency(amount)
}

function handlePreparationChange() {
  calculateIngredients()
}

function calculateIngredients() {
  if (!selectedPreparation.value || !formData.value.batchCount) {
    requiredIngredients.value = []
    validationError.value = ''
    return
  }

  try {
    requiredIngredients.value = storageOps.calculateRequiredIngredients(
      selectedPreparation.value,
      formData.value.batchCount,
      props.availableBatches
    )

    // Проверяем валидность
    const validation = storageOps.validateIngredientAvailability(
      selectedPreparation.value,
      formData.value.batchCount,
      props.availableBatches
    )

    if (!validation.valid) {
      const missing = validation.missingIngredients
        .map(ing => `${ing.name}: need ${ing.missing} ${ing.unit}`)
        .join(', ')
      validationError.value = `Insufficient ingredients: ${missing}`
    } else {
      validationError.value = ''
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to calculate ingredients', { error })
    validationError.value = 'Failed to calculate required ingredients'
  }
}

function getAvailableQuantity(itemId: string): number {
  return props.availableBatches
    .filter(batch => batch.itemId === itemId && batch.currentQuantity > 0)
    .reduce((sum, batch) => sum + batch.currentQuantity, 0)
}

function isIngredientSufficient(ingredient: any): boolean {
  const available = getAvailableQuantity(ingredient.itemId)
  return available >= ingredient.quantity
}

async function handleSubmit() {
  if (!canSubmit.value || !selectedPreparation.value) return

  try {
    loading.value = true
    DebugUtils.info(MODULE_NAME, 'Starting production', { formData: formData.value })

    // Создаем операцию производства через store
    const productionData: CreateProductionData = {
      preparationId: formData.value.preparationId,
      batchCount: formData.value.batchCount,
      department: formData.value.department,
      responsiblePerson: formData.value.responsiblePerson,
      expiryDate: formData.value.expiryDate || undefined,
      notes: formData.value.notes
    }

    // Вызываем метод создания производства из внешнего контекста
    // (StorageView будет обрабатывать это через store)
    emit('create-production', productionData)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Production failed', { error })
    emit('error', 'Failed to complete production')
  } finally {
    loading.value = false
  }
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

function resetForm() {
  formData.value = {
    preparationId: '',
    batchCount: 1,
    department: props.department,
    responsiblePerson: '',
    expiryDate: '',
    notes: ''
  }
  requiredIngredients.value = []
  validationError.value = ''

  if (form.value) {
    form.value.resetValidation()
  }
}

// Watch for dialog open
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      formData.value.department = props.department
    }
  }
)

// Watch department changes
watch(
  () => props.department,
  newDept => {
    formData.value.department = newDept
  }
)
</script>

<style lang="scss" scoped>
.ingredient-icon {
  font-size: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 6px;
}
</style>
