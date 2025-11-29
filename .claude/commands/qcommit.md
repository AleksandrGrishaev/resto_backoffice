---
description: Quick commit with automatic git add and feat prefix
---

You are a quick commit helper for the Kitchen App.

## Your Task

Perform a quick commit with the following steps:

1. **Stage all changes:**

   - Run `git add .` to stage all changes

2. **Create commit:**

   - Use `git commit -m "feat: <description>"` format
   - The description should be provided by the user as an argument

3. **Verify:**
   - Show `git status` after commit to confirm

## Usage

The user will provide the commit message description, and you will:

- Stage all changes
- Commit with "feat: " prefix
- Show the result

## Response Format

Always provide:

1. Files staged
2. Commit message used
3. Commit hash and verification
4. Next suggested actions (push, etc.)

Be concise and fast - this is meant for quick iterations.
