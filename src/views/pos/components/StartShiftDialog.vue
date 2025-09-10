<!-- src/views/pos/components/StartShiftDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-play-circle" color="success" class="me-3" />
        <span>Начать смену</span>
      </v-card-title>

      <v-divider />

      <!-- Form -->
      <v-card-text class="pa-4">
        <v-form ref="formRef" v-model="formValid" @submit.prevent="startShift">
          <!-- Cashier Info -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-3">Информация о кассире</div>

            <v-text-field
              v-model="form.cashierName"
              label="Имя кассира"
              variant="outlined"
              :rules="[rules.required]"
              prepend-inner-icon="mdi-account"
              required
            />
          </div>

          <!-- Starting Cash -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-3">Касса</div>

            <v-text-field
              v-model.number="form.startingCash"
              label="Начальная сумма в кассе"
              variant="outlined"
              type="number"
              min="0"
              step="100"
              prefix="₽"
              :rules="[rules.required, rules.nonNegative]"
              prepend-inner-icon="mdi-cash"
              hint="Укажите сумму наличных в кассе на начало смены"
              persistent-hint
            />
          </div>

          <!-- Shift Notes -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-3">Примечания (опционально)</div>

            <v-textarea
              v-model="form.notes"
              label="Примечания к смене"
              variant="outlined"
              rows="3"
              max-rows="5"
              prepend-inner-icon="mdi-note-text"
              hint="Любые важные заметки на начало смены"
              persistent-hint
            />
          </div>

          <!-- Start Time Info -->
          <v-alert color="info" variant="tonal" class="mb-4">
            <div class="d-flex align-center">
              <v-icon start>mdi-clock</v-icon>
              <div>
                <div class="font-weight-bold">Время начала смены</div>
                <div class="text-caption">{{ formatDateTime(new Date()) }}</div>
              </div>
            </div>
          </v-alert>
        </v-form>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="loading" @click="closeDialog">Отмена</v-btn>

        <v-spacer />

        <v-btn
          color="success"
          size="large"
          :loading="loading"
          :disabled="!formValid"
          @click="startShift"
        >
          <v-icon start>mdi-play</v-icon>
          Начать смену
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/pos'

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
  started: [shiftData: any]
}>()

// Stores
const posStore = usePosStore()

// Refs
const formRef = ref()

// State
const dialog = ref(props.modelValue)
const loading = ref(false)
const formValid = ref(false)

const form = ref({
  cashierName: 'Кассир', // TODO: Получать из authStore
  startingCash: 5000,
  notes: ''
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'Поле обязательно для заполнения',
  nonNegative: (value: number) => value >= 0 || 'Значение не может быть отрицательным'
}

// Computed
const currentTime = computed(() => new Date())

// Watchers
watch(
  () => props.modelValue,
  newVal => {
    dialog.value = newVal
    if (newVal) {
      resetForm()
    }
  }
)

watch(dialog, newVal => {
  emit('update:modelValue', newVal)
})

// Methods
function resetForm() {
  form.value = {
    cashierName: 'Кассир', // TODO: Получать из authStore
    startingCash: 5000,
    notes: ''
  }

  if (formRef.value) {
    formRef.value.resetValidation()
  }
}

function closeDialog() {
  dialog.value = false
  loading.value = false
}

async function startShift() {
  if (!formValid.value) return

  loading.value = true

  try {
    const result = await posStore.startShift(
      'cashier-1', // TODO: Получать реальный ID из authStore
      form.value.cashierName,
      form.value.startingCash
    )

    if (result.success) {
      const shiftData = {
        ...form.value,
        startTime: new Date().toISOString()
      }

      emit('started', shiftData)
      closeDialog()
      console.log('✅ Смена начата успешно')
    } else {
      console.error('❌ Ошибка начала смены:', result.error)
      // TODO: Показать ошибку пользователю
    }
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    loading.value = false
  }
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>

<style scoped>
.v-card-title {
  background-color: rgba(255, 255, 255, 0.02);
}

.text-subtitle-2 {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}
</style>
