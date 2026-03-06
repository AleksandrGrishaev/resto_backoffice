<!-- src/components/tablet/BottomSheet.vue -->
<template>
  <v-bottom-sheet
    :model-value="modelValue"
    :persistent="persistent"
    :no-click-animation="persistent"
    content-class="tablet-bottom-sheet"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="bottom-sheet-card" :style="{ maxHeight: maxHeight }">
      <!-- Drag handle -->
      <div class="drag-handle-area" @click="!persistent && emit('update:modelValue', false)">
        <div class="drag-handle" />
      </div>

      <!-- Header -->
      <div v-if="title || $slots.header" class="bottom-sheet-header">
        <slot name="header">
          <h3 class="bottom-sheet-title">{{ title }}</h3>
        </slot>
        <v-btn
          v-if="showClose"
          icon="mdi-close"
          variant="text"
          size="small"
          @click="emit('update:modelValue', false)"
        />
      </div>

      <!-- Content -->
      <div class="bottom-sheet-content">
        <slot />
      </div>

      <!-- Footer actions -->
      <div v-if="$slots.actions" class="bottom-sheet-actions">
        <slot name="actions" />
      </div>
    </v-card>
  </v-bottom-sheet>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  persistent?: boolean
  showClose?: boolean
  maxHeight?: string
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  persistent: false,
  showClose: true,
  maxHeight: '85vh'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped lang="scss">
.bottom-sheet-card {
  border-radius: 16px 16px 0 0 !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drag-handle-area {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
  cursor: pointer;
}

.drag-handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background-color: rgba(255, 255, 255, 0.3);
}

.bottom-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.bottom-sheet-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.bottom-sheet-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.bottom-sheet-actions {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
