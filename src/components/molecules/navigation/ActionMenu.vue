<!-- src/components/molecules/navigation/ActionMenu.vue -->
<template>
  <!-- Простое меню без оберток -->
  <v-menu v-model="isOpen">
    <template #activator="{ props }">
      <v-btn v-bind="props" variant="text" class="menu-button">
        <v-icon>mdi-menu</v-icon>
      </v-btn>
    </template>

    <v-card class="action-menu" elevation="8">
      <!-- Header -->
      <div v-if="$slots.header" class="action-menu__header">
        <slot name="header" />
      </div>

      <!-- Actions -->
      <div class="action-menu__content">
        <template v-for="section in sections" :key="section.title">
          <!-- Section title -->
          <div v-if="section.title" class="action-menu__section-title">
            {{ section.title }}
          </div>

          <!-- Section actions -->
          <v-btn
            v-for="action in section.actions"
            :key="action.id"
            variant="text"
            class="action-button"
            :loading="action.loading"
            :disabled="action.disabled"
            @click="handleActionClick(action.id)"
          >
            <template v-if="action.icon" #prepend>
              <v-icon :color="getIconColor(action.color)">{{ action.icon }}</v-icon>
            </template>
            {{ action.label }}
          </v-btn>

          <!-- Section divider -->
          <v-divider
            v-if="section !== sections[sections.length - 1]"
            class="action-menu__divider"
          />
        </template>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface ActionItem {
  id: string
  icon: string
  label: string
  loading?: boolean
  disabled?: boolean
  color?: 'success' | 'error' | 'warning' | 'primary'
}

interface ActionSection {
  title?: string
  actions: ActionItem[]
}

interface Props {
  sections: ActionSection[]
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  action: [actionId: string]
}>()

const isOpen = ref(false)

const handleActionClick = (actionId: string) => {
  emit('action', actionId)
  isOpen.value = false
}

const getIconColor = (color?: string) => {
  const colors = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    primary: 'primary'
  }
  return color ? colors[color as keyof typeof colors] : undefined
}
</script>

<style scoped>
.menu-button {
  min-height: 44px;
  min-width: 44px;
  width: 100%;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
}

.menu-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.action-menu {
  min-width: 240px;
  max-width: 280px;
  background-color: var(--v-theme-surface);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
}

.action-menu__header {
  padding: 16px;
  background-color: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.action-menu__content {
  padding: 8px 0;
}

.action-menu__section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.5);
  padding: 8px 16px;
  margin-top: 8px;
}

.action-menu__section-title:first-child {
  margin-top: 0;
}

.action-menu__divider {
  margin: 8px 16px;
  opacity: 0.12;
}

.action-button {
  justify-content: flex-start;
  min-height: 44px;
  width: 100%;
  text-transform: none;
  font-weight: 400;
  margin: 2px 8px;
  border-radius: 6px;
}

.action-button:hover {
  background-color: rgba(255, 255, 255, 0.08);
}
</style>
