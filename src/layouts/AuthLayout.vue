<!-- src/layouts/AuthLayout.vue -->
<template>
  <v-app>
    <v-main class="d-flex align-center justify-center">
      <v-container fluid>
        <v-row justify="center">
          <v-col cols="12" sm="8" md="6" lg="4">
            <router-view />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
const MODULE_NAME = 'AuthLayout'
</script>
