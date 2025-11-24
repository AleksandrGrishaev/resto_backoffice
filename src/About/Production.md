Шаг 2: Применить миграции на PROD

У вас есть два способа:

Вариант А: Через Supabase SQL Editor (ручной, безопасный):

1. Открыть Supabase Dashboard для PROD проекта
2. SQL Editor → New Query
3. Скопировать содержимое 008_create_product_categories.sql
4. Выполнить
5. Скопировать содержимое 009_migrate_products_category.sql
6. Выполнить
7. Проверить результат:
   SELECT \* FROM product_categories ORDER BY sort_order;
   SELECT id, name, category FROM products LIMIT 5;
