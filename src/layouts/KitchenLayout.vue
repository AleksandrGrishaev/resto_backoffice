<!-- src/layouts/KitchenLayout.vue -->
<template>
  <div class="kitchen-layout" :style="cssVariables">
    <!-- Sidebar -->
    <div class="kitchen-sidebar">
      <slot name="sidebar" />
    </div>

    <!-- Main content area -->
    <div class="kitchen-content">
      <slot name="content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// CSS variables for responsive sizing
const cssVariables = computed(() => {
  const width = window.innerWidth

  let sidebarWidth = '80px'
  if (width < 768) {
    sidebarWidth = '64px'
  } else if (width >= 768 && width < 1200) {
    sidebarWidth = '80px'
  } else if (width >= 1200) {
    sidebarWidth = '100px'
  }

  return {
    '--kitchen-sidebar-width': sidebarWidth
  }
})
</script>

<style scoped>
.kitchen-layout {
  height: 100vh;
  width: 100vw;
  display: flex;
  overflow: hidden;
  background-color: var(--v-theme-background);
}

/* Sidebar Section */
.kitchen-sidebar {
  width: var(--kitchen-sidebar-width, 80px);
  min-width: var(--kitchen-sidebar-width, 80px);
  max-width: var(--kitchen-sidebar-width, 80px);
  background-color: var(--v-theme-surface);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
}

/* Main Content Area */
.kitchen-content {
  flex: 1;
  min-width: 0;
  background-color: var(--v-theme-background);
  overflow: hidden;
}

/* Custom scrollbar for sidebar */
.kitchen-sidebar::-webkit-scrollbar {
  width: 4px;
}

.kitchen-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.kitchen-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.kitchen-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Responsive fallbacks */
@media (max-width: 768px) {
  .kitchen-sidebar {
    width: 64px;
    min-width: 64px;
    max-width: 64px;
  }
}

@media (min-width: 768px) and (max-width: 1200px) {
  .kitchen-sidebar {
    width: 80px;
    min-width: 80px;
    max-width: 80px;
  }
}

@media (min-width: 1200px) {
  .kitchen-sidebar {
    width: 100px;
    min-width: 100px;
    max-width: 100px;
  }
}
</style>
