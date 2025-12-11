# Kitchen App - Technical Documentation

Welcome to the Kitchen App technical documentation.

> **Location:** `src/About/docs/`
> This documentation covers internal architecture, development guides, and technical references.

## Documentation Structure

### Core (`src/About/docs/core/`)

Core system architecture and internal mechanisms:

- **[HMR Optimization](./core/hmr-optimization.md)** - Hot Module Replacement optimization for development

### Development (coming soon)

Development guides and workflows:

- Development workflow
- Testing strategies
- Code conventions

### API (coming soon)

API documentation:

- Supabase integration
- Database schema
- RPC functions

### Supplier (`src/About/docs/supplier/`)

Supplier and procurement documentation:

- **[Pricing System](./supplier/pricing-system.md)** - Product pricing architecture, price fields, update flows

### Features (coming soon)

Feature documentation:

- POS system
- Inventory management
- Menu management

## Quick Links

### For Developers

- **[HMR Optimization Guide](./core/hmr-optimization.md)** - Reduce database load during development
- **[HMR Test Page](/debug/hmr)** - Interactive HMR state management (DEV mode only)
- **[CLAUDE.md](../../../CLAUDE.md)** - AI assistant instructions and project overview
- **[Errors Log](../errors.md)** - Known issues and bugs

### Project Documentation (Root `/docs/`)

- [Contributing Guidelines](../../../docs/CONTRIBUTING.md)
- [Git Workflow](../../../docs/GIT_WORKFLOW.md)
- [Supabase Setup](../../../docs/SUPABASE_SETUP.md)
- [Release Progress](../../../docs/RELEASE_PROGRESS.md)

## Contributing to Documentation

When adding new documentation:

1. Place in appropriate category folder
2. Update this README with link
3. Follow markdown best practices
4. Include code examples where relevant
5. Add version history at bottom of doc

## Documentation Standards

- **File naming:** kebab-case (e.g., `hmr-optimization.md`)
- **Headers:** Use ATX-style headers (`#`, `##`, etc.)
- **Code blocks:** Always specify language for syntax highlighting
- **Links:** Use relative links for internal docs
- **Images:** Store in `src/About/docs/images/` folder
- **Updates:** Add version history at document end

## Need Help?

- Check [CLAUDE.md](../../../CLAUDE.md) for project overview
- Review [Errors Log](../errors.md) for known issues
- Open an issue on GitHub
- Contact the development team
