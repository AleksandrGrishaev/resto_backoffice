<template>
  <base-dialog
    v-model="dialogModel"
    :title="dialogTitle"
    max-width="600"
    cancel-text="Cancel"
    :confirm-text="confirmText"
    :confirm-color="confirmColor"
    @cancel="handleCancel"
    @confirm="handleConfirm"
  >
    <v-alert :type="alertType" variant="tonal" class="mb-4">
      <div class="text-body-2">
        <strong>{{ alertTitle }}</strong>
      </div>
      <div class="text-body-2 mt-2">{{ alertMessage }}</div>
    </v-alert>

    <!-- Dish info -->
    <div class="dish-info mb-4">
      <div class="text-subtitle-1 font-weight-bold mb-2">{{ item?.name }}</div>
      <div class="d-flex align-center gap-2">
        <v-chip size="small" :color="currentTypeColor" variant="flat">
          <v-icon :icon="currentTypeIcon" size="16" class="mr-1" />
          {{ currentTypeLabel }}
        </v-chip>
        <v-icon icon="mdi-arrow-right" size="20" />
        <v-chip size="small" :color="targetTypeColor" variant="flat">
          <v-icon :icon="targetTypeIcon" size="16" class="mr-1" />
          {{ targetTypeLabel }}
        </v-chip>
      </div>
    </div>

    <!-- What will happen -->
    <div class="conversion-details">
      <div class="text-subtitle-2 font-weight-bold mb-2">What will happen:</div>
      <v-list density="compact" class="bg-transparent">
        <v-list-item v-for="(detail, index) in conversionDetails" :key="index">
          <template #prepend>
            <v-icon :icon="detail.icon" :color="detail.color" size="20" />
          </template>
          <v-list-item-title>{{ detail.text }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </div>

    <!-- Warning for modifiable -> simple with modifiers -->
    <v-alert v-if="willDeleteModifiers" type="warning" variant="tonal" class="mt-4" prominent>
      <div class="text-body-2 font-weight-bold">Data Loss Warning!</div>
      <div class="text-body-2 mt-2">
        This dish has {{ modifierGroupsCount }} modifier group(s) and {{ templatesCount }}
        template(s). All modifiers and templates will be permanently deleted.
      </div>
    </v-alert>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MenuItem, DishType } from '@/types/menu'
import { DISH_TYPES, DISH_TYPE_ICONS } from '@/stores/menu/types'
import BaseDialog from '@/components/base/BaseDialog.vue'

interface Props {
  modelValue: boolean
  item: MenuItem | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  item: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Current and target dish types
const currentDishType = computed(() => props.item?.dishType || 'simple')
const targetDishType = computed<DishType>(() =>
  currentDishType.value === 'simple' ? 'modifiable' : 'simple'
)

// Type labels and icons
const currentTypeLabel = computed(() => DISH_TYPES[currentDishType.value] || currentDishType.value)
const targetTypeLabel = computed(() => DISH_TYPES[targetDishType.value])
const currentTypeIcon = computed(() => DISH_TYPE_ICONS[currentDishType.value] || 'mdi-food')
const targetTypeIcon = computed(() => DISH_TYPE_ICONS[targetDishType.value])

const currentTypeColor = computed(() => (currentDishType.value === 'simple' ? 'primary' : 'orange'))
const targetTypeColor = computed(() => (targetDishType.value === 'simple' ? 'primary' : 'orange'))

// Dialog title and messages
const dialogTitle = computed(() =>
  currentDishType.value === 'simple' ? 'Convert to Modifiable Dish' : 'Convert to Simple Dish'
)

const alertType = computed(() => (willDeleteModifiers.value ? 'warning' : 'info'))
const alertTitle = computed(() =>
  willDeleteModifiers.value ? 'Warning: Data will be deleted' : 'Confirm dish type conversion'
)

const alertMessage = computed(() => {
  if (currentDishType.value === 'simple') {
    return 'This will allow you to add modifiers (required/optional sides, add-ons, etc.) to this dish. All existing variants will be preserved.'
  } else {
    return willDeleteModifiers.value
      ? 'This dish will become a simple dish with fixed composition. All modifiers and templates will be permanently deleted.'
      : 'This dish will become a simple dish with fixed composition. All existing variants will be preserved.'
  }
})

const confirmText = computed(() =>
  willDeleteModifiers.value ? 'Yes, Convert & Delete' : 'Convert'
)
const confirmColor = computed(() => (willDeleteModifiers.value ? 'error' : 'primary'))

// Check if modifiers will be deleted
const willDeleteModifiers = computed(() => {
  return (
    currentDishType.value === 'modifiable' &&
    targetDishType.value === 'simple' &&
    (modifierGroupsCount.value > 0 || templatesCount.value > 0)
  )
})

const modifierGroupsCount = computed(() => props.item?.modifierGroups?.length || 0)
const templatesCount = computed(() => props.item?.templates?.length || 0)

// Conversion details
const conversionDetails = computed(() => {
  const details = []

  if (currentDishType.value === 'simple') {
    // Simple -> Modifiable
    details.push({
      icon: 'mdi-check-circle',
      color: 'success',
      text: 'All existing variants will be preserved'
    })
    details.push({
      icon: 'mdi-plus-circle',
      color: 'success',
      text: 'You can add modifier groups (sides, toppings, etc.)'
    })
    details.push({
      icon: 'mdi-plus-circle',
      color: 'success',
      text: 'You can create templates with pre-selected modifiers'
    })
  } else {
    // Modifiable -> Simple
    details.push({
      icon: 'mdi-check-circle',
      color: 'success',
      text: 'All existing variants will be preserved'
    })

    if (willDeleteModifiers.value) {
      details.push({
        icon: 'mdi-delete',
        color: 'error',
        text: `${modifierGroupsCount.value} modifier group(s) will be deleted`
      })
      if (templatesCount.value > 0) {
        details.push({
          icon: 'mdi-delete',
          color: 'error',
          text: `${templatesCount.value} template(s) will be deleted`
        })
      }
    }

    details.push({
      icon: 'mdi-information',
      color: 'info',
      text: 'Dish will have fixed composition only'
    })
  }

  return details
})

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

function handleConfirm() {
  emit('confirm')
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.dish-info {
  padding: 16px;
  background: var(--color-surface-variant);
  border-radius: 8px;
}

.conversion-details {
  padding: 16px;
  background: var(--color-surface-variant);
  border-radius: 8px;
}

.gap-2 {
  gap: 8px;
}
</style>
