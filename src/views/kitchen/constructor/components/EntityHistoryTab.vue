<!-- src/views/kitchen/constructor/components/EntityHistoryTab.vue -->
<template>
  <div class="entity-history">
    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Empty state -->
    <div v-else-if="entries.length === 0" class="text-center pa-8 text-medium-emphasis">
      <v-icon icon="mdi-history" size="48" class="mb-2" />
      <div>No changes recorded yet</div>
    </div>

    <!-- Timeline grouped by day -->
    <template v-else>
      <div v-for="(group, idx) in groupedByDay" :key="idx" class="mb-4">
        <!-- Day header -->
        <div class="text-caption text-medium-emphasis font-weight-bold px-2 mb-2">
          {{ group.label }}
        </div>

        <!-- Entries for this day -->
        <v-timeline density="compact" side="end" class="history-timeline">
          <v-timeline-item
            v-for="entry in group.entries"
            :key="entry.id"
            :dot-color="getChangeColor(entry.changeType)"
            :icon="getChangeIcon(entry.changeType)"
            size="small"
          >
            <div class="history-entry">
              <!-- Header: time + author -->
              <div class="d-flex align-center ga-2 mb-1">
                <span class="text-caption font-weight-medium">
                  {{ formatTime(entry.createdAt) }}
                </span>
                <v-chip size="x-small" variant="tonal" :color="getChangeColor(entry.changeType)">
                  {{ entry.changeType }}
                </v-chip>
                <span class="text-caption text-medium-emphasis">by {{ entry.changedByName }}</span>
              </div>

              <!-- Field changes -->
              <div v-if="entry.changes.fields?.length" class="changes-list">
                <div
                  v-for="(change, i) in entry.changes.fields"
                  :key="'f-' + i"
                  class="change-item text-body-2"
                >
                  <span class="text-medium-emphasis">{{ getLabel(change.field) }}:</span>
                  <span class="text-error text-decoration-line-through ml-1">
                    {{ formatVal(change.field, change.old) }}
                  </span>
                  <v-icon icon="mdi-arrow-right" size="12" class="mx-1" />
                  <span class="font-weight-medium">{{ formatVal(change.field, change.new) }}</span>
                </div>
              </div>

              <!-- Component changes -->
              <div v-if="entry.changes.components?.length" class="changes-list">
                <div
                  v-for="(comp, i) in entry.changes.components"
                  :key="'c-' + i"
                  class="change-item text-body-2"
                >
                  <template v-if="comp.action === 'added'">
                    <v-icon icon="mdi-plus" size="14" color="success" class="mr-1" />
                    <span class="text-success">{{ comp.componentName }}</span>
                    <span v-if="getQuantityDetail(comp)" class="text-medium-emphasis ml-1">
                      {{ getQuantityDetail(comp) }}
                    </span>
                  </template>

                  <template v-else-if="comp.action === 'removed'">
                    <v-icon icon="mdi-minus" size="14" color="error" class="mr-1" />
                    <span class="text-error text-decoration-line-through">
                      {{ comp.componentName }}
                    </span>
                    <span v-if="getOldQuantityDetail(comp)" class="text-medium-emphasis ml-1">
                      {{ getOldQuantityDetail(comp) }}
                    </span>
                  </template>

                  <template v-else-if="comp.action === 'modified'">
                    <v-icon icon="mdi-pencil" size="14" color="warning" class="mr-1" />
                    <span>{{ comp.componentName }}</span>
                    <template v-for="(detail, j) in comp.details" :key="'d-' + j">
                      <span class="text-medium-emphasis ml-1">{{ detail.field }}:</span>
                      <span class="text-error text-decoration-line-through ml-1">
                        {{ detail.old }}
                      </span>
                      <v-icon icon="mdi-arrow-right" size="12" class="mx-1" />
                      <span class="font-weight-medium">{{ detail.new }}</span>
                    </template>
                  </template>
                </div>
              </div>
            </div>
          </v-timeline-item>
        </v-timeline>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { changelogService } from '@/core/changelog'
import type { ChangeLogEntry } from '@/core/changelog'
import { getFieldLabel, formatFieldValue } from '@/core/changelog'

interface Props {
  entityType: 'recipe' | 'preparation' | 'product'
  entityId: string
}

const props = defineProps<Props>()

const entries = ref<ChangeLogEntry[]>([])
const loading = ref(false)
const loaded = ref(false)

// Load history when component mounts or entityId changes
watch(
  () => props.entityId,
  async id => {
    if (!id) return
    // Reset loaded flag when entity changes
    loaded.value = false
    await loadHistory()
  },
  { immediate: true }
)

async function loadHistory() {
  if (!props.entityId || loaded.value) return
  loading.value = true
  try {
    entries.value = await changelogService.getHistory(props.entityType, props.entityId, 100)
    loaded.value = true
  } finally {
    loading.value = false
  }
}

/** Refresh history (called after save) */
function refresh() {
  loaded.value = false
  loadHistory()
}

defineExpose({ refresh })

// Group entries by day
const groupedByDay = computed(() => {
  const groups: { label: string; date: string; entries: ChangeLogEntry[] }[] = []
  const dayMap = new Map<string, ChangeLogEntry[]>()

  for (const entry of entries.value) {
    const date = new Date(entry.createdAt)
    // Use local date for grouping (not UTC)
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, [])
    }
    dayMap.get(dayKey)!.push(entry)
  }

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const yd = new Date(Date.now() - 86400000)
  const yesterday = `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, '0')}-${String(yd.getDate()).padStart(2, '0')}`

  for (const [dayKey, dayEntries] of dayMap) {
    let label: string
    if (dayKey === today) {
      label = 'Today'
    } else if (dayKey === yesterday) {
      label = 'Yesterday'
    } else {
      label = new Date(dayKey + 'T00:00:00').toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }
    groups.push({ label, date: dayKey, entries: dayEntries })
  }

  return groups
})

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function getChangeColor(type: string): string {
  switch (type) {
    case 'created':
      return 'success'
    case 'updated':
      return 'primary'
    case 'archived':
      return 'error'
    case 'restored':
      return 'info'
    case 'cloned':
      return 'secondary'
    default:
      return 'grey'
  }
}

function getChangeIcon(type: string): string {
  switch (type) {
    case 'created':
      return 'mdi-plus'
    case 'updated':
      return 'mdi-pencil'
    case 'archived':
      return 'mdi-archive'
    case 'restored':
      return 'mdi-restore'
    case 'cloned':
      return 'mdi-content-copy'
    default:
      return 'mdi-circle'
  }
}

function getLabel(field: string): string {
  return getFieldLabel(field)
}

function formatVal(field: string, value: any): string {
  return formatFieldValue(field, value)
}

function getQuantityDetail(comp: any): string {
  const qty = comp.details?.find((d: any) => d.field === 'quantity')
  const unit = comp.details?.find((d: any) => d.field === 'unit')
  if (qty?.new != null) {
    return `${qty.new}${unit?.new ? ' ' + unit.new : ''}`
  }
  return ''
}

function getOldQuantityDetail(comp: any): string {
  const qty = comp.details?.find((d: any) => d.field === 'quantity')
  const unit = comp.details?.find((d: any) => d.field === 'unit')
  if (qty?.old != null) {
    return `${qty.old}${unit?.old ? ' ' + unit.old : ''}`
  }
  return ''
}
</script>

<style scoped lang="scss">
.entity-history {
  max-height: 500px;
  overflow-y: auto;
}

.history-timeline {
  :deep(.v-timeline-item__body) {
    padding-block: 4px;
  }
}

.history-entry {
  padding: 4px 0;
}

.changes-list {
  margin-top: 4px;
  padding-left: 4px;
}

.change-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 1px 0;
}
</style>
