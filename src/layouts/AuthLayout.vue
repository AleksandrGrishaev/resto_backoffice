<!-- AuthLayout.vue -->
<template>
  <v-app>
    <v-main class="auth-layout">
      <v-container fluid class="fill-height pa-0">
        <v-row justify="center" align="center" no-gutters>
          <v-col cols="12">
            <router-view />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AuthLayout'
DebugUtils.debug(MODULE_NAME, 'Layout mounted')
</script>

<style lang="scss" scoped>
.auth-layout {
  background-color: var(--black-primary);
}
</style>
