<!-- src/views/menu/components/DishTypeSelectionDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center pa-4 bg-grey-lighten-4">
        <span class="text-h5">Выберите тип блюда</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="handleCancel" />
      </v-card-title>

      <v-divider />

      <!-- Content -->
      <v-card-text class="pa-6">
        <div class="text-body-1 text-grey mb-4">
          Выберите тип блюда для настройки соответствующего интерфейса:
        </div>

        <v-row>
          <v-col v-for="dishType in dishTypes" :key="dishType.value" cols="12">
            <v-card class="dish-type-card" elevation="2" @click="selectType(dishType.value)">
              <v-card-text class="d-flex align-center pa-4">
                <v-avatar size="64" color="primary" variant="tonal" class="mr-4">
                  <v-icon :icon="dishType.icon" size="36" />
                </v-avatar>

                <div class="flex-grow-1">
                  <div class="text-h6 mb-1">{{ dishType.title }}</div>
                  <div class="text-body-2 text-grey">{{ dishType.description }}</div>

                  <v-chip
                    v-if="dishType.value === 'simple'"
                    size="small"
                    color="success"
                    variant="outlined"
                    class="mt-2"
                  >
                    Рекомендуется
                  </v-chip>
                </div>

                <v-icon icon="mdi-chevron-right" size="32" color="grey" class="ml-2" />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { DishType } from '@/stores/menu/types'
import { DISH_TYPES, DISH_TYPE_DESCRIPTIONS, DISH_TYPE_ICONS } from '@/stores/menu/types'

interface Props {
  modelValue: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  selected: [dishType: DishType]
  cancel: []
}>()

// Dish types configuration
const dishTypes = [
  {
    value: 'simple' as DishType,
    title: DISH_TYPES.simple,
    description: DISH_TYPE_DESCRIPTIONS.simple,
    icon: DISH_TYPE_ICONS.simple
  },
  {
    value: 'component-based' as DishType,
    title: DISH_TYPES['component-based'],
    description: DISH_TYPE_DESCRIPTIONS['component-based'],
    icon: DISH_TYPE_ICONS['component-based']
  },
  {
    value: 'addon-based' as DishType,
    title: DISH_TYPES['addon-based'],
    description: DISH_TYPE_DESCRIPTIONS['addon-based'],
    icon: DISH_TYPE_ICONS['addon-based']
  }
]

// Methods
function selectType(type: DishType): void {
  emit('selected', type)
  emit('update:modelValue', false)
}

function handleCancel(): void {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.dish-type-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.dish-type-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
