<!-- src/views/kitchen/components/KitchenSidebar.vue -->
<template>
  <div class="kitchen-sidebar">
    <!-- Screen Buttons Section -->
    <div class="screens-section">
      <!-- Orders Screen Button -->
      <v-btn
        :class="['screen-btn', { active: currentScreen === 'orders' }]"
        :color="currentScreen === 'orders' ? 'primary' : undefined"
        :variant="currentScreen === 'orders' ? 'flat' : 'text'"
        block
        height="56"
        @click="handleScreenSelect('orders')"
      >
        <div class="screen-btn-content">
          <v-icon size="24">mdi-chef-hat</v-icon>
          <span class="screen-btn-label">Orders</span>
          <v-badge
            v-if="dishesStats.waiting + dishesStats.cooking > 0"
            :content="dishesStats.waiting + dishesStats.cooking"
            color="error"
            inline
          />
        </div>
      </v-btn>

      <div class="separator" />

      <!-- Preparation Screen Button -->
      <v-btn
        :class="['screen-btn', { active: currentScreen === 'preparation' }]"
        :color="currentScreen === 'preparation' ? 'primary' : undefined"
        :variant="currentScreen === 'preparation' ? 'flat' : 'text'"
        block
        height="56"
        @click="handleScreenSelect('preparation')"
      >
        <div class="screen-btn-content">
          <v-icon size="24">mdi-food-variant</v-icon>
          <span class="screen-btn-label">Preparation</span>
        </div>
      </v-btn>
    </div>

    <div class="spacer" />

    <!-- Navigation Menu at Bottom -->
    <div class="navigation-section">
      <KitchenNavigationMenu />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useKitchenDishes } from '@/stores/kitchen/composables'
import { DebugUtils } from '@/utils'
import KitchenNavigationMenu from './KitchenNavigationMenu.vue'

const MODULE_NAME = 'KitchenSidebar'

// =============================================
// PROPS
// =============================================

interface Props {
  currentScreen?: 'orders' | 'preparation'
}

const props = withDefaults(defineProps<Props>(), {
  currentScreen: 'orders'
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'screen-select': [screen: 'orders' | 'preparation']
}>()

// =============================================
// COMPOSABLES
// =============================================

const { dishesStats } = useKitchenDishes()

// =============================================
// METHODS
// =============================================

const handleScreenSelect = (screen: 'orders' | 'preparation') => {
  DebugUtils.debug(MODULE_NAME, 'Screen selected', { screen })
  emit('screen-select', screen)
}
</script>

<style scoped lang="scss">
.kitchen-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--v-theme-surface);
}

/* Screens Section */
.screens-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
}

.screen-btn {
  text-transform: none;
  font-weight: 500;
  letter-spacing: normal;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:not(.active) {
    opacity: 0.7;
  }

  &:hover {
    opacity: 1;
  }

  &.active {
    opacity: 1;
  }
}

.screen-btn-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  width: 100%;
}

.screen-btn-label {
  font-size: var(--text-sm);
  font-weight: 600;
}

/* Separator */
.separator {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.12);
  margin: var(--spacing-xs) 0;
}

/* Spacer to push navigation menu to bottom */
.spacer {
  flex: 1;
}

/* Navigation Section */
.navigation-section {
  margin-top: auto;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .screen-btn {
    height: 48px;
  }

  .screen-btn-label {
    font-size: var(--text-xs);
  }

  .screen-btn-content {
    gap: 4px;
  }
}
</style>
