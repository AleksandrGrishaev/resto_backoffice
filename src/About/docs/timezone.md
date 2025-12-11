# Timezone Configuration

## Overview

The Kitchen App uses a fixed timezone for all date/time operations to ensure consistency across the application, regardless of user's browser timezone.

## Current Configuration

| Setting             | Value                         |
| ------------------- | ----------------------------- |
| **Timezone**        | `Asia/Makassar`               |
| **Region**          | Bali, Indonesia (WITA)        |
| **UTC Offset**      | UTC+8                         |
| **Indonesian Name** | Waktu Indonesia Tengah (WITA) |

## Why Asia/Makassar?

Bali is located in the WITA (Central Indonesian Time) zone. The IANA timezone database uses `Asia/Makassar` as the identifier for this zone, which covers:

- Bali
- Sulawesi
- East Kalimantan
- South Kalimantan
- West Nusa Tenggara
- East Nusa Tenggara

Note: There is no `Asia/Bali` or `Asia/Denpasar` in the IANA database.

## Indonesian Time Zones

| Zone     | IANA Identifier     | UTC Offset | Coverage                                    |
| -------- | ------------------- | ---------- | ------------------------------------------- |
| WIB      | `Asia/Jakarta`      | UTC+7      | Java, Sumatra, West Kalimantan              |
| **WITA** | **`Asia/Makassar`** | **UTC+8**  | **Bali**, Sulawesi, Kalimantan (East/South) |
| WIT      | `Asia/Jayapura`     | UTC+9      | Papua, Maluku                               |

## Implementation

### File Location

```
src/utils/time.ts
```

### Key Functions

```typescript
// Get current date in local timezone (Bali)
TimeUtils.getCurrentLocalDate() // Returns: "2025-12-12"

// Get current ISO timestamp (UTC)
TimeUtils.getCurrentLocalISO() // Returns: "2025-12-11T16:00:00.000Z"

// Format date for display
TimeUtils.formatDateToDisplay(date) // Uses Bali timezone
```

### Usage Example

```typescript
import { TimeUtils } from '@/utils'

// Correct: Use for schedule dates, KPI periods, etc.
const today = TimeUtils.getCurrentLocalDate() // "2025-12-12" in Bali

// Incorrect: This gives UTC date which may be different!
const utcToday = new Date().toISOString().split('T')[0] // "2025-12-11" at midnight Bali
```

## Database Considerations

- All timestamps in Supabase are stored in **UTC**
- When querying by date (e.g., `schedule_date`), use `TimeUtils.getCurrentLocalDate()`
- When displaying times to users, convert from UTC to Bali time

## Changing Timezone

To change the timezone (e.g., if expanding to Jakarta):

1. Update `TIMEZONE` constant in `src/utils/time.ts`:

   ```typescript
   const TIMEZONE = 'Asia/Jakarta' // WIB, UTC+7
   ```

2. The following will automatically use the new timezone:
   - Production schedule dates
   - KPI period dates
   - History filtering
   - All `TimeUtils` functions

## Troubleshooting

### "Yesterday's" data showing today

If the schedule shows yesterday's data at midnight:

- Check if `TimeUtils.getCurrentLocalDate()` is used (not `toISOString().split('T')[0]`)
- The latter returns UTC date which is 8 hours behind Bali

### Times look wrong in logs

- Debug logs may show UTC times (from `console.log(new Date())`)
- Use `TimeUtils.formatDateToDisplay()` for human-readable Bali times
