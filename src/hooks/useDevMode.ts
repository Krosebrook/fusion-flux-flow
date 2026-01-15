/**
 * Development Preview Mode
 * 
 * Enables viewing all pages in the editor without authentication.
 * Uses mock data for the current organization and user.
 * 
 * Enable by setting VITE_DEV_PREVIEW_MODE=true in development
 */

import type { Profile, Org, OrgRole } from '@/types/database';

// Check if dev preview mode is enabled
export const isDevPreviewMode = (): boolean => {
  // Only allow in development environment
  if (!import.meta.env.DEV) return false;
  
  // Check for explicit dev preview mode flag
  if (import.meta.env.VITE_DEV_PREVIEW_MODE === 'true') return true;
  
  // Auto-enable in Lovable preview environment
  const hostname = window.location.hostname;
  if (hostname.includes('preview') && hostname.includes('lovable.app')) {
    return true;
  }
  
  return false;
};

// Mock user data for development
export const mockUser = {
  id: 'dev-user-001',
  email: 'developer@flashfusion.dev',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  aud: 'authenticated',
  role: 'authenticated',
};

export const mockProfile: Profile = {
  id: 'dev-user-001',
  email: 'developer@flashfusion.dev',
  full_name: 'Dev User',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockOrg: Org = {
  id: 'dev-org-001',
  name: 'Development Organization',
  slug: 'dev-org',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockOrgRole: OrgRole = 'owner';

export const mockSession = {
  access_token: 'dev-access-token',
  refresh_token: 'dev-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};
