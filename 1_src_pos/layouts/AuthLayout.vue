// src/layouts/AuthLayout.vue
<template>
  <base-layout>
    <v-container fluid class="fill-height pa-0">
      <v-row justify="center" align="center" no-gutters>
        <v-col cols="12">
          <router-view />
        </v-col>
      </v-row>
    </v-container>
  </base-layout>
</template>

<script setup lang="ts">
import BaseLayout from './BaseLayout.vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AuthLayout'
DebugUtils.debug(MODULE_NAME, 'Layout mounted')
</script>
