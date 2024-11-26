# Полный план настройки и миграции проекта

## Stage 1: Подготовка нового проекта

### 1.1 Инициализация проекта

- [x] Создать новый Vue 3 проект с помощью Vite
  ```bash
  pnpm create vite backoffice --template vue-ts
  cd backoffice
  pnpm install
  ```
- [x] Настроить TypeScript (tsconfig.json с строгими правилами)
- [x] Установить необходимые зависимости (Vue Router, Pinia)
- [x] Настроить Vuetify 3

### 1.2 Git и процесс разработки

- [x] Инициализация Git
- [x ] Настроить .gitignore
- [x ] Настроить commitlint и husky
- [x ] Создать release.sh скрипт
- [x ] Настроить conventional commits
- [x ] Добавить GitHub Actions для CI
- [x ] Настроить ветки (main, develop, release)

### 1.3 Линтинг и форматирование

- [x] Настроить ESLint с правилами для Vue 3 + TS
- [x ] Настроить Prettier
- [x ] Добавить EditorConfig
- [x ] Настроить lint-staged
- [x ] Добавить VSCode расширения в рекомендации

### 1.4 Утилиты и помощники

- [x] Создать utils/formatter.ts (форматирование дат, чисел, валют)
- [x] Создать utils/time.ts (работа с датами, временем)
- [x] Добавить общие типы (types/common.ts)
- [x] Создать константы (constants/index.ts)

### 1.5 Стилизация

- [ ] Настроить SCSS
- [ ] Создать структуру стилей
  ```
  styles/
  ├── variables.scss
  ├── mixins.scss
  ├── functions.scss
  ├── themes/
  │   ├── light.scss
  │   └── dark.scss
  └── main.scss
  ```
- [ ] Настроить темы Vuetify
- [ ] Создать цветовую палитру
- [ ] Настроить типографику

### 1.6 Базовая структура проекта

- [ ] Создать структуру директорий
  ```
  src/
  ├── assets/
  ├── components/
  │   ├── common/
  │   └── ui/
  ├── composables/
  ├── layouts/
  ├── pages/
  ├── router/
  ├── stores/
  ├── services/
  ├── types/
  ├── utils/
  └── constants/
  ```
- [ ] Добавить базовые компоненты
- [ ] Настроить роутинг
- [ ] Создать базовый store

### 1.7 Автоматическая документация

- [ ] Настроить TypeDoc для API документации
  ```bash
  pnpm add -D typedoc
  ```
  - [ ] Создать конфигурацию typedoc.json
  - [ ] Добавить скрипты генерации
- [ ] Настроить VueDoc для компонентов

  ```bash
  pnpm add -D @vuedoc/parser @vuedoc/md
  ```

  - [ ] Создать скрипты генерации
  - [ ] Настроить шаблоны

- [ ] Установить и настроить Storybook
  ```bash
  pnpm dlx storybook@latest init
  ```
  - [ ] Настроить .storybook/main.ts
  - [ ] Создать примеры историй
- [ ] Настроить автоматизацию документации
  - [ ] Создать скрипты для полной генерации
  - [ ] Настроить CI/CD для документации
  - [ ] Настроить деплой на GitHub Pages

### 1.8 Firebase настройка

- [ ] Инициализировать Firebase проект
- [ ] Настроить Firebase окружения (dev/prod)
- [ ] Создать базовую конфигурацию
- [ ] Настроить аутентификацию

## Stage 2: Миграция core-функционала

- [ ] Перенести типы (Types) из монорепо
- [ ] Настроить авторизацию по пинкоду
- [ ] Мигрировать систему ролей
- [ ] Настроить store на Pinia
- [ ] Перенести основные сервисы
- [ ] Настроить Firebase правила безопасности

## Stage 3: UI миграция на Vuetify

- [ ] Создать базовые компоненты на Vuetify
- [ ] Мигрировать существующие UI компоненты
- [ ] Настроить темы и стили Vuetify
- [ ] Создать layout-компоненты
- [ ] Адаптировать формы под Vuetify компоненты

## Stage 4: Тестирование и оптимизация

- [ ] Протестировать авторизацию
- [ ] Проверить работу ролей
- [ ] Протестировать основные flow приложения
- [ ] Оптимизировать бандл
- [ ] Настроить CI/CD

## Stage 5: Деплой

- [ ] Настроить Firebase hosting
- [ ] Настроить environments variables
- [ ] Провести тестовый деплой на dev
- [ ] Финальный деплой на prod
- [ ] Мониторинг и логирование

## Конфигурационные файлы

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ESNext", "DOM"],
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### .eslintrc.js

```javascript
module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: ['plugin:vue/vue3-essential', '@vue/typescript/recommended', '@vue/prettier'],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  }
}
```

### .prettierrc

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### commitlint.config.js

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert', 'build']
    ]
  }
}
```

### release.sh

```bash
#!/bin/bash

# Получаем текущую версию из package.json
current_version=$(node -p "require('./package.json').version")

# Запрашиваем тип релиза
echo "Current version: $current_version"
echo "What kind of release? (major/minor/patch)"
read release_type

# Обновляем версию
npm version $release_type

# Получаем новую версию
new_version=$(node -p "require('./package.json').version")

# Создаем ветку релиза
git checkout -b release/v$new_version

# Собираем приложение
npm run build

# Создаем тег
git tag -a v$new_version -m "Release v$new_version"

# Пушим изменения
git push origin release/v$new_version
git push origin v$new_version

echo "Release v$new_version created and pushed"
```

## Рекомендации по разработке

1. **Структура компонентов**

   - Использовать Composition API
   - Придерживаться Single File Components
   - Выносить общую логику в composables

2. **Работа с типами**

   - Использовать строгую типизацию
   - Создавать интерфейсы для всех сущностей
   - Использовать дженерики где возможно

3. **Стилизация**

   - Использовать SCSS переменные
   - Следовать BEM методологии
   - Использовать миксины для переиспользуемых стилей

4. **Производительность**

   - Использовать lazy loading для роутов
   - Оптимизировать импорты
   - Применять кэширование где возможно

5. **Безопасность**
   - Валидировать все пользовательские входные данные
   - Использовать environment variables
   - Следовать принципу наименьших привилегий

## Запуск проекта

```bash
# Установка зависимостей
pnpm install

# Запуск dev сервера
pnpm dev

# Сборка для продакшена
pnpm build

# Запуск тестов
pnpm test

# Генерация документации
pnpm docs:all

# Линтинг
pnpm lint
```
