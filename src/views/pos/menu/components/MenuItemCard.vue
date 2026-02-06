<!-- src/views/pos/menu/components/MenuItemCard.vue -->
<template>
  <v-card
    class="menu-item-card pos-card"
    :class="{
      'item-disabled': !item.isActive,
      'single-variant': activevariants.length === 1,
      'multiple-variants': activevariants.length > 1,
      'no-variants': activevariants.length === 0
    }"
    elevation="2"
    @click="handleItemClick"
  >
    <div class="card-content d-flex flex-column h-100">
      <!-- Header with name and status -->
      <div class="item-header d-flex justify-space-between align-start mb-2">
        <div class="flex-grow-1">
          <v-card-title class="item-title pa-0 text-subtitle-1">
            {{ item.name }}
          </v-card-title>

          <v-card-subtitle v-if="item.description" class="item-description pa-0 mt-1 text-caption">
            {{ item.description }}
          </v-card-subtitle>
        </div>

        <!-- Status indicators -->
        <div class="status-indicators ml-2">
          <v-chip v-if="!item.isActive" size="x-small" color="error" variant="flat" class="mb-1">
            Unavailable
          </v-chip>

          <v-chip
            v-else-if="activevariants.length === 0"
            size="x-small"
            color="warning"
            variant="flat"
            class="mb-1"
          >
            No variants
          </v-chip>
        </div>
      </div>

      <!-- Price information -->
      <div class="price-section mb-2">
        <div v-if="activevariants.length === 1" class="single-price">
          <span class="price-value text-subtitle-1 font-weight-bold">
            {{ formatPrice(getDisplayPrice(activevariants[0])) }}
          </span>
          <span v-if="activevariants[0].name" class="price-variant text-caption ml-2">
            {{ activevariants[0].name }}
          </span>
        </div>

        <div v-else-if="activevariants.length > 1" class="price-range">
          <span class="price-value text-subtitle-1 font-weight-bold">
            {{ formatPrice(minPrice) }} - {{ formatPrice(maxPrice) }}
          </span>
          <div class="text-caption text-medium-emphasis">{{ activevariants.length }} variants</div>
        </div>

        <div v-else class="no-price text-caption text-medium-emphasis">Price not set</div>
      </div>

      <!-- Variants chips (only for multiple variants) -->
      <div v-if="activevariants.length > 1 && showVariantChips" class="variants-section mb-2">
        <div class="variants-chips d-flex flex-wrap gap-1">
          <v-chip
            v-for="variant in activevariants.slice(0, 3)"
            :key="variant.id"
            size="x-small"
            variant="outlined"
          >
            {{ variant.name }}
          </v-chip>

          <v-chip
            v-if="activevariants.length > 3"
            size="x-small"
            variant="outlined"
            color="primary"
          >
            +{{ activevariants.length - 3 }}
          </v-chip>
        </div>
      </div>

      <!-- Footer with metadata -->
      <v-spacer />

      <div class="item-footer d-flex justify-space-between align-center mt-auto pt-2">
        <div class="item-meta text-caption text-medium-emphasis">
          <span v-if="item.preparationTime">
            <v-icon size="12" class="mr-1">mdi-clock-outline</v-icon>
            {{ item.preparationTime }}min
          </span>

          <span v-if="item.type" class="ml-2">
            <v-icon size="12" class="mr-1">
              {{ item.type === 'food' ? 'mdi-silverware-fork-knife' : 'mdi-cup' }}
            </v-icon>
            {{ item.type === 'food' ? 'Food' : 'Drink' }}
          </span>
        </div>

        <!-- Show Add button only for single variant -->
        <v-btn
          v-if="activevariants.length === 1 && canSelect"
          size="small"
          color="primary"
          variant="flat"
          @click.stop="handleAddSingle"
        >
          <v-icon size="16">mdi-plus</v-icon>
          Add
        </v-btn>

        <!-- For multiple variants - navigation icon only -->
        <v-icon v-else :color="canSelect ? 'primary' : 'disabled'" size="20">
          {{ activevariants.length > 1 ? 'mdi-chevron-right' : 'mdi-help' }}
        </v-icon>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChannelsStore } from '@/stores/channels'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'

// Props
interface Props {
  item: MenuItem
  channelId?: string
  showVariantChips?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showVariantChips: false
})

const channelsStore = useChannelsStore()

// Emits
const emit = defineEmits<{
  'add-item': [item: MenuItem, variant: MenuItemVariant] // Для прямого добавления
  'select-item': [item: MenuItem] // Для навигации к вариантам
}>()

// Computed
const activevariants = computed(() => {
  return props.item.variants?.filter(v => v.isActive) || []
})

/**
 * Get display price for a variant (channel-aware when channelId is set)
 */
const getDisplayPrice = (variant: MenuItemVariant): number => {
  if (!props.channelId) return variant.price
  return channelsStore.getChannelPrice(props.channelId, props.item.id, variant.id, variant.price)
    .netPrice
}

const minPrice = computed(() => {
  const prices = activevariants.value.map(v => getDisplayPrice(v))
  return Math.min(...prices)
})

const maxPrice = computed(() => {
  const prices = activevariants.value.map(v => getDisplayPrice(v))
  return Math.max(...prices)
})

const canSelect = computed(() => {
  return props.item.isActive && activevariants.value.length > 0
})

// Methods
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

const handleItemClick = (): void => {
  if (!canSelect.value) {
    return
  }

  // Для одного варианта - добавляем сразу
  if (activevariants.value.length === 1) {
    handleAddSingle()
  }
  // Для нескольких вариантов - переходим к выбору
  else if (activevariants.value.length > 1) {
    emit('select-item', props.item)
  }
}

const handleAddSingle = (): void => {
  if (activevariants.value.length === 1 && canSelect.value) {
    const variant = activevariants.value[0]
    emit('add-item', props.item, variant)
  }
}
</script>

<style scoped>
/* =============================================
   CARD STYLES
   ============================================= */

.menu-item-card {
  height: 100%;
  min-height: var(--touch-card);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 2px solid transparent;
  background: rgb(var(--v-theme-surface));
}

.menu-item-card:hover:not(.item-disabled):not(.no-variants) {
  transform: translateY(-2px);
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 8px 16px rgba(var(--v-theme-primary), 0.15) !important;
}

.menu-item-card.item-disabled,
.menu-item-card.no-variants {
  opacity: 0.6;
  cursor: not-allowed;
  background: rgba(var(--v-theme-surface), 0.5);
}

.menu-item-card.item-disabled:hover,
.menu-item-card.no-variants:hover {
  transform: none;
  border-color: transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12) !important;
}

.menu-item-card.single-variant {
  border-left: 4px solid rgb(var(--v-theme-success));
}

.menu-item-card.multiple-variants {
  border-left: 4px solid rgb(var(--v-theme-info));
}

/* =============================================
   CONTENT STYLES
   ============================================= */

.card-content {
  padding: var(--spacing-md);
  height: 100%;
}

.item-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.2;
  color: rgb(var(--v-theme-on-surface));
}

.item-disabled .item-title,
.no-variants .item-title {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.item-description {
  font-size: 0.8rem;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.7);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-disabled .item-description,
.no-variants .item-description {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

/* =============================================
   PRICE STYLES
   ============================================= */

.price-section {
  min-height: 2.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.price-value {
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}

.item-disabled .price-value,
.no-variants .price-value {
  color: rgba(var(--v-theme-primary), 0.6);
}

.price-variant {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* =============================================
   VARIANTS STYLES
   ============================================= */

.variants-section {
  max-height: 3rem;
  overflow: hidden;
}

.variants-chips .v-chip {
  margin: 0 !important;
}

.variants-chips .v-chip:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

/* =============================================
   FOOTER STYLES
   ============================================= */

.item-footer {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  margin-top: var(--spacing-xs);
  padding-top: var(--spacing-xs);
}

.item-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

/* =============================================
   RESPONSIVE ADJUSTMENTS
   ============================================= */

@media (max-width: 768px) {
  .menu-item-card {
    min-height: calc(var(--touch-card) * 0.9);
  }

  .card-content {
    padding: var(--spacing-sm);
  }

  .item-title {
    font-size: 0.9rem;
  }

  .item-description {
    font-size: 0.75rem;
  }

  .price-value {
    font-size: 0.9rem;
  }
}

/* =============================================
   TOUCH OPTIMIZATIONS
   ============================================= */

@media (hover: none) {
  .menu-item-card:hover:not(.item-disabled):not(.no-variants) {
    transform: none;
    border-color: transparent;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12) !important;
  }

  .menu-item-card:active:not(.item-disabled):not(.no-variants) {
    transform: scale(0.98);
    border-color: rgb(var(--v-theme-primary));
  }

  .variants-chips .v-chip:active {
    transform: scale(0.95);
  }
}
</style>
