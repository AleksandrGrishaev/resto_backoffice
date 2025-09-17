<!-- src/components/atoms/buttons/BaseButton.vue -->
<!--
  🔘 BaseButton - Атомарная базовая кнопка

  НАЗНАЧЕНИЕ:
  Универсальная кнопка-основа для всех кнопок в приложении.
  Обертка над v-btn с унифицированными стилями и поведением.

  КАК ИСПОЛЬЗОВАТЬ:

  1. ПРОСТАЯ КНОПКА:
     <BaseButton>Текст кнопки</BaseButton>

  2. С ИКОНКОЙ:
     <BaseButton start-icon="mdi-save">Сохранить</BaseButton>
     <BaseButton end-icon="mdi-arrow-right">Далее</BaseButton>

  3. ТОЛЬКО ИКОНКА:
     <BaseButton icon="mdi-delete" />

  4. РАЗЛИЧНЫЕ ВАРИАНТЫ:
     <BaseButton variant="outlined" color="error">Удалить</BaseButton>
     <BaseButton variant="text" size="small">Отмена</BaseButton>

  5. СОСТОЯНИЯ:
     <BaseButton :loading="isLoading">Загрузка...</BaseButton>
     <BaseButton :disabled="!canSave">Недоступно</BaseButton>

  6. БЛОЧНАЯ КНОПКА:
     <BaseButton block color="success">На всю ширину</BaseButton>

  ПРИНЦИПЫ:
  - Только UI, никакой бизнес-логики
  - Все настройки через пропсы
  - Простой API для всех случаев использования
  - Консистентные стили во всем приложении

  TODO:
  - Добавить поддержку тем (светлая/темная)
  - Добавить варианты анимаций
-->
<template>
  <v-btn
    :variant="variant"
    :color="color"
    :size="size"
    :loading="loading"
    :disabled="disabled || loading"
    :block="block"
    :icon="!!icon"
    :class="buttonClasses"
    v-bind="$attrs"
    @click="$emit('click', $event)"
  >
    <!-- Иконка в начале -->
    <v-icon v-if="startIcon && !icon" start :size="iconSize">
      {{ startIcon }}
    </v-icon>

    <!-- Центральная иконка (только для icon кнопок) -->
    <v-icon v-if="icon" :size="iconSize">
      {{ icon }}
    </v-icon>

    <!-- Текст кнопки -->
    <span v-if="!icon" class="base-button__text">
      <slot />
    </span>

    <!-- Иконка в конце -->
    <v-icon v-if="endIcon && !icon" end :size="iconSize">
      {{ endIcon }}
    </v-icon>
  </v-btn>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// ===== ТИПЫ =====
type ButtonVariant = 'flat' | 'outlined' | 'text' | 'tonal' | 'elevated' | 'plain'
type ButtonSize = 'x-small' | 'small' | 'default' | 'large' | 'x-large'
type ButtonColor = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'

// ===== ПРОПСЫ =====
interface Props {
  // Внешний вид
  variant?: ButtonVariant
  color?: ButtonColor
  size?: ButtonSize

  // Иконки (только одна из опций)
  startIcon?: string // Иконка слева от текста
  endIcon?: string // Иконка справа от текста
  icon?: string // Только иконка, без текста

  // Состояния
  loading?: boolean
  disabled?: boolean
  block?: boolean // На всю ширину родителя
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'flat',
  color: 'primary',
  size: 'default',
  loading: false,
  disabled: false,
  block: false
})

// ===== ЭМИТЫ =====
defineEmits<{
  click: [event: MouseEvent]
}>()

// ===== ГЕТТЕРЫ =====
const iconSize = computed(() => {
  const sizeMap = {
    'x-small': '16',
    small: '18',
    default: '20',
    large: '22',
    'x-large': '24'
  }
  return sizeMap[props.size]
})

const buttonClasses = computed(() => [
  'base-button',
  {
    'base-button--icon-only': !!props.icon,
    'base-button--loading': props.loading
  }
])
</script>

<style scoped>
/* =============================================
   БАЗОВЫЕ СТИЛИ
   ============================================= */
.base-button {
  font-weight: 500;
  text-transform: none;
  transition: all 0.2s ease;
  border-radius: 8px;
}

.base-button__text {
  font-weight: inherit;
}

/* =============================================
   ХОВЕР ЭФФЕКТЫ
   ============================================= */
.base-button:hover:not(:disabled):not(.base-button--loading) {
  transform: translateY(-1px);
}

.base-button--icon-only:hover:not(:disabled):not(.base-button--loading) {
  transform: scale(1.05);
}

/* =============================================
   СОСТОЯНИЯ
   ============================================= */
.base-button:disabled {
  opacity: 0.4;
  transform: none !important;
}

.base-button--loading {
  opacity: 0.8;
  transform: none !important;
}

/* =============================================
   ФОКУС
   ============================================= */
.base-button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* =============================================
   АДАПТИВНОСТЬ
   ============================================= */
@media (max-width: 768px) {
  .base-button {
    min-height: 48px; /* Увеличиваем для touch устройств */
  }
}
</style>
