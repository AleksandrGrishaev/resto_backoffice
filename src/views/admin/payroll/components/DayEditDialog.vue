<!-- src/views/admin/payroll/components/DayEditDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Edit Hours — {{ formattedDate }}</span>
        <v-btn icon size="small" variant="text" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Staff list -->
        <div class="staff-list">
          <div
            v-for="entry in entries"
            :key="entry.staffId"
            class="staff-entry"
            :class="{ 'active-entry': selectedStaffId === entry.staffId }"
            @click="selectStaff(entry)"
          >
            <div class="staff-info">
              <div class="staff-name">{{ entry.staffName }}</div>
              <div class="staff-dept">{{ entry.department }}</div>
            </div>
            <div class="hours-display">
              <span v-if="entry.originalHours !== entry.newHours" class="old-hours">
                {{ entry.originalHours }}
              </span>
              <span
                class="current-hours"
                :class="{ changed: entry.originalHours !== entry.newHours }"
              >
                {{ entry.newHours }}h
              </span>
            </div>
          </div>
        </div>

        <!-- Keypad for selected staff -->
        <div v-if="selectedEntry" class="keypad-section">
          <div class="keypad-header">
            <span class="keypad-staff-name">{{ selectedEntry.staffName }}</span>
            <span
              v-if="selectedEntry.originalHours !== selectedEntry.newHours"
              class="keypad-change"
            >
              {{ selectedEntry.originalHours }}h → {{ selectedEntry.newHours }}h
            </span>
          </div>
          <NumericKeypad
            v-model="selectedEntry.newHours"
            :allow-decimal="true"
            :max-value="24"
            :show-display="true"
            label="Hours"
            suffix="h"
            compact
            inline
          />
        </div>

        <!-- Reason field (shown when any value changed) -->
        <div v-if="hasChanges" class="reason-section">
          <v-text-field
            v-model="reason"
            label="Reason for correction"
            placeholder="e.g. Forgot to clock out, sick leave..."
            :maxlength="100"
            :counter="100"
            density="compact"
            variant="outlined"
            hide-details="auto"
            class="mx-4"
          />
        </div>
      </v-card-text>

      <v-card-actions>
        <div v-if="hasChanges" class="text-caption text-warning ml-2">
          {{ changedCount }} change{{ changedCount > 1 ? 's' : '' }}
        </div>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          :disabled="!hasChanges || (hasChanges && !reason.trim())"
          :loading="saving"
          @click="saveAll"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { supabase } from '@/supabase/client'
import { useAuthStore } from '@/stores/auth'
import NumericKeypad from '@/components/input/NumericKeypad.vue'

interface StaffEntry {
  staffId: string
  staffName: string
  department: string
  originalHours: number
  newHours: number
}

const props = defineProps<{
  modelValue: boolean
  date: string
  staffRows: Array<{
    staffId: string
    staffName: string
    department: string
    dailyHours: Record<string, number>
  }>
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  saved: []
}>()

const authStore = useAuthStore()
const entries = ref<StaffEntry[]>([])
const selectedStaffId = ref<string | null>(null)
const reason = ref('')
const saving = ref(false)

const formattedDate = computed(() => {
  if (!props.date) return ''
  const d = new Date(props.date + 'T12:00:00')
  return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
})

const selectedEntry = computed(() => {
  return entries.value.find(e => e.staffId === selectedStaffId.value) || null
})

const hasChanges = computed(() => {
  return entries.value.some(e => e.originalHours !== e.newHours)
})

const changedCount = computed(() => {
  return entries.value.filter(e => e.originalHours !== e.newHours).length
})

watch(
  () => props.modelValue,
  open => {
    if (open && props.date) {
      entries.value = props.staffRows.map(r => ({
        staffId: r.staffId,
        staffName: r.staffName,
        department: r.department,
        originalHours: r.dailyHours[props.date] || 0,
        newHours: r.dailyHours[props.date] || 0
      }))
      selectedStaffId.value = entries.value[0]?.staffId || null
      reason.value = ''
    }
  }
)

function selectStaff(entry: StaffEntry) {
  selectedStaffId.value = entry.staffId
}

function close() {
  emit('update:modelValue', false)
}

async function saveAll() {
  saving.value = true
  try {
    const changed = entries.value.filter(e => e.originalHours !== e.newHours)
    const userId = authStore.currentUser?.id

    for (const entry of changed) {
      if (entry.newHours > 0) {
        await supabase.from('staff_work_logs').upsert(
          {
            staff_id: entry.staffId,
            work_date: props.date,
            hours_worked: entry.newHours,
            edit_reason: reason.value.trim(),
            edited_by: userId,
            edited_at: new Date().toISOString()
          },
          { onConflict: 'staff_id,work_date' }
        )
      } else {
        await supabase
          .from('staff_work_logs')
          .delete()
          .eq('staff_id', entry.staffId)
          .eq('work_date', props.date)
      }
    }

    emit('saved')
    close()
  } catch (e) {
    console.error('Failed to save work logs:', e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.staff-list {
  max-height: 240px;
  overflow-y: auto;
}

.staff-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  &.active-entry {
    background: rgba(var(--v-theme-primary), 0.1);
    border-left: 3px solid rgb(var(--v-theme-primary));
  }
}

.staff-info {
  flex: 1;
}

.staff-name {
  font-weight: 600;
  font-size: 14px;
}

.staff-dept {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.hours-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.old-hours {
  text-decoration: line-through;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
}

.current-hours {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  &.changed {
    color: rgb(var(--v-theme-primary));
  }
}

.keypad-section {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px 16px;
}

.keypad-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.keypad-staff-name {
  font-weight: 600;
  font-size: 14px;
}

.keypad-change {
  font-size: 12px;
  color: rgba(255, 152, 0, 0.8);
}

.reason-section {
  padding: 12px 0 4px;
}
</style>
