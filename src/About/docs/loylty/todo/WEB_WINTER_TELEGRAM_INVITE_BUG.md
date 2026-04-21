# [web-winter] Telegram-логин по invite-ссылке не связывает auth с invite customer — POST-MORTEM

**Owner project:** web-winter — фикс сделан полностью на стороне web-winter.
**Status:** ✅ Resolved (2026-04-21, PROD).
**Severity:** Medium — invite-flow через Telegram не завершался, в БД оставался дубликат customer-записи, invite оставался `active`.
**Связанная задача для backoffice:** [`TODO_CLAIM_INVITE_STAMP_CARD_CLEANUP.md`](./TODO_CLAIM_INVITE_STAMP_CARD_CLEANUP.md)

---

## Исходный симптом

1. В backoffice создан customer "Test 2026" (`27f75924-d09b-4c6e-94be-0cd99b5d9358`) + invite → URL `https://winterbali.com/join/<token>`
2. Юзер открывает URL, логинится через Telegram-бот (`/start`), бот отвечает «Welcome, Alex!»
3. В БД остаются **два customer** — служебный "Alex Grishaev" (`created_by='auth'`) + нетронутый "Test 2026"; identity указывает на "Alex Grishaev"; invite `status='active'`.
4. В логах Supabase за окно авторизации нет ни одного вызова `/rpc/claim_invite` или `/rpc/claim_invite_as_user` (или есть, но с `success:false` и проглоченной ошибкой).

## Три независимые причины, вскрытые при разборе

Первоначальная гипотеза («просто не передаётся invite-токен до вызова RPC») оказалась верной лишь частично. По факту фиксили **три** бага, уложенных друг в друга.

### Баг №1 — сломанный fallback `supabase.from('auth.users')` в web-winter

**Файлы до фикса:**

- `apps/website/server/utils/telegram-handlers/start.ts` (webhook `handleAuthStart`)
- `apps/website/server/api/auth/telegram/complete.post.ts`

Оба обработчика делали так:

```ts
const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({ email, ... })

if (!createErr && newUser?.user) {
  userId = newUser.user.id
} else {
  // User already exists — find by email
  const { data: existingUser } = await supabase
    .from('auth.users' as any)        // ← PostgREST не понимает "auth.users" как имя таблицы
    .select('id').eq('email', telegramEmail).single()
  if (existingUser) userId = existingUser.id
}

if (authCode.invite_token && userId) {
  await supabase.rpc('claim_invite_as_user', { p_token: authCode.invite_token, p_user_id: userId })
}
```

PostgREST не экспозирует схему `auth` через `.from()`, и точечная нотация имени таблицы не поддерживается — запрос молча возвращал `null`, `existingUser` оставался `undefined`, ошибка не проверялась. При повторном прогоне теста (когда `auth.users` уже был от предыдущей попытки) `createUser` валился с 422 `email_exists`, fallback молча не находил существующего юзера, `userId` оставался `null`, блок `if (…userId)` пропускался — **`claim_invite_as_user` не вызывался вообще**.

**Фикс:** новая SECURITY DEFINER RPC `get_auth_user_id_by_email(p_email TEXT) RETURNS UUID` (service_role only), миграция `20260421140000_get_auth_user_id_by_email.sql`. Оба обработчика вызывают её вместо сломанного `.from('auth.users')`. Плюс explicit `console.error` в случае «invite_token есть, userId нет» — следующий раз такая регрессия будет видна в Vercel-логах сразу.

### Баг №2 — `/api/profile/link-telegram` ломал привязку Telegram из `/me`

Отдельный флоу (не invite): залогиненный юзер жмёт «Link Telegram» в кабинете. Старая реализация делала прямые INSERT/UPDATE в `customer_identities`/`customers` через service_role. Но на каждый `/start <code>` webhook сам создаёт auth-юзера + stub-customer + identity c `(provider='telegram', provider_uid=<tg_id>)`. Потом `link-telegram.post.ts` в шаге «не привязан ли этот telegram к другому?» находил этот свежий stub и возвращал `409 "This Telegram account is linked to another customer"`. UNIQUE индекс `customer_identities(provider, provider_uid) WHERE provider_uid IS NOT NULL` тоже не дал бы вставить вторую запись.

**Фикс:** вся логика перенесена в новую SECURITY DEFINER RPC `link_telegram_as_user(p_code TEXT, p_user_id UUID)` (миграция `20260421150000_link_telegram_as_user.sql`). Она атомарно мерджит stub в customer caller'а по тому же паттерну, что `claim_invite` для 'customer'-инвайтов:

- перенос `customer_identities.customer_id` со stub'а на target,
- зануление `telegram_id`/`telegram_username` у stub'а,
- DELETE stub'а, если нет orders/identities.

`/api/profile/link-telegram` теперь только аутентифицирует caller'а и вызывает RPC.

### Баг №3 — stamp_cards FK блокировал DELETE stub'а внутри `claim_invite`

**Корневой симптом**, из-за которого фикс Бага №1 не сработал с первого раза.

Триггер `handle_new_auth_user` после создания stub-customer'а сразу выполняет:

```sql
if not exists (select 1 from public.stamp_cards where customer_id = v_customer_id and status = 'active') then
  insert into public.stamp_cards (card_number, customer_id) values (…, v_customer_id);
end if;
```

То есть у свежего stub'а всегда появляется одна пустая `stamp_cards`-запись. Дальше `claim_invite` в ветке 'customer' после переноса identity делает:

```sql
DELETE FROM customers
 WHERE id = v_trigger_customer_id
   AND created_by = 'auth'
   AND NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = v_trigger_customer_id)
   AND NOT EXISTS (SELECT 1 FROM customer_identities WHERE customer_id = v_trigger_customer_id);
```

FK `stamp_cards_customer_id_fkey` с `ON DELETE NO ACTION` блокирует этот DELETE. Внешний `EXCEPTION WHEN OTHERS` в `claim_invite` ловит ошибку, **откатывает всю транзакцию** (включая перенос identity и зануление email/telegram_id на stub'е) и возвращает `{success: false, error: "… violates foreign key constraint \"stamp_cards_customer_id_fkey\" …"}`. Webhook тихо логирует `success:false` и идёт дальше — в БД ничего не изменилось.

Это **общая проблема `claim_invite`**, не telegram-специфичная. Для Google/email-логинов она не воспроизводится только потому, что триггер `handle_new_auth_user` для реальных email'ов чаще находит существующего customer'а (match по email) и не создаёт stub — DELETE ни разу не вызывается. У telegram email всегда вида `telegram_<id>@telegram.local`, match невозможен, stub создаётся всегда.

**Фикс на стороне web-winter (обход):** миграция `20260421160000_fix_stamp_card_fk_block_on_stub_merge.sql` — обе RPC (`claim_invite_as_user` и `link_telegram_as_user`) **до** стадии DELETE удаляют пустые `stamp_cards` (без `stamp_entries`) stub-customer'а:

```sql
-- В claim_invite_as_user перед вызовом claim_invite:
DELETE FROM stamp_cards
 WHERE customer_id = v_stub_customer_id
   AND NOT EXISTS (SELECT 1 FROM stamp_entries WHERE card_id = stamp_cards.id);
```

Только для `created_by='auth'` и только пустые карточки — реальные данные не трогаются.

**Важно:** это обход для telegram-флоу. Корневое исправление — в самом `claim_invite` (см. связанную задачу backoffice).

---

## Итоговые файлы фикса на стороне web-winter

Коммиты на `main`:

- `dcccf33` — fix: harden telegram auth + linking flows
- `c542e4f` — fix: unblock stub-customer merge during invite / telegram-link

Миграции:
| # | Файл | Суть |
|---|------|------|
| 13 | `20260421140000_get_auth_user_id_by_email.sql` | RPC `get_auth_user_id_by_email(email) → uuid` (service_role only) для fallback-а в телеграм-обработчиках |
| 14 | `20260421150000_link_telegram_as_user.sql` | RPC `link_telegram_as_user(code, user_id)` — атомарный merge stub-а в customer caller'а |
| 15 | `20260421160000_fix_stamp_card_fk_block_on_stub_merge.sql` | Удаление пустых stamp_cards stub-а перед DELETE — в `claim_invite_as_user` и `link_telegram_as_user` |

Код:

- `apps/website/server/utils/telegram-handlers/start.ts` — fallback через RPC + явный лог «userId missing» ветки
- `apps/website/server/api/auth/telegram/complete.post.ts` — то же + возврат `invite_token` в ответе
- `apps/website/server/api/profile/link-telegram.post.ts` — всё тело заменено на один вызов `link_telegram_as_user` RPC

## Критерий приёмки (проверено на PROD)

После фикса, реальный прогон `/join/d3UBJ-iRY1oF` через Telegram:

```sql
SELECT status, claimed_by, claimed_at FROM customer_invites WHERE token = 'd3UBJ-iRY1oF';
-- status='claimed', claimed_by='<telegram auth.users.id>', claimed_at IS NOT NULL  ✓

SELECT id, name, telegram_id FROM customers WHERE telegram_id = '471119643';
-- ровно одна запись, customer — invite-target (stub "Alex Grishaev" удалён)  ✓
```

## Остаточная задача (backoffice)

Текущий обход в web-winter решает проблему _только_ для флоу, идущих через `claim_invite_as_user` (server-side, telegram). Для прямых вызовов `claim_invite` с клиента (например, Google-логин уникально-новым email'ом) Баг №3 всё ещё жив. Нужен фикс в самом `claim_invite` — см. [`TODO_CLAIM_INVITE_STAMP_CARD_CLEANUP.md`](./TODO_CLAIM_INVITE_STAMP_CARD_CLEANUP.md).

Дополнительно — триггер `handle_new_auth_user` и `claim_invite` создают пустую `stamp_cards` безусловно, игнорируя `loyalty_program` customer'а. Для cashback-клиентов это ненужный мусор (на скриншоте теста — карточка `#034` с 0/15 у клиента `loyalty_program='cashback'`). Это часть той же backoffice-задачи.

## Cleanup между прогонами тестов

Актуально: `CLEANUP_TEST_USER.md` в этом же каталоге. Удалять `auth.users` по email `telegram_<id>@telegram.local` + связанные `customers/customer_identities`. После применения фикса чаще всего cleanup не нужен (повторный прогон корректно мерджит identity), но для чистых прогонов с нуля — оставляем.
