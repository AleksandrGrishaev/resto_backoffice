<!-- src/components/atoms/DatePicker.vue -->
<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    transition="scale-transition"
    offset-y
    min-width="auto"
  >
    <template #activator="{ props: menuProps }">
      <v-text-field
        v-bind="{ ...menuProps, ...$attrs }"
        :model-value="displayValue"
        :label="label"
        :placeholder="placeholder"
        :readonly="readonly"
        :disabled="disabled"
        :error="error"
        :error-messages="errorMessages"
        :hint="hint"
        :persistent-hint="persistentHint"
        :prepend-icon="prependIcon"
        :append-icon="appendIcon || 'mdi-calendar'"
        :variant="variant"
        :density="density"
        :clearable="clearable"
        @click:clear="handleClear"
        @click:append="menu = !menu"
      />
    </template>

    <v-date-picker
      v-model="internalValue"
      :min="min"
      :max="max"
      :multiple="multiple"
      :range="range"
      :show-adjacent-months="showAdjacentMonths"
      :color="color"
      @update:model-value="handleUpdate"
    />
  </v-menu>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { format, parseISO, isValid } from 'date-fns'

interface Props {
  modelValue?: string | string[] | null
  label?: string
  placeholder?: string
  readonly?: boolean
  disabled?: boolean
  error?: boolean
  errorMessages?: string | string[]
  hint?: string
  persistentHint?: boolean
  prependIcon?: string
  appendIcon?: string
  variant?:
    | 'filled'
    | 'outlined'
    | 'plain'
    | 'underlined'
    | 'solo'
    | 'solo-inverted'
    | 'solo-filled'
  density?: 'default' | 'comfortable' | 'compact'
  clearable?: boolean
  min?: string
  max?: string
  multiple?: boolean
  range?: boolean
  showAdjacentMonths?: boolean
  color?: string
  dateFormat?: string
  displayFormat?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'outlined',
  density: 'default',
  clearable: true,
  showAdjacentMonths: true,
  color: 'primary',
  dateFormat: 'yyyy-MM-dd',
  displayFormat: 'dd.MM.yyyy'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
  'update:menu': [value: boolean]
}>()

// State
const menu = ref(false)
const internalValue = ref<Date | Date[] | null>(null)

// Computed
const displayValue = computed(() => {
  if (!props.modelValue) return ''

  try {
    if (Array.isArray(props.modelValue)) {
      return props.modelValue.map(date => format(parseISO(date), props.displayFormat)).join(' - ')
    }

    const date = parseISO(props.modelValue)
    return isValid(date) ? format(date, props.displayFormat) : props.modelValue
  } catch (error) {
    console.warn('Error formatting date:', error)
    return String(props.modelValue)
  }
})

// Watchers
watch(
  () => props.modelValue,
  newValue => {
    if (!newValue) {
      internalValue.value = null
      return
    }

    try {
      if (Array.isArray(newValue)) {
        internalValue.value = newValue.map(date => parseISO(date))
      } else {
        const date = parseISO(newValue)
        internalValue.value = isValid(date) ? date : null
      }
    } catch (error) {
      console.warn('Error parsing date:', error)
      internalValue.value = null
    }
  },
  { immediate: true }
)

watch(menu, newValue => {
  emit('update:menu', newValue)
})

// Methods
function handleUpdate(value: Date | Date[] | null) {
  if (!value) {
    emit('update:modelValue', null)
    return
  }

  try {
    if (Array.isArray(value)) {
      const formatted = value.map(date => format(date, props.dateFormat))
      emit('update:modelValue', formatted)
    } else {
      const formatted = format(value, props.dateFormat)
      emit('update:modelValue', formatted)
    }
  } catch (error) {
    console.warn('Error formatting date for emit:', error)
    emit('update:modelValue', null)
  }
}

function handleClear() {
  emit('update:modelValue', null)
  internalValue.value = null
}
</script>

<style lang="scss" scoped>
// Компонент наследует стили от v-text-field
</style>
