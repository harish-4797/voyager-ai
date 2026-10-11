import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { voyager } from '@/api/voyagerClient';
import { isCloud, supabase } from '@/lib/supabase';
import { queryClientInstance } from '@/lib/query-client';

const AuthContext = createContext(null);

/**
 * Auth state for the whole app.
 *  - Cloud mode: Supabase session + the user's profile row.
 *  - Local mode: a single implicit local user (always "signed in").
 */
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [recovery, setRecovery] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await voyager.auth.me());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!isCloud) {
      refreshUser().finally(() => setIsLoadingAuth(false));
      return undefined;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        return data.session ? refreshUser() : setUser(null);
      })
      .finally(() => setIsLoadingAuth(false));

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') queryClientInstance.clear();
      // Supabase advises not awaiting other Supabase calls inside this callback.
      setTimeout(() => (nextSession ? refreshUser() : setUser(null)), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    await voyager.auth.logout();
    setUser(null);
    queryClientInstance.clear();
  }, []);

  const value = {
    isCloud,
    session,
    user,
    isAuthenticated: isCloud ? Boolean(session) : true,
    isLoadingAuth,
    recovery,
    clearRecovery: () => setRecovery(false),
    refreshUser,
    signIn: (email, password) => voyager.auth.signIn(email, password),
    signUp: (email, password, fullName) => voyager.auth.signUp(email, password, fullName),
    resetPassword: (email) => voyager.auth.resetPassword(email),
    updatePassword: (password) => voyager.auth.updatePassword(password),
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
