<!-- src/views/kitchen/tasks/RitualSettingsScreen.vue -->
<!-- Ritual settings: preparations, pre-made, custom tasks -->
<template>
  <div class="ritual-settings">
    <!-- Tabs -->
    <v-tabs v-model="activeTab" density="compact" color="primary" class="settings-tabs">
      <v-tab value="preparations">
        <v-icon start size="18">mdi-food-variant</v-icon>
        Preparations
      </v-tab>
      <v-tab value="premade">
        <v-icon start size="18">mdi-fire</v-icon>
        Pre-made
      </v-tab>
      <v-tab value="custom">
        <v-icon start size="18">mdi-checkbox-marked-outline</v-icon>
        Custom Tasks
      </v-tab>
    </v-tabs>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <v-progress-circular indeterminate size="32" />
    </div>

    <!-- ===================== PREPARATIONS TAB ===================== -->
    <!-- All preparations — configure which ones to include in morning/evening ritual -->
    <template v-else-if="activeTab === 'preparations'">
      <v-text-field
        v-model="prepSearch"
        placeholder="Search preparations..."
        variant="outlined"
        density="compact"
        hide-details
        prepend-inner-icon="mdi-magnify"
        clearable
        class="search-field"
      />

      <div class="prep-legend">
        <span class="legend-item">
          <v-icon size="14" color="info">mdi-circle</v-icon>
          Morning
        </span>
        <span class="legend-item">
          <v-icon size="14" color="purple">mdi-circle</v-icon>
          Evening
        </span>
        <span class="legend-item">
          <v-icon size="14" color="grey">mdi-circle-outline</v-icon>
          Off
        </span>
      </div>

      <div class="prep-list">
        <div
          v-for="prep in filteredPreparations"
          :key="prep.id"
          class="prep-row"
          :class="{ 'prep-active': hasSlot(prep) }"
        >
          <div class="prep-info">
            <span class="prep-name">{{ prep.name }}</span>
            <span class="prep-unit">{{ getDisplayUnit(prep) }}</span>
          </div>

          <v-btn-toggle
            :model-value="getSlotValue(prep)"
            density="compact"
            color="primary"
            class="slot-toggle"
            @update:model-value="(val: string | undefined) => handleSlotChange(prep, val)"
          >
            <v-btn value="morning" size="x-small" variant="outlined">
              <v-icon size="14" color="info">mdi-weather-sunny</v-icon>
            </v-btn>
            <v-btn value="evening" size="x-small" variant="outlined">
              <v-icon size="14" color="purple">mdi-weather-night</v-icon>
            </v-btn>
          </v-btn-toggle>

          <template v-if="hasSlot(prep)">
            <v-btn-toggle
              :model-value="prep.targetMode || 'auto'"
              density="compact"
              class="mode-toggle"
              @update:model-value="
                (val: string | undefined) => handleModeChange(prep, val as 'auto' | 'fixed')
              "
            >
              <v-btn value="auto" size="x-small" variant="outlined">Auto</v-btn>
              <v-btn value="fixed" size="x-small" variant="outlined">Fixed</v-btn>
            </v-btn-toggle>

            <span v-if="(prep.targetMode || 'auto') === 'auto'" class="prep-qty auto-qty">
              ~{{ Math.round(prep.avgDailyUsage || 0) }}
            </span>
            <input
              v-else
              :value="prep.dailyTargetQuantity || ''"
              type="number"
              inputmode="numeric"
              class="qty-input"
              placeholder="qty"
              @change="handleFixedQtyChange(prep, $event)"
            />
          </template>
          <span v-else class="prep-qty off-label">--</span>
        </div>

        <div v-if="filteredPreparations.length === 0" class="group-empty">
          No preparations found
        </div>
      </div>
    </template>

    <!-- ===================== PRE-MADE TAB ===================== -->
    <!-- Pre-made: half-cooked items (fried waffles, formed falafel) with short shelf life -->
    <template v-else-if="activeTab === 'premade'">
      <div class="tab-header">
        <p class="tab-description">
          Pre-made items are half-cooked preparations with short shelf life (1 day). They are
          produced during rituals and used first.
        </p>
        <v-btn color="primary" variant="flat" size="small" @click="showAddPremadeDialog = true">
          <v-icon start>mdi-plus</v-icon>
          Add Pre-made
        </v-btn>
      </div>

      <div
        v-if="premadeItems.length === 0"
        class="group-empty"
        style="padding: 32px; text-align: center"
      >
        <v-icon size="48" color="grey" class="mb-2">mdi-fire</v-icon>
        <div>No pre-made items configured</div>
        <div class="text-caption text-medium-emphasis">
          Add preparations that should be half-cooked ahead of time
        </div>
      </div>

      <!-- Morning pre-made -->
      <div v-if="premadeMorning.length > 0" class="task-group">
        <div class="group-header">
          <v-icon color="info" size="20">mdi-weather-sunny</v-icon>
          <h3 class="group-title">Morning</h3>
          <v-badge :content="premadeMorning.length" color="info" inline />
        </div>
        <div v-for="prep in premadeMorning" :key="prep.id" class="prep-row prep-active">
          <div class="prep-info">
            <span class="prep-name">{{ prep.name }}</span>
            <span class="prep-unit">{{ getDisplayUnit(prep) }}</span>
          </div>
          <v-btn-toggle
            :model-value="prep.targetMode || 'auto'"
            density="compact"
            class="mode-toggle"
            @update:model-value="
              (val: string | undefined) => handleModeChange(prep, val as 'auto' | 'fixed')
            "
          >
            <v-btn value="auto" size="x-small" variant="outlined">Auto</v-btn>
            <v-btn value="fixed" size="x-small" variant="outlined">Fixed</v-btn>
          </v-btn-toggle>
          <span v-if="(prep.targetMode || 'auto') === 'auto'" class="prep-qty auto-qty">
            ~{{ Math.round(prep.avgDailyUsage || 0) }}
          </span>
          <input
            v-else
            :value="prep.dailyTargetQuantity || ''"
            type="number"
            inputmode="numeric"
            class="qty-input"
            placeholder="qty"
            @change="handleFixedQtyChange(prep, $event)"
          />
          <v-btn icon size="x-small" variant="text" color="error" @click="removePremade(prep)">
            <v-icon size="18">mdi-close</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Evening pre-made -->
      <div v-if="premadeEvening.length > 0" class="task-group">
        <div class="group-header">
          <v-icon color="purple" size="20">mdi-weather-night</v-icon>
          <h3 class="group-title">Evening</h3>
          <v-badge :content="premadeEvening.length" color="purple" inline />
        </div>
        <div v-for="prep in premadeEvening" :key="prep.id" class="prep-row prep-active">
          <div class="prep-info">
            <span class="prep-name">{{ prep.name }}</span>
            <span class="prep-unit">{{ getDisplayUnit(prep) }}</span>
          </div>
          <v-btn-toggle
            :model-value="prep.targetMode || 'auto'"
            density="compact"
            class="mode-toggle"
            @update:model-value="
              (val: string | undefined) => handleModeChange(prep, val as 'auto' | 'fixed')
            "
          >
            <v-btn value="auto" size="x-small" variant="outlined">Auto</v-btn>
            <v-btn value="fixed" size="x-small" variant="outlined">Fixed</v-btn>
          </v-btn-toggle>
          <span v-if="(prep.targetMode || 'auto') === 'auto'" class="prep-qty auto-qty">
            ~{{ Math.round(prep.avgDailyUsage || 0) }}
          </span>
          <input
            v-else
            :value="prep.dailyTargetQuantity || ''"
            type="number"
            inputmode="numeric"
            class="qty-input"
            placeholder="qty"
            @change="handleFixedQtyChange(prep, $event)"
          />
          <v-btn icon size="x-small" variant="text" color="error" @click="removePremade(prep)">
            <v-icon size="18">mdi-close</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Add Pre-made Dialog -->
      <v-dialog v-model="showAddPremadeDialog" max-width="440">
        <v-card>
          <v-card-title>Add Pre-made Item</v-card-title>
          <v-card-text>
            <v-select
              v-model="addPremadeForm.preparationId"
              :items="availableForPremade"
              item-title="name"
              item-value="id"
              label="Preparation"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-select
              v-model="addPremadeForm.slot"
              :items="[
                { title: 'Morning', value: 'morning' },
                { title: 'Evening', value: 'evening' }
              ]"
              label="Ritual"
              variant="outlined"
              density="compact"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showAddPremadeDialog = false">Cancel</v-btn>
            <v-btn
              color="primary"
              variant="flat"
              :disabled="!addPremadeForm.preparationId"
              :loading="saving"
              @click="handleAddPremade"
            >
              Add
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>

    <!-- ===================== CUSTOM TASKS TAB ===================== -->
    <template v-else-if="activeTab === 'custom'">
      <div class="tab-header">
        <p class="tab-description">
          Custom checklist tasks for morning/evening rituals (clean fridge, check expiry, etc.)
        </p>
        <v-btn color="primary" variant="flat" size="small" @click="openAddDialog">
          <v-icon start>mdi-plus</v-icon>
          Add Task
        </v-btn>
      </div>

      <!-- Morning Tasks -->
      <div class="task-group">
        <div class="group-header">
          <v-icon color="info" size="20">mdi-weather-sunny</v-icon>
          <h3 class="group-title">Morning Ritual</h3>
          <v-badge :content="morningTasks.length || '0'" color="info" inline />
        </div>
        <div v-if="morningTasks.length === 0" class="group-empty">No morning tasks configured</div>
        <div v-for="task in morningTasks" :key="task.id" class="task-row">
          <v-switch
            :model-value="task.isActive"
            density="compact"
            hide-details
            color="success"
            class="task-switch"
            @update:model-value="toggleActive(task)"
          />
          <span class="task-name" :class="{ 'text-medium-emphasis': !task.isActive }">
            {{ task.name }}
          </span>
          <v-spacer />
          <v-btn icon size="x-small" variant="text" @click="openEditDialog(task)">
            <v-icon size="18">mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="x-small" variant="text" color="error" @click="confirmDelete(task)">
            <v-icon size="18">mdi-delete</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Afternoon Tasks -->
      <div class="task-group">
        <div class="group-header">
          <v-icon color="warning" size="20">mdi-weather-partly-cloudy</v-icon>
          <h3 class="group-title">Afternoon Ritual</h3>
          <v-badge :content="afternoonTasks.length || '0'" color="warning" inline />
        </div>
        <div v-if="afternoonTasks.length === 0" class="group-empty">
          No afternoon tasks configured
        </div>
        <div v-for="task in afternoonTasks" :key="task.id" class="task-row">
          <v-switch
            :model-value="task.isActive"
            density="compact"
            hide-details
            color="success"
            class="task-switch"
            @update:model-value="toggleActive(task)"
          />
          <span class="task-name" :class="{ 'text-medium-emphasis': !task.isActive }">
            {{ task.name }}
          </span>
          <v-spacer />
          <v-btn icon size="x-small" variant="text" @click="openEditDialog(task)">
            <v-icon size="18">mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="x-small" variant="text" color="error" @click="confirmDelete(task)">
            <v-icon size="18">mdi-delete</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Evening Tasks -->
      <div class="task-group">
        <div class="group-header">
          <v-icon color="purple" size="20">mdi-weather-night</v-icon>
          <h3 class="group-title">Evening Ritual</h3>
          <v-badge :content="eveningTasks.length || '0'" color="purple" inline />
        </div>
        <div v-if="eveningTasks.length === 0" class="group-empty">No evening tasks configured</div>
        <div v-for="task in eveningTasks" :key="task.id" class="task-row">
          <v-switch
            :model-value="task.isActive"
            density="compact"
            hide-details
            color="success"
            class="task-switch"
            @update:model-value="toggleActive(task)"
          />
          <span class="task-name" :class="{ 'text-medium-emphasis': !task.isActive }">
            {{ task.name }}
          </span>
          <v-spacer />
          <v-btn icon size="x-small" variant="text" @click="openEditDialog(task)">
            <v-icon size="18">mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="x-small" variant="text" color="error" @click="confirmDelete(task)">
            <v-icon size="18">mdi-delete</v-icon>
          </v-btn>
        </div>
      </div>
    </template>

    <!-- Add/Edit Custom Task Dialog -->
    <v-dialog v-model="showDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>{{ editingTask ? 'Edit Task' : 'Add Task' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.name"
            label="Task Name"
            placeholder="e.g. Clean fridge, Check expiry dates"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-select
            v-model="form.ritualType"
            :items="[
              { title: 'Morning', value: 'morning' },
              { title: 'Afternoon', value: 'afternoon' },
              { title: 'Evening', value: 'evening' }
            ]"
            label="Ritual Type"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="!form.name.trim()"
            @click="saveTask"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Custom Task Confirmation -->
    <v-dialog v-model="showDeleteDialog" max-width="360">
      <v-card>
        <v-card-title>Delete Task?</v-card-title>
        <v-card-text>Are you sure you want to delete "{{ deletingTask?.name }}"?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="saving" @click="handleDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="2000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { useRecipesStore } from '@/stores/recipes'
import { DebugUtils } from '@/utils'
import type { RitualCustomTask, RitualType } from '@/stores/kitchenKpi/types'
import type { Preparation } from '@/stores/recipes/types'

const MODULE_NAME = 'RitualSettingsScreen'

const kpiStore = useKitchenKpiStore()
const recipesStore = useRecipesStore()

const activeTab = ref('preparations')
const loading = ref(false)
const saving = ref(false)
const prepSearch = ref('')

// Custom task state
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingTask = ref<RitualCustomTask | null>(null)
const deletingTask = ref<RitualCustomTask | null>(null)
const snackbar = ref({ show: false, message: '', color: 'success' })
const form = ref({ name: '', ritualType: 'morning' as RitualType })

// Pre-made state
const showAddPremadeDialog = ref(false)
const addPremadeForm = ref({ preparationId: '', slot: 'morning' as string })

// =============================================
// SHARED HELPERS
// =============================================

function getDisplayUnit(prep: Preparation): string {
  const map: Record<string, string> = { ml: 'ml', piece: 'pc', portion: 'pc' }
  return map[prep.outputUnit] || 'g'
}

function hasSlot(prep: Preparation): boolean {
  return !!prep.productionSlot && prep.productionSlot !== 'any'
}

function getSlotValue(prep: Preparation): string | undefined {
  if (prep.productionSlot === 'morning') return 'morning'
  if (prep.productionSlot === 'evening') return 'evening'
  return undefined
}

/** Update preparation via store (handles supabase + local state) */
async function updatePrep(prepId: string, updates: Partial<Preparation>): Promise<void> {
  try {
    await recipesStore.updatePreparation(prepId, updates)
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to update preparation', { err })
    snackbar.value = { show: true, message: 'Failed to save', color: 'error' }
  }
}

async function handleModeChange(prep: Preparation, val: 'auto' | 'fixed'): Promise<void> {
  await updatePrep(prep.id, { targetMode: val })
}

async function handleFixedQtyChange(prep: Preparation, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const qty = Math.max(0, Number(input.value) || 0)
  await updatePrep(prep.id, { dailyTargetQuantity: qty })
  snackbar.value = {
    show: true,
    message: `${prep.name}: ${qty} ${getDisplayUnit(prep)}/day`,
    color: 'success'
  }
}

// =============================================
// PREPARATIONS TAB
// =============================================

/** All non-premade preparations for ritual slot assignment */
const allPreparations = computed(() =>
  (recipesStore.preparations || [])
    .filter(p => p.status !== 'archived' && !p.isPremade)
    .sort((a, b) => {
      const aSlot = hasSlot(a) ? 0 : 1
      const bSlot = hasSlot(b) ? 0 : 1
      if (aSlot !== bSlot) return aSlot - bSlot
      return a.name.localeCompare(b.name)
    })
)

const filteredPreparations = computed(() => {
  if (!prepSearch.value) return allPreparations.value
  const q = prepSearch.value.toLowerCase()
  return allPreparations.value.filter(p => p.name.toLowerCase().includes(q))
})

async function handleSlotChange(prep: Preparation, val: string | undefined): Promise<void> {
  const slot = (val || undefined) as Preparation['productionSlot']
  await updatePrep(prep.id, { productionSlot: slot })
  snackbar.value = {
    show: true,
    message: slot ? `${prep.name} → ${slot}` : `${prep.name} removed from ritual`,
    color: 'success'
  }
}

// =============================================
// PRE-MADE TAB
// =============================================

/** All items marked as pre-made */
const premadeItems = computed(() =>
  (recipesStore.preparations || []).filter(p => p.isPremade && p.status !== 'archived')
)

const premadeMorning = computed(() =>
  premadeItems.value.filter(p => p.productionSlot === 'morning')
)

const premadeEvening = computed(() =>
  premadeItems.value.filter(p => p.productionSlot === 'evening')
)

/** Preparations available to add as pre-made (not already pre-made) */
const availableForPremade = computed(() =>
  (recipesStore.preparations || [])
    .filter(p => !p.isPremade && p.status !== 'archived')
    .sort((a, b) => a.name.localeCompare(b.name))
)

async function handleAddPremade(): Promise<void> {
  if (!addPremadeForm.value.preparationId) return
  saving.value = true
  try {
    await updatePrep(addPremadeForm.value.preparationId, {
      isPremade: true,
      productionSlot: addPremadeForm.value.slot as Preparation['productionSlot'],
      targetMode: 'auto'
    })
    snackbar.value = { show: true, message: 'Pre-made item added', color: 'success' }
    showAddPremadeDialog.value = false
    addPremadeForm.value = { preparationId: '', slot: 'morning' }
  } catch {
    snackbar.value = { show: true, message: 'Failed to add', color: 'error' }
  } finally {
    saving.value = false
  }
}

async function removePremade(prep: Preparation): Promise<void> {
  await updatePrep(prep.id, {
    isPremade: false,
    productionSlot: undefined
  })
  snackbar.value = { show: true, message: `${prep.name} removed from pre-made`, color: 'success' }
}

// =============================================
// CUSTOM TASKS TAB
// =============================================

const morningTasks = computed(() => kpiStore.customTasks.filter(t => t.ritualType === 'morning'))

const afternoonTasks = computed(() =>
  kpiStore.customTasks.filter(t => t.ritualType === 'afternoon')
)

const eveningTasks = computed(() => kpiStore.customTasks.filter(t => t.ritualType === 'evening'))

function openAddDialog(): void {
  editingTask.value = null
  form.value = { name: '', ritualType: 'morning' }
  showDialog.value = true
}

function openEditDialog(task: RitualCustomTask): void {
  editingTask.value = task
  form.value = { name: task.name, ritualType: task.ritualType }
  showDialog.value = true
}

async function saveTask(): Promise<void> {
  if (!form.value.name.trim()) return
  saving.value = true
  try {
    if (editingTask.value) {
      await kpiStore.updateCustomTask(editingTask.value.id, {
        name: form.value.name.trim(),
        ritualType: form.value.ritualType
      })
      snackbar.value = { show: true, message: 'Task updated', color: 'success' }
    } else {
      await kpiStore.createCustomTask({
        name: form.value.name.trim(),
        ritualType: form.value.ritualType
      })
      snackbar.value = { show: true, message: 'Task created', color: 'success' }
    }
    showDialog.value = false
  } catch {
    snackbar.value = { show: true, message: 'Failed to save', color: 'error' }
  } finally {
    saving.value = false
  }
}

async function toggleActive(task: RitualCustomTask): Promise<void> {
  try {
    await kpiStore.updateCustomTask(task.id, { isActive: !task.isActive })
  } catch {
    snackbar.value = { show: true, message: 'Failed to update', color: 'error' }
  }
}

function confirmDelete(task: RitualCustomTask): void {
  deletingTask.value = task
  showDeleteDialog.value = true
}

async function handleDelete(): Promise<void> {
  if (!deletingTask.value) return
  saving.value = true
  try {
    await kpiStore.deleteCustomTask(deletingTask.value.id)
    snackbar.value = { show: true, message: 'Task deleted', color: 'success' }
    showDeleteDialog.value = false
  } catch {
    snackbar.value = { show: true, message: 'Failed to delete', color: 'error' }
  } finally {
    saving.value = false
  }
}

// =============================================
// LIFECYCLE
// =============================================

async function loadData(): Promise<void> {
  loading.value = true
  try {
    await Promise.all([
      kpiStore.loadAllCustomTasks(),
      recipesStore.initialized || recipesStore.initialize()
    ])
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>

<style scoped lang="scss">
.ritual-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  height: 100%;
  overflow-y: auto;
}

.settings-tabs {
  flex-shrink: 0;
}

.tab-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.tab-description {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  line-height: 1.4;
  flex: 1;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.search-field {
  flex-shrink: 0;
}

/* Legend */
.prep-legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  padding: 0 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Preparations / Pre-made List */
.prep-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prep-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background-color: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 8px;
  min-height: 44px;

  &.prep-active {
    background-color: rgba(var(--v-theme-primary), 0.04);
  }
}

.prep-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.prep-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prep-unit {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  flex-shrink: 0;
}

.slot-toggle,
.mode-toggle {
  flex-shrink: 0;
}

.prep-qty {
  font-size: 14px;
  font-weight: 600;
  min-width: 48px;
  text-align: right;
  flex-shrink: 0;
}

.auto-qty {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.off-label {
  color: rgba(var(--v-theme-on-surface), 0.2);
}

.qty-input {
  width: 56px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  background-color: rgba(var(--v-theme-on-surface), 0.06);
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  outline: none;
  color: inherit;
  flex-shrink: 0;
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    background-color: rgba(var(--v-theme-primary), 0.08);
  }
}

/* Custom Tasks */
.task-group {
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 12px;
  padding: 12px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.group-title {
  font-size: 15px;
  font-weight: 600;
  flex: 1;
}

.group-empty {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  padding: 8px 4px;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  min-height: 44px;
}

.task-switch {
  flex-shrink: 0;
}

.task-name {
  font-size: 14px;
  font-weight: 500;
}
</style>
