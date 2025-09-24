<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500px"
    @update:model-value="$emit('update:model-value', $event)"
  >
    <v-card>
      <v-card-title>
        {{ isEditing ? 'Редактировать упаковку' : 'Добавить упаковку' }}
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" v-model="formValid">
          <v-text-field
            v-model="formData.packageName"
            label="Название упаковки"
            placeholder="Килограмм, Пачка 500г, Упаковка 24шт"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <div class="d-flex gap-3 mb-3">
            <v-text-field
              v-model.number="formData.packageSize"
              label="Размер упаковки"
              :suffix="baseUnit"
              :rules="[rules.required, rules.positive]"
              type="number"
              variant="outlined"
              density="comfortable"
              class="flex-grow-1"
            />

            <v-select
              v-model="formData.packageUnit"
              label="Единица упаковки"
              :items="packageUnitOptions"
              item-value="value"
              item-title="text"
              :rules="[rules.required]"
              variant="outlined"
              density="comfortable"
              class="flex-grow-1"
            />
          </div>

          <v-text-field
            v-model="formData.brandName"
            label="Бренд (опционально)"
            placeholder="Anchor, Local Brand"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-text-field
            v-model.number="formData.packagePrice"
            label="Цена за упаковку (опционально)"
            suffix="IDR"
            type="number"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hint="Если не указана, будет рассчитана автоматически"
            persistent-hint
          />

          <v-text-field
            v-model.number="formData.baseCostPerUnit"
            :label="`Цена за ${baseUnit}`"
            suffix="IDR"
            :rules="[rules.required, rules.positive]"
            type="number"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-textarea
            v-model="formData.notes"
            label="Примечания (опционально)"
            placeholder="Оптовая цена, Только для больших заказов"
            variant="outlined"
            density="comfortable"
            rows="2"
            class="mb-3"
          />

          <v-switch v-model="formData.isActive" label="Активна" color="primary" class="mb-3" />

          <!-- Расчетная информация -->
          <v-card variant="tonal" color="info" class="mb-3">
            <v-card-text class="py-2">
              <div class="text-body-2">
                <strong>Расчеты:</strong>
                <br />
                <span v-if="calculatedPackagePrice">
                  Автоматическая цена упаковки: {{ formatPrice(calculatedPackagePrice) }}
                  <br />
                </span>
                <span v-if="formData.packagePrice && calculatedBaseCost">
                  Цена за {{ baseUnit }} (из цены упаковки): {{ formatPrice(calculatedBaseCost) }}
                  <br />
                </span>
              </div>
            </v-card-text>
          </v-card>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:model-value', false)">Отмена</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!formValid"
          :loading="loading"
          @click="handleSave"
        >
          {{ isEditing ? 'Сохранить' : 'Добавить' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type {
  PackageOption,
  CreatePackageOptionDto,
  UpdatePackageOptionDto
} from '@/stores/productsStore/types'
import type { MeasurementUnit } from '@/types/measurementUnits'

interface Props {
  modelValue: boolean
  productId: string
  baseUnit: string
  package?: PackageOption // Для редактирования
  loading?: boolean
}

interface Emits {
  (e: 'update:model-value', value: boolean): void
  (e: 'save', data: CreatePackageOptionDto | UpdatePackageOptionDto): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref()
const formValid = ref(false)

const isEditing = computed(() => !!props.package)

// Форма данных
const formData = ref({
  packageName: '',
  packageSize: 1,
  packageUnit: 'kg' as MeasurementUnit,
  brandName: '',
  packagePrice: null as number | null,
  baseCostPerUnit: 0,
  notes: '',
  isActive: true
})

// Опции для единиц упаковки
const packageUnitOptions = computed(() => {
  const baseUnitType = props.baseUnit
  if (baseUnitType === 'gram') {
    return [
      { value: 'kg', text: 'Килограмм' },
      { value: 'pack', text: 'Упаковка' }
    ]
  } else if (baseUnitType === 'ml') {
    return [
      { value: 'liter', text: 'Литр' },
      { value: 'pack', text: 'Упаковка' }
    ]
  } else {
    return [
      { value: 'piece', text: 'Штука' },
      { value: 'pack', text: 'Упаковка' }
    ]
  }
})

// Правила валидации
const rules = {
  required: (value: any) => !!value || 'Поле обязательно',
  positive: (value: number) => (value && value > 0) || 'Значение должно быть больше 0'
}

// Расчетные значения
const calculatedPackagePrice = computed(() => {
  if (formData.value.baseCostPerUnit && formData.value.packageSize) {
    return formData.value.baseCostPerUnit * formData.value.packageSize
  }
  return null
})

const calculatedBaseCost = computed(() => {
  if (formData.value.packagePrice && formData.value.packageSize) {
    return formData.value.packagePrice / formData.value.packageSize
  }
  return null
})

// Загрузка данных при открытии диалога
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      if (props.package) {
        // Редактирование
        formData.value = {
          packageName: props.package.packageName,
          packageSize: props.package.packageSize,
          packageUnit: props.package.packageUnit,
          brandName: props.package.brandName || '',
          packagePrice: props.package.packagePrice || null,
          baseCostPerUnit: props.package.baseCostPerUnit,
          notes: props.package.notes || '',
          isActive: props.package.isActive
        }
      } else {
        // Создание новой
        resetForm()
      }

      nextTick(() => {
        formRef.value?.resetValidation()
      })
    }
  }
)

function resetForm() {
  formData.value = {
    packageName: '',
    packageSize: props.baseUnit === 'piece' ? 1 : 1000,
    packageUnit: getDefaultPackageUnit(),
    brandName: '',
    packagePrice: null,
    baseCostPerUnit: 0,
    notes: '',
    isActive: true
  }
}

function getDefaultPackageUnit(): MeasurementUnit {
  switch (props.baseUnit) {
    case 'gram':
      return 'kg'
    case 'ml':
      return 'liter'
    case 'piece':
      return 'piece'
    default:
      return 'piece'
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

async function handleSave() {
  const valid = await formRef.value?.validate()
  if (!valid?.valid) return

  const saveData = {
    productId: props.productId,
    packageName: formData.value.packageName,
    packageSize: formData.value.packageSize,
    packageUnit: formData.value.packageUnit,
    brandName: formData.value.brandName || undefined,
    packagePrice: formData.value.packagePrice || undefined,
    baseCostPerUnit: formData.value.baseCostPerUnit,
    notes: formData.value.notes || undefined,
    ...(isEditing.value && {
      id: props.package!.id,
      isActive: formData.value.isActive
    })
  }

  emit('save', saveData)
}
</script>
