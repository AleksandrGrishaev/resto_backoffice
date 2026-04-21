# Полная очистка тестового клиента (auth + customer)

Нужна для корректного тестирования **invite-flow** и **Telegram/Google-логина**
с позиции "как будто этот человек заходит впервые".

## Когда применять

- Тестируешь `claim_invite` или регистрацию через Telegram/Google и нужно воспроизвести
  сценарий первого визита.
- При Telegram-логине web-winter падает с **422 `email_exists`** — это значит в `auth.users`
  висит orphan-запись `telegram_<id>@telegram.local` от предыдущего прогона.
- После частичного удаления customer осталась identity на `auth.users`, которая
  при следующем логине перепривязывается к invite-клиенту.

## Что нужно удалять

| Слой          | Таблица                                                                                                                                  | FK delete_rule                               | Нужно вручную?                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| Supabase auth | `auth.users`                                                                                                                             | —                                            | **да, отсюда начинаем**                                 |
| Supabase auth | `auth.identities`, `auth.sessions`, `auth.refresh_tokens`, `auth.mfa_factors`, `auth.oauth_*`, `auth.one_time_tokens`, `auth.webauthn_*` | CASCADE                                      | нет (каскад)                                            |
| public        | `customer_identities`                                                                                                                    | CASCADE от `auth.users` **и** от `customers` | нет (каскад)                                            |
| public        | `customer_invites` (claimed_by)                                                                                                          | NO ACTION                                    | **да**, если invite уже заклеймлен этим auth            |
| public        | `customers`                                                                                                                              | —                                            | **да**, если нужен полный ресет                         |
| public        | `customer_invites` (customer_id)                                                                                                         | CASCADE от `customers`                       | нет (каскад)                                            |
| public        | `stamp_cards`                                                                                                                            | NO ACTION                                    | **да**, до удаления customer                            |
| public        | `orders` / `payments` / `loyalty_*`                                                                                                      | NO ACTION                                    | **проверить**, нельзя удалять если есть реальные данные |
| public        | `website_settings.updated_by`                                                                                                            | NO ACTION                                    | **да**, если блокирует                                  |

## Пошаговый рецепт

### 1. Идентификация

Найди всё по одному из признаков: email, telegram_id, customer.name.

```sql
-- По всем признакам сразу
SELECT 'customer' AS type, id::text AS id, name AS label, created_at FROM customers
WHERE email = :email OR telegram_id = :tg_id OR name ILIKE :name_pattern
UNION ALL
SELECT 'auth_user', id::text, email, created_at FROM auth.users
WHERE email = :email OR email = 'telegram_' || :tg_id || '@telegram.local';
```

### 2. Проверка блокирующих связей

```sql
-- Подставь id customer'а и auth_user'а
WITH params AS (
  SELECT
    :customer_id::uuid AS cid,
    ARRAY[:auth_user_id_1, :auth_user_id_2]::uuid[] AS aids
)
SELECT 'orders (блок)'                 AS tbl, COUNT(*) FROM orders, params               WHERE customer_id = cid
UNION ALL SELECT 'payments (блок)',    COUNT(*) FROM payments, params             WHERE customer_id = cid
UNION ALL SELECT 'loyalty_points',     COUNT(*) FROM loyalty_points, params       WHERE customer_id = cid
UNION ALL SELECT 'loyalty_transactions',COUNT(*) FROM loyalty_transactions, params WHERE customer_id = cid
UNION ALL SELECT 'stamp_cards',        COUNT(*) FROM stamp_cards, params          WHERE customer_id = cid
UNION ALL SELECT 'invites.claimed_by', COUNT(*) FROM customer_invites, params     WHERE claimed_by = ANY(aids)
UNION ALL SELECT 'website_settings',   COUNT(*) FROM website_settings, params     WHERE updated_by = ANY(aids);
```

Если в `orders` / `payments` / `loyalty_*` есть записи — **это реальный клиент с историей,
полное удаление не делаем**. В таком случае достаточно обнулить идентификаторы:

```sql
UPDATE customers
SET email = NULL, telegram_id = NULL, telegram_username = NULL, phone = NULL
WHERE id = :customer_id;
```

и удалить только `auth.users` + `customer_identities` (см. шаг 4).

### 3. Снять блоки в `stamp_cards` / `customer_invites`

```sql
DELETE FROM stamp_cards WHERE customer_id = :customer_id;
UPDATE customer_invites SET claimed_by = NULL WHERE claimed_by = ANY(:auth_ids);
-- или DELETE, если invite был только у этого юзера
```

### 4. Удаление

```sql
-- 4a. Удалить customer (каскадом уйдут customer_identities и customer_invites.customer_id)
DELETE FROM customers WHERE id = :customer_id;

-- 4b. Удалить auth.users (каскадом уйдут auth.identities/sessions/tokens/...)
DELETE FROM auth.users WHERE id = ANY(:auth_ids);
```

### 5. Верификация

```sql
SELECT 'auth.users'          AS tbl, COUNT(*) FROM auth.users         WHERE email = :email
UNION ALL SELECT 'auth.identities',  COUNT(*) FROM auth.identities    WHERE identity_data->>'email' = :email
UNION ALL SELECT 'customers',        COUNT(*) FROM customers          WHERE email = :email OR telegram_id = :tg_id
UNION ALL SELECT 'customer_identities', COUNT(*) FROM customer_identities WHERE auth_user_id = ANY(:auth_ids);
```

Все должны быть `0`.

## Типовой сценарий: "я залогинен в вебе и хочу заново пройти invite-flow"

1. Найти свой `customer_id` и `auth.users.id` (Google и/или Telegram).
2. Если у customer есть реальные заказы — обнулить идентификаторы, но оставить customer.
3. Удалить `auth.users` (оба — если был и Google, и Telegram).
4. В браузере: выйти из web-winter, очистить cookies домена.
5. Кликнуть invite-ссылку → залогиниться → flow пойдёт с нуля:
   - `handle_new_auth_user` триггер создаст свежий customer + identity
   - `claim_invite` RPC перепривяжет identity на customer из invite

## Типичные ошибки

- **Удаление только `customers` без `auth.users`**: при следующем логине web-winter
  снова пытается создать auth-юзера с тем же email и падает с 422 `email_exists`.
- **Удаление `auth.users` без обнуления `customer_invites.claimed_by`**:
  FK `customer_invites.claimed_by → auth.users(id)` — NO ACTION, блокирует DELETE.
- **Удаление customer'а с реальными заказами**: FK `orders.customer_id` NO ACTION, DELETE упадёт.

## Готовая RPC (не создана)

Сознательно не делаем автоматическую RPC для удаления — это деструктивная операция в PROD,
и каждый раз нужно глазами проверять, что не удаляем реального клиента.
