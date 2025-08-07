# saas-background-server-template

Always run `git submodule update --init --recursive` to sync all required package inside `saas-packages` repository

## Conventional Commits

This project uses conventional commits to maintain a clean and standardized commit history. The setup includes:

### Available Commands

- `pnpm commit` - Interactive commit using commitizen
- `pnpm commit:all` - Stage all changes and start interactive commit

### Commit Types

- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `build` - Build system or external dependencies
- `ci` - CI/CD changes
- `chore` - Maintenance tasks
- `revert` - Reverting previous commits

### Examples

```bash
# Simple commit
pnpm commit

# Stage all and commit
pnpm commit:all
```

The interactive prompt will guide you through selecting the type, scope, and writing the commit message.