// src/views/monitor/BaseMonitorView.vue
<template>
  <div class="d-flex flex-column h-100">
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4 font-weight-medium">{{ title }}</h1>
      <v-spacer />
      <slot name="actions" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>
