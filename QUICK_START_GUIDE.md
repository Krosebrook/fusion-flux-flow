# 🚀 FlashFusion - Quick Start Guide

**For New Team Members & Contributors**

---

## What is FlashFusion?

FlashFusion is a multi-tenant e-commerce operations hub that helps businesses manage products, inventory, and publishing across multiple platforms (Shopify, Etsy, Printify, Gumroad, Amazon) from a single interface.

**Key Innovation**: Capability Matrix system that explicitly handles platform limitations with native/workaround/unsupported categorization.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  (TypeScript, Vite, shadcn/ui, Tailwind)           │
│  Routes: Dashboard, Products, Stores, Plugins,      │
│          Jobs, Approvals, Settings                  │
└─────────────────┬───────────────────────────────────┘
                  │ REST + Realtime
                  │
┌─────────────────▼───────────────────────────────────┐
│              Supabase Backend                        │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  PostgreSQL  │  │  Auth + RLS  │                │
│  │  + RLS       │  │              │                │
│  └──────────────┘  └──────────────┘                │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Edge Funcs   │  │   Storage    │                │
│  │ (Jobs)       │  │   (Images)   │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
                  │
                  │ Platform APIs
                  │
┌─────────────────▼───────────────────────────────────┐
│           External Platforms                         │
│  Shopify │ Etsy │ Printify │ Gumroad │ Amazon      │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
fusion-flux-flow/
├── src/
│   ├── pages/              # Route components
│   │   ├── DashboardPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── StoresPage.tsx
│   │   ├── PluginsPage.tsx
│   │   ├── JobsPage.tsx
│   │   └── ApprovalsPage.tsx
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # shadcn components
│   │   ├── layout/        # Layout components
│   │   └── settings/      # Settings components
│   ├── contexts/          # React contexts (Auth)
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # Supabase client
│   ├── lib/               # Utilities
│   └── types/             # TypeScript types
├── supabase/
│   ├── migrations/        # Database migrations
│   └── functions/         # Edge functions (TODO)
├── public/                # Static assets
└── [config files]         # Vite, TypeScript, Tailwind, etc.
```

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ (use nvm: `nvm use 18`)
- npm or bun
- Supabase account (free tier is fine)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd fusion-flux-flow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database migrations
# (Go to Supabase dashboard > SQL Editor > run migrations)

# Start development server
npm run dev
```

Visit http://localhost:8080

### First-Time Setup

1. **Create Account**: Sign up through the auth page
2. **Create Organization**: First-time users will be prompted
3. **Connect a Store**: Add your first store connection
4. **Install Plugins**: Install plugins for your platforms
5. **Add Products**: Start building your product catalog

---

## 🔑 Key Concepts

### Organizations
- Multi-tenant isolation unit
- Each org has members with roles: **owner**, **operator**, **viewer**
- All data scoped to organizations via RLS

### Stores
- Connected e-commerce platform instances
- Contains encrypted credentials
- Can be active/inactive
- Linked to specific plugins

### Plugins
- Platform connectors (e.g., Shopify Plugin, Etsy Plugin)
- Each plugin has a **capability contract**
- Defines what the plugin can do (native/workaround/unsupported)

### Plugin Capability Matrix
- **Native**: Full API support, automatic sync
- **Workaround**: Partial support, requires staging/approval
- **Unsupported**: Not possible via API, blocked with explanation

### Jobs
- Asynchronous background tasks
- Statuses: pending → claimed → running → completed/failed
- Includes retry logic and error tracking

### Approvals
- Human-in-the-loop workflow gates
- Required for workaround capabilities
- Prevents automated actions where APIs don't support them

---

## 🧪 Development Workflow

### Making Changes

```bash
# Create a feature branch
git checkout -b feature/your-feature

# Make changes, test locally
npm run dev

# Lint your code
npm run lint

# Build to verify
npm run build

# Commit and push
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature
```

### Adding a New Page

1. Create page component in `src/pages/YourPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/layout/AppLayout.tsx`
4. Update type definitions if needed

### Adding a New Database Table

1. Create migration SQL in `supabase/migrations/`
2. Include RLS policies
3. Update `src/types/database.ts` with new types
4. Test with Supabase local development (optional)

### Adding a New Plugin

1. Insert plugin record in `plugins` table
2. Define capability contracts in `plugin_contracts` table
3. Update UI to display plugin (automatic if following schema)
4. Implement Edge Function for API integration

---

## 🔒 Security Best Practices

### DO ✅
- Always use RLS policies for data access
- Encrypt sensitive data (credentials, tokens)
- Validate all user inputs with Zod
- Use prepared statements (Supabase does this)
- Sanitize displayed user data
- Log security events

### DON'T ❌
- Never expose API keys in client code
- Never store credentials in plain text
- Never skip input validation
- Never trust client-side data
- Never commit secrets to git
- Never disable RLS policies

---

## 📚 Common Tasks

### Check Database Connection
```typescript
const { data, error } = await supabase.from('orgs').select('count');
console.log('DB connected:', !error);
```

### Query with RLS
```typescript
// RLS automatically filters by user's accessible orgs
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('org_id', currentOrg.id);
```

### Real-time Subscriptions
```typescript
const channel = supabase
  .channel('table-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'jobs' },
    (payload) => console.log('Change:', payload)
  )
  .subscribe();

// Don't forget to cleanup
return () => supabase.removeChannel(channel);
```

### Error Handling
```typescript
try {
  const { data, error } = await supabase.from('stores').insert(newStore);
  if (error) throw error;
  toast.success('Store created!');
} catch (error) {
  toast.error('Failed to create store: ' + error.message);
  console.error('Store creation error:', error);
}
```

---

## 🐛 Troubleshooting

### Common Issues

**"Row level security policy violation"**
- Check that the user has access to the org
- Verify RLS policies in database
- Check `has_org_access()` function

**"Failed to fetch"**
- Check Supabase URL and keys in .env
- Verify internet connection
- Check Supabase service status

**"Credentials invalid"**
- Store credentials may be malformed
- Check credential schema for platform
- Re-connect the store

**Page not loading**
- Check browser console for errors
- Verify route is defined in App.tsx
- Check for missing imports

### Debug Mode

```typescript
// Enable Supabase debug logging
const supabase = createClient(url, key, {
  auth: { debug: true }
});

// React Query DevTools (add to App.tsx)
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// Add <ReactQueryDevtools /> to component tree
```

---

## 🧪 Testing (TODO - Coming in Phase 1)

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

---

## 📊 Monitoring

### Supabase Dashboard
- Database: Tables, indexes, query performance
- Auth: User signups, sessions
- Storage: File uploads
- Logs: Edge function logs, errors

### Application Metrics
- User signups and activation
- Store connections
- Job success/failure rates
- Approval turnaround time

---

## 🆘 Getting Help

### Resources
- **Full Audit**: See `AUDIT_AND_ROADMAP.md`
- **Supabase Docs**: https://supabase.com/docs
- **React Query**: https://tanstack.com/query
- **shadcn/ui**: https://ui.shadcn.com

### Team Communication
- **Bug Reports**: GitHub Issues
- **Questions**: Team Slack/Discord
- **Feature Requests**: Product board

---

## 📈 Next Steps

1. Read the full `AUDIT_AND_ROADMAP.md` for complete context
2. Set up your local development environment
3. Explore the codebase by feature (start with Dashboard)
4. Pick a task from the roadmap
5. Submit your first PR!

---

**Welcome to the team! 🎉**

