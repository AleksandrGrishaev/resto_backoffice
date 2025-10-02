<!-- src/views/products/components/ProductDialog.vue -->
<template>
  <v-dialog v-model="localModelValue" max-width="600px" persistent scrollable>
    <v-card>
      <!-- Заголовок -->
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">
          {{ isEdit ? 'mdi-pencil' : 'mdi-plus' }}
        </v-icon>
        <span>{{ isEdit ? 'Редактировать продукт' : 'Новый продукт' }}</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
      </v-card-title>

      <v-divider />

      <!-- Форма -->
      <v-card-text class="pa-6">
        <v-form ref="formRef" v-model="formValid">
          <v-row>
            <!-- Название продукта -->
            <v-col cols="12">
              <v-text-field
                v-model="formData.name"
                label="Название продукта *"
                variant="outlined"
                :rules="nameRules"
                :error-messages="fieldErrors.name"
                prepend-inner-icon="mdi-food"
                counter="100"
                maxlength="100"
                placeholder="Введите название продукта"
                @input="clearFieldError('name')"
              />
            </v-col>

            <!-- Категория и единица измерения -->
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.category"
                :items="categoryOptions"
                label="Категория *"
                variant="outlined"
                :rules="categoryRules"
                :error-messages="fieldErrors.category"
                prepend-inner-icon="mdi-tag"
                @update:model-value="clearFieldError('category')"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.baseUnit"
                label="Базовая единица"
                :items="baseUnitOptions"
                variant="outlined"
                :rules="unitRules"
                :error-messages="fieldErrors.unit"
                prepend-inner-icon="mdi-scale"
                @update:model-value="clearFieldError('unit')"
              />
            </v-col>

            <!-- Себестоимость за единицу -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.baseCostPerUnit"
                label="Цена за базовую единицу"
                variant="outlined"
                type="number"
                :rules="costRules"
                :error-messages="fieldErrors.costPerUnit"
                prepend-inner-icon="mdi-currency-usd"
                suffix="IDR"
                min="0"
                step="1"
                @input="clearFieldError('costPerUnit')"
              >
                <template #append-inner>
                  <v-tooltip location="top">
                    <template #activator="{ props: tooltipProps }">
                      <v-icon v-bind="tooltipProps" color="info" size="small">
                        mdi-help-circle
                      </v-icon>
                    </template>
                    <div>
                      Закупочная цена за {{ getSelectedUnitName() }}
                      <br />
                      (только себестоимость, цена продажи устанавливается в меню)
                    </div>
                  </v-tooltip>
                </template>
              </v-text-field>
            </v-col>

            <!-- Процент выхода -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.yieldPercentage"
                label="Процент выхода *"
                variant="outlined"
                type="number"
                :rules="yieldRules"
                :error-messages="fieldErrors.yieldPercentage"
                prepend-inner-icon="mdi-percent"
                suffix="%"
                min="1"
                max="100"
                step="0.1"
                @input="clearFieldError('yieldPercentage')"
              >
                <template #append-inner>
                  <v-tooltip location="top">
                    <template #activator="{ props: tooltipProps }">
                      <v-icon v-bind="tooltipProps" color="info" size="small">
                        mdi-help-circle
                      </v-icon>
                    </template>
                    <div>
                      Процент готового продукта после обработки
                      <br />
                      (учитывает отходы при очистке, нарезке и т.д.)
                    </div>
                  </v-tooltip>
                </template>
              </v-text-field>
            </v-col>

            <!-- Активность -->
            <v-col cols="12" class="d-flex align-center">
              <v-switch
                v-model="formData.isActive"
                label="Активен"
                color="success"
                :prepend-icon="formData.isActive ? 'mdi-check-circle' : 'mdi-pause-circle'"
                hide-details
              />
            </v-col>

            <!-- Описание -->
            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Описание"
                variant="outlined"
                rows="3"
                counter="500"
                maxlength="500"
                prepend-inner-icon="mdi-text"
                placeholder="Описание продукта (необязательно)"
              />
            </v-col>

            <!-- Расширенные настройки -->
            <v-col cols="12">
              <v-expansion-panels variant="accordion">
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon start>mdi-cog</v-icon>
                    Дополнительные параметры
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-row>
                      <!-- Условия хранения -->
                      <v-col cols="12">
                        <v-text-field
                          v-model="formData.storageConditions"
                          label="Условия хранения"
                          variant="outlined"
                          prepend-inner-icon="mdi-thermometer"
                          placeholder="Например: Холодильник +2°C до +4°C"
                          counter="200"
                          maxlength="200"
                        />
                      </v-col>

                      <!-- Срок годности -->
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model.number="formData.shelfLife"
                          label="Срок годности"
                          variant="outlined"
                          type="number"
                          prepend-inner-icon="mdi-calendar-clock"
                          suffix="дней"
                          min="1"
                          placeholder="Количество дней"
                        />
                      </v-col>

                      <!-- Минимальный остаток -->
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model.number="formData.minStock"
                          label="Минимальный остаток"
                          variant="outlined"
                          type="number"
                          prepend-inner-icon="mdi-package-down"
                          :suffix="getSelectedUnitName()"
                          min="0"
                          step="0.1"
                          placeholder="Для уведомлений"
                        />
                      </v-col>
                    </v-row>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <!-- Действия -->
      <v-divider />
      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn variant="text" @click="closeDialog">Отмена</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="loading"
          :disabled="!formValid"
          @click="saveProduct"
        >
          {{ isEdit ? 'Сохранить' : 'Создать' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductCategory
} from '@/stores/productsStore'
import { PRODUCT_CATEGORIES } from '@/stores/productsStore'
import type { MeasurementUnit } from '@/types/measurementUnits'
import { useProductUnits } from '@/composables/useMeasurementUnits'
import { BaseUnit } from '../../../stores/productsStore/types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProductDialog'

// Props
interface Props {
  modelValue: boolean
  product?: Product | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  product: null,
  loading: false
})

// Emits
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', data: CreateProductData | UpdateProductData): void
}

const emit = defineEmits<Emits>()

// Composables
const { unitOptions: productUnitOptions, validateUnit } = useProductUnits()

const baseUnitOptions = computed(() => [
  { title: 'Граммы (для твердых продуктов)', value: 'gram' },
  { title: 'Миллилитры (для жидкостей)', value: 'ml' },
  { title: 'Штуки (для штучных товаров)', value: 'piece' }
])

// Refs
const formRef = ref()
const formValid = ref(false)

// Состояние
const localModelValue = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const isEdit = computed(() => !!props.product?.id)

// Данные формы
const formData = ref<CreateProductData & { id?: string }>({
  name: '',
  category: 'other' as ProductCategory,
  baseUnit: 'gram' as BaseUnit,
  baseCostPerUnit: 0,
  yieldPercentage: 100,
  isActive: true,
  description: '',
  storageConditions: '',
  shelfLife: undefined,
  minStock: undefined
})

// Ошибки полей
const fieldErrors = ref<Record<string, string[]>>({
  name: [],
  category: [],
  unit: [],
  costPerUnit: [],
  yieldPercentage: []
})

// Опции для селектов
const categoryOptions = computed(() =>
  Object.entries(PRODUCT_CATEGORIES).map(([value, title]) => ({
    title,
    value
  }))
)

// Правила валидации
const nameRules = [
  (v: string) => !!v || 'Название обязательно для заполнения',
  (v: string) => v.length <= 100 || 'Название не должно превышать 100 символов',
  (v: string) => v.trim().length >= 2 || 'Название должно содержать минимум 2 символа'
]

const categoryRules = [(v: string) => !!v || 'Категория обязательна для выбора']

const unitRules = [(v: string) => !!v || 'Базовая единица обязательна для выбора']

const costRules = [
  (v: number) => (v !== null && v !== undefined) || 'Себестоимость обязательна',
  (v: number) => v >= 0 || 'Себестоимость не может быть отрицательной',
  (v: number) => v <= 999999999 || 'Слишком большое значение'
]

const yieldRules = [
  (v: number) => (v !== null && v !== undefined) || 'Процент выхода обязателен',
  (v: number) => v >= 1 || 'Процент выхода должен быть больше 0',
  (v: number) => v <= 100 || 'Процент выхода не может превышать 100%'
]

// Методы
const resetForm = (): void => {
  formData.value = {
    name: '',
    category: 'other',
    baseUnit: 'gram', // ← изменено с unit
    baseCostPerUnit: 0, // ← изменено с costPerUnit
    yieldPercentage: 100,
    isActive: true,
    description: '',
    storageConditions: '',
    shelfLife: undefined,
    minStock: undefined
  }
}

const getSelectedUnitName = (): string => {
  const baseUnitNames = {
    gram: 'грамм',
    ml: 'мл',
    piece: 'шт'
  }
  return baseUnitNames[formData.value.baseUnit] || formData.value.baseUnit
}

// Отслеживание изменений props.product
watch(
  () => props.product,
  newProduct => {
    if (newProduct) {
      // Заполняем форму данными продукта
      formData.value = {
        id: newProduct.id,
        name: newProduct.name,
        category: newProduct.category,
        baseUnit: newProduct.baseUnit, // ← изменено
        baseCostPerUnit: newProduct.baseCostPerUnit, // ← изменено
        yieldPercentage: newProduct.yieldPercentage,
        isActive: newProduct.isActive,
        description: newProduct.description || '',
        storageConditions: newProduct.storageConditions || '',
        shelfLife: newProduct.shelfLife,
        minStock: newProduct.minStock
      }
    } else {
      // Сброс формы для нового продукта
      resetForm()
    }
  },
  { immediate: true }
)

// Отслеживание открытия диалога
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      nextTick(() => {
        clearAllErrors()
        if (formRef.value) {
          formRef.value.resetValidation()
        }
      })
    }
  }
)

const clearFieldError = (field: string): void => {
  if (fieldErrors.value[field]) {
    fieldErrors.value[field] = []
  }
}

const clearAllErrors = (): void => {
  Object.keys(fieldErrors.value).forEach(field => {
    fieldErrors.value[field] = []
  })
}

const closeDialog = (): void => {
  emit('update:modelValue', false)
  DebugUtils.debug(MODULE_NAME, 'Dialog closed')
}

const saveProduct = async (): Promise<void> => {
  try {
    if (!formRef.value) return

    const { valid } = await formRef.value.validate()
    if (!valid) {
      DebugUtils.warn(MODULE_NAME, 'Form validation failed')
      return
    }

    DebugUtils.info(MODULE_NAME, 'Saving product', { isEdit: isEdit.value })

    // Подготовка данных
    const { id, ...productData } = formData.value

    // Очистка необязательных полей
    const cleanData = {
      ...productData,
      description: productData.description?.trim() || undefined,
      storageConditions: productData.storageConditions?.trim() || undefined,
      shelfLife: productData.shelfLife || undefined,
      minStock: productData.minStock || undefined
    }

    if (isEdit.value && id) {
      // Обновление существующего продукта
      emit('save', { id, ...cleanData } as UpdateProductData)
    } else {
      // Создание нового продукта
      emit('save', cleanData as CreateProductData)
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error saving product', { error })
  }
}
</script>

<style scoped>
/* Дополнительные стили при необходимости */
</style>
