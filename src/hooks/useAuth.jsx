import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isConfigured } from '../db/supabase.js';
import { sb } from '../db/supabase.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety: always resolve within 3 seconds
    const timer = setTimeout(() => setLoading(false), 3000);

    const init = async () => {
      try {
        if (isConfigured()) {
          // ── SUPABASE AUTH ─────────────────────────────────────────
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

          // Listen for auth state changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
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
          });
        }
        // Demo mode: DO NOT auto-restore from localStorage.
        // User must explicitly sign in every time.
        // Profile is restored only AFTER explicit login.
      } catch (err) {
        console.warn('Auth init error:', err);
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    };

    init();
    return () => clearTimeout(timer);
  }, []);

  // ── SIGN UP ───────────────────────────────────────────────────────────────
  const signUp = async ({ email, password }) => {
    if (isConfigured()) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      return { user: data?.user || null, error };
    }
    // Demo: treat signup same as signin
    const fakeUser = { id: `demo_${Date.now()}`, email };
    setUser(fakeUser);
    return { user: fakeUser, error: null };
  };

  // ── SIGN IN ───────────────────────────────────────────────────────────────
  const signIn = async ({ email, password }) => {
    if (!email?.trim())  return { user: null, error: { message: 'Enter your email' } };
    if (!password)       return { user: null, error: { message: 'Enter your password' } };
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

    // Demo mode: accept any valid-looking credentials
    const fakeUser = { id: `demo_${Date.now()}`, email: email.trim() };
    setUser(fakeUser);

    // Restore profile from localStorage if it exists from a prior session
    try {
      const saved = localStorage.getItem('udie_profile');
      if (saved) {
        const prof = JSON.parse(saved);
        // Only restore if it seems valid
        if (prof?.company_name) setProfile(prof);
      }
    } catch {}

    return { user: fakeUser, error: null };
  };

  // ── SIGN OUT ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    if (isConfigured()) await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setProfile(null);
    try { localStorage.removeItem('udie_profile'); } catch {}
  };

  // ── SAVE PROFILE ──────────────────────────────────────────────────────────
  const saveProfile = async (profileData) => {
    const uid = user?.id;
    if (!uid) throw new Error('Not logged in');

    const rec = { ...profileData, user_id: uid, updated_at: new Date().toISOString() };

    // Always save to localStorage first (instant, reliable)
    try { localStorage.setItem('udie_profile', JSON.stringify(rec)); } catch {}

    // Then try Supabase if configured
    if (isConfigured()) {
      try {
        await sb(s => s.from('company_profiles').upsert(rec, { onConflict: 'user_id' }));
      } catch (err) {
        console.warn('Supabase profile save failed (localStorage backup used):', err);
      }
    }

    // Update context — this triggers App.jsx to show HomeScreen
    setProfile(rec);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, profile, signUp, signIn, signOut, saveProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
