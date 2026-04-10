<!-- src/views/kitchen/tasks/dialogs/RitualDialog.vue -->
<!-- Fullscreen ritual: 3-column kanban (To Do → In Progress → Done) with custom tasks + timing -->
<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    transition="dialog-bottom-transition"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="ritual-card">
      <!-- Header -->
      <v-toolbar :color="ritualColor" density="comfortable">
        <v-btn icon @click="$emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>
          <v-icon class="mr-2">{{ ritualIcon }}</v-icon>
          {{ ritualLabel }}
        </v-toolbar-title>
        <v-spacer />
        <span class="text-body-2 mr-2">{{ elapsedDisplay }}</span>
        <span class="text-body-2 mr-4">{{ completedCount }}/{{ allRitualTasks.length }}</span>
      </v-toolbar>

      <!-- Progress -->
      <v-progress-linear
        :model-value="progressPercent"
        :color="allDone ? 'success' : ritualColor"
        height="5"
      />

      <!-- 3-Column Kanban -->
      <div class="ritual-kanban" :class="{ 'done-collapsed': doneCollapsed }">
        <!-- TO DO Column -->
        <div class="ritual-column">
          <div class="col-header col-header-todo">
            <v-icon color="warning" size="20">mdi-clipboard-list-outline</v-icon>
            <span class="col-title">To Do</span>
            <v-badge :content="todoTasks.length || '0'" color="warning" inline />
          </div>
          <div class="col-content">
            <div v-if="todoTasks.length === 0" class="col-empty">
              <v-icon size="36" color="grey">mdi-check-all</v-icon>
            </div>

            <!-- Custom tasks (checkbox style, shown first) -->
            <div
              v-for="ct in todoCustomTasks"
              :key="ct.id"
              class="ritual-item item-custom"
              @click="toggleCustomTask(ct)"
            >
              <v-icon size="22" color="grey">mdi-checkbox-blank-outline</v-icon>
              <div class="item-body">
                <div class="item-name">{{ ct.name }}</div>
                <div v-if="ct.requiresNote" class="item-meta">
                  <v-icon size="12" color="warning">mdi-note-edit-outline</v-icon>
                  <span class="text-caption text-warning">note required</span>
                </div>
              </div>
            </div>

            <!-- Schedule tasks -->
            <div
              v-for="task in todoScheduleTasks"
              :key="task.id"
              class="ritual-item"
              :class="`item-${getTaskColor(task)}`"
              @click="startTask(task)"
            >
              <div class="item-body">
                <div class="item-row-top">
                  <span class="item-name">{{ task.preparationName }}</span>
                  <v-chip
                    v-if="task.taskType === 'write_off'"
                    color="error"
                    size="x-small"
                    variant="flat"
                  >
                    WO
                  </v-chip>
                  <v-icon size="16" color="grey" class="item-chevron">mdi-chevron-right</v-icon>
                </div>
                <div class="item-row-badges">
                  <div v-if="task.currentStockAtGeneration != null" class="ri-badge ri-badge-stock">
                    <span class="ri-badge-qty">
                      {{ Math.round(task.currentStockAtGeneration) }}{{ task.targetUnit }}
                    </span>
                    <span class="ri-badge-label">stock</span>
                  </div>
                  <div class="ri-badge ri-badge-target">
                    <span class="ri-badge-qty">{{ task.targetQuantity }}{{ task.targetUnit }}</span>
                    <span class="ri-badge-label">target</span>
                  </div>
                  <div
                    v-if="task.avgDailyConsumption && task.taskType !== 'write_off'"
                    class="ri-badge ri-badge-neutral"
                  >
                    <span class="ri-badge-qty">{{ Math.round(task.avgDailyConsumption) }}</span>
                    <span class="ri-badge-label">avg</span>
                  </div>
                  <div
                    v-if="task.maxDailyConsumption && task.taskType !== 'write_off'"
                    class="ri-badge ri-badge-neutral"
                  >
                    <span class="ri-badge-qty">{{ Math.round(task.maxDailyConsumption) }}</span>
                    <span class="ri-badge-label">max</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- IN PROGRESS Column -->
        <div class="ritual-column">
          <div class="col-header col-header-progress">
            <v-icon color="primary" size="20">mdi-progress-clock</v-icon>
            <span class="col-title">In Progress</span>
            <v-badge :content="inProgressTasks.length || '0'" color="primary" inline />
          </div>
          <div class="col-content">
            <div v-if="inProgressTasks.length === 0" class="col-empty">
              <v-icon size="36" color="grey">mdi-gesture-tap</v-icon>
              <span class="text-caption text-medium-emphasis">Tap a task to start</span>
            </div>
            <div
              v-for="task in inProgressTasks"
              :key="task.id"
              class="ritual-item item-in-progress"
              :class="`item-${getTaskColor(task)}`"
            >
              <div class="item-body">
                <div class="item-name">{{ task.preparationName }}</div>
                <div class="item-meta">
                  <span class="meta-target-bold">
                    {{ task.targetQuantity }}{{ task.targetUnit }}
                  </span>
                </div>
              </div>
              <div class="ip-actions">
                <v-btn
                  color="primary"
                  variant="tonal"
                  class="ip-btn"
                  @click.stop="openProductionCard(task, 'recipe')"
                >
                  <v-icon size="18">mdi-book-open-variant</v-icon>
                </v-btn>
                <v-btn
                  :color="task.taskType === 'write_off' ? 'error' : 'success'"
                  variant="flat"
                  class="ip-btn ip-btn-done"
                  @click.stop="openProductionCard(task, 'complete')"
                >
                  <v-icon start size="18">
                    {{ task.taskType === 'write_off' ? 'mdi-delete' : 'mdi-check' }}
                  </v-icon>
                  Done
                </v-btn>
              </div>
            </div>
          </div>
        </div>

        <!-- DONE Column (collapsible) -->
        <div class="ritual-column done-column" :class="{ collapsed: doneCollapsed }">
          <div class="col-header col-header-done">
            <template v-if="!doneCollapsed">
              <v-icon color="success" size="20">mdi-check-circle</v-icon>
              <span class="col-title">Done</span>
              <v-badge :content="doneTasks.length || '0'" color="success" inline />
            </template>
            <v-btn
              icon
              size="x-small"
              variant="flat"
              color="success"
              :class="doneCollapsed ? '' : 'ml-auto'"
              @click="doneCollapsed = !doneCollapsed"
            >
              <v-icon>{{ doneCollapsed ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
            </v-btn>
          </div>
          <div v-if="!doneCollapsed" class="col-content">
            <div v-if="doneTasks.length === 0" class="col-empty">
              <v-icon size="36" color="grey">mdi-clipboard-check-outline</v-icon>
            </div>

            <!-- Completed schedule tasks -->
            <div v-for="task in doneScheduleTasks" :key="task.id" class="ritual-item item-done">
              <v-icon color="success" size="18" class="flex-shrink-0">mdi-check-circle</v-icon>
              <div class="item-body">
                <div class="item-name item-name-done">{{ task.preparationName }}</div>
                <div class="item-done-detail">
                  <span class="done-recommended">
                    {{ task.targetQuantity }}{{ task.targetUnit }}
                  </span>
                  <v-icon size="12">mdi-arrow-right</v-icon>
                  <span class="done-actual" :class="getDoneQtyClass(task)">
                    {{ task.completedQuantity || task.targetQuantity }}{{ task.targetUnit }}
                  </span>
                  <span v-if="taskStaff.get(task.id) || task.staffMemberName" class="done-staff">
                    <v-icon size="10">mdi-account</v-icon>
                    {{ taskStaff.get(task.id)?.name || task.staffMemberName }}
                  </span>
                  <span v-if="task.completedAt" class="done-time">
                    {{ formatTime(task.completedAt) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Completed custom tasks -->
            <div
              v-for="ct in doneCustomTasks"
              :key="ct.id"
              class="ritual-item item-done item-custom"
            >
              <v-icon color="success" size="22">mdi-checkbox-marked</v-icon>
              <div class="item-body">
                <div class="item-name item-name-done">{{ ct.name }}</div>
                <div class="item-done-detail">
                  <span v-if="taskStaff.get(ct.id)" class="done-staff">
                    <v-icon size="10">mdi-account</v-icon>
                    {{ taskStaff.get(ct.id)?.name }}
                  </span>
                  <span v-if="taskNotes.get(ct.id)" class="done-note">
                    <v-icon size="10">mdi-note</v-icon>
                    {{ taskNotes.get(ct.id) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ProductionCard Dialog (for in-progress tasks) -->
      <ProductionCard
        v-if="productionCardTask"
        v-model="showProductionCard"
        :task="productionCardTask"
        :initial-tab="productionCardInitialTab"
        @complete="handleProductionCardComplete"
        @write-off="handleProductionCardWriteOff"
      />

      <!-- Quantity Confirmation Dialog with built-in numpad -->
      <v-dialog v-model="showQtyDialog" max-width="360" persistent>
        <v-card v-if="qtyDialogTask" class="qty-dialog-card">
          <!-- Header -->
          <div class="numpad-header">
            <div class="numpad-name">{{ qtyDialogTask.preparationName }}</div>
            <div class="numpad-rec">
              Recommended: {{ qtyDialogTask.targetQuantity }}{{ qtyDialogTask.targetUnit }}
            </div>
          </div>

          <!-- Display -->
          <div class="numpad-display">
            <span class="numpad-value">{{ qtyDialogDisplay || '0' }}</span>
            <span class="numpad-unit">{{ qtyDialogTask.targetUnit }}</span>
          </div>

          <!-- Numpad Grid -->
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

          <!-- Staff Picker -->
          <div class="numpad-staff">
            <StaffPicker
              v-model="qtyDialogStaffId"
              :department="qtyDialogTask.department"
              :required="true"
              dense
              label="Who did this?"
              @update:staff-member="handleQtyStaffUpdate"
            />
          </div>

          <!-- Actions -->
          <div class="numpad-actions">
            <v-btn variant="text" @click="cancelQtyDialog">Cancel</v-btn>
            <v-btn
              :color="qtyDialogTask.taskType === 'write_off' ? 'error' : 'success'"
              variant="flat"
              size="large"
              class="confirm-btn"
              :disabled="!qtyDialogStaffId"
              @click="confirmQtyDialog"
            >
              <v-icon start>mdi-check</v-icon>
              Confirm
            </v-btn>
          </div>
        </v-card>
      </v-dialog>
      <!-- Rating Dialog (for requires_note custom tasks) -->
      <v-dialog v-model="showNoteDialog" max-width="360" persistent>
        <v-card v-if="noteDialogTask" class="note-dialog-card">
          <v-card-title class="text-body-1 font-weight-bold">
            <v-icon start size="20">mdi-clipboard-check-outline</v-icon>
            {{ noteDialogTask.name }}
          </v-card-title>
          <v-card-text class="pb-2">
            <div class="rating-buttons">
              <v-btn
                :variant="noteDialogRating === 'bad' ? 'flat' : 'outlined'"
                color="error"
                class="rating-btn"
                @click="noteDialogRating = 'bad'"
              >
                Bad
              </v-btn>
              <v-btn
                :variant="noteDialogRating === 'good' ? 'flat' : 'outlined'"
                color="warning"
                class="rating-btn"
                @click="noteDialogRating = 'good'"
              >
                Good
              </v-btn>
              <v-btn
                :variant="noteDialogRating === 'excellent' ? 'flat' : 'outlined'"
                color="success"
                class="rating-btn"
                @click="noteDialogRating = 'excellent'"
              >
                Excellent
              </v-btn>
            </div>
            <!-- Comment: required for bad, optional for good, hidden for excellent -->
            <v-textarea
              v-if="noteDialogRating === 'bad' || noteDialogRating === 'good'"
              v-model="noteDialogText"
              :label="noteDialogRating === 'bad' ? 'Comment (required)' : 'Comment (optional)'"
              variant="outlined"
              rows="2"
              auto-grow
              density="compact"
              hide-details
              class="mt-3"
            />
            <StaffPicker
              v-model="noteDialogStaffId"
              :department="noteDialogTask?.department || 'kitchen'"
              :required="true"
              dense
              label="Who did this?"
              class="mt-3"
              @update:staff-member="handleNoteStaffUpdate"
            />
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" @click="cancelNoteDialog">Cancel</v-btn>
            <v-spacer />
            <v-btn
              color="success"
              variant="flat"
              :disabled="
                !noteDialogRating ||
                !noteDialogStaffId ||
                (noteDialogRating === 'bad' && !noteDialogText.trim())
              "
              @click="confirmNoteDialog"
            >
              <v-icon start>mdi-check</v-icon>
              Done
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-dialog>

  <!-- Congratulations overlay (uses captured stats that survive dialog close) -->
  <RitualCongratulations
    v-model="showCongrats"
    :ritual-type="ritualType"
    :total-tasks="congratsStats.totalTasks"
    :completed-tasks="congratsStats.completedTasks"
    :schedule-tasks-done="congratsStats.scheduleTasksDone"
    :custom-tasks-done="congratsStats.customTasksDone"
    :duration-minutes="congratsStats.durationMinutes"
    :staff-name="staffName"
  />
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onUnmounted } from 'vue'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'
import type { RitualCustomTask, RitualTaskDetail } from '@/stores/kitchenKpi/types'
import RitualCongratulations from '../components/RitualCongratulations.vue'
import StaffPicker from '../components/StaffPicker.vue'
import ProductionCard from '../components/ProductionCard.vue'

interface Props {
  modelValue: boolean
  tasks: ProductionScheduleItem[]
  customTasks?: RitualCustomTask[]
  ritualType: 'morning' | 'afternoon' | 'evening'
  staffName?: string
}

const props = withDefaults(defineProps<Props>(), {
  customTasks: () => [],
  staffName: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
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
  'ritual-completed': [
    ritualType: 'morning' | 'afternoon' | 'evening',
    taskDetails: RitualTaskDetail[],
    durationMinutes: number
  ]
}>()

// =============================================
// STATE
// =============================================

const doneCollapsed = ref(true)
const showCongrats = ref(false)

// Local "in progress" state (UI only, not persisted)
const inProgressIds = reactive(new Set<string>())

// Local "completed" schedule tasks (tracks completions before store propagates)
const completedScheduleIds = reactive(new Set<string>())

// Custom tasks completion tracking (local state)
const completedCustomTaskIds = reactive(new Set<string>())

// Timing
const startedAt = ref<string | null>(null)
const elapsedSeconds = ref(0)
let elapsedTimer: ReturnType<typeof setInterval> | null = null

// Quantity dialog with numpad
const showQtyDialog = ref(false)
const qtyDialogTask = ref<ProductionScheduleItem | null>(null)
const qtyDialogDisplay = ref('')
const qtyDialogPrefilled = ref(false) // True until first keypress replaces the pre-filled value

// Per-task staff tracking
const taskStaff = reactive(new Map<string, { id: string; name: string }>())
// Per-task notes (for custom tasks)
const taskNotes = reactive(new Map<string, string>())
// Per-task ratings (bad/good/excellent)
const taskRatings = reactive(new Map<string, string>())
// Per-task start times (for duration tracking)
const taskStartTimes = reactive(new Map<string, number>()) // taskId → Date.now()
// Per-task duration (recorded on completion)
const taskDurations = reactive(new Map<string, number>()) // taskId → seconds

// Custom task rating dialog
const showNoteDialog = ref(false)
const noteDialogTask = ref<RitualCustomTask | null>(null)
const noteDialogRating = ref('')
const noteDialogText = ref('')
const noteDialogStaffId = ref<string>()
const noteDialogStaffName = ref<string>()

// QtyDialog staff
const qtyDialogStaffId = ref<string>()
const qtyDialogStaffName = ref<string>()

// ProductionCard dialog (replaces numpad for in-progress tasks)
const showProductionCard = ref(false)
const productionCardTask = ref<ProductionScheduleItem | null>(null)
const productionCardInitialTab = ref<'recipe' | 'complete'>('complete')

// Captured stats for congratulations overlay (survives dialog close)
const congratsStats = ref({
  totalTasks: 0,
  completedTasks: 0,
  scheduleTasksDone: 0,
  customTasksDone: 0,
  durationMinutes: 0
})

const kpiStore = useKitchenKpiStore()

// Reset state on dialog open
watch(
  () => props.modelValue,
  open => {
    if (open) {
      inProgressIds.clear()
      completedCustomTaskIds.clear()
      taskStaff.clear()
      taskNotes.clear()
      taskStartTimes.clear()
      taskDurations.clear()
      doneCollapsed.value = true
      // Use store's startedAt if available (restored session), otherwise now
      startedAt.value = kpiStore.ritualStartedAt || new Date().toISOString()
      // Calculate elapsed from startedAt (handles restored sessions)
      elapsedSeconds.value = Math.floor((Date.now() - new Date(startedAt.value).getTime()) / 1000)
      elapsedTimer = setInterval(() => {
        elapsedSeconds.value++
      }, 1000)
    } else {
      // Stop timing
      if (elapsedTimer) {
        clearInterval(elapsedTimer)
        elapsedTimer = null
      }
    }
  }
)

onUnmounted(() => {
  if (elapsedTimer) clearInterval(elapsedTimer)
})

// =============================================
// COMPUTED
// =============================================

/** All tasks = schedule + custom */
const allRitualTasks = computed(() => {
  const scheduleTasks = props.tasks.map(t => ({ id: t.id, type: 'schedule' as const }))
  const customTasks = props.customTasks.map(t => ({ id: t.id, type: 'custom' as const }))
  return [...scheduleTasks, ...customTasks]
})

/** Schedule tasks by status (use local completedScheduleIds for immediate UI feedback) */
const todoScheduleTasks = computed(() =>
  props.tasks.filter(
    t => t.status !== 'completed' && !completedScheduleIds.has(t.id) && !inProgressIds.has(t.id)
  )
)

const inProgressTasks = computed(() =>
  props.tasks.filter(
    t => t.status !== 'completed' && !completedScheduleIds.has(t.id) && inProgressIds.has(t.id)
  )
)

const doneScheduleTasks = computed(() => {
  const completed = props.tasks.filter(
    t => t.status === 'completed' || completedScheduleIds.has(t.id)
  )
  return [...completed].sort((a, b) => {
    const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0
    const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0
    return tb - ta
  })
})

/** Custom tasks by status */
const todoCustomTasks = computed(() =>
  props.customTasks.filter(t => !completedCustomTaskIds.has(t.id))
)

const doneCustomTasks = computed(() =>
  props.customTasks.filter(t => completedCustomTaskIds.has(t.id))
)

/** All todo tasks (combined) */
const todoTasks = computed(() => [
  ...todoScheduleTasks.value.map(t => ({ id: t.id })),
  ...todoCustomTasks.value.map(t => ({ id: t.id }))
])

/** All done tasks (combined) */
const doneTasks = computed(() => [
  ...doneScheduleTasks.value.map(t => ({ id: t.id })),
  ...doneCustomTasks.value.map(t => ({ id: t.id }))
])

const completedCount = computed(() => doneTasks.value.length)

const progressPercent = computed(() =>
  allRitualTasks.value.length > 0 ? (completedCount.value / allRitualTasks.value.length) * 100 : 0
)

const allDone = computed(
  () => allRitualTasks.value.length > 0 && completedCount.value === allRitualTasks.value.length
)

const durationMinutes = computed(() => Math.round(elapsedSeconds.value / 60))

const elapsedDisplay = computed(() => {
  const mins = Math.floor(elapsedSeconds.value / 60)
  const secs = elapsedSeconds.value % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

const ritualColor = computed(() => {
  switch (props.ritualType) {
    case 'morning':
      return 'info'
    case 'afternoon':
      return 'warning'
    default:
      return 'purple'
  }
})
const ritualIcon = computed(() => {
  switch (props.ritualType) {
    case 'morning':
      return 'mdi-weather-sunny'
    case 'afternoon':
      return 'mdi-weather-partly-cloudy'
    default:
      return 'mdi-weather-night'
  }
})
const ritualLabel = computed(() => {
  switch (props.ritualType) {
    case 'morning':
      return 'Morning Ritual'
    case 'afternoon':
      return 'Afternoon Ritual'
    default:
      return 'Evening Ritual'
  }
})

// Auto-finish when all tasks are completed
watch(allDone, done => {
  if (done && props.modelValue) {
    // Small delay so user sees the last task move to Done column
    setTimeout(() => handleFinishRitual(), 800)
  }
})

// =============================================
// METHODS
// =============================================

function getTaskColor(task: ProductionScheduleItem): string {
  if (task.taskType === 'write_off') return 'writeoff'
  if (task.isPremade) return 'premade'
  return 'production'
}

function getTaskIcon(task: ProductionScheduleItem): string {
  if (task.taskType === 'write_off') return 'mdi-delete-outline'
  if (task.isPremade) return 'mdi-food-variant'
  return 'mdi-pot-steam-outline'
}

function getStockClass(task: ProductionScheduleItem): string {
  if (task.currentStockAtGeneration == null) return ''
  if (task.currentStockAtGeneration < task.targetQuantity * 0.5) return 'stock-critical'
  if (task.currentStockAtGeneration < task.targetQuantity) return 'stock-low'
  return 'stock-ok'
}

function getStockDiff(task: ProductionScheduleItem): number {
  if (task.currentStockAtGeneration == null) return 0
  return Math.round(task.currentStockAtGeneration - task.targetQuantity)
}

/** Move schedule task from To Do to In Progress */
function startTask(task: ProductionScheduleItem): void {
  inProgressIds.add(task.id)
  taskStartTimes.set(task.id, Date.now())
}

/** Toggle custom task completion — always show rating dialog */
function toggleCustomTask(task: RitualCustomTask): void {
  if (completedCustomTaskIds.has(task.id)) {
    completedCustomTaskIds.delete(task.id)
    taskNotes.delete(task.id)
    taskRatings.delete(task.id)
    taskStaff.delete(task.id)
    taskDurations.delete(task.id)
  } else {
    noteDialogTask.value = task
    noteDialogText.value = ''
    noteDialogRating.value = ''
    noteDialogStaffId.value = undefined
    noteDialogStaffName.value = undefined
    taskStartTimes.set(task.id, Date.now())
    showNoteDialog.value = true
  }
}

function completeCustomTask(taskId: string): void {
  completedCustomTaskIds.add(taskId)
  // Record duration
  const startTime = taskStartTimes.get(taskId)
  if (startTime) {
    taskDurations.set(taskId, Math.round((Date.now() - startTime) / 1000))
  }
  doneCollapsed.value = false
}

function confirmNoteDialog(): void {
  if (!noteDialogTask.value) return
  const taskId = noteDialogTask.value.id
  taskRatings.set(taskId, noteDialogRating.value)
  if (noteDialogText.value.trim()) {
    taskNotes.set(taskId, noteDialogText.value.trim())
  }
  if (noteDialogStaffId.value && noteDialogStaffName.value) {
    taskStaff.set(taskId, { id: noteDialogStaffId.value, name: noteDialogStaffName.value })
  }
  completeCustomTask(taskId)
  showNoteDialog.value = false
  noteDialogTask.value = null
}

function cancelNoteDialog(): void {
  showNoteDialog.value = false
  noteDialogTask.value = null
}

function handleNoteStaffUpdate(member: { id: string; name: string } | undefined): void {
  noteDialogStaffName.value = member?.name
}

/** Open ProductionCard dialog for an in-progress task */
function openProductionCard(task: ProductionScheduleItem, tab: 'recipe' | 'complete'): void {
  productionCardTask.value = task
  productionCardInitialTab.value = tab
  showProductionCard.value = true
}

/** Handle production completion from ProductionCard */
function handleProductionCardComplete(
  task: ProductionScheduleItem,
  qty: number,
  staffMemberId?: string,
  staffMemberName?: string,
  taskStartedAt?: string,
  photoUrl?: string
): void {
  showProductionCard.value = false
  // Record staff for this task
  if (staffMemberId && staffMemberName) {
    taskStaff.set(task.id, { id: staffMemberId, name: staffMemberName })
  }
  // Record duration
  const startTime = taskStartTimes.get(task.id)
  if (startTime) {
    taskDurations.set(task.id, Math.round((Date.now() - startTime) / 1000))
  }
  // Remove from in-progress, mark as locally completed
  inProgressIds.delete(task.id)
  completedScheduleIds.add(task.id)
  // Emit to parent
  emit('complete', task, qty, staffMemberId, staffMemberName, taskStartedAt)
  // Expand done column
  doneCollapsed.value = false
  productionCardTask.value = null
}

/** Handle write-off from ProductionCard */
function handleProductionCardWriteOff(
  task: ProductionScheduleItem,
  qty: number,
  staffMemberId?: string,
  staffMemberName?: string
): void {
  showProductionCard.value = false
  if (staffMemberId && staffMemberName) {
    taskStaff.set(task.id, { id: staffMemberId, name: staffMemberName })
  }
  const startTime = taskStartTimes.get(task.id)
  if (startTime) {
    taskDurations.set(task.id, Math.round((Date.now() - startTime) / 1000))
  }
  inProgressIds.delete(task.id)
  completedScheduleIds.add(task.id)
  emit('write-off', task, qty, staffMemberId, staffMemberName)
  doneCollapsed.value = false
  productionCardTask.value = null
}

/** Open quantity confirmation dialog with numpad */
function openQtyDialog(task: ProductionScheduleItem): void {
  qtyDialogTask.value = task
  qtyDialogDisplay.value = String(task.targetQuantity)
  qtyDialogPrefilled.value = true
  qtyDialogStaffId.value = undefined
  qtyDialogStaffName.value = undefined
  showQtyDialog.value = true
}

function handleQtyStaffUpdate(member: { id: string; name: string } | undefined): void {
  qtyDialogStaffName.value = member?.name
}

function numpadPress(digit: string): void {
  // First keypress replaces pre-filled value
  if (qtyDialogPrefilled.value) {
    qtyDialogDisplay.value = digit
    qtyDialogPrefilled.value = false
  } else if (qtyDialogDisplay.value === '0') {
    qtyDialogDisplay.value = digit
  } else if (qtyDialogDisplay.value.length < 5) {
    qtyDialogDisplay.value += digit
  }
}

function numpadBackspace(): void {
  qtyDialogPrefilled.value = false
  qtyDialogDisplay.value = qtyDialogDisplay.value.slice(0, -1)
}

function numpadClear(): void {
  qtyDialogPrefilled.value = false
  qtyDialogDisplay.value = ''
}

function confirmQtyDialog(): void {
  if (!qtyDialogTask.value) return
  const task = qtyDialogTask.value
  const qty = Math.max(1, Number(qtyDialogDisplay.value) || task.targetQuantity)

  // Record staff for this task
  if (qtyDialogStaffId.value && qtyDialogStaffName.value) {
    taskStaff.set(task.id, { id: qtyDialogStaffId.value, name: qtyDialogStaffName.value })
  }

  // Record duration
  const startTime = taskStartTimes.get(task.id)
  if (startTime) {
    taskDurations.set(task.id, Math.round((Date.now() - startTime) / 1000))
  }

  // Remove from in-progress, mark as locally completed
  inProgressIds.delete(task.id)
  completedScheduleIds.add(task.id)

  // Emit to parent (with staff info for Production Control)
  const staffId = qtyDialogStaffId.value
  const staffName = qtyDialogStaffName.value
  const taskStartedAt = startTime ? new Date(startTime).toISOString() : undefined
  if (task.taskType === 'write_off') {
    emit('write-off', task, qty, staffId, staffName)
  } else {
    emit('complete', task, qty, staffId, staffName, taskStartedAt)
  }

  // Expand done column to show result
  doneCollapsed.value = false

  showQtyDialog.value = false
  qtyDialogTask.value = null
}

function cancelQtyDialog(): void {
  showQtyDialog.value = false
  qtyDialogTask.value = null
}

function getDoneQtyClass(task: ProductionScheduleItem): string {
  const actual = task.completedQuantity || task.targetQuantity
  if (actual > task.targetQuantity) return 'text-success'
  if (actual < task.targetQuantity) return 'text-warning'
  return 'text-success'
}

/** Finish ritual: build task details and emit */
function handleFinishRitual(): void {
  const now = new Date().toISOString()

  // Build task details array
  const taskDetails: RitualTaskDetail[] = []

  // Schedule tasks — full detail with staff and timing
  for (const task of props.tasks) {
    const staff = taskStaff.get(task.id)
    const duration = taskDurations.get(task.id)
    taskDetails.push({
      taskId: task.id,
      name: task.preparationName,
      type: 'schedule',
      completed: task.status === 'completed',
      completedAt: task.completedAt || undefined,
      targetQuantity: task.targetQuantity,
      completedQuantity: task.completedQuantity || undefined,
      unit: task.targetUnit,
      quantity: task.completedQuantity || task.targetQuantity,
      staffMemberId: staff?.id || task.staffMemberId,
      staffMemberName: staff?.name || task.staffMemberName,
      durationSeconds: duration
    })
  }

  // Custom tasks — track completion time, staff, rating, notes
  for (const ct of props.customTasks) {
    const isDone = completedCustomTaskIds.has(ct.id)
    const staff = taskStaff.get(ct.id)
    const rating = taskRatings.get(ct.id)
    const notes = taskNotes.get(ct.id)
    const duration = taskDurations.get(ct.id)
    taskDetails.push({
      taskId: ct.id,
      name: ct.name,
      type: 'custom',
      completed: isDone,
      completedAt: isDone ? now : undefined,
      staffMemberId: staff?.id,
      staffMemberName: staff?.name,
      rating: rating as 'bad' | 'good' | 'excellent' | undefined,
      notes,
      durationSeconds: duration
    })
  }

  // Capture stats BEFORE closing dialog (dialog close resets state)
  congratsStats.value = {
    totalTasks: allRitualTasks.value.length,
    completedTasks: completedCount.value,
    scheduleTasksDone: doneScheduleTasks.value.length,
    customTasksDone: doneCustomTasks.value.length,
    durationMinutes: durationMinutes.value
  }

  // Show congratulations
  showCongrats.value = true

  // Emit completion data
  emit('ritual-completed', props.ritualType, taskDetails, durationMinutes.value)

  // Close the ritual dialog (congrats stays open)
  emit('update:modelValue', false)
}

function formatTime(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return ''
  }
}
</script>

<style scoped lang="scss">
.ritual-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 3-Column Kanban */
.ritual-kanban {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  flex: 1;
  overflow: hidden;
  padding: 10px;
  min-height: 0;

  &.done-collapsed {
    grid-template-columns: 1fr 1fr 56px;
  }
}

.ritual-column {
  display: flex;
  flex-direction: column;
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 10px;
  overflow: hidden;
  min-width: 0;

  &.collapsed {
    min-width: 56px;
    max-width: 56px;
  }
}

.col-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  flex-shrink: 0;
  border-bottom: 2px solid rgba(255, 255, 255, 0.06);

  &.col-header-todo {
    background-color: rgba(var(--v-theme-warning), 0.08);
  }
  &.col-header-progress {
    background-color: rgba(var(--v-theme-primary), 0.08);
  }
  &.col-header-done {
    background-color: rgba(var(--v-theme-success), 0.08);
  }

  .collapsed & {
    justify-content: center;
    padding: 10px 4px;
  }
}

.col-title {
  font-size: 14px;
  font-weight: 600;
  flex: 1;
}

.col-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  -webkit-overflow-scrolling: touch;
}

.col-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 8px;
  gap: 6px;
  opacity: 0.4;
}

/* Ritual Item */
.ritual-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  background-color: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 8px;
  border-left: 4px solid transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);

  &:active:not(.item-done) {
    background-color: rgba(var(--v-theme-primary), 0.06);
  }

  &.item-premade {
    border-left-color: #009688;
  }
  &.item-production {
    border-left-color: rgb(var(--v-theme-info));
  }
  &.item-writeoff {
    border-left-color: rgb(var(--v-theme-error));
    background-color: rgba(var(--v-theme-error), 0.04);
  }
  &.item-custom {
    border-left-color: rgb(var(--v-theme-secondary));
    gap: 8px;
    align-items: center;
  }
  &.item-in-progress {
    background-color: rgba(var(--v-theme-primary), 0.04);
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  &.item-done {
    opacity: 0.7;
    border-left-color: rgb(var(--v-theme-success));
    cursor: default;
    min-height: 48px;
    padding: 8px 10px;
    gap: 8px;
    align-items: center;
  }
}

/* Type icon circle (ritual) */
.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;

  &.icon-production {
    background-color: rgba(var(--v-theme-info), 0.12);
    color: rgb(var(--v-theme-info));
  }
  &.icon-premade {
    background-color: rgba(0, 150, 136, 0.12);
    color: #009688;
  }
  &.icon-writeoff {
    background-color: rgba(var(--v-theme-error), 0.12);
    color: rgb(var(--v-theme-error));
  }
}

.item-body {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* Row 1: name + WO + chevron */
.item-row-top {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-name {
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.item-chevron {
  flex-shrink: 0;
  margin-left: auto;
}

/* Row 2: badges — single line, no wrap */
.item-row-badges {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
}

.item-name-done {
  font-size: 13px;
  text-decoration: line-through;
  opacity: 0.8;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: 14px;
}

.meta-target-bold {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

/* Badge pills (inline with name, wrap if needed) */
.ri-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2px 6px;
  border-radius: 6px;
  flex-shrink: 0;
}

.ri-badge-qty {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.ri-badge-label {
  font-size: 7px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-top: 2px;
  opacity: 0.8;
}

.ri-badge-stock {
  background-color: rgba(var(--v-theme-warning), 0.15);
  color: rgb(var(--v-theme-warning));
}

.ri-badge-target {
  background-color: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
}

.ri-badge-neutral {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.item-done-detail {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  margin-top: 2px;
}

.done-recommended {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.done-actual {
  font-weight: 600;
}

.done-time {
  color: rgba(var(--v-theme-on-surface), 0.4);
  margin-left: 4px;
}

.ip-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.ip-btn {
  height: 40px !important;
  min-width: 40px !important;
  text-transform: none;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0;
  padding: 0 10px !important;
}

.ip-btn-done {
  min-width: 80px !important;
}

/* Numpad Dialog */
.qty-dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
}

.numpad-header {
  padding: 16px 20px 8px;
}

.numpad-name {
  font-size: 16px;
  font-weight: 700;
}

.numpad-rec {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-top: 2px;
}

.numpad-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px 16px;
}

.numpad-value {
  font-size: 40px;
  font-weight: 700;
  min-width: 60px;
  text-align: center;
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.5);
  padding: 0 8px 4px;
}

.numpad-unit {
  font-size: 20px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.numpad-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  padding: 0 16px;
}

.numpad-btn {
  height: 52px !important;
  font-size: 20px !important;
  font-weight: 600 !important;
  border-radius: 10px !important;
}

.numpad-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 16px;
}

.confirm-btn {
  min-width: 140px !important;
  height: 48px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

/* Staff picker in numpad dialog */
.numpad-staff {
  padding: 0 16px 4px;
}

/* Done column staff + notes */
.done-staff {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-left: 4px;
}

.done-note {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-left: 4px;
  font-style: italic;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Note dialog */
.note-dialog-card {
  border-radius: 12px !important;
}

.rating-buttons {
  display: flex;
  gap: 8px;
}

.rating-btn {
  flex: 1;
  height: 44px !important;
  min-width: 0 !important;
  padding: 0 8px !important;
  font-size: 12px !important;
  font-weight: 600;
  letter-spacing: 0.5px;
}
</style>
