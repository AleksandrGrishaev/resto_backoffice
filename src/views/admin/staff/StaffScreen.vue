<!-- src/views/admin/staff/StaffScreen.vue -->
<template>
  <div class="staff-screen">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between pa-4 pb-0">
      <h2>Staff Management</h2>
      <div v-if="activeTab === 'members'" class="d-flex gap-sm">
        <v-btn variant="outlined" size="small" @click="showShiftPresetsDialog = true">
          <v-icon start>mdi-clock-outline</v-icon>
          Manage Shifts
        </v-btn>
        <v-btn variant="outlined" size="small" @click="showRanksDialog = true">
          <v-icon start>mdi-medal</v-icon>
          Manage Ranks
        </v-btn>
        <v-btn color="primary" size="small" @click="openCreateDialog">
          <v-icon start>mdi-plus</v-icon>
          Add Staff
        </v-btn>
      </div>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" class="px-4">
      <v-tab value="members">Members</v-tab>
      <v-tab value="schedule">Schedule</v-tab>
    </v-tabs>

    <!-- Members tab -->
    <div v-if="activeTab === 'members'" class="tab-content pa-4">
      <!-- Stats -->
      <div class="d-flex gap-sm mb-4">
        <v-chip v-for="dept in departmentStats" :key="dept.name" variant="tonal" size="small">
          {{ dept.label }}: {{ dept.count }}
        </v-chip>
        <v-chip variant="tonal" color="primary" size="small">
          Total: {{ store.activeMembers.length }}
        </v-chip>
      </div>

      <!-- Members Table -->
      <v-card>
        <v-data-table
          :headers="headers"
          :items="store.members"
          :search="search"
          hover
          @click:row="(_: any, row: any) => openEditDialog(row.item)"
        >
          <template #top>
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search staff..."
              single-line
              hide-details
              density="compact"
              class="ma-2"
              style="max-width: 300px"
            />
          </template>

          <template #[`item.department`]="{ value }">
            <v-chip :color="deptColor(value)" size="x-small" variant="tonal">
              {{ DEPARTMENT_LABELS[value as StaffDepartment] }}
            </v-chip>
          </template>

          <template #[`item.rankName`]="{ item }">
            {{ item.rank?.name || '—' }}
          </template>

          <template #[`item.rankSalary`]="{ item }">
            {{ item.rank ? formatIDR(item.rank.baseSalary) : '—' }}
          </template>

          <template #[`item.isActive`]="{ value }">
            <v-icon :color="value ? 'success' : 'grey'" size="small">
              {{ value ? 'mdi-check-circle' : 'mdi-close-circle' }}
            </v-icon>
          </template>

          <template #[`item.actions`]="{ item }">
            <v-btn icon size="x-small" variant="text" @click.stop="openBonusDialog(item)">
              <v-icon size="16">mdi-gift</v-icon>
              <v-tooltip activator="parent" location="top">Bonuses</v-tooltip>
            </v-btn>
            <v-btn
              icon
              size="x-small"
              variant="text"
              color="error"
              @click.stop="confirmDelete(item)"
            >
              <v-icon size="16">mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-card>
    </div>

    <!-- Schedule tab -->
    <div v-if="activeTab === 'schedule'" class="tab-content pa-4">
      <DailySchedule />
    </div>

    <!-- Staff Member Dialog -->
    <StaffMemberDialog
      v-model="showMemberDialog"
      :member="editingMember"
      :ranks="store.activeRanks"
      @save="handleSaveMember"
    />

    <!-- Ranks Dialog -->
    <RanksDialog
      v-model="showRanksDialog"
      :ranks="store.ranks"
      @create="handleCreateRank"
      @update="handleUpdateRank"
      @delete="handleDeleteRank"
    />

    <!-- Shift Presets Dialog -->
    <ShiftPresetsDialog
      v-model="showShiftPresetsDialog"
      :presets="store.shiftPresets"
      @create="handleCreateShiftPreset"
      @update="handleUpdateShiftPreset"
      @delete="handleDeleteShiftPreset"
    />

    <!-- Bonus Dialog -->
    <BonusDialog
      v-model="showBonusDialog"
      :staff-member="bonusTarget"
      :bonuses="targetBonuses"
      @create="handleCreateBonus"
      @update="handleUpdateBonus"
      @delete="handleDeleteBonus"
    />

    <!-- Delete confirmation -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-title>Delete Staff Member</v-card-title>
        <v-card-text>
          Are you sure you want to delete
          <strong>{{ deletingMember?.name }}</strong>
          ?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-btn color="error" @click="handleDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStaffStore, DEPARTMENT_LABELS } from '@/stores/staff'
import type {
  StaffMember,
  StaffRank,
  StaffBonus,
  StaffDepartment,
  ShiftPreset
} from '@/stores/staff'
import { formatIDR } from '@/utils'
import StaffMemberDialog from './components/StaffMemberDialog.vue'
import RanksDialog from './components/RanksDialog.vue'
import BonusDialog from './components/BonusDialog.vue'
import ShiftPresetsDialog from './components/ShiftPresetsDialog.vue'
import DailySchedule from './components/DailySchedule.vue'

const store = useStaffStore()

const activeTab = ref('members')
const search = ref('')
const showMemberDialog = ref(false)
const showRanksDialog = ref(false)
const showShiftPresetsDialog = ref(false)
const showBonusDialog = ref(false)
const showDeleteConfirm = ref(false)
const editingMember = ref<StaffMember | null>(null)
const deletingMember = ref<StaffMember | null>(null)
const bonusTarget = ref<StaffMember | null>(null)

const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Department', key: 'department', sortable: true },
  { title: 'Rank', key: 'rankName', sortable: false },
  { title: 'Base Salary', key: 'rankSalary', sortable: false },
  { title: 'Phone', key: 'phone', sortable: false },
  { title: 'Active', key: 'isActive', sortable: true, align: 'center' as const },
  { title: '', key: 'actions', sortable: false, align: 'end' as const }
]

const departmentStats = computed(() => {
  const counts: Record<string, number> = {}
  for (const m of store.activeMembers) {
    counts[m.department] = (counts[m.department] || 0) + 1
  }
  return Object.entries(DEPARTMENT_LABELS).map(([key, label]) => ({
    name: key,
    label,
    count: counts[key] || 0
  }))
})

const targetBonuses = computed(() => {
  if (!bonusTarget.value) return []
  return store.bonuses.filter(b => b.staffId === bonusTarget.value!.id)
})

function deptColor(dept: string): string {
  const colors: Record<string, string> = {
    kitchen: 'orange',
    bar: 'purple',
    service: 'blue',
    management: 'green'
  }
  return colors[dept] || 'grey'
}

function openCreateDialog() {
  editingMember.value = null
  showMemberDialog.value = true
}

function openEditDialog(member: StaffMember) {
  editingMember.value = member
  showMemberDialog.value = true
}

function openBonusDialog(member: StaffMember) {
  bonusTarget.value = member
  showBonusDialog.value = true
}

function confirmDelete(member: StaffMember) {
  deletingMember.value = member
  showDeleteConfirm.value = true
}

async function handleSaveMember(data: Partial<StaffMember>) {
  try {
    if (editingMember.value) {
      await store.editMember(editingMember.value.id, data)
    } else {
      await store.addMember(data)
    }
    showMemberDialog.value = false
  } catch (e: any) {
    console.error('Save member failed:', e)
  }
}

async function handleDelete() {
  try {
    if (deletingMember.value) {
      await store.removeMember(deletingMember.value.id)
    }
    showDeleteConfirm.value = false
  } catch (e: any) {
    console.error('Delete member failed:', e)
  }
}

async function handleCreateRank(data: Partial<StaffRank>) {
  try {
    await store.addRank(data)
  } catch (e: any) {
    console.error('Create rank failed:', e)
  }
}

async function handleUpdateRank(id: string, data: Partial<StaffRank>) {
  try {
    await store.editRank(id, data)
  } catch (e: any) {
    console.error('Update rank failed:', e)
  }
}

async function handleDeleteRank(id: string) {
  try {
    await store.removeRank(id)
  } catch (e: any) {
    console.error('Delete rank failed:', e)
  }
}

async function handleCreateShiftPreset(data: Partial<ShiftPreset>) {
  try {
    await store.addShiftPreset(data)
  } catch (e: any) {
    console.error('Create shift preset failed:', e)
  }
}

async function handleUpdateShiftPreset(id: string, data: Partial<ShiftPreset>) {
  try {
    await store.editShiftPreset(id, data)
  } catch (e: any) {
    console.error('Update shift preset failed:', e)
  }
}

async function handleDeleteShiftPreset(id: string) {
  try {
    await store.removeShiftPreset(id)
  } catch (e: any) {
    console.error('Delete shift preset failed:', e)
  }
}

async function handleCreateBonus(data: Partial<StaffBonus>) {
  try {
    await store.addBonus(data)
  } catch (e: any) {
    console.error('Create bonus failed:', e)
  }
}

async function handleUpdateBonus(id: string, data: Partial<StaffBonus>) {
  try {
    await store.editBonus(id, data)
  } catch (e: any) {
    console.error('Update bonus failed:', e)
  }
}

async function handleDeleteBonus(id: string) {
  try {
    await store.removeBonus(id)
  } catch (e: any) {
    console.error('Delete bonus failed:', e)
  }
}
</script>

<style scoped lang="scss">
.staff-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
}
</style>
