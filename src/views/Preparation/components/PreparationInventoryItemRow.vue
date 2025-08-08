<!-- src/views/preparation/components/PreparationInventoryItemRow.vue - Адаптация InventoryItemRow -->
<template>
  <v-card variant="outlined" class="inventory-item-row" :class="getRowClass()">
    <v-card-text class="pa-3">
      <v-row align="center">
        <!-- Preparation Info -->
        <v-col cols="12" md="3">
          <div class="d-flex align-center">
            <div class="item-icon mr-2">🍲</div>
            <div>
              <div class="text-subtitle-2 font-weight-medium">
                {{ modelValue.preparationName }}
              </div>
              <div class="text-caption text-medium-emphasis">
                Preparation
                <span v-if="hasShelfLifeWarning" class="ml-1">
                  <v-icon :icon="getShelfLifeIcon()" :color="getShelfLifeColor()" size="12" />
                  {{ getShelfLifeText() }}
                </span>
              </div>
            </div>
          </div>
        </v-col>

        <!-- System Quantity -->
        <v-col cols="6" md="2">
          <div class="text-center">
            <div class="text-caption text-medium-emphasis mb-1">System</div>
            <div class="text-body-1 font-weight-medium">
              {{ modelValue.systemQuantity }} {{ modelValue.unit }}
            </div>
          </div>
        </v-col>

        <!-- Actual Quantity Input -->
        <v-col cols="6" md="2">
          <v-text-field
            :model-value="modelValue.actualQuantity"
            label="Actual"
            type="number"
            min="0"
            step="10"
            :suffix="modelValue.unit"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="updateActualQuantity"
            @focus="$event.target.select()"
          />
        </v-col>

        <!-- Confirm Button -->
        <v-col cols="6" md="1">
          <div class="text-center">
            <v-btn
              :color="isConfirmedOrChanged ? 'success' : 'default'"
              :variant="isConfirmedOrChanged ? 'flat' : 'outlined'"
              size="small"
              icon="mdi-check"
              @click="toggleConfirmed"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">
                {{ getConfirmTooltip() }}
              </v-tooltip>
            </v-btn>
          </div>
        </v-col>

        <!-- Difference -->
        <v-col cols="6" md="2">
          <div class="text-center">
            <div class="text-caption text-medium-emphasis mb-1">Difference</div>
            <div
              class="text-body-1 font-weight-medium"
              :class="getDifferenceColor(modelValue.difference)"
            >
              {{ formatDifference(modelValue.difference) }} {{ modelValue.unit }}
            </div>
          </div>
        </v-col>

        <!-- Value Difference -->
        <v-col cols="6" md="2">
          <div class="text-center">
            <div class="text-caption text-medium-emphasis mb-1">Value Impact</div>
            <div
              class="text-body-1 font-weight-medium"
              :class="getDifferenceColor(modelValue.valueDifference)"
            >
              {{ formatCurrency(modelValue.valueDifference) }}
            </div>
            <div v-if="modelValue.countedBy" class="text-caption text-medium-emphasis mt-1">
              by {{ modelValue.countedBy }}
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Shelf Life Alert -->
      <v-alert
        v-if="hasShelfLifeWarning"
        :type="getShelfLifeAlertType()"
        variant="tonal"
        density="compact"
        class="mt-3"
      >
        <v-icon :icon="getShelfLifeIcon()" class="mr-1" />
        <strong>{{ getShelfLifeText() }}:</strong>
        {{ getShelfLifeMessage() }}
      </v-alert>

      <!-- Notes (expandable) -->
      <v-expand-transition>
        <div v-if="showNotes" class="mt-3">
          <v-textarea
            :model-value="modelValue.notes"
            label="Notes (optional)"
            variant="outlined"
            rows="2"
            density="compact"
            placeholder="Quality issues, expiry concerns, count details..."
            @update:model-value="updateNotes"
          />
        </div>
      </v-expand-transition>

      <!-- Toggle Notes Button -->
      <div
        v-if="modelValue.difference !== 0 || showNotes || hasShelfLifeWarning"
        class="text-center mt-2"
      >
        <v-btn
          size="small"
          variant="text"
          :prepend-icon="showNotes ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          @click="showNotes = !showNotes"
        >
          {{ showNotes ? 'Hide' : 'Add' }} Notes
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import type { PreparationInventoryItem } from '@/stores/preparation'

// Props
interface Props {
  modelValue: PreparationInventoryItem
  responsiblePerson: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: PreparationInventoryItem]
}>()

// Store
const preparationStore = usePreparationStore()

// State
const showNotes = ref(false)

// Computed
const isConfirmedOrChanged = computed(
  () =>
    props.modelValue.confirmed === true ||
    Math.abs(props.modelValue.actualQuantity - props.modelValue.systemQuantity) > 0.001 ||
    !!props.modelValue.countedBy
)

const hasShelfLifeWarning = computed(() => {
  try {
    const balance =
      preparationStore.getBalance(props.modelValue.preparationId, 'kitchen') ||
      preparationStore.getBalance(props.modelValue.preparationId, 'bar')
    return balance?.hasExpired || balance?.hasNearExpiry || false
  } catch (error) {
    return false
  }
})

// Methods
function formatDifference(difference: number): string {
  if (difference > 0) return `+${difference}`
  return difference.toString()
}

function formatCurrency(amount: number): string {
  if (Math.abs(amount) < 1) return '0'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function getDifferenceColor(value: number): string {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-error'
  return 'text-medium-emphasis'
}

function getRowClass(): string {
  if (hasShelfLifeWarning.value) return 'shelf-life-warning'
  if (props.modelValue.confirmed || props.modelValue.countedBy) return 'confirmed-row'
  if (Math.abs(props.modelValue.difference) > 0.001) return 'discrepancy-row'
  return 'default-row'
}

function getConfirmTooltip(): string {
  if (props.modelValue.confirmed) return 'Quantity confirmed as correct'
  if (Math.abs(props.modelValue.difference) > 0.001) return 'Discrepancy noted'
  if (props.modelValue.countedBy) return `Counted by ${props.modelValue.countedBy}`
  return 'Click to confirm quantity is correct'
}

function getShelfLifeIcon(): string {
  try {
    const balance =
      preparationStore.getBalance(props.modelValue.preparationId, 'kitchen') ||
      preparationStore.getBalance(props.modelValue.preparationId, 'bar')
    if (balance?.hasExpired) return 'mdi-alert-circle'
    if (balance?.hasNearExpiry) return 'mdi-clock-alert-outline'
    return 'mdi-information'
  } catch (error) {
    return 'mdi-information'
  }
}

function getShelfLifeColor(): string {
  try {
    const balance =
      preparationStore.getBalance(props.modelValue.preparationId, 'kitchen') ||
      preparationStore.getBalance(props.modelValue.preparationId, 'bar')
    if (balance?.hasExpired) return 'error'
    if (balance?.hasNearExpiry) return 'warning'
    return 'info'
  } catch (error) {
    return 'info'
  }
}

function getShelfLifeText(): string {
  try {
    const balance =
      preparationStore.getBalance(props.modelValue.preparationId, 'kitchen') ||
      preparationStore.getBalance(props.modelValue.preparationId, 'bar')
    if (balance?.hasExpired) return 'EXPIRED'
    if (balance?.hasNearExpiry) return 'EXPIRING'
    return 'Fresh'
  } catch (error) {
    return 'Unknown'
  }
}

function getShelfLifeAlertType(): string {
  try {
    const balance =
      preparationStore.getBalance(props.modelValue.preparationId, 'kitchen') ||
      preparationStore.getBalance(props.modelValue.preparationId, 'bar')
    if (balance?.hasExpired) return 'error'
    if (balance?.hasNearExpiry) return 'warning'
    return 'info'
  } catch (error) {
    return 'info'
  }
}

function getShelfLifeMessage(): string {
  try {
    const balance =
      preparationStore.getBalance(props.modelValue.preparationId, 'kitchen') ||
      preparationStore.getBalance(props.modelValue.preparationId, 'bar')
    if (balance?.hasExpired)
      return 'This preparation has expired and must be disposed of immediately for food safety'
    if (balance?.hasNearExpiry)
      return 'This preparation expires within 24 hours - use immediately or dispose'
    return 'This preparation is fresh'
  } catch (error) {
    return 'Unable to determine shelf life status'
  }
}

function toggleConfirmed() {
  const wasConfirmed = props.modelValue.confirmed
  const newConfirmed = !wasConfirmed

  // If confirming and no one has counted yet, mark current person
  const countedBy =
    newConfirmed && !props.modelValue.countedBy
      ? props.responsiblePerson
      : props.modelValue.countedBy

  emit('update:modelValue', {
    ...props.modelValue,
    confirmed: newConfirmed,
    countedBy: countedBy || ''
  })
}

function updateActualQuantity(value: string | number) {
  const actualQuantity = typeof value === 'string' ? parseFloat(value) : value
  const quantity = actualQuantity || 0
  const difference = quantity - props.modelValue.systemQuantity
  const valueDifference = difference * props.modelValue.averageCost

  // If user changed quantity, automatically mark as counted
  const countedBy = !props.modelValue.countedBy
    ? props.responsiblePerson
    : props.modelValue.countedBy

  emit('update:modelValue', {
    ...props.modelValue,
    actualQuantity: quantity,
    difference,
    valueDifference,
    countedBy,
    confirmed: Math.abs(difference) > 0.001 ? false : props.modelValue.confirmed
  })
}

function updateNotes(notes: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    notes
  })
}
</script>

<style lang="scss" scoped>
.inventory-item-row {
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.confirmed-row {
    border-left: 4px solid rgb(var(--v-theme-success));
    background-color: rgba(var(--v-theme-success), 0.02);
  }

  &.discrepancy-row {
    border-left: 4px solid rgb(var(--v-theme-warning));
    background-color: rgba(var(--v-theme-warning), 0.02);
  }

  &.shelf-life-warning {
    border-left: 4px solid rgb(var(--v-theme-error));
    background-color: rgba(var(--v-theme-error), 0.02);
  }

  &.default-row {
    border-left: 4px solid rgba(var(--v-theme-outline), 0.2);
  }

  .item-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 6px;
  }
}
</style>
