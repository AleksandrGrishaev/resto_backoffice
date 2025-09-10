<!-- src/layouts/EmptyLayout.vue -->
<template>
  <v-app>
    <v-main class="fill-height">
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { DebugUtils } from '@/utils/'

const MODULE_NAME = 'EmptyLayout'
DebugUtils.debug(MODULE_NAME, 'Layout mounted')
</script>
