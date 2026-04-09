<script setup lang="ts">
// Production Card — expanded task view with recipe, instructions, staff picker, timer
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useRecipeScaling } from '@/views/kitchen/calculator/composables/useRecipeScaling'
import StaffPicker from './StaffPicker.vue'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'
import type { ScaledIngredient } from '@/views/kitchen/calculator/composables/useRecipeScaling'

const props = defineProps<{
  task: ProductionScheduleItem
}>()

const emit = defineEmits<{
  complete: [
    task: ProductionScheduleItem,
    quantity: number,
    staffMemberId?: string,
    staffMemberName?: string,
    startedAt?: string
  ]
  'write-off': [
    task: ProductionScheduleItem,
    quantity: number,
    staffMemberId?: string,
    staffMemberName?: string
  ]
  close: []
}>()

const recipesStore = useRecipesStore()
const { scaleRecipe, getDefaultUnit, formatQuantity } = useRecipeScaling()

// State
const quantity = ref<number | null>(null) // Empty by default — manual entry required
const staffMemberId = ref<string>()
const staffMemberName = ref<string>()
const startedAt = ref(new Date().toISOString())
const elapsedSeconds = ref(0)

// Timer
let timerInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timerInterval = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - new Date(startedAt.value).getTime()) / 1000)
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

const elapsedDisplay = computed(() => {
  const m = Math.floor(elapsedSeconds.value / 60)
  const s = elapsedSeconds.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

// Preparation data
const preparation = computed(() =>
  recipesStore.preparations.find(p => p.id === props.task.preparationId)
)

const storageIcon = computed(() => {
  switch (preparation.value?.storageLocation) {
    case 'fridge':
      return 'mdi-fridge'
    case 'freezer':
      return 'mdi-snowflake'
    case 'shelf':
      return 'mdi-archive'
    default:
      return 'mdi-help-circle-outline'
  }
})

const storageLabel = computed(() => {
  switch (preparation.value?.storageLocation) {
    case 'fridge':
      return 'Fridge'
    case 'freezer':
      return 'Freezer'
    case 'shelf':
      return 'Shelf'
    default:
      return '—'
  }
})

// Scaled ingredients
const scaledIngredients = computed<ScaledIngredient[]>(() => {
  if (!preparation.value) return []
  const targetQty = props.task.targetQuantity
  const unit = getDefaultUnit(preparation.value)
  const result = scaleRecipe(preparation.value, targetQty, unit)
  return result.success ? result.ingredients : []
})

// Instructions
const instructions = computed(() => preparation.value?.instructions || '')
const hasInstructions = computed(() => instructions.value.trim().length > 0)

// Validation
const isWriteOff = computed(() => props.task.taskType === 'write_off')
const canComplete = computed(() => {
  if (!quantity.value || quantity.value < 1) return false
  if (!isWriteOff.value && !staffMemberId.value) return false
  return true
})

function handleStaffUpdate(member: { id: string; name: string } | undefined) {
  staffMemberName.value = member?.name
}

function handleComplete() {
  if (!canComplete.value) return
  if (isWriteOff.value) {
    emit('write-off', props.task, quantity.value!, staffMemberId.value, staffMemberName.value)
  } else {
    emit(
      'complete',
      props.task,
      quantity.value!,
      staffMemberId.value,
      staffMemberName.value,
      startedAt.value
    )
  }
}

// Category info
const categoryEmoji = computed(() =>
  recipesStore.getPreparationCategoryEmoji(preparation.value?.type || '')
)
</script>

<template>
  <div class="production-card">
    <!-- Header -->
    <div class="pc-header">
      <div class="pc-title-row">
        <span class="pc-emoji">{{ categoryEmoji }}</span>
        <span class="pc-name">{{ task.preparationName }}</span>
        <v-chip v-if="isWriteOff" color="error" size="x-small" variant="flat">WRITE-OFF</v-chip>
        <v-spacer />
        <div class="pc-timer">
          <v-icon size="14">mdi-timer-outline</v-icon>
          {{ elapsedDisplay }}
        </div>
        <v-btn icon size="x-small" variant="text" @click="emit('close')">
          <v-icon size="18">mdi-close</v-icon>
        </v-btn>
      </div>
      <div class="pc-meta">
        <span class="meta-item">
          <strong>Target:</strong>
          {{ task.targetQuantity }}{{ task.targetUnit }}
        </span>
        <span v-if="task.currentStockAtGeneration != null" class="meta-item">
          <strong>Stock:</strong>
          {{ Math.round(task.currentStockAtGeneration) }}{{ task.targetUnit }}
        </span>
        <span class="meta-item">
          <v-icon size="14">{{ storageIcon }}</v-icon>
          {{ storageLabel }}
        </span>
        <span v-if="preparation?.shelfLife" class="meta-item">
          <v-icon size="14">mdi-clock-outline</v-icon>
          {{ preparation.shelfLife }}d shelf life
        </span>
      </div>
    </div>

    <!-- Ingredients -->
    <div v-if="scaledIngredients.length > 0 && !isWriteOff" class="pc-section">
      <div class="pc-section-title">
        <v-icon size="16">mdi-format-list-bulleted</v-icon>
        Ingredients (scaled to {{ task.targetQuantity }}{{ task.targetUnit }})
      </div>
      <div class="pc-ingredients">
        <div
          v-for="ing in scaledIngredients"
          :key="ing.id"
          class="ingredient-row"
          :class="{ 'ing-prep': ing.type === 'preparation' }"
        >
          <span class="ing-name">{{ ing.name }}</span>
          <span class="ing-qty">
            {{ formatQuantity(ing.scaledQuantity) }} {{ ing.displayUnit }}
          </span>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div v-if="hasInstructions && !isWriteOff" class="pc-section">
      <div class="pc-section-title">
        <v-icon size="16">mdi-book-open-variant</v-icon>
        Instructions
      </div>
      <div class="pc-instructions">{{ instructions }}</div>
    </div>

    <!-- Completion Form -->
    <div class="pc-form">
      <!-- Staff Picker -->
      <StaffPicker
        v-model="staffMemberId"
        :department="task.department"
        :required="!isWriteOff"
        dense
        label="Who did this?"
        @update:staff-member="handleStaffUpdate"
      />

      <!-- Quantity Input -->
      <div class="pc-qty-row">
        <v-text-field
          v-model.number="quantity"
          type="number"
          inputmode="numeric"
          :label="`Actual ${isWriteOff ? 'write-off' : 'produced'} quantity`"
          :suffix="task.targetUnit"
          density="compact"
          variant="outlined"
          hide-details
          :placeholder="`Enter ${task.targetUnit}...`"
          class="pc-qty-input"
        />
        <span class="pc-target-hint">target: {{ task.targetQuantity }}{{ task.targetUnit }}</span>
      </div>

      <!-- Action Button -->
      <v-btn
        :color="isWriteOff ? 'error' : 'success'"
        variant="flat"
        block
        size="large"
        :disabled="!canComplete"
        @click="handleComplete"
      >
        <v-icon start>{{ isWriteOff ? 'mdi-delete' : 'mdi-check' }}</v-icon>
        {{ isWriteOff ? 'Write Off' : 'Complete Production' }}
      </v-btn>
    </div>
  </div>
</template>

<style scoped lang="scss">
.production-card {
  background-color: var(--v-theme-surface);
  border-radius: 10px;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  overflow: hidden;
}

.pc-header {
  padding: 12px 14px;
  background-color: rgba(var(--v-theme-primary), 0.06);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.pc-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-emoji {
  font-size: 18px;
}

.pc-name {
  font-size: 16px;
  font-weight: 700;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-timer {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-variant-numeric: tabular-nums;
}

.pc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);

  .meta-item {
    display: flex;
    align-items: center;
    gap: 3px;
  }
}

.pc-section {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.04);
}

.pc-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-bottom: 6px;
}

.pc-ingredients {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ingredient-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  font-size: 13px;

  &.ing-prep {
    color: rgb(var(--v-theme-warning));
  }
}

.ing-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ing-qty {
  font-weight: 600;
  white-space: nowrap;
  margin-left: 8px;
}

.pc-instructions {
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.pc-form {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-qty-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pc-qty-input {
  flex: 1;
}

.pc-target-hint {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  white-space: nowrap;
}
</style>
