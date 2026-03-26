<!-- src/views/admin/staff/components/ShiftPresetsDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Manage Shift Presets</span>
        <v-btn icon size="small" variant="text" @click="emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <!-- Existing presets -->
        <v-list>
          <v-list-item
            v-for="preset in presets"
            :key="preset.id"
            :class="{ 'opacity-50': !preset.isActive }"
          >
            <template #default>
              <div v-if="editingId !== preset.id" class="d-flex align-center w-100">
                <div class="flex-grow-1">
                  <div class="font-weight-medium">{{ preset.name }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatHour(preset.startHour) }} — {{ formatHour(preset.endHour) }} ({{
                      preset.endHour - preset.startHour
                    }}h)
                  </div>
                </div>
                <v-btn icon size="x-small" variant="text" @click="startEdit(preset)">
                  <v-icon size="16">mdi-pencil</v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="emit('delete', preset.id)"
                >
                  <v-icon size="16">mdi-delete</v-icon>
                </v-btn>
              </div>
              <!-- Inline edit -->
              <div v-else class="d-flex align-center gap-sm w-100 flex-wrap">
                <v-text-field
                  v-model="editForm.name"
                  label="Name"
                  density="compact"
                  hide-details
                  style="max-width: 140px"
                />
                <v-select
                  v-model="editForm.startHour"
                  :items="hourOptions"
                  label="Start"
                  density="compact"
                  hide-details
                  style="max-width: 100px"
                />
                <v-select
                  v-model="editForm.endHour"
                  :items="endHourOptions(editForm.startHour)"
                  label="End"
                  density="compact"
                  hide-details
                  style="max-width: 100px"
                />
                <v-btn icon size="x-small" color="success" @click="saveEdit">
                  <v-icon size="16">mdi-check</v-icon>
                </v-btn>
                <v-btn icon size="x-small" @click="editingId = null">
                  <v-icon size="16">mdi-close</v-icon>
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <v-divider class="my-3" />

        <!-- Add new preset -->
        <div class="d-flex align-center gap-sm flex-wrap">
          <v-text-field
            v-model="newPreset.name"
            label="Preset Name"
            density="compact"
            hide-details
            style="max-width: 140px"
          />
          <v-select
            v-model="newPreset.startHour"
            :items="hourOptions"
            label="Start"
            density="compact"
            hide-details
            style="max-width: 100px"
          />
          <v-select
            v-model="newPreset.endHour"
            :items="endHourOptions(newPreset.startHour)"
            label="End"
            density="compact"
            hide-details
            style="max-width: 100px"
          />
          <v-btn
            color="primary"
            size="small"
            :disabled="!newPreset.name || newPreset.endHour <= newPreset.startHour"
            @click="handleCreate"
          >
            Add
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { ShiftPreset } from '@/stores/staff'
import { formatHour } from '@/stores/staff'

defineProps<{
  modelValue: boolean
  presets: ShiftPreset[]
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  create: [data: Partial<ShiftPreset>]
  update: [id: string, data: Partial<ShiftPreset>]
  delete: [id: string]
}>()

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  title: formatHour(i),
  value: i
}))

function endHourOptions(startHour: number) {
  return Array.from({ length: 24 - startHour }, (_, i) => ({
    title: formatHour(startHour + i + 1),
    value: startHour + i + 1
  }))
}

const editingId = ref<string | null>(null)
const editForm = reactive({ name: '', startHour: 8, endHour: 16 })
const newPreset = reactive({ name: '', startHour: 8, endHour: 16 })

function startEdit(preset: ShiftPreset) {
  editingId.value = preset.id
  editForm.name = preset.name
  editForm.startHour = preset.startHour
  editForm.endHour = preset.endHour
}

function saveEdit() {
  if (editingId.value) {
    emit('update', editingId.value, {
      name: editForm.name,
      startHour: editForm.startHour,
      endHour: editForm.endHour
    })
    editingId.value = null
  }
}

function handleCreate() {
  emit('create', {
    name: newPreset.name,
    startHour: newPreset.startHour,
    endHour: newPreset.endHour,
    sortOrder: 0
  })
  newPreset.name = ''
  newPreset.startHour = 8
  newPreset.endHour = 16
}
</script>
