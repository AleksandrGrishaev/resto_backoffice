<!-- src/views/pos/components/EndShiftDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="700"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon icon="mdi-stop-circle" color="warning" class="me-3" />
          <span>Завершить смену</span>
        </div>

        <v-chip v-if="shiftReport" color="info" size="small">
          Смена {{ formatShiftDuration(shiftReport.startTime) }}
        </v-chip>
      </v-card-title>

      <v-divider />

      <!-- Shift Report -->
      <v-card-text v-if="shiftReport" class="pa-4">
        <!-- Shift Info -->
        <div class="shift-info mb-4">
          <v-row>
            <v-col cols="6">
              <div class="info-item">
                <div class="text-caption text-medium-emphasis">Кассир</div>
                <div class="text-body-1 font-weight-bold">{{ shiftReport.cashierName }}</div>
              </div>
            </v-col>
            <v-col cols="6">
              <div class="info-item">
                <div class="text-caption text-medium-emphasis">Время работы</div>
                <div class="text-body-1 font-weight-bold">
                  {{ formatShiftDuration(shiftReport.startTime) }}
                </div>
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Sales Summary -->
        <div class="sales-summary mb-4">
          <div class="text-subtitle-1 mb-3 d-flex align-center">
            <v-icon icon="mdi-chart-line" class="me-2" />
            Продажи за смену
          </div>

          <v-row>
            <v-col cols="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h4 font-weight-bold text-primary">
                  {{ shiftReport.totalOrders }}
                </div>
                <div class="text-caption text-medium-emphasis">Заказов</div>
              </v-card>
            </v-col>

            <v-col cols="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h4 font-weight-bold text-success">
                  ₽{{ shiftReport.totalAmount.toFixed(0) }}
                </div>
                <div class="text-caption text-medium-emphasis">Выручка</div>
              </v-card>
            </v-col>

            <v-col cols="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h4 font-weight-bold text-info">
                  ₽{{ (shiftReport.totalAmount / Math.max(shiftReport.totalOrders, 1)).toFixed(0) }}
                </div>
                <div class="text-caption text-medium-emphasis">Средний чек</div>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Payment Methods Breakdown -->
        <div class="payment-breakdown mb-4">
          <div class="text-subtitle-1 mb-3 d-flex align-center">
            <v-icon icon="mdi-cash-multiple" class="me-2" />
            Способы оплаты
          </div>

          <v-row>
            <v-col cols="4">
              <div class="payment-method-item">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-cash" class="me-2" size="20" />
                    <span>Наличные</span>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-bold">
                      ₽{{ shiftReport.paymentBreakdown.cash.amount.toFixed(0) }}
                    </div>
                    <div class="text-caption">
                      {{ shiftReport.paymentBreakdown.cash.count }} операций
                    </div>
                  </div>
                </div>
              </div>
            </v-col>

            <v-col cols="4">
              <div class="payment-method-item">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-credit-card" class="me-2" size="20" />
                    <span>Карта</span>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-bold">
                      ₽{{ shiftReport.paymentBreakdown.card.amount.toFixed(0) }}
                    </div>
                    <div class="text-caption">
                      {{ shiftReport.paymentBreakdown.card.count }} операций
                    </div>
                  </div>
                </div>
              </div>
            </v-col>

            <v-col cols="4">
              <div class="payment-method-item">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-qrcode" class="me-2" size="20" />
                    <span>QR-код</span>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-bold">
                      ₽{{ shiftReport.paymentBreakdown.qr.amount.toFixed(0) }}
                    </div>
                    <div class="text-caption">
                      {{ shiftReport.paymentBreakdown.qr.count }} операций
                    </div>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Cash Count -->
        <div class="cash-count mb-4">
          <div class="text-subtitle-1 mb-3 d-flex align-center">
            <v-icon icon="mdi-calculator" class="me-2" />
            Подсчет наличных
          </div>

          <v-alert color="info" variant="tonal" class="mb-3">
            <div class="text-body-2">
              Ожидаемая сумма в кассе:
              <strong>₽{{ expectedCash.toFixed(2) }}</strong>
            </div>
            <div class="text-caption mt-1">Начальная сумма + наличные продажи - выдачи</div>
          </v-alert>

          <v-text-field
            v-model.number="form.actualCash"
            label="Фактическая сумма в кассе"
            variant="outlined"
            type="number"
            min="0"
            step="10"
            prefix="₽"
            :rules="[rules.required, rules.nonNegative]"
            prepend-inner-icon="mdi-cash"
            hint="Пересчитайте наличные в кассе"
            persistent-hint
          />

          <div v-if="cashDifference !== 0" class="mt-2">
            <v-alert :color="cashDifference > 0 ? 'success' : 'error'" variant="tonal">
              <div class="d-flex align-center">
                <v-icon
                  :icon="cashDifference > 0 ? 'mdi-plus-circle' : 'mdi-minus-circle'"
                  class="me-2"
                />
                <span>
                  {{ cashDifference > 0 ? 'Излишек' : 'Недостача' }}:
                  <strong>₽{{ Math.abs(cashDifference).toFixed(2) }}</strong>
                </span>
              </div>
            </v-alert>
          </div>
        </div>

        <!-- Notes -->
        <div class="shift-notes">
          <div class="text-subtitle-1 mb-3 d-flex align-center">
            <v-icon icon="mdi-note-text" class="me-2" />
            Примечания к смене
          </div>

          <v-textarea
            v-model="form.notes"
            label="Комментарии о работе смены"
            variant="outlined"
            rows="3"
            placeholder="Особенности работы, проблемы, важные события..."
          />
        </div>
      </v-card-text>

      <!-- Loading State -->
      <v-card-text v-else class="pa-8 text-center">
        <v-progress-circular indeterminate class="mb-4" />
        <div>Формирование отчета смены...</div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="loading" @click="closeDialog">Отмена</v-btn>

        <v-spacer />

        <v-btn
          color="info"
          variant="outlined"
          :disabled="!shiftReport || loading"
          class="me-2"
          @click="printReport"
        >
          <v-icon start>mdi-printer</v-icon>
          Печать отчета
        </v-btn>

        <v-btn
          color="warning"
          size="large"
          :loading="loading"
          :disabled="!shiftReport || !formValid"
          @click="endShift"
        >
          <v-icon start>mdi-stop</v-icon>
          Завершить смену
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/pos'
import type { ShiftReport } from '@/stores/pos/types'

// Props
interface Props {
  modelValue: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  ended: [report: ShiftReport]
}>()

// Stores
const posStore = usePosStore()

// State
const dialog = ref(props.modelValue)
const loading = ref(false)
const formValid = ref(true)

const form = ref({
  actualCash: 0,
  notes: ''
})

// Computed
const shiftReport = computed(() => posStore.currentShiftReport)

const expectedCash = computed(() => {
  if (!shiftReport.value) return 0

  // Начальная сумма + наличные продажи
  const startingCash = posStore.currentShift?.startingCash || 0
  const cashSales = shiftReport.value.paymentBreakdown.cash.amount

  return startingCash + cashSales
})

const cashDifference = computed(() => {
  return form.value.actualCash - expectedCash.value
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'Поле обязательно для заполнения',
  nonNegative: (value: number) => value >= 0 || 'Значение не может быть отрицательным'
}

// Watchers
watch(
  () => props.modelValue,
  newVal => {
    dialog.value = newVal
    if (newVal) {
      initializeForm()
    }
  }
)

watch(dialog, newVal => {
  emit('update:modelValue', newVal)
})

watch(expectedCash, newExpected => {
  if (form.value.actualCash === 0) {
    form.value.actualCash = newExpected
  }
})

// Methods
function initializeForm() {
  form.value = {
    actualCash: expectedCash.value,
    notes: ''
  }
}

function closeDialog() {
  dialog.value = false
  loading.value = false
}

async function endShift() {
  if (!shiftReport.value) return

  loading.value = true

  try {
    const result = await posStore.endShift()

    if (result.success && result.data) {
      // Дополняем отчет данными из формы
      const finalReport: ShiftReport = {
        ...result.data,
        // Добавляем данные о кассе
        actualCash: form.value.actualCash,
        expectedCash: expectedCash.value,
        cashDifference: cashDifference.value,
        notes: form.value.notes
      } as any

      emit('ended', finalReport)
      closeDialog()
      console.log('✅ Смена завершена успешно')
    } else {
      console.error('❌ Ошибка завершения смены:', result.error)
    }
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    loading.value = false
  }
}

function printReport() {
  if (!shiftReport.value) return

  console.log('🖨️ Печать отчета смены:', shiftReport.value.shiftId)
  // TODO: Интеграция с принтером
}

function formatShiftDuration(startTime: string): string {
  const start = new Date(startTime)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  return `${diffHours}ч ${diffMinutes}м`
}
</script>

<style scoped>
.v-card-title {
  background-color: rgba(255, 255, 255, 0.02);
}

.info-item {
  background-color: rgba(255, 255, 255, 0.02);
  padding: 12px;
  border-radius: 8px;
}

.payment-method-item {
  background-color: rgba(255, 255, 255, 0.02);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.sales-summary .v-card,
.payment-breakdown .payment-method-item {
  transition: all 0.2s ease;
}

.sales-summary .v-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
