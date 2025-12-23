---
description: Quick commit and push to origin (for main branch)
---

Fast commit & push helper for Kitchen App.

## Task

Commit all changes and push to main:

1. **Verify branch:** `git branch --show-current` - confirm on `main`
2. **Analyze:** `git status` + `git diff --stat`
3. **Stage:** `git add .`
4. **Commit:** Smart message (feat/fix/refactor/chore + brief description)
5. **Push:** `git push origin main`
6. **Report:** Show commit hash and status

## Commit Format

```
type: brief description

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Output

```
📝 Changes: <summary>
💬 Commit: <hash>
🚀 Pushed → origin/main
✅ Done!
```

## Notes

- For fast iterations on main branch
- If no changes: "Nothing to commit"
- If push fails: report error
