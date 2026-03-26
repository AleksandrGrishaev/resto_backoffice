<!-- src/components/staff/TimeSlotEditor.vue -->
<template>
  <div class="time-slot-editor">
    <!-- Existing slots summary (always visible) -->
    <div v-if="slots.length" class="slots-summary">
      <div v-for="(slot, index) in slots" :key="index" class="slot-chip">
        <span class="slot-chip-text">
          {{ formatHour(slot.start) }} — {{ formatHour(slot.end) }}
        </span>
        <span class="slot-chip-hours">{{ slot.end - slot.start }}h</span>
        <v-btn
          icon
          size="x-small"
          variant="text"
          class="slot-chip-delete"
          @click="removeSlot(index)"
        >
          <v-icon size="14">mdi-close</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Hour grid -->
    <div class="hour-grid">
      <button
        v-for="hour in gridHours"
        :key="hour"
        class="hour-cell"
        :class="hourCellClass(hour)"
        @click="onHourTap(hour)"
      >
        {{ hour }}
      </button>
    </div>

    <!-- Selection hint -->
    <div v-if="selecting && selectStart !== null && selectEnd === null" class="selection-hint">
      <span>
        {{ addingNew ? 'Adding shift:' : 'Select end hour:' }}
        <span class="hint-range">{{ formatHour(selectStart) }} — ?</span>
      </span>
      <v-btn size="x-small" variant="text" @click="cancelSelection">Cancel</v-btn>
    </div>
    <div v-else-if="addingNew && !selecting" class="selection-hint">
      <span>Tap start hour for new shift</span>
      <v-btn size="x-small" variant="text" @click="cancelAdding">Cancel</v-btn>
    </div>

    <!-- Bottom row: presets + add shift -->
    <div class="bottom-row">
      <div class="preset-row">
        <button
          v-for="preset in presets"
          :key="preset.id"
          class="preset-chip"
          @click="applyPreset(preset)"
        >
          <span class="preset-name">{{ preset.name }}</span>
          <span class="preset-time">{{ preset.startHour }}-{{ preset.endHour }}</span>
        </button>
      </div>
      <div class="actions-row">
        <button v-if="slots.length < 3 && !addingNew" class="add-shift-btn" @click="startAdding">
          <v-icon size="16">mdi-plus</v-icon>
          Add shift
        </button>
        <button v-if="slots.length > 0" class="clear-btn" @click="clearAll">Clear</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TimeSlot, ShiftPreset } from '@/stores/staff'
import { formatHour, mergeOverlappingSlots } from '@/stores/staff'

const props = defineProps<{
  modelValue: TimeSlot[]
  presets: ShiftPreset[]
}>()

const emit = defineEmits<{
  'update:modelValue': [slots: TimeSlot[]]
}>()

const slots = computed(() => props.modelValue)

const gridHours = Array.from({ length: 18 }, (_, i) => i + 6)

// Selection state
const selecting = ref(false)
const selectStart = ref<number | null>(null)
const selectEnd = ref<number | null>(null)
const addingNew = ref(false) // true = "Add shift" mode (append), false = replace mode

function hourCellClass(hour: number) {
  const classes: Record<string, boolean> = {}

  // Show current selection in progress
  if (selecting.value && selectStart.value !== null) {
    if (selectEnd.value === null) {
      classes['selecting-start'] = hour === selectStart.value
    } else {
      classes['selecting-range'] = hour >= selectStart.value && hour <= selectEnd.value
      classes['selecting-start'] = hour === selectStart.value
      classes['selecting-end'] = hour === selectEnd.value
    }
  }

  // Show existing ranges (dim them if we're in adding mode to distinguish)
  const inExisting = props.modelValue.some(s => hour >= s.start && hour < s.end)
  if (inExisting) {
    classes['in-range'] = true
    classes['range-start'] = props.modelValue.some(s => hour === s.start)
    classes['range-end'] = props.modelValue.some(s => hour === s.end - 1)
  }

  return classes
}

function onHourTap(hour: number) {
  if (!selecting.value) {
    // First tap — start selection
    selecting.value = true
    selectStart.value = hour
    selectEnd.value = null
    return
  }

  if (selectStart.value !== null && selectEnd.value === null) {
    if (hour <= selectStart.value) {
      // Tapped on or before start — restart
      selectStart.value = hour
      return
    }
    // Second tap — commit range (end is exclusive: hour+1)
    selectEnd.value = hour
    commitSelection(selectStart.value, hour + 1)
  }
}

function commitSelection(start: number, end: number) {
  const newSlot: TimeSlot = { start, end }

  if (addingNew.value) {
    // Append new slot and merge overlapping ranges
    const updated = mergeOverlappingSlots([...props.modelValue, newSlot])
    emit('update:modelValue', updated)
  } else {
    // Replace all with this single slot
    emit('update:modelValue', [newSlot])
  }

  resetSelection()
}

function resetSelection() {
  selecting.value = false
  selectStart.value = null
  selectEnd.value = null
  addingNew.value = false
}

function cancelSelection() {
  resetSelection()
}

function startAdding() {
  addingNew.value = true
  selecting.value = false
  selectStart.value = null
  selectEnd.value = null
}

function cancelAdding() {
  addingNew.value = false
}

function removeSlot(index: number) {
  const updated = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', updated)
}

function clearAll() {
  emit('update:modelValue', [])
  resetSelection()
}

function applyPreset(preset: ShiftPreset) {
  if (addingNew.value) {
    // In adding mode — append preset as new slot
    const updated = [...props.modelValue, { start: preset.startHour, end: preset.endHour }].sort(
      (a, b) => a.start - b.start
    )
    emit('update:modelValue', updated)
    addingNew.value = false
  } else {
    // Replace all with preset
    emit('update:modelValue', [{ start: preset.startHour, end: preset.endHour }])
  }
  resetSelection()
}
</script>

<style scoped lang="scss">
.time-slot-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.slots-summary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.slot-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 10px;
  background: rgba(var(--v-theme-primary), 0.15);
  border-radius: 8px;
  font-size: 13px;
}

.slot-chip-text {
  font-weight: 600;
}

.slot-chip-hours {
  font-size: 11px;
  opacity: 0.6;
}

.slot-chip-delete {
  opacity: 0.5;
  &:hover {
    opacity: 1;
  }
}

.hour-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 4px;
}

.hour-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  border: none;
  cursor: pointer;
  transition: all 0.12s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;

  &:active {
    transform: scale(0.93);
  }

  &.in-range {
    background: rgba(var(--v-theme-primary), 0.25);
    color: rgb(var(--v-theme-primary));
  }

  &.range-start {
    background: rgba(var(--v-theme-primary), 0.4);
    color: #fff;
    font-weight: 700;
  }

  &.range-end {
    background: rgba(var(--v-theme-primary), 0.4);
    color: #fff;
    font-weight: 700;
  }

  &.selecting-start {
    background: rgba(var(--v-theme-primary), 0.5);
    color: #fff;
    box-shadow: 0 0 0 2px rgb(var(--v-theme-primary));
  }

  &.selecting-range {
    background: rgba(var(--v-theme-primary), 0.3);
    color: #fff;
  }

  &.selecting-end {
    background: rgba(var(--v-theme-primary), 0.5);
    color: #fff;
  }
}

.selection-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  padding: 2px 0;
}

.hint-range {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.bottom-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.12s;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: rgba(var(--v-theme-primary), 0.2);
    border-color: rgba(var(--v-theme-primary), 0.4);
  }
}

.preset-name {
  font-weight: 600;
}

.preset-time {
  font-size: 11px;
  opacity: 0.5;
}

.actions-row {
  display: flex;
  gap: 8px;
}

.add-shift-btn,
.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: none;
  border: none;
  font-size: 13px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.add-shift-btn {
  color: rgb(var(--v-theme-primary));
}

.clear-btn {
  color: rgba(255, 255, 255, 0.4);
}
</style>
