<!-- Recursive dependency tree for menu items, recipes, preparations -->
<template>
  <div class="dependency-tree">
    <div v-for="node in tree" :key="node.id + node.type" class="tree-node">
      <div
        class="node-row"
        :class="{ clickable: node.type !== 'product' }"
        @click="handleNodeClick(node)"
      >
        <!-- Expand/collapse toggle -->
        <v-btn
          v-if="node.children.length > 0"
          icon
          variant="text"
          size="x-small"
          density="compact"
          class="expand-btn"
          @click.stop="toggleExpand(node.id + node.type)"
        >
          <v-icon size="16">
            {{ isExpanded(node.id + node.type) ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
          </v-icon>
        </v-btn>
        <div v-else class="expand-placeholder" />

        <!-- Type badge -->
        <v-chip
          :color="typeColor(node.type)"
          size="x-small"
          variant="flat"
          label
          class="type-badge"
        >
          {{ typeIcon(node.type) }}
        </v-chip>

        <!-- Name -->
        <span class="node-name">{{ node.name }}</span>

        <!-- Dots -->
        <span class="node-dots" />

        <!-- Quantity + unit -->
        <span v-if="node.quantity" class="node-quantity">{{ node.quantity }} {{ node.unit }}</span>

        <!-- Cost -->
        <span v-if="node.cost" class="node-cost">
          {{ formatIDR(node.cost) }}
        </span>

        <!-- Edit button -->
        <v-btn
          icon="mdi-pencil-outline"
          variant="text"
          size="x-small"
          density="compact"
          class="edit-btn"
          @click.stop="emit('edit', { id: node.id, type: node.type })"
        />
      </div>

      <!-- Children (recursive) -->
      <div v-if="node.children.length > 0 && isExpanded(node.id + node.type)" class="node-children">
        <DependencyTree
          :tree="node.children"
          :depth="depth + 1"
          :default-expand-depth="defaultExpandDepth"
          @navigate="emit('navigate', $event)"
          @edit="emit('edit', $event)"
        />

        <!-- Summary: total cost + output yield -->
        <div v-if="node.totalRecipeCost" class="node-summary">
          <span class="summary-label">
            Total{{ node.outputQuantity ? ` (${node.outputQuantity} ${node.outputUnit})` : '' }}:
          </span>
          <span class="summary-cost">{{ formatIDR(node.totalRecipeCost) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatIDR } from '@/utils'

export interface TreeNode {
  id: string
  name: string
  type: 'menu' | 'recipe' | 'preparation' | 'product'
  quantity?: number
  unit?: string
  cost?: number
  children: TreeNode[]
  // Full recipe/preparation output info
  outputQuantity?: number
  outputUnit?: string
  totalRecipeCost?: number
}

const props = withDefaults(
  defineProps<{
    tree: TreeNode[]
    depth?: number
    defaultExpandDepth?: number
  }>(),
  {
    depth: 0,
    defaultExpandDepth: 2
  }
)

const emit = defineEmits<{
  navigate: [{ id: string; type: TreeNode['type'] }]
  edit: [{ id: string; type: TreeNode['type'] }]
}>()

const expandedNodes = ref<Set<string>>(new Set())

onMounted(() => {
  // Auto-expand nodes up to defaultExpandDepth
  if (props.depth < props.defaultExpandDepth) {
    for (const node of props.tree) {
      if (node.children.length > 0) {
        expandedNodes.value.add(node.id + node.type)
      }
    }
  }
})

function isExpanded(key: string) {
  return expandedNodes.value.has(key)
}

function toggleExpand(key: string) {
  if (expandedNodes.value.has(key)) {
    expandedNodes.value.delete(key)
  } else {
    expandedNodes.value.add(key)
  }
}

function handleNodeClick(node: TreeNode) {
  if (node.type !== 'product') {
    emit('navigate', { id: node.id, type: node.type })
  }
}

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

<script lang="ts">
export default { name: 'DependencyTree' }
</script>

<style scoped lang="scss">
.tree-node {
  &:not(:last-child) {
    margin-bottom: 2px;
  }
}

.node-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px;
  border-radius: 6px;
  min-height: 36px;

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

.expand-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
}

.expand-placeholder {
  width: 24px;
  flex-shrink: 0;
}

.type-badge {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 22px;
  height: 18px;
  padding: 0 4px;
}

.node-name {
  white-space: nowrap;
  font-size: 0.9rem;
}

.node-dots {
  flex: 1;
  border-bottom: 1px dotted rgba(255, 255, 255, 0.15);
  min-width: 12px;
  margin-bottom: 4px;
}

.node-quantity {
  white-space: nowrap;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.node-cost {
  white-space: nowrap;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  min-width: 70px;
  text-align: right;
}

.node-children {
  padding-left: 24px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  margin-left: 12px;
}

.edit-btn {
  flex-shrink: 0;
  opacity: 0.3;
  width: 24px;
  height: 24px;

  .node-row:hover & {
    opacity: 0.7;
  }
}

.node-summary {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 6px 4px 2px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: 4px;
  font-size: 0.8rem;
}

.summary-label {
  color: rgba(255, 255, 255, 0.5);
}

.summary-cost {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}
</style>
