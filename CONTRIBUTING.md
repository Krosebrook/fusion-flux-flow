# Contributing to FlashFusion

Thank you for your interest in contributing to FlashFusion! This guide will help you get started.

---

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Testing Requirements](#testing-requirements)
8. [Security Guidelines](#security-guidelines)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for everyone.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or insulting comments
- Public or private harassment
- Publishing others' private information
- Other conduct that could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- Git
- Supabase account (for backend)
- Code editor (VS Code recommended)

### Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Error Lens
- GitLens
- TypeScript Vue Plugin (Volar)

### Setup

1. **Fork the Repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/fusion-flux-flow.git
   cd fusion-flux-flow
   ```

2. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/Krosebrook/fusion-flux-flow.git
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

---

## Development Workflow

### 1. Pick an Issue

- Check the [Issues](https://github.com/Krosebrook/fusion-flux-flow/issues) page
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 3. Make Your Changes

- Follow the [Coding Standards](#coding-standards)
- Write tests for new features
- Update documentation if needed
- Keep commits atomic and well-described

### 4. Test Your Changes

```bash
# Run linter
npm run lint

# Run type check
npm run type-check

# Run tests (when available)
npm test

# Build to verify
npm run build
```

### 5. Commit Your Changes

Follow the [Commit Guidelines](#commit-guidelines)

```bash
git add .
git commit -m "feat: add amazing feature"
```

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## Coding Standards

### TypeScript

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // Implementation
}

// ❌ Bad
function getUser(id: any): any {
  // Implementation
}
```

### React Components

```typescript
// ✅ Good - Functional component with TypeScript
interface Props {
  title: string;
  onClose: () => void;
}

export function Modal({ title, onClose }: Props) {
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

// ❌ Bad - No types, unclear props
export function Modal(props) {
  return (
    <div>
      <h2>{props.title}</h2>
      <button onClick={props.onClose}>Close</button>
    </div>
  );
}
```

### File Organization

```
src/
├── pages/           # One file per route
├── components/
│   ├── ui/         # Reusable UI components
│   ├── layout/     # Layout components
│   └── [feature]/  # Feature-specific components
├── hooks/          # Custom React hooks
├── lib/            # Utilities and helpers
├── types/          # TypeScript types
└── integrations/   # External service integrations
```

### Naming Conventions

- **Components**: PascalCase (`ProductCard.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useAuth.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`User`, `ProductData`)

### Code Style

- Use **2 spaces** for indentation
- Use **single quotes** for strings
- Always use **semicolons**
- Max line length: **100 characters**
- Use **trailing commas** in multi-line arrays/objects
- Use **arrow functions** for callbacks

```typescript
// ✅ Good
const items = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
];

items.map((item) => item.name);

// ❌ Bad
const items = [
  {id: 1, name: "Item 1"},
  {id: 2, name: "Item 2"}
]

items.map(function(item) { return item.name })
```

### Comments

```typescript
// ✅ Good - Explain why, not what
// Retry 3 times because API is sometimes flaky during deployments
const MAX_RETRIES = 3;

// ✅ Good - Document complex logic
/**
 * Calculates the next billing date based on subscription plan.
 * For annual plans, bills on anniversary. For monthly, bills on same day next month.
 */
function calculateNextBillingDate(plan: Plan): Date {
  // Implementation
}

// ❌ Bad - States the obvious
// Set retries to 3
const MAX_RETRIES = 3;

// ❌ Bad - No explanation for complexity
function calculateNextBillingDate(plan: Plan): Date {
  // Implementation
}
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring (no functional changes)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build process or auxiliary tool changes
- **ci**: CI/CD changes

### Examples

```bash
# Feature
feat(products): add bulk import from CSV

# Bug fix
fix(auth): resolve token refresh race condition

# Documentation
docs(readme): update installation instructions

# Refactor
refactor(api): extract credentials encryption to separate module

# Breaking change
feat(api)!: change store credentials schema

BREAKING CHANGE: Store credentials now use vault references instead of plain JSON.
Migration required. See MIGRATION.md for details.
```

### Scope

Common scopes:
- `auth` - Authentication related
- `products` - Product management
- `stores` - Store connections
- `plugins` - Plugin system
- `jobs` - Job queue
- `approvals` - Approval workflows
- `ui` - UI components
- `api` - API integrations
- `db` - Database changes

---

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log or debug code
- [ ] Build succeeds
- [ ] Linter passes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Code Review**: At least one maintainer reviews
3. **Changes Requested**: Address feedback and push updates
4. **Approval**: Maintainer approves PR
5. **Merge**: Maintainer merges to main branch

### Review Timeline

- Simple fixes: 1-2 days
- New features: 3-5 days
- Major changes: 1 week

---

## Testing Requirements

### Current Status

⚠️ Testing infrastructure is being built (see Phase 1 of roadmap)

### Future Requirements

Once testing is set up:

#### Unit Tests
- All new utilities must have tests
- All new hooks must have tests
- Aim for 70%+ coverage

```typescript
// Example test
import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date)).toBe('January 15, 2024');
  });
});
```

#### Integration Tests
- Test Supabase interactions
- Test component integration

#### E2E Tests
- Critical user flows (signup, connect store, add product)
- Use Playwright

---

## Security Guidelines

### Never Commit

- ❌ API keys or secrets
- ❌ `.env` files
- ❌ Private credentials
- ❌ User data
- ❌ Database dumps with real data

### Always

- ✅ Use `.env.example` for templates
- ✅ Validate all user inputs
- ✅ Sanitize displayed user content
- ✅ Use RLS policies for data access
- ✅ Review SECURITY.md before touching credentials

### Reporting Security Issues

**DO NOT** create a public issue for security vulnerabilities.

Instead, use GitHub's [Private Security Advisory](https://github.com/Krosebrook/fusion-flux-flow/security/advisories/new) feature.

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## Questions?

- **General Questions**: Open a GitHub Discussion
- **Bug Reports**: Create an Issue with `bug` label
- **Feature Requests**: Create an Issue with `enhancement` label
- **Security Issues**: Email security team (see above)

---

## Resources

- [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - Developer setup
- [AUDIT_AND_ROADMAP.md](./AUDIT_AND_ROADMAP.md) - Project roadmap
- [SECURITY.md](./SECURITY.md) - Security guidelines
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)

---

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Eligible for contributor swag (when available)

---

Thank you for contributing to FlashFusion! 🎉

