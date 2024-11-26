<!-- src/layouts/AuthLayout.vue -->
<template>
  <v-app>
    <v-main>
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" sm="8" md="6" lg="4">
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
