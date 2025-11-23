# Git Workflow

This document describes the Git branching strategy and workflow for Kitchen App.

## Branch Structure

The repository uses a **simplified two-branch workflow**:

- **`main`** - Production code (protected, only through PR)
  - Always stable and deployable
  - Direct pushes disabled
  - Auto-deploys to production (Railway)
  - Tagged with version numbers (v1.0.0, v1.1.0, etc.)

- **`dev`** - Development/integration branch (protected, only through PR)
  - Integration point for all features
  - Auto-deploys to development environment
  - Should be stable enough for testing
  - Direct pushes disabled

- **`feature/{name}`** - New features (created from `dev`)
  - Short-lived branches for new functionality
  - Merged back to `dev` via Pull Request
  - Deleted after merge

- **`bugfix/{name}`** - Bug fixes (created from `dev`)
  - Short-lived branches for fixes
  - Merged to `dev` via Pull Request
  - For critical bugs: merge to `dev`, then create release to `main`

## Initial Setup

### Creating Main and Dev Branches

**Note:** Due to repository permissions, the main and dev branches need to be created with appropriate access rights. Run these commands with proper permissions:

```bash
# Create main branch (production)
git checkout -b main
git push -u origin main

# Create dev branch (development)
git checkout -b dev
git push -u origin dev
```

### Branch Protection Rules

Configure in GitHub Settings → Branches:

**For `main` branch:**
- ✅ Require pull request before merging
- ✅ Require approvals (1 reviewer minimum)
- ✅ Require status checks to pass (CI/CD)
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

**For `dev` branch:**
- ✅ Require pull request before merging
- ✅ Require status checks to pass (CI/CD)
- ✅ Require branches to be up to date before merging

## Development Workflow

### Starting New Feature

```bash
# 1. Update dev branch
git checkout dev
git pull origin dev

# 2. Create feature branch
git checkout -b feature/my-awesome-feature

# 3. Work on feature
# ... make changes ...
git add .
git commit -m "feat(module): add awesome feature"

# 4. Push feature branch
git push -u origin feature/my-awesome-feature

# 5. Create Pull Request on GitHub: feature/my-awesome-feature → dev
# 6. After review and approval, merge PR
# 7. Delete feature branch (locally and on GitHub)
git branch -d feature/my-awesome-feature
git push origin --delete feature/my-awesome-feature
```

### Bug Fixes

**Regular bugs (non-critical):**

```bash
# 1. Create bugfix branch from dev
git checkout dev
git pull origin dev
git checkout -b bugfix/fix-login-error

# 2. Fix the bug
# ... make changes ...
git add .
git commit -m "fix(auth): resolve login error for PIN users"

# 3. Push and create PR to dev
git push -u origin bugfix/fix-login-error
# Create PR: bugfix/fix-login-error → dev
```

**Critical bugs in production:**

```bash
# 1. Create bugfix branch from dev
git checkout dev
git pull origin dev
git checkout -b bugfix/critical-payment-error

# 2. Fix the bug
# ... make changes ...
git add .
git commit -m "fix(pos): resolve critical payment processing error"

# 3. Push and create PR to dev
git push -u origin bugfix/critical-payment-error
# Create PR: bugfix/critical-payment-error → dev

# 4. After merge to dev, immediately create release PR
# Create PR: dev → main (mark as urgent)
# After merge, production auto-deploys
```

## Release Process

### Regular Release

```bash
# 1. Ensure all features are merged and tested in dev
# 2. Create Pull Request: dev → main
# 3. Title: "Release v1.1.0"
# 4. Description: Copy changelog from CHANGELOG.md
# 5. Request review
# 6. After approval, merge PR
# 7. GitHub Actions automatically deploys to production
# 8. Create and push version tag
git checkout main
git pull origin main
git tag -a v1.1.0 -m "Release v1.1.0 - Description here"
git push origin v1.1.0
```

### Version Tagging

Use [Semantic Versioning](https://semver.org/):

- **MAJOR** (v2.0.0) - Breaking changes
- **MINOR** (v1.1.0) - New features, backwards compatible
- **PATCH** (v1.0.1) - Bug fixes, backwards compatible

```bash
# After merging release to main
git checkout main
git pull

# Create annotated tag
git tag -a v1.1.0 -m "Release v1.1.0

Features:
- Add printer integration
- Improve offline sync performance

Fixes:
- Fix payment calculation rounding
- Fix shift report timezone issue

See CHANGELOG.md for details."

# Push tag to trigger release workflow
git push origin v1.1.0
```

## Commit Message Convention

We use **Conventional Commits** for clear, searchable history. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Common Commands

### Update your branch with latest changes

```bash
# Update your feature branch with latest dev
git checkout dev
git pull origin dev
git checkout feature/my-feature
git merge dev

# Or use rebase (cleaner history, but more complex)
git checkout feature/my-feature
git rebase dev
```

### Sync fork (if working on a fork)

```bash
# Add upstream remote (once)
git remote add upstream https://github.com/original/kitchen-app.git

# Sync dev branch
git checkout dev
git fetch upstream
git merge upstream/dev
git push origin dev
```

### Undo last commit (not pushed)

```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes, undo commit
git reset --hard HEAD~1
```

### Stash work in progress

```bash
# Save work for later
git stash

# List stashes
git stash list

# Apply most recent stash
git stash pop
```

## Deployment Flow

```
feature/my-feature → dev → CI/CD → Development Environment (Railway)
                      ↓
                     main → CI/CD → Production Environment (Railway)
                      ↓
                    v1.x.x tag → GitHub Release
```

### Auto-Deployment

- **Push to `dev`** → Auto-deploys to development environment
- **Merge to `main`** → Requires manual approval → Deploys to production
- **Create tag `v*`** → Creates GitHub Release with changelog

## Troubleshooting

### Merge conflicts

```bash
# Update your branch
git checkout feature/my-feature
git fetch origin
git merge origin/dev

# Fix conflicts in your editor
# Files with conflicts will be marked like:
# <<<<<<< HEAD
# your changes
# =======
# incoming changes
# >>>>>>> origin/dev

# After fixing conflicts
git add .
git commit -m "merge: resolve conflicts with dev"
```

### Accidentally committed to wrong branch

```bash
# If not pushed yet
git log  # Note the commit hash you want to move
git reset --hard HEAD~1  # Undo commit on current branch

git checkout correct-branch
git cherry-pick <commit-hash>  # Apply commit to correct branch
```

### Need to update PR after review

```bash
# Make requested changes
git add .
git commit -m "refactor: address PR feedback"
git push

# PR automatically updates
```

## Best Practices

1. **Keep branches short-lived** - merge within 1-3 days
2. **Pull before you push** - always sync with dev first
3. **Small, focused PRs** - easier to review, less conflicts
4. **Write meaningful commits** - use conventional commits
5. **Test before PR** - run linting, tests, and build locally
6. **Keep dev stable** - don't merge broken code
7. **Communicate** - comment on PRs, ask questions
8. **Delete merged branches** - keep repository clean

## Questions?

- Check [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- Check [README.md](../README.md) for setup instructions
- Open an issue for questions or problems
