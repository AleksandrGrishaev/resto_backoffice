# Next Todo - Current Sprint

View and manage the current sprint with detailed implementation plans.

## Instructions

1. Read `NextTodo.md` file
2. Show current sprint status and tasks
3. If user wants to update:
   - Update current sprint tasks
   - Add detailed implementation steps
   - Include code examples, queries, migrations
   - Mark completed tasks

## What to Include in NextTodo.md

### Sprint Header

- Created date
- Priority level
- Current status
- Problem summary

### Root Cause Analysis

- Detailed problem breakdown
- Technical analysis
- Flow diagrams
- Code examples

### Implementation Plan

- Detailed phases with time estimates
- Step-by-step instructions
- Code snippets and examples
- SQL migrations and queries
- RPC function definitions
- Testing procedures

### Success Criteria

- Specific, measurable goals
- Expected behaviors
- Performance targets

### Technical Details

- File locations
- Database connections
- Test users and credentials
- Environment variables

## What NOT to Include

- ❌ Strategic long-term goals (use todo.md)
- ❌ Completed sprint archives
- ❌ General project roadmap

## Examples of Good NextTodo.md Content

**Good:**

```sql
-- Migration 009: Create RPC function
CREATE OR REPLACE FUNCTION get_pin_user_credentials(pin_input TEXT)
RETURNS TABLE (user_id UUID, ...)
...
```

**Good:**

```typescript
// Update authStore.loginWithPin()
const { data } = await supabase.rpc('get_pin_user_credentials', {
  pin_input: pin
})
```

**Bad (too high-level for NextTodo.md):**

- "Fix authentication" ❌
- "Improve performance" ❌
- "Update documentation" ❌

**Note:** For high-level planning, use `/todo` instead.
