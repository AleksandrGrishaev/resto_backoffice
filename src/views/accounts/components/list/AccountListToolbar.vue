<template>
  <div class="account-list-toolbar py-4 px-4 d-flex align-center gap-4">
    <div class="d-flex align-center gap-4">
      <v-btn
        v-if="isAdmin"
        color="primary"
        prepend-icon="mdi-plus-circle"
        @click="emit('create-account')"
      >
        Create Account
      </v-btn>
    </div>

    <v-spacer />

    <v-text-field
      v-model="search"
      append-inner-icon="mdi-magnify"
      label="Search"
      single-line
      hide-details
      density="compact"
      class="max-w-xs"
      bg-color="grey-darken-3"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { OperationType } from '@/stores/account'

const search = ref('')
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const emit = defineEmits<{
  'create-account': []
  'create-operation': [type: OperationType]
}>()
</script>

<style lang="scss" scoped>
.account-list-toolbar {
  background: var(--color-surface);
  border-radius: 8px;
}

.max-w-xs {
  max-width: 300px;
}
</style>
