<!-- src/layouts/BaseLayout.vue -->
<template>
  <v-app>
    <div class="base-layout">
      <slot name="header" />
      <v-main>
        <slot />
      </v-main>
    </div>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'BaseLayout'

onMounted(() => {
  if (Capacitor.isNativePlatform()) {
    // Добавляем класс для нативной платформы
    document.documentElement.classList.add('native-platform')
    DebugUtils.debug(MODULE_NAME, 'Native platform detected')
  }
})
</script>

<style scoped>
.base-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  /* Учитываем безопасную зону */
  height: calc(100vh - var(--app-safe-area-bottom, 0px));
  overflow: hidden;
  /* Добавляем отступ снизу для системной навигации */
  padding-bottom: var(--app-safe-area-bottom, 0px);
}

:deep(.v-application) {
  height: 100%;
  max-height: 100vh;
  overflow: hidden;
}

:deep(.v-main) {
  flex: 1;
  height: calc(100% - var(--app-header-height));
  overflow: hidden;
}

:deep(.v-main__wrap) {
  height: 100%;
}
</style>
