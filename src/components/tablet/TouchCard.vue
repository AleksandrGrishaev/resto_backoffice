<!-- src/components/tablet/TouchCard.vue -->
<template>
  <v-card
    class="touch-card"
    :class="[`touch-card--${color}`, { 'touch-card--active': active }]"
    :ripple="true"
    @click="emit('click')"
  >
    <slot />
  </v-card>
</template>

<script setup lang="ts">
interface Props {
  color?: 'blue' | 'orange' | 'green' | 'default'
  active?: boolean
}

withDefaults(defineProps<Props>(), {
  color: 'default',
  active: false
})

const emit = defineEmits<{
  click: []
}>()
</script>

<style scoped lang="scss">
.touch-card {
  min-height: 80px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 4px solid transparent;

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.98);
  }
}

.touch-card--blue {
  border-left-color: #42a5f5;
}

.touch-card--orange {
  border-left-color: #ffa726;
}

.touch-card--green {
  border-left-color: #66bb6a;
}

.touch-card--active {
  outline: 2px solid rgb(var(--v-theme-primary));
}
</style>
