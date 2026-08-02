import React, { createContext, useContext, useEffect, useState } from 'react';
import { sb } from './supabase.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(false); // false | 'login' | 'signup'

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setReady(true);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = () => sb.auth.signOut();

  return (
    <AuthCtx.Provider value={{ user, ready, modal, openAuth: (m = 'login') => setModal(m), closeAuth: () => setModal(false), logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export const displayName = user =>
  user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email || '').split('@')[0];
