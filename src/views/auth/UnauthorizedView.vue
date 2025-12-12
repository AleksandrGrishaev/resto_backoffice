<!-- src/views/UnauthorizedView.vue -->
<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="6" md="4">
        <v-card class="pa-6">
          <v-card-title class="text-center mb-4">
            <v-icon size="64" color="warning" class="mb-2">mdi-shield-alert</v-icon>
            <div>Access Denied</div>
          </v-card-title>

          <v-card-text class="text-center">
            <p class="mb-4">You don't have permission to access this page</p>

            <p class="text-caption mb-4">User: {{ currentUserName }} ({{ userRoleText }})</p>
          </v-card-text>

          <v-card-actions class="justify-center">
            <v-btn color="primary" variant="outlined" @click="goBack">Back</v-btn>

            <LogoutButton variant="text" text="Log out" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { CoreUserService } from '@/core/users'
import LogoutButton from '@/components/atoms/buttons/LogoutButton.vue'

const router = useRouter()
const { currentUser } = useAuth()

const currentUserName = computed(() => currentUser.value?.name || 'Unknown')

const userRoleText = computed(() => {
  const roles = currentUser.value?.roles || []
  return roles.map(role => CoreUserService.getRoleDisplayName(role)).join(', ') || 'No roles'
})

const goBack = () => {
  router.go(-1)
}
</script>
