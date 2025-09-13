<!-- src/components/molecules/navigation/ActionMenu.vue -->
<!--
  Action menu composition with dropdown and action buttons
  - Combines MenuButton, BaseDropdown and ActionButton atoms
  - Displays list of actions with icons and handles clicks
  - Supports header and footer slots for custom content
-->
<template>
  <BaseDropdown v-model="isOpen">
    <template #activator="{ props: dropdownProps }">
      <MenuButton v-bind="dropdownProps" :loading="loading" @click="isOpen = !isOpen" />
    </template>

    <div class="action-menu">
      <!-- Header slot for custom content -->
      <div v-if="$slots.header" class="action-menu__header">
        <slot name="header" />
      </div>

      <!-- Actions list -->
      <div class="action-menu__actions">
        <template v-for="section in sections" :key="section.title">
          <!-- Section title -->
          <div v-if="section.title" class="action-menu__section-title">
            {{ section.title }}
          </div>

          <!-- Section actions -->
          <ActionButton
            v-for="action in section.actions"
            :key="action.id"
            :icon="action.icon"
            :label="action.label"
            :loading="action.loading"
            :disabled="action.disabled"
            :color="action.color"
            @click="handleActionClick(action.id)"
          />

          <!-- Section divider -->
          <v-divider
            v-if="section !== sections[sections.length - 1]"
            class="action-menu__divider"
          />
        </template>
      </div>

      <!-- Footer slot for custom content -->
      <div v-if="$slots.footer" class="action-menu__footer">
        <slot name="footer" />
      </div>
    </div>
  </BaseDropdown>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Import atoms
import MenuButton from '@/components/atoms/buttons/MenuButton.vue'
import ActionButton from '@/components/atoms/buttons/ActionButton.vue'
import BaseDropdown from '@/components/atoms/dropdowns/BaseDropdown.vue'

// =============================================
// TYPES & PROPS
// =============================================

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

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  action: [actionId: string]
}>()

// =============================================
// STATE
// =============================================

const isOpen = ref(false)

// =============================================
// METHODS
// =============================================

const handleActionClick = (actionId: string) => {
  emit('action', actionId)
  isOpen.value = false // Close menu after action
}
</script>

<style scoped>
.action-menu {
  min-width: 240px;
  max-width: 280px;
}

.action-menu__header {
  padding: var(--spacing-md);
  background-color: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.action-menu__actions {
  padding: var(--spacing-xs) 0;
}

.action-menu__section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.5);
  padding: var(--spacing-xs) var(--spacing-md);
  margin-top: var(--spacing-xs);
}

.action-menu__section-title:first-child {
  margin-top: 0;
}

.action-menu__divider {
  margin: var(--spacing-xs) var(--spacing-md);
  opacity: 0.12;
}

.action-menu__footer {
  padding: var(--spacing-md);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* Action button spacing within menu */
.action-menu__actions :deep(.action-button) {
  margin: 2px var(--spacing-sm);
  border-radius: var(--radius-md);
}

.action-menu__actions :deep(.action-button:hover) {
  background-color: rgba(255, 255, 255, 0.08);
}
</style>
