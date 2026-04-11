<!-- src/views/kitchen/tasks/TasksScreen.vue -->
<!-- Kitchen Tasks — Kanban board (To Do | Done) with filter chips and ritual banner -->
<template>
  <div class="tasks-screen">
    <!-- Kanban Board -->
    <div class="kanban-board" :class="{ 'done-collapsed': doneCollapsed }">
      <!-- TO DO Column -->
      <div class="kanban-column todo-column">
        <div class="column-content">
          <!-- Ritual Banner (scrolls with content) -->
          <RitualBanner
            v-if="ritualTasks.length > 0 || kpiStore.currentRitualCompleted"
            :total="ritualTasks.length"
            :completed="ritualCompletedCount"
            :ritual-type="kpiStore.currentRitualType"
            :ritual-completed="kpiStore.currentRitualCompleted"
            class="scroll-banner"
            @open="showRitualDialog = true"
          />

          <!-- Filter Chips (scrolls with content) -->
          <div class="scroll-filters">
            <v-chip-group v-model="activeFilter" mandatory selected-class="text-primary">
              <v-chip value="all" variant="outlined" filter size="small">
                All
                <v-badge
                  v-if="todoItems.length"
                  :content="todoItems.length"
                  color="primary"
                  inline
                  class="ml-1"
                />
              </v-chip>
              <v-chip value="premade" variant="outlined" filter size="small">
                <v-icon start size="14" color="teal">mdi-circle</v-icon>
                Pre-made
              </v-chip>
              <v-chip value="production" variant="outlined" filter size="small">
                <v-icon start size="14" color="info">mdi-circle</v-icon>
                Production
              </v-chip>
              <v-chip value="write_off" variant="outlined" filter size="small">
                <v-icon start size="14" color="error">mdi-circle</v-icon>
                Write-off
              </v-chip>
              <v-chip value="defrost" variant="outlined" filter size="small">
                <v-icon start size="14" color="cyan">mdi-circle</v-icon>
                Defrost
              </v-chip>
            </v-chip-group>
            <v-btn
              variant="text"
              size="x-small"
              :loading="isRefreshing"
              class="ml-auto"
              @click="handleRefresh"
            >
              <v-icon size="18">mdi-refresh</v-icon>
            </v-btn>
          </div>

          <!-- Sticky column header -->
          <div class="sticky-header">
            <v-icon color="warning" size="20">mdi-clipboard-list-outline</v-icon>
            <span class="column-title">To Do</span>
            <v-badge :content="filteredTodoItems.length || '0'" color="warning" inline />
          </div>
          <!-- Loading -->
          <div v-if="isLoading" class="empty-state">
            <v-progress-circular indeterminate size="32" />
          </div>

          <!-- Empty -->
          <div v-else-if="filteredTodoItems.length === 0" class="empty-state">
            <v-icon size="48" color="grey">mdi-check-all</v-icon>
            <p class="text-medium-emphasis mt-2">All done!</p>
          </div>

          <!-- Custom Tasks (checklist) -->
          <div
            v-if="activeFilter === 'all' && currentCustomTasks.length > 0"
            class="custom-tasks-section"
          >
            <div class="custom-tasks-header">
              <v-icon size="16" color="secondary">mdi-checkbox-marked-outline</v-icon>
              <span class="custom-tasks-title">Checklist</span>
              <v-badge :content="currentCustomTasks.length" color="secondary" inline />
            </div>
            <div
              v-for="ct in currentCustomTasks"
              :key="ct.id"
              class="custom-task-item"
              @click="toggleCustomTaskDone(ct)"
            >
              <v-icon size="20" :color="customTaskDone[ct.id] ? 'success' : 'grey'">
                {{ customTaskDone[ct.id] ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
              </v-icon>
              <span
                class="custom-task-name"
                :class="{ 'text-decoration-line-through': customTaskDone[ct.id] }"
              >
                {{ ct.name }}
              </span>
            </div>
          </div>

          <!-- Task Cards grouped by category -->
          <template v-for="group in groupedTodoItems" :key="group.categoryId">
            <CategoryGroup
              :category-name="group.categoryName"
              :category-emoji="group.categoryEmoji"
              :task-count="group.tasks.length"
            >
              <TaskCard
                v-for="task in group.tasks"
                :key="task.id"
                :task="task"
                @complete="handleComplete"
                @write-off="handleWriteOff"
                @defrost="handleDefrost"
              />
            </CategoryGroup>
          </template>
        </div>
      </div>

      <!-- DONE Column (Collapsible) -->
      <div class="kanban-column done-column" :class="{ collapsed: doneCollapsed }">
        <div class="column-header">
          <template v-if="!doneCollapsed">
            <v-icon color="success" size="24">mdi-check-circle</v-icon>
            <h3 class="column-title">Done</h3>
            <v-badge :content="doneItems.length || '0'" color="success" inline />
          </template>

          <v-btn
            icon
            size="x-small"
            variant="flat"
            color="success"
            :class="doneCollapsed ? '' : 'ml-auto'"
            class="expand-btn"
            @click="doneCollapsed = !doneCollapsed"
          >
            <v-icon>{{ doneCollapsed ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
          </v-btn>
        </div>

        <div v-if="!doneCollapsed" class="column-content">
          <div v-if="doneItems.length === 0" class="empty-state">
            <v-icon size="48" color="grey">mdi-clipboard-check-outline</v-icon>
            <p class="text-medium-emphasis mt-2">No completed tasks</p>
          </div>

          <TaskCard v-for="task in doneItems" :key="task.id" :task="task" />
        </div>
      </div>
    </div>

    <!-- Ritual Dialog -->
    <RitualDialog
      v-model="showRitualDialog"
      :tasks="ritualTasks"
      :custom-tasks="kpiStore.currentRitualCustomTasks"
      :ritual-type="kpiStore.currentRitualType"
      :staff-name="authStore.userName"
      @complete="handleComplete"
      @write-off="handleWriteOff"
      @defrost="handleDefrost"
      @ritual-completed="handleRitualCompleted"
    />

    <!-- Rating Dialog (for requires_note custom tasks) -->
    <v-dialog v-model="showRatingDialog" max-width="360" persistent>
      <v-card v-if="ratingDialogTask" class="rating-dialog-card">
        <v-card-title class="text-body-1 font-weight-bold">
          <v-icon start size="20">mdi-clipboard-check-outline</v-icon>
          {{ ratingDialogTask.name }}
        </v-card-title>
        <v-card-text class="pb-2">
          <div class="rating-buttons">
            <v-btn
              :variant="ratingValue === 'bad' ? 'flat' : 'outlined'"
              color="error"
              class="rating-btn"
              @click="ratingValue = 'bad'"
            >
              Bad
            </v-btn>
            <v-btn
              :variant="ratingValue === 'good' ? 'flat' : 'outlined'"
              color="warning"
              class="rating-btn"
              @click="ratingValue = 'good'"
            >
              Good
            </v-btn>
            <v-btn
              :variant="ratingValue === 'excellent' ? 'flat' : 'outlined'"
              color="success"
              class="rating-btn"
              @click="ratingValue = 'excellent'"
            >
              Excellent
            </v-btn>
          </div>
          <!-- Comment: required for bad, optional for good, hidden for excellent -->
          <v-textarea
            v-if="ratingValue === 'bad' || ratingValue === 'good'"
            v-model="ratingComment"
            :label="ratingValue === 'bad' ? 'Comment (required)' : 'Comment (optional)'"
            variant="outlined"
            rows="2"
            auto-grow
            density="compact"
            hide-details
            class="mt-3"
          />
          <StaffPicker
            v-model="ratingStaffId"
            :department="userDepartment"
            :required="true"
            dense
            label="Who did this?"
            class="mt-3"
            @update:staff-member="(s: any) => (ratingStaffName = s?.name)"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="cancelRatingDialog">Cancel</v-btn>
          <v-spacer />
          <v-btn
            color="success"
            variant="flat"
            :disabled="
              !ratingValue || !ratingStaffId || (ratingValue === 'bad' && !ratingComment.trim())
            "
            @click="confirmRatingDialog"
          >
            <v-icon start>mdi-check</v-icon>
            Done
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="bottom right"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { usePreparationStore } from '@/stores/preparation'
import { useAuthStore } from '@/stores/auth'
import { useRecipesStore } from '@/stores/recipes'
import { useRecommendations } from '@/stores/kitchenKpi/composables/useRecommendations'
import { useBackgroundTasks } from '@/core/background'
import { DebugUtils, TimeUtils } from '@/utils'
import TaskCard from './components/TaskCard.vue'
import CategoryGroup from './components/CategoryGroup.vue'
import RitualBanner from './components/RitualBanner.vue'
import RitualDialog from './dialogs/RitualDialog.vue'
import StaffPicker from './components/StaffPicker.vue'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'
import type {
  RitualTaskDetail,
  RitualCustomTask,
  CreateScheduleItemData
} from '@/stores/kitchenKpi/types'
import { RITUAL_WINDOWS } from '@/stores/kitchenKpi/types'

const MODULE_NAME = 'TasksScreen'

// =============================================
// STORES
// =============================================

const kpiStore = useKitchenKpiStore()
const preparationStore = usePreparationStore()
const authStore = useAuthStore()
const recipesStore = useRecipesStore()
const { addScheduleCompleteTask, addPrepWriteOffTask } = useBackgroundTasks()
const { activeRecommendations, generateRecommendations, applyAllToSchedule } = useRecommendations()

// =============================================
// STATE
// =============================================

const activeFilter = ref('all')
const doneCollapsed = ref(true)
const isLoading = ref(false)
const isRefreshing = ref(false)
const showRitualDialog = ref(false)
const snackbar = ref({ show: false, message: '', color: 'success' })
const customTaskDone = ref<Record<string, boolean>>({})
const showRatingDialog = ref(false)
const ratingDialogTask = ref<RitualCustomTask | null>(null)
const ratingValue = ref('')
const ratingComment = ref('')
const ratingStaffId = ref<string | undefined>()
const ratingStaffName = ref<string | undefined>()

// =============================================
// COMPUTED
// =============================================

const userDepartment = computed<'kitchen' | 'bar'>(() => {
  const roles = authStore.userRoles
  if (roles.includes('bar') && !roles.includes('kitchen')) return 'bar'
  return 'kitchen'
})

/** All schedule items for today (non-cancelled) */
const allItems = computed(() => kpiStore.scheduleItems.filter(i => i.status !== 'cancelled'))

/** Pending (to do) items */
const todoItems = computed(() => allItems.value.filter(i => i.status === 'pending'))

/** Completed (done) items, filtered same as todo */
const doneItems = computed(() => {
  const completed = allItems.value.filter(i => i.status === 'completed')
  if (activeFilter.value === 'all') return completed
  return completed.filter(item => {
    switch (activeFilter.value) {
      case 'premade':
        return item.isPremade === true
      case 'production':
        return item.taskType !== 'write_off' && item.taskType !== 'defrost' && !item.isPremade
      case 'write_off':
        return item.taskType === 'write_off'
      case 'defrost':
        return item.taskType === 'defrost'
      default:
        return true
    }
  })
})

/** Filtered todo items by active filter */
const filteredTodoItems = computed(() => {
  if (activeFilter.value === 'all') return todoItems.value

  return todoItems.value.filter(item => {
    switch (activeFilter.value) {
      case 'premade':
        return item.isPremade === true
      case 'production':
        return item.taskType !== 'write_off' && item.taskType !== 'defrost' && !item.isPremade
      case 'write_off':
        return item.taskType === 'write_off'
      case 'defrost':
        return item.taskType === 'defrost'
      default:
        return true
    }
  })
})

/** Group filtered todo items by preparation category */
interface TaskGroup {
  categoryId: string
  categoryName: string
  categoryEmoji: string
  tasks: ProductionScheduleItem[]
}

const groupedTodoItems = computed<TaskGroup[]>(() => {
  const items = filteredTodoItems.value
  const groups = new Map<string, TaskGroup>()

  for (const item of items) {
    // All tasks (including write-offs) grouped by preparation category
    const preparation = recipesStore.preparations.find(p => p.id === item.preparationId)
    const categoryId = preparation?.type || '__uncategorized__'
    if (!groups.has(categoryId)) {
      groups.set(categoryId, {
        categoryId,
        categoryName: recipesStore.getPreparationCategoryName(categoryId),
        categoryEmoji: recipesStore.getPreparationCategoryEmoji(categoryId),
        tasks: []
      })
    }
    groups.get(categoryId)!.tasks.push(item)
  }

  // Sort groups by number of tasks (largest first)
  // Within each group, write-off tasks come first
  const result = Array.from(groups.values())
  for (const group of result) {
    group.tasks.sort((a, b) => {
      const typeOrder: Record<string, number> = { write_off: 0, defrost: 1, production: 2 }
      const aOrder = typeOrder[a.taskType] ?? 2
      const bOrder = typeOrder[b.taskType] ?? 2
      return aOrder - bOrder
    })
  }
  return result.sort((a, b) => b.tasks.length - a.tasks.length)
})

/** Active custom tasks for current ritual */
const currentCustomTasks = computed(() => kpiStore.currentRitualCustomTasks)

function toggleCustomTaskDone(ct: RitualCustomTask): void {
  if (customTaskDone.value[ct.id]) {
    customTaskDone.value[ct.id] = false
    return
  }
  ratingDialogTask.value = ct
  ratingValue.value = ''
  ratingComment.value = ''
  ratingStaffId.value = undefined
  ratingStaffName.value = undefined
  showRatingDialog.value = true
}

function confirmRatingDialog(): void {
  if (!ratingDialogTask.value) return
  customTaskDone.value[ratingDialogTask.value.id] = true
  showRatingDialog.value = false
  ratingDialogTask.value = null
}

function cancelRatingDialog(): void {
  showRatingDialog.value = false
  ratingDialogTask.value = null
}

/** Ritual tasks by type:
 * morning = premade + urgent + morning slot (breakfast+lunch prep)
 * afternoon = afternoon slot (dinner prep, based on actual remaining stock)
 * evening = evening slot + write-offs (long shelf-life items for next days)
 */
const ritualTasks = computed(() => {
  switch (kpiStore.currentRitualType) {
    case 'morning':
      return allItems.value.filter(
        i =>
          i.isPremade ||
          i.productionSlot === 'urgent' ||
          i.productionSlot === 'morning' ||
          i.taskType === 'defrost'
      )
    case 'afternoon':
      return allItems.value.filter(
        i =>
          i.productionSlot === 'afternoon' ||
          (i.productionSlot === 'urgent' && i.status !== 'completed')
      )
    default:
      return allItems.value.filter(
        i => i.productionSlot === 'evening' || i.taskType === 'write_off'
      )
  }
})

const ritualCompletedCount = computed(
  () => ritualTasks.value.filter(t => t.status === 'completed').length
)

// =============================================
// METHODS
// =============================================

async function loadData(): Promise<void> {
  try {
    isLoading.value = true

    await Promise.all([
      kpiStore.loadSchedule({ department: userDepartment.value }),
      kpiStore.loadCustomTasks(userDepartment.value),
      kpiStore.loadTodayRitualStatus(userDepartment.value),
      preparationStore.fetchBalances(userDepartment.value)
    ])

    // Auto-generate if needed
    await autoGenerateIfNeeded()
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to load data', { error: err })
  } finally {
    isLoading.value = false
  }
}

async function autoGenerateIfNeeded(): Promise<void> {
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
  const lastGenKey = 'prep_schedule_last_generated'
  const lastGenStr = localStorage.getItem(lastGenKey)
  const lastGenTime = lastGenStr ? new Date(lastGenStr).getTime() : 0
  const isStale = Date.now() - lastGenTime > TWELVE_HOURS_MS
  const hasPendingTasks = kpiStore.scheduleItems.some(i => i.status === 'pending')

  // Always ensure expired write-off tasks exist, even when production tasks are pending
  await ensureExpiredWriteOffTasks()

  // Always ensure defrost tasks exist for items with freezer stock and low fridge stock
  await ensureDefrostTasks()

  // Don't regenerate production if there are pending tasks (avoid duplicating existing tasks)
  if (hasPendingTasks) return
  // Don't regenerate if recently generated and no pending tasks (all done, nothing to add)
  if (!isStale) return

  try {
    await generateRecommendations(userDepartment.value)
    const count = activeRecommendations.value.length
    if (count > 0) {
      await applyAllToSchedule(userDepartment.value)
      await kpiStore.loadSchedule({ department: userDepartment.value })
      showSnackbar(`${count} tasks generated`, 'info')
    }
    localStorage.setItem(lastGenKey, new Date().toISOString())
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Auto-generation failed', { error: err })
  }
}

/**
 * Ensure write-off tasks exist for all expired preparations.
 * Runs every time tasks load — upsert prevents duplicates.
 */
async function ensureExpiredWriteOffTasks(): Promise<void> {
  try {
    const department = userDepartment.value
    const balances = preparationStore.state.balances || []
    const deptBalances = balances.filter(b => b.department === department || b.department === 'all')

    const expiredBalances = deptBalances.filter(b => b.hasExpired)
    DebugUtils.info(MODULE_NAME, '🔍 Checking expired write-off tasks', {
      totalBalances: balances.length,
      deptBalances: deptBalances.length,
      expiredBalances: expiredBalances.length,
      expiredNames: expiredBalances.map(b => b.preparationName)
    })

    // Find expired items that don't already have a PENDING write-off task today
    const existingWriteOffPrepIds = new Set(
      kpiStore.scheduleItems
        .filter(i => i.taskType === 'write_off' && i.status === 'pending')
        .map(i => i.preparationId)
    )

    const missingWriteOffs: CreateScheduleItemData[] = []

    for (const balance of deptBalances) {
      if (!balance.hasExpired) continue
      if (existingWriteOffPrepIds.has(balance.preparationId)) continue

      const now = new Date()
      const expiredQty =
        balance.batches
          ?.filter(b => b.currentQuantity > 0 && b.expiryDate && new Date(b.expiryDate) < now)
          .reduce((sum, b) => sum + (b.currentQuantity || 0), 0) || 0
      if (expiredQty <= 0) continue

      const prep = recipesStore.preparations?.find(p => p.id === balance.preparationId)
      const unitMap: Record<string, string> = { ml: 'ml', piece: 'pc' }
      const displayUnit = unitMap[prep?.outputUnit || ''] || 'g'

      missingWriteOffs.push({
        preparationId: balance.preparationId,
        preparationName: balance.preparationName,
        department,
        scheduleDate: TimeUtils.getCurrentLocalDate(),
        productionSlot: 'urgent',
        targetQuantity: Math.round(expiredQty),
        targetUnit: displayUnit,
        priority: 100,
        recommendationReason: `Write-off expired: ${Math.round(expiredQty)}${displayUnit}`,
        currentStockAtGeneration: balance.totalQuantity,
        taskType: 'write_off'
      })
    }

    DebugUtils.info(MODULE_NAME, '🔍 Write-off tasks to create', {
      missing: missingWriteOffs.length,
      existingWriteOffs: existingWriteOffPrepIds.size,
      items: missingWriteOffs.map(w => `${w.preparationName}: ${w.targetQuantity}${w.targetUnit}`)
    })

    if (missingWriteOffs.length > 0) {
      await kpiStore.createScheduleItems(missingWriteOffs)
      await kpiStore.loadSchedule({ department })
      DebugUtils.info(MODULE_NAME, '✅ Added expired write-off tasks', {
        count: missingWriteOffs.length
      })
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to ensure expired write-off tasks', { error: err })
  }
}

/**
 * Ensure defrost tasks exist for preparations with freezer stock and low fridge stock.
 * Runs every time tasks load — upsert prevents duplicates.
 */
async function ensureDefrostTasks(): Promise<void> {
  try {
    const department = userDepartment.value
    const balances = preparationStore.state.balances || []
    const deptBalances = balances.filter(b => b.department === department || b.department === 'all')

    // Find existing pending defrost tasks
    const existingDefrostPrepIds = new Set(
      kpiStore.scheduleItems
        .filter(i => i.taskType === 'defrost' && i.status === 'pending')
        .map(i => i.preparationId)
    )

    const missingDefrost: CreateScheduleItemData[] = []

    for (const balance of deptBalances) {
      if (existingDefrostPrepIds.has(balance.preparationId)) continue

      const prep = recipesStore.preparations?.find(p => p.id === balance.preparationId)
      if (!prep) continue

      // Exclude expired batches — expired frozen stock should be written off, not defrosted
      const now = new Date()
      const activeBatches =
        balance.batches?.filter(
          b =>
            b.currentQuantity > 0 &&
            b.status === 'active' &&
            !(b.expiryDate && new Date(b.expiryDate) < now)
        ) || []
      const freezerBatches = activeBatches.filter(b => b.storageLocation === 'freezer')
      const fridgeBatches = activeBatches.filter(
        b =>
          b.storageLocation === 'fridge' ||
          (!b.storageLocation && prep.storageLocation !== 'freezer')
      )

      const freezerStock = freezerBatches.reduce((sum, b) => sum + b.currentQuantity, 0)
      const fridgeStock = fridgeBatches.reduce((sum, b) => sum + b.currentQuantity, 0)

      if (freezerStock <= 0) continue

      const maxDaily = prep.maxDailyUsage || balance.averageDailyUsage || 0
      if (maxDaily <= 0) continue

      const fridgeTarget = maxDaily
      if (fridgeStock >= fridgeTarget) continue

      const defrostQty = Math.min(freezerStock, Math.round(fridgeTarget - fridgeStock))
      if (defrostQty < 50) continue

      const unitMap: Record<string, string> = { ml: 'ml', piece: 'pc' }
      const displayUnit = unitMap[prep.outputUnit || ''] || 'g'

      missingDefrost.push({
        preparationId: balance.preparationId,
        preparationName: balance.preparationName,
        department,
        scheduleDate: TimeUtils.getCurrentLocalDate(),
        productionSlot: 'morning',
        targetQuantity: defrostQty,
        targetUnit: displayUnit,
        priority: 80,
        recommendationReason: `Defrost: fridge ${Math.round(fridgeStock)}${displayUnit}, freezer ${Math.round(freezerStock)}${displayUnit}`,
        currentStockAtGeneration: freezerStock,
        taskType: 'defrost'
      })
    }

    if (missingDefrost.length > 0) {
      await kpiStore.createScheduleItems(missingDefrost)
      await kpiStore.loadSchedule({ department })
      DebugUtils.info(MODULE_NAME, '🧊 Added defrost tasks', {
        count: missingDefrost.length,
        items: missingDefrost.map(d => `${d.preparationName}: ${d.targetQuantity}${d.targetUnit}`)
      })
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to ensure defrost tasks', { error: err })
  }
}

async function handleRefresh(): Promise<void> {
  try {
    isRefreshing.value = true
    await loadData()
    showSnackbar('Refreshed', 'info')
  } catch {
    showSnackbar('Refresh failed', 'error')
  } finally {
    isRefreshing.value = false
  }
}

function handleComplete(
  task: ProductionScheduleItem,
  quantity: number,
  staffMemberId?: string,
  staffMemberName?: string,
  startedAt?: string,
  photoUrl?: string
): void {
  const preparation = recipesStore.preparations.find(p => p.id === task.preparationId)
  if (!preparation) {
    showSnackbar('Preparation not found', 'error')
    return
  }

  // Optimistic update
  const idx = kpiStore.scheduleItems.findIndex(i => i.id === task.id)
  if (idx !== -1) {
    kpiStore.scheduleItems[idx] = {
      ...kpiStore.scheduleItems[idx],
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedByName: staffMemberName || authStore.userName,
      staffMemberId: staffMemberId,
      staffMemberName: staffMemberName,
      completedQuantity: quantity,
      photoUrl,
      startedAt
    }
  }

  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + (preparation.shelfLife || 2))
  expiryDate.setHours(20, 0, 0, 0)

  const costPerUnit = preparation.lastKnownCost || preparation.costPerPortion || 0
  const hour = new Date().getHours()
  const isOnTime =
    task.productionSlot === 'urgent'
      ? true
      : task.productionSlot === 'morning'
        ? hour < 12
        : task.productionSlot === 'afternoon'
          ? hour >= 12 && hour < 18
          : hour >= 18 && hour < 22

  addScheduleCompleteTask(
    {
      taskId: task.id,
      preparationId: task.preparationId,
      preparationName: task.preparationName,
      targetQuantity: task.targetQuantity,
      completedQuantity: quantity,
      unit: task.targetUnit,
      productionSlot: task.productionSlot,
      department: userDepartment.value,
      responsiblePerson: authStore.userName,
      responsiblePersonId: authStore.userId || '',
      notes: `Completed ${quantity}${task.targetUnit}`,
      receiptData: {
        department: userDepartment.value,
        responsiblePerson: authStore.userName,
        sourceType: 'production',
        items: [
          {
            preparationId: task.preparationId,
            quantity,
            costPerUnit,
            expiryDate: expiryDate.toISOString().slice(0, 16),
            notes: 'From tasks board'
          }
        ],
        notes: 'Completed from tasks board'
      },
      kpiData: {
        userId: authStore.userId || 'unknown',
        userName: authStore.userName,
        isOnTime
      },
      // Production Control fields
      staffMemberId,
      staffMemberName,
      startedAt,
      photoUrl
    },
    {
      onSuccess: () => {
        showSnackbar(`${task.preparationName} done!`, 'success')
      },
      onError: (error: string) => {
        // Revert optimistic update (re-find by id in case array was mutated)
        const revertIdx = kpiStore.scheduleItems.findIndex(i => i.id === task.id)
        if (revertIdx !== -1) {
          kpiStore.scheduleItems[revertIdx] = {
            ...kpiStore.scheduleItems[revertIdx],
            status: 'pending',
            completedAt: undefined,
            completedByName: undefined,
            completedQuantity: undefined
          }
        }
        showSnackbar('Failed: ' + error, 'error')
      }
    }
  )
}

function handleWriteOff(
  task: ProductionScheduleItem,
  quantity: number,
  staffMemberId?: string,
  staffMemberName?: string
): void {
  // Clamp quantity to actual available stock to prevent insufficient stock errors
  const balance = (preparationStore.state.balances || []).find(
    b => b.preparationId === task.preparationId
  )
  const availableStock = balance ? Math.max(0, balance.totalQuantity) : quantity
  const clampedQty = Math.min(quantity, availableStock)
  if (clampedQty <= 0) {
    showSnackbar(`${task.preparationName}: no stock to write off`, 'warning')
    return
  }
  if (clampedQty < quantity) {
    showSnackbar(
      `${task.preparationName}: adjusted to ${clampedQty}${task.targetUnit} (available stock)`,
      'info'
    )
  }
  quantity = clampedQty

  // Optimistic update
  const idx = kpiStore.scheduleItems.findIndex(i => i.id === task.id)
  if (idx !== -1) {
    kpiStore.scheduleItems[idx] = {
      ...kpiStore.scheduleItems[idx],
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedByName: staffMemberName || authStore.userName,
      staffMemberName: staffMemberName,
      completedQuantity: quantity
    }
  }

  addPrepWriteOffTask(
    {
      items: [
        {
          preparationId: task.preparationId,
          preparationName: task.preparationName,
          quantity,
          unit: task.targetUnit
        }
      ],
      department: userDepartment.value,
      responsiblePerson: staffMemberName || authStore.userName,
      reason: 'expired',
      notes: 'Write-off from tasks board',
      kpiData: {
        userId: authStore.userId || 'unknown',
        userName: authStore.userName,
        affectsKpi: true
      }
    },
    {
      onSuccess: () => {
        showSnackbar(`${task.preparationName} written off`, 'success')
      },
      onError: (error: string) => {
        const revertIdx = kpiStore.scheduleItems.findIndex(i => i.id === task.id)
        if (revertIdx !== -1) {
          kpiStore.scheduleItems[revertIdx] = {
            ...kpiStore.scheduleItems[revertIdx],
            status: 'pending',
            completedAt: undefined,
            completedByName: undefined,
            completedQuantity: undefined
          }
        }
        showSnackbar('Failed: ' + error, 'error')
      }
    }
  )
}

async function handleDefrost(
  task: ProductionScheduleItem,
  quantity: number,
  staffMemberId?: string,
  staffMemberName?: string
): Promise<void> {
  // Find freezer batches for this preparation (FIFO order)
  const balance = (preparationStore.state.balances || []).find(
    b => b.preparationId === task.preparationId
  )
  if (!balance) {
    showSnackbar('No stock data found', 'error')
    return
  }

  const now = new Date()
  const freezerBatches = (balance.batches || [])
    .filter(
      b =>
        b.storageLocation === 'freezer' &&
        b.currentQuantity > 0 &&
        b.status === 'active' &&
        !(b.expiryDate && new Date(b.expiryDate) < now)
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  if (freezerBatches.length === 0) {
    showSnackbar('No freezer stock available', 'error')
    return
  }

  // Optimistic update
  const idx = kpiStore.scheduleItems.findIndex(i => i.id === task.id)
  if (idx !== -1) {
    kpiStore.scheduleItems[idx] = {
      ...kpiStore.scheduleItems[idx],
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedByName: staffMemberName || authStore.userName,
      staffMemberId,
      staffMemberName,
      completedQuantity: quantity
    }
  }

  let remainingQty = quantity
  try {
    // Transfer batches FIFO: move quantity from freezer to fridge
    for (const batch of freezerBatches) {
      if (remainingQty <= 0) break
      const transferQty = Math.min(remainingQty, batch.currentQuantity)

      const result = await preparationStore.transferBatch({
        department: userDepartment.value,
        responsiblePerson: staffMemberName || authStore.userName,
        sourceBatchId: batch.id,
        preparationId: task.preparationId,
        quantity: transferQty,
        fromLocation: 'freezer',
        toLocation: 'fridge',
        notes: `Defrost task: ${task.preparationName}`
      })

      if (!result.success) {
        throw new Error(result.error || 'Transfer failed')
      }
      remainingQty -= transferQty
    }

    // Mark schedule task as completed in DB
    const actualTransferred = quantity - remainingQty
    await kpiStore.completeTask({
      taskId: task.id,
      completedQuantity: actualTransferred,
      completedByName: staffMemberName || authStore.userName,
      staffMemberId,
      staffMemberName
    })

    // Refresh balances so subsequent tasks see updated stock
    await preparationStore.fetchBalances(userDepartment.value)

    showSnackbar(`${task.preparationName} moved to fridge!`, 'success')
  } catch (err) {
    // Some batches may have already transferred — refresh balances to reflect actual state
    await preparationStore.fetchBalances(userDepartment.value).catch(() => {})

    // If some quantity was already transferred, mark as partially completed
    const transferredSoFar = quantity - remainingQty
    if (transferredSoFar > 0) {
      // Partial success — update with actual transferred amount
      const partialIdx = kpiStore.scheduleItems.findIndex(i => i.id === task.id)
      if (partialIdx !== -1) {
        kpiStore.scheduleItems[partialIdx] = {
          ...kpiStore.scheduleItems[partialIdx],
          status: 'completed',
          completedQuantity: transferredSoFar
        }
      }
      await kpiStore
        .completeTask({
          taskId: task.id,
          completedQuantity: transferredSoFar,
          completedByName: staffMemberName || authStore.userName,
          staffMemberId,
          staffMemberName,
          notes: `Partial defrost: ${transferredSoFar}/${quantity} transferred`
        })
        .catch(() => {})
      showSnackbar(
        `Partial defrost: ${transferredSoFar}${task.targetUnit} moved (error on remaining)`,
        'warning'
      )
    } else {
      // Full failure — revert optimistic update
      const revertIdx = kpiStore.scheduleItems.findIndex(i => i.id === task.id)
      if (revertIdx !== -1) {
        kpiStore.scheduleItems[revertIdx] = {
          ...kpiStore.scheduleItems[revertIdx],
          status: 'pending',
          completedAt: undefined,
          completedByName: undefined,
          completedQuantity: undefined
        }
      }
      showSnackbar(
        'Defrost failed: ' + (err instanceof Error ? err.message : 'Unknown error'),
        'error'
      )
    }
  }
}

/**
 * Handle ritual completion — record to ritual_completions table via store
 */
async function handleRitualCompleted(
  ritualType: 'morning' | 'afternoon' | 'evening',
  taskDetails: RitualTaskDetail[],
  durationMinutes: number
): Promise<void> {
  const scheduleTasks = taskDetails.filter(t => t.type === 'schedule')
  const customTasks = taskDetails.filter(t => t.type === 'custom')

  DebugUtils.info(MODULE_NAME, 'Ritual completed', {
    type: ritualType,
    totalTasks: taskDetails.length,
    completedTasks: taskDetails.filter(t => t.completed).length,
    duration: durationMinutes
  })

  try {
    await kpiStore.finishRitual({
      ritualType,
      department: userDepartment.value,
      completedBy: authStore.userId || undefined,
      completedByName: authStore.userName,
      startedAt:
        kpiStore.ritualStartedAt || new Date(Date.now() - durationMinutes * 60000).toISOString(),
      completedAt: new Date().toISOString(),
      durationMinutes,
      totalTasks: taskDetails.length,
      completedTasks: taskDetails.filter(t => t.completed).length,
      customTasksCompleted: customTasks.filter(t => t.completed).length,
      scheduleTasksCompleted: scheduleTasks.filter(t => t.completed).length,
      taskDetails
    })

    const ritualNames = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' }
    showSnackbar(`${ritualNames[ritualType]} Ritual recorded!`, 'success')
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to record ritual completion', { error: err })
    showSnackbar('Ritual completed but failed to save', 'warning')
  }
}

function showSnackbar(message: string, color: string): void {
  snackbar.value = { show: true, message, color }
}

// =============================================
// RITUAL TIME WINDOWS
// =============================================

let deadlineTimer: ReturnType<typeof setTimeout> | null = null

/** Schedule auto-close at ritual deadline */
function scheduleRitualDeadline(): void {
  if (deadlineTimer) clearTimeout(deadlineTimer)

  // Use Bali time (Asia/Makassar) instead of device clock
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(new Date())
  const h = Number(parts.find(p => p.type === 'hour')?.value || 0)
  const m = Number(parts.find(p => p.type === 'minute')?.value || 0)
  const t = h * 60 + m
  const w = RITUAL_WINDOWS[kpiStore.currentRitualType]
  const end = w.end[0] * 60 + w.end[1]
  const msRemaining = (end - t) * 60 * 1000

  if (msRemaining <= 0) return

  deadlineTimer = setTimeout(() => {
    // Auto-close ritual at deadline if dialog is open
    if (showRitualDialog.value) {
      DebugUtils.info(MODULE_NAME, 'Ritual deadline reached, auto-finishing')
      // Close dialog — the RitualDialog watcher on allDone won't fire if not all done
      // So we need to manually trigger the ritual-completed event with current state
      autoFinishRitualAtDeadline()
    }
  }, msRemaining)

  DebugUtils.info(MODULE_NAME, 'Ritual deadline scheduled', {
    type: kpiStore.currentRitualType,
    minutesRemaining: Math.round(msRemaining / 60000)
  })
}

/** Auto-finish ritual at deadline with current completion % */
async function autoFinishRitualAtDeadline(): Promise<void> {
  showRitualDialog.value = false

  const tasks = ritualTasks.value
  const scheduleTasks = tasks.map(t => ({
    taskId: t.id,
    name: t.preparationName,
    type: 'schedule' as const,
    completed: t.status === 'completed',
    completedAt: t.completedAt || undefined,
    targetQuantity: t.targetQuantity,
    completedQuantity: t.completedQuantity || undefined,
    unit: t.targetUnit,
    quantity: t.completedQuantity || t.targetQuantity
  }))
  const customTaskDetails = kpiStore.currentRitualCustomTasks.map(ct => ({
    taskId: ct.id,
    name: ct.name,
    type: 'custom' as const,
    completed: false, // Can't know custom task state after dialog closed
    completedAt: undefined
  }))
  const allDetails = [...scheduleTasks, ...customTaskDetails]
  const startedAt = kpiStore.ritualStartedAt || new Date().toISOString()
  const duration = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)

  await handleRitualCompleted(kpiStore.currentRitualType, allDetails, duration)
  showSnackbar('Ritual auto-finished at deadline', 'info')
}

/** Check ritual state on mount: restore session or auto-open */
function checkRitualOnMount(): void {
  // Try to restore a session from localStorage
  const session = kpiStore.restoreRitualSession()

  if (session) {
    // Session exists — check if the ritual type matches current window
    // and we're still in the time window
    if (
      session.ritualType === kpiStore.currentRitualType &&
      kpiStore.isInRitualWindow &&
      !kpiStore.currentRitualCompleted
    ) {
      // Still in window and not completed → auto-open
      showRitualDialog.value = true
      scheduleRitualDeadline()
      DebugUtils.info(MODULE_NAME, 'Restored ritual session, auto-opened dialog')
      return
    } else {
      // Window passed, wrong type, or already completed → clear stale session
      DebugUtils.info(MODULE_NAME, 'Clearing stale ritual session', {
        sessionType: session.ritualType,
        currentType: kpiStore.currentRitualType,
        inWindow: kpiStore.isInRitualWindow,
        completed: kpiStore.currentRitualCompleted
      })
      kpiStore.clearRitualSession()
    }
  }

  // No session — check if we should auto-open (only when inside time window)
  if (kpiStore.shouldAutoOpenRitual) {
    showRitualDialog.value = true
    kpiStore.startRitual()
    scheduleRitualDeadline()
    DebugUtils.info(MODULE_NAME, 'Auto-opened ritual', { type: kpiStore.currentRitualType })
  }
}

// Watch for ritual dialog open/close to manage session
watch(showRitualDialog, open => {
  if (open && !kpiStore.ritualStartedAt) {
    kpiStore.startRitual()
    scheduleRitualDeadline()
  }
})

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  await loadData()
  // After data loaded, check ritual state
  checkRitualOnMount()
})

onUnmounted(() => {
  if (deadlineTimer) clearTimeout(deadlineTimer)
})

watch(userDepartment, () => loadData())
</script>

<style scoped lang="scss">
.tasks-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--v-theme-background);
  overflow: hidden;
}

/* Kanban Board */
.kanban-board {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  flex: 1;
  overflow: hidden;
  padding: 10px;
  min-height: 0;

  &.done-collapsed {
    grid-template-columns: 1fr 56px;
  }
}

.kanban-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 12px;
  overflow: hidden;
  height: 100%;

  &.collapsed {
    min-width: 56px;
    max-width: 56px;
  }
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background-color: rgba(0, 0, 0, 0.15);
  border-bottom: 2px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;

  .collapsed & {
    justify-content: center;
    padding: 10px 4px;
  }
}

.column-title {
  font-size: 14px;
  font-weight: 600;
  flex: 1;
}

.expand-btn {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
}

.column-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

/* Scrollable banner & filters inside To Do column */
.scroll-banner {
  border-radius: 8px;
  margin-bottom: 2px;
}

.scroll-filters {
  display: flex;
  align-items: center;
  padding: 2px 0;
  margin-bottom: 2px;
}

.sticky-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background-color: rgba(var(--v-theme-warning), 0.08);
  border-radius: 6px;
  margin-bottom: 4px;
  position: sticky;
  top: 0;
  z-index: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  opacity: 0.5;
}

/* Custom tasks checklist */
.custom-tasks-section {
  background-color: rgba(var(--v-theme-secondary), 0.05);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid rgba(var(--v-theme-secondary), 0.12);
}

.custom-tasks-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 6px;
}

.custom-tasks-title {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.7;
}

.custom-task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background-color: rgba(var(--v-theme-secondary), 0.08);
  }
}

.custom-task-name {
  font-size: 14px;
  font-weight: 500;
}

/* Rating Dialog */
.rating-dialog-card {
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
