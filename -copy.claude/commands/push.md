---
description: Push current branch and update dev branch
---

You are a git push and branch update helper for the Kitchen App.

## Your Task

Push the current feature branch and automatically merge it into dev:

1. **Get current branch:**

   - Run `git branch --show-current` to identify the current branch
   - Store the branch name for later return

2. **Push current branch:**

   - Run `git push origin <current-branch>` to push changes
   - If branch doesn't exist on remote, use `git push -u origin <current-branch>`

3. **Switch to dev and update:**

   - Run `git checkout dev` to switch to dev branch
   - Run `git pull origin dev` to ensure dev is up to date
   - Run `git merge <current-branch> --no-ff` to merge feature branch
   - Run `git push origin dev` to push updated dev

4. **Return to feature branch:**

   - Run `git checkout <current-branch>` to return to original branch

5. **Verify:**
   - Show final status of both branches
   - Confirm dev is updated

## Important Notes

- **Main branch is NEVER auto-updated** (manual only)
- This command only updates `dev` branch
- If merge conflicts occur, stop and report to user
- Always verify remote exists before pushing

## Error Handling

If any step fails:

- Show clear error message
- Stop the workflow
- Suggest manual resolution steps
- Return user to original branch if possible

## Response Format

Provide:

1. Current branch name
2. Push confirmation for feature branch
3. Dev branch merge status
4. Final verification
5. Brief summary: "Feature branch `<name>` pushed and merged into dev"

Be concise - this is meant for quick deployment iterations.
