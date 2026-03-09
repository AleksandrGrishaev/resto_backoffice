# Kitchen App — Project Plan

## Current Sprint: Loyalty Program (Two-Block System)

**Спецификация:** `src/About/Frontend/LOYALTY_SPEC.md`
**Техническая реализация:** `src/About/Frontend/BACKOFFICE_ROADMAP.md` (Модуль 2)
**Детали спринта:** `NextTodo.md`

### Архитектура

```
Блок 1: Физическая карточка (штампы -> бесплатное блюдо)
Блок 2: Цифровой профиль (баллы = деньги, уровни Member/Regular/VIP)
Переход: карточка -> профиль с конвертацией штампов в баллы (+10% бонус)
```

### TODO

- [ ] Миграции БД: customers, stamp_cards, stamp_entries, loyalty_points, loyalty_transactions, loyalty_settings
- [ ] RPC: add_stamps, apply_cashback, redeem_points, convert_stamp_card, recalculate_tiers, expire_points, get_customer_cabinet
- [ ] Stores: customers, loyalty
- [ ] POS: StampCardPanel, CustomerPanel, ConvertCardDialog
- [ ] Admin: LoyaltySettingsScreen, CustomersScreen, CustomerDetailScreen, StampCardsScreen

---

## Backlog

### Operations

- [ ] Проверка других продуктов на ошибку "цена упаковки вместо цены единицы"
- [ ] Оповещение при вводе цены с аномальным отклонением от base_cost

### AI Sherpa

- [ ] Дать доступ к v_channel_profitability после создания
- [ ] Обновить docs для шерпы с новыми views
