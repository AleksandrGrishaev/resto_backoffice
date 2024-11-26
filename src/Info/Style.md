# Руководство по стилям проекта

## 1. Использование Vuetify компонентов

### Цвета компонентов

```vue
<v-btn color="primary">Primary Button</v-btn>
<v-card color="surface">Surface Card</v-card>
```

Доступные цвета:

- `primary` (#A395E9) - основной цвет
- `secondary` (#BFB5F2) - дополнительный цвет
- `background` (#141416) - цвет фона
- `surface` (#1A1A1E) - цвет поверхностей
- `error` (#FF9676) - цвет ошибок
- `success` (#92C9AF) - цвет успеха
- `warning` (#FFB076) - цвет предупреждений

### Брейкпоинты и адаптивность

```ts
import { useVuetifyBreakpoints } from '@/composables/useVuetifyBreakpoints'

const { isMobile, isTablet, isDesktop, isSmallScreen } = useVuetifyBreakpoints()
```

Доступные брейкпоинты:

- xs: 0 - 599px
- sm: 600px - 959px
- md: 960px - 1279px
- lg: 1280px - 1919px
- xl: 1920px и выше

## 2. CSS Переменные

### Цвета

```scss
.element {
  color: var(--color-primary);
  background: var(--black-surface);
}
```

### Текст

```scss
.text {
  color: var(--text-primary); // Основной текст
  color: var(--text-secondary); // Вторичный текст
  color: var(--text-disabled); // Отключенный текст
}
```

### Отступы

```scss
.spacing {
  margin: var(--space-md); // 16px
  padding: var(--space-lg); // 24px
}
```

Доступные размеры:

- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px

### Скругления

```scss
.rounded {
  border-radius: var(--radius-sm); // 4px
  border-radius: var(--radius-md); // 8px
  border-radius: var(--radius-lg); // 12px
}
```

### Типографика

```scss
.typography {
  font-family: var(--font-family);
  font-weight: var(--font-medium);
  font-size: var(--text-lg);
}
```

Веса шрифта:

- `regular`: 400
- `medium`: 500
- `semibold`: 600
- `bold`: 700

Размеры шрифта:

- `xs`: 12px
- `sm`: 14px
- `base`: 16px
- `lg`: 18px
- `xl`: 20px
- `xxl`: 24px

## 3. SCSS Миксины

### Layout миксины

```scss
.container {
  @include flex(column, center, center, 16px);
}

.grid {
  @include grid(3, 24px);
}
```

### Типографика

```scss
.title {
  @include text('xl', 'bold', 'primary');
}

.heading {
  @include heading(1); // h1
  @include heading(2); // h2
  @include heading(3); // h3
}
```

### Интерактивные состояния

```scss
.interactive {
  @include interactive;
  // Добавляет:
  // - hover эффект
  // - active эффект
  // - disabled состояние
}
```

### Скроллбар

```scss
.scrollable {
  @include custom-scrollbar;
}
```

### Медиа-запросы

```scss
.responsive {
  @include mobile {
    // < 600px
  }
  @include tablet {
    // 600px - 959px
  }
  @include desktop {
    // >= 960px
  }
}
```

## 4. Утилитные классы

### Flexbox

```html
<div class="flex">
  <!-- display: flex -->
  <div class="flex-column">
    <!-- flex-direction: column -->
    <div class="flex-center">
      <!-- align & justify: center -->
      <div class="flex-between"><!-- justify-content: space-between --></div>
    </div></div
  >
</div>
```

### Отступы

```html
<!-- Margin -->
<div class="m-md">
  <!-- margin: 16px -->
  <div class="mt-lg">
    <!-- margin-top: 24px -->
    <div class="mb-sm">
      <!-- margin-bottom: 8px -->
      <div class="ml-xs">
        <!-- margin-left: 4px -->
        <div class="mr-xl">
          <!-- margin-right: 32px -->

          <!-- Padding -->
          <div class="p-md">
            <!-- padding: 16px -->
            <div class="pt-lg">
              <!-- padding-top: 24px -->
              <div class="pb-sm">
                <!-- padding-bottom: 8px -->
                <div class="pl-xs">
                  <!-- padding-left: 4px -->
                  <div class="pr-xl"><!-- padding-right: 32px --></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Текст

```html
<div class="text-truncate"><!-- Обрезка текста с многоточием --></div>
```

### Анимации

```html
<!-- Fade анимация для v-if/v-show -->
<transition name="fade">
  <div v-if="show">
    <!-- контент -->
  </div>
</transition>
```

## 5. Лучшие практики

1. Для компонентов Vuetify используйте системные цвета (`primary`, `secondary` и т.д.)
2. Для кастомных элементов используйте CSS переменные
3. Используйте миксины для повторяющихся стилей
4. Применяйте утилитные классы для простых стилей
5. Для адаптивности используйте composable `useVuetifyBreakpoints`
6. Избегайте хардкода цветов и размеров, используйте переменные

## 6. Переходы и анимации

```scss
transition: var(--transition-base); // 0.25s ease
transition: var(--transition-fast); // 0.15s ease
transition: var(--transition-slow); // 0.35s ease
```
