<!-- src/views/debug/components/JsonTreeNode.vue -->
<template>
  <div class="json-tree-node" :class="{ 'is-expanded': isExpanded }">
    <!-- Node Header -->
    <div
      class="node-header d-flex align-center"
      :class="{
        'is-clickable': isExpandable,
        'is-highlighted': isHighlighted
      }"
      :style="{ paddingLeft: `${level * 16}px` }"
      @click="toggleExpand"
    >
      <!-- Expand/Collapse Icon -->
      <v-icon
        v-if="isExpandable"
        :icon="isExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
        size="16"
        class="expand-icon me-1"
      />
      <div v-else class="expand-spacer me-1"></div>

      <!-- Type Icon -->
      <v-icon :icon="typeIcon" :color="typeColor" size="14" class="type-icon me-2" />

      <!-- Key -->
      <span class="node-key" :class="keyClass">{{ displayKey }}</span>

      <!-- Separator -->
      <span class="separator mx-1">:</span>

      <!-- Value Preview -->
      <div class="node-value flex-grow-1 d-flex align-center">
        <span class="value-preview" :class="valueClass">{{ valuePreview }}</span>

        <!-- Metadata -->
        <div class="node-metadata ms-2 d-flex align-center gap-1">
          <!-- Size indicator for arrays/objects -->
          <v-chip v-if="sizeInfo" size="x-small" variant="tonal" :color="sizeColor">
            {{ sizeInfo }}
          </v-chip>

          <!-- Type indicator -->
          <v-chip size="x-small" variant="outlined" :color="typeColor">
            {{ valueType }}
          </v-chip>
        </div>

        <!-- Actions -->
        <div class="node-actions ms-auto d-flex align-center gap-1">
          <!-- Navigate button for objects/arrays -->
          <v-btn
            v-if="isNavigable"
            icon="mdi-arrow-right"
            size="x-small"
            variant="text"
            @click.stop="handleNavigate"
          >
            <v-icon size="12">mdi-arrow-right</v-icon>
            <v-tooltip activator="parent">Navigate to {{ nodeKey }}</v-tooltip>
          </v-btn>

          <!-- Copy button -->
          <v-btn icon="mdi-content-copy" size="x-small" variant="text" @click.stop="handleCopy">
            <v-icon size="12">mdi-content-copy</v-icon>
            <v-tooltip activator="parent">Copy {{ nodeKey }}</v-tooltip>
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Expanded Children -->
    <div v-if="isExpanded && isExpandable" class="node-children">
      <JsonTreeNode
        v-for="(childValue, childKey) in childEntries"
        :key="childKey"
        :node-key="String(childKey)"
        :value="childValue"
        :path="[...path, String(childKey)]"
        :level="level + 1"
        :search-query="searchQuery"
        @navigate="$emit('navigate', $event)"
        @copy="$emit('copy', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'

// Определение имени компонента для рекурсивного использования
defineOptions({
  name: 'JsonTreeNode'
})

const MODULE_NAME = 'JsonTreeNode'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  nodeKey: string
  value: any
  path: string[]
  level: number
  searchQuery?: string
}

const props = withDefaults(defineProps<Props>(), {
  searchQuery: ''
})

const emit = defineEmits<{
  navigate: [path: string[]]
  copy: [content: string]
}>()

// =============================================
// STATE
// =============================================

const isExpanded = ref(false)

// =============================================
// COMPUTED
// =============================================

const valueType = computed(() => {
  if (props.value === null) return 'null'
  if (props.value === undefined) return 'undefined'
  if (Array.isArray(props.value)) return 'array'
  if (typeof props.value === 'object') return 'object'
  return typeof props.value
})

const isExpandable = computed(() => {
  return valueType.value === 'array' || valueType.value === 'object'
})

const isNavigable = computed(() => {
  return isExpandable.value && getSize() > 0
})

const displayKey = computed(() => {
  // Highlight search matches in key
  if (props.searchQuery && props.nodeKey.toLowerCase().includes(props.searchQuery.toLowerCase())) {
    return props.nodeKey // TODO: Add highlighting
  }
  return props.nodeKey
})

const valuePreview = computed(() => {
  const value = props.value

  try {
    switch (valueType.value) {
      case 'array':
        if (value.length === 0) return '[]'
        const arrayPreview = value.slice(0, 3).map(formatPreviewValue).join(', ')
        return `[${arrayPreview}${value.length > 3 ? ', ...' : ''}]`

      case 'object':
        if (Object.keys(value).length === 0) return '{}'
        const objKeys = Object.keys(value).slice(0, 3)
        const objPreview = objKeys
          .map(key => `${key}: ${formatPreviewValue(value[key])}`)
          .join(', ')
        return `{${objPreview}${Object.keys(value).length > 3 ? ', ...' : '}}'}`

      case 'string':
        const stringValue = String(value)
        if (stringValue.length > 50) {
          return `"${stringValue.substring(0, 47)}..."`
        }
        return `"${stringValue}"`

      case 'null':
        return 'null'

      case 'undefined':
        return 'undefined'

      default:
        return String(value)
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error generating value preview', { error, value })
    return '[Error]'
  }
})

const sizeInfo = computed(() => {
  const size = getSize()
  if (size === 0) return null

  switch (valueType.value) {
    case 'array':
      return `${size} item${size !== 1 ? 's' : ''}`
    case 'object':
      return `${size} key${size !== 1 ? 's' : ''}`
    default:
      return null
  }
})

const sizeColor = computed(() => {
  const size = getSize()
  if (size === 0) return 'surface'
  if (size < 5) return 'success'
  if (size < 20) return 'warning'
  return 'error'
})

const typeIcon = computed(() => {
  switch (valueType.value) {
    case 'array':
      return 'mdi-format-list-bulleted'
    case 'object':
      return 'mdi-code-braces'
    case 'string':
      return 'mdi-format-quote-close'
    case 'number':
      return 'mdi-numeric'
    case 'boolean':
      return 'mdi-checkbox-marked-circle'
    case 'null':
      return 'mdi-null'
    case 'undefined':
      return 'mdi-help-circle'
    default:
      return 'mdi-help-circle'
  }
})

const typeColor = computed(() => {
  switch (valueType.value) {
    case 'array':
      return 'blue'
    case 'object':
      return 'green'
    case 'string':
      return 'orange'
    case 'number':
      return 'purple'
    case 'boolean':
      return 'teal'
    case 'null':
    case 'undefined':
      return 'grey'
    default:
      return 'grey'
  }
})

const keyClass = computed(() => ({
  'key-highlighted': isHighlighted.value
}))

const valueClass = computed(() => ({
  [`value-${valueType.value}`]: true,
  'value-highlighted': isHighlighted.value
}))

const isHighlighted = computed(() => {
  if (!props.searchQuery) return false

  const query = props.searchQuery.toLowerCase()

  // Highlight if key matches
  if (props.nodeKey.toLowerCase().includes(query)) return true

  // Highlight if value matches (for primitives)
  if (!isExpandable.value) {
    try {
      const stringValue = String(props.value).toLowerCase()
      return stringValue.includes(query)
    } catch {
      return false
    }
  }

  return false
})

const childEntries = computed(() => {
  if (!isExpandable.value) return {}

  try {
    if (Array.isArray(props.value)) {
      // For arrays, limit to first 100 items for performance
      const maxItems = Math.min(100, props.value.length)
      const entries: Record<string, any> = {}

      for (let i = 0; i < maxItems; i++) {
        entries[i] = props.value[i]
      }

      if (props.value.length > maxItems) {
        entries[`... ${props.value.length - maxItems} more items`] = null
      }

      return entries
    }

    if (typeof props.value === 'object' && props.value !== null) {
      // For objects, limit to first 50 keys for performance
      const keys = Object.keys(props.value)
      const maxKeys = Math.min(50, keys.length)
      const entries: Record<string, any> = {}

      for (let i = 0; i < maxKeys; i++) {
        const key = keys[i]
        entries[key] = props.value[key]
      }

      if (keys.length > maxKeys) {
        entries[`... ${keys.length - maxKeys} more keys`] = null
      }

      return entries
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error generating child entries', { error, value: props.value })
  }

  return {}
})

// =============================================
// METHODS
// =============================================

function getSize(): number {
  try {
    if (Array.isArray(props.value)) return props.value.length
    if (typeof props.value === 'object' && props.value !== null) {
      return Object.keys(props.value).length
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error calculating size', { error })
  }
  return 0
}

function formatPreviewValue(value: any): string {
  try {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') {
      return value.length > 20 ? `"${value.substring(0, 17)}..."` : `"${value}"`
    }
    if (typeof value === 'object') {
      return Array.isArray(value) ? '[...]' : '{...}'
    }
    return String(value)
  } catch (error) {
    return '[Error]'
  }
}

function toggleExpand() {
  if (!isExpandable.value) return

  isExpanded.value = !isExpanded.value

  DebugUtils.debug(MODULE_NAME, `Toggled expansion for ${props.nodeKey}`, {
    expanded: isExpanded.value,
    path: props.path
  })
}

function handleNavigate() {
  emit('navigate', [props.nodeKey])
  DebugUtils.debug(MODULE_NAME, `Navigate to ${props.nodeKey}`, { path: props.path })
}

async function handleCopy() {
  try {
    const content = JSON.stringify(props.value, null, 2)
    await navigator.clipboard.writeText(content)
    emit('copy', content)

    DebugUtils.info(MODULE_NAME, `Copied ${props.nodeKey} to clipboard`, {
      size: content.length,
      path: props.path
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, `Failed to copy ${props.nodeKey}`, { error })
  }
}
</script>

<style lang="scss" scoped>
.json-tree-node {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;

  .node-header {
    min-height: 24px;
    padding: 2px 4px;
    border-radius: 4px;
    transition: background-color 0.2s;

    &.is-clickable {
      cursor: pointer;

      &:hover {
        background: rgba(var(--v-theme-primary), 0.08);
      }
    }

    &.is-highlighted {
      background: rgba(var(--v-theme-warning), 0.15);
    }
  }

  .expand-icon {
    transition: transform 0.2s;
  }

  .expand-spacer {
    width: 16px;
    height: 16px;
  }

  .type-icon {
    opacity: 0.7;
  }

  .node-key {
    font-weight: 500;
    color: rgb(var(--v-theme-primary));

    &.key-highlighted {
      background: rgba(var(--v-theme-warning), 0.3);
      padding: 0 2px;
      border-radius: 2px;
    }
  }

  .separator {
    opacity: 0.6;
  }

  .value-preview {
    font-size: 13px;

    &.value-string {
      color: rgb(var(--v-theme-success));
    }

    &.value-number {
      color: rgb(var(--v-theme-info));
    }

    &.value-boolean {
      color: rgb(var(--v-theme-secondary));
    }

    &.value-null,
    &.value-undefined {
      color: rgb(var(--v-theme-error));
      font-style: italic;
    }

    &.value-array,
    &.value-object {
      color: rgba(var(--v-theme-on-surface), 0.7);
    }

    &.value-highlighted {
      background: rgba(var(--v-theme-warning), 0.3);
      padding: 0 2px;
      border-radius: 2px;
    }
  }

  .node-metadata {
    opacity: 0.8;
  }

  .node-actions {
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .node-actions {
    opacity: 1;
  }

  .node-children {
    border-left: 1px solid rgba(var(--v-border-color), 0.3);
    margin-left: 8px;
  }

  &.is-expanded {
    .expand-icon {
      transform: rotate(90deg);
    }
  }
}

// Dark mode adjustments
@media (prefers-color-scheme: dark) {
  .json-tree-node {
    .node-key {
      color: rgb(var(--v-theme-primary-lighten-1));
    }

    .value-preview {
      &.value-string {
        color: #98d982;
      }

      &.value-number {
        color: #79c0ff;
      }

      &.value-boolean {
        color: #d2a8ff;
      }
    }
  }
}
</style>
