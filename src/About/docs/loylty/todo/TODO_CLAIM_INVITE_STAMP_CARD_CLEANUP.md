# [backoffice] `claim_invite` / `handle_new_auth_user` — правильная работа со `stamp_cards`

**Owner project:** backoffice (owner `claim_invite`, `handle_new_auth_user`).
**Status:** ✅ Resolved — мигр. `301_claim_invite_stamp_card_cleanup` применена к DEV и PROD 2026-04-22.
**Severity:** Medium — прямые вызовы `claim_invite` из клиентской сессии (Google/email, без telegram-специфичного server-side wrapper'а) в некоторых сценариях уходили в тихий rollback.
**Контекст:** см. [`WEB_WINTER_TELEGRAM_INVITE_BUG.md`](./WEB_WINTER_TELEGRAM_INVITE_BUG.md), Баг №3. Web-winter сделал локальный обход для telegram-флоу, а эта миграция закрывает источник в самом `claim_invite` и триггере.

**Что сделано:**

- `claim_invite` ветка `type='customer'`: перед DELETE stub'а удаляются его пустые `stamp_cards` (только без `stamp_entries` — реальные данные не трогаются).
- `claim_invite` ветка `type='order'` и `handle_new_auth_user`: создание `stamp_cards` обёрнуто в `loyalty_program='stamps'`.
- `handle_new_auth_user`: новый self-registered customer получает `loyalty_program='stamps'` явно (override дефолта `cashback`, который остаётся для staff-created POS клиентов).
- Разовый cleanup: на PROD удалена одна пустая карточка у cashback-клиента (0 оставшихся после миграции).
- Файл RPC `src/supabase/functions/claim_invite.sql` и `handle_new_auth_user.sql` обновлены синхронно с миграцией.

Тесты (DEV, 3 сценария):

1. Cashback-target + Telegram self-reg → stub удалён, карточка у target НЕ создана ✓
2. Stamps-target + Telegram self-reg → stub удалён, карточка у target создана, telegram-данные перенесены ✓
3. Order-invite + anonymous user → новый customer `loyalty_program='stamps'` + карточка ✓

---

## Проблема 1 — FK `stamp_cards_customer_id_fkey` блокирует DELETE stub-а в `claim_invite`

### Условия воспроизведения

1. Юзер логинится через любой provider, у него в БД ещё нет `customers` (т.е. триггер `handle_new_auth_user` создал stub, `created_by='auth'`).
   - Telegram — всегда (email вида `telegram_<id>@telegram.local` никогда не матчится с реальным customer'ом).
   - Google/email — если в `customers` нет активной записи с таким email.
2. Юзер жмёт invite-ссылку `/join/<token>` уже залогиненным. Клиент вызывает `claim_invite(token)` через RLS-сессию.

### Что происходит внутри `claim_invite` (ветка `type='customer'`)

```sql
-- (1) identity сейчас указывает на stub, target — invite.customer_id, переносим:
UPDATE customer_identities SET customer_id = v_customer_id WHERE id = v_existing_identity.id;

-- (2) зануляем PII на stub'е, чтобы unique-индексы не держали:
UPDATE customers SET email = NULL, telegram_id = NULL
 WHERE id = v_trigger_customer_id AND created_by = 'auth';

-- (3) пытаемся удалить stub:
DELETE FROM customers
 WHERE id = v_trigger_customer_id
   AND created_by = 'auth'
   AND NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = v_trigger_customer_id)
   AND NOT EXISTS (SELECT 1 FROM customer_identities WHERE customer_id = v_trigger_customer_id);
```

Триггер `handle_new_auth_user` между (0) и вызовом claim_invite уже создал пустую `stamp_cards`-запись для stub'а. FK `stamp_cards_customer_id_fkey` с `ON DELETE NO ACTION` бросает:

```
ERROR: update or delete on table "customers" violates foreign key constraint
       "stamp_cards_customer_id_fkey" on table "stamp_cards"
```

Эту ошибку ловит внешний `EXCEPTION WHEN OTHERS` в `claim_invite`, который **откатывает всю транзакцию** (включая (1) и (2)) и возвращает `{success:false, error:"Failed to claim invite: …"}`. Вызывающая сторона видит «не получилось», но в БД: identity по-прежнему на stub'е, invite по-прежнему `active`, stub и его stamp_card живы.

### Что нужно сделать в backoffice

Внутри `claim_invite` в ветке `type='customer'`, **перед** `DELETE FROM customers`, добавить:

```sql
-- Drop the stub's empty stamp_cards (auto-created by handle_new_auth_user trigger)
-- so they don't block the subsequent customer DELETE via FK.
-- Only empty cards (no stamp_entries) — never destroy real loyalty data.
DELETE FROM stamp_cards
 WHERE customer_id = v_trigger_customer_id
   AND NOT EXISTS (SELECT 1 FROM stamp_entries WHERE card_id = stamp_cards.id);
```

После этого DELETE stub'а (условие `created_by='auth' AND NOT EXISTS orders AND NOT EXISTS identities` — те же самые) должен успешно проходить в общем случае.

### Как это соотносится с текущим обходом web-winter

Web-winter уже добавил идентичный DELETE внутри своей RPC-обёртки `claim_invite_as_user` _до_ вызова `claim_invite`. Этот обход покрывает telegram-флоу, потому что server-side вызов идёт через `claim_invite_as_user`. Но прямые клиентские вызовы `claim_invite(token)` (из `useClaimInvite` в web-winter, флоу Google / email magic-link) идут мимо обёртки — для них фикс должен быть в самом `claim_invite`.

После того как backoffice поправит `claim_invite`, дубль DELETE в `claim_invite_as_user` станет избыточным, но не вредным — оставляем как страховку.

### Проверка

1. Воспроизвести: создать нового google-юзера с email, которого нет в `customers`; открыть invite-ссылку залогиненным; клиент должен успешно получить `{success:true}`; в БД — один customer (target invite), invite `status='claimed'`, stub удалён, его `stamp_cards` тоже.
2. Regression: старые сценарии (invite на pre-existing customer, claim уже залинкованного, order-type invite) должны продолжать работать.

---

## Проблема 2 — `stamp_cards` для `cashback`-клиентов создаются впустую

Триггер `handle_new_auth_user` и `claim_invite` (блок «если у target нет активной карточки — создаём») не смотрят на `customers.loyalty_program`. В результате даже для `loyalty_program='cashback'` создаётся пустая `stamp_cards`, которая в `/me` UI не используется (там виджет `CabinetStampCardWidget` показывается только `isStampsMode`).

Видно на тесте 2026-04-21: клиент "test last" с `loyalty_program='cashback'`, tier `member` — но у него есть активная `stamp_cards #034 (0/15)`. Это мусор, который будет накапливаться на каждом новом cashback-клиенте.

### Что нужно сделать в backoffice

В обоих местах завернуть INSERT `stamp_cards` в условие:

```sql
-- Только для stamps-mode:
if coalesce((select loyalty_program from public.customers where id = v_customer_id), 'stamps') = 'stamps' then
  -- существующий INSERT stamp_cards
end if;
```

Значение по умолчанию `loyalty_program='stamps'` нужно выбрать осознанно — посмотреть, что говорит дефолт колонки в БД и миграции `20260316300000_add_loyalty_program.sql` / `20260325012026_change_default_loyalty_program_to_cashback.sql`. В последней дефолт был переведён на `cashback`, так что `coalesce(..., 'stamps')` может быть неправильным fallback'ом — вероятно надо `coalesce(..., 'cashback')` либо просто не создавать при NULL.

### Разовый cleanup существующих мусорных карточек

```sql
-- Посмотреть объём:
SELECT count(*) FROM stamp_cards sc
 JOIN customers c ON c.id = sc.customer_id
 WHERE sc.status = 'active'
   AND NOT EXISTS (SELECT 1 FROM stamp_entries WHERE card_id = sc.id)
   AND c.loyalty_program = 'cashback';

-- Если ок, зачистить:
DELETE FROM stamp_cards sc
 USING customers c
 WHERE c.id = sc.customer_id
   AND sc.status = 'active'
   AND NOT EXISTS (SELECT 1 FROM stamp_entries WHERE card_id = sc.id)
   AND c.loyalty_program = 'cashback';
```

(Проверить на DEV сначала.)

---

## Приоритет

- **Проблема 1** — medium, влияет на реальный user flow (тихие rollback'и в некоторых claim-сценариях). Приоритет выше.
- **Проблема 2** — low, не ломает UX, но засоряет БД. Можно делать заодно — правки в одних и тех же RPC/триггере.

## Откат

Обе правки — `CREATE OR REPLACE FUNCTION` на `claim_invite` и/или `handle_new_auth_user`. Откат — восстановить предыдущее тело функции из предыдущей миграции. Данные не трогаются.
