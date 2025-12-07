---
description: Fast commit and push - add, commit, push to current branch and dev in one command
---

Quick ship for solo developer. Do everything fast with minimal output.

## Execute These Steps

Run all commands quickly, only report errors:

1. **Check for changes:**

   ```bash
   git status --porcelain
   ```

   If no changes, say "Nothing to ship" and stop.

2. **Stage all:**

   ```bash
   git add .
   ```

3. **Quick diff analysis:**

   ```bash
   git diff --cached --stat
   ```

   Generate a SHORT commit message (one line, max 50 chars for subject).
   Format: `<type>: <what changed>`
   Types: feat, fix, refactor, chore, style, docs

4. **Commit:**

   ```bash
   git commit -m "<message>

   🤖 Generated with Claude Code

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

5. **Push current branch:**

   ```bash
   git push origin HEAD
   ```

6. **Update dev (if not already on dev):**
   ```bash
   git checkout dev && git merge HEAD@{1} --ff-only && git push origin dev && git checkout -
   ```
   Use `--ff-only` for speed. If fails, skip dev update silently.

## Output Format

Be MINIMAL. Just show:

```
✓ <commit message> [abc1234]
✓ Pushed to <branch> + dev
```

Or on error:

```
✗ Error: <what went wrong>
```

NO explanations, NO suggestions, NO verbose output. Speed is priority.
