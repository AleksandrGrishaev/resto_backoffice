# Задача: Создание скриншотов для Supplier Guide

## Статус: СЕКЦИЯ 1 ЗАВЕРШЕНА ✅

## Что уже сделано:

1. ✅ Создан файл `SupplierGuide.vue` с полной структурой первой секции (Создание Request)
2. ✅ Обновлен `router.ts` - добавлен маршрут `/help/backoffice/supplier`
3. ✅ Обновлен `HelpLayout.vue` - добавлен пункт меню "Manajemen Pemasok"
4. ✅ Создана папка для скриншотов: `src/help/assets/screenshots/backoffice/supplier/`
5. ✅ Созданы все 7 скриншотов для секции 1 (Создание Request)
6. ✅ Билд проходит успешно (`pnpm build`)
7. ✅ Страница `/help/backoffice/supplier` отображается корректно с изображениями

## Что нужно сделать (следующие секции):

### Секция 1 - ВЫПОЛНЕНА ✅

Скриншоты созданы и сохранены в `src/help/assets/screenshots/backoffice/supplier/`:

- `01_supplier_main.png` - Главный экран Supplier Management
- `02_ai_assistant_suggestions.png` - AI Order Assistant с AI SUGGESTIONS
- `03_item_added.png` - Товар добавлен (статус "Added")
- `04_manual_add_tab.png` - Вкладка ADD MANUAL ITEM
- `05_manual_item_dialog.png` - Диалог добавления товара
- `06_request_summary.png` - REQUEST SUMMARY
- `07_request_actions.png` - Кнопки SAVE DRAFT / SEND REQUEST

### Будущие секции:

- **Секция 2**: Создание Order из Request (вкладка ORDERS)
- **Секция 3**: Отправка Order поставщику
- **Секция 4**: Добавление Invoice
- **Секция 5**: Приёмка товара (Receiving)

## Команды MCP Playwright:

```
mcp__playwright__browser_navigate - открыть URL
mcp__playwright__browser_snapshot - посмотреть состояние страницы
mcp__playwright__browser_click - кликнуть на элемент
mcp__playwright__browser_take_screenshot - сделать скриншот
```

## Путь для сохранения скриншотов:

`/Users/peaker/dev/kitchen-app/backoffice/src/help/assets/screenshots/backoffice/supplier/`
