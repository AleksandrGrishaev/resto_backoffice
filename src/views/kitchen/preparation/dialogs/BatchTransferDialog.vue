<!-- src/views/kitchen/preparation/dialogs/BatchTransferDialog.vue -->
<!-- Transfer preparation batch between storage locations (freeze/thaw/move) -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="440"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="batch" class="dialog-card">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 pb-2">
        <div class="d-flex align-center">
          <v-icon class="mr-2" :icon="headerIcon" :color="headerColor" />
          <div>
            <h3 class="text-h6">{{ headerTitle }}</h3>
            <div class="text-caption text-medium-emphasis">{{ preparationName }}</div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="handleCancel" />
      </v-card-title>

      <v-card-text class="pa-4 pt-2">
        <!-- Destination -->
        <div class="text-subtitle-2 mb-2">Transfer to:</div>
        <v-btn-toggle
          v-model="toLocation"
          mandatory
          color="primary"
          class="w-100 mb-4"
          density="comfortable"
        >
          <v-btn
            v-for="loc in availableDestinations"
            :key="loc.value"
            :value="loc.value"
            class="flex-grow-1"
            :prepend-icon="loc.icon"
          >
            {{ loc.label }}
          </v-btn>
        </v-btn-toggle>

        <!-- Quantity: portions mode -->
        <template v-if="isPortionType">
          <div class="text-subtitle-2 mb-2">Portions to transfer:</div>
          <div class="d-flex align-center gap-2 mb-1">
            <v-btn
              icon="mdi-minus"
              size="small"
              variant="tonal"
              :disabled="transferPortions <= 1"
              @click="transferPortions--"
            />
            <NumericInputField
              :model-value="transferPortions"
              variant="outlined"
              density="compact"
              :min="1"
              :max="totalPortions"
              suffix="pcs"
              hide-details
              class="flex-grow-1"
              @update:model-value="transferPortions = $event"
            />
            <v-btn
              icon="mdi-plus"
              size="small"
              variant="tonal"
              :disabled="transferPortions >= totalPortions"
              @click="transferPortions++"
            />
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              @click="transferPortions = totalPortions"
            >
              All
            </v-btn>
          </div>
          <div class="text-caption text-medium-emphasis mb-4">
            {{ transferPortions }} of {{ totalPortions }} portions ({{
              Math.round(transferQuantityGrams)
            }}g)
          </div>
        </template>

        <!-- Quantity: weight mode -->
        <template v-else>
          <div class="text-subtitle-2 mb-2">Quantity to transfer:</div>
          <div class="d-flex align-center gap-2 mb-4">
            <NumericInputField
              :model-value="transferQuantityGrams"
              variant="outlined"
              density="compact"
              :min="1"
              :max="batch.currentQuantity"
              :suffix="batch.unit"
              hide-details
              class="flex-grow-1"
              @update:model-value="transferQuantityGrams = $event"
            />
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              @click="transferQuantityGrams = batch.currentQuantity"
            >
              All
            </v-btn>
          </div>
        </template>

        <!-- New expiry -->
        <div
          v-if="newExpiryDate"
          class="d-flex justify-space-between align-center text-body-2 mb-3"
        >
          <span class="text-medium-emphasis">New expiry:</span>
          <span class="font-weight-medium">{{ formatDate(newExpiryDate) }}</span>
        </div>

        <!-- Notes -->
        <v-text-field
          v-model="notes"
          label="Notes (optional)"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-spacer />
        <v-btn
          :color="headerColor"
          variant="flat"
          :prepend-icon="headerIcon"
          :disabled="!canSubmit"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePreparationStore } from '@/stores/preparation/preparationStore'
import { STORAGE_LOCATION_OPTIONS } from '@/stores/preparation/types'
import type {
  PreparationBatch,
  StorageLocation,
  PreparationDepartment
} from '@/stores/preparation/types'
import { useRecipesStore } from '@/stores/recipes'
import { NumericInputField } from '@/components/input'
import { TimeUtils } from '@/utils'

const props = defineProps<{
  modelValue: boolean
  batch: PreparationBatch | null
  preparationName: string
  department: PreparationDepartment
  responsiblePerson: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  transferred: []
}>()

const preparationStore = usePreparationStore()
const recipesStore = useRecipesStore()

// Form state
const toLocation = ref<StorageLocation>('freezer')
const transferPortions = ref(0)
const transferQuantityGrams = ref(0)
const notes = ref('')
const loading = ref(false)

// Preparation info from recipes store
const portionSize = computed(() => {
  if (!props.batch) return 0
  const prep = recipesStore.preparations?.find(p => p.id === props.batch!.preparationId)
  return prep?.portionSize || props.batch.portionSize || 0
})

const isPortionType = computed(() => {
  if (!props.batch) return false
  const prep = recipesStore.preparations?.find(p => p.id === props.batch!.preparationId)
  return (prep?.portionType || props.batch.portionType) === 'portion' && portionSize.value > 0
})

const totalPortions = computed(() => {
  if (!props.batch || !portionSize.value) return 0
  return Math.floor(props.batch.currentQuantity / portionSize.value)
})

// Sync portions ↔ grams
watch(transferPortions, portions => {
  if (isPortionType.value && portionSize.value) {
    transferQuantityGrams.value = portions * portionSize.value
  }
})

// Reset form when batch changes
watch(
  () => props.batch,
  batch => {
    if (batch) {
      notes.value = ''
      const current = batch.storageLocation || 'fridge'
      toLocation.value = current === 'freezer' ? 'fridge' : 'freezer'

      if (isPortionType.value) {
        transferPortions.value = totalPortions.value
        transferQuantityGrams.value = batch.currentQuantity
      } else {
        transferQuantityGrams.value = batch.currentQuantity
      }
    }
  },
  { immediate: true }
)

// Computed
const fromLocation = computed<StorageLocation>(() => props.batch?.storageLocation || 'fridge')

const availableDestinations = computed(() =>
  STORAGE_LOCATION_OPTIONS.filter(loc => loc.value !== fromLocation.value)
)

const isFreeze = computed(() => toLocation.value === 'freezer' && fromLocation.value !== 'freezer')

const isThaw = computed(() => fromLocation.value === 'freezer' && toLocation.value !== 'freezer')

const headerIcon = computed(() =>
  isFreeze.value ? 'mdi-snowflake' : isThaw.value ? 'mdi-sun-thermometer' : 'mdi-swap-horizontal'
)

const headerColor = computed(() => (isFreeze.value ? 'blue' : isThaw.value ? 'orange' : 'primary'))

const headerTitle = computed(() => (isFreeze.value ? 'Freeze' : isThaw.value ? 'Thaw' : 'Transfer'))

const submitLabel = computed(() => (isFreeze.value ? 'Freeze' : isThaw.value ? 'Thaw' : 'Transfer'))

const newExpiryDate = computed(() => {
  if (!props.batch || !toLocation.value) return undefined
  return preparationStore.calculateTransferExpiry(
    fromLocation.value,
    toLocation.value,
    props.batch.preparationId,
    props.batch.expiryDate
  )
})

const canSubmit = computed(
  () =>
    props.batch &&
    toLocation.value &&
    transferQuantityGrams.value > 0 &&
    transferQuantityGrams.value <= (props.batch?.currentQuantity || 0) &&
    !loading.value
)

// Methods
function formatDate(date: string) {
  return TimeUtils.formatDateTimeForDisplay(date)
}

function handleCancel() {
  emit('update:modelValue', false)
}

async function handleSubmit() {
  if (!props.batch || !canSubmit.value) return

  loading.value = true
  try {
    const result = await preparationStore.transferBatch({
      department: props.department,
      responsiblePerson: props.responsiblePerson,
      sourceBatchId: props.batch.id,
      preparationId: props.batch.preparationId,
      quantity: transferQuantityGrams.value,
      fromLocation: fromLocation.value,
      toLocation: toLocation.value,
      notes: notes.value || undefined
    })

    if (result.success) {
      emit('transferred')
      emit('update:modelValue', false)
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.dialog-card {
  border-radius: 16px;
}
</style>
