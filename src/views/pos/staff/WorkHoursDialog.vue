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
        <v-text-field
          v-model="selectedDate"
          type="date"
          density="compact"
          hide-details
          style="max-width: 160px"
          @update:model-value="loadLogs"
        />
      </v-card-title>

      <v-card-text>
        <div v-if="loading" class="text-center py-4">
          <v-progress-circular indeterminate size="32" />
        </div>

        <v-list v-else density="compact">
          <v-list-item v-for="entry in entries" :key="entry.staffId" class="px-0">
            <template #default>
              <div class="d-flex align-center w-100 gap-sm">
                <div class="flex-grow-1">
                  <div class="font-weight-medium text-body-2">{{ entry.name }}</div>
                  <v-chip size="x-small" variant="tonal">{{ entry.department }}</v-chip>
                </div>
                <v-btn
                  icon
                  size="x-small"
                  variant="tonal"
                  :disabled="entry.hours <= 0"
                  @click="entry.hours = Math.max(0, entry.hours - 0.5)"
                >
                  <v-icon size="14">mdi-minus</v-icon>
                </v-btn>
                <v-text-field
                  v-model.number="entry.hours"
                  type="number"
                  density="compact"
                  hide-details
                  min="0"
                  max="24"
                  step="0.5"
                  style="max-width: 80px"
                  class="text-center"
                />
                <v-btn
                  icon
                  size="x-small"
                  variant="tonal"
                  :disabled="entry.hours >= 24"
                  @click="entry.hours = Math.min(24, entry.hours + 0.5)"
                >
                  <v-icon size="14">mdi-plus</v-icon>
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <div v-if="entries.length === 0 && !loading" class="text-center text-medium-emphasis py-4">
          No active staff members
        </div>
      </v-card-text>

      <v-card-actions>
        <div class="text-caption text-medium-emphasis">
          Total: {{ totalHours }}h across {{ entries.filter(e => e.hours > 0).length }} staff
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
import { mapMemberFromDb } from '@/stores/staff/supabaseMappers'
import { mapWorkLogFromDb } from '@/stores/staff/supabaseMappers'
import type { StaffMember, WorkLog } from '@/stores/staff'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [val: boolean] }>()

const authStore = useAuthStore()
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const selectedDate = ref(today)
const loading = ref(false)
const saving = ref(false)

interface Entry {
  staffId: string
  name: string
  department: string
  hours: number
}

const entries = ref<Entry[]>([])

const totalHours = computed(() => entries.value.reduce((sum, e) => sum + e.hours, 0))

watch(
  () => props.modelValue,
  open => {
    if (open) {
      selectedDate.value = today
      loadData()
    }
  }
)

async function loadData() {
  loading.value = true
  try {
    // Fetch active staff members directly (avoid depending on staffStore initialization)
    const { data: membersData } = await supabase
      .from('staff_members')
      .select('*, staff_ranks(*)')
      .eq('is_active', true)
      .order('name')

    const members: StaffMember[] = (membersData || []).map(mapMemberFromDb)

    // Fetch existing logs for date
    const { data: logsData } = await supabase
      .from('staff_work_logs')
      .select('*')
      .eq('work_date', selectedDate.value)

    const logs: WorkLog[] = (logsData || []).map(mapWorkLogFromDb)
    const logMap = new Map(logs.map(l => [l.staffId, l.hoursWorked]))

    entries.value = members.map(m => ({
      staffId: m.id,
      name: m.name,
      department: m.department,
      hours: logMap.get(m.id) ?? 0
    }))
  } finally {
    loading.value = false
  }
}

async function loadLogs() {
  await loadData()
}

async function saveAll() {
  saving.value = true
  try {
    const rows = entries.value
      .filter(e => e.hours > 0)
      .map(e => ({
        staff_id: e.staffId,
        work_date: selectedDate.value,
        hours_worked: e.hours,
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

    // Delete logs for staff with 0 hours (if they had previous entries)
    const zeroStaff = entries.value.filter(e => e.hours === 0).map(e => e.staffId)
    if (zeroStaff.length) {
      await supabase
        .from('staff_work_logs')
        .delete()
        .eq('work_date', selectedDate.value)
        .in('staff_id', zeroStaff)
    }

    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
</script>
