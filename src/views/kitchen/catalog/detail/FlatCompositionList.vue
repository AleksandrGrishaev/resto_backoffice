<!-- Simple flat list of ingredients — kitchen-friendly view -->
<template>
  <div class="flat-list">
    <div
      v-for="item in flatItems"
      :key="item.id + item.type"
      class="flat-item"
      :class="{ clickable: item.type !== 'product' }"
      @click="item.type !== 'product' && emit('navigate', { id: item.id, type: item.type })"
    >
      <v-chip :color="typeColor(item.type)" size="x-small" variant="flat" label class="flat-badge">
        {{ typeIcon(item.type) }}
      </v-chip>
      <span class="flat-name">{{ item.name }}</span>
      <span class="flat-dots" />
      <span v-if="item.quantity" class="flat-quantity">{{ item.quantity }}</span>
      <span v-if="item.unit" class="flat-unit">{{ item.unit }}</span>
      <v-icon v-if="item.type !== 'product'" size="16" class="flat-chevron">
        mdi-chevron-right
      </v-icon>
    </div>
    <div v-if="flatItems.length === 0" class="empty-state">No components</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TreeNode } from './DependencyTree.vue'

const props = defineProps<{
  tree: TreeNode[]
}>()

const emit = defineEmits<{
  navigate: [{ id: string; type: TreeNode['type'] }]
}>()

interface FlatItem {
  id: string
  name: string
  type: TreeNode['type']
  quantity?: number
  unit?: string
}

// Flatten tree to direct children only — one level, no nesting
const flatItems = computed<FlatItem[]>(() => {
  return props.tree.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type,
    quantity: node.quantity,
    unit: node.unit
  }))
})

function typeColor(type: TreeNode['type']) {
  switch (type) {
    case 'menu':
      return 'purple'
    case 'recipe':
      return 'green'
    case 'preparation':
      return 'orange'
    case 'product':
      return 'blue'
  }
}

function typeIcon(type: TreeNode['type']) {
  switch (type) {
    case 'menu':
      return 'M'
    case 'recipe':
      return 'R'
    case 'preparation':
      return 'P'
    case 'product':
      return 'I'
  }
}
</script>

<style scoped lang="scss">
.flat-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.flat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px;
  border-radius: 6px;
  min-height: 40px;

  &.clickable {
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    &:active {
      background: rgba(255, 255, 255, 0.08);
    }
  }
}

.flat-badge {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 22px;
  height: 18px;
  padding: 0 4px;
}

.flat-name {
  white-space: nowrap;
  font-size: 0.95rem;
}

.flat-chevron {
  flex-shrink: 0;
  opacity: 0.3;
}

.flat-dots {
  flex: 1;
  border-bottom: 1px dotted rgba(255, 255, 255, 0.15);
  min-width: 12px;
  margin-bottom: 4px;
}

.flat-quantity {
  white-space: nowrap;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.flat-unit {
  white-space: nowrap;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  min-width: 40px;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: rgba(255, 255, 255, 0.4);
}
</style>
