# Руководство по разработке

## Утилиты проекта

### Работа с логированием (DebugUtils)

```typescript
import { DebugUtils } from '@/utils'

// Логирование информации
DebugUtils.info('ComponentName', 'Operation completed', { data: result })

// Логирование ошибок
DebugUtils.error('ComponentName', 'Operation failed', { error })

// Логирование предупреждений
DebugUtils.warn('ComponentName', 'Validation warning', { field: 'email' })

// Отладочная информация (только в dev)
DebugUtils.debug('ComponentName', 'Debug info', { state })
```

### Работа с датами (TimeUtils)

```typescript
import { TimeUtils } from '@/utils'

// Получение текущей даты
const now = TimeUtils.getCurrentLocalISO()

// Форматирование даты
const formatted = TimeUtils.formatDateToDisplay(date, 'yyyy-MM-dd')

// Проверка дат
const isSame = TimeUtils.isSameDay(date1, date2)

// Получение начала/конца дня
const startOfDay = TimeUtils.getStartOfDay(date)
const endOfDay = TimeUtils.getEndOfDay(date)
```

### Форматирование (Formatter)

```typescript
import { Formatter } from '@/utils'

// Форматирование времени
const time = Formatter.formatDateTime(date) // 14:30:00

// Форматирование даты
const date = Formatter.formatDate(date) // 2024-03-20

// Полное форматирование
const fullDate = Formatter.formatFullDateTime(date) // 2024-03-20 14:30:00
```

## Рекомендации по коду

### Структура компонентов

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DebugUtils } from '@/utils'

// Константы
const MODULE_NAME = 'ComponentName'

// Состояние
const loading = ref(false)

// Методы
const handleOperation = async () => {
  try {
    loading.value = true
    // операции
    DebugUtils.info(MODULE_NAME, 'Operation completed')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Operation failed', { error })
  } finally {
    loading.value = false
  }
}

// Хуки жизненного цикла
onMounted(() => {
  DebugUtils.debug(MODULE_NAME, 'Component mounted')
})
</script>
```

### Обработка ошибок

```typescript
try {
  // операции
} catch (error) {
  DebugUtils.error('ModuleName', 'Operation description failed', {
    error,
    context: {
      /* дополнительная информация */
    }
  })
  throw error // если нужно пробросить ошибку выше
}
```

## Советы по разработке

1. **Логирование**

   - Используйте DebugUtils вместо console.log
   - Всегда указывайте имя модуля/компонента
   - Добавляйте контекстную информацию в логи

2. **Работа с датами**

   - Всегда используйте TimeUtils для работы с датами
   - Учитывайте часовой пояс (Asia/Denpasar)
   - Используйте ISO формат для хранения дат

3. **Форматирование**
   - Используйте Formatter для отображения дат/времени
   - Следите за единообразием форматов по всему приложению

# Руководство по разработке

[предыдущие секции остаются без изменений...]

## Firebase и работа с данными

### Базовая конфигурация (Firebase Config)

```typescript
import { app, db } from '@/firebase/config'

// Конфигурация инициализируется автоматически из переменных окружения:
// VITE_FIREBASE_API_KEY
// VITE_FIREBASE_PROJECT_ID
// и других VITE_FIREBASE_* переменных
```

### Конвертеры данных (Firebase Converters)

```typescript
import { createConverter } from '@/firebase/converters'
import type { User } from '@/types'

// Создание типизированного конвертера для коллекции
const userConverter = createConverter<User>()

// Автоматическая конвертация timestamp полей:
// - createdAt
// - updatedAt
// - closedAt (опционально)
```

### Базовый сервис (Base Service)

```typescript
import { BaseService } from '@/firebase/services/base.service'
import type { User } from '@/types'

// Создание сервиса для работы с коллекцией
class UserService extends BaseService<User> {
  constructor() {
    super('users') // название коллекции
  }
}

// Доступные методы:
const userService = new UserService()

// Получение всех документов
const users = await userService.getAll()

// Получение по ID
const user = await userService.getById('123')

// Создание документа
const newUser = await userService.create({
  name: 'John',
  roles: ['admin']
})

// Обновление документа
await userService.update('123', { name: 'Jane' })

// Удаление документа
await userService.delete('123')
```

### Работа с запросами

```typescript
import { where, orderBy, limit } from 'firebase/firestore'

// Получение с условиями
const users = await userService.getAll([
  where('isActive', '==', true),
  orderBy('createdAt', 'desc'),
  limit(10)
])
```

### Обработка временных меток

```typescript
import { TimeUtils } from '@/utils'

// Конвертация ISO в Timestamp (для Firebase)
const timestamp = TimeUtils.isoToTimestamp(dateString)

// Конвертация Timestamp в ISO (из Firebase)
const isoString = TimeUtils.timestampToLocalISO(timestamp)
```

## Рекомендации по работе с Firebase

1. **Типизация**

   - Всегда определяйте интерфейсы для коллекций в types/
   - Используйте BaseEntity для всех сущностей с timestamp полями
   - Создавайте отдельные сервисы для каждой коллекции

2. **Конвертеры**

   - Используйте baseConverter для стандартных полей
   - Создавайте специальные конвертеры для сложных типов данных
   - Следите за корректной конвертацией временных меток

3. **Сервисы**

   - Наследуйтесь от BaseService для стандартных операций
   - Добавляйте специфичные методы в конкретные сервисы
   - Используйте DebugUtils для логирования операций

4. **Безопасность**
   - Следите за правилами безопасности в firestore.rules
   - Проверяйте права доступа на уровне приложения
   - Валидируйте данные перед отправкой в Firebase

## Структура веток

```
main   ●───●───●   (основная ветка, стабильный код)
         │   │
dev     ●───●───●  (ветка разработки)
           │   │
feature      ●───● (ветки для новых функций)
```

## Работа с ветками

### Основные команды

```bash
# Посмотреть все ветки (включая удаленные)
git branch -a

# Посмотреть все удаленные ветки
git branch -r

# Посмотреть текущую ветку
git branch --show-current

# Детальная информация о ветках
git branch -v    # показывает последний коммит в каждой ветке
git branch -vv   # показывает связь с удаленными ветками
```

### Настройка веток

```bash
# Убедимся что мы на main и он актуален
git checkout main
git pull

# Создаем ветку dev
git checkout -b dev

# Пушим ветку dev в удаленный репозиторий
git push --set-upstream origin dev
```

## Процесс разработки

### 1. Начало работы над задачей

```bash
git checkout dev                     # Переключаемся на dev
git pull                            # Получаем последние изменения
git checkout -b feature/task-name   # Создаем ветку для задачи
```

### 2. Во время разработки

```bash
git add .                           # Добавляем изменения
git commit -m "feat: описание"      # Коммитим
git push                           # Пушим изменения
```

### 3. Завершение задачи

```bash
git checkout dev                    # Переключаемся на dev
git pull                           # Подтягиваем изменения
git merge feature/task-name        # Сливаем нашу задачу
git push                          # Отправляем изменения
```

### 4. Релиз

```bash
git checkout main
git merge dev
pnpm release "описание релиза"
```

## Релизы

Для создания релиза используется скрипт `release.sh`:

```bash
pnpm release "описание релиза"
```

Скрипт автоматически:

- Добавляет все изменения
- Создает коммит с вашим сообщением
- Увеличивает версию патча
- Создает тег версии
- Отправляет изменения и теги в репозиторий

## Правила коммитов

Используем conventional commits:

- `feat:` - новая функциональность

```bash
git commit -m "feat: добавил форму логина"
```

- `fix:` - исправление ошибок

```bash
git commit -m "fix: исправил валидацию email"
```

- `chore:` - рутинные задачи, обновления

```bash
git commit -m "chore: обновил зависимости"
```

- `docs:` - документация

```bash
git commit -m "docs: обновил README"
```

## Версионность и коммиты

### Семантическое версионирование

Формат: `MAJOR.MINOR.PATCH` (например, 1.2.3)

- `MAJOR` - несовместимые изменения API
- `MINOR` - новая функциональность (обратно совместимая)
- `PATCH` - исправления багов

### Промежуточные коммиты в Dev

При работе над задачей в feature-ветке используйте промежуточные коммиты:

```bash
# Сохранение промежуточного прогресса
git commit -m "wip: описание текущего состояния"

# Сохранение логического блока изменений
git commit -m "feat(auth): добавил валидацию формы"

# Фиксация части большой задачи
git commit -m "feat(auth): #1 базовая структура компонентов"
git commit -m "feat(auth): #2 добавил стили"
git commit -m "feat(auth): #3 подключил апи"
```

### Объединение коммитов перед мержем

Перед мержем в dev желательно объединить промежуточные коммиты:

```bash
# Объединить последние N коммитов
git rebase -i HEAD~N

# Пример: объединить последние 3 коммита
git rebase -i HEAD~3
```

### Примеры версионирования

```bash
# Новая фича - увеличиваем MINOR
pnpm release "feat: добавили авторизацию" # 1.1.0

# Исправление бага - увеличиваем PATCH
pnpm release "fix: исправлен баг авторизации" # 1.1.1

# Большие изменения - увеличиваем MAJOR
pnpm release "feat!: новая версия API" # 2.0.0
```

### Рекомендации

- Делайте частые небольшие коммиты в процессе разработки
- Используйте префикс "wip:" для незавершенных изменений
- Объединяйте коммиты перед мержем в dev
- Пишите понятные описания коммитов
- Указывайте scope в круглых скобках, если нужно уточнить область изменений

### Работа с тегами версий

```bash
# Посмотреть все теги
git tag

# Посмотреть теги с описанием
git tag -n

# Создать тег с описанием
git tag -a v1.0.0 -m "Первый релиз"

# Запушить теги
git push --tags -
```
