<!-- src/views/kitchen/preparation/dialogs/PrepWriteOffDialog.vue -->
<!-- Kitchen Preparation - Preparation Write-Off Dialog -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1100"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>Write Off Preparations</h3>
          <div class="text-body-2 text-medium-emphasis">
            {{ userDepartment === 'kitchen' ? 'Kitchen' : 'Bar' }} Department
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleCancel" />
      </v-card-title>
      <v-divider />

      <!-- Form -->
      <v-card-text class="pa-6">
        <v-form ref="formRef" @submit.prevent="handleSubmit">
          <!-- Write-off Reason -->
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="formData.reason"
                :items="writeOffReasonOptions"
                label="Write-off Reason"
                variant="outlined"
                density="comfortable"
                :rules="[rules.required]"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #prepend>
                      <v-icon
                        :color="item.raw.color"
                        :icon="item.raw.affectsKPI ? 'mdi-alert' : 'mdi-check-circle'"
                      />
                    </template>
                    <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
                    <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
          </v-row>

          <!-- KPI Warning -->
          <v-alert
            v-if="selectedReasonInfo?.affectsKPI"
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            <template #prepend>
              <v-icon icon="mdi-alert-triangle" />
            </template>
            <strong>Affects KPI:</strong>
            This write-off will impact your performance metrics.
          </v-alert>

          <!-- Two-Panel Layout -->
          <div class="writeoff-panels">
            <v-row>
              <!-- Left Panel: Preparation Selector -->
              <v-col cols="12" lg="7">
                <v-card variant="outlined" class="h-100">
                  <v-card-title class="d-flex align-center justify-space-between pa-4">
                    <span>Select Preparations</span>
                    <v-btn
                      size="small"
                      variant="outlined"
                      prepend-icon="mdi-refresh"
                      @click="refreshPreparations"
                    >
                      Refresh
                    </v-btn>
                  </v-card-title>
                  <v-divider />
                  <v-card-text class="pa-4" style="max-height: 450px; overflow-y: auto">
                    <preparation-selector-widget
                      :department="userDepartment"
                      :can-select="true"
                      :multi-select="true"
                      :show-selection-summary="false"
                      @preparation-selected="handlePreparationSelected"
                      @quick-write-off="handleQuickWriteOff"
                    />
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Right Panel: Selected Preparations -->
              <v-col cols="12" lg="5">
                <v-card variant="outlined" class="h-100">
                  <v-card-title class="d-flex align-center justify-space-between pa-4">
                    <span>Selected for Write-off</span>
                    <v-chip size="small" color="primary" variant="tonal">
                      {{ formData.items.length }} item{{ formData.items.length !== 1 ? 's' : '' }}
                    </v-chip>
                  </v-card-title>
                  <v-divider />
                  <v-card-text class="pa-4" style="max-height: 450px; overflow-y: auto">
                    <!-- Empty State -->
                    <div
                      v-if="formData.items.length === 0"
                      class="text-center py-8 text-medium-emphasis"
                    >
                      <v-icon icon="mdi-chef-hat" size="48" class="mb-2" />
                      <div>No preparations selected</div>
                      <div class="text-body-2">Select preparations from the left panel</div>
                    </div>

                    <!-- Selected items list -->
                    <div v-else class="selected-items-list">
                      <v-list class="pa-0" density="compact">
                        <v-list-item
                          v-for="(item, index) in formData.items"
                          :key="`item-${index}`"
                          class="selected-item-row"
                          :class="{ 'mb-1': index < formData.items.length - 1 }"
                        >
                          <v-list-item-title class="preparation-name">
                            {{ getPreparationName(item.preparationId) }}
                          </v-list-item-title>

                          <v-list-item-subtitle class="preparation-details">
                            <div class="d-flex align-center gap-3 text-body-2 mb-1">
                              <span class="quantity-info">
                                <strong>
                                  {{ item.quantity }} {{ getPreparationUnit(item.preparationId) }}
                                </strong>
                              </span>
                              <span class="cost-info text-medium-emphasis">
                                Cost: {{ formatIDR(calculateItemCost(item)) }}
                              </span>
                            </div>
                            <div v-if="item.notes" class="notes-line mt-1">
                              <v-chip
                                size="x-small"
                                variant="outlined"
                                color="info"
                                prepend-icon="mdi-note-text"
                              >
                                {{
                                  item.notes.length > 30
                                    ? item.notes.substring(0, 30) + '...'
                                    : item.notes
                                }}
                              </v-chip>
                            </div>
                          </v-list-item-subtitle>

                          <template #append>
                            <v-btn
                              icon="mdi-delete"
                              variant="text"
                              size="small"
                              color="error"
                              @click="removePreparationRow(index)"
                            />
                          </template>
                        </v-list-item>
                      </v-list>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- General Notes -->
          <v-row class="mt-4">
            <v-col cols="12">
              <v-textarea
                v-model="formData.notes"
                label="General Notes (optional)"
                variant="outlined"
                density="comfortable"
                rows="2"
                placeholder="Additional information about this write-off..."
              />
            </v-col>
          </v-row>

          <!-- Total Cost Summary -->
          <v-card v-if="formData.items.length > 0" variant="tonal" color="error" class="pa-4 mt-4">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-h6 font-weight-bold">Total Write-off Cost</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ formData.items.length }} preparation{{
                    formData.items.length !== 1 ? 's' : ''
                  }}
                </div>
              </div>
              <div class="text-h4 font-weight-bold">
                {{ formatIDR(totalCost) }}
              </div>
            </div>
          </v-card>
        </v-form>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn
          color="error"
          variant="flat"
          :loading="loading"
          :disabled="!isFormValid"
          @click="handleSubmit"
        >
          Write Off Preparations
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePreparationWriteOff, usePreparationStore } from '@/stores/preparation'
import { useAuthStore } from '@/stores/auth'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
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
const kpiStore = useKitchenKpiStore()

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

  try {
    loading.value = true

    DebugUtils.info(MODULE_NAME, 'Submitting preparation write-off', {
      reason: formData.value.reason,
      itemCount: formData.value.items.length,
      totalCost: totalCost.value
    })

    const operation = await preparationWriteOff.writeOffMultiplePreparations(
      formData.value.items.map(item => ({
        preparationId: item.preparationId,
        preparationName: getPreparationName(item.preparationId),
        currentQuantity: getPreparationStock(item.preparationId),
        unit: getPreparationUnit(item.preparationId),
        writeOffQuantity: item.quantity,
        reason: formData.value.reason,
        notes: item.notes
      })),
      userDepartment.value,
      authStore.userName,
      formData.value.reason,
      formData.value.notes
    )

    // Record KPI for each item
    const affectsKpi = selectedReasonInfo.value?.affectsKPI || false
    for (const item of formData.value.items) {
      try {
        await kpiStore.recordWriteoff(
          authStore.userId || 'unknown',
          authStore.userName,
          userDepartment.value,
          {
            itemId: item.preparationId,
            itemName: getPreparationName(item.preparationId),
            itemType: 'preparation',
            quantity: item.quantity,
            unit: getPreparationUnit(item.preparationId),
            value: calculateItemCost(item),
            reason: formData.value.reason,
            affectsKpi,
            timestamp: TimeUtils.getCurrentLocalISO()
          }
        )
      } catch (kpiError) {
        DebugUtils.error(MODULE_NAME, 'Failed to record KPI', { kpiError })
      }
    }

    DebugUtils.info(MODULE_NAME, 'Write-off completed', { operationId: operation.id })

    emit('success', `${formData.value.items.length} preparation(s) written off successfully`)
    handleCancel()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Write-off failed', { error })
    emit('error', error instanceof Error ? error.message : 'Write-off failed')
  } finally {
    loading.value = false
  }
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
.writeoff-panels {
  .v-card {
    min-height: 500px;
  }
}

.selected-items-list {
  .selected-item-row {
    border-radius: 6px;
    margin-bottom: 2px;
    border: 1px solid transparent;
    transition: all 0.2s ease;
    min-height: 56px;

    &:hover {
      background-color: rgba(var(--v-theme-surface-variant), 0.1);
    }

    &.mb-1 {
      border-bottom: 1px solid rgba(var(--v-theme-outline), 0.08);
    }

    .preparation-name {
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 0.9rem;
    }

    .preparation-details {
      .quantity-info {
        min-width: 80px;
        font-size: 0.875rem;
      }

      .cost-info {
        min-width: 90px;
        font-size: 0.875rem;
      }

      .notes-line {
        .v-chip {
          max-width: 200px;
          font-size: 0.75rem;
        }
      }
    }
  }
}

.gap-3 {
  gap: 12px;
}

@media (max-width: 1280px) {
  .writeoff-panels .v-row {
    flex-direction: column;
  }

  .writeoff-panels .v-card {
    min-height: 350px;
  }
}
</style>
