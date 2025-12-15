<!-- src/views/kitchen/components/KitchenSidebar.vue -->
<template>
  <div class="kitchen-sidebar">
    <!-- Department Tabs (Admin only) -->
    <div v-if="showDepartmentTabs" class="department-tabs-section">
      <v-tabs v-model="selectedDepartment" density="compact" color="primary" grow>
        <v-tab value="all">
          <v-icon start size="18">mdi-view-grid</v-icon>
          All
        </v-tab>
        <v-tab value="kitchen">
          <v-icon start size="18">mdi-chef-hat</v-icon>
          Kitchen
        </v-tab>
        <v-tab value="bar">
          <v-icon start size="18">mdi-glass-cocktail</v-icon>
          Bar
        </v-tab>
      </v-tabs>
    </div>

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

      <div class="separator" />

      <!-- KPI Screen Button -->
      <v-btn
        :class="['screen-btn', { active: currentScreen === 'kpi' }]"
        :color="currentScreen === 'kpi' ? 'primary' : undefined"
        :variant="currentScreen === 'kpi' ? 'flat' : 'text'"
        block
        height="56"
        @click="handleScreenSelect('kpi')"
      >
        <div class="screen-btn-content">
          <v-icon size="24">mdi-chart-timeline-variant</v-icon>
          <span class="screen-btn-label">KPI</span>
        </div>
      </v-btn>

      <div class="separator" />

      <!-- Request Screen Button -->
      <v-btn
        :class="['screen-btn', { active: currentScreen === 'request' }]"
        :color="currentScreen === 'request' ? 'primary' : undefined"
        :variant="currentScreen === 'request' ? 'flat' : 'text'"
        block
        height="56"
        @click="handleScreenSelect('request')"
      >
        <div class="screen-btn-content">
          <v-icon size="24">mdi-cart-plus</v-icon>
          <span class="screen-btn-label">Request</span>
          <v-badge
            v-if="props.pendingRequestCount > 0"
            :content="props.pendingRequestCount"
            color="warning"
            inline
          />
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
import { ref, computed, watch } from 'vue'
import { useKitchenDishes } from '@/stores/kitchen/composables'
import { useAuthStore } from '@/stores/auth'
import { DebugUtils } from '@/utils'
import KitchenNavigationMenu from './KitchenNavigationMenu.vue'

const MODULE_NAME = 'KitchenSidebar'

// =============================================
// PROPS
// =============================================

interface Props {
  currentScreen?: 'orders' | 'preparation' | 'kpi' | 'request'
  pendingRequestCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  currentScreen: 'orders',
  pendingRequestCount: 0
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'screen-select': [screen: 'orders' | 'preparation' | 'kpi' | 'request']
  'department-change': [department: 'all' | 'kitchen' | 'bar']
}>()

// =============================================
// COMPOSABLES
// =============================================

const authStore = useAuthStore()
const { dishesStats } = useKitchenDishes()

// =============================================
// STATE
// =============================================

const selectedDepartment = ref<'all' | 'kitchen' | 'bar'>('all')

// =============================================
// COMPUTED
// =============================================

/**
 * Show department tabs only for admin
 */
const showDepartmentTabs = computed(() => {
  return authStore.userRoles.includes('admin')
})

// =============================================
// WATCHERS
// =============================================

/**
 * Emit department change when admin selects a tab
 */
watch(selectedDepartment, value => {
  DebugUtils.debug(MODULE_NAME, 'Department filter changed', { department: value })
  emit('department-change', value)
})

// =============================================
// METHODS
// =============================================

const handleScreenSelect = (screen: 'orders' | 'preparation' | 'kpi' | 'request') => {
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

/* Department Tabs Section (Admin only) */
.department-tabs-section {
  padding: var(--spacing-sm);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background-color: rgba(0, 0, 0, 0.1);

  :deep(.v-tabs) {
    height: 40px;
  }

  :deep(.v-tab) {
    min-height: 36px;
    font-size: var(--text-sm);
    text-transform: none;
    letter-spacing: normal;
    font-weight: 500;
  }

  :deep(.v-tab--selected) {
    font-weight: 600;
  }
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
