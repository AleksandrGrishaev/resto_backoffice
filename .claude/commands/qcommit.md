---
description: Quick commit with automatic git add and smart commit message
---

You are a quick commit helper for the Kitchen App.

## Your Task

Perform a quick commit with automatic commit message generation:

1. **Analyze changes:**

   - Run `git status` to see modified/added/deleted files
   - Run `git diff` to understand the actual changes
   - Optionally check recent commits with `git log -3 --oneline` for context

2. **Stage all changes:**

   - Run `git add .` to stage all changes

3. **Generate smart commit message:**

   - Analyze the changes and determine the type: `feat`, `fix`, `refactor`, `chore`, `docs`, etc.
   - Create a concise, descriptive message (1-2 sentences max)
   - Follow convention: `<type>: <description>`
   - Examples:
     - `feat: add department filter to recipes`
     - `fix: resolve recipe mapping errors`
     - `refactor: improve menu store type safety`
     - `chore: remove outdated sprint notes`

4. **Commit:**

   - Use the generated message
   - Add standard footer:

     ```
     🤖 Generated with [Claude Code](https://claude.com/claude-code)

     Co-Authored-By: Claude <noreply@anthropic.com>
     ```

5. **Verify:**
   - Show `git status` after commit to confirm

## Response Format

Provide:

1. Summary of changes analyzed
2. Generated commit message (show before committing)
3. Commit hash and verification
4. Brief suggestion for next steps (e.g., "Ready to push with /push command")

Be concise and fast - this is meant for quick iterations.
