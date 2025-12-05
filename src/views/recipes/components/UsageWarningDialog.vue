<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center pa-4 bg-warning">
        <v-icon start color="warning" size="28">mdi-alert</v-icon>
        <span class="text-h6">Cannot Archive {{ itemType }}</span>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-alert type="warning" variant="tonal" class="mb-4" prominent>
          <template #title>
            <strong>{{ itemName }}</strong>
            is currently in use
          </template>
          This {{ itemType.toLowerCase() }} cannot be archived because it is being used in the
          following locations:
        </v-alert>

        <!-- Usage locations list -->
        <v-list class="usage-list">
          <v-list-subheader class="text-subtitle-1 font-weight-bold">
            Usage Locations ({{ usageLocations.length }})
          </v-list-subheader>

          <template
            v-for="(location, index) in usageLocations"
            :key="`${location.type}-${location.id}-${index}`"
          >
            <v-divider v-if="index > 0" />
            <v-list-item>
              <template #prepend>
                <v-avatar :color="getLocationColor(location.type)" variant="tonal">
                  <v-icon :icon="getLocationIcon(location.type)" />
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ location.name }}
              </v-list-item-title>

              <v-list-item-subtitle v-if="location.details" class="text-caption mt-1">
                {{ location.details }}
              </v-list-item-subtitle>

              <template #append>
                <v-chip :color="getLocationColor(location.type)" size="small" variant="tonal" label>
                  {{ getLocationLabel(location.type) }}
                </v-chip>
              </template>
            </v-list-item>
          </template>
        </v-list>

        <!-- Instructions -->
        <v-alert type="info" variant="tonal" class="mt-4">
          <template #title>What to do?</template>
          To archive this {{ itemType.toLowerCase() }}, you need to:
          <ul class="mt-2 ml-4">
            <li>Remove it from all menu items and modifiers</li>
            <li v-if="itemType === 'Preparation'">Remove it from all recipes that use it</li>
            <li>Or archive the items that use this {{ itemType.toLowerCase() }} first</li>
          </ul>
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { UsageLocation } from '@/stores/recipes/composables/useUsageCheck'

interface Props {
  modelValue: boolean
  itemName: string
  itemType: 'Recipe' | 'Preparation'
  usageLocations: UsageLocation[]
}

defineProps<Props>()
defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function getLocationIcon(type: string): string {
  switch (type) {
    case 'menu':
      return 'mdi-food'
    case 'recipe':
      return 'mdi-chef-hat'
    default:
      return 'mdi-help-circle'
  }
}

function getLocationColor(type: string): string {
  switch (type) {
    case 'menu':
      return 'primary'
    case 'recipe':
      return 'success'
    default:
      return 'grey'
  }
}

function getLocationLabel(type: string): string {
  switch (type) {
    case 'menu':
      return 'Menu Item'
    case 'recipe':
      return 'Recipe'
    default:
      return 'Unknown'
  }
}
</script>

<style scoped lang="scss">
.usage-list {
  background-color: rgb(var(--v-theme-surface));
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.v-list-item {
  min-height: 72px;
  padding: 12px 16px;
}

.v-list-item-title {
  line-height: 1.4;
}

ul {
  list-style-type: disc;
}
</style>
