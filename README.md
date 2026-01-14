# FlashFusion E-commerce Hub

**Multi-tenant operations platform for managing products across multiple e-commerce platforms**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)

---

## 📖 Documentation

**📊 START HERE: [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)** - 5-minute overview for decision makers

**For new team members and contributors:**

- 📋 **[AUDIT_AND_ROADMAP.md](./AUDIT_AND_ROADMAP.md)** - Comprehensive audit and 3-month product roadmap
- 🚀 **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)** - Quick start guide for developers
- 🔒 **[SECURITY.md](./SECURITY.md)** - Security recommendations and implementation guide
- ✅ **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Production deployment checklist
- 🤝 **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines and code standards

---

## 🎯 What is FlashFusion?

FlashFusion is a sophisticated multi-tenant e-commerce operations hub that helps businesses:

- 📦 Manage products and inventory from a single interface
- 🔌 Connect to multiple platforms (Shopify, Etsy, Printify, Gumroad, Amazon)
- 🔄 Sync product data across platforms
- ✅ Handle platform-specific limitations with approval workflows
- 📊 Track jobs, approvals, and operations in real-time

**Key Innovation**: Capability Matrix system that explicitly handles platform limitations:
- ✅ **Native**: Full API support, automatic sync
- ⚠️ **Workaround**: Partial support, requires staging/approval
- ❌ **Unsupported**: Not possible via API, blocked with explanation

---

## 🏗️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing fast builds
- **shadcn/ui** + **Radix UI** for accessible components
- **Tailwind CSS** for styling
- **React Query** for data fetching and caching
- **React Router** for navigation

### Backend
- **Supabase** (PostgreSQL + Auth + Storage + Edge Functions)
- **Row-Level Security (RLS)** for multi-tenant data isolation
- **Real-time subscriptions** for live updates

### Development
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** (recommended) for formatting

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or bun
- Supabase account (free tier is fine for development)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd fusion-flux-flow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials from https://app.supabase.com

# Start development server
npm run dev
```

Visit http://localhost:8080

### Database Setup

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to SQL Editor
3. Run the migration files from `supabase/migrations/` in order
4. Verify tables are created with RLS enabled

---

## 📁 Project Structure

```
fusion-flux-flow/
├── src/
│   ├── pages/              # Route components
│   ├── components/         # Reusable UI components
│   ├── contexts/          # React contexts (Auth)
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # Supabase client
│   ├── lib/               # Utilities
│   └── types/             # TypeScript types
├── supabase/
│   ├── migrations/        # Database migrations
│   └── functions/         # Edge functions
├── public/                # Static assets
└── [config files]         # Vite, TypeScript, Tailwind, etc.
```

---

## 🛠️ Development Scripts

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🔑 Key Features

### Multi-tenancy
- Organization-based access control
- Role-based permissions (owner, operator, viewer)
- Complete data isolation with RLS

### Store Management
- Connect multiple e-commerce platforms
- Secure credential storage (encryption required - see SECURITY.md)
- Platform-specific configuration

### Product Catalog
- Centralized product management
- Variant support
- SKU tracking
- Inventory management

### Plugin System
- Platform connectors (Shopify, Etsy, etc.)
- Capability matrix for each plugin
- Native, workaround, and unsupported categorization

### Job Queue
- Asynchronous background tasks
- Retry logic with exponential backoff
- Real-time status tracking

### Approval Workflows
- Human-in-the-loop for sensitive operations
- Required for platform workarounds
- Audit trail for all decisions

---

## 🔒 Security

**⚠️ IMPORTANT: This application is NOT production-ready in its current state.**

Critical security items that MUST be implemented before production:
- [ ] Encrypt store credentials using Supabase Vault
- [ ] Rotate and secure all environment variables
- [ ] Implement rate limiting
- [ ] Add comprehensive input validation
- [ ] Set up error tracking and monitoring

See **[SECURITY.md](./SECURITY.md)** for detailed security recommendations and implementation guides.

---

## 📊 Current Status

**Maturity Level**: Early Alpha (40% production-ready)

See **[AUDIT_AND_ROADMAP.md](./AUDIT_AND_ROADMAP.md)** for:
- Complete feature audit
- Identified gaps and technical debt
- 3-month roadmap to production
- Risk assessment and mitigation strategies

---

## 🧪 Testing (Coming Soon)

Testing infrastructure is planned for Phase 1 of the roadmap:
- Unit tests with Vitest
- Integration tests with React Testing Library
- E2E tests with Playwright
- Target: 70%+ code coverage

---

## 🚀 Deployment

See **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** for the complete pre-production checklist.

**Quick deployment steps:**
1. Complete all critical security fixes
2. Set up production Supabase project
3. Configure environment variables
4. Run database migrations
5. Build and deploy frontend
6. Set up monitoring and alerts

---

## 🤝 Contributing

1. Read the **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)**
2. Check the **[AUDIT_AND_ROADMAP.md](./AUDIT_AND_ROADMAP.md)** for current priorities
3. Create a feature branch
4. Make your changes with tests
5. Submit a pull request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Support

- **Documentation**: Check the docs in this repository
- **Issues**: GitHub Issues for bug reports
- **Questions**: Team communication channels

---

## 🙏 Acknowledgments

Built with:
- [React](https://reactjs.org/)
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

---

**Last Updated**: January 14, 2026
