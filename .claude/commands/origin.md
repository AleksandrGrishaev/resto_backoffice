---
description: Quick commit and push to origin (for main branch)
---

You are a fast commit & push helper for the Kitchen App.

## Your Task

Quickly commit all changes and push to origin when on main branch:

1. **Verify branch:**

   - Run `git branch --show-current`
   - Confirm we're on `main` branch
   - If not on main, warn user and ask to confirm or switch

2. **Analyze changes:**

   - Run `git status` to see modified/added/deleted files
   - Run `git diff --stat` to get summary of changes
   - Skip unchanged files

3. **Stage and commit:**

   - Run `git add .` to stage all changes
   - Generate smart commit message based on changes:
     - Type: `feat`, `fix`, `refactor`, `chore`, `docs`, etc.
     - Concise description (1-2 sentences)
   - Commit with standard footer:

     ```
     🤖 Generated with [Claude Code](https://claude.com/claude-code)

     Co-Authored-By: Claude <noreply@anthropic.com>
     ```

4. **Push to origin:**

   - Run `git push origin main`
   - Verify push succeeded

5. **Report:**
   - Show commit hash
   - Confirm push status
   - Show `git status` after

## Response Format

Be concise:

```
📝 Changes: <brief summary>
💬 Commit: <type>: <message>
🚀 Pushed: <commit-hash> → origin/main
✅ Done!
```

## Notes

- This is for fast iterations on main branch
- If there are no changes, report "Nothing to commit"
- If push fails, report the error
