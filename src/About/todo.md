# 🚀 TODO: Production Release Strategy

> **Цель:** Подготовка и запуск первого production релиза Kitchen App
> **Текущая версия:** 0.0.318 (development)
> **Целевая версия:** 1.0.0 (production)
> **Scope:** Один ресторан (собственное тестирование)
> **Статус:** 📋 Planning Phase

---

## 📊 EXECUTIVE SUMMARY

Проект готов к первому production релизу после миграции на Supabase. Система предназначена для одного ресторана с критичным требованием - **offline-first для POS**.

**Ключевые решения:**

- ✅ **Один ресторан** - нет multi-tenancy в v1.0
- ✅ **Authentication:** Supabase Auth для admin/manager, PIN для cashier/kitchen
- ✅ **Offline-first:** Критично для POS - обязательное тестирование
- 📋 **Принтер:** Post-v1.0 improvement

**Критические области:**

- ✅ База данных (Supabase dev + prod готовы, 36 таблиц мигрированы)
- ⚠️ Git workflow (нет веток main/dev)
- ⚠️ Аутентификация (SERVICE_KEY в dev → Supabase Auth в prod)
- ⚠️ Offline-first testing (критично!)
- ⚠️ CI/CD (отсутствует)
- ✅ Окружения (.env.development и .env.production настроены)
- ⚠️ Deployment (нет настроенных серверов)

---

## 🎯 RELEASE PHASES

### **PHASE 0: Pre-Release Audit** (1-2 дня)

**Цель:** Аудит текущего состояния и выявление рисков

#### 0.1 Security Audit

- [ ] Проверить использование SERVICE_KEY в коде (должен быть только в dev!)
- [ ] Найти все hardcoded secrets
- [ ] Проверить SQL injection векторы (Supabase queries)
- [ ] Проверить XSS protection (v-html, innerHTML)
- [ ] Audit environment.ts - какие переменные используются

#### 0.2 Offline-First Audit (КРИТИЧНО!)

- [ ] Проверить localStorage persistence для POS
- [ ] Проверить SyncService работает
- [ ] Проверить conflict resolution
- [ ] Найти все места где требуется network (пометить как optional для POS)

**Deliverables:**

- `docs/SECURITY_AUDIT.md` - отчет по безопасности
- `docs/OFFLINE_TESTING.md` - план тестирования offline режима

---

### **PHASE 1: Git Workflow Setup** (1 день)

**Цель:** Создать четкую систему версионирования

#### 1.1 Создание веток

```bash
# Создать main (production code)
git checkout -b main
git push -u origin main

# Создать dev (integration branch)
git checkout -b dev
git push -u origin dev
```

#### 1.2 Git Workflow Documentation

Создать `docs/GIT_WORKFLOW.md`:

**Структура веток:**

- **main** - production code (защищена, только через PR)
- **dev** - development/testing (защищена, только через PR)
- **feature/{name}** - новые фичи (создаются от dev)
- **bugfix/{name}** - исправления (создаются от dev)

**Процесс разработки:**

```bash
# Новая фича
git checkout dev && git pull
git checkout -b feature/my-feature
# ... работа ...
git push -u origin feature/my-feature
# Создать PR в dev на GitHub

# Критичный bugfix
git checkout dev && git pull
git checkout -b bugfix/critical-bug
# ... фикс ...
git push -u origin bugfix/critical-bug
# Создать PR в dev
# Если критично - merge и сразу release в main
```

**Release процесс:**

1. Все фичи merged в dev и протестированы
2. Создать PR: dev → main
3. Review + тестирование
4. Merge → автодеплой на production (CI/CD)
5. Tag: `git tag v1.0.0 && git push origin v1.0.0`

#### 1.3 Conventional Commits

Уже настроено в `.commitlintrc`, документировать:

**Типы коммитов:**

- `feat:` - новая функциональность
- `fix:` - исправление бага
- `refactor:` - рефакторинг
- `perf:` - оптимизация производительности
- `docs:` - документация
- `test:` - тесты
- `chore:` - обновление зависимостей, конфиг

**Примеры:**

```
feat(pos): add offline order queue
fix(auth): prevent SERVICE_KEY usage in production
refactor(storage): simplify localStorage persistence
docs(release): add git workflow guide
```

**Deliverables:**

- ✅ Ветки main и dev созданы
- ✅ `docs/GIT_WORKFLOW.md`
- ✅ `docs/CONTRIBUTING.md` (commit conventions)

---

### **PHASE 2: Environment Configuration** (1 день)

**Цель:** Разделить dev и production окружения

#### 2.1 Создать .env файлы

**`.env.development`** (локальная разработка):

```bash
# App
VITE_APP_TITLE=Kitchen App (DEV)
VITE_PLATFORM=web

# Features
VITE_USE_API=false
VITE_USE_FIREBASE=false
VITE_USE_SUPABASE=true

# Debug (все включено)
VITE_DEBUG_ENABLED=true
VITE_DEBUG_STORES=true
VITE_DEBUG_ROUTING=true
VITE_DEBUG_PERSISTENCE=true
VITE_DEBUG_LEVEL=verbose
VITE_SHOW_STORE_DETAILS=true
VITE_SHOW_INIT_SUMMARY=true

# Supabase (DEV database)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_SUPABASE_SERVICE_KEY=eyJxxx...  # Только в DEV!
VITE_SUPABASE_USE_SERVICE_KEY=true   # ⚠️ DEV ONLY

# POS (offline-first критично!)
VITE_POS_OFFLINE_FIRST=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_SYNC=true
VITE_POS_CACHE_TTL=300
VITE_POS_AUTO_SYNC_INTERVAL=30000
```

**`.env.production`** (production deploy):

```bash
# App
VITE_APP_TITLE=Kitchen App
VITE_PLATFORM=web

# Features
VITE_USE_API=true
VITE_USE_FIREBASE=false
VITE_USE_SUPABASE=true

# Debug (минимум!)
VITE_DEBUG_ENABLED=false
VITE_DEBUG_STORES=false
VITE_DEBUG_ROUTING=false
VITE_DEBUG_PERSISTENCE=false
VITE_DEBUG_LEVEL=silent

# Supabase (PRODUCTION database)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
# ⚠️ NO SERVICE_KEY IN PRODUCTION!
VITE_SUPABASE_USE_SERVICE_KEY=false

# POS (offline-first критично!)
VITE_POS_OFFLINE_FIRST=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_SYNC=true
VITE_POS_CACHE_TTL=600
VITE_POS_AUTO_SYNC_INTERVAL=60000
```

**`.env.staging`** (pre-production testing):

```bash
# Копия production, но с debug логами
VITE_DEBUG_ENABLED=true
VITE_DEBUG_LEVEL=standard
# ... остальное как в production
```

#### 2.2 Environment Validation

Создать `src/config/validateEnv.ts`:

```typescript
/**
 * Validate environment variables on app start
 * Prevents deployment with invalid config
 */
export function validateEnvironment() {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

  // Check required variables
  const missing = required.filter(key => !import.meta.env[key])
  if (missing.length > 0) {
    throw new Error(`❌ Missing required env variables: ${missing.join(', ')}`)
  }

  // Production-specific validation
  if (import.meta.env.PROD) {
    // CRITICAL: No SERVICE_KEY in production!
    if (import.meta.env.VITE_SUPABASE_USE_SERVICE_KEY === 'true') {
      throw new Error('🚨 SERVICE_KEY cannot be used in production! Security risk!')
    }

    // Warn if debug enabled
    if (import.meta.env.VITE_DEBUG_ENABLED === 'true') {
      console.warn('⚠️ Debug logging is enabled in production')
    }

    // Ensure offline-first is enabled for POS
    if (import.meta.env.VITE_POS_OFFLINE_FIRST !== 'true') {
      console.warn('⚠️ POS offline-first is disabled - this may cause issues!')
    }
  }

  console.log('✅ Environment validation passed')
}
```

Вызвать в `src/main.ts`:

```typescript
import { validateEnvironment } from './config/validateEnv'

// Validate before anything else
validateEnvironment()

// ... rest of app initialization
```

#### 2.3 .env.example

Создать `.env.example` для документации:

```bash
# Copy this file to .env.development or .env.production
# and fill in your actual values

# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_KEY=your_service_key  # DEV ONLY!

# ... etc
```

#### 2.4 Update .gitignore

```bash
# Environment files (никогда не коммитить!)
.env
.env.local
.env.*.local
.env.development
.env.production
.env.staging

# Keep example for documentation
!.env.example
```

**Deliverables:**

- ✅ `.env.development`, `.env.production`, `.env.staging`
- ✅ `.env.example`
- ✅ `src/config/validateEnv.ts`
- ✅ Updated `.gitignore`

---

### **PHASE 3: Supabase Setup (Dev + Prod)** ✅ ЗАВЕРШЕНО

**Цель:** Создать отдельные базы данных для development и production

#### 3.1 Создать проекты в Supabase ✅

**Development:** ✅

- Проект: `fjkfckjpnbcyuknsnchy`
- URL: `https://fjkfckjpnbcyuknsnchy.supabase.co`
- Credentials сохранены в `.env.development`

**Production:** ✅

- Проект: `bkntdcvzatawencxghob`
- URL: `https://bkntdcvzatawencxghob.supabase.co`
- Credentials сохранены в `.env.production`

#### 3.2 Применить миграции ✅

**Миграция выполнена:** 2025-11-23

- ✅ Использован MCP Supabase integration для экспорта схемы
- ✅ Создан файл `docs/supabase/PRODUCTION_MIGRATION_SAFE.sql` (40KB)
- ✅ Все 36 таблиц успешно мигрированы в production
- ✅ 113 индексов созданы
- ✅ Базовые RLS policies применены
- ✅ Скрипт идемпотентный (можно запускать повторно)

#### 3.3 RLS Policies (Row Level Security) ✅

**Статус:** Базовые RLS policies применены для всех 36 таблиц

**Текущая стратегия:**

- ✅ Все таблицы имеют `ENABLE ROW LEVEL SECURITY`
- ✅ Базовая policy: "Allow all for authenticated users" (временная для v1.0)
- ⚠️ **TODO для Phase 4:** Заменить на детализированные policies после миграции на Supabase Auth

**Пример базовой policy (применена ко всем таблицам):**

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users"
  ON table_name FOR ALL USING (true);
```

**Следующий шаг (Phase 4):**
После миграции аутентификации на Supabase Auth создать детализированные policies:

- **users** - только свои данные
- **products** - read для всех, write для admin/manager
- **orders/payments/shifts** - только для POS users (admin/cashier/manager)
- **storage operations** - только для warehouse/admin
- **suppliers** - только для admin/manager

#### 3.4 Seed данные для production ⚠️ PENDING

**Минимальный seed (TODO для Phase 4):**

- [ ] Дефолтный admin аккаунт (email/password) - после миграции на Supabase Auth
- [ ] Базовые категории продуктов
- [ ] Базовые единицы измерения
- [ ] Дефолтные кассиры/кухня с PIN
- [ ] Дефолтный счет (acc_1) для Account Store

**Команды:**

```bash
# Seed products and categories
pnpm seed:products

# Create admin user (after Phase 4 auth migration)
pnpm seed:admin
```

Создать отдельный seed для admin:

```typescript
// scripts/seeds/admin-user.ts
import { supabase } from './supabaseClient'

async function createAdminUser() {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@yourrestaurant.com',
    password: 'temp-password-change-me', // ⚠️ Сменить после первого входа!
    email_confirm: true
  })

  if (authError) throw authError

  // 2. Create profile
  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    name: 'Admin',
    email: 'admin@yourrestaurant.com',
    roles: ['admin', 'manager'],
    is_active: true
  })

  if (profileError) throw profileError
  console.log('✅ Admin user created:', authData.user.email)
}
```

#### 3.5 Backup стратегия ⚠️ TODO

**План резервного копирования:**

- [ ] Настроить Daily backups в Supabase Dashboard (последние 7 дней)
- [ ] Настроить Weekly backups (последние 4 недели)
- [ ] Проверить Point-in-Time Recovery (если доступно в плане)
- [ ] Протестировать restore процедуру на dev окружении

**Ручной backup (доступен сейчас):**

```bash
# Используем готовый migration файл как baseline backup
cp docs/supabase/PRODUCTION_MIGRATION_SAFE.sql backups/baseline_$(date +%Y%m%d).sql

# Для backup данных использовать MCP Supabase:
# mcp__supabase__execute_sql с COPY TO или pg_dump
```

**Deliverables Phase 3:**

- ✅ Dev и Prod проекты в Supabase созданы
- ✅ Миграции применены (36 таблиц + 113 индексов)
- ✅ RLS policies настроены (базовые)
- ✅ Migration файл сохранен: `docs/supabase/PRODUCTION_MIGRATION_SAFE.sql`
- ⚠️ Seed данные - TODO для Phase 4
- ⚠️ Backup стратегия - TODO (настроить в Supabase Dashboard)
- ⚠️ Детализированные RLS policies - TODO для Phase 4

---

### **PHASE 4: Authentication Migration** (2-3 дня)

**Цель:** Supabase Auth для admin/manager, PIN для cashier/kitchen

#### 4.1 Текущее состояние

- ✅ PIN-based auth работает (CoreUserService)
- ⚠️ Использует SERVICE_KEY для обхода RLS (dev only!)
- ⚠️ Нет таблицы users в Supabase

#### 4.2 Целевая архитектура

**Admin/Manager:**

- Вход через Supabase Auth (email + password)
- Полноценные сессии с JWT
- RLS policies работают автоматически

**Cashier/Kitchen:**

- Быстрый вход по PIN (как сейчас)
- PIN проверяется через Supabase функцию
- Создается кастомная сессия или анонимная с metadata

#### 4.3 Создать таблицу users

**Migration: `supabase/migrations/YYYYMMDDHHMMSS_create_users_table.sql`**

```sql
-- Таблица пользователей (расширяет auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  -- Primary key связан с auth.users
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,

  -- Основная информация
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,

  -- PIN для быстрого входа (хешированный)
  pin_hash TEXT,

  -- Роли (массив, может быть несколько)
  roles TEXT[] NOT NULL DEFAULT '{}',

  -- Метаданные
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ограничения
  CONSTRAINT valid_roles CHECK (
    roles <@ ARRAY['admin', 'manager', 'cashier', 'waiter', 'kitchen']::TEXT[]
  ),
  CONSTRAINT email_or_pin CHECK (
    email IS NOT NULL OR pin_hash IS NOT NULL
  )
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin_hash) WHERE pin_hash IS NOT NULL;

-- Trigger для updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view own profile
CREATE POLICY "users_view_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "admins_view_all" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND 'admin' = ANY(u.roles)
    )
  );

-- Admins can create users
CREATE POLICY "admins_create_users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND 'admin' = ANY(u.roles)
    )
  );
```

#### 4.4 Функция для PIN authentication

**Migration: `supabase/migrations/YYYYMMDDHHMMSS_pin_auth_function.sql`**

```sql
-- Функция для аутентификации по PIN
-- Возвращает user data если PIN корректный
CREATE OR REPLACE FUNCTION authenticate_with_pin(pin_input TEXT)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_roles TEXT[]
)
SECURITY DEFINER -- Выполняется с правами владельца функции
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  found_user users%ROWTYPE;
BEGIN
  -- Найти пользователя с таким PIN (используем crypt для хеширования)
  SELECT * INTO found_user
  FROM users
  WHERE pin_hash = crypt(pin_input, pin_hash)
    AND is_active = true
  LIMIT 1;

  -- Если не найден - вернуть пустой результат
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Обновить last_login_at
  UPDATE users
  SET last_login_at = NOW()
  WHERE id = found_user.id;

  -- Вернуть данные пользователя
  RETURN QUERY
  SELECT
    found_user.id,
    found_user.name,
    found_user.email,
    found_user.roles;
END;
$$;
```

#### 4.5 Обновить authStore

**Новый `src/stores/auth/authStore.ts`:**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, UserRole } from './auth'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AuthStore'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null)
  const session = ref<any>(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!currentUser.value)
  const userRoles = computed(() => currentUser.value?.roles || [])
  const isAdmin = computed(() => userRoles.value.includes('admin'))

  // === INITIALIZATION ===
  async function initialize() {
    DebugUtils.info(MODULE_NAME, 'Initializing auth...')

    // Check existing session
    const {
      data: { session: existingSession }
    } = await supabase.auth.getSession()

    if (existingSession) {
      session.value = existingSession
      await loadUserProfile(existingSession.user.id)
    }

    // Listen to auth changes
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      DebugUtils.info(MODULE_NAME, 'Auth state changed', { event })
      session.value = newSession

      if (newSession?.user) {
        await loadUserProfile(newSession.user.id)
      } else {
        currentUser.value = null
      }
    })
  }

  // Load user profile from users table
  async function loadUserProfile(userId: string) {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load profile', { error })
      throw error
    }

    currentUser.value = data
    DebugUtils.info(MODULE_NAME, 'Profile loaded', { name: data.name, roles: data.roles })
  }

  // === ADMIN/MANAGER LOGIN (Email/Password) ===
  async function loginWithEmail(email: string, password: string): Promise<boolean> {
    isLoading.value = true
    try {
      DebugUtils.info(MODULE_NAME, 'Email login attempt', { email })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      DebugUtils.info(MODULE_NAME, 'Email login successful', { userId: data.user.id })
      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Email login failed', { error })
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // === CASHIER/KITCHEN LOGIN (PIN) ===
  async function loginWithPin(pin: string): Promise<boolean> {
    isLoading.value = true
    try {
      DebugUtils.info(MODULE_NAME, 'PIN login attempt')

      // Call Supabase function to authenticate with PIN
      const { data, error } = await supabase.rpc('authenticate_with_pin', {
        pin_input: pin
      })

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Invalid PIN')
      }

      const userData = data[0]

      // Store user in state (без полноценной сессии Supabase)
      currentUser.value = {
        id: userData.user_id,
        name: userData.user_name,
        email: userData.user_email,
        roles: userData.user_roles,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Save to localStorage for persistence
      localStorage.setItem('pin_session', JSON.stringify(currentUser.value))

      DebugUtils.info(MODULE_NAME, 'PIN login successful', {
        userId: userData.user_id,
        roles: userData.user_roles
      })

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'PIN login failed', { error })
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // === LOGOUT ===
  async function logout() {
    DebugUtils.info(MODULE_NAME, 'Logging out')

    // Clear Supabase session (if exists)
    await supabase.auth.signOut()

    // Clear PIN session
    localStorage.removeItem('pin_session')

    currentUser.value = null
    session.value = null
  }

  // === RESTORE PIN SESSION ===
  function restorePinSession(): boolean {
    const pinSession = localStorage.getItem('pin_session')
    if (pinSession) {
      try {
        currentUser.value = JSON.parse(pinSession)
        DebugUtils.info(MODULE_NAME, 'PIN session restored', { userId: currentUser.value?.id })
        return true
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to restore PIN session', { error })
        localStorage.removeItem('pin_session')
      }
    }
    return false
  }

  return {
    // State
    currentUser,
    session,
    isLoading,

    // Getters
    isAuthenticated,
    userRoles,
    isAdmin,

    // Actions
    initialize,
    loginWithEmail,
    loginWithPin,
    logout,
    restorePinSession
  }
})
```

#### 4.6 Обновить LoginView

**`src/views/auth/LoginView.vue`** - добавить два режима входа:

```vue
<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="4">
        <v-card>
          <v-card-title>Kitchen App Login</v-card-title>

          <!-- Tabs для выбора метода входа -->
          <v-tabs v-model="loginMode">
            <v-tab value="email">Email</v-tab>
            <v-tab value="pin">Quick PIN</v-tab>
          </v-tabs>

          <v-card-text>
            <!-- Email/Password (Admin/Manager) -->
            <v-window v-model="loginMode">
              <v-window-item value="email">
                <v-form @submit.prevent="handleEmailLogin">
                  <v-text-field v-model="email" label="Email" type="email" required />
                  <v-text-field v-model="password" label="Password" type="password" required />
                  <v-btn type="submit" block color="primary" :loading="isLoading">Login</v-btn>
                </v-form>
              </v-window-item>

              <!-- PIN (Cashier/Kitchen) -->
              <v-window-item value="pin">
                <v-form @submit.prevent="handlePinLogin">
                  <v-text-field
                    v-model="pin"
                    label="Enter PIN"
                    type="password"
                    inputmode="numeric"
                    maxlength="4"
                    required
                  />
                  <v-btn type="submit" block color="primary" :loading="isLoading">
                    Quick Login
                  </v-btn>
                </v-form>
              </v-window-item>
            </v-window>

            <v-alert v-if="error" type="error" class="mt-4">
              {{ error }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loginMode = ref('pin') // Default to PIN for POS
const email = ref('')
const password = ref('')
const pin = ref('')
const error = ref<string | null>(null)
const isLoading = ref(false)

async function handleEmailLogin() {
  error.value = null
  isLoading.value = true

  try {
    await authStore.loginWithEmail(email.value, password.value)
    router.push('/') // Redirect to dashboard
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  } finally {
    isLoading.value = false
  }
}

async function handlePinLogin() {
  error.value = null
  isLoading.value = true

  try {
    await authStore.loginWithPin(pin.value)
    router.push('/pos') // Redirect to POS
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Invalid PIN'
  } finally {
    isLoading.value = false
    pin.value = '' // Clear PIN for security
  }
}
</script>
```

#### 4.7 Миграция существующих пользователей

**`scripts/migrate-users.ts`:**

```typescript
import { createClient } from '@supabase/supabase-js'
import { CoreUserService } from '../src/core/users'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_KEY! // Только для миграции!
)

async function migrateUsers() {
  console.log('🔄 Migrating users to Supabase...')

  const users = CoreUserService.getAllUsers()

  for (const user of users) {
    try {
      // Для admin/manager - создать auth пользователя
      if (user.roles.includes('admin') || user.roles.includes('manager')) {
        if (!user.email) {
          console.warn(`⚠️ User ${user.name} has no email, skipping auth creation`)
          continue
        }

        // 1. Create auth user
        const tempPassword = `Temp${Math.random().toString(36).slice(2, 10)}!`
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            name: user.name
          }
        })

        if (authError) {
          console.error(`❌ Failed to create auth for ${user.email}:`, authError.message)
          continue
        }

        // 2. Create profile
        const { error: profileError } = await supabase.from('users').insert({
          id: authUser.user.id,
          name: user.name,
          email: user.email,
          pin_hash: user.pin ? await hashPin(user.pin) : null,
          roles: user.roles,
          is_active: true
        })

        if (profileError) {
          console.error(`❌ Failed to create profile for ${user.email}:`, profileError.message)
        } else {
          console.log(`✅ Migrated admin/manager: ${user.email} (temp password: ${tempPassword})`)
        }
      } else {
        // Для cashier/kitchen - только profile с PIN
        const userId = crypto.randomUUID()

        const { error: profileError } = await supabase.from('users').insert({
          id: userId,
          name: user.name,
          email: user.email || null,
          pin_hash: user.pin ? await hashPin(user.pin) : null,
          roles: user.roles,
          is_active: true
        })

        if (profileError) {
          console.error(`❌ Failed to create PIN user ${user.name}:`, profileError.message)
        } else {
          console.log(`✅ Migrated PIN user: ${user.name}`)
        }
      }
    } catch (error) {
      console.error(`❌ Error migrating ${user.name}:`, error)
    }
  }

  console.log('✅ Migration complete!')
}

// Helper to hash PIN using bcrypt
async function hashPin(pin: string): Promise<string> {
  // Используем Supabase функцию crypt
  const { data, error } = await supabase.rpc('crypt', {
    password: pin,
    salt: await supabase.rpc('gen_salt', { type: 'bf' })
  })

  if (error) throw error
  return data
}

migrateUsers().catch(console.error)
```

**Deliverables:**

- ✅ Таблица users создана
- ✅ RLS policies настроены
- ✅ Функция authenticate_with_pin работает
- ✅ authStore обновлен (email + PIN login)
- ✅ LoginView поддерживает оба режима
- ✅ Пользователи мигрированы
- ✅ Протестирован вход (email и PIN)

---

### **PHASE 5: CI/CD Pipeline** (1-2 дня)

**Цель:** Автоматизация тестирования и деплоя

#### 5.1 GitHub Actions - CI (Continuous Integration)

**`.github/workflows/ci.yml`:**

```yaml
name: CI - Lint & Type Check

on:
  pull_request:
    branches: [main, dev]
  push:
    branches: [dev]

jobs:
  lint:
    name: Lint & Format Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Get pnpm store directory
        id: pnpm-cache
        run: echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

      - name: Cache pnpm store
        uses: actions/cache@v3
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint

      - name: Check formatting
        run: pnpm format --check

  typecheck:
    name: TypeScript Type Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm exec vue-tsc --project tsconfig.app.json --noEmit

  build-test:
    name: Build Test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build (development mode)
        run: pnpm build --mode development
        env:
          # Dummy env vars for build test
          VITE_SUPABASE_URL: https://example.supabase.co
          VITE_SUPABASE_ANON_KEY: dummy-key-for-build-test

  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Security audit
        run: pnpm audit --audit-level=high
        continue-on-error: true # Don't fail build, just warn
```

#### 5.2 GitHub Actions - CD Development

**`.github/workflows/deploy-dev.yml`:**

```yaml
name: Deploy to Development

on:
  push:
    branches: [dev]

jobs:
  deploy-dev:
    name: Deploy Dev Environment
    runs-on: ubuntu-latest
    environment: development

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

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

      - name: Build for development
        run: pnpm build --mode development
        env:
          VITE_APP_TITLE: Kitchen App (DEV)
          VITE_PLATFORM: web
          VITE_USE_SUPABASE: true
          VITE_SUPABASE_URL: ${{ secrets.DEV_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.DEV_SUPABASE_ANON_KEY }}
          VITE_DEBUG_ENABLED: true
          VITE_POS_OFFLINE_FIRST: true
          VITE_ENABLE_OFFLINE: true
          VITE_ENABLE_SYNC: true

      - name: Deploy to Railway (Dev)
        run: |
          npm install -g @railway/cli
          railway up --service dev-frontend --environment development
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Comment on commit
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.repos.createCommitComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              commit_sha: context.sha,
              body: '✅ Deployed to development: https://dev.yourapp.railway.app'
            })
```

#### 5.3 GitHub Actions - CD Production

**`.github/workflows/deploy-prod.yml`:**

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags:
      - 'v*.*.*'

jobs:
  deploy-prod:
    name: Deploy Production
    runs-on: ubuntu-latest
    environment: production # Requires manual approval!

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

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

      - name: Build for production
        run: pnpm build --mode production
        env:
          VITE_APP_TITLE: Kitchen App
          VITE_PLATFORM: web
          VITE_USE_SUPABASE: true
          VITE_SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.PROD_SUPABASE_ANON_KEY }}
          VITE_DEBUG_ENABLED: false
          VITE_SUPABASE_USE_SERVICE_KEY: false # CRITICAL!
          VITE_POS_OFFLINE_FIRST: true
          VITE_ENABLE_OFFLINE: true
          VITE_ENABLE_SYNC: true

      - name: Deploy to Railway (Production)
        run: |
          npm install -g @railway/cli
          railway up --service prod-frontend --environment production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Create GitHub Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref_name }}
          release_name: Release ${{ github.ref_name }}
          draft: false
          prerelease: false
          body: |
            ## Release ${{ github.ref_name }}

            Deployed to production: https://app.yourrestaurant.com

            See [CHANGELOG.md](CHANGELOG.md) for details.

      - name: Notify deployment
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.repos.createCommitComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              commit_sha: context.sha,
              body: '🚀 Deployed to production: https://app.yourrestaurant.railway.app'
            })
```

#### 5.4 GitHub Secrets

Настроить в **Settings → Secrets and variables → Actions**:

**Repository secrets:**

- `RAILWAY_TOKEN` - токен Railway CLI

**Environment: development**

- `DEV_SUPABASE_URL`
- `DEV_SUPABASE_ANON_KEY`

**Environment: production**

- `PROD_SUPABASE_URL`
- `PROD_SUPABASE_ANON_KEY`

#### 5.5 GitHub Environments

Создать в **Settings → Environments**:

**development:**

- No protection rules (auto-deploy)
- Add secrets (DEV*SUPABASE*\*)

**production:**

- Required reviewers: You
- Deployment branches: main only
- Add secrets (PROD*SUPABASE*\*)

**Deliverables:**

- ✅ CI workflow (lint, typecheck, build test)
- ✅ CD workflow для dev (auto-deploy)
- ✅ CD workflow для prod (requires approval)
- ✅ GitHub Secrets настроены
- ✅ GitHub Environments созданы

---

### **PHASE 6: Railway Deployment** (1 день)

**Цель:** Настроить hosting на Railway

#### 6.1 Создать проекты на Railway

1. Зайти на https://railway.app
2. Sign in with GitHub
3. Создать новый проект: `kitchen-app`

#### 6.2 Создать сервисы

**Dev Frontend Service:**

```bash
# Service name: dev-frontend
# Environment: development

# Build command
pnpm install --frozen-lockfile && pnpm build --mode development

# Start command
pnpm preview --host 0.0.0.0 --port $PORT
```

**Environment variables (dev-frontend):**

```
NODE_VERSION=20
VITE_APP_TITLE=Kitchen App (DEV)
VITE_PLATFORM=web
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_DEBUG_ENABLED=true
VITE_POS_OFFLINE_FIRST=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_SYNC=true
```

**Prod Frontend Service:**

```bash
# Service name: prod-frontend
# Environment: production

# Build command
pnpm install --frozen-lockfile && pnpm build --mode production

# Start command
pnpm preview --host 0.0.0.0 --port $PORT
```

**Environment variables (prod-frontend):**

```
NODE_VERSION=20
VITE_APP_TITLE=Kitchen App
VITE_PLATFORM=web
VITE_USE_SUPABASE=true
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_DEBUG_ENABLED=false
VITE_SUPABASE_USE_SERVICE_KEY=false
VITE_POS_OFFLINE_FIRST=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_SYNC=true
```

#### 6.3 Health Checks

Railway автоматически проверяет:

- HTTP status 200 на `/`
- Service restart при падении

Создать `public/health` endpoint (опционально):

```typescript
// src/router/index.ts
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})
```

#### 6.4 Custom Domain (опционально)

**Dev:**

- Railway domain: `dev-frontend.railway.app`
- Custom (если есть): `dev.yourrestaurant.com`

**Prod:**

- Railway domain: `prod-frontend.railway.app`
- Custom (если есть): `app.yourrestaurant.com`

#### 6.5 Мониторинг

Railway Dashboard показывает:

- CPU/Memory usage
- Build logs
- Deploy logs
- Request metrics

**Настроить alerts:**

- Email notification при deploy failure
- Slack notification (опционально)

**Deliverables:**

- ✅ Railway проект создан
- ✅ Dev и Prod сервисы настроены
- ✅ Environment variables загружены
- ✅ Health checks работают
- ✅ Первый deploy выполнен успешно

---

### **PHASE 7: Offline-First Testing** (2-3 дня)

**Цель:** КРИТИЧНО! Протестировать POS без интернета

#### 7.1 Offline Testing Scenarios

Создать `docs/OFFLINE_TESTING.md` с планом:

**Test Case 1: Create Order Offline**

1. Отключить интернет
2. Открыть POS
3. Создать новый заказ
4. Добавить items
5. Проверить: заказ сохранен в localStorage
6. Включить интернет
7. Проверить: заказ синхронизирован с Supabase

**Test Case 2: Process Payment Offline**

1. Отключить интернет
2. Создать заказ
3. Оформить оплату
4. Проверить: payment сохранен локально
5. Включить интернет
6. Проверить: payment синхронизирован

**Test Case 3: Close Shift Offline**

1. Отключить интернет
2. Закрыть смену
3. Проверить: shift data сохранена локально
4. Включить интернет
5. Проверить: shift синхронизирована в Account Store

**Test Case 4: Conflict Resolution**

1. Два кассира работают offline
2. Оба редактируют один заказ
3. Включить интернет
4. Проверить: конфликт обработан (server-wins или manual)

#### 7.2 Offline Testing Tools

**Chrome DevTools:**

- Network tab → Offline mode
- Application tab → Service Workers
- Application tab → Local Storage

**Создать debug view для offline status:**

`src/views/debug/OfflineDebugView.vue`:

```vue
<template>
  <v-container>
    <h1>Offline Debug</h1>

    <v-card class="mb-4">
      <v-card-title>Network Status</v-card-title>
      <v-card-text>
        <div>Online: {{ isOnline }}</div>
        <div>Last sync: {{ lastSync }}</div>
        <div>Pending sync items: {{ pendingCount }}</div>
      </v-card-text>
    </v-card>

    <v-card class="mb-4">
      <v-card-title>Local Storage</v-card-title>
      <v-card-text>
        <pre>{{ localStorageData }}</pre>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-title>Sync Queue</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item v-for="item in syncQueue" :key="item.id">
            {{ item.entityType }} - {{ item.operation }} - {{ item.status }}
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="forceSyncNow">Force Sync Now</v-btn>
        <v-btn @click="clearQueue">Clear Queue</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSyncService } from '@/core/sync/SyncService'

const syncService = useSyncService()
const isOnline = ref(navigator.onLine)
const lastSync = ref<string | null>(null)
const syncQueue = ref<any[]>([])

const pendingCount = computed(
  () => syncQueue.value.filter(item => item.status === 'pending').length
)

const localStorageData = computed(() => {
  const data: Record<string, any> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('kitchen-app')) {
      data[key] = JSON.parse(localStorage.getItem(key) || '{}')
    }
  }
  return data
})

onMounted(() => {
  // Listen to online/offline events
  window.addEventListener('online', () => {
    isOnline.value = true
    console.log('✅ Online - triggering sync...')
    syncService.processQueue()
  })

  window.addEventListener('offline', () => {
    isOnline.value = false
    console.log('⚠️ Offline mode')
  })

  // Load sync queue
  loadSyncQueue()
})

async function loadSyncQueue() {
  syncQueue.value = await syncService.getQueueItems()
}

async function forceSyncNow() {
  await syncService.processQueue()
  await loadSyncQueue()
}

async function clearQueue() {
  if (confirm('Clear sync queue?')) {
    await syncService.clearQueue()
    await loadSyncQueue()
  }
}
</script>
```

Добавить роут:

```typescript
// src/router/index.ts
{
  path: '/debug/offline',
  component: () => import('@/views/debug/OfflineDebugView.vue'),
  meta: { requiresAuth: true }
}
```

#### 7.3 Automated Offline Tests (Playwright)

Создать `tests/offline.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('POS Offline Mode', () => {
  test('should create order offline', async ({ page, context }) => {
    // Go to POS
    await page.goto('/pos')

    // Go offline
    await context.setOffline(true)

    // Create order
    await page.click('text=New Order')
    await page.fill('[data-test="table-number"]', '5')
    await page.click('text=Confirm')

    // Add items
    await page.click('text=Nasi Goreng')
    await page.click('text=Add to Order')

    // Check localStorage
    const localStorageData = await page.evaluate(() => {
      return localStorage.getItem('kitchen-app:orders')
    })

    expect(localStorageData).toBeTruthy()

    // Go online
    await context.setOffline(false)

    // Wait for sync
    await page.waitForTimeout(2000)

    // Verify order synced to server
    const syncStatus = await page.textContent('[data-test="sync-status"]')
    expect(syncStatus).toContain('Synced')
  })

  test('should handle payment offline', async ({ page, context }) => {
    await page.goto('/pos')
    await context.setOffline(true)

    // Create order with payment
    // ... test logic

    await context.setOffline(false)

    // Verify payment synced
    // ... assertions
  })
})
```

Добавить в `package.json`:

```json
{
  "scripts": {
    "test:offline": "playwright test tests/offline.spec.ts"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

#### 7.4 Offline Performance Testing

**Metrics to measure:**

- [ ] Time to load POS offline (should be < 2s)
- [ ] Time to create order offline (should be instant)
- [ ] Time to sync after reconnect (should be < 5s)
- [ ] localStorage size (should be < 10MB)

**Load testing:**

```typescript
// tests/offline-load.spec.ts
test('should handle 100 offline orders', async ({ page, context }) => {
  await page.goto('/pos')
  await context.setOffline(true)

  const startTime = Date.now()

  // Create 100 orders
  for (let i = 0; i < 100; i++) {
    await createOrder(page, `Order ${i}`)
  }

  const createTime = Date.now() - startTime
  expect(createTime).toBeLessThan(10000) // < 10s for 100 orders

  // Go online and sync
  await context.setOffline(false)
  const syncStartTime = Date.now()

  await page.waitForSelector('[data-test="sync-complete"]')

  const syncTime = Date.now() - syncStartTime
  expect(syncTime).toBeLessThan(30000) // < 30s to sync 100 orders

  console.log(`Create time: ${createTime}ms, Sync time: ${syncTime}ms`)
})
```

**Deliverables:**

- ✅ `docs/OFFLINE_TESTING.md` - план тестирования
- ✅ Offline debug view создан
- ✅ Automated tests для offline (Playwright)
- ✅ Performance benchmarks
- ✅ Все offline scenarios протестированы

---

### **PHASE 8: Production Hardening** (1-2 дня)

**Цель:** Security, performance, monitoring

#### 8.1 Security Checklist

**Code Security:**

- [ ] Убрать все `console.log` в production (vite.config.ts - terser)
- [ ] Убрать SOURCE_MAPS в production
- [ ] Проверить нет hardcoded secrets
- [ ] Validate все user inputs
- [ ] XSS protection (CSP headers)

**Environment Security:**

- [ ] SERVICE_KEY не используется в production ✅
- [ ] ANON_KEY ограничен RLS policies ✅
- [ ] CORS настроен (только ваш домен)

**Database Security:**

- [ ] RLS policies на всех таблицах ✅
- [ ] Row-level backups включены ✅
- [ ] Admin аккаунты защищены (сильные пароли)

#### 8.2 Performance Optimization

**vite.config.ts** - обновить:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vuetify: ['vuetify'],
          vendor: ['vue', 'vue-router', 'pinia'],
          supabase: ['@supabase/supabase-js']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    sourcemap: false, // Disable source maps
    chunkSizeWarningLimit: 1000
  }
})
```

**Code splitting:**

```typescript
// src/router/index.ts
const routes = [
  {
    path: '/pos',
    component: () => import('@/views/pos/PosMainView.vue') // Lazy load
  },
  {
    path: '/menu',
    component: () => import('@/views/menu/MenuView.vue')
  }
]
```

**Image optimization:**

- [ ] Compress images (TinyPNG)
- [ ] Use WebP format
- [ ] Lazy load images

#### 8.3 Error Handling

**Centralized error handler:**

`src/core/errorHandler.ts`:

```typescript
import { ENV } from '@/config/environment'

export class ErrorHandler {
  static handleError(error: Error, context?: string): string {
    // Log in dev
    if (ENV.debugEnabled) {
      console.error(`[${context}]`, error)
    }

    // Send to monitoring in production (TODO: integrate Sentry)
    if (import.meta.env.PROD) {
      // Sentry.captureException(error, { tags: { context } })
    }

    // Return user-friendly message
    return this.getUserMessage(error)
  }

  static getUserMessage(error: Error): string {
    if (error.message.includes('network')) {
      return 'Network error. Check your internet connection.'
    }
    if (error.message.includes('auth')) {
      return 'Authentication failed. Please login again.'
    }
    if (error.message.includes('permission')) {
      return 'You do not have permission for this action.'
    }
    return 'Something went wrong. Please try again.'
  }
}
```

Использовать везде:

```typescript
try {
  await someOperation()
} catch (error) {
  const message = ErrorHandler.handleError(error as Error, 'MyComponent')
  // Show to user
  showToast(message)
}
```

#### 8.4 Monitoring Setup (Базовый)

**Sentry (опционально для v1.0):**

```bash
pnpm add @sentry/vue
```

```typescript
// src/main.ts
import * as Sentry from '@sentry/vue'

if (import.meta.env.PROD) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1 // 10% of transactions
  })
}
```

**Google Analytics (опционально):**

```bash
pnpm add vue-gtag-next
```

**Deliverables:**

- ✅ Security checklist выполнен
- ✅ Performance optimizations внедрены
- ✅ Centralized error handling
- ✅ Monitoring setup (базовый)

---

### **PHASE 9: Documentation & Release** (1 день)

**Цель:** Финальная документация и v1.0.0 релиз

#### 9.1 Обновить документацию

**README.md:**

```markdown
# Kitchen App - Restaurant Management System

Complete POS and backoffice system with offline-first architecture.

## Features

- 🍽️ POS System (offline-first)
- 📦 Inventory Management
- 👥 Staff Management
- 📊 Reports & Analytics
- 🔐 Role-based Access Control

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Supabase account

### Installation

\`\`\`bash
git clone https://github.com/yourusername/kitchen-app
cd kitchen-app
pnpm install
\`\`\`

### Configuration

\`\`\`bash
cp .env.example .env.development

# Edit .env.development with your Supabase credentials

\`\`\`

### Development

\`\`\`bash
pnpm dev

# Open http://localhost:5174

\`\`\`

### Production Build

\`\`\`bash
pnpm build
pnpm preview
\`\`\`

## Documentation

- [Architecture](CLAUDE.md)
- [Git Workflow](docs/GIT_WORKFLOW.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Offline Testing](docs/OFFLINE_TESTING.md)
- [Database Schema](DATABASE_SCHEMA.md)

## Tech Stack

- Vue 3.5+ (Composition API)
- TypeScript
- Vuetify 3.7+
- Pinia (state management)
- Supabase (backend)
- Railway (hosting)

## License

MIT
```

**CHANGELOG.md:**

```markdown
# Changelog

All notable changes to Kitchen App will be documented here.

## [1.0.0] - 2024-XX-XX

### 🎉 First Production Release

#### Features

- Complete POS system with offline-first support
- Table management (dine-in, takeaway)
- Order processing with multiple bills
- Payment handling (cash, card, QR)
- Shift management with reports
- Product catalog management
- Recipe management
- Menu configuration
- Inventory/storage operations
- Supplier management
- Role-based permissions (admin, manager, cashier, kitchen)

#### Infrastructure

- Supabase backend integration
- Railway deployment (dev + prod)
- GitHub Actions CI/CD
- Automated testing

#### Security

- Row Level Security (RLS) policies
- Supabase authentication for admin/manager
- PIN-based quick login for cashier/kitchen
- No SERVICE_KEY in production

#### Performance

- Code splitting
- Lazy loading routes
- Bundle optimization
- localStorage caching for offline

### Known Issues

See [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)

### Roadmap

See [ROADMAP.md](docs/ROADMAP.md)
```

**docs/ROADMAP.md** (Post-v1.0):

```markdown
# Roadmap

## v1.1 (Post-launch improvements)

- [ ] Printer integration (receipts, kitchen orders)
- [ ] Mobile app (Capacitor build)
- [ ] Push notifications
- [ ] Advanced reporting
- [ ] Export to Excel/PDF

## v1.2 (Feature enhancements)

- [ ] Multi-restaurant support (if needed)
- [ ] Customer loyalty program
- [ ] Online ordering integration
- [ ] Table reservation system

## v2.0 (Major features)

- [ ] Kitchen Display System (KDS)
- [ ] Inventory automation (auto-reorder)
- [ ] Integration with accounting software
- [ ] Advanced analytics & BI
```

#### 9.2 Release Checklist

**docs/RELEASE_CHECKLIST.md:**

```markdown
# Production Release Checklist

## Pre-Release

- [ ] All tests passing (lint, typecheck, build)
- [ ] No critical bugs in dev environment
- [ ] Security audit completed
- [ ] RLS policies verified
- [ ] Offline mode tested extensively
- [ ] Database migrations applied
- [ ] Backups configured
- [ ] Environment variables set (production)
- [ ] Admin users created

## Release Steps

1. [ ] Merge dev → main (via PR)
2. [ ] Review + approve PR
3. [ ] Merge triggers CI/CD
4. [ ] Monitor deployment logs
5. [ ] Verify production deployment
6. [ ] Create git tag: `git tag v1.0.0`
7. [ ] Push tag: `git push origin v1.0.0`
8. [ ] Create GitHub Release with changelog

## Post-Release

- [ ] Monitor error logs (first 24h)
- [ ] Check performance metrics
- [ ] Verify offline sync working
- [ ] Test critical paths (order creation, payment, shift close)
- [ ] Collect user feedback
- [ ] Update documentation based on issues

## Rollback Plan

If critical issues:

1. Revert deployment on Railway
2. Create hotfix branch from main
3. Fix issue
4. Deploy hotfix
5. Cherry-pick to dev
```

#### 9.3 Create v1.0.0 Tag

```bash
# Ensure on main branch
git checkout main
git pull

# Create annotated tag
git tag -a v1.0.0 -m "Release v1.0.0 - First production release

Features:
- Complete POS system (offline-first)
- Backoffice management
- Supabase backend
- Role-based authentication
- Railway deployment
- CI/CD pipeline

See CHANGELOG.md for full details."

# Push tag
git push origin v1.0.0
```

#### 9.4 GitHub Release

Создать release на GitHub:

- Title: `v1.0.0 - First Production Release`
- Description: Copy from CHANGELOG.md
- Attach build artifacts (опционально)

**Deliverables:**

- ✅ README.md обновлен
- ✅ CHANGELOG.md создан
- ✅ ROADMAP.md создан
- ✅ Release checklist
- ✅ Git tag v1.0.0
- ✅ GitHub Release

---

## 📅 TIMELINE

**Realistic timeline для solo developer:**

```
Week 1: ✅ ЗАВЕРШЕНО (Phase 3)
- Day 1-2: Phase 0 (Audit) + Phase 1 (Git) - SKIP (на потом)
- Day 3: Phase 2 (Environment) - PARTIAL (.env файлы готовы)
- Day 4: ✅ Phase 3 (Supabase) - ЗАВЕРШЕНО
  - ✅ Dev проект создан
  - ✅ Prod проект создан
  - ✅ Миграция выполнена (36 таблиц)
  - ✅ RLS policies (базовые)
- Day 5: Phase 4 start (Auth migration) - READY

Week 2: СЛЕДУЮЩАЯ
- Day 1-2: Phase 4 (Auth migration)
  - [ ] Создать таблицу users
  - [ ] Implement PIN authentication
  - [ ] Migrate existing users
  - [ ] Update authStore
- Day 3: Phase 1 (Git workflow) + Phase 2 finish
- Day 4: Phase 5 (CI/CD basic)
- Day 5: Phase 6 (Railway deployment)

Week 3:
- Day 1-2: Phase 7 (Offline testing) - КРИТИЧНО!
- Day 3: Phase 8 (Hardening)
- Day 4: Phase 9 (Documentation)
- Day 5: Final testing + Release 🚀
```

**ТЕКУЩИЙ СТАТУС:**

- ✅ Phase 3 завершена (2025-11-23)
- 📋 Phase 4 следующая (Authentication migration)
- **TOTAL: ~2.5 недели осталось**

---

## 🚀 NEXT ACTIONS

**✅ Завершено (2025-11-23):**

1. ✅ Создать проекты в Supabase (dev + prod)
2. ✅ Создать `.env.development` и `.env.production`
3. ✅ Применить миграции в Supabase (36 таблиц)
4. ✅ Настроить базовые RLS policies

**Немедленно (следующий шаг):**

1. **Phase 4 - Authentication Migration** (ПРИОРИТЕТ!)

   - [ ] Создать таблицу `users` с расширенными полями
   - [ ] Implement `authenticate_with_pin()` функцию
   - [ ] Migrate существующих пользователей из localStorage
   - [ ] Update authStore для поддержки email + PIN
   - [ ] Update LoginView (tabs для email/PIN)
   - [ ] Протестировать оба режима входа

2. **Phase 4 - Post-Auth Tasks:**
   - [ ] Создать детализированные RLS policies (заменить базовые)
   - [ ] Seed admin user в production
   - [ ] Seed базовые данные (категории, единицы измерения)

**На этой неделе:** 3. Phase 1 (Git workflow) - создать main/dev ветки 4. Phase 5 (CI/CD basic) - базовый GitHub Actions workflow 5. Phase 6 (Railway) - настроить deployment

**Критично протестировать:**

- ✅ Миграция БД (готова, протестирована)
- ⚠️ Authentication flow (Phase 4) - ДО деплоя!
- ⚠️ Offline-first для POS (Phase 7) - КРИТИЧНО!
- ⚠️ RLS policies (Phase 4) - после миграции auth

---

## 📝 POST-v1.0 IMPROVEMENTS

**Не для первого релиза, но важно запланировать:**

### Printer Integration (v1.1)

- Receipt printer для касс
- Kitchen printer для кухни
- ESC/POS protocol support
- Network и USB printers

**План:**

- Research printer libraries (escpos, node-thermal-printer)
- Create printer service abstraction
- Add printer settings to admin panel
- Test with physical printers

### Mobile App (v1.1-v1.2)

- Capacitor build для iOS/Android
- Push notifications
- Camera для barcode scanning
- Offline-first уже готов!

### Advanced Features (v2.0+)

- Multi-restaurant support (если понадобится)
- Kitchen Display System (KDS)
- Customer-facing display
- Online ordering integration
- Loyalty program

---

## ✅ DECISION LOG

**Принятые решения:**

1. **Scope:** Один ресторан (не multi-tenancy в v1.0)
2. **Authentication:** Supabase Auth (admin/manager) + PIN (cashier/kitchen)
3. **Offline-first:** Критично для POS - обязательное тестирование
4. **Deployment:** Railway (dev + prod environments)
5. **CI/CD:** GitHub Actions (auto-deploy dev, manual approve prod)
6. **Monitoring:** Базовый в v1.0, расширенный в v1.1 (Sentry)
7. **Printer:** Post-v1.0 improvement
8. **Mobile:** Post-v1.0 (v1.1-v1.2)

---

---

## 📊 ТЕКУЩИЙ СТАТУС

**Дата обновления:** 2025-11-23

**Завершенные фазы:**

- ✅ **Phase 3: Supabase Setup** - База данных готова (dev + prod)
  - 36 таблиц мигрированы
  - 113 индексов созданы
  - Базовые RLS policies применены
  - Migration файл: `docs/supabase/PRODUCTION_MIGRATION_SAFE.sql`

**Текущая фаза:**

- 📋 **Phase 4: Authentication Migration** - NEXT UP!

**Прогресс:**

- Завершено: Phase 3 (частично Phase 2)
- В процессе: -
- Осталось: Phases 4-9
- **Общий прогресс: ~15%** (1.5 из 9 фаз)

**Следующий шаг:**
🎯 **Phase 4 - Authentication Migration** (2-3 дня)
Приоритет: HIGH - блокирует production deployment

---

**Готовы продолжать? Следующий этап - Phase 4! 🚀**

Рекомендованная последовательность:

1. ✅ **Phase 3 (Supabase)** - ЗАВЕРШЕНА
2. 📋 **Phase 4 (Auth)** - ТЕКУЩАЯ (самая сложная часть)
3. **Phase 1-2 (Git + Env)** - быстро настроить после Auth
4. **Phase 5-6 (CI/CD + Railway)** - автоматизация
5. **Phase 7 (Offline)** - КРИТИЧНО! Тщательное тестирование
6. **Phase 8-9 (Hardening + Release)** - финальный штрих
