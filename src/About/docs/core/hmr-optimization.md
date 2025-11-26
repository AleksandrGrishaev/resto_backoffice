# HMR Optimization

## Overview

Hot Module Replacement (HMR) optimization prevents unnecessary store reloading during development, reducing database load and improving developer experience.

## Problem

Before optimization:

- Every code change triggered HMR
- HMR caused full app reload → stores reinitialized
- Multiple rapid changes (AI editing) → multiple DB requests
- Database overload during development

## Solution

Implemented a multi-layered optimization:

### 1. Vite HMR Debounce

**File:** `vite.config.ts:37-57`

Reduces the frequency of HMR updates:

- 500ms stabilization threshold
- Waits for file changes to settle
- Combines rapid changes into single reload

```typescript
watch: {
  ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
  awaitWriteFinish: {
    stabilityThreshold: 500, // Wait 500ms after last change
    pollInterval: 100
  }
}
```

### 2. HMR State Manager

**File:** `src/core/hmrState.ts`

Tracks whether stores are already loaded:

- Stores state in `sessionStorage` (survives full reload)
- 5-minute cache duration
- Distinguishes hot reload from hard reload

**Key Functions:**

- `isHotReload()` - Detects if this is an HMR vs fresh load
- `shouldReinitializeStores()` - Determines if stores need reloading
- `saveHMRState()` - Saves initialization state
- `clearHMRState()` - Clears state (on logout)

### 3. Smart Store Initialization

**File:** `src/core/appInitializer.ts:70-93`

Skips store loading when unnecessary:

```typescript
const isHMR = isHotReload()
const shouldSkipInit = !shouldReinitializeStores(finalUserRoles)

if (shouldSkipInit && isHMR) {
  console.log('🔥 Hot reload detected - skipping store initialization')
  return cachedSummary
}
```

### 4. Logout Cleanup

**File:** `src/stores/auth/authStore.ts`

Ensures fresh data for next user:

- Calls `clearHMRState()` on logout
- Clears on cross-tab logout
- Guarantees new user gets fresh data

## Usage

### During Development

**Normal workflow (AI editing):**

1. AI makes changes → files saved
2. Vite waits 500ms for more changes
3. HMR updates components
4. Stores remain untouched ✅
5. No database requests ✅

**When you need fresh data:**

#### Option 1: Hard Reload (F5) ⚡ Fastest

- Press `F5` or `Ctrl+R` / `Cmd+R`
- SessionStorage clears → stores reload
- No need to restart dev server

#### Option 2: HMR Test Page

- Navigate to `/debug/hmr`
- Click "Clear HMR State" button
- Automatic reload with fresh data

#### Option 3: DevTools Console

```javascript
sessionStorage.removeItem('__app_hmr_state__')
location.reload()
```

#### Option 4: Logout → Login

- HMR state auto-clears on logout

## Testing

### Test Page

Navigate to `/debug/hmr` for:

- Visual HMR state indicator
- One-click state clearing
- Manual reload button
- State inspection

### Console Logs

**Successful HMR skip:**

```
🔥 Hot reload detected - skipping store initialization
{
  isHMR: true,
  storesInitialized: true,
  userRoles: ['admin', 'manager'],
  timestamp: '2025-11-26T09:17:51.104Z'
}
```

**Normal initialization:**

```
🚀 Starting app initialization
✅ Phase 1/3: Critical stores initialized
✅ Phase 2/3: Role-based stores initialized
✅ Phase 3/3: Optional stores initialized
```

## Benefits

✅ **Reduced DB Load**

- No repeated store loading during HMR
- Database queried only on first load
- Better dev environment performance

✅ **Faster Development**

- Instant component updates
- No waiting for store reinitialization
- Smoother AI-assisted development

✅ **Smart Caching**

- Stores preserved across HMR
- Automatic cleanup on logout
- Role-based cache validation

✅ **Developer Experience**

- Simple F5 to refresh data
- Visual state management UI
- Clear console feedback

## Architecture

```
User edits code
      ↓
Vite watches files
      ↓
500ms debounce (wait for more changes)
      ↓
HMR triggered
      ↓
Component updates ← Most common path (stores untouched)
      ↓
Full reload needed?
      ↓
Check HMR state (sessionStorage)
      ↓
State exists? → Skip store init ✅
State missing? → Load stores ✅
```

## Files Modified

### Core Files

- `vite.config.ts` - HMR debounce configuration
- `src/core/hmrState.ts` - HMR state management (NEW)
- `src/core/appInitializer.ts` - Smart initialization logic
- `src/stores/auth/authStore.ts` - Logout cleanup

### Testing Files

- `src/views/debug/HMRTestView.vue` - Test page with controls (NEW)
- `src/components/HMRTestComponent.vue` - Test component (NEW)
- `src/router/index.ts` - Added `/debug/hmr` route

### Documentation

- `docs/core/hmr-optimization.md` - This file (NEW)

## Configuration

### Debounce Duration

Adjust in `vite.config.ts`:

```typescript
awaitWriteFinish: {
  stabilityThreshold: 500, // milliseconds
  pollInterval: 100
}
```

### Cache Duration

Adjust in `src/core/hmrState.ts`:

```typescript
const HMR_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
```

## Troubleshooting

### Stores not loading on fresh page load

- Check console for "Hot reload detected" message
- Clear HMR state: `sessionStorage.removeItem('__app_hmr_state__')`
- Hard reload with F5

### HMR state persisting after logout

- Check `src/stores/auth/authStore.ts:362` - should call `clearHMRState()`
- Verify cross-tab logout at line 118
- Manual clear: Open DevTools and run `sessionStorage.clear()`

### Changes not reflected immediately

- This is expected! HMR is working correctly
- Stores intentionally not reloaded
- Press F5 to get fresh data when needed

## Future Improvements

Potential enhancements:

- [ ] Configurable debounce duration via ENV
- [ ] Per-store selective reload
- [ ] Visual indicator in UI showing HMR state
- [ ] Auto-refresh on specific file patterns
- [ ] Development mode settings panel

## Related Documentation

- [App Initialization](./app-initialization.md) - How stores are loaded
- [Store Architecture](./store-architecture.md) - Store design patterns
- [Development Workflow](../development/workflow.md) - Dev best practices

## Version History

- **2025-11-26** - Initial implementation
  - Vite HMR debounce
  - HMR state manager
  - Smart store initialization
  - Test page and documentation
