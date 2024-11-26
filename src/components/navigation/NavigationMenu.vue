<template>
  <div class="navigation-menu">
    <!-- Header -->
    <v-toolbar density="comfortable" class="navigation-menu__header px-4">
      <v-toolbar-title :class="{ 'text-center': rail }">
        {{ rail ? 'BO' : 'BackOffice' }}
      </v-toolbar-title>
    </v-toolbar>

    <!-- Navigation -->
    <v-list nav class="navigation-menu__nav pa-2">
      <v-list-item
        to="/menu"
        prepend-icon="mdi-silverware-fork-knife"
        rounded="lg"
        class="navigation-menu__item mb-2"
      >
        <template #title>
          <span class="font-weight-medium">Меню</span>
        </template>
      </v-list-item>
    </v-list>

    <!-- Footer -->
    <v-footer app class="navigation-menu__footer pa-2 v-col align-self-end">
      <v-divider class="mb-4" />
      <v-list>
        <v-list-item rounded="lg" prepend-icon="mdi-account" class="navigation-menu__item">
          <template #title>
            <div class="d-flex align-center justify-space-between">
              <span class="font-weight-medium">{{ authStore.state.currentUser?.name }}</span>
              <v-btn icon="mdi-logout" size="small" variant="text" @click="handleLogout" />
            </div>
          </template>
        </v-list-item>
      </v-list>
      <v-btn
        block
        variant="tonal"
        class="navigation-menu__toggle mt-4"
        :prepend-icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
        @click="$emit('update:rail', !rail)"
      >
        <span v-if="!rail">Свернуть</span>
      </v-btn>
    </v-footer>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'NavigationMenu'

defineProps<{
  rail?: boolean
}>()

defineEmits<{
  'update:rail': [boolean]
}>()

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  try {
    await authStore.logout()
    router.push({ name: 'login' })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Logout error', { error })
  }
}
</script>

<style lang="scss">
.navigation-menu {
  height: 100%;
  display: flex;
  flex-direction: column;

  &__header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }

  &__nav {
    flex: 1;
  }

  &__item {
    min-height: 44px !important;

    &.v-list-item--active {
      color: var(--color-primary) !important;
      background: rgba(163, 149, 233, 0.1) !important;
    }

    &:hover {
      background: var(--black-hover) !important;
    }
  }

  &__footer {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 1rem;
  }

  &__toggle {
    margin-top: auto;
  }
}
</style>
