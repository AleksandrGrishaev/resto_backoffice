<!-- src/views/debug/components/JsonNavigator.vue -->
<template>
  <div class="json-navigator fill-height d-flex flex-column">
    <!-- Navigation Header -->
    <div class="json-nav-header pa-3 border-b">
      <div class="d-flex align-center justify-space-between mb-3">
        <h4 class="text-subtitle-1">JSON Navigator</h4>
        <div class="d-flex gap-2">
          <v-btn
            :variant="viewMode === 'tree' ? 'flat' : 'text'"
            size="small"
            icon="mdi-file-tree"
            @click="viewMode = 'tree'"
          >
            <v-icon>mdi-file-tree</v-icon>
            <v-tooltip activator="parent">Tree View</v-tooltip>
          </v-btn>
          <v-btn
            :variant="viewMode === 'raw' ? 'flat' : 'text'"
            size="small"
            icon="mdi-code-json"
            @click="viewMode = 'raw'"
          >
            <v-icon>mdi-code-json</v-icon>
            <v-tooltip activator="parent">Raw JSON</v-tooltip>
          </v-btn>
          <v-btn size="small" icon="mdi-content-copy" variant="text" @click="copyCurrentView">
            <v-icon>mdi-content-copy</v-icon>
            <v-tooltip activator="parent">Copy Current View</v-tooltip>
          </v-btn>
        </div>
      </div>

      <!-- Breadcrumb Navigation -->
      <v-breadcrumbs v-if="currentPath.length > 0" :items="breadcrumbs" density="compact">
        <template #item="{ item }">
          <v-breadcrumbs-item
            :title="item.title"
            :disabled="item.disabled"
            @click="!item.disabled && navigateToPath(item.path)"
          />
        </template>
      </v-breadcrumbs>

      <!-- Quick Filters -->
      <div class="d-flex flex-wrap gap-2 mb-2">
        <v-chip
          v-for="filter in quickFilters"
          :key="filter.key"
          :color="selectedFilter === filter.key ? 'primary' : 'default'"
          :variant="selectedFilter === filter.key ? 'flat' : 'outlined'"
          size="small"
          @click="applyQuickFilter(filter.key)"
        >
          <v-icon start>{{ filter.icon }}</v-icon>
          {{ filter.label }}
          <v-chip v-if="filter.count > 0" size="x-small" class="ms-1">
            {{ filter.count }}
          </v-chip>
        </v-chip>
        <v-chip
          v-if="selectedFilter"
          color="surface"
          variant="outlined"
          size="small"
          @click="clearFilter"
        >
          <v-icon>mdi-close</v-icon>
          Clear
        </v-chip>
      </div>

      <!-- Search -->
      <v-text-field
        v-model="searchQuery"
        placeholder="Search keys, values, or types..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        @input="handleSearch"
      />
    </div>

    <!-- Content Area -->
    <div class="json-content flex-grow-1 overflow-auto">
      <!-- Tree View -->
      <div v-if="viewMode === 'tree'" class="json-tree pa-3">
        <json-tree-node
          v-for="(value, key) in filteredData"
          :key="key"
          :node-key="String(key)"
          :value="value"
          :path="[String(key)]"
          :level="0"
          :search-query="searchQuery"
          @navigate="handleNavigate"
          @copy="handleCopyNode"
        />
      </div>

      <!-- Raw JSON View -->
      <div v-else class="json-raw pa-3">
        <pre class="json-code"><code>{{ formattedJson }}</code></pre>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="json-status-bar pa-2 border-t d-flex align-center justify-space-between">
      <div class="text-caption">
        <span>
          {{ typeof filteredData === 'object' ? Object.keys(filteredData).length : 0 }} keys
        </span>
        <span v-if="currentPath.length > 0" class="ms-3">Path: {{ currentPath.join('.') }}</span>
      </div>
      <div class="text-caption">
        <span>{{ formatDataSize(JSON.stringify(currentData).length) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { DebugUtils } from '@/utils'
import JsonTreeNode from './JsonTreeNode.vue'

const MODULE_NAME = 'JsonNavigator'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  data: any
  initialPath?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  initialPath: () => []
})

const emit = defineEmits<{
  navigate: [path: string[]]
  copy: [content: string]
}>()

// =============================================
// STATE
// =============================================

const viewMode = ref<'tree' | 'raw'>('tree')
const currentPath = ref<string[]>([...props.initialPath])
const selectedFilter = ref<string | null>(null)
const searchQuery = ref('')

// =============================================
// COMPUTED
// =============================================

const currentData = computed(() => {
  try {
    let data = props.data

    // Navigate to current path
    for (const key of currentPath.value) {
      if (data && typeof data === 'object' && key in data) {
        data = data[key]
      } else {
        // Path is invalid - we'll handle this in a watcher instead
        return props.data
      }
    }

    return data
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error navigating to path', {
      error,
      path: currentPath.value
    })
    return props.data
  }
})

// Отдельная функция для проверки валидности пути
const isPathValid = computed(() => {
  try {
    let data = props.data

    for (const key of currentPath.value) {
      if (data && typeof data === 'object' && key in data) {
        data = data[key]
      } else {
        return false
      }
    }

    return true
  } catch {
    return false
  }
})

const quickFilters = computed(() => {
  const data = props.data
  if (!data || typeof data !== 'object') return []

  const filters = [
    {
      key: 'arrays',
      label: 'Arrays',
      icon: 'mdi-format-list-bulleted',
      count: countDataType(data, 'array')
    },
    {
      key: 'objects',
      label: 'Objects',
      icon: 'mdi-code-braces',
      count: countDataType(data, 'object')
    },
    {
      key: 'loading',
      label: 'Loading States',
      icon: 'mdi-loading',
      count: countKeyPattern(data, /loading|Loading/)
    },
    {
      key: 'error',
      label: 'Errors',
      icon: 'mdi-alert-circle',
      count: countKeyPattern(data, /error|Error/)
    },
    {
      key: 'ids',
      label: 'IDs',
      icon: 'mdi-identifier',
      count: countKeyPattern(data, /id|Id|ID/)
    },
    {
      key: 'counts',
      label: 'Counts',
      icon: 'mdi-counter',
      count: countKeyPattern(data, /count|Count|length|Length/)
    }
  ]

  return filters.filter(f => f.count > 0)
})

const filteredData = computed(() => {
  let data = currentData.value

  if (!data || typeof data !== 'object') {
    return {}
  }

  // Apply filter
  if (selectedFilter.value) {
    data = applyFilter(data, selectedFilter.value)
  }

  // Apply search
  if (searchQuery.value) {
    data = applySearch(data, searchQuery.value)
  }

  return data || {}
})

const formattedJson = computed(() => {
  try {
    return JSON.stringify(filteredData.value, null, 2)
  } catch (error) {
    return 'Error formatting JSON: ' + String(error)
  }
})

const breadcrumbs = computed(() => {
  const crumbs: Array<{
    title: string
    path: string[]
    disabled: boolean
  }> = [
    {
      title: 'root',
      path: [],
      disabled: false
    }
  ]

  let path: string[] = []
  for (const segment of currentPath.value) {
    path = [...path, segment]
    crumbs.push({
      title: segment,
      path: [...path],
      disabled: false
    })
  }

  // Mark last item as disabled (current location)
  if (crumbs.length > 0) {
    crumbs[crumbs.length - 1].disabled = true
  }

  return crumbs
})

// =============================================
// METHODS
// =============================================

function countDataType(obj: any, type: 'array' | 'object'): number {
  if (!obj || typeof obj !== 'object') return 0

  let count = 0

  function traverse(value: any) {
    if (type === 'array' && Array.isArray(value)) {
      count++
    } else if (type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
      count++
    }

    if (Array.isArray(value)) {
      value.forEach(traverse)
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(traverse)
    }
  }

  Object.values(obj).forEach(traverse)
  return count
}

function countKeyPattern(obj: any, pattern: RegExp): number {
  if (!obj || typeof obj !== 'object') return 0

  let count = 0

  function traverse(value: any) {
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(key => {
        if (pattern.test(key)) {
          count++
        }
        traverse(value[key])
      })
    }
  }

  traverse(obj)
  return count
}

function applyFilter(data: any, filterKey: string): any {
  if (!data || typeof data !== 'object') return {}

  const filtered: any = Array.isArray(data) ? [] : {}

  function matchesFilter(key: string, value: any): boolean {
    switch (filterKey) {
      case 'arrays':
        return Array.isArray(value)
      case 'objects':
        return value && typeof value === 'object' && !Array.isArray(value)
      case 'loading':
        return /loading|Loading/.test(key)
      case 'error':
        return /error|Error/.test(key)
      case 'ids':
        return /id|Id|ID/.test(key)
      case 'counts':
        return /count|Count|length|Length/.test(key)
      default:
        return true
    }
  }

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      if (matchesFilter(String(index), item)) {
        filtered.push(item)
      }
    })
  } else {
    Object.entries(data).forEach(([key, value]) => {
      if (matchesFilter(key, value)) {
        filtered[key] = value
      }
    })
  }

  return filtered
}

function applySearch(data: any, query: string): any {
  if (!data || typeof data !== 'object' || !query) return data

  const lowerQuery = query.toLowerCase()
  const filtered: any = Array.isArray(data) ? [] : {}

  function matchesSearch(key: string, value: any): boolean {
    // Search in key
    if (key.toLowerCase().includes(lowerQuery)) return true

    // Search in value
    if (typeof value === 'string' && value.toLowerCase().includes(lowerQuery)) return true
    if (typeof value === 'number' && String(value).includes(query)) return true
    if (typeof value === 'boolean' && String(value).includes(lowerQuery)) return true

    // Search in nested objects (shallow search only for performance)
    if (value && typeof value === 'object') {
      try {
        const stringified = JSON.stringify(value).toLowerCase()
        return stringified.includes(lowerQuery)
      } catch {
        return false
      }
    }

    return false
  }

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      if (matchesSearch(String(index), item)) {
        filtered.push(item)
      }
    })
  } else {
    Object.entries(data).forEach(([key, value]) => {
      if (matchesSearch(key, value)) {
        filtered[key] = value
      }
    })
  }

  return filtered
}

function applyQuickFilter(filterKey: string) {
  if (selectedFilter.value === filterKey) {
    clearFilter()
  } else {
    selectedFilter.value = filterKey
    DebugUtils.debug(MODULE_NAME, `Applied filter: ${filterKey}`)
  }
}

function clearFilter() {
  selectedFilter.value = null
  DebugUtils.debug(MODULE_NAME, 'Cleared filter')
}

function navigateToPath(path: string[]) {
  currentPath.value = [...path]
  emit('navigate', path)
  DebugUtils.debug(MODULE_NAME, 'Navigated to path', { path })
}

function handleNavigate(path: string[]) {
  navigateToPath([...currentPath.value, ...path])
}

function handleSearch() {
  DebugUtils.debug(MODULE_NAME, 'Search query changed', { query: searchQuery.value })
}

async function copyCurrentView() {
  try {
    const content =
      viewMode.value === 'raw' ? formattedJson.value : JSON.stringify(filteredData.value, null, 2)

    await navigator.clipboard.writeText(content)
    emit('copy', content)

    DebugUtils.info(MODULE_NAME, 'Content copied to clipboard', {
      viewMode: viewMode.value,
      size: content.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to copy content', { error })
  }
}

function handleCopyNode(content: string) {
  emit('copy', content)
}

function formatDataSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// =============================================
// WATCHERS
// =============================================

// Отдельный watcher для обработки невалидного пути
watch(
  [() => props.data, isPathValid],
  ([newData, pathValid]) => {
    if (!pathValid && currentPath.value.length > 0) {
      // Reset to root if path becomes invalid
      nextTick(() => {
        currentPath.value = []
        DebugUtils.debug(MODULE_NAME, 'Reset path due to invalid navigation')
      })
    }
  },
  { immediate: true }
)

watch(
  () => props.data,
  () => {
    // Reset navigation when data changes
    currentPath.value = [...props.initialPath]
    selectedFilter.value = null
    searchQuery.value = ''
  },
  { deep: true }
)

watch(currentPath, newPath => {
  emit('navigate', newPath)
})

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  DebugUtils.debug(MODULE_NAME, 'JsonNavigator mounted', {
    hasData: !!props.data,
    initialPath: props.initialPath
  })
})
</script>

<style lang="scss" scoped>
.json-navigator {
  background: rgb(var(--v-theme-background));
  border-radius: 8px;
  overflow: hidden;
}

.json-nav-header {
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.json-content {
  background: rgb(var(--v-theme-background));
}

.json-tree {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.json-raw {
  .json-code {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
    background: rgba(var(--v-theme-surface), 0.5);
    border-radius: 4px;
    padding: 16px;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-x: auto;
    margin: 0;
  }
}

.json-status-bar {
  background: rgba(var(--v-theme-surface), 0.8);
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

// Border utilities
.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.border-t {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
