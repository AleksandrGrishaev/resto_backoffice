# Background Task Processing System

## Overview

The background task system provides **non-blocking UI** for long-running operations like production and write-offs. Instead of blocking the interface for 5-7 seconds while database operations complete, dialogs close immediately and operations continue in the background with snackbar feedback.

## Problem Solved

Production and write-off operations involve multiple sequential steps:

1. FIFO batch allocation
2. Negative batch creation
3. Supabase inserts (batches, operations)
4. KPI recording
5. Balance recalculation

These operations blocked the UI for 5-7 seconds. The background task system eliminates this blocking.

## Architecture

```
src/core/background/
├── types.ts              # Task type definitions
├── useBackgroundTasks.ts # Main composable
└── index.ts              # Module exports
```

### Key Components

- **useBackgroundTasks** - Composable providing task management
- **BackgroundTask** - Generic task interface with status tracking
- **TaskCallbacks** - Success/error notification callbacks

## Usage

### Production Tasks

```typescript
import { useBackgroundTasks } from '@/core/background'

const { addProductionTask } = useBackgroundTasks()

// In dialog submit handler
async function handleSubmit() {
  // Prepare data
  const receiptData = { ... }

  // Queue background task (non-blocking)
  addProductionTask(
    {
      receiptData,
      preparationName: 'Hummus',
      preparationId: 'prep_123',
      quantity: 500,
      unit: 'g',
      estimatedCost: 25000,
      kpiData: { userId, userName, department, timestamp }
    },
    {
      onSuccess: (message) => emit('success', message),
      onError: (message) => emit('error', message)
    }
  )

  // Close dialog immediately
  handleClose()
}
```

### Product Write-Off Tasks

```typescript
const { addProductWriteOffTask } = useBackgroundTasks()

addProductWriteOffTask(
  {
    items: [{ itemId: 'prod_1', itemName: 'Tomatoes', quantity: 2, unit: 'kg' }],
    department: 'kitchen',
    responsiblePerson: 'John',
    reason: 'expired',
    notes: 'Past expiry date',
    kpiData: { userId, userName, affectsKpi: true }
  },
  {
    onSuccess: msg => showSnackbar(msg, 'success'),
    onError: msg => showSnackbar(msg, 'error')
  }
)
```

### Preparation Write-Off Tasks

```typescript
const { addPrepWriteOffTask } = useBackgroundTasks()

addPrepWriteOffTask(
  {
    items: [{ preparationId: 'prep_1', preparationName: 'Hummus', quantity: 300, unit: 'g' }],
    department: 'kitchen',
    responsiblePerson: 'John',
    reason: 'spoiled',
    notes: 'Quality issue',
    kpiData: { userId, userName, affectsKpi: true }
  },
  callbacks
)
```

## Task Lifecycle

```
┌─────────┐     ┌────────────┐     ┌───────────┐
│ QUEUED  │ ──▶ │ PROCESSING │ ──▶ │ COMPLETED │
└─────────┘     └────────────┘     └───────────┘
                      │
                      │ (on error)
                      ▼
               ┌────────────┐     ┌────────┐
               │   RETRY    │ ──▶ │ FAILED │
               │ (backoff)  │     └────────┘
               └────────────┘
```

### Status States

| Status       | Description                      |
| ------------ | -------------------------------- |
| `queued`     | Task created, waiting to process |
| `processing` | Task actively running            |
| `completed`  | Task finished successfully       |
| `failed`     | Task failed after max retries    |

## Error Handling & Retries

Tasks automatically retry on failure with **exponential backoff**:

- Attempt 1: Immediate
- Attempt 2: 2 seconds delay
- Attempt 3: 4 seconds delay
- Max attempts: 3 (configurable)

```typescript
// Retry logic in useBackgroundTasks.ts
if (task.attempts < task.maxAttempts) {
  const delay = Math.pow(2, task.attempts) * 1000
  setTimeout(() => processTask(task, callbacks), delay)
} else {
  updateTaskStatus(task.id, 'failed')
  callbacks?.onError?.(errorMessage)
}
```

## Callback Notifications

The system uses callbacks for UI feedback:

```typescript
interface TaskCallbacks {
  onQueued?: (message: string) => void // Task added to queue
  onSuccess?: (message: string) => void // Task completed
  onError?: (message: string) => void // Task failed
}
```

Parent components typically wire these to snackbar notifications:

```typescript
addProductionTask(payload, {
  onSuccess: msg => {
    snackbarStore.show(msg, 'success')
  },
  onError: msg => {
    snackbarStore.show(msg, 'error')
  }
})
```

## Global State

The task list is **global** (singleton pattern) - tasks persist across component re-renders:

```typescript
// Global state outside composable function
const tasks: Ref<BackgroundTask[]> = ref([])
const isProcessing = ref(false)

export function useBackgroundTasks() {
  // Access global state
  return { tasks, isProcessing, ... }
}
```

## Monitoring Tasks

```typescript
const {
  tasks, // All tasks
  pendingTasks, // Status: queued
  processingTasks, // Status: processing
  failedTasks, // Status: failed
  hasPendingTasks // Boolean: any queued/processing
} = useBackgroundTasks()

// Check if background work is happening
if (hasPendingTasks()) {
  showSpinner()
}
```

## Type Definitions

```typescript
// Task types
export type BackgroundTaskType = 'production' | 'product_writeoff' | 'preparation_writeoff'

export type BackgroundTaskStatus = 'queued' | 'processing' | 'completed' | 'failed'

// Generic task interface
export interface BackgroundTask<T = unknown> {
  id: string
  type: BackgroundTaskType
  status: BackgroundTaskStatus
  description: string
  department: 'kitchen' | 'bar'
  createdBy: string
  payload: T
  createdAt: string
  startedAt?: string
  completedAt?: string
  attempts: number
  maxAttempts: number
  lastError?: string
}
```

## Dialogs Using Background Tasks

| Dialog                     | Task Function              |
| -------------------------- | -------------------------- |
| SimpleProductionDialog.vue | `addProductionTask()`      |
| ProductWriteOffDialog.vue  | `addProductWriteOffTask()` |
| PrepWriteOffDialog.vue     | `addPrepWriteOffTask()`    |

## Best Practices

1. **Prepare data before queueing** - Capture all needed values before calling `handleClose()`
2. **Show immediate feedback** - Emit a "Processing..." message when closing dialog
3. **Wire up all callbacks** - Handle both success and error cases
4. **Keep tasks self-contained** - Don't rely on component state after dialog closes

## Future Enhancements

Not currently implemented but possible extensions:

- Persist tasks to localStorage for browser close handling
- Manual retry of failed tasks from UI
- Task history panel for monitoring
- Optimistic UI updates with rollback on failure
