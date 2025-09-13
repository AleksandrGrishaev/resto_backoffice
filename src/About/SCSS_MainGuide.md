# 🚀 POS Development Guide - Инструкция для разработчиков

## 📏 Система размеров

### 1. **CSS переменные (используем во всех компонентах)**

```scss
// Отступы
var(--spacing-xs)   // ~4-8px
var(--spacing-sm)   // ~8-12px
var(--spacing-md)   // ~12-16px (основной)
var(--spacing-lg)   // ~16-24px
var(--spacing-xl)   // ~24-32px

// Touch-friendly размеры
var(--touch-min)    // 44px - минимальный touch target
var(--touch-button) // 48px - минимальная высота кнопок
var(--touch-card)   // 64px - минимальная высота карточек

// Адаптивные размеры текста
var(--text-xs)      // ~10-12px
var(--text-sm)      // ~12-14px
var(--text-base)    // ~14-16px (основной)
var(--text-lg)      // ~16-18px
var(--text-xl)      // ~18-22px
var(--text-2xl)     // ~22-28px

// Закругления
var(--radius-sm)    // 4px
var(--radius-md)    // 8px
var(--radius-lg)    // 12px (основной для карточек)
var(--radius-xl)    // 16px
var(--radius-round) // 50% (для кружков)

// Цвета
var(--color-primary)    // #a395e9
var(--color-secondary)  // #bfb5f2
var(--color-success)    // #92c9af
var(--color-warning)    // #ffb076
var(--color-error)      // #ff9676
```

### 2. **Обязательные правила для компонентов**

#### ✅ Touch-friendly размеры

```scss
.clickable-element {
  min-height: var(--touch-min); // Минимум 44px
  min-width: var(--touch-min); // Минимум 44px
  cursor: pointer;
  touch-action: manipulation;
}

.button-element {
  min-height: var(--touch-button); // Минимум 48px
}

.card-element {
  min-height: var(--touch-card); // Минимум 64px
}
```

#### ✅ Адаптивный текст

```scss
.title {
  font-size: var(--text-xl); // Автоматически адаптируется
}

.body-text {
  font-size: var(--text-base); // Основной размер
}

.small-text {
  font-size: var(--text-sm); // Мелкий текст
}
```

#### ✅ Стандартные отступы

```scss
.component {
  padding: var(--spacing-md); // Основные отступы
  margin-bottom: var(--spacing-sm); // Между элементами
  border-radius: var(--radius-lg); // Стандартное закругление
}
```

### 3. **Layout для POS компонентов**

#### Боковая панель (TablesSidebar)

```scss
.pos-sidebar {
  width: max(8vw, 80px); // Минимум 80px, максимум 8%
  max-width: 200px; // Не больше 200px
  height: 100vh;
  overflow-y: auto;
}

// Пропорции секций внутри sidebar
.orders-section {
  max-height: 25%; // Максимум 1/4
  min-height: 0; // Может уменьшаться до 0
  overflow-y: auto;
}

.tables-section {
  flex: 1; // Занимает остальное место
  overflow-y: auto;
}
```

#### Основные секции

```scss
.pos-menu {
  flex: 0 0 62%; // Фиксированно 62% ширины
}

.pos-order {
  flex: 0 0 38%; // Фиксированно 38% ширины
}
```

### 4. **Шаблон компонента POS**

```vue
<template>
  <div class="my-component">
    <div class="my-component__header">
      <h3 class="title">{{ title }}</h3>
    </div>

    <div class="my-component__content">
      <!-- Контент -->
    </div>

    <div class="my-component__actions">
      <button class="action-button">Действие</button>
    </div>
  </div>
</template>

<style scoped>
.my-component {
  /* Базовые размеры */
  min-height: var(--touch-card);
  width: 100%;

  /* Отступы */
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);

  /* Внешний вид */
  border-radius: var(--radius-lg);
  border: 2px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);

  /* Интерактивность (если кликабельный) */
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s ease;

  /* Layout */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.my-component:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.24);
  border-color: rgba(255, 255, 255, 0.16);
}

.title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

.action-button {
  min-height: var(--touch-button);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: var(--color-secondary);
  transform: translateY(-1px);
}
</style>
```

### 5. **Состояния и статусы**

#### Статусы столов

```scss
.table-item--free {
  border-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 8%, transparent);
}

.table-item--occupied-unpaid {
  border-color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 8%, transparent);
}

.table-item--occupied-paid {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.table-item--active {
  border-width: 3px;
  box-shadow: 0 0 0 1px rgba(163, 149, 233, 0.3);
}
```

### 6. **Утилитарные классы (доступны глобально)**

```scss
/* Размеры */
.h-touch {
  height: var(--touch-min);
}
.h-button {
  height: var(--touch-button);
}
.h-card {
  min-height: var(--touch-card);
}

/* Отступы */
.p-md {
  padding: var(--spacing-md);
}
.mb-sm {
  margin-bottom: var(--spacing-sm);
}

/* Текст */
.text-lg {
  font-size: var(--text-lg);
}
.font-semibold {
  font-weight: 600;
}

/* Layout */
.flex {
  display: flex;
}
.flex-col {
  flex-direction: column;
}
.flex-1 {
  flex: 1;
}
.gap-sm {
  gap: var(--spacing-sm);
}

/* Скролл */
.scrollable-content {
  overflow-y: auto;
  /* + кастомный скроллбар */
}
```

### 7. **Адаптивность**

Все размеры автоматически адаптируются благодаря `clamp()`. Дополнительно:

```scss
@media (max-width: 1024px) {
  .title {
    font-size: var(--text-base); // Уменьшаем на планшетах
  }

  .large-element {
    padding: var(--spacing-sm); // Меньше отступов
  }
}
```

## 🎯 Быстрый чеклист

**Перед созданием нового POS компонента проверь:**

- [ ] Минимальная высота `min-height: var(--touch-card)` для карточек
- [ ] Минимальная высота `min-height: var(--touch-button)` для кнопок
- [ ] Используешь `var(--spacing-md)` для основных отступов
- [ ] Используешь `var(--text-base)` для основного текста
- [ ] Используешь `var(--radius-lg)` для закруглений карточек
- [ ] Добавил `:hover` состояние с `transform: translateY(-2px)`
- [ ] Добавил `transition: all 0.2s ease` для плавности
- [ ] Использует цветовые переменные для статусов
- [ ] Протестирован на разрешении 1024x768

**Готово!** 🚀 Компонент соответствует POS дизайн-системе.
