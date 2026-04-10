<script setup lang="ts">
// Production Card — fullscreen dialog with two tabs: Recipe + Complete
import { ref, computed, onUnmounted, watch } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useRecipeScaling } from '@/views/kitchen/calculator/composables/useRecipeScaling'
import { useProductionPhoto } from '@/composables/useProductionPhoto'
import { DebugUtils } from '@/utils'
import StaffPicker from './StaffPicker.vue'
import PhotoCaptureDialog from '../dialogs/PhotoCaptureDialog.vue'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'
import type { ScaledIngredient } from '@/views/kitchen/calculator/composables/useRecipeScaling'

const props = defineProps<{
  task: ProductionScheduleItem
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  complete: [
    task: ProductionScheduleItem,
    quantity: number,
    staffMemberId?: string,
    staffMemberName?: string,
    startedAt?: string,
    photoUrl?: string
  ]
  'write-off': [
    task: ProductionScheduleItem,
    quantity: number,
    staffMemberId?: string,
    staffMemberName?: string
  ]
}>()

const recipesStore = useRecipesStore()
const { scaleRecipe, formatQuantity } = useRecipeScaling()
const productionPhoto = useProductionPhoto()

// Tabs
const activeTab = ref<'recipe' | 'complete'>('complete')

// State
const qtyDisplay = ref('')
const qtyUnit = ref<'base' | 'portion'>('base') // 'portion' for portion-type preps
const staffMemberId = ref<string>()
const staffMemberName = ref<string>()
const startedAt = ref(new Date().toISOString())
const elapsedSeconds = ref(0)

// Photo state
const photoUrl = ref<string>()
const showPhotoDialog = ref(false)
const photoSkipped = ref(false)

// Numpad popup — shared for both qty and calculator
const showNumpad = ref(false)
const numpadPrefilled = ref(false)
const numpadMode = ref<'qty' | 'calc'>('qty')
const numpadBuffer = ref('') // temporary buffer while editing

// Calculator: custom quantity for ingredient scaling
const calcQty = ref<number | null>(null)

// Timer
let timerInterval: ReturnType<typeof setInterval> | null = null

watch(
  () => props.modelValue,
  open => {
    if (open) {
      activeTab.value = 'complete'
      qtyDisplay.value = ''
      // Default to portions for portion-type preparations
      const prep = recipesStore.preparations.find(p => p.id === props.task.preparationId)
      qtyUnit.value =
        prep?.portionType === 'portion' && (prep?.portionSize ?? 0) > 0 ? 'portion' : 'base'
      staffMemberId.value = undefined
      staffMemberName.value = undefined
      photoUrl.value = undefined
      photoSkipped.value = false
      calcQty.value = null
      startedAt.value = new Date().toISOString()
      elapsedSeconds.value = 0
      timerInterval = setInterval(() => {
        elapsedSeconds.value = Math.floor((Date.now() - new Date(startedAt.value).getTime()) / 1000)
      }, 1000)
    } else {
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
    }
  }
)

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

// Scaled ingredients (uses calcQty for calculator mode, otherwise target)
const scaleTarget = computed(() => calcQty.value || props.task.targetQuantity)

// Map task.targetUnit to TargetUnit — task targets are always in grams/ml/pc from the schedule
const taskTargetUnit = computed<
  import('@/views/kitchen/calculator/composables/useRecipeScaling').TargetUnit
>(() => {
  const u = props.task.targetUnit?.toLowerCase()
  if (u === 'ml') return 'ml'
  if (u === 'pc' || u === 'piece' || u === 'pcs') return 'pc'
  if (u === 'portion' || u === 'portions') return 'portion'
  return 'gram'
})

const scaledIngredients = computed<ScaledIngredient[]>(() => {
  if (!preparation.value) return []
  const result = scaleRecipe(preparation.value, scaleTarget.value, taskTargetUnit.value)
  return result.success ? result.ingredients : []
})

// Instructions
const instructions = computed(() => preparation.value?.instructions || '')
const hasInstructions = computed(() => instructions.value.trim().length > 0)

// Portion support
const isPortionType = computed(
  () => preparation.value?.portionType === 'portion' && (preparation.value?.portionSize ?? 0) > 0
)
const portionSize = computed(() => preparation.value?.portionSize || 1)
const baseUnitLabel = computed(() => {
  const u = props.task.targetUnit?.toLowerCase()
  if (u === 'ml') return 'ml'
  if (u === 'pc' || u === 'piece') return 'pcs'
  return 'g'
})
const displayUnitLabel = computed(() =>
  qtyUnit.value === 'portion' ? 'portions' : baseUnitLabel.value
)

// Convert displayed qty to base unit for the emit
const parsedQtyRaw = computed(() => Number(qtyDisplay.value) || 0)
const parsedQtyInBaseUnit = computed(() => {
  if (qtyUnit.value === 'portion') {
    return Math.round(parsedQtyRaw.value * portionSize.value)
  }
  return parsedQtyRaw.value
})
// Conversion display (e.g. "= 360g" when entering portions)
const conversionDisplay = computed(() => {
  if (!isPortionType.value || qtyUnit.value === 'base' || parsedQtyRaw.value === 0) return ''
  return `= ${parsedQtyInBaseUnit.value}${baseUnitLabel.value}`
})
// Target in current display unit
const targetInDisplayUnit = computed(() => {
  if (qtyUnit.value === 'portion' && portionSize.value > 0) {
    const portions = props.task.targetQuantity / portionSize.value
    return `${Math.round(portions * 10) / 10} portions`
  }
  return `${props.task.targetQuantity}${baseUnitLabel.value}`
})

// Validation
const isWriteOff = computed(() => props.task.taskType === 'write_off')
const photoRequired = computed(() => !isWriteOff.value)
const parsedQty = computed(() => parsedQtyInBaseUnit.value)
const canComplete = computed(() => {
  if (parsedQty.value < 1) return false
  if (!isWriteOff.value && !staffMemberId.value) return false
  if (photoRequired.value && !photoUrl.value && !photoSkipped.value) return false
  return true
})

// Category
const categoryEmoji = computed(() =>
  recipesStore.getPreparationCategoryEmoji(preparation.value?.type || '')
)

function close() {
  emit('update:modelValue', false)
}

function handleStaffUpdate(member: { id: string; name: string } | undefined) {
  staffMemberName.value = member?.name
}

// Numpad popup — shared for qty and calculator
function openNumpad(mode: 'qty' | 'calc' = 'qty') {
  numpadMode.value = mode
  numpadBuffer.value = mode === 'qty' ? qtyDisplay.value : String(calcQty.value || '')
  numpadPrefilled.value = false
  showNumpad.value = true
}
function numpadPress(digit: string) {
  if (numpadPrefilled.value) {
    numpadBuffer.value = digit
    numpadPrefilled.value = false
  } else if (numpadBuffer.value === '0') {
    numpadBuffer.value = digit
  } else if (numpadBuffer.value.length < 5) {
    numpadBuffer.value += digit
  }
}
function numpadBackspace() {
  numpadPrefilled.value = false
  numpadBuffer.value = numpadBuffer.value.slice(0, -1)
}
function numpadClear() {
  numpadPrefilled.value = false
  numpadBuffer.value = ''
}
function numpadSetTarget() {
  numpadBuffer.value = String(props.task.targetQuantity)
  numpadPrefilled.value = true
}
function numpadConfirm() {
  if (numpadMode.value === 'qty') {
    qtyDisplay.value = numpadBuffer.value
  } else {
    const val = Number(numpadBuffer.value)
    calcQty.value = val > 0 ? val : null
  }
  showNumpad.value = false
}
function numpadCancel() {
  showNumpad.value = false
}

const numpadTitle = computed(() =>
  numpadMode.value === 'qty'
    ? isWriteOff.value
      ? 'Write-off quantity'
      : 'Produced quantity'
    : 'Scale ingredients to'
)
const numpadDisplayValue = computed(() => numpadBuffer.value || '0')
const numpadUnitLabel = computed(() =>
  numpadMode.value === 'qty' ? displayUnitLabel.value : baseUnitLabel.value
)

// Photo
function handlePhotoConfirmed(url: string) {
  photoUrl.value = url
}
function handleRemovePhoto() {
  if (photoUrl.value) {
    productionPhoto.remove(photoUrl.value).catch(err => {
      DebugUtils.error('ProductionCard', 'Failed to delete photo from storage', err)
    })
  }
  photoUrl.value = undefined
}

// Complete
function handleComplete() {
  if (!canComplete.value) return
  const qty = parsedQty.value
  if (isWriteOff.value) {
    emit('write-off', props.task, qty, staffMemberId.value, staffMemberName.value)
  } else {
    emit(
      'complete',
      props.task,
      qty,
      staffMemberId.value,
      staffMemberName.value,
      startedAt.value,
      photoUrl.value
    )
  }
  close()
}
</script>

<template>
  <!-- Main Dialog -->
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pc-dialog">
      <!-- Header -->
      <div class="pc-header">
        <div class="pc-title-row">
          <span class="pc-emoji">{{ categoryEmoji }}</span>
          <span class="pc-name">{{ task.preparationName }}</span>
          <v-chip v-if="isWriteOff" color="error" size="small" variant="flat" class="ml-1">
            WRITE-OFF
          </v-chip>
        </div>
        <div class="pc-header-right">
          <div class="pc-timer-chip">
            <v-icon size="16">mdi-timer-outline</v-icon>
            {{ elapsedDisplay }}
          </div>
          <v-btn icon size="small" variant="text" @click="close">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Info Bar -->
      <div class="pc-info-bar">
        <div class="info-chip info-target">
          <v-icon size="14">mdi-bullseye-arrow</v-icon>
          <strong>{{ task.targetQuantity }}</strong>
          {{ task.targetUnit }}
        </div>
        <div v-if="task.currentStockAtGeneration != null" class="info-chip info-stock">
          <v-icon size="14">mdi-package-variant</v-icon>
          {{ Math.round(task.currentStockAtGeneration) }}{{ task.targetUnit }}
        </div>
        <div class="info-chip">
          <v-icon size="14">{{ storageIcon }}</v-icon>
          {{ storageLabel }}
        </div>
        <div v-if="preparation?.shelfLife" class="info-chip">
          <v-icon size="14">mdi-clock-outline</v-icon>
          {{ preparation.shelfLife }}d
        </div>
      </div>

      <!-- Tabs -->
      <v-tabs v-model="activeTab" color="primary" density="compact" class="pc-tabs">
        <v-tab value="complete">
          <v-icon start size="18">mdi-check-circle-outline</v-icon>
          Complete
          <v-badge v-if="parsedQty > 0" :content="qtyDisplay" color="success" inline class="ml-1" />
        </v-tab>
        <v-tab value="recipe">
          <v-icon start size="18">mdi-book-open-variant</v-icon>
          Recipe
        </v-tab>
      </v-tabs>

      <!-- Tab Content -->
      <div class="pc-content">
        <!-- ===================== RECIPE TAB ===================== -->
        <div v-if="activeTab === 'recipe'" class="tab-recipe">
          <!-- Calculator -->
          <div v-if="!isWriteOff" class="calc-card" @click="openNumpad('calc')">
            <div class="calc-label">
              <v-icon size="16" color="primary">mdi-calculator</v-icon>
              Scale to
            </div>
            <div class="calc-value-row">
              <span class="calc-value">{{ calcQty || task.targetQuantity }}</span>
              <span class="calc-unit">{{ task.targetUnit }}</span>
              <v-icon size="16" color="primary" class="ml-1">mdi-pencil</v-icon>
            </div>
            <v-btn
              v-if="calcQty"
              size="x-small"
              variant="text"
              color="primary"
              class="calc-reset"
              @click.stop="calcQty = null"
            >
              Reset to {{ task.targetQuantity }}{{ task.targetUnit }}
            </v-btn>
          </div>

          <!-- Ingredients -->
          <div v-if="scaledIngredients.length > 0 && !isWriteOff" class="ingredients-section">
            <div class="section-label">
              <v-icon size="16" color="primary">mdi-format-list-bulleted</v-icon>
              Ingredients
              <span class="section-label-sub">
                scaled to {{ scaleTarget }}{{ task.targetUnit }}
              </span>
            </div>
            <div class="ingredients-list">
              <div
                v-for="ing in scaledIngredients"
                :key="ing.id"
                class="ing-row"
                :class="{ 'ing-prep': ing.type === 'preparation' }"
              >
                <span class="ing-name">{{ ing.name }}</span>
                <span class="ing-qty">
                  <template v-if="ing.purchaseQuantity">
                    <span class="ing-purchase">{{ ing.purchaseQuantity }}</span>
                    <span class="ing-unit">{{ ing.displayUnit }}</span>
                    <span class="ing-yield">({{ ing.yieldPercentage }}% yield)</span>
                  </template>
                  <template v-else>
                    {{ formatQuantity(ing.scaledQuantity) }}
                    <span class="ing-unit">{{ ing.displayUnit }}</span>
                  </template>
                </span>
              </div>
            </div>
          </div>

          <!-- Instructions -->
          <div v-if="hasInstructions && !isWriteOff" class="instructions-section">
            <div class="section-label">
              <v-icon size="16" color="primary">mdi-book-open-variant</v-icon>
              Instructions
            </div>
            <div class="instructions-text">{{ instructions }}</div>
          </div>

          <!-- Empty state for write-off -->
          <div v-if="isWriteOff" class="write-off-info">
            <v-icon size="48" color="error">mdi-delete-outline</v-icon>
            <p class="text-body-1 mt-2">Write-off task</p>
            <p class="text-body-2 text-medium-emphasis">Go to Complete tab to enter quantity</p>
          </div>
        </div>

        <!-- ===================== COMPLETE TAB ===================== -->
        <div v-if="activeTab === 'complete'" class="tab-complete">
          <!-- Quantity Display (tap to open numpad) -->
          <div class="qty-card" :class="{ 'qty-filled': parsedQty > 0 }" @click="openNumpad('qty')">
            <div class="qty-top-row">
              <div class="qty-label">
                {{ isWriteOff ? 'WRITE-OFF QUANTITY' : 'PRODUCED QUANTITY' }}
              </div>
              <!-- Unit toggle for portion-type preps -->
              <v-btn-toggle
                v-if="isPortionType"
                v-model="qtyUnit"
                mandatory
                density="compact"
                variant="outlined"
                class="qty-unit-toggle"
                @click.stop
              >
                <v-btn value="portion" size="x-small">portions</v-btn>
                <v-btn value="base" size="x-small">{{ baseUnitLabel }}</v-btn>
              </v-btn-toggle>
            </div>
            <div class="qty-display-row">
              <span class="qty-value" :class="{ 'qty-has-value': parsedQtyRaw > 0 }">
                {{ qtyDisplay || '0' }}
              </span>
              <span class="qty-unit">{{ displayUnitLabel }}</span>
            </div>
            <div v-if="conversionDisplay" class="qty-conversion">{{ conversionDisplay }}</div>
            <div class="qty-hint">
              <span>tap to enter</span>
              <span class="qty-target">target: {{ targetInDisplayUnit }}</span>
            </div>
          </div>

          <!-- Staff Picker -->
          <StaffPicker
            v-model="staffMemberId"
            :department="task.department"
            :required="!isWriteOff"
            label="Who did this?"
            @update:staff-member="handleStaffUpdate"
          />

          <!-- Photo Section (production tasks only) -->
          <div v-if="photoRequired" class="photo-section">
            <div v-if="photoUrl" class="photo-preview">
              <img :src="photoUrl" alt="Production photo" class="photo-thumb" />
              <div class="photo-info">
                <v-icon color="success" size="18">mdi-check-circle</v-icon>
                <span class="photo-label">Photo taken</span>
                <v-btn
                  size="x-small"
                  variant="text"
                  color="primary"
                  @click="showPhotoDialog = true"
                >
                  Retake
                </v-btn>
                <v-btn size="x-small" variant="text" color="error" @click="handleRemovePhoto">
                  Remove
                </v-btn>
              </div>
            </div>

            <div v-else-if="!photoSkipped">
              <v-btn
                variant="outlined"
                color="primary"
                block
                size="large"
                @click="showPhotoDialog = true"
              >
                <v-icon start>mdi-camera</v-icon>
                Take Photo
              </v-btn>
              <div class="text-center mt-1">
                <v-btn variant="text" size="x-small" color="grey" @click="photoSkipped = true">
                  Skip photo
                </v-btn>
              </div>
            </div>

            <div v-else class="photo-skipped">
              <v-icon size="16" color="warning">mdi-camera-off</v-icon>
              <span class="text-caption text-warning">Photo skipped</span>
              <v-btn size="x-small" variant="text" color="primary" @click="photoSkipped = false">
                Add photo
              </v-btn>
            </div>
          </div>

          <!-- Spacer -->
          <div class="flex-grow-1" />

          <!-- Complete Button -->
          <v-btn
            :color="isWriteOff ? 'error' : 'success'"
            variant="flat"
            block
            size="x-large"
            :disabled="!canComplete"
            class="complete-btn"
            @click="handleComplete"
          >
            <v-icon start size="24">{{ isWriteOff ? 'mdi-delete' : 'mdi-check-circle' }}</v-icon>
            {{ isWriteOff ? 'Write Off' : 'Complete Production' }}
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>

  <!-- Numpad Popup Dialog (shared for qty + calc) -->
  <v-dialog v-model="showNumpad" max-width="360" persistent>
    <v-card class="numpad-card">
      <div class="numpad-header">
        <div class="numpad-title">{{ numpadTitle }}</div>
        <v-btn size="small" variant="tonal" color="primary" @click="numpadSetTarget">
          = {{ task.targetQuantity }}{{ task.targetUnit }}
        </v-btn>
      </div>
      <div class="numpad-display">
        <span class="numpad-value">{{ numpadDisplayValue }}</span>
        <span class="numpad-unit">{{ numpadUnitLabel }}</span>
      </div>
      <div class="numpad-grid">
        <v-btn
          v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
          :key="n"
          variant="tonal"
          class="numpad-btn"
          @click="numpadPress(String(n))"
        >
          {{ n }}
        </v-btn>
        <v-btn variant="tonal" class="numpad-btn" @click="numpadClear">C</v-btn>
        <v-btn variant="tonal" class="numpad-btn" @click="numpadPress('0')">0</v-btn>
        <v-btn variant="tonal" class="numpad-btn" @click="numpadBackspace">
          <v-icon size="20">mdi-backspace-outline</v-icon>
        </v-btn>
      </div>
      <div class="numpad-actions">
        <v-btn variant="text" @click="numpadCancel">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          class="numpad-confirm"
          @click="numpadConfirm"
        >
          <v-icon start>mdi-check</v-icon>
          OK — {{ numpadDisplayValue }} {{ numpadUnitLabel }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- Photo Capture Dialog -->
  <PhotoCaptureDialog
    v-model="showPhotoDialog"
    :department="task.department"
    :preparation-id="task.preparationId"
    :preparation-name="task.preparationName"
    @confirmed="handlePhotoConfirmed"
  />
</template>

<style scoped lang="scss">
/* =========== DIALOG =========== */
.pc-dialog {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  border-radius: 16px !important;
  overflow: hidden;
}

/* =========== HEADER =========== */
.pc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background-color: rgba(var(--v-theme-primary), 0.08);
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.15);
}

.pc-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.pc-emoji {
  font-size: 24px;
}

.pc-name {
  font-size: 20px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.pc-timer-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.12);
  padding: 4px 10px;
  border-radius: 16px;
}

/* =========== INFO BAR =========== */
.pc-info-bar {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.info-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 16px;
  background-color: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.info-target {
  background-color: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 14px;
}

.info-stock {
  background-color: rgba(var(--v-theme-warning), 0.12);
  color: rgb(var(--v-theme-warning));
}

/* =========== TABS =========== */
.pc-tabs {
  flex-shrink: 0;
}

/* =========== CONTENT =========== */
.pc-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* =========== RECIPE TAB =========== */
.tab-recipe {
  padding: 12px 16px;
}

.calc-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 14px;
  background-color: var(--v-theme-surface);
  border-radius: 10px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.3);
  cursor: pointer;

  &:active {
    border-style: solid;
    border-color: rgb(var(--v-theme-primary));
  }
}

.calc-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.5);
  text-transform: uppercase;
  white-space: nowrap;
}

.calc-value-row {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.calc-value {
  font-size: 20px;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
}

.calc-unit {
  font-size: 14px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.calc-reset {
  margin-left: auto;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-bottom: 8px;
}

.section-label-sub {
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  margin-left: 4px;
}

.ingredients-section {
  margin-bottom: 16px;
}

.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 10px;
  overflow: hidden;
}

.ing-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background-color: var(--v-theme-surface);
  font-size: 15px;

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
  font-weight: 500;
}

.ing-qty {
  font-weight: 700;
  white-space: nowrap;
  margin-left: 12px;
  font-size: 15px;
}

.ing-unit {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-left: 2px;
}

.ing-purchase {
  font-weight: 700;
}

.ing-yield {
  font-size: 11px;
  font-weight: 500;
  color: rgba(var(--v-theme-warning), 0.8);
  margin-left: 4px;
}

.instructions-section {
  margin-top: 4px;
}

.instructions-text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  color: rgba(var(--v-theme-on-surface), 0.7);
  padding: 10px 14px;
  background-color: var(--v-theme-surface);
  border-radius: 10px;
}

.write-off-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px;
}

/* =========== COMPLETE TAB =========== */
.tab-complete {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  min-height: 100%;
}

.qty-card {
  background-color: rgba(var(--v-theme-primary), 0.04);
  border-radius: 14px;
  padding: 18px;
  border: 2px solid rgba(var(--v-theme-primary), 0.25);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;

  &:active {
    border-color: rgb(var(--v-theme-primary));
    background-color: rgba(var(--v-theme-primary), 0.08);
  }

  &.qty-filled {
    border-color: rgba(var(--v-theme-success), 0.4);
    background-color: rgba(var(--v-theme-success), 0.04);
  }
}

.qty-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.qty-label {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.qty-unit-toggle {
  flex-shrink: 0;
}

.qty-display-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin: 10px 0 8px;
}

.qty-value {
  font-size: 48px;
  font-weight: 800;
  color: rgba(var(--v-theme-on-surface), 0.25);

  &.qty-has-value {
    color: rgb(var(--v-theme-primary));
  }
}

.qty-unit {
  font-size: 22px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.35);
}

.qty-conversion {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  text-align: center;
  margin-bottom: 4px;
}

.qty-hint {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.qty-target {
  font-weight: 600;
}

/* Photo */
.photo-section {
  margin-top: 2px;
}

.photo-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background-color: rgba(var(--v-theme-success), 0.06);
  border: 1px solid rgba(var(--v-theme-success), 0.2);
}

.photo-thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.photo-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}

.photo-label {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-success));
  margin-right: auto;
}

.photo-skipped {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-warning), 0.06);
}

.complete-btn {
  height: 60px !important;
  font-size: 17px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 14px !important;
  margin-top: auto;
}

/* =========== NUMPAD POPUP =========== */
.numpad-card {
  border-radius: 16px !important;
  overflow: hidden;
}

.numpad-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 8px;
}

.numpad-title {
  font-size: 16px;
  font-weight: 700;
}

.numpad-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px 16px;
}

.numpad-value {
  font-size: 44px;
  font-weight: 800;
  min-width: 60px;
  text-align: center;
  border-bottom: 3px solid rgba(var(--v-theme-primary), 0.5);
  padding: 0 8px 4px;
  color: rgb(var(--v-theme-primary));
}

.numpad-unit {
  font-size: 22px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.numpad-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  padding: 0 16px;
}

.numpad-btn {
  height: 56px !important;
  font-size: 22px !important;
  font-weight: 700 !important;
  border-radius: 12px !important;
}

.numpad-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px 18px;
}

.numpad-confirm {
  min-width: 160px !important;
  height: 48px !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 12px !important;
}
</style>
