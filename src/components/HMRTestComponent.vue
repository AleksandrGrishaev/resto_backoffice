<template>
  <v-card class="pa-4 ma-4" color="success" variant="tonal">
    <v-card-title>HMR Test Component v3 - Final!</v-card-title>
    <v-card-text>
      <p class="text-h6 mb-4">Counter: {{ counter }}</p>
      <div class="d-flex gap-2">
        <v-btn color="success" size="large" @click="increment">+ Increment</v-btn>
        <v-btn color="error" size="large" @click="decrement">- Decrement</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const counter = ref(0)

const increment = () => {
  counter.value++
  console.log('✅ Counter incremented to:', counter.value)
}

const decrement = () => {
  counter.value--
  console.log('➖ Counter decremented to:', counter.value)
}

console.log('🔥 HMRTestComponent mounted/reloaded at', new Date().toLocaleTimeString())
</script>
