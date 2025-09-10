<template>
  <v-card class="menu-item-card" @click="handleCardClick">
    <div class="card-content">
      <!-- Header section -->
      <div class="card-header">
        <v-card-title class="text-h6">{{ item.name }}</v-card-title>
        <v-card-subtitle>{{ item.description }}</v-card-subtitle>
      </div>

      <!-- Main content with variants/prices -->
      <div class="card-main" :class="{ 'full-width': showVariants }">
        <!-- Content for items with single variant -->
        <template v-if="hasSingleVariant">
          <div class="price-info">
            <span class="text-body-1">{{ item.variants[0].name }}</span>
            <span class="text-body-1">${{ item.variants[0].price.toFixed(2) }}</span>
          </div>
          <div class="button-stack">
            <v-btn
              block
              variant="text"
              height="44"
              @click.stop="$emit('addWithNote', item, item.variants[0])"
            >
              Add with note
            </v-btn>
            <v-btn
              block
              color="primary"
              height="44"
              @click.stop="$emit('add', item, item.variants[0])"
            >
              Add
            </v-btn>
          </div>
        </template>

        <!-- Content for items with multiple variants -->
        <template v-else-if="showVariants">
          <div v-for="variant in item.variants" :key="variant.id" class="variant-item">
            <div class="price-info">
              <span class="text-body-1">{{ variant.name }}</span>
              <span class="text-body-1">${{ variant.price.toFixed(2) }}</span>
            </div>
            <div class="button-stack">
              <v-btn
                block
                variant="text"
                height="44"
                @click.stop="$emit('addWithNote', item, variant)"
              >
                Add with note
              </v-btn>
              <v-btn block color="primary" height="44" @click.stop="$emit('add', item, variant)">
                Add
              </v-btn>
            </div>
          </div>
        </template>

        <!-- Content for variant selection -->
        <template v-else>
          <div class="flex-grow"><!-- Пустой div для растягивания --></div>
          <v-btn color="primary" block height="44">Variants</v-btn>
        </template>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MenuItem, MenuItemVariant } from '@/types/menu'

const props = defineProps<{
  item: MenuItem
  showVariants?: boolean
}>()

const emit = defineEmits<{
  select: [item: MenuItem]
  add: [item: MenuItem, variant: MenuItemVariant]
  addWithNote: [item: MenuItem, variant: MenuItemVariant]
}>()

const hasSingleVariant = computed(() => props.item.variants.length === 1)

function handleCardClick() {
  if (!props.showVariants && !hasSingleVariant.value) {
    emit('select', props.item)
  }
}
</script>

<style scoped>
.card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.card-header {
  margin-bottom: 16px;
}

.card-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-main.full-width {
  width: 100%;
  max-width: 100%;
}

.price-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.button-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variant-item {
  display: flex;
  flex-direction: column;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
}

.variant-item:last-child {
  margin-bottom: 0;
}

.flex-grow {
  flex: 1;
  min-height: 16px;
}
</style>
