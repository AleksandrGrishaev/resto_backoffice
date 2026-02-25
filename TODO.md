# Kitchen App — Project Plan

## Current Sprint: Channel Profitability & Marketing Attribution

**Детали спринта:** `NextTodo.md`

### Сделано (этот чат)

- [x] AI Sherpa read-only access (role + views + Edge Function sql-proxy)
- [x] Views: v_menu_with_cost, v_daily_sales, v_food_cost_report (gross/net), v_recipe_details
- [x] Data fix: Tom yam paste batch costs (migration 155), Tom Yum margin -177% → +36.5%
- [x] v_food_cost_report updated with net revenue and discount columns (migration 156)
- [x] Docs: src/About/docs/ai-agent/sb-agent/README.md

### TODO (следующий чат)

- [ ] Migration: marketing subcategories (parent_id + channel_code в transaction_categories)
- [ ] Migration: v_channel_profitability view (P&L по каналам cafe/gobiz/grab)
- [ ] Grant SELECT на новые объекты для ai_readonly
- [ ] UI: expense subcategory selector (при выборе Marketing → подкатегории)
- [ ] UI: channel profitability report page (/reports/channels)

### Модель каналов

```
cafe  = dine_in + takeaway (один бизнес-канал, общий маркетинг)
gobiz = GoFood (20% комиссия, свои промо)
grab  = Grab Food (25% комиссия, свои промо)
```

### Миграции (этот чат)

- `154_ai_readonly_role_and_views.sql` — роль + 4 views
- `155_fix_tom_yam_paste_and_sereh_costs.sql` — fix batch costs + recalc transactions
- `156_update_food_cost_view_with_net_revenue.sql` — gross/net revenue в food cost view

---

## Backlog

### Operations

- [ ] Проверка других продуктов на ошибку "цена упаковки вместо цены единицы"
- [ ] Оповещение при вводе цены с аномальным отклонением от base_cost

### AI Sherpa

- [ ] Дать доступ к v_channel_profitability после создания
- [ ] Обновить docs для шерпы с новыми views
