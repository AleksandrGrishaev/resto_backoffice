# 🚀 TODO: Production Release Strategy & Roadmap

> **Цель:** Подготовка и запуск первого публичного релиза системы Kitchen App
> **Текущая версия:** 0.0.318 (development)
> **Целевая версия:** 1.0.0 (production)
> **Статус:** 📋 Planning Phase

---

## 📊 EXECUTIVE SUMMARY

Проект готов к первому production релизу после миграции на Supabase. Требуется структурировать workflow, настроить CI/CD, разделить окружения (dev/prod), и внедрить production-grade аутентификацию.

**Критические области:**
- ✅ База данных (Supabase готова)
- ⚠️ Git workflow (нет веток main/dev)
- ⚠️ Аутентификация (используется PIN + SERVICE_KEY в dev)
- ⚠️ CI/CD (отсутствует)
- ⚠️ Окружения (нет разделения dev/prod)
- ⚠️ Deployment (нет настроенных серверов)

---

## 🎯 STRATEGIC PHASES

### **PHASE 0: Pre-Release Audit** (1-2 дня)
**Цель:** Понять текущее состояние и выявить все риски

#### 0.1 Code & Architecture Audit
- [ ] Провести security audit кода (SQL injection, XSS, secrets в коде)
- [ ] Проверить все TODO/FIXME комментарии в коде
- [ ] Документировать все известные баги (создать KNOWN_ISSUES.md)
- [ ] Проверить обработку ошибок в критических путях (auth, payments, orders)
- [ ] Audit environment.ts - какие переменные используются

#### 0.2 Database Audit
- [ ] Проверить RLS policies на всех таблицах (via MCP: `get_advisors`)
- [ ] Проверить индексы для производительности
- [ ] Задокументировать текущую схему БД (обновить DATABASE_SCHEMA.md)
- [ ] Проверить миграции (все ли применены)
- [ ] Создать backup стратегию

#### 0.3 Dependency Audit
- [ ] Проверить устаревшие пакеты (`pnpm outdated`)
- [ ] Обновить критичные security patches
- [ ] Проверить bundle size (`pnpm build` + analyze)
- [ ] Задокументировать все production dependencies

**Deliverables:**
- `SECURITY_AUDIT.md` - отчет по безопасности
- `KNOWN_ISSUES.md` - известные проблемы
- `DEPENDENCIES.md` - зависимости и их версии

---

### **PHASE 1: Git Workflow & Branching Strategy** (1 день)
**Цель:** Создать четкую систему работы с версиями кода

#### 1.1 Создание основных веток
```bash
# Текущий код станет основой для main
git checkout -b main
git push -u origin main

# Создать dev ветку
git checkout -b dev
git push -u origin dev

# Создать hotfix ветку (для срочных фиксов в production)
git checkout main
git checkout -b hotfix
git push -u origin hotfix
```

#### 1.2 Branch Protection Rules (настроить на GitHub)
- [ ] **main** - защищена, только через PR, требует review
- [ ] **dev** - защищена, только через PR
- [ ] **feature/** - свободная работа
- [ ] **hotfix/** - для срочных фиксов production

#### 1.3 Git Workflow Documentation
Создать `docs/GIT_WORKFLOW.md`:

```markdown
# Git Workflow

## Ветки
- **main** - production code (всегда стабильная версия)
- **dev** - integration branch (тестируемая версия)
- **feature/{name}** - новые фичи
- **bugfix/{name}** - исправления багов
- **hotfix/{name}** - срочные фиксы production

## Процесс разработки

### Новая фича
1. Создать ветку от dev: `git checkout dev && git pull && git checkout -b feature/my-feature`
2. Разработка + commits
3. Push: `git push -u origin feature/my-feature`
4. Создать PR в dev
5. После review → merge в dev
6. Тестирование в dev окружении
7. Когда готово к релизу → PR из dev в main

### Hotfix (срочный фикс production)
1. Создать ветку от main: `git checkout main && git pull && git checkout -b hotfix/critical-bug`
2. Исправление + commits
3. Push: `git push -u origin hotfix/critical-bug`
4. Создать PR в main (требует review)
5. После merge в main → cherry-pick в dev: `git checkout dev && git cherry-pick <commit-hash>`

### Release процесс
1. Все фичи merged в dev и протестированы
2. Создать PR: dev → main
3. Review + approve
4. Merge → автоматический deploy на production (CI/CD)
5. Tag версии: `git tag v1.0.0 && git push origin v1.0.0`
```

#### 1.4 Commitlint & Conventional Commits
- [ ] Проверить `.commitlintrc` (уже есть)
- [ ] Добавить prepare-commit-msg hook
- [ ] Документировать commit convention в CONTRIBUTING.md

**Commit types:**
- `feat:` - новая фича
- `fix:` - исправление бага
- `refactor:` - рефакторинг
- `docs:` - документация
- `chore:` - рутинные задачи (deps, config)
- `perf:` - оптимизация
- `test:` - тесты

**Deliverables:**
- Созданы ветки main, dev, hotfix
- `docs/GIT_WORKFLOW.md`
- `docs/CONTRIBUTING.md`

---

### **PHASE 2: Environment Configuration** (1 день)
**Цель:** Разделить dev и production окружения

#### 2.1 Создать .env файлы

**`.env.development`** (для локальной разработки):
```bash
# App
VITE_APP_TITLE=Kitchen App (DEV)
VITE_PLATFORM=web
VITE_API_URL=http://localhost:3000

# Features
VITE_USE_API=false
VITE_USE_FIREBASE=false
VITE_USE_SUPABASE=true

# Debug (все включено в dev)
VITE_DEBUG_ENABLED=true
VITE_DEBUG_STORES=true
VITE_DEBUG_ROUTING=true
VITE_DEBUG_PERSISTENCE=true
VITE_DEBUG_LEVEL=verbose
VITE_SHOW_STORE_DETAILS=true
VITE_SHOW_INIT_SUMMARY=true

# Supabase (DEV database)
VITE_SUPABASE_URL=https://your-project-dev.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
VITE_SUPABASE_SERVICE_KEY=your-dev-service-key
VITE_SUPABASE_USE_SERVICE_KEY=true  # ⚠️ Only in dev!

# POS
VITE_POS_OFFLINE_FIRST=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_SYNC=true
```

**`.env.production`** (для production):
```bash
# App
VITE_APP_TITLE=Kitchen App
VITE_PLATFORM=web
VITE_API_URL=https://api.yourapp.com

# Features
VITE_USE_API=true
VITE_USE_FIREBASE=false
VITE_USE_SUPABASE=true

# Debug (минимум в production)
VITE_DEBUG_ENABLED=false
VITE_DEBUG_STORES=false
VITE_DEBUG_ROUTING=false
VITE_DEBUG_PERSISTENCE=false
VITE_DEBUG_LEVEL=silent

# Supabase (PRODUCTION database)
VITE_SUPABASE_URL=https://your-project-prod.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
# ⚠️ NO SERVICE_KEY in production!
VITE_SUPABASE_USE_SERVICE_KEY=false

# POS
VITE_POS_OFFLINE_FIRST=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_SYNC=true
```

**`.env.staging`** (для тестирования перед production):
```bash
# Копия production, но с включенными логами
VITE_DEBUG_ENABLED=true
VITE_DEBUG_LEVEL=standard
# ... остальное как в production
```

#### 2.2 .env.example для документации
Создать `.env.example` с описанием всех переменных (без секретов).

#### 2.3 Обновить .gitignore
```bash
# Environment files
.env
.env.local
.env.*.local
.env.development
.env.production
.env.staging

# Keep example
!.env.example
```

#### 2.4 Валидация environment
Создать `src/config/validateEnv.ts`:
```typescript
export function validateEnvironment() {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]

  const missing = required.filter(key => !import.meta.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required env variables: ${missing.join(', ')}`)
  }

  // Production-specific checks
  if (import.meta.env.PROD) {
    if (import.meta.env.VITE_SUPABASE_USE_SERVICE_KEY === 'true') {
      throw new Error('SERVICE_KEY cannot be used in production!')
    }
    if (import.meta.env.VITE_DEBUG_ENABLED === 'true') {
      console.warn('⚠️ Debug is enabled in production!')
    }
  }
}
```

Вызвать в `main.ts`:
```typescript
import { validateEnvironment } from './config/validateEnv'
validateEnvironment()
```

**Deliverables:**
- `.env.development`, `.env.production`, `.env.staging`
- `.env.example`
- `src/config/validateEnv.ts`

---

### **PHASE 3: Supabase Setup (Dev + Prod)** (1 день)
**Цель:** Создать отдельные базы данных для dev и production

#### 3.1 Создать Production проект в Supabase
1. Зайти на https://supabase.com
2. Создать новый проект: `kitchen-app-production`
3. Выбрать регион (ближайший к вашим пользователям)
4. Сохранить credentials:
   - Project URL
   - anon/public key
   - service_role key (НЕ использовать в frontend!)

#### 3.2 Создать Development проект (если еще нет)
1. Создать проект: `kitchen-app-development`
2. Сохранить credentials

#### 3.3 Миграции базы данных
Убедиться что все миграции применены:
```bash
# Проверить список миграций
pnpm exec supabase migration list

# Применить миграции в dev
pnpm exec supabase db push --db-url "postgresql://..."

# Применить миграции в prod (осторожно!)
pnpm exec supabase db push --db-url "postgresql://..." --linked
```

#### 3.4 Row Level Security (RLS) Policies
Проверить через MCP:
```typescript
mcp__supabase__get_advisors({ type: 'security' })
```

Критичные таблицы для RLS:
- [ ] `users` - только свои данные
- [ ] `orders` - только своего ресторана
- [ ] `payments` - только своего ресторана
- [ ] `shifts` - только свои смены
- [ ] `products` - read для всех, write для admin/manager
- [ ] `menu` - read для всех, write для admin/manager

**Пример RLS policy:**
```sql
-- Пользователи могут видеть только свои данные
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Админы и менеджеры могут управлять продуктами
CREATE POLICY "Admin/Manager can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );
```

#### 3.5 Seed данные для production
Создать минимальный seed для production:
- [ ] Дефолтный admin аккаунт
- [ ] Базовые категории продуктов
- [ ] Базовые единицы измерения

```bash
# Запустить seed для production (осторожно!)
pnpm seed:products --env production
```

#### 3.6 Backup стратегия
Настроить автоматические backups в Supabase:
- Daily backups (последние 7 дней)
- Weekly backups (последние 4 недели)

**Deliverables:**
- Production и Development проекты в Supabase
- Все миграции применены
- RLS policies настроены
- Seed данные загружены

---

### **PHASE 4: Authentication & Authorization** (2-3 дня)
**Цель:** Заменить PIN-аутентификацию на Supabase Auth

#### 4.1 Текущее состояние (что у нас есть)
- ✅ PIN-based auth (работает локально)
- ✅ Role-based permissions (admin, manager, cashier, etc.)
- ⚠️ Использует SERVICE_KEY для обхода RLS (только dev!)
- ⚠️ Нет таблицы users в Supabase

#### 4.2 Стратегия миграции
**Вариант A: Supabase Auth + Magic Link (рекомендуется для production)**
- Пользователи входят по email + magic link (без пароля)
- Для кассиров - быстрый вход по PIN (сохраняется)
- Supabase управляет сессиями автоматически

**Вариант B: Supabase Auth + Email/Password**
- Классический вход email + password
- Для кассиров - PIN (как сейчас)

**Вариант C: Гибридный (рекомендую для вас)**
- Admin/Manager - Supabase Auth (email + password или magic link)
- Cashier/POS - PIN-based (как сейчас, но с Supabase RLS)

#### 4.3 Создание таблицы users в Supabase

**Migration: `create_users_table.sql`**
```sql
-- Таблица пользователей (расширяет Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,

  -- Основные поля
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,

  -- PIN для быстрого входа (кассиры)
  pin TEXT, -- хешированный PIN

  -- Роли (может быть несколько)
  roles TEXT[] NOT NULL DEFAULT '{}',

  -- Ресторан/организация
  restaurant_id UUID REFERENCES restaurants(id),

  -- Метаданные
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ограничения
  CONSTRAINT valid_roles CHECK (
    roles <@ ARRAY['admin', 'manager', 'cashier', 'waiter', 'kitchen']::TEXT[]
  )
);

-- Индексы
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_pin ON users(pin) WHERE pin IS NOT NULL;
CREATE INDEX idx_users_restaurant ON users(restaurant_id);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Пользователи видят только свои данные
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Админы видят всех пользователей своего ресторана
CREATE POLICY "Admins can view restaurant users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND 'admin' = ANY(u.roles)
      AND u.restaurant_id = users.restaurant_id
    )
  );

-- Только админы могут создавать пользователей
CREATE POLICY "Admins can create users"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND 'admin' = ANY(u.roles)
    )
  );

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

#### 4.4 Обновить authStore.ts

**Новый `src/stores/auth/authStore.ts`:**
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, UserRole } from './auth'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null)
  const session = ref<any>(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!currentUser.value)
  const userRoles = computed(() => currentUser.value?.roles || [])

  // Инициализация - проверить существующую сессию
  async function initialize() {
    const { data: { session: existingSession } } = await supabase.auth.getSession()

    if (existingSession) {
      session.value = existingSession
      await loadUserProfile(existingSession.user.id)
    }

    // Подписаться на изменения auth
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      session.value = newSession
      if (newSession?.user) {
        await loadUserProfile(newSession.user.id)
      } else {
        currentUser.value = null
      }
    })
  }

  // Загрузить профиль пользователя
  async function loadUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    currentUser.value = data
  }

  // Вход по email/password
  async function loginWithEmail(email: string, password: string) {
    isLoading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      return true
    } finally {
      isLoading.value = false
    }
  }

  // Вход по PIN (для кассиров)
  async function loginWithPin(pin: string) {
    isLoading.value = true
    try {
      // Найти пользователя по PIN (нужна функция в Supabase)
      const { data, error } = await supabase.rpc('authenticate_with_pin', {
        pin_input: pin
      })

      if (error) throw error
      if (!data) throw new Error('Invalid PIN')

      // Создать анонимную сессию для этого пользователя
      // (или использовать service key временно)
      currentUser.value = data
      return true
    } finally {
      isLoading.value = false
    }
  }

  // Выход
  async function logout() {
    await supabase.auth.signOut()
    currentUser.value = null
    session.value = null
  }

  return {
    currentUser,
    isAuthenticated,
    userRoles,
    isLoading,
    initialize,
    loginWithEmail,
    loginWithPin,
    logout
  }
})
```

#### 4.5 Supabase Function для PIN auth

**`supabase/functions/authenticate_with_pin.sql`:**
```sql
CREATE OR REPLACE FUNCTION authenticate_with_pin(pin_input TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  roles TEXT[],
  restaurant_id UUID
) AS $$
DECLARE
  hashed_pin TEXT;
BEGIN
  -- Хешировать входной PIN
  hashed_pin := crypt(pin_input, gen_salt('bf'));

  -- Найти пользователя с таким PIN
  RETURN QUERY
  SELECT u.id, u.name, u.email, u.roles, u.restaurant_id
  FROM users u
  WHERE u.pin = hashed_pin
  AND u.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 4.6 Миграция существующих пользователей
Создать скрипт для миграции пользователей из `CoreUserService` в Supabase:

**`scripts/migrate-users-to-supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js'
import { CoreUserService } from '../src/core/users'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_KEY! // Только для миграции!
)

async function migrateUsers() {
  const hardcodedUsers = CoreUserService.getAllUsers() // Получить всех из текущей системы

  for (const user of hardcodedUsers) {
    // 1. Создать auth пользователя (если есть email)
    if (user.email) {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: generateRandomPassword(), // Временный пароль
        email_confirm: true
      })

      if (authError) {
        console.error(`Failed to create auth user for ${user.email}:`, authError)
        continue
      }

      // 2. Создать профиль в users таблице
      const { error: profileError } = await supabase.from('users').insert({
        id: authUser.user.id,
        name: user.name,
        email: user.email,
        pin: user.pin ? await hashPin(user.pin) : null,
        roles: user.roles,
        is_active: true
      })

      if (profileError) {
        console.error(`Failed to create profile for ${user.email}:`, profileError)
      } else {
        console.log(`✅ Migrated user: ${user.email}`)
      }
    }
  }
}

migrateUsers().catch(console.error)
```

#### 4.7 Обновить компоненты входа

**`src/views/auth/LoginView.vue`** - добавить две опции:
- Email/Password для admin/manager
- PIN для cashier

**Deliverables:**
- Таблица users в Supabase
- RLS policies настроены
- authStore.ts обновлен для Supabase Auth
- PIN authentication работает через Supabase
- Миграция существующих пользователей
- Обновленный UI входа

---

### **PHASE 5: CI/CD Pipeline** (1-2 дня)
**Цель:** Автоматизировать тестирование, сборку и деплой

#### 5.1 GitHub Actions Workflow

**`.github/workflows/ci.yml`** - для тестирования и сборки:
```yaml
name: CI

on:
  pull_request:
    branches: [main, dev]
  push:
    branches: [dev]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm build --mode development

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Security audit
        run: pnpm audit --audit-level=high
```

**`.github/workflows/deploy-dev.yml`** - автодеплой dev:
```yaml
name: Deploy to Development

on:
  push:
    branches: [dev]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: development

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build --mode development
        env:
          VITE_SUPABASE_URL: ${{ secrets.DEV_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.DEV_SUPABASE_ANON_KEY }}
          # ... остальные env variables

      - name: Deploy to Railway (Dev)
        run: |
          npm install -g @railway/cli
          railway up --service dev-frontend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**`.github/workflows/deploy-prod.yml`** - деплой production:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build --mode production
        env:
          VITE_SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.PROD_SUPABASE_ANON_KEY }}
          VITE_DEBUG_ENABLED: false
          # ... остальные production env

      - name: Deploy to Railway (Production)
        run: |
          npm install -g @railway/cli
          railway up --service prod-frontend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
```

#### 5.2 GitHub Secrets
Настроить в GitHub Settings → Secrets:

**Development:**
- `DEV_SUPABASE_URL`
- `DEV_SUPABASE_ANON_KEY`

**Production:**
- `PROD_SUPABASE_URL`
- `PROD_SUPABASE_ANON_KEY`

**Railway:**
- `RAILWAY_TOKEN`

#### 5.3 GitHub Environments
Создать в Settings → Environments:
- **development** - автодеплой при push в dev
- **production** - требует approval при push в main

**Deliverables:**
- CI workflow для проверки кода
- Deploy workflow для dev и production
- GitHub Secrets настроены
- GitHub Environments настроены

---

### **PHASE 6: Railway Deployment Setup** (1 день)
**Цель:** Настроить hosting на Railway для dev и prod

#### 6.1 Создать проекты на Railway

1. Зайти на https://railway.app
2. Создать новый проект: `kitchen-app`
3. Создать два сервиса:
   - `dev-frontend` - для dev окружения
   - `prod-frontend` - для production

#### 6.2 Настроить сервисы

**Dev Frontend:**
```bash
# Build command
pnpm install && pnpm build --mode development

# Start command
pnpm preview --host 0.0.0.0 --port $PORT

# Environment variables
NODE_VERSION=20
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# ... остальные из .env.development
```

**Prod Frontend:**
```bash
# Build command
pnpm install && pnpm build --mode production

# Start command
pnpm preview --host 0.0.0.0 --port $PORT

# Environment variables
NODE_VERSION=20
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# ... остальные из .env.production
```

#### 6.3 Custom Domain (опционально)
- Dev: `dev.yourapp.com`
- Prod: `app.yourapp.com`

#### 6.4 Мониторинг и логи
Railway автоматически собирает логи. Настроить:
- Health checks
- Auto-deploy on push (через GitHub Actions)
- Rollback стратегия

**Deliverables:**
- Railway проекты созданы
- Dev и Prod сервисы настроены
- Env variables загружены
- Первый deploy выполнен

---

### **PHASE 7: Production Hardening** (2-3 дня)
**Цель:** Подготовить систему к production нагрузке

#### 7.1 Security Checklist
- [ ] Убрать все console.log в production (vite.config.ts - terser)
- [ ] Убрать SOURCE_MAPS в production
- [ ] Убрать SERVICE_KEY из frontend
- [ ] Проверить все API endpoints на rate limiting
- [ ] Добавить CORS настройки
- [ ] Проверить CSP (Content Security Policy)
- [ ] Добавить Helmet headers
- [ ] Проверить XSS protection
- [ ] Проверить CSRF protection

#### 7.2 Performance Optimization
- [ ] Включить code splitting в vite.config
- [ ] Оптимизировать bundle size (analyze)
- [ ] Добавить lazy loading для роутов
- [ ] Оптимизировать images (compression)
- [ ] Включить gzip/brotli compression
- [ ] Настроить CDN для static assets (опционально)

#### 7.3 Error Handling & Monitoring
**Создать centralized error handler:**

`src/core/errorHandler.ts`:
```typescript
export class ErrorHandler {
  static handleError(error: Error, context?: string) {
    // Log to console in dev
    if (import.meta.env.DEV) {
      console.error(`[${context}]`, error)
    }

    // Send to monitoring service in production
    if (import.meta.env.PROD) {
      // TODO: Integrate Sentry or similar
      // Sentry.captureException(error, { tags: { context } })
    }

    // Show user-friendly message
    return this.getUserFriendlyMessage(error)
  }

  static getUserFriendlyMessage(error: Error): string {
    // Map technical errors to user-friendly messages
    if (error.message.includes('network')) {
      return 'Network connection lost. Please check your internet.'
    }
    if (error.message.includes('auth')) {
      return 'Authentication failed. Please login again.'
    }
    return 'Something went wrong. Please try again.'
  }
}
```

#### 7.4 Настроить мониторинг (опционально для v1.0)
**Варианты:**
- Sentry (для error tracking)
- LogRocket (для session replay)
- Google Analytics (для usage metrics)
- PostHog (для product analytics)

#### 7.5 Database Performance
- [ ] Добавить индексы на часто используемые поля
- [ ] Настроить connection pooling
- [ ] Проверить slow queries
- [ ] Настроить database backups

**Deliverables:**
- Security checklist выполнен
- Performance optimizations внедрены
- Error handling настроен
- Monitoring setup (базовый)

---

### **PHASE 8: Documentation & Release** (1-2 дня)
**Цель:** Документировать систему и выпустить v1.0.0

#### 8.1 Обновить документацию

**README.md:**
```markdown
# Kitchen App

Restaurant management system with POS and backoffice.

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Supabase account

### Installation
\`\`\`bash
git clone https://github.com/yourname/kitchen-app
cd kitchen-app
pnpm install
cp .env.example .env.development
# Edit .env.development with your Supabase credentials
\`\`\`

### Development
\`\`\`bash
pnpm dev
\`\`\`

### Production Build
\`\`\`bash
pnpm build
pnpm preview
\`\`\`

## Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [Git Workflow](docs/GIT_WORKFLOW.md)
- [Deployment](docs/DEPLOYMENT.md)
- [API Reference](docs/API.md)

## License
MIT
```

**docs/DEPLOYMENT.md:**
- Инструкции по деплою на Railway
- Environment variables
- Database setup
- Troubleshooting

**docs/ARCHITECTURE.md:**
- Описание архитектуры (из CLAUDE.md)
- Диаграммы (опционально)
- Store structure
- Authentication flow

**CHANGELOG.md:**
```markdown
# Changelog

## [1.0.0] - 2024-XX-XX

### 🎉 First Production Release

#### Added
- Complete POS system with table management
- Order processing with multiple bills
- Payment handling (cash, card, QR)
- Shift management
- Product catalog management
- Recipe management
- Menu configuration
- Storage/warehouse operations
- Supplier management
- Supabase integration
- Role-based permissions
- CI/CD pipeline

#### Security
- Row Level Security (RLS) policies
- Supabase authentication
- PIN-based quick login for cashiers

#### Infrastructure
- Railway deployment (dev + prod)
- GitHub Actions CI/CD
- Automated testing
```

#### 8.2 Создать Release Checklist

**docs/RELEASE_CHECKLIST.md:**
```markdown
# Release Checklist

## Pre-Release
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Security audit completed
- [ ] Performance tested
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] Backups configured

## Release
- [ ] Merge dev → main
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] CI/CD deploys to production
- [ ] Verify production deployment
- [ ] Create GitHub Release with changelog

## Post-Release
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify user feedback
- [ ] Update documentation if needed
```

#### 8.3 Версионирование

Обновить `package.json`:
```json
{
  "version": "1.0.0"
}
```

Создать git tag:
```bash
git tag -a v1.0.0 -m "First production release"
git push origin v1.0.0
```

#### 8.4 GitHub Release
Создать release на GitHub с:
- Changelog
- Built artifacts (опционально)
- Migration guide (если нужно)

**Deliverables:**
- README.md обновлен
- Документация создана
- CHANGELOG.md заполнен
- Release Checklist
- Git tag v1.0.0
- GitHub Release опубликован

---

## 🚨 CRITICAL ISSUES TO DISCUSS

### 1. Authentication Strategy (ОЧЕНЬ ВАЖНО!)

**Текущая проблема:**
- PIN-based auth работает только локально
- Используется SERVICE_KEY в dev (обходит RLS)
- Нет настоящей таблицы users в Supabase

**Вопросы для принятия решения:**
1. Готовы ли вы перейти на полноценную Supabase Auth для admin/manager?
2. Оставляем ли PIN-вход только для кассиров (быстрый доступ)?
3. Нужна ли двухфакторная аутентификация для админов?

**Рекомендация:**
- Admin/Manager → Email + Password (через Supabase Auth)
- Cashier → PIN (быстрый вход, но через Supabase функцию)
- Все сессии управляются Supabase

### 2. Multi-tenancy (несколько ресторанов)

**Вопрос:** Будет ли система использоваться для:
- A) Одного ресторана (ваш проект)
- B) Нескольких ресторанов (SaaS платформа)

**Если B, нужно добавить:**
- Таблица `restaurants`
- Все данные привязаны к `restaurant_id`
- RLS policies фильтруют по ресторану
- Отдельные домены/поддомены для каждого ресторана

### 3. Offline-First для POS (критично!)

**Текущее состояние:**
- Есть SyncService
- localStorage используется для offline
- Но нет тестирования offline режима

**Нужно протестировать:**
- [ ] POS работает без интернета
- [ ] Заказы сохраняются локально
- [ ] Синхронизация при восстановлении связи
- [ ] Conflict resolution (что если два кассира редактируют один заказ)

**Рекомендация:** Тщательно протестировать offline mode перед production!

### 4. Payment Processing

**Вопрос:** Будет ли интеграция с реальными платежными системами?
- Stripe
- Square
- Local payment gateway (Indonesia?)

**Если да, нужно:**
- Добавить payment provider интеграцию
- Webhook handling
- Payment reconciliation
- Refund handling

### 5. Logging & Monitoring в Production

**Текущее состояние:**
- Много console.log в коде
- DebugUtils отключается в production

**Вопросы:**
1. Нужен ли полноценный error tracking (Sentry)?
2. Нужна ли аналитика пользователей (Google Analytics)?
3. Нужен ли performance monitoring (Lighthouse CI)?

**Рекомендация для v1.0:**
- Минимум: базовый error tracking (можно бесплатный Sentry plan)
- Опционально: Google Analytics для usage metrics

### 6. Testing Strategy

**Текущее состояние:**
- Нет автоматических тестов
- Есть integration tests в `appInitializerTests.ts`

**Вопросы:**
1. Нужны ли unit tests перед production?
2. Нужны ли E2E tests (Playwright/Cypress)?

**Рекомендация:**
- Для v1.0: минимум smoke tests (basic flow работает)
- Post-v1.0: добавить E2E tests для критичных путей (order creation, payment, shift close)

### 7. Mobile App (Capacitor)

**Вопрос:** Планируется ли запуск mobile app одновременно с web?

**Если да, дополнительно нужно:**
- iOS/Android build pipeline
- App Store / Play Store публикация
- Push notifications setup
- Mobile-specific testing

**Рекомендация:**
- v1.0: только web version
- v1.1: mobile app (проще тестировать и итерировать)

### 8. Backup & Disaster Recovery

**Критично для production!**

**Нужно настроить:**
- [ ] Automated database backups (Supabase имеет built-in)
- [ ] Backup testing (проверить что restore работает!)
- [ ] Disaster recovery plan (что делать если БД упала)
- [ ] Data retention policy (сколько хранить старые заказы/смены)

**Рекомендация:**
- Daily backups (последние 7 дней)
- Weekly backups (последние 4 недели)
- Monthly archives
- Test restore процедуру перед production!

---

## 📅 TIMELINE ESTIMATE

**Агрессивный план (solo developer):**
- Phase 0: Pre-Release Audit → 2 дня
- Phase 1: Git Workflow → 1 день
- Phase 2: Environment Config → 1 день
- Phase 3: Supabase Setup → 1 день
- Phase 4: Authentication → 3 дня (самая сложная часть)
- Phase 5: CI/CD → 1 день
- Phase 6: Railway Setup → 1 день
- Phase 7: Production Hardening → 2 дня
- Phase 8: Documentation → 1 день

**TOTAL: ~13 рабочих дней (2.5 недели)**

**Консервативный план:**
- Добавить +50% времени на непредвиденные проблемы
- **TOTAL: ~20 дней (1 месяц)**

---

## 🎯 MINIMUM VIABLE RELEASE (MVR)

Если нужно запустить быстрее, минимальный набор:

**Must Have для v1.0:**
- ✅ Phase 1: Git workflow (main/dev ветки)
- ✅ Phase 2: Environment separation (dev/prod .env)
- ✅ Phase 3: Production Supabase database
- ✅ Phase 4: Basic Supabase Auth (хотя бы email/password)
- ✅ Phase 6: Deployment на Railway (prod)
- ✅ Basic security (no SERVICE_KEY in production)

**Can Wait для v1.1:**
- ⏸️ Phase 5: Full CI/CD (можно делать manual deploy)
- ⏸️ Phase 7: Advanced monitoring (Sentry, etc.)
- ⏸️ Advanced offline testing
- ⏸️ E2E tests

---

## 📋 NEXT STEPS

1. **Прочитать этот план полностью**
2. **Принять решения по Critical Issues** (секция выше)
3. **Выбрать timeline:** агрессивный или консервативный
4. **Начать с Phase 0:** Pre-Release Audit
5. **Создать проекты в Supabase** (dev + prod)
6. **Настроить .env файлы**
7. **Создать git ветки** (main, dev)

**Готовы начать? Дайте знать с какой фазы начнем! 🚀**
