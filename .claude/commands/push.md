---
description: Push current branch and update dev branch (optionally main)
---

You are a git push and branch update helper for the Kitchen App.

## Your Task

Push the current feature branch, merge into dev, and optionally update main:

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

4. **Ask about main branch:**

   - Use AskUserQuestion tool to ask: "Also update main branch?"
   - Options: "Yes" (merge dev into main) or "No" (skip main)

5. **If user chose Yes - Update main:**

   - Run `git checkout main` to switch to main branch
   - Run `git pull origin main` to ensure main is up to date
   - Run `git merge dev --no-ff` to merge dev into main
   - Run `git push origin main` to push updated main

6. **Return to feature branch:**

   - Run `git checkout <current-branch>` to return to original branch

7. **Verify:**
   - Show final status of all updated branches
   - Confirm which branches were updated

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
4. Main branch status (if updated)
5. Final verification table
6. Brief summary

Be concise - this is meant for quick deployment iterations.
