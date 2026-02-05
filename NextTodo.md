# NextTodo.md - Current Sprint

## ✅ Phase 1 - Multi-channel Sales Architecture (COMPLETED)

**Итоги Phase 1:**

- DB: `137_sales_channels.sql` - 3 таблицы + колонки в orders + seed + RLS + triggers
- Store: `src/stores/channels/` (store + service + mappers + types + index)
- UI: ChannelsListView (CRUD каналов), ChannelPricingView (матрица цен с inline-edit)
- POS: channelId/channelCode в PosOrder, OrderTypeDialog с выбором канала delivery
- Init: channels в StoreName, dependencies (channels → menu), обе стратегии загрузки
- Router: /channels, /menu/channel-pricing с lazy store guards
- **Техдолг:** RLS упрощён до `USING(true)`, `(supabaseOrder as any)` касты до регенерации types.gen.ts

---

## 🎯 Sprint: Phase 2 - GoBiz Integration Core

**Цель:** Создать базовую интеграцию с GoBiz API - аутентификация, хранение credentials, и Supabase Edge Function для проксирования запросов.

**Предпосылки:**

- Нужны API credentials от GoBiz (client_id, client_secret, outlet_id)
- Sandbox окружение для тестирования
- OAuth: `https://integration-goauth.gojekapi.com/`
- API: `https://api.partner-sandbox.gobiz.co.id/`
- Token lifetime: 3600 сек (1 час), нужен auto-refresh

**Архитектурный подход:**

- Credentials и токены хранятся в Supabase (серверная таблица, не на клиенте)
- API-запросы к GoBiz проксируются через Supabase Edge Functions (не из браузера!)
- Клиент вызывает Edge Function → Edge Function берёт токен из БД → вызывает GoBiz API
- Это обеспечивает безопасность (client_secret не на клиенте) и обход CORS

---

## 📋 Tasks

### Task 1: Database - GoBiz Config Table

**Status:** [ ] Not Started

**Файл миграции:** `src/supabase/migrations/138_gobiz_config.sql`

```sql
-- Migration: 138_gobiz_config
-- Description: Create GoBiz integration config table for storing credentials and tokens
-- Date: 2026-02-XX

-- 1. GoBiz Integration Config
CREATE TABLE IF NOT EXISTS gobiz_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id TEXT NOT NULL,                     -- GoBiz outlet ID
  outlet_name TEXT,                            -- Human-readable name
  client_id TEXT NOT NULL,                     -- OAuth client ID
  client_secret TEXT NOT NULL,                 -- OAuth client secret (encrypted at rest by Supabase)
  access_token TEXT,                           -- Current OAuth access token
  refresh_token TEXT,                          -- Current refresh token
  token_expires_at TIMESTAMPTZ,               -- When access_token expires
  environment TEXT NOT NULL DEFAULT 'sandbox'  -- 'sandbox' | 'production'
    CHECK (environment IN ('sandbox', 'production')),
  webhook_secret TEXT,                         -- For verifying webhook signatures
  settings JSONB DEFAULT '{}',                 -- Additional settings
  is_active BOOLEAN DEFAULT true,
  last_error TEXT,                             -- Last error message from API
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX idx_gobiz_config_active ON gobiz_config(is_active) WHERE is_active = true;

-- 3. RLS - только admin может видеть/менять credentials
ALTER TABLE gobiz_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin read gobiz_config" ON gobiz_config
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin'));

CREATE POLICY "Allow admin manage gobiz_config" ON gobiz_config
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin'));

-- 4. Service role needs full access (for Edge Functions)
CREATE POLICY "Allow service_role full access gobiz_config" ON gobiz_config
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Updated_at trigger
CREATE TRIGGER update_gobiz_config_updated_at
  BEFORE UPDATE ON gobiz_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Важно:**

- RLS строгий - только admin видит credentials
- service_role policy нужна для Edge Functions (они работают с service key)
- `client_secret` хранится в БД, не в env переменных Edge Function (чтобы можно было менять через UI)

---

### Task 2: TypeScript Types - GoBiz Integration

**Status:** [ ] Not Started

**Файл:** `src/integrations/gobiz/types.ts`

Типы для GoBiz API:

```typescript
// === Config & Auth ===

export type GobizEnvironment = 'sandbox' | 'production'

export interface GobizConfig {
  id: string
  outletId: string
  outletName?: string
  clientId: string
  clientSecret: string // Masked in UI, full in Edge Function
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: string
  environment: GobizEnvironment
  webhookSecret?: string
  settings: Record<string, unknown>
  isActive: boolean
  lastError?: string
  lastErrorAt?: string
  createdAt: string
  updatedAt: string
}

// For UI display (без секретов)
export interface GobizConfigPublic {
  id: string
  outletId: string
  outletName?: string
  clientId: string
  environment: GobizEnvironment
  isActive: boolean
  isConnected: boolean // Has valid token
  tokenExpiresAt?: string
  lastError?: string
  lastErrorAt?: string
}

export interface GobizTokenResponse {
  access_token: string
  token_type: string // 'Bearer'
  expires_in: number // seconds (3600)
}

// === API Response Types ===

export interface GobizApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// === Edge Function Request/Response ===

export interface GobizProxyRequest {
  action: 'get_token' | 'refresh_token' | 'test_connection' | 'api_call'
  configId: string // gobiz_config.id
  // For api_call:
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path?: string // e.g. '/gofood/outlets/{id}/v2/catalog'
  body?: unknown
}

export interface GobizProxyResponse {
  success: boolean
  data?: unknown
  error?: string
  tokenRefreshed?: boolean // If token was auto-refreshed
}
```

---

### Task 3: Edge Function - GoBiz Proxy

**Status:** [ ] Not Started

**Файл:** Supabase Edge Function `gobiz-proxy`

Центральная Edge Function для проксирования всех запросов к GoBiz API.

**Функциональность:**

1. `get_token` - получить access_token по client_id/client_secret
2. `refresh_token` - обновить токен
3. `test_connection` - проверить связь (get catalog)
4. `api_call` - произвольный API-вызов с auto-refresh токена

**Логика auto-refresh:**

```
1. Клиент вызывает Edge Function с action='api_call'
2. Edge Function читает gobiz_config из БД (access_token, token_expires_at)
3. Если token_expires_at < now() + 5min → refresh token first
4. Делает запрос к GoBiz API с access_token
5. Если 401 → refresh token → retry
6. Возвращает результат клиенту
```

**Endpoints GoBiz:**

```
Sandbox OAuth: https://integration-goauth.gojekapi.com/oauth2/token
Sandbox API:   https://api.partner-sandbox.gobiz.co.id/

Production OAuth: https://accounts.go-jek.com/oauth2/token
Production API:   https://api.gobiz.co.id/
```

**OAuth Token Request:**

```
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={client_id}
&client_secret={client_secret}
&scope=gofood.catalog gofood.order
```

---

### Task 4: GoBiz Service (Client-side)

**Status:** [ ] Not Started

**Файл:** `src/integrations/gobiz/gobizService.ts`

Клиентский сервис, который вызывает Edge Function:

```typescript
// Основные методы:
class GobizService {
  // Auth
  async testConnection(configId: string): Promise<GobizProxyResponse>
  async getToken(configId: string): Promise<GobizProxyResponse>

  // Config CRUD (напрямую через Supabase, не через Edge Function)
  async getConfigs(): Promise<GobizConfigPublic[]>
  async createConfig(config: CreateGobizConfigInput): Promise<GobizConfigPublic>
  async updateConfig(id: string, updates: Partial<GobizConfig>): Promise<GobizConfigPublic>
  async deleteConfig(id: string): Promise<void>

  // API calls (через Edge Function proxy)
  async getCatalog(configId: string): Promise<GobizApiResponse>
  async updateCatalog(configId: string, catalog: unknown): Promise<GobizApiResponse>

  // Private
  private async callProxy(request: GobizProxyRequest): Promise<GobizProxyResponse>
}
```

**Вызов Edge Function:**

```typescript
const { data, error } = await supabase.functions.invoke('gobiz-proxy', {
  body: { action: 'test_connection', configId: 'xxx' }
})
```

---

### Task 5: GoBiz Store

**Status:** [ ] Not Started

**Файл:** `src/stores/gobiz/gobizStore.ts`

Pinia store для управления состоянием GoBiz интеграции:

```typescript
// State:
- configs: GobizConfigPublic[]       // Список конфигов (без секретов)
- isLoading: boolean
- initialized: boolean
- connectionStatus: Map<string, 'connected' | 'error' | 'unknown'>

// Getters:
- activeConfig                        // Первый активный конфиг
- isConnected                         // Есть ли валидное подключение

// Actions:
- initialize()                        // Загрузить конфиги
- createConfig(input)                 // Создать конфиг
- updateConfig(id, updates)           // Обновить конфиг
- deleteConfig(id)                    // Удалить конфиг
- testConnection(configId)            // Проверить подключение
- getToken(configId)                  // Получить токен
```

---

### Task 6: UI - GoBiz Settings Page

**Status:** [ ] Not Started

**Файл:** `src/views/integrations/GobizSettingsView.vue`

UI для настройки GoBiz интеграции:

```
┌─────────────────────────────────────────────────────────────────────┐
│ GoBiz Integration Settings                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─ Connection Status ──────────────────────────────────────────────┐│
│ │ ● Connected to Sandbox    Last sync: 5 min ago    [Test]        ││
│ │ OR                                                              ││
│ │ ○ Not Connected           Error: Invalid credentials  [Retry]   ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ ┌─ Credentials ────────────────────────────────────────────────────┐│
│ │ Environment:  [● Sandbox] [○ Production]                        ││
│ │ Outlet ID:    [________________________]                        ││
│ │ Outlet Name:  [________________________]                        ││
│ │ Client ID:    [________________________]                        ││
│ │ Client Secret:[••••••••••••••••••••••••] [Show]                 ││
│ │                                                                  ││
│ │ [Save]  [Test Connection]                                       ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ ┌─ Token Info ─────────────────────────────────────────────────────┐│
│ │ Access Token: ••••••••abc123    Expires: 2026-02-05 15:30:00    ││
│ │ [Refresh Token]                                                  ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Функционал:**

1. Ввод/редактирование credentials (client_id, client_secret, outlet_id)
2. Переключение sandbox/production
3. Кнопка "Test Connection" - проверяет OAuth + делает GET catalog
4. Статус подключения (connected/error) с сообщением об ошибке
5. Информация о текущем токене и возможность обновить

---

### Task 7: Router & Navigation - Integrations

**Status:** [ ] Not Started

**Изменить:** `src/router/index.ts`

```typescript
{
  path: '/integrations/gobiz',
  name: 'gobiz-settings',
  component: () => import('@/views/integrations/GobizSettingsView.vue'),
  meta: {
    requiresAuth: true,
    allowedRoles: ['admin']  // Только admin!
  }
}
```

**Изменить:** `src/components/navigation/NavigationMenu.vue`

```typescript
// Новая секция "Integrations" (только для admin)
{
  title: 'Integrations',
  icon: 'mdi-puzzle',
  children: [
    {
      title: 'GoBiz / GoFood',
      icon: 'mdi-moped',
      to: '/integrations/gobiz'
    }
  ]
}
```

---

### Task 8: Store Initialization - GoBiz

**Status:** [ ] Not Started

**Изменить:** Initialization system

- Добавить `'gobiz'` в `StoreName` union type
- Добавить в `dependencies.ts`: `gobiz: ['channels']` (зависит от channels)
- Добавить в `STORE_CATEGORIES`: `gobiz: 'backoffice'`
- Добавить loader в `DevInitializationStrategy.ts` и `ProductionInitializationStrategy.ts`

---

## 📝 Implementation Order

1. **Task 1** - Database migration (gobiz_config table)
2. **Task 2** - TypeScript types (нужны для всех остальных)
3. **Task 3** - Edge Function (gobiz-proxy) - сердце интеграции
4. **Task 4** - Client-side GoBiz service
5. **Task 5** - GoBiz Pinia store
6. **Task 8** - Store initialization
7. **Task 7** - Router & navigation
8. **Task 6** - GoBiz settings UI

---

## ✅ Acceptance Criteria

**Database:**

- [ ] `gobiz_config` таблица создана с правильными RLS policies
- [ ] Только admin может видеть/менять credentials
- [ ] service_role имеет полный доступ (для Edge Functions)

**Edge Function:**

- [ ] `gobiz-proxy` Edge Function деплоится и работает
- [ ] OAuth token request (client_credentials) успешно получает токен
- [ ] Auto-refresh токена при истечении или 401
- [ ] Ошибки корректно возвращаются клиенту
- [ ] Поддержка sandbox и production окружений

**Client-side:**

- [ ] GobizService вызывает Edge Function корректно
- [ ] GoBiz store загружает конфиги при инициализации
- [ ] Credentials не попадают на клиент (только masked/public данные)

**UI:**

- [ ] Страница настроек GoBiz доступна только admin
- [ ] Можно ввести credentials и сохранить
- [ ] Кнопка "Test Connection" проверяет OAuth + API
- [ ] Статус подключения отображается (connected/error)
- [ ] Навигация: Integrations → GoBiz / GoFood

---

## 🔗 Related Files

**Новые файлы:**

- `src/supabase/migrations/138_gobiz_config.sql`
- `src/integrations/gobiz/types.ts`
- `src/integrations/gobiz/gobizService.ts`
- `src/integrations/gobiz/index.ts`
- `src/stores/gobiz/gobizStore.ts`
- `src/stores/gobiz/types.ts`
- `src/stores/gobiz/index.ts`
- `src/views/integrations/GobizSettingsView.vue`
- Edge Function: `supabase/functions/gobiz-proxy/index.ts`

**Файлы для изменения:**

- `src/core/initialization/types.ts` - добавить 'gobiz' в StoreName
- `src/core/initialization/dependencies.ts` - gobiz deps/category
- `src/core/initialization/DevInitializationStrategy.ts` - loader
- `src/core/initialization/ProductionInitializationStrategy.ts` - loader
- `src/router/index.ts` - роут /integrations/gobiz
- `src/components/navigation/NavigationMenu.vue` - секция Integrations

---

## ⚠️ Предварительные условия (Prerequisites)

1. **API Credentials** - нужно получить от GoBiz:

   - `client_id`
   - `client_secret`
   - `outlet_id`
   - Sandbox access

2. **Supabase Edge Functions** - нужно убедиться что:

   - Edge Functions включены на проекте
   - `SUPABASE_SERVICE_ROLE_KEY` доступен в Edge Function env
   - Функция может делать HTTP-запросы к внешним API

3. **Тестирование** - весь Phase 2 тестируется на Sandbox:
   - OAuth URL: `https://integration-goauth.gojekapi.com/`
   - API URL: `https://api.partner-sandbox.gobiz.co.id/`
