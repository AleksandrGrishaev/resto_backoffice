# Core Documentation

Core system architecture, internal mechanisms, and foundational patterns.

## Available Documentation

### Performance & Optimization

- **[HMR Optimization](./hmr-optimization.md)** - Hot Module Replacement optimization for development
  - Reduces database load during development
  - Smart store initialization
  - Vite HMR debounce configuration
  - Interactive test interface at `/debug/hmr`

### Architecture & Authentication

- **[Supabase Authentication](./supabase-auth.md)** - RLS policies and authentication best practices
  - Auth context in foreground vs background operations
  - `auth.role()` vs `auth.uid()` comparison
  - Best practices for RLS policies
  - Common patterns and debugging
  - Real-world example: discount events RLS fix

### Database Operations

- **[Database Backup & Restore](./database-backup-restore.md)** - Backup and restore procedures
  - Backup production database (`pnpm backup:prod`)
  - Restore to development (`pnpm restore:dev`)
  - Configuration and troubleshooting
  - Security considerations

## Coming Soon

### Architecture

- App initialization flow
- Store architecture patterns
- Router configuration

### State Management

- Pinia store patterns
- Repository pattern
- Service layer architecture
- Data persistence strategies

### Build & Deployment

- Vite configuration
- Build optimization
- Environment management
- Production deployment

## Related Documentation

- [Main Documentation](../README.md) - Documentation index
- [Development Guides](../development/) - Development workflows (coming soon)
- [CLAUDE.md](../../../../CLAUDE.md) - Project overview and AI instructions
- [Errors Log](../../errors.md) - Known issues and bugs
