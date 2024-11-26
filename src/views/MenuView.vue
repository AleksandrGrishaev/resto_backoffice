<!-- src/views/MenuView.vue -->
<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center gap-2">
        <v-icon icon="mdi-silverware-fork-knife" />
        Меню
      </v-card-title>

      <v-card-text>
        <v-alert type="info" title="В разработке" variant="tonal" class="mb-4">
          Раздел находится в разработке
        </v-alert>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'MenuView'
DebugUtils.debug(MODULE_NAME, 'Component mounted')
</script>
