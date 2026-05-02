import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isConfigured } from '../db/supabase.js';
import { sb } from '../db/supabase.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const listenerRef = useRef(null); // store subscription for cleanup

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4000);

    const init = async () => {
      try {
        if (isConfigured()) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            setUser(data.session.user);
            const { data: prof } = await sb(s =>
              s.from('company_profiles').select('*')
               .eq('user_id', data.session.user.id)
               .maybeSingle()
            );
            if (prof) setProfile(prof);
          }

          // Store subscription so we can unsubscribe cleanly
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
              if (session?.user) {
                setUser(session.user);
                const { data: prof } = await sb(s =>
                  s.from('company_profiles').select('*')
                   .eq('user_id', session.user.id)
                   .maybeSingle()
                );
                setProfile(prof || null);
              } else {
                setUser(null);
                setProfile(null);
              }
            }
          );
          listenerRef.current = subscription;
        }
      } catch (err) {
        console.warn('Auth init error:', err);
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    };

    init();
    return () => {
      clearTimeout(timer);
      listenerRef.current?.unsubscribe();
    };
  }, []);

  const signUp = async ({ email, password }) => {
    if (isConfigured()) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      return { user: data?.user || null, error };
    }
    const fakeUser = { id: `demo_${Date.now()}`, email };
    setUser(fakeUser);
    return { user: fakeUser, error: null };
  };

  const signIn = async ({ email, password }) => {
    if (!email?.trim())      return { user: null, error: { message: 'Enter your email' } };
    if (!password)           return { user: null, error: { message: 'Enter your password' } };
    if (password.length < 6) return { user: null, error: { message: 'Password must be 6+ characters' } };

    if (isConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (data?.user) {
        setUser(data.user);
        const { data: prof } = await sb(s =>
          s.from('company_profiles').select('*')
           .eq('user_id', data.user.id)
           .maybeSingle()
        );
        setProfile(prof || null);
      }
      return { user: data?.user || null, error };
    }

    // Demo mode
    const fakeUser = { id: `demo_${Date.now()}`, email: email.trim() };
    setUser(fakeUser);
    try {
      const saved = localStorage.getItem('udie_profile');
      if (saved) {
        const prof = JSON.parse(saved);
        if (prof?.company_name) setProfile(prof);
      }
    } catch {}
    return { user: fakeUser, error: null };
  };

  const signOut = async () => {
    // Unsubscribe listener FIRST so it doesn't re-fire after we clear state
    listenerRef.current?.unsubscribe();
    listenerRef.current = null;

    try {
      if (isConfigured()) {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise(resolve => setTimeout(resolve, 3000)), // 3s timeout
        ]);
      }
    } catch {}

    // Always clear state regardless of Supabase response
    setUser(null);
    setProfile(null);
    try { localStorage.removeItem('udie_profile'); } catch {}
  };

  const saveProfile = async (profileData) => {
    const uid = user?.id;
    if (!uid) throw new Error('Not logged in');
    const rec = { ...profileData, user_id: uid, updated_at: new Date().toISOString() };
    try { localStorage.setItem('udie_profile', JSON.stringify(rec)); } catch {}
    if (isConfigured()) {
      try { await sb(s => s.from('company_profiles').upsert(rec, { onConflict: 'user_id' })); } catch {}
    }
    setProfile(rec);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, profile, signUp, signIn, signOut, saveProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
