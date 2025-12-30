import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Org, OrgMember, OrgRole } from '@/types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  orgs: Org[];
  currentOrg: Org | null;
  currentOrgRole: OrgRole | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    orgs: [],
    currentOrg: null,
    currentOrgRole: null,
    isLoading: true,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setState(prev => ({
            ...prev,
            profile: null,
            orgs: [],
            currentOrg: null,
            currentOrgRole: null,
            isLoading: false,
          }));
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Fetch org memberships
      const { data: memberships } = await supabase
        .from('org_members')
        .select('*, orgs(*)')
        .eq('user_id', userId);

      const orgs = memberships?.map(m => (m as any).orgs as Org).filter(Boolean) ?? [];
      const currentOrg = orgs[0] ?? null;
      const currentMembership = memberships?.find(m => (m as any).orgs?.id === currentOrg?.id);
      const currentOrgRole = (currentMembership?.role as OrgRole) ?? null;

      setState(prev => ({
        ...prev,
        profile: profile as Profile | null,
        orgs,
        currentOrg,
        currentOrgRole,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching user data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const setCurrentOrg = (org: Org) => {
    const membership = state.orgs.find(o => o.id === org.id);
    setState(prev => ({
      ...prev,
      currentOrg: org,
      currentOrgRole: membership ? prev.currentOrgRole : null,
    }));
  };

  const createOrg = async (name: string, slug: string) => {
    if (!state.user) return { error: new Error('Not authenticated') };

    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .insert({ name, slug })
      .select()
      .single();

    if (orgError) return { error: orgError };

    // Add user as owner
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: state.user.id,
        role: 'owner',
      });

    if (memberError) return { error: memberError };

    // Refresh orgs
    await fetchUserData(state.user.id);
    return { data: org, error: null };
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    setCurrentOrg,
    createOrg,
    isAuthenticated: !!state.user,
    canOperate: state.currentOrgRole === 'owner' || state.currentOrgRole === 'operator',
    isOwner: state.currentOrgRole === 'owner',
  };
}
