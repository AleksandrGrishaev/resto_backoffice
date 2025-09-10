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

Base Elements

# Dialog System Documentation

## Overview

The dialog system consists of three main parts:

- BaseDialog component - core dialog functionality
- useDialogForm composable - form state management
- Implementation component - specific dialog implementation

## BaseDialog Component

### Basic Usage

```vue
<base-dialog
  v-model="showDialog"
  title="Dialog Title"
  @confirm="handleConfirm"
  @cancel="handleCancel"
>
  <!-- Dialog content -->
</base-dialog>
```

### Props

- `modelValue` (boolean, required) - controls dialog visibility
- `title` (string, required) - dialog title
- `loading` (boolean, optional) - loading state
- `disabled` (boolean, optional) - disables confirm button
- `maxWidth` (number | string, optional) - max width of dialog
- `persistent` (boolean, optional) - prevents closing on outside click
- `cancelText` (string, optional) - custom cancel button text
- `confirmText` (string, optional) - custom confirm button text

### Events

- `update:model-value` - emitted when dialog visibility changes
- `confirm` - emitted when confirm button is clicked
- `cancel` - emitted when cancel button is clicked

### Slots

- `default` - main content
- `title-actions` - additional actions in title bar
- `actions` - custom footer actions

## useDialogForm Composable

### Basic Usage

```typescript
interface MyFormData {
  name: string
  description: string
}

const { formData, loading, handleSubmit, handleCancel } = useDialogForm<MyFormData>({
  moduleName: 'MyDialog',
  initialData: {
    name: '',
    description: ''
  },
  validateForm: data => {
    if (!data.name) return 'Name is required'
    return true
  },
  onSubmit: async data => {
    // Handle form submission
  }
})
```

### Returns

- `form` - reference to form element
- `loading` - loading state
- `formData` - reactive form data
- `formState` - form validation state
- `isFormValid` - computed form validity
- `resetForm` - resets form to initial state
- `handleSubmit` - handles form submission
- `handleCancel` - handles form cancellation
- `updateFormState` - updates form validation state

## Implementation Example

Here's a complete example of a dialog implementation:

```vue
<template>
  <base-dialog
    v-model="modelValue"
    title="My Dialog"
    :loading="loading"
    @confirm="handleSubmit"
    @cancel="handleCancel"
    @update:model-value="$emit('update:model-value', $event)"
  >
    <v-form ref="form" @submit.prevent="handleSubmit">
      <!-- Form content -->
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { useDialogForm } from '@/composables/useDialogForm'

interface DialogForm {
  // Form data interface
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:model-value': [boolean]
  confirm: [DialogForm]
}>()

const { formData, loading, handleSubmit, handleCancel } = useDialogForm<DialogForm>({
  moduleName: 'MyDialog',
  initialData: {
    // Initial form data
  },
  validateForm: data => {
    // Validation logic
    return true
  },
  onSubmit: async data => {
    emit('confirm', data)
    emit('update:model-value', false)
  }
})
</script>
```

## Best Practices

1. Form Handling:

   - Always wrap form content in `v-form`
   - Use `@submit.prevent` to prevent form submission
   - Implement proper validation

2. State Management:

   - Use `formData` for reactive form data
   - Handle loading states appropriately
   - Implement proper error handling

3. Events:

   - Always emit `update:model-value` for v-model support
   - Use `confirm` event for form submission
   - Handle cancellation properly

4. Styling:
   - Use provided CSS variables for consistent styling
   - Follow the established design system
   - Use proper spacing classes

## Common Patterns

### Dialog with Validation

```typescript
const validateForm = (data: FormData): boolean | string => {
  if (!data.required_field) {
    return 'This field is required'
  }
  return true
}
```

### Dialog with Form Reset

```typescript
function handleCancel() {
  resetForm()
  emit('update:model-value', false)
}
```

### Dialog with Custom Actions

```vue
<base-dialog v-model="show" title="Custom Actions">
  <template #actions>
    <v-btn @click="customAction">Custom Action</v-btn>
    <v-btn color="primary" @click="handleConfirm">Confirm</v-btn>
  </template>
</base-dialog>
```
