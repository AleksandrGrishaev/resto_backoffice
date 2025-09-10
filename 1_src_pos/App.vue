<!-- src/App.vue -->
<template>
  <v-app class="app-root">
    <router-view />
  </v-app>
</template>

<script setup lang="ts"></script>

<style>
/* Глобальные стили для приложения */
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* Стили для корневого контейнера приложения */
.app-root {
  width: 100vw !important;
  min-height: 100vh !important;
  max-width: 100vw !important;
  margin: 0 !important;
  padding: 0 !important;
}

:deep(.v-application__wrap) {
  min-height: 100vh !important;
  max-width: 100vw !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
