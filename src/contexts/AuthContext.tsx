import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isDevPreviewMode, mockUser, mockProfile, mockOrg, mockOrgRole, mockSession } from '@/hooks/useDevMode';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, Org, OrgRole } from '@/types/database';

interface DevAuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  orgs: Org[];
  currentOrg: Org | null;
  currentOrgRole: OrgRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: 'google') => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setCurrentOrg: (org: Org) => void;
  createOrg: (name: string, slug: string) => Promise<{ data?: { id: string }; error: Error | null }>;
  isAuthenticated: boolean;
  canOperate: boolean;
  isOwner: boolean;
}

type AuthContextType = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthContextType | DevAuthState | null>(null);

// Mock auth functions for dev mode
const mockAuthFunctions = {
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithOAuth: async () => ({ error: null }),
  signInWithMagicLink: async () => ({ error: null }),
  resendVerificationEmail: async () => ({ error: null }),
  signOut: async () => {},
  setCurrentOrg: () => {},
  createOrg: async () => ({ data: { id: 'mock-org-id' }, error: null }),
};

function DevAuthProvider({ children }: { children: ReactNode }) {
  const devAuthState: DevAuthState = {
    user: mockUser as unknown as User,
    session: mockSession as unknown as Session,
    profile: mockProfile,
    orgs: [mockOrg],
    currentOrg: mockOrg,
    currentOrgRole: mockOrgRole,
    isLoading: false,
    isAuthenticated: true,
    canOperate: true,
    isOwner: true,
    ...mockAuthFunctions,
  };

  return <AuthContext.Provider value={devAuthState}>{children}</AuthContext.Provider>;
}

function RealAuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use dev auth provider in preview mode
  if (isDevPreviewMode()) {
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }
  
  return <RealAuthProvider>{children}</RealAuthProvider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
