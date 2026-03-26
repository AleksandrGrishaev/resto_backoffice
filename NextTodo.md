# Sprint: Kitchen Ritual System

## Архитектура

### Ritual = Morning/Evening workflow с отслеживанием

```
Morning Ritual (6:00-15:00):
  - Auto-generated: pre-made + urgent production tasks
  - Custom tasks: "Clean fridge", "Check expiry dates", etc.
  → Finish → Congratulations → record to DB → switch to regular tasks

Evening Ritual (15:00-22:00):
  - Auto-generated: evening production + write-offs
  - Custom tasks: "Sweep kitchen", "Cover containers", etc.
  → Finish → Congratulations → record to DB
```

### KPI Ritual Tab

```
┌──────────┬──────────────┬──────────┐
│   TIME   │  FOOD COST   │  RITUAL  │  ← new tab
├──────────┴──────────────┴──────────┤
│ Completion Rate: 87%  Streak: 5d  │
│ Avg Duration: 45min   On-Time: 92%│
├───────────────────────────────────┤
│ History: date, type, duration,    │
│ staff, tasks count                │
└───────────────────────────────────┘
```

---

## Phase 1: Database

### 1.1 Migration 251: `ritual_custom_tasks`

- name, ritual_type (morning/evening), department, sort_order, is_active
- RLS + trigger

### 1.2 Migration 252: `ritual_completions`

- ritual_type, department, completed_by/name, started_at, completed_at
- duration_minutes, total_tasks, completed_tasks
- custom_tasks_completed, schedule_tasks_completed
- task_details JSONB [{taskId, name, type, completed, completedAt, quantity?}]
- RLS + indexes

---

## Phase 2: Types + Service

### 2.1 Types (`kitchenKpi/types.ts`)

- RitualCustomTask, RitualCustomTaskRow
- RitualTask (unified: schedule OR custom)
- RitualCompletion, RitualCompletionRow
- RitualKpiSummary, RitualStaffKpi

### 2.2 Service methods (`kitchenKpiService.ts`)

- getCustomTasks, createCustomTask, updateCustomTask, deleteCustomTask
- recordRitualCompletion
- getRitualCompletions, getTodayRitualCompletions

---

## Phase 3: Store + Composable

### 3.1 Store (`kitchenKpiStore.ts`)

- State: customTasks, ritualCompletions, morningRitualCompleted, eveningRitualCompleted, ritualStartedAt
- Actions: loadCustomTasks, CRUD custom tasks, loadTodayRitualStatus, startRitual, finishRitual, loadRitualHistory

### 3.2 Composable (`composables/useRitualKpi.ts`)

- Computed: completionRate, avgDuration, onTimeRate, currentStreak, byStaff

---

## Phase 4: Core Ritual UI

### 4.1 RitualBanner — add `completed` prop

- Green state when ritual is done

### 4.2 RitualCongratulations component

- Fullscreen overlay: check icon, stats, "Close" button

### 4.3 RitualDialog — support custom tasks + timing + congratulations

- Custom tasks = simple checkbox (tap to toggle)
- Schedule tasks = existing flow (start → numpad → done)
- Track startedAt/completedAt timing
- Show congratulations when all done + Finish

### 4.4 TasksScreen — merge custom tasks, morning→evening transition

- Load custom tasks on mount
- Query DB for today's ritual completions
- Merged RitualTask[] = schedule tasks + custom tasks
- After morning done: show "Complete ✓" banner, regular tasks until 15:00
- After 15:00: show evening ritual banner

---

## Phase 5: KPI Ritual Tab

### 5.1 RitualKpiTab.vue

- Summary cards: Completion Rate, Avg Duration, On-Time Rate, Streak
- Period selector: 7d / 14d / 30d
- History list

### 5.2 KpiScreen — add RITUAL tab

---

## Phase 6: Ritual Settings (Kitchen UI)

### 6.1 RitualSettingsScreen.vue in Kitchen sidebar

- CRUD list: name, ritual_type, department, is_active toggle
- Add/Edit dialog
- Register in KitchenSidebar as "Ritual Settings" screen
- Accessible from Kitchen interface (not Admin)

---

## Implementation Order

| #   | Task                                 | Dependencies | Files                        |
| --- | ------------------------------------ | ------------ | ---------------------------- |
| 1   | Migration 251 + 252                  | -            | migrations/                  |
| 2   | Types                                | 1            | kitchenKpi/types.ts          |
| 3   | Service methods                      | 2            | kitchenKpiService.ts         |
| 4   | Store actions                        | 3            | kitchenKpiStore.ts           |
| 5   | useRitualKpi composable              | 4            | composables/useRitualKpi.ts  |
| 6   | RitualBanner completed state         | -            | RitualBanner.vue             |
| 7   | RitualCongratulations                | -            | new component                |
| 8   | RitualDialog (custom tasks + timing) | 4,7          | RitualDialog.vue             |
| 9   | TasksScreen (transitions)            | 4,6,8        | TasksScreen.vue              |
| 10  | RitualKpiTab                         | 5            | new component                |
| 11  | KpiScreen (add tab)                  | 10           | KpiScreen.vue                |
| 12  | Kitchen RitualSettingsScreen         | 4            | new screen in KitchenSidebar |
