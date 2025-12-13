<!-- src/views/kitchen/preparation/dialogs/PrepWriteOffDialog.vue -->
<!-- Kitchen Preparation - Preparation Write-Off Dialog (Horizontal Tablet Layout) -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1200"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="dialog-card">
      <!-- Compact Header with Reason Selector -->
      <v-card-title class="dialog-header pa-3">
        <div class="d-flex align-center justify-space-between w-100">
          <div class="d-flex align-center gap-4 flex-grow-1">
            <div>
              <h3 class="text-h6">Write Off Preparations</h3>
              <div class="text-caption text-medium-emphasis">
                {{ userDepartment === 'kitchen' ? 'Kitchen' : 'Bar' }}
              </div>
            </div>
            <!-- Reason Selector inline in header -->
            <v-select
              v-model="formData.reason"
              :items="writeOffReasonOptions"
              label="Reason"
              variant="outlined"
              density="compact"
              class="reason-select"
              hide-details
              :rules="[rules.required]"
            >
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps" :title="undefined" :subtitle="undefined">
                  <template #prepend>
                    <v-icon
                      :color="item.raw.color"
                      :icon="item.raw.affectsKPI ? 'mdi-alert' : 'mdi-check-circle'"
                      size="small"
                    />
                  </template>
                  <v-list-item-title class="text-body-2">{{ item.raw.title }}</v-list-item-title>
                </v-list-item>
              </template>
            </v-select>
            <!-- KPI Warning inline -->
            <v-chip
              v-if="selectedReasonInfo?.affectsKPI"
              color="warning"
              size="small"
              prepend-icon="mdi-alert"
            >
              Affects KPI
            </v-chip>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="handleCancel" />
        </div>
      </v-card-title>
      <v-divider />

      <!-- Main Content: Horizontal Two-Panel Layout -->
      <v-card-text class="pa-3 dialog-content">
        <v-form ref="formRef" @submit.prevent="handleSubmit">
          <div class="d-flex gap-3 panels-container">
            <!-- Left Panel: Preparation Selector -->
            <v-card variant="outlined" class="flex-grow-1 panel-card">
              <v-card-title class="d-flex align-center justify-space-between pa-2 py-1">
                <span class="text-body-1 font-weight-medium">Select Preparations</span>
                <v-btn
                  size="x-small"
                  variant="text"
                  icon="mdi-refresh"
                  @click="refreshPreparations"
                />
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-2 panel-scroll">
                <preparation-selector-widget
                  :department="userDepartment"
                  :can-select="true"
                  :multi-select="true"
                  :show-selection-summary="false"
                  compact
                  @preparation-selected="handlePreparationSelected"
                  @quick-write-off="handleQuickWriteOff"
                />
              </v-card-text>
            </v-card>

            <!-- Right Panel: Selected Preparations -->
            <v-card variant="outlined" class="selected-panel panel-card">
              <v-card-title class="d-flex align-center justify-space-between pa-2 py-1">
                <span class="text-body-1 font-weight-medium">Selected</span>
                <v-chip size="x-small" color="primary" variant="tonal">
                  {{ formData.items.length }}
                </v-chip>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-2 panel-scroll">
                <!-- Empty State -->
                <div
                  v-if="formData.items.length === 0"
                  class="text-center py-4 text-medium-emphasis"
                >
                  <v-icon icon="mdi-chef-hat" size="32" class="mb-1" />
                  <div class="text-caption">No preparations selected</div>
                </div>

                <!-- Selected items list -->
                <div v-else class="selected-items-list">
                  <div
                    v-for="(item, index) in formData.items"
                    :key="`item-${index}`"
                    class="selected-item-row d-flex align-center justify-space-between py-1"
                  >
                    <div class="flex-grow-1">
                      <div class="text-body-2 font-weight-medium text-truncate">
                        {{ getPreparationName(item.preparationId) }}
                      </div>
                      <div class="d-flex align-center gap-2 text-caption text-medium-emphasis">
                        <span>
                          {{ item.quantity }} {{ getPreparationUnit(item.preparationId) }}
                        </span>
                        <span>{{ formatIDR(calculateItemCost(item)) }}</span>
                      </div>
                    </div>
                    <v-btn
                      icon="mdi-close"
                      variant="text"
                      size="x-small"
                      color="error"
                      @click="removePreparationRow(index)"
                    />
                  </div>
                </div>
              </v-card-text>

              <!-- Total Cost at bottom of selected panel -->
              <v-divider v-if="formData.items.length > 0" />
              <div v-if="formData.items.length > 0" class="pa-2 bg-error-lighten-5">
                <div class="d-flex align-center justify-space-between">
                  <span class="text-body-2 font-weight-medium">Total Cost</span>
                  <span class="text-subtitle-1 font-weight-bold text-error">
                    {{ formatIDR(totalCost) }}
                  </span>
                </div>
              </div>
            </v-card>
          </div>
        </v-form>
      </v-card-text>

      <!-- Compact Actions -->
      <v-divider />
      <v-card-actions class="pa-3 dialog-actions">
        <v-text-field
          v-model="formData.notes"
          placeholder="Notes (optional)"
          variant="outlined"
          density="compact"
          hide-details
          class="notes-input"
          prepend-inner-icon="mdi-note-text"
        />
        <v-spacer />
        <v-btn variant="text" size="small" @click="handleCancel">Cancel</v-btn>
        <v-btn
          color="error"
          variant="flat"
          size="small"
          :loading="loading"
          :disabled="!isFormValid"
          @click="handleSubmit"
        >
          Write Off ({{ formData.items.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePreparationWriteOff, usePreparationStore } from '@/stores/preparation'
import { useAuthStore } from '@/stores/auth'
import { formatIDR } from '@/utils/currency'
import { DebugUtils, TimeUtils } from '@/utils'
import PreparationSelectorWidget from '@/views/Preparation/components/writeoff/PreparationSelectorWidget.vue'
import type { PreparationWriteOffReason, PreparationDepartment } from '@/stores/preparation/types'

const MODULE_NAME = 'PrepWriteOffDialog'

interface WriteOffFormData {
  reason: PreparationWriteOffReason
  items: Array<{
    preparationId: string
    quantity: number
    notes: string
  }>
  notes: string
}

interface Props {
  modelValue: boolean
  preselectedPreparationId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  preselectedPreparationId: null
})

const emit = defineEmits<{
  'update:modelValue': [boolean]
  success: [message: string]
  error: [error: string]
}>()

// Stores & Composables
const preparationWriteOff = usePreparationWriteOff()
const preparationStore = usePreparationStore()
const authStore = useAuthStore()

// Background tasks (non-blocking processing)
import { useBackgroundTasks } from '@/core/background'
const { addPrepWriteOffTask } = useBackgroundTasks()

// Refs
const formRef = ref()
const loading = ref(false)

// Form data
const formData = ref<WriteOffFormData>({
  reason: 'other',
  items: [],
  notes: ''
})

// Computed
const userDepartment = computed<PreparationDepartment>(() => {
  const roles = authStore.userRoles
  if (roles.includes('bar') && !roles.includes('kitchen')) {
    return 'bar'
  }
  return 'kitchen'
})

const writeOffReasonOptions = computed(() => preparationWriteOff.writeOffReasonOptions.value)

const selectedReasonInfo = computed(() => {
  return preparationWriteOff.getReasonInfo(formData.value.reason)
})

const totalCost = computed(() => {
  return formData.value.items.reduce((sum, item) => sum + calculateItemCost(item), 0)
})

const isFormValid = computed(() => {
  return (
    formData.value.reason &&
    formData.value.items.length > 0 &&
    formData.value.items.every(item => item.preparationId && item.quantity > 0)
  )
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'This field is required'
}

// Methods
function handlePreparationSelected(preparation: any) {
  const existingIndex = formData.value.items.findIndex(
    item => item.preparationId === preparation.id
  )

  if (existingIndex === -1) {
    const stock = getPreparationStock(preparation.id)
    formData.value.items.push({
      preparationId: preparation.id,
      quantity: Math.min(1, stock),
      notes: ''
    })

    DebugUtils.info(MODULE_NAME, 'Preparation added', {
      preparationId: preparation.id,
      name: getPreparationName(preparation.id)
    })
  }
}

function handleQuickWriteOff(preparation: any, quantity: number, notes: string) {
  const existingIndex = formData.value.items.findIndex(
    item => item.preparationId === preparation.id
  )

  if (existingIndex !== -1) {
    formData.value.items[existingIndex].quantity = quantity
    formData.value.items[existingIndex].notes = notes
  } else {
    formData.value.items.push({
      preparationId: preparation.id,
      quantity: quantity,
      notes: notes
    })
  }
}

function removePreparationRow(index: number) {
  formData.value.items.splice(index, 1)
}

function refreshPreparations() {
  preparationStore.fetchBalances(userDepartment.value)
}

function getPreparationStock(preparationId: string): number {
  const balance = preparationStore.getBalance(preparationId, userDepartment.value)
  return balance?.totalQuantity || 0
}

function getPreparationUnit(preparationId: string): string {
  return preparationStore.getPreparationUnit(preparationId)
}

function getPreparationName(preparationId: string): string {
  return preparationStore.getPreparationName(preparationId)
}

function calculateItemCost(item: { preparationId: string; quantity: number }): number {
  if (!item.preparationId || !item.quantity) return 0
  return preparationWriteOff.calculateWriteOffCost(
    item.preparationId,
    item.quantity,
    userDepartment.value
  )
}

async function handleSubmit() {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  DebugUtils.info(MODULE_NAME, 'Queueing preparation write-off task (background)', {
    reason: formData.value.reason,
    itemCount: formData.value.items.length,
    totalCost: totalCost.value
  })

  // Prepare data before closing dialog
  const affectsKpi = selectedReasonInfo.value?.affectsKPI || false
  const items = formData.value.items.map(item => ({
    preparationId: item.preparationId,
    preparationName: getPreparationName(item.preparationId),
    quantity: item.quantity,
    unit: getPreparationUnit(item.preparationId)
  }))

  // Queue background task (non-blocking)
  addPrepWriteOffTask(
    {
      items,
      department: userDepartment.value,
      responsiblePerson: authStore.userName,
      reason: formData.value.reason,
      notes: formData.value.notes,
      kpiData: {
        userId: authStore.userId || 'unknown',
        userName: authStore.userName,
        affectsKpi
      }
    },
    {
      onSuccess: message => {
        emit('success', message)
      },
      onError: message => {
        emit('error', message)
      }
    }
  )

  // Close dialog immediately (operations continue in background)
  const itemCount = formData.value.items.length
  emit('success', `Processing write-off of ${itemCount} preparation(s)...`)
  handleCancel()
}

function handleCancel() {
  formData.value = {
    reason: 'other',
    items: [],
    notes: ''
  }
  formRef.value?.resetValidation()
  emit('update:modelValue', false)
}

// Watch for preselected preparation
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen && props.preselectedPreparationId) {
      const stock = getPreparationStock(props.preselectedPreparationId)
      formData.value.items = [
        {
          preparationId: props.preselectedPreparationId,
          quantity: Math.min(1, stock),
          notes: ''
        }
      ]
    }
  }
)

onMounted(() => {
  if (props.preselectedPreparationId) {
    const stock = getPreparationStock(props.preselectedPreparationId)
    formData.value.items = [
      {
        preparationId: props.preselectedPreparationId,
        quantity: Math.min(1, stock),
        notes: ''
      }
    ]
  }
})
</script>

<style scoped lang="scss">
// Horizontal tablet-optimized layout
.dialog-card {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.dialog-header {
  flex-shrink: 0;
}

.dialog-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.dialog-actions {
  flex-shrink: 0;
}

.reason-select {
  max-width: 200px;
  min-width: 150px;
}

.notes-input {
  max-width: 300px;
}

.panels-container {
  height: 100%;
  min-height: 280px;
  max-height: 50vh;
}

.panel-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  max-height: 280px;
}

.selected-panel {
  min-width: 280px;
  max-width: 320px;
}

.selected-items-list {
  .selected-item-row {
    border-radius: 4px;
    padding: 4px 8px;
    margin-bottom: 2px;

    &:hover {
      background-color: rgba(var(--v-theme-surface-variant), 0.1);
    }

    &:not(:last-child) {
      border-bottom: 1px solid rgba(var(--v-theme-outline), 0.08);
    }
  }
}

.bg-error-lighten-5 {
  background-color: rgba(var(--v-theme-error), 0.08);
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.gap-4 {
  gap: 16px;
}

.w-100 {
  width: 100%;
}
</style>
