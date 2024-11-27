<!-- src/layouts/MainLayout.vue -->
<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      :width="280"
      :rail-width="80"
      permanent
      location="left"
      color="surface"
    >
      <navigation-menu v-model:rail="rail" />
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NavigationMenu from '@/components/navigation/NavigationMenu.vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'MainLayout'

const drawer = ref(true)
const rail = ref(false)

DebugUtils.debug(MODULE_NAME, 'Layout mounted', { drawer: drawer.value, rail: rail.value })
</script>

<style lang="scss">
.v-main {
  background-color: var(--black-primary);
}
</style>
