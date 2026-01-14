# 🔒 Security Recommendations & Implementation Guide

**FlashFusion E-commerce Hub**  
**Severity Levels**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Executive Summary

This document outlines security vulnerabilities identified in the FlashFusion codebase and provides actionable remediation steps. **Critical issues must be addressed before handling any real user data.**

**Current Security Status**: ⚠️ NOT PRODUCTION READY

---

## 🔴 CRITICAL VULNERABILITIES

### 1. Unencrypted Credential Storage

**Issue**: E-commerce store credentials (API keys, tokens, secrets) are stored as plain text in JSONB fields.

**Location**: `stores` table, `credentials` column

**Risk**: Complete compromise of all connected stores if database is breached

**Impact**: 
- Unauthorized access to user's Shopify, Etsy, Amazon accounts
- Financial fraud
- Data theft
- Reputation damage
- Legal liability

**Remediation**:

#### Step 1: Set Up Supabase Vault

```sql
-- Enable Vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Create secrets table (done automatically by Vault)
-- Verify it exists
SELECT * FROM vault.secrets LIMIT 1;
```

#### Step 2: Create Credential Encryption Functions

```sql
-- Function to store encrypted credential
CREATE OR REPLACE FUNCTION store_encrypted_credential(
  store_id_param UUID,
  credential_key TEXT,
  credential_value TEXT
) RETURNS UUID AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Store in Vault
  INSERT INTO vault.secrets (name, secret)
  VALUES (
    format('store_%s_%s', store_id_param, credential_key),
    credential_value
  )
  RETURNING id INTO secret_id;
  
  RETURN secret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retrieve decrypted credential
CREATE OR REPLACE FUNCTION get_decrypted_credential(
  secret_id_param UUID
) RETURNS TEXT AS $$
DECLARE
  credential TEXT;
BEGIN
  SELECT decrypted_secret INTO credential
  FROM vault.decrypted_secrets
  WHERE id = secret_id_param;
  
  RETURN credential;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke direct access to vault from users
REVOKE ALL ON vault.secrets FROM PUBLIC;
REVOKE ALL ON vault.decrypted_secrets FROM PUBLIC;
```

#### Step 3: Update Stores Schema

```sql
-- Add encrypted credentials reference
ALTER TABLE stores 
ADD COLUMN credential_vault_ids JSONB DEFAULT '{}';

-- Example structure:
-- {
--   "api_key": "uuid-reference-to-vault",
--   "api_secret": "uuid-reference-to-vault",
--   "access_token": "uuid-reference-to-vault"
-- }

-- Deprecate old credentials field (keep for migration)
ALTER TABLE stores 
RENAME COLUMN credentials TO credentials_deprecated;
```

#### Step 4: Update Application Code

```typescript
// src/lib/vault.ts
import { supabase } from '@/integrations/supabase/client';

export async function storeCredential(
  storeId: string,
  key: string,
  value: string
): Promise<string> {
  const { data, error } = await supabase.rpc('store_encrypted_credential', {
    store_id_param: storeId,
    credential_key: key,
    credential_value: value,
  });
  
  if (error) throw error;
  return data; // Returns vault secret ID
}

export async function getCredential(secretId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_decrypted_credential', {
    secret_id_param: secretId,
  });
  
  if (error) throw error;
  return data;
}

// Update StoresPage.tsx
const handleSaveStore = async () => {
  // ... existing validation ...
  
  const credentialVaultIds: Record<string, string> = {};
  
  for (const field of platformInfo.fields) {
    if (formData[field.key]) {
      const vaultId = await storeCredential(
        newStoreId,
        field.key,
        formData[field.key]
      );
      credentialVaultIds[field.key] = vaultId;
    }
  }
  
  await supabase.from('stores').insert({
    org_id: currentOrg.id,
    name: formData.name,
    platform: selectedPlatform,
    credential_vault_ids: credentialVaultIds,
    // ... rest of fields
  });
};
```

#### Step 5: Migration Script

```sql
-- Migration: Move existing credentials to vault
DO $$
DECLARE
  store_record RECORD;
  cred_key TEXT;
  cred_value TEXT;
  vault_id UUID;
  vault_ids JSONB := '{}';
BEGIN
  FOR store_record IN 
    SELECT id, credentials_deprecated 
    FROM stores 
    WHERE credentials_deprecated IS NOT NULL
  LOOP
    vault_ids := '{}';
    
    -- Iterate over credential keys
    FOR cred_key, cred_value IN 
      SELECT key, value 
      FROM jsonb_each_text(store_record.credentials_deprecated)
    LOOP
      -- Store in vault
      SELECT store_encrypted_credential(
        store_record.id, 
        cred_key, 
        cred_value
      ) INTO vault_id;
      
      -- Build reference map
      vault_ids := jsonb_set(
        vault_ids, 
        ARRAY[cred_key], 
        to_jsonb(vault_id::text)
      );
    END LOOP;
    
    -- Update store with vault references
    UPDATE stores 
    SET credential_vault_ids = vault_ids 
    WHERE id = store_record.id;
  END LOOP;
END $$;

-- Verify migration
SELECT 
  id, 
  name, 
  credentials_deprecated IS NOT NULL as has_old,
  credential_vault_ids IS NOT NULL as has_new
FROM stores;

-- After verification, drop old column
-- ALTER TABLE stores DROP COLUMN credentials_deprecated;
```

**Timeline**: 2-3 days  
**Priority**: MUST DO BEFORE ANY PRODUCTION DATA

---

### 2. Environment Variable Exposure

**Issue**: `.env` file with real Supabase keys is committed to repository

**Location**: `.env` file in repository root

**Risk**: Anyone with access to the repository can access the database

**Impact**:
- Unauthorized database access
- Data breach
- Service manipulation

**Remediation**:

#### Step 1: Remove from Git History

```bash
# Install BFG Repo-Cleaner
# macOS: brew install bfg
# Or download from https://rtyley.github.io/bfg-repo-cleaner/

# Backup your repo first!
cd ..
cp -r fusion-flux-flow fusion-flux-flow-backup

cd fusion-flux-flow

# Remove .env from history
bfg --delete-files .env

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (coordinate with team!)
git push --force
```

#### Step 2: Rotate All Keys

1. Go to Supabase Dashboard > Settings > API
2. Generate new anon/public key
3. Generate new service_role key (if used)
4. Update all environments with new keys

#### Step 3: Set Up Proper Environment Management

```bash
# Create .env.example (commit this)
cat > .env.example << 'EOF'
# Supabase Configuration
VITE_SUPABASE_PROJECT_ID=your_project_id_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here

# Optional: Add other environment-specific config
# VITE_API_URL=
# VITE_ENVIRONMENT=development
EOF

# Ensure .env is in .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

#### Step 4: Document Setup Process

Update README.md:
```markdown
## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Get your Supabase credentials from [Supabase Dashboard](https://app.supabase.com)

3. Fill in your `.env` file with the actual values

4. Never commit `.env` to git
```

**Timeline**: 1 day  
**Priority**: IMMEDIATE

---

### 3. No Rate Limiting

**Issue**: No rate limiting on API endpoints or Supabase queries

**Risk**: 
- Denial of service attacks
- Resource exhaustion
- Platform API ban (Shopify, Etsy rate limits)
- Unexpected costs

**Remediation**:

#### Step 1: Implement Supabase Edge Function Rate Limiting

```typescript
// supabase/functions/_shared/rateLimit.ts
import { createClient } from '@supabase/supabase-js';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'default': { maxRequests: 100, windowMs: 60000 }, // 100 req/min
  'sync': { maxRequests: 10, windowMs: 60000 },     // 10 req/min for expensive ops
  'auth': { maxRequests: 5, windowMs: 60000 },      // 5 req/min for auth
};

export async function checkRateLimit(
  userId: string,
  operation: string = 'default'
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = RATE_LIMITS[operation] || RATE_LIMITS.default;
  const key = `ratelimit:${userId}:${operation}`;
  const now = Date.now();
  
  // Use Supabase as rate limit store
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Get recent requests
  const { data: requests } = await supabase
    .from('rate_limits')
    .select('timestamp')
    .eq('key', key)
    .gte('timestamp', new Date(now - config.windowMs).toISOString())
    .order('timestamp', { ascending: false });
  
  const requestCount = requests?.length || 0;
  
  if (requestCount >= config.maxRequests) {
    const oldestRequest = requests![config.maxRequests - 1];
    const retryAfter = new Date(oldestRequest.timestamp).getTime() + config.windowMs - now;
    return { allowed: false, retryAfter: Math.ceil(retryAfter / 1000) };
  }
  
  // Log this request
  await supabase.from('rate_limits').insert({
    key,
    timestamp: new Date().toISOString(),
  });
  
  return { allowed: true };
}

// Create rate_limits table
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_key_timestamp ON rate_limits(key, timestamp);

-- Clean up old entries periodically
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE timestamp < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;
```

#### Step 2: Client-Side Request Debouncing

```typescript
// src/hooks/useDebounce.ts
import { useCallback, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

// Usage in components
const debouncedSearch = useDebounce((query: string) => {
  // Perform search
}, 500);
```

#### Step 3: Request Throttling

```typescript
// src/lib/requestThrottle.ts
class RequestThrottle {
  private queue: Array<() => Promise<any>> = [];
  private activeRequests = 0;
  private maxConcurrent = 5;

  async execute<T>(request: () => Promise<T>): Promise<T> {
    if (this.activeRequests >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve as any));
    }
    
    this.activeRequests++;
    try {
      return await request();
    } finally {
      this.activeRequests--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

export const requestThrottle = new RequestThrottle();

// Usage
const data = await requestThrottle.execute(() => 
  supabase.from('products').select('*')
);
```

**Timeline**: 2 days  
**Priority**: HIGH (before beta users)

---

## 🟠 HIGH PRIORITY

### 4. Input Validation

**Issue**: Forms use basic HTML validation only

**Risk**: Business logic bypass, data corruption, XSS

**Remediation**:

```typescript
// src/schemas/store.schema.ts
import { z } from 'zod';

export const storeCredentialsSchema = z.object({
  shopify: z.object({
    shop_domain: z.string().regex(/^[a-z0-9-]+\.myshopify\.com$/, 'Invalid Shopify domain'),
    api_key: z.string().min(32),
    api_secret: z.string().min(32),
    access_token: z.string().min(32),
    webhook_secret: z.string().optional(),
  }),
  etsy: z.object({
    shop_id: z.string().regex(/^\d+$/, 'Must be numeric'),
    api_key: z.string().min(20),
    api_secret: z.string().min(20),
    access_token: z.string().min(20),
  }),
  // ... other platforms
});

// Update form handling in StoresPage.tsx
import { storeCredentialsSchema } from '@/schemas/store.schema';

const handleSaveStore = async () => {
  try {
    // Validate
    const schema = storeCredentialsSchema[selectedPlatform];
    const validated = schema.parse(formData);
    
    // Proceed with validated data
    // ...
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        toast.error(`${err.path.join('.')}: ${err.message}`);
      });
    }
  }
};
```

**Timeline**: 2 days  
**Priority**: HIGH (before handling real data)

---

### 5. XSS Prevention

**Issue**: User-generated content displayed without sanitization

**Remediation**:

```bash
npm install dompurify
npm install -D @types/dompurify
```

```typescript
// src/lib/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}

// Usage
<div dangerouslySetInnerHTML={{ 
  __html: sanitizeHtml(product.description) 
}} />
```

---

## 🟡 MEDIUM PRIORITY

### 6. Audit Logging

Create comprehensive audit trail for compliance:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES orgs(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
```

---

### 7. Content Security Policy

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust for production
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https://*.supabase.co",
        "frame-ancestors 'none'",
      ].join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
});
```

---

## 🔒 Security Checklist

### Before Beta Launch
- [ ] Credentials encrypted with Vault
- [ ] Environment variables rotated and secured
- [ ] Rate limiting implemented
- [ ] Input validation with Zod on all forms
- [ ] XSS prevention implemented
- [ ] Error boundaries preventing information leakage
- [ ] HTTPS enforced everywhere
- [ ] Supabase RLS policies reviewed and tested
- [ ] Dependencies vulnerability scan (npm audit)
- [ ] Secrets not in git history

### Before Production Launch
- [ ] Penetration testing completed
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] Incident response plan documented
- [ ] Security monitoring configured (Sentry)
- [ ] Backup and disaster recovery tested
- [ ] GDPR/CCPA compliance verified
- [ ] Privacy policy and terms published
- [ ] Data retention policies implemented
- [ ] Third-party security review (if budget allows)

---

## 📚 Security Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Supabase Security**: https://supabase.com/docs/guides/platform/security
- **React Security**: https://snyk.io/blog/10-react-security-best-practices/
- **TypeScript Security**: https://cheatsheetseries.owasp.org/cheatsheets/TypeScript_Security_Cheat_Sheet.html

---

**Last Updated**: January 14, 2026  
**Next Review**: After implementing critical fixes

