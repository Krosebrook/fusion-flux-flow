-- FlashFusion E-commerce Operations Hub Schema
-- Enums
CREATE TYPE public.org_role AS ENUM ('owner', 'operator', 'viewer');
CREATE TYPE public.job_status AS ENUM ('pending', 'claimed', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.capability_level AS ENUM ('native', 'workaround', 'unsupported');
CREATE TYPE public.settings_scope AS ENUM ('global', 'org', 'store', 'plugin_instance', 'workflow');
CREATE TYPE public.soc2_tag AS ENUM ('access', 'change', 'availability', 'confidentiality', 'processing_integrity');

-- Organizations
CREATE TABLE public.orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization Members with roles (separate from profiles for security)
CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Profiles (basic user info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stores (connected platforms)
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  external_id TEXT,
  credentials JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plugins (platform connectors)
CREATE TABLE public.plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plugin Contracts (capability matrix)
CREATE TABLE public.plugin_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  level capability_level NOT NULL,
  description TEXT,
  constraints JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plugin_id, capability)
);

-- Plugin Instances (installed plugins per org)
CREATE TABLE public.plugin_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, plugin_id, store_id)
);

-- Settings Definitions (JSON Schema based)
CREATE TABLE public.settings_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  scope settings_scope NOT NULL,
  schema JSONB NOT NULL,
  default_value JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings Values (versioned)
CREATE TABLE public.settings_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID NOT NULL REFERENCES public.settings_definitions(id) ON DELETE CASCADE,
  scope settings_scope NOT NULL,
  scope_id UUID,
  value JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Variants
CREATE TABLE public.variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sku TEXT,
  price DECIMAL(10,2),
  inventory_quantity INTEGER DEFAULT 0,
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Listings (product on specific store)
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  external_id TEXT,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, store_id)
);

-- Media Assets
CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  filename TEXT,
  content_type TEXT,
  size_bytes INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Approvals (HITL workflow)
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  payload JSONB DEFAULT '{}',
  requested_by UUID REFERENCES auth.users(id),
  decided_by UUID REFERENCES auth.users(id),
  decision_note TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

-- Budgets (circuit breakers)
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget_type TEXT NOT NULL,
  limit_amount DECIMAL(10,2) NOT NULL,
  consumed_amount DECIMAL(10,2) DEFAULT 0,
  period TEXT DEFAULT 'monthly',
  reset_at TIMESTAMPTZ,
  is_frozen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jobs (queue with idempotency)
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  idempotency_key TEXT UNIQUE NOT NULL,
  job_type TEXT NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  payload JSONB DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for job claiming
CREATE INDEX idx_jobs_claimable ON public.jobs (org_id, status, scheduled_at) WHERE status = 'pending';

-- Audit Logs (append-only with SOC2 tags)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  soc2_tags soc2_tag[] DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Make audit_logs append-only
CREATE RULE audit_logs_no_update AS ON UPDATE TO public.audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO public.audit_logs DO INSTEAD NOTHING;

-- Webhook Events (with replay protection)
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  plugin_id UUID REFERENCES public.plugins(id) ON DELETE SET NULL,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_processed BOOLEAN DEFAULT false,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Security definer function to check org membership
CREATE OR REPLACE FUNCTION public.has_org_access(org_id_param UUID, required_role org_role DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = org_id_param
      AND user_id = auth.uid()
      AND (required_role IS NULL OR role = required_role OR role = 'owner')
  )
$$;

-- Function to get user's org role
CREATE OR REPLACE FUNCTION public.get_org_role(org_id_param UUID)
RETURNS org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.org_members
  WHERE org_id = org_id_param AND user_id = auth.uid()
  LIMIT 1
$$;

-- RLS Policies

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Orgs
CREATE POLICY "Members can view their orgs" ON public.orgs FOR SELECT USING (public.has_org_access(id));
CREATE POLICY "Owners can update orgs" ON public.orgs FOR UPDATE USING (public.has_org_access(id, 'owner'));
CREATE POLICY "Authenticated users can create orgs" ON public.orgs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Org Members
CREATE POLICY "Members can view org members" ON public.org_members FOR SELECT USING (public.has_org_access(org_id));
CREATE POLICY "Owners can manage org members" ON public.org_members FOR ALL USING (public.has_org_access(org_id, 'owner'));

-- Stores
CREATE POLICY "Members can view stores" ON public.stores FOR SELECT USING (public.has_org_access(org_id));
CREATE POLICY "Operators can manage stores" ON public.stores FOR ALL USING (public.has_org_access(org_id, 'operator') OR public.has_org_access(org_id, 'owner'));

-- Plugins (public read)
CREATE POLICY "Anyone can view plugins" ON public.plugins FOR SELECT USING (true);

-- Plugin Contracts (public read)
CREATE POLICY "Anyone can view plugin contracts" ON public.plugin_contracts FOR SELECT USING (true);

-- Plugin Instances
CREATE POLICY "Members can view plugin instances" ON public.plugin_instances FOR SELECT USING (public.has_org_access(org_id));
CREATE POLICY "Operators can manage plugin instances" ON public.plugin_instances FOR ALL USING (public.has_org_access(org_id, 'operator') OR public.has_org_access(org_id, 'owner'));

-- Settings Definitions (public read)
CREATE POLICY "Anyone can view settings definitions" ON public.settings_definitions FOR SELECT USING (true);

-- Settings Values
CREATE POLICY "Members can view settings" ON public.settings_values FOR SELECT USING (
  scope = 'global' OR 
  (scope = 'org' AND public.has_org_access(scope_id)) OR
  (scope IN ('store', 'plugin_instance', 'workflow') AND EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = scope_id AND public.has_org_access(s.org_id)
  ))
);
CREATE POLICY "Operators can manage settings" ON public.settings_values FOR ALL USING (
  (scope = 'org' AND (public.has_org_access(scope_id, 'operator') OR public.has_org_access(scope_id, 'owner')))
);

-- Products
CREATE POLICY "Members can view products" ON public.products FOR SELECT USING (public.has_org_access(org_id));
CREATE POLICY "Operators can manage products" ON public.products FOR ALL USING (public.has_org_access(org_id, 'operator') OR public.has_org_access(org_id, 'owner'));

-- Variants
CREATE POLICY "Members can view variants" ON public.variants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_org_access(p.org_id))
);
CREATE POLICY "Operators can manage variants" ON public.variants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (public.has_org_access(p.org_id, 'operator') OR public.has_org_access(p.org_id, 'owner')))
);

-- Listings
CREATE POLICY "Members can view listings" ON public.listings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_org_access(p.org_id))
);
CREATE POLICY "Operators can manage listings" ON public.listings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (public.has_org_access(p.org_id, 'operator') OR public.has_org_access(p.org_id, 'owner')))
);

-- Media Assets
CREATE POLICY "Members can view media" ON public.media_assets FOR SELECT USING (public.has_org_access(org_id));
CREATE POLICY "Operators can manage media" ON public.media_assets FOR ALL USING (public.has_org_access(org_id, 'operator') OR public.has_org_access(org_id, 'owner'));

-- Approvals
CREATE POLICY "Members can view approvals" ON public.approvals FOR SELECT USING (public.has_org_access(org_id));
CREATE POLICY "Operators can manage approvals" ON public.approvals FOR ALL USING (public.has_org_access(org_id, 'operator') OR public.has_org_access(org_id, 'owner'));

-- Budgets
CREATE POLICY "Members can view budgets" ON public.budgets FOR SELECT USING (public.has_org_access(org_id));
CREATE POLICY "Owners can manage budgets" ON public.budgets FOR ALL USING (public.has_org_access(org_id, 'owner'));

-- Jobs
CREATE POLICY "Members can view jobs" ON public.jobs FOR SELECT USING (public.has_org_access(org_id));
CREATE POLICY "Operators can manage jobs" ON public.jobs FOR ALL USING (public.has_org_access(org_id, 'operator') OR public.has_org_access(org_id, 'owner'));

-- Audit Logs
CREATE POLICY "Members can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_org_access(org_id));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Webhook Events
CREATE POLICY "Members can view webhooks" ON public.webhook_events FOR SELECT USING (public.has_org_access(org_id));

-- Claim jobs RPC with FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_due_jobs(org_id_param UUID, claim_limit INTEGER DEFAULT 10)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_jobs public.jobs[];
BEGIN
  -- Check org access
  IF NOT public.has_org_access(org_id_param, 'operator') AND NOT public.has_org_access(org_id_param, 'owner') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Claim jobs with bounded concurrency
  WITH claimed AS (
    SELECT * FROM public.jobs
    WHERE org_id = org_id_param
      AND status = 'pending'
      AND scheduled_at <= now()
      AND attempts < max_attempts
    ORDER BY priority DESC, scheduled_at ASC
    LIMIT claim_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.jobs j
  SET status = 'claimed', claimed_at = now()
  FROM claimed c
  WHERE j.id = c.id
  RETURNING j.*;
  
  RETURN QUERY
  SELECT * FROM public.jobs
  WHERE org_id = org_id_param
    AND status = 'claimed'
    AND claimed_at >= now() - INTERVAL '1 minute';
END;
$$;

-- Trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON public.orgs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_plugin_instances_updated_at BEFORE UPDATE ON public.plugin_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON public.variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();