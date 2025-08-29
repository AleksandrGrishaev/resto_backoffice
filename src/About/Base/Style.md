# Система стилей проекта

## 1. Структура файлов

Система стилей состоит из следующих ключевых файлов:

- `src/styles/variables.scss` - определение цветовых переменных
- `src/styles/main.scss` - основные стили и CSS-переменные
- `src/types/scss.d.ts` - TypeScript определения для SCSS
- `src/plugins/vuetify.ts` - конфигурация темы Vuetify

## 2. Определение цветов (`variables.scss`)

### Цветовые карты

```scss
$color: (
  'primary': #a395e9,
  'secondary': #bfb5f2,
  'background': #141416,
  'surface': #1a1a1e,
  'error': #ff9676,
  'success': #92c9af,
  'warning': #ffb076
);

$black: (
  'primary': #141416,
  'surface': #1a1a1e
);
```

### Экспорт для JavaScript

Цвета экспортируются для использования в JavaScript/TypeScript через `:export`:

```scss
:export {
  colorPrimary: map.get($color, 'primary');
  // ... другие цвета
}
```

## 3. Глобальные стили (`main.scss`)

### CSS-переменные

Все цвета автоматически преобразуются в CSS-переменные:

```scss
:root {
  @each $name, $value in $color {
    --color-#{$name}: #{$value};
  }
  @each $name, $value in $black {
    --black-#{$name}: #{$value};
  }
}
```

### Базовые стили

```scss
body {
  margin: 0;
  background: var(--black-primary);
  color: rgba(255, 255, 255, 0.87);
}
```

## 4. Интеграция с Vuetify

### Настройка темы

Цвета из SCSS интегрируются в тему Vuetify:

```typescript
theme: {
  defaultTheme: 'dark',
  themes: {
    dark: {
      dark: true,
      colors: {
        background: variables.colorBackground,
        surface: variables.colorSurface,
        // ... другие цвета
      }
    }
  }
}
```

### Дефолтные настройки компонентов

```typescript
defaults: {
  VBtn: { variant: 'elevated' },
  VTextField: { variant: 'outlined' },
  VCard: { elevation: 0 }
}
```

## 5. Принципы использования

1. **CSS-переменные**: Используйте `var(--color-*)` для доступа к цветам в CSS:

   ```css
   .element {
     background: var(--color-primary);
   }
   ```

2. **JavaScript доступ**: Импортируйте переменные из `variables.scss`:

   ```typescript
   import * as variables from '@/styles/variables.scss'
   const primaryColor = variables.colorPrimary
   ```

3. **Vuetify компоненты**: Используйте встроенные пропсы для цветов:

   ```html
   <v-btn color="primary">Button</v-btn>
   ```

4. **TypeScript поддержка**: Все SCSS переменные типизированы благодаря `scss.d.ts`
