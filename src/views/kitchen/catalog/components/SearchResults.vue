<!-- Grouped search results across all entity types -->
<template>
  <div class="search-results">
    <div v-if="groups.length === 0" class="empty-state">
      <v-icon size="40" color="grey">mdi-magnify-close</v-icon>
      <p>No results for "{{ query }}"</p>
    </div>

    <div v-for="group in groups" :key="group.type" class="result-group">
      <div class="group-header">
        <v-chip :color="group.color" size="x-small" variant="flat" label>
          {{ group.label }}
        </v-chip>
        <span class="group-count">{{ group.items.length }}</span>
      </div>

      <div
        v-for="item in group.items"
        :key="item.id"
        class="result-item"
        @click="emit('select', item)"
      >
        <span class="item-name">{{ item.name }}</span>
        <span v-if="item.code" class="item-code">{{ item.code }}</span>
        <span class="item-sep" />
        <span v-if="item.categoryName" class="item-category">{{ item.categoryName }}</span>
        <span v-if="item.department" class="item-dept">{{ item.department }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SearchResultGroup, CatalogItem } from '../composables/useCatalogData'

defineProps<{
  groups: SearchResultGroup[]
  query: string
}>()

const emit = defineEmits<{
  select: [item: CatalogItem]
}>()
</script>

<style scoped lang="scss">
.search-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: rgba(255, 255, 255, 0.4);
}

.result-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 4px;
}

.group-count {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;

  &:active {
    background: rgba(255, 255, 255, 0.08);
  }
}

.item-name {
  font-weight: 500;
  font-size: 0.9rem;
}

.item-code {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.4);
}

.item-sep {
  flex: 1;
}

.item-category,
.item-dept {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.4);
}
</style>
