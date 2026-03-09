<!-- src/views/kitchen/constructor/components/ModifierGroupEditor.vue -->
<!-- Gap #9: MVP only supports addon-type modifiers. replacement targetComponents deferred. -->
<template>
  <div class="modifier-group-editor">
    <div class="group-header">
      <v-text-field
        :model-value="group.name"
        placeholder="Group name..."
        variant="outlined"
        density="compact"
        hide-details
        class="group-name-input"
        @update:model-value="updateField('name', $event)"
      />
      <div class="group-controls">
        <v-checkbox
          :model-value="group.isRequired"
          label="Required"
          density="compact"
          hide-details
          @update:model-value="updateField('isRequired', $event)"
        />
        <v-btn
          icon="mdi-delete"
          size="small"
          variant="text"
          color="error"
          @click="emit('remove')"
        />
      </div>
    </div>

    <!-- Options -->
    <div class="options-list">
      <div v-for="(option, idx) in group.options" :key="option.id" class="option-row">
        <v-text-field
          :model-value="option.name"
          placeholder="Option name..."
          variant="outlined"
          density="compact"
          hide-details
          class="option-name"
          @update:model-value="updateOption(idx, 'name', $event)"
        />
        <NumericInputField
          :model-value="option.priceAdjustment"
          prefix="+Rp"
          variant="outlined"
          density="compact"
          hide-details
          class="option-price"
          @update:model-value="updateOption(idx, 'priceAdjustment', Number($event) || 0)"
        />
        <v-btn icon="mdi-close" size="x-small" variant="text" @click="removeOption(idx)" />
      </div>
    </div>

    <v-btn size="small" variant="text" class="add-option-btn" @click="addOption">
      <v-icon start>mdi-plus</v-icon>
      Add option
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { NumericInputField } from '@/components/input'
import type { ModifierGroup, ModifierOption } from '@/stores/menu/types'
import { createDefaultModifierOption } from '@/stores/menu/types'

const props = defineProps<{
  group: ModifierGroup
}>()

const emit = defineEmits<{
  update: [group: ModifierGroup]
  remove: []
}>()

function updateField(field: keyof ModifierGroup, value: any) {
  emit('update', { ...props.group, [field]: value })
}

function updateOption(idx: number, field: keyof ModifierOption, value: any) {
  const options = [...props.group.options]
  options[idx] = { ...options[idx], [field]: value }
  emit('update', { ...props.group, options })
}

function addOption() {
  const newOption = createDefaultModifierOption()
  emit('update', { ...props.group, options: [...props.group.options, newOption] })
}

function removeOption(idx: number) {
  const options = props.group.options.filter((_, i) => i !== idx)
  emit('update', { ...props.group, options })
}
</script>

<style scoped lang="scss">
.modifier-group-editor {
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.group-name-input {
  flex: 1;
}

.group-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-name {
  flex: 2;

  :deep(.v-field) {
    min-height: 36px;
  }
}

.option-price {
  flex: 1;
  max-width: 130px;

  :deep(.v-field) {
    min-height: 36px;
  }
}

.add-option-btn {
  text-transform: none;
}
</style>
