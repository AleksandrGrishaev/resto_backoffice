<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useStaffStore } from '@/stores/staff'
import type { StaffMember } from '@/stores/staff/types'

const props = withDefaults(
  defineProps<{
    modelValue?: string // staff member ID
    department?: 'kitchen' | 'bar'
    label?: string
    required?: boolean
    dense?: boolean
  }>(),
  {
    label: 'Who did this?',
    required: false,
    dense: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'update:staffMember': [member: StaffMember | undefined]
}>()

const staffStore = useStaffStore()

// Ensure staff data is loaded (may not be initialized in kitchen context)
onMounted(async () => {
  if (!staffStore.initialized) {
    await staffStore.initialize()
  }
})

const filteredMembers = computed(() => {
  const active = staffStore.activeMembers
  if (props.department) {
    return active.filter(m => m.department === props.department)
  }
  return active
})

function onSelect(memberId: string | undefined) {
  emit('update:modelValue', memberId || undefined)
  const member = memberId ? filteredMembers.value.find(m => m.id === memberId) : undefined
  emit('update:staffMember', member)
}
</script>

<template>
  <v-select
    :model-value="modelValue"
    :items="filteredMembers"
    item-title="name"
    item-value="id"
    :label="label"
    :rules="required ? [(v: string) => !!v || 'Required'] : []"
    :density="dense ? 'compact' : 'default'"
    :hide-details="dense"
    variant="outlined"
    clearable
    @update:model-value="onSelect"
  >
    <template #item="{ item, props: itemProps }">
      <v-list-item v-bind="itemProps">
        <template #prepend>
          <v-avatar size="28" color="primary" class="mr-2">
            <span class="text-caption font-weight-bold">
              {{ item.raw.name.charAt(0).toUpperCase() }}
            </span>
          </v-avatar>
        </template>
      </v-list-item>
    </template>

    <template #selection="{ item }">
      <v-chip size="small" color="primary" variant="tonal">
        {{ item.raw.name }}
      </v-chip>
    </template>

    <template v-if="!filteredMembers.length" #no-data>
      <v-list-item>
        <v-list-item-title class="text-body-2 text-medium-emphasis">
          No staff members found
        </v-list-item-title>
      </v-list-item>
    </template>
  </v-select>
</template>
