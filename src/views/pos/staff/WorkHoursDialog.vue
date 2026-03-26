<!-- src/views/pos/staff/WorkHoursDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Work Hours</span>
        <span class="text-body-2 text-medium-emphasis">{{ formattedToday }}</span>
      </v-card-title>

      <v-card-text class="pa-0">
        <div v-if="loading" class="text-center py-4">
          <v-progress-circular indeterminate size="32" />
        </div>

        <template v-else>
          <!-- Staff list -->
          <div class="staff-list">
            <div
              v-for="entry in entries"
              :key="entry.staffId"
              class="staff-entry"
              :class="{ expanded: expandedStaffId === entry.staffId }"
            >
              <!-- Collapsed row -->
              <div class="staff-header" @click="toggleExpand(entry.staffId)">
                <div class="staff-info">
                  <span class="staff-name">{{ entry.name }}</span>
                  <v-chip size="x-small" variant="tonal">{{ entry.department }}</v-chip>
                </div>
                <div class="d-flex align-center gap-sm">
                  <div v-if="entry.timeSlots.length" class="slot-chips">
                    <span v-for="(slot, i) in entry.timeSlots" :key="i" class="slot-badge">
                      {{ formatHour(slot.start) }}-{{ formatHour(slot.end) }}
                    </span>
                  </div>
                  <span class="hours-total">{{ calculateHours(entry.timeSlots) }}h</span>
                  <v-icon size="18" class="expand-arrow">
                    {{ expandedStaffId === entry.staffId ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                  </v-icon>
                </div>
              </div>

              <!-- Expanded: hour grid editor -->
              <div v-if="expandedStaffId === entry.staffId" class="editor-panel">
                <TimeSlotEditor
                  :model-value="entry.timeSlots"
                  :presets="shiftPresets"
                  @update:model-value="entry.timeSlots = $event"
                />
              </div>
            </div>
          </div>

          <div v-if="entries.length === 0" class="text-center text-medium-emphasis py-4">
            No active staff members
          </div>
        </template>
      </v-card-text>

      <v-card-actions>
        <div class="text-caption text-medium-emphasis">
          Total: {{ totalHours }}h across {{ activeStaffCount }} staff
        </div>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="saveAll">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { supabase } from '@/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { mapMemberFromDb, mapWorkLogFromDb } from '@/stores/staff/supabaseMappers'
import type { StaffMember, WorkLog, TimeSlot, ShiftPreset } from '@/stores/staff'
import { calculateHoursFromSlots, formatHour } from '@/stores/staff'
import TimeSlotEditor from '@/components/staff/TimeSlotEditor.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [val: boolean] }>()

const authStore = useAuthStore()
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const formattedToday = now.toLocaleDateString('en', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})
const loading = ref(false)
const saving = ref(false)
const expandedStaffId = ref<string | null>(null)

interface Entry {
  staffId: string
  name: string
  department: string
  timeSlots: TimeSlot[]
}

const entries = ref<Entry[]>([])
const shiftPresets = ref<ShiftPreset[]>([])

function calculateHours(slots: TimeSlot[]): number {
  return calculateHoursFromSlots(slots)
}

const totalHours = computed(() =>
  entries.value.reduce((sum, e) => sum + calculateHours(e.timeSlots), 0)
)

const activeStaffCount = computed(() => entries.value.filter(e => e.timeSlots.length > 0).length)

watch(
  () => props.modelValue,
  open => {
    if (open) {
      expandedStaffId.value = null
      loadData()
    }
  }
)

function toggleExpand(staffId: string) {
  expandedStaffId.value = expandedStaffId.value === staffId ? null : staffId
}

async function loadData() {
  loading.value = true
  try {
    const [membersRes, logsRes, presetsRes] = await Promise.all([
      supabase
        .from('staff_members')
        .select('*, staff_ranks(*)')
        .eq('is_active', true)
        .order('name'),
      supabase.from('staff_work_logs').select('*').eq('work_date', today),
      supabase.from('staff_shift_presets').select('*').eq('is_active', true).order('sort_order')
    ])

    const members: StaffMember[] = (membersRes.data || []).map(mapMemberFromDb)
    const logs: WorkLog[] = (logsRes.data || []).map(mapWorkLogFromDb)
    const logMap = new Map(logs.map(l => [l.staffId, l]))

    shiftPresets.value = (presetsRes.data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      startHour: r.start_hour,
      endHour: r.end_hour,
      sortOrder: r.sort_order ?? 0,
      isActive: r.is_active ?? true,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))

    entries.value = members.map(m => {
      const log = logMap.get(m.id)
      let timeSlots: TimeSlot[] = []
      if (log?.timeSlots && Array.isArray(log.timeSlots) && log.timeSlots.length > 0) {
        timeSlots = log.timeSlots
      } else if (log && log.hoursWorked > 0) {
        const end = Math.min(8 + log.hoursWorked, 24)
        timeSlots = [{ start: 8, end }]
      }
      return { staffId: m.id, name: m.name, department: m.department, timeSlots }
    })
  } finally {
    loading.value = false
  }
}

async function saveAll() {
  saving.value = true
  try {
    const rows = entries.value
      .filter(e => e.timeSlots.length > 0)
      .map(e => ({
        staff_id: e.staffId,
        work_date: today,
        hours_worked: calculateHours(e.timeSlots),
        time_slots: e.timeSlots,
        recorded_by: authStore.currentUser?.id
      }))

    if (rows.length) {
      const { error: upsertErr } = await supabase
        .from('staff_work_logs')
        .upsert(rows, { onConflict: 'staff_id,work_date' })
      if (upsertErr) {
        console.error('Failed to save work logs:', upsertErr)
        return
      }
    }

    const emptyStaff = entries.value.filter(e => e.timeSlots.length === 0).map(e => e.staffId)
    if (emptyStaff.length) {
      await supabase
        .from('staff_work_logs')
        .delete()
        .eq('work_date', today)
        .in('staff_id', emptyStaff)
    }

    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.staff-list {
  max-height: 500px;
  overflow-y: auto;
}

.staff-entry {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  &.expanded {
    background: rgba(var(--v-theme-primary), 0.03);
  }
}

.staff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: rgba(255, 255, 255, 0.04);
  }
}

.staff-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.staff-name {
  font-weight: 600;
  font-size: 15px;
}

.slot-chips {
  display: flex;
  gap: 4px;
}

.slot-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
  white-space: nowrap;
}

.hours-total {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 32px;
  text-align: right;
}

.expand-arrow {
  opacity: 0.4;
}

.editor-panel {
  padding: 4px 16px 16px;
}
</style>
