// FlashFusion Database Types
export type OrgRole = 'owner' | 'operator' | 'viewer';
export type JobStatus = 'pending' | 'claimed' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type CapabilityLevel = 'native' | 'workaround' | 'unsupported';
export type SettingsScope = 'global' | 'org' | 'store' | 'plugin_instance' | 'workflow';
export type Soc2Tag = 'access' | 'change' | 'availability' | 'confidentiality' | 'processing_integrity';

export interface Org {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  org_id: string;
  name: string;
  platform: string;
  external_id: string | null;
  credentials: Record<string, unknown>;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plugin {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  version: string;
  icon_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PluginContract {
  id: string;
  plugin_id: string;
  capability: string;
  level: CapabilityLevel;
  description: string | null;
  constraints: Record<string, unknown>;
  created_at: string;
}

export interface PluginInstance {
  id: string;
  org_id: string;
  plugin_id: string;
  store_id: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  sku: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Variant {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  price: number | null;
  inventory_quantity: number;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  product_id: string;
  store_id: string;
  external_id: string | null;
  status: string;
  published_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  org_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  status: ApprovalStatus;
  payload: Record<string, unknown>;
  requested_by: string | null;
  decided_by: string | null;
  decision_note: string | null;
  expires_at: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface Budget {
  id: string;
  org_id: string;
  name: string;
  budget_type: string;
  limit_amount: number;
  consumed_amount: number;
  period: string;
  reset_at: string | null;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  org_id: string;
  idempotency_key: string;
  job_type: string;
  status: JobStatus;
  priority: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  claimed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  soc2_tags: Soc2Tag[];
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  org_id: string | null;
  plugin_id: string | null;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  signature: string | null;
  is_verified: boolean;
  is_processed: boolean;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
}

// Extended types with relations
export interface PluginWithContracts extends Plugin {
  plugin_contracts: PluginContract[];
}

export interface StoreWithPlugin extends Store {
  plugin_instances?: PluginInstance[];
}
