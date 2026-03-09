<!-- Items list within a category — used across all sections -->
<template>
  <div class="items-list">
    <div
      v-for="item in items"
      :key="item.id"
      class="item-card"
      :class="[sectionClass, { inactive: item.status !== 'active' }]"
      @click="emit('select', item)"
    >
      <div class="item-main">
        <div class="item-header">
          <span class="item-name">{{ item.name }}</span>
          <v-chip
            v-if="item.status !== 'active'"
            :color="item.status === 'draft' ? 'warning' : 'grey'"
            size="x-small"
            variant="flat"
            label
          >
            {{ item.status === 'draft' ? 'Draft' : 'Archived' }}
          </v-chip>
        </div>
        <div class="item-meta">
          <span v-if="item.code" class="meta-code">{{ item.code }}</span>
          <span v-if="item.department" class="meta-dept">{{ item.department }}</span>
          <span v-if="item.unit" class="meta-unit">{{ item.unit }}</span>
        </div>
      </div>
      <div class="item-right">
        <span v-if="item.costDisplay" class="item-cost">{{ item.costDisplay }}</span>
        <span v-if="item.variantCount" class="item-variants">{{ item.variantCount }} var.</span>
        <span v-if="item.componentCount" class="item-comp">{{ item.componentCount }} comp.</span>
      </div>
      <v-icon size="18" class="item-chevron">mdi-chevron-right</v-icon>
    </div>

    <div v-if="items.length === 0" class="empty-state">
      <v-icon size="40" color="grey-darken-1">mdi-magnify-close</v-icon>
      <p>No items in this category</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogItem } from '../composables/useCatalogData'

const props = defineProps<{
  items: CatalogItem[]
  section: string
}>()

const emit = defineEmits<{
  select: [item: CatalogItem]
}>()

const sectionClass = computed(() => `section-${props.section}`)
</script>

<style scoped lang="scss">
.items-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  border-left: 3px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  min-height: 52px;
  transition: background 0.15s;

  &:active {
    background: rgba(255, 255, 255, 0.08);
  }

  &.inactive {
    opacity: 0.5;
  }

  &.section-menu {
    border-left-color: rgb(var(--v-theme-purple, 156, 39, 176));
  }
  &.section-recipes {
    border-left-color: rgb(var(--v-theme-success, 76, 175, 80));
  }
  &.section-preps {
    border-left-color: rgb(var(--v-theme-warning, 255, 152, 0));
  }
  &.section-products {
    border-left-color: rgb(var(--v-theme-info, 33, 150, 243));
  }
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-name {
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.45);
}

.meta-unit {
  padding: 1px 5px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  font-size: 0.72rem;
}

.item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.item-cost {
  font-weight: 500;
  font-size: 0.85rem;
  white-space: nowrap;
}

.item-variants {
  font-size: 0.72rem;
  color: rgba(156, 39, 176, 0.7);
}

.item-comp {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
}

.item-chevron {
  opacity: 0.25;
  flex-shrink: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0;
  color: rgba(255, 255, 255, 0.4);
}
</style>
