<template>
  <div class="user-actions">
    <v-menu location="top end" offset="4">
      <template #activator="{ props }">
        <v-btn variant="text" block v-bind="props" class="menu-btn">
          <v-icon icon="mdi-menu" color="white" size="24" />
        </v-btn>
      </template>

      <v-list>
        <v-list-item to="/shift">
          <template #prepend>
            <v-icon icon="mdi-history" />
          </template>
          <v-list-item-title>Shift History</v-list-item-title>
        </v-list-item>

        <v-list-item to="/debug/stores">
          <template #prepend>
            <v-icon icon="mdi-code-json" />
          </template>
          <v-list-item-title>Debug Stores</v-list-item-title>
        </v-list-item>
        <v-list-item to="/customers">
          <template #prepend>
            <v-icon icon="mdi-account-group" />
          </template>
          <v-list-item-title>Customers</v-list-item-title>
        </v-list-item>
        <v-list-item :loading="loading" @click="handleLogout">
          <template #prepend>
            <v-icon icon="mdi-logout" />
          </template>
          <v-list-item-title>Logout</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)

const handleLogout = async () => {
  try {
    loading.value = true
    await authStore.logout()
    router.push('/auth/login')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.user-actions {
  background-color: var(--app-surface);
  padding: var(--app-spacing-unit);
}

.menu-btn {
  height: var(--app-header-height);
  border-radius: 0;
}

:deep(.v-btn__content) {
  justify-content: center;
}

/* Добавляем стили для выпадающего меню */
:deep(.v-list) {
  background-color: var(--app-surface);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
