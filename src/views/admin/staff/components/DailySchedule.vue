<!-- src/views/admin/staff/components/DailySchedule.vue -->
<template>
  <div class="schedule-timeline">
    <!-- Toolbar -->
    <div class="timeline-toolbar">
      <div class="toolbar-info">
        <span class="toolbar-label">Schedule Timeline</span>
        <span class="toolbar-hint">Tap a cell to edit shifts</span>
      </div>
      <v-btn size="small" variant="tonal" @click="scrollToToday">
        <v-icon start size="16">mdi-calendar-today</v-icon>
        Today
      </v-btn>
    </div>

    <div v-if="initialLoading" class="text-center py-8">
      <v-progress-circular indeterminate size="32" />
    </div>

    <!-- Main grid -->
    <div v-else ref="scrollContainer" class="grid-container" @scroll="onScroll">
      <table class="timeline-table">
        <thead>
          <!-- Date headers -->
          <tr class="date-header-row">
            <th class="name-col sticky-col" />
            <th
              v-for="day in days"
              :key="day.date"
              :colspan="HOURS_PER_DAY"
              class="date-header"
              :class="{
                'is-today': day.isToday,
                'is-weekend': day.isWeekend
              }"
            >
              <span class="date-label">{{ day.label }}</span>
              <span class="date-weekday">{{ day.weekday }}</span>
            </th>
          </tr>
          <!-- Hour tick labels — positioned at cell boundaries -->
          <tr class="hour-header-row">
            <th class="name-col sticky-col hour-label-corner">Staff</th>
            <template v-for="day in days" :key="'h-' + day.date">
              <th
                v-for="hour in hourLabels"
                :key="day.date + '-' + hour"
                class="hour-tick"
                :class="{
                  'day-start': hour === GRID_START,
                  'is-now': day.isToday && currentHour === hour
                }"
              >
                <span class="tick-label">{{ hour }}</span>
              </th>
            </template>
          </tr>
        </thead>

        <tbody>
          <template v-for="group in departmentGroups" :key="group.department">
            <tr class="dept-separator">
              <td class="name-col sticky-col dept-label">
                <span :class="'dept-dot dept-' + group.department" />
                {{ DEPARTMENT_LABELS[group.department] }}
              </td>
              <td :colspan="days.length * HOURS_PER_DAY" class="dept-line" />
            </tr>
            <tr v-for="staff in group.members" :key="staff.id" class="staff-row">
              <td class="name-col sticky-col">
                <span class="staff-name">{{ staff.name }}</span>
              </td>
              <template v-for="day in days" :key="day.date + '-' + staff.id">
                <td
                  v-for="hour in hourLabels"
                  :key="day.date + '-' + staff.id + '-' + hour"
                  class="hour-cell"
                  :class="getCellClass(staff.id, staff.department, day, hour)"
                  @click="day.date >= todayStr && openEditor(staff.id, staff.name, day.date)"
                />
              </template>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Inline shift editor dialog -->
    <v-dialog v-model="editorOpen" max-width="480">
      <v-card v-if="editorStaff">
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <div>{{ editorStaff.name }}</div>
            <div class="text-caption text-medium-emphasis">{{ editorDateFormatted }}</div>
          </div>
          <v-btn icon size="small" variant="text" @click="editorOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <TimeSlotEditor v-model="editorSlots" :presets="store.activeShiftPresets" />
        </v-card-text>
        <v-card-actions>
          <div v-if="editorChanged" class="text-caption text-warning ml-2">Unsaved changes</div>
          <v-spacer />
          <v-btn variant="text" @click="editorOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="editorSaving"
            :disabled="!editorChanged"
            @click="saveEditor"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { supabase } from '@/supabase/client'
import { useStaffStore, DEPARTMENT_LABELS, calculateHoursFromSlots } from '@/stores/staff'
import { useAuthStore } from '@/stores/auth'
import type { WorkLog, TimeSlot, StaffDepartment } from '@/stores/staff'
import { mapWorkLogFromDb } from '@/stores/staff/supabaseMappers'
import TimeSlotEditor from '@/components/staff/TimeSlotEditor.vue'

const GRID_START = 6
const GRID_END = 24
const HOURS_PER_DAY = GRID_END - GRID_START
const INITIAL_DAYS_BACK = 7
const INITIAL_DAYS_FORWARD = 3
const LOAD_CHUNK = 7
const MAX_DAYS = 60
const CELL_WIDTH = 40

const hourLabels = Array.from({ length: HOURS_PER_DAY }, (_, i) => i + GRID_START)

const store = useStaffStore()
const authStore = useAuthStore()
const scrollContainer = ref<HTMLElement | null>(null)
const initialLoading = ref(false)
const loadingPast = ref(false)
const loadingFuture = ref(false)
const currentHour = ref(new Date().getHours())
let clockTimer: ReturnType<typeof setInterval> | null = null

interface DayInfo {
  date: string
  label: string
  weekday: string
  isToday: boolean
  isWeekend: boolean
}

interface StaffInfo {
  id: string
  name: string
  department: StaffDepartment
}

interface DeptGroup {
  department: StaffDepartment
  members: StaffInfo[]
}

const days = ref<DayInfo[]>([])
const shiftMap = ref<Map<string, TimeSlot[]>>(new Map())
const rangeStart = ref('')
const rangeEnd = ref('')

const staffRows = computed<StaffInfo[]>(() =>
  store.activeMembers.map(m => ({ id: m.id, name: m.name, department: m.department }))
)

const departmentGroups = computed<DeptGroup[]>(() => {
  const order: StaffDepartment[] = ['kitchen', 'bar', 'service', 'management']
  const groups: DeptGroup[] = []
  for (const dept of order) {
    const members = staffRows.value.filter(s => s.department === dept)
    if (members.length > 0) groups.push({ department: dept, members })
  }
  return groups
})

// =====================================================
// EDITOR STATE
// =====================================================

const editorOpen = ref(false)
const editorSaving = ref(false)
const editorStaff = ref<{ id: string; name: string } | null>(null)
const editorDate = ref('')
const editorSlots = ref<TimeSlot[]>([])
const editorOriginalSlots = ref<TimeSlot[]>([])

const editorDateFormatted = computed(() => {
  if (!editorDate.value) return ''
  const d = new Date(editorDate.value + 'T12:00:00')
  return d.toLocaleDateString('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
})

const editorChanged = computed(
  () => JSON.stringify(editorSlots.value) !== JSON.stringify(editorOriginalSlots.value)
)

function openEditor(staffId: string, staffName: string, date: string) {
  const key = `${staffId}:${date}`
  const existing = shiftMap.value.get(key) || []
  editorStaff.value = { id: staffId, name: staffName }
  editorDate.value = date
  editorSlots.value = existing.map(s => ({ ...s }))
  editorOriginalSlots.value = existing.map(s => ({ ...s }))
  editorOpen.value = true
}

async function saveEditor() {
  if (!editorStaff.value) return
  editorSaving.value = true
  try {
    const staffId = editorStaff.value.id
    const date = editorDate.value
    const slots = editorSlots.value
    const key = `${staffId}:${date}`

    if (slots.length > 0) {
      const hours = calculateHoursFromSlots(slots)
      await supabase.from('staff_work_logs').upsert(
        {
          staff_id: staffId,
          work_date: date,
          hours_worked: hours,
          time_slots: slots,
          recorded_by: authStore.currentUser?.id
        },
        { onConflict: 'staff_id,work_date' }
      )
      shiftMap.value.set(
        key,
        slots.map(s => ({ ...s }))
      )
    } else {
      await supabase.from('staff_work_logs').delete().eq('staff_id', staffId).eq('work_date', date)
      shiftMap.value.delete(key)
    }

    editorOpen.value = false
  } catch (e) {
    console.error('Failed to save shift:', e)
  } finally {
    editorSaving.value = false
  }
}

// =====================================================
// DATE HELPERS
// =====================================================

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const todayStr = ref(formatDateStr(new Date()))

function makeDayInfo(dateStr: string): DayInfo {
  const d = new Date(dateStr + 'T12:00:00')
  const dayNum = d.getDay()
  return {
    date: dateStr,
    label: d.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
    weekday: d.toLocaleDateString('en', { weekday: 'short' }),
    isToday: dateStr === todayStr.value,
    isWeekend: dayNum === 0 || dayNum === 6
  }
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return formatDateStr(d)
}

function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  let cursor = start
  while (cursor <= end) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

// =====================================================
// CELL CLASS
// =====================================================

function getCellClass(
  staffId: string,
  dept: StaffDepartment,
  day: DayInfo,
  hour: number
): Record<string, boolean> {
  const slots = shiftMap.value.get(`${staffId}:${day.date}`)
  const inSlot = slots?.some(s => hour >= s.start && hour < s.end) || false
  const isStart = inSlot && (slots?.some(s => hour === s.start) || false)
  const isEnd = inSlot && (slots?.some(s => hour === s.end - 1) || false)
  const isFuture = day.date > todayStr.value
  const isEditable = day.date >= todayStr.value

  return {
    'in-shift': inSlot,
    'shift-start': isStart,
    'shift-end': isEnd,
    [`dept-bg-${dept}`]: inSlot,
    'day-start': hour === GRID_START,
    'today-col': day.isToday,
    'is-now': day.isToday && currentHour.value === hour,
    'past-cell': !isEditable,
    'future-cell': isEditable && !day.isToday,
    'editable-cell': isEditable
  }
}

// =====================================================
// DATA LOADING
// =====================================================

async function loadShifts(dateFrom: string, dateTo: string) {
  const { data } = await supabase
    .from('staff_work_logs')
    .select('staff_id, work_date, hours_worked, time_slots')
    .gte('work_date', dateFrom)
    .lte('work_date', dateTo)

  const logs: WorkLog[] = (data || []).map(mapWorkLogFromDb)
  for (const log of logs) {
    const key = `${log.staffId}:${log.workDate}`
    if (log.timeSlots && Array.isArray(log.timeSlots) && log.timeSlots.length > 0) {
      shiftMap.value.set(key, log.timeSlots)
    } else if (log.hoursWorked > 0) {
      shiftMap.value.set(key, [{ start: 8, end: Math.min(8 + log.hoursWorked, 24) }])
    }
  }
}

function pruneShiftMap() {
  const validDates = new Set(days.value.map(d => d.date))
  for (const key of shiftMap.value.keys()) {
    const date = key.split(':')[1]
    if (!validDates.has(date)) shiftMap.value.delete(key)
  }
}

async function loadInitial() {
  initialLoading.value = true
  try {
    const start = addDays(todayStr.value, -INITIAL_DAYS_BACK)
    const end = addDays(todayStr.value, INITIAL_DAYS_FORWARD)
    rangeStart.value = start
    rangeEnd.value = end
    days.value = generateDateRange(start, end).map(makeDayInfo)
    await loadShifts(start, end)
    await nextTick()
    scrollToToday()
  } finally {
    initialLoading.value = false
  }
}

async function loadMorePast() {
  if (loadingPast.value) return
  loadingPast.value = true
  try {
    const newEnd = addDays(rangeStart.value, -1)
    const newStart = addDays(newEnd, -(LOAD_CHUNK - 1))
    days.value = [...generateDateRange(newStart, newEnd).map(makeDayInfo), ...days.value]
    rangeStart.value = newStart
    await loadShifts(newStart, newEnd)
    if (days.value.length > MAX_DAYS) {
      days.value = days.value.slice(0, MAX_DAYS)
      rangeEnd.value = days.value[days.value.length - 1].date
      pruneShiftMap()
    }
  } finally {
    loadingPast.value = false
  }
}

async function loadMoreFuture() {
  if (loadingFuture.value) return
  loadingFuture.value = true
  try {
    const newStart = addDays(rangeEnd.value, 1)
    const newEnd = addDays(newStart, LOAD_CHUNK - 1)
    days.value = [...days.value, ...generateDateRange(newStart, newEnd).map(makeDayInfo)]
    rangeEnd.value = newEnd
    await loadShifts(newStart, newEnd)
    if (days.value.length > MAX_DAYS) {
      const excess = days.value.length - MAX_DAYS
      days.value = days.value.slice(excess)
      rangeStart.value = days.value[0].date
      pruneShiftMap()
    }
  } finally {
    loadingFuture.value = false
  }
}

// =====================================================
// SCROLL
// =====================================================

function scrollToToday() {
  const container = scrollContainer.value
  if (!container) return
  const todayIndex = days.value.findIndex(d => d.isToday)
  if (todayIndex < 0) return
  const nameColWidth = 160
  const dayOffset = todayIndex * HOURS_PER_DAY * CELL_WIDTH
  const containerWidth = container.clientWidth
  container.scrollLeft = Math.max(
    0,
    dayOffset - containerWidth / 2 + nameColWidth + (HOURS_PER_DAY * CELL_WIDTH) / 2
  )
}

let scrollDebounce: ReturnType<typeof setTimeout> | null = null

function onScroll() {
  if (scrollDebounce) return
  scrollDebounce = setTimeout(() => {
    scrollDebounce = null
    const container = scrollContainer.value
    if (!container) return
    if (container.scrollLeft < 300 && !loadingPast.value) {
      const prevWidth = container.scrollWidth
      loadMorePast().then(() => {
        nextTick(() => {
          container.scrollLeft += container.scrollWidth - prevWidth
        })
      })
    }
    if (
      container.scrollLeft + container.clientWidth > container.scrollWidth - 300 &&
      !loadingFuture.value
    ) {
      loadMoreFuture()
    }
  }, 200)
}

// =====================================================
// LIFECYCLE
// =====================================================

onMounted(() => {
  loadInitial()
  clockTimer = setInterval(() => {
    currentHour.value = new Date().getHours()
    todayStr.value = formatDateStr(new Date())
  }, 60000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (scrollDebounce) clearTimeout(scrollDebounce)
})
</script>

<style scoped lang="scss">
$cell-w: 40px;
$cell-h: 48px;
$name-w: 160px;

.schedule-timeline {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.timeline-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.toolbar-info {
  display: flex;
  flex-direction: column;
}
.toolbar-label {
  font-size: 15px;
  font-weight: 600;
}
.toolbar-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.grid-container {
  flex: 1;
  overflow: auto;
}

.timeline-table {
  border-collapse: collapse;
  table-layout: fixed;
}

// Sticky name column
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 3;
  background: var(--v-theme-surface);
}

.name-col {
  width: $name-w;
  min-width: $name-w;
  max-width: $name-w;
  padding: 0 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: rgba(0, 0, 0, 0.2);
  border-right: 2px solid rgba(255, 255, 255, 0.1);
}

// Date header
.date-header-row th {
  position: sticky;
  top: 0;
  z-index: 4;
  background: var(--v-theme-surface);
}

.date-header {
  text-align: center;
  padding: 10px 0 4px;
  border-left: 2px solid rgba(255, 255, 255, 0.15);

  &.is-today {
    background: rgba(var(--v-theme-primary), 0.08);
  }
  &.is-weekend {
    background: rgba(255, 255, 255, 0.02);
  }
  &.is-today.is-weekend {
    background: rgba(var(--v-theme-primary), 0.06);
  }
}

.date-label {
  font-size: 14px;
  font-weight: 700;
  display: block;
  line-height: 1.3;
}
.date-weekday {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
}

// Hour tick labels — positioned at LEFT edge = boundary between prev and current cell
.hour-header-row th {
  position: sticky;
  top: 44px;
  z-index: 4;
  background: var(--v-theme-surface);
}

.hour-label-corner {
  z-index: 5;
  font-weight: 600;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.hour-tick {
  width: $cell-w;
  min-width: $cell-w;
  padding: 0;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-right: 1px solid rgba(255, 255, 255, 0.06);

  &.day-start {
    border-left: 2px solid rgba(255, 255, 255, 0.15);
  }

  &.is-now .tick-label {
    color: rgb(var(--v-theme-primary));
    font-weight: 700;
  }
}

// The tick label sits at the LEFT edge of the cell (= boundary marker)
.tick-label {
  position: absolute;
  left: -1px;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.35);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  z-index: 1;
}

// Department
.dept-separator td {
  padding: 0;
}

.dept-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.45);
  padding-top: 14px !important;
  padding-bottom: 6px !important;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dept-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;

  &.dept-kitchen {
    background: rgba(255, 152, 0, 0.8);
  }
  &.dept-bar {
    background: rgba(156, 39, 176, 0.8);
  }
  &.dept-service {
    background: rgba(33, 150, 243, 0.8);
  }
  &.dept-management {
    background: rgba(76, 175, 80, 0.8);
  }
}

.dept-line {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

// Staff row
.staff-row {
  &:hover td {
    background: rgba(255, 255, 255, 0.02);
  }
  &:hover .sticky-col {
    background: rgba(var(--v-theme-primary), 0.08);
  }
}

.staff-name {
  font-size: 15px;
  font-weight: 600;
}

// Hour cells — use inner pseudo-element for shift color so we can add vertical gaps
.hour-cell {
  width: $cell-w;
  min-width: $cell-w;
  height: $cell-h;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  -webkit-tap-highlight-color: transparent;
  position: relative;

  &.day-start {
    border-left: 2px solid rgba(255, 255, 255, 0.15);
  }

  &.today-col {
    background: rgba(var(--v-theme-primary), 0.03);
  }

  &.is-now {
    border-left: 2px solid rgba(var(--v-theme-error), 0.6);
  }

  &.past-cell {
    opacity: 0.5;
  }

  &.future-cell {
    cursor: pointer;

    &:hover {
      box-shadow: inset 0 0 0 2px rgba(var(--v-theme-primary), 0.25);
    }
  }

  // Shift block — drawn as inner element with vertical margin
  &.in-shift::after {
    content: '';
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 0;
    right: 0;
  }

  &.shift-start::after {
    border-top-left-radius: 6px;
    border-bottom-left-radius: 6px;
    left: 2px;
  }

  &.shift-end::after {
    border-top-right-radius: 6px;
    border-bottom-right-radius: 6px;
    right: 2px;
  }

  &.dept-bg-kitchen::after {
    background: rgba(255, 152, 0, 0.45);
  }
  &.dept-bg-bar::after {
    background: rgba(156, 39, 176, 0.45);
  }
  &.dept-bg-service::after {
    background: rgba(33, 150, 243, 0.45);
  }
  &.dept-bg-management::after {
    background: rgba(76, 175, 80, 0.45);
  }
}
</style>
