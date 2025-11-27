У меня есть проблемы с подключением к базе данных, оно обрывается. Мы сделали следующие изменения, но не факт, что это проблема в них.

src/core/request/SupabaseRetryHandler.ts
src/core/hmrState.ts

какие есть проблемы:

ТОлько после перезагрузки окна, все работает, спустя время не отправляются запросы.

Отличный результат анализа! Проблема НЕ в AbortController, как я
первоначально думал. Вот что действительно происходит:

КЛЮЧЕВЫЕ НАХОДКИ 🔍

Основная причина: Утечка Realtime подписок

Критическая проблема обнаружена:

1. POS Realtime subscription (useOrdersRealtime.ts:122-124) использует
   onUnmounted() - но это НЕ работает в Pinia stores!


    - onUnmounted работает только в Vue компонентах
    - В stores он никогда не вызывается
    - Подписки накапливаются и никогда не очищаются

2. Kitchen Realtime subscription имеет метод cleanup(), но он нигде не
   вызывается
3. Во время HMR (каждое сохранение файла в dev):


    - Создаются новые Realtime каналы
    - Старые каналы НЕ удаляются
    - После 10-15 правок → 200 соединений Supabase Free Tier исчерпаны

Вторичная проблема: Auth token refresh

Каждый раз когда срабатывает onAuthStateChange (включая token refresh):
// authStore.ts:66
supabase.auth.onAuthStateChange(async (event, newSession) => {
await loadUserProfile(newSession.user.id) // 15s timeout + 3 retry
})

Это блокирует connection pool во время refresh.

Почему создаются дубликаты транзакций?

Retry логика без idempotency:

- Попытка 1 → timeout (но INSERT может успеть на сервере!)
- Retry 1 → timeout (еще один INSERT!)
- Retry 2 → timeout (еще один!)
- В итоге: 3-4 одинаковых платежа в базе

---

ПЛАН ИСПРАВЛЕНИЯ

Предлагаю следующий подход (по приоритету):

КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (устраняют 90% проблемы)

1. Добавить правильную очистку Realtime подписок в stores


    - Удалить onUnmounted из composables (не работает в stores)
    - Добавить cleanup() методы в posStore и kitchenStore
    - Вызывать cleanup при navigation away from POS/Kitchen

2. Добавить idempotency keys для всех payment операций


    - Генерировать уникальный ключ перед первой попыткой
    - Использовать его для всех retries
    - Предотвратит дубликаты даже при timeout

3. Отфильтровать auth events для profile reload


    - Загружать профиль только на SIGNED_IN/USER_UPDATED
    - НЕ загружать на TOKEN_REFRESHED

ВАЖНЫЕ УЛУЧШЕНИЯ

4. Добавить HMR cleanup


    - Очищать все Realtime каналы при HMR dispose
    - Предотвратит накопление подписок в dev

5. Уменьшить количество retries


    - Для mutations (INSERT/UPDATE/DELETE): 0-1 retry
    - Для queries (SELECT): 2-3 retry

ОПЦИОНАЛЬНЫЕ УЛУЧШЕНИЯ

6. Добавить мониторинг активных каналов


    - Логировать количество открытых Realtime каналов
    - Предупреждать если >3 каналов

7. Обновить на Supabase Pro (если бюджет позволяет)


    - Безлимитные connections
    - Лучшая производительность

---

⎿ User rejected Claude's plan:
╭────────────────────────────────────────────────────────────────────────╮
│ Fix Supabase Connection Timeout & Duplicate Transactions │
│ │
│ Root Cause │
│ │
│ Realtime subscription leaks causing Supabase Free Tier connection │
│ limit (200) exhaustion, leading to cascading timeouts and duplicate │
│ transactions. │
│ │
│ Critical Fixes (addresses 90% of issues) │
│ │
│ 1. Fix Realtime subscription cleanup in stores │
│ - Remove onUnmounted() from store composables (only works in │
│ components, not Pinia stores) │
│ - Add proper cleanup() methods to posStore and kitchenStore │
│ - Call cleanup on router navigation away from POS/Kitchen views │
│ 2. Add idempotency keys to payment mutations │
│ - Generate unique key before first attempt │
│ - Reuse same key for all retries │
│ - Prevents duplicate transactions even on timeout │
│ 3. Filter auth events to prevent blocking profile reloads │
│ - Only reload profile on SIGNED_IN/USER_UPDATED events │
│ - Skip TOKEN_REFRESHED to avoid blocking other requests │
│ │
│ Important Improvements │
│ │
│ 4. Add HMR cleanup for Realtime channels │
│ - Clear all channels on HMR dispose │
│ - Prevents subscription accumulation during development │
│ 5. Reduce retry attempts for mutations │
│ - Use 0-1 retries for INSERT/UPDATE/DELETE (prevent duplicates) │
│ - Keep 2-3 retries for SELECT queries │
│ │
│ Optional Enhancements │
│ │
│ 6. Add Realtime channel monitoring │
│ - Log active channel count │
│ - Warn if exceeding safe limits │
│ 7. Consider Supabase Pro upgrade │
│ - Unlimited connections │
│ - Better performance │
│ │
│ Files to modify │
│ │
│ - src/stores/pos/orders/useOrdersRealtime.ts (remove onUnmounted) │
│ - src/stores/kitchen/useKitchenRealtime.ts (remove onUnmounted) │
│ - src/stores/pos/index.ts (add cleanup method + call on unmount) │
│ - src/stores/kitchen/index.ts (ensure cleanup is called) │
│ - src/router/index.ts (call store cleanup on navigation) │
│ - src/stores/auth/authStore.ts (filter auth events) │
│ - src/stores/pos/payments/services.ts (add idempotency keys) │
│ - src/main.ts or App.vue (add HMR cleanup)
