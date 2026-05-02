import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isConfigured } from '../db/supabase.js';
import { sb } from '../db/supabase.js';

const AuthCtx = createContext(null);

// ── Fetch company profile for a given userId ──────────────────────────────────
async function fetchProfile(userId) {
  if (!userId) return null;
  try {
    const { data } = await sb(s =>
      s.from('company_profiles').select('*').eq('user_id', userId).maybeSingle()
    );
    return data || null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const listenerRef = useRef(null);

  useEffect(() => {
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    const init = async () => {
      try {
        if (isConfigured()) {
          // ── SUPABASE MODE ────────────────────────────────────────────────
          // 1. Get existing session (for page refresh)
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            setUser(data.session.user);
            const prof = await fetchProfile(data.session.user.id);
            setProfile(prof);
          }

          // 2. Listen for auth events (sign in / sign out / token refresh)
          //    This is the SINGLE place that updates user+profile on auth change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (session?.user) {
                setUser(session.user);
                // Only fetch profile on actual sign-in events, not every token refresh
                if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                  const prof = await fetchProfile(session.user.id);
                  setProfile(prof);
                }
              } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
              }
            }
          );
          listenerRef.current = subscription;

        } else {
          // ── DEMO MODE ────────────────────────────────────────────────────
          // Never auto-restore user — require explicit login every time
          // But do nothing here — wait for explicit signIn call
        }
      } catch (err) {
        console.warn('Auth init error:', err);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    };

    init();
    return () => {
      clearTimeout(safetyTimer);
      listenerRef.current?.unsubscribe();
    };
  }, []);

  // ── SIGN UP ────────────────────────────────────────────────────────────────
  const signUp = async ({ email, password }) => {
    if (isConfigured()) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      // onAuthStateChange handles setting user + profile
      return { user: data?.user || null, error };
    }
    // Demo: treat same as signIn
    const u = { id: `demo_${Date.now()}`, email };
    setUser(u);
    return { user: u, error: null };
  };

  // ── SIGN IN ────────────────────────────────────────────────────────────────
  const signIn = async ({ email, password }) => {
    if (!email?.trim())      return { user: null, error: { message: 'Enter your email' } };
    if (!password)           return { user: null, error: { message: 'Enter your password' } };
    if (password.length < 6) return { user: null, error: { message: 'Password must be 6+ characters' } };

    if (isConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (error) return { user: null, error };

      // onAuthStateChange (SIGNED_IN event) will fetch & set profile automatically.
      // But to avoid any timing gap where App renders before listener fires,
      // we also set profile here directly.
      if (data?.user) {
        setUser(data.user);
        const prof = await fetchProfile(data.user.id);
        setProfile(prof); // null means no profile yet → Onboarding
      }
      return { user: data?.user || null, error: null };
    }

    // ── DEMO MODE ────────────────────────────────────────────────────────────
    const fakeUser = { id: `demo_${Date.now()}`, email: email.trim() };
    setUser(fakeUser);
    // Restore demo profile from localStorage
    try {
      const saved = localStorage.getItem('udie_profile');
      if (saved) {
        const prof = JSON.parse(saved);
        if (prof?.company_name) setProfile(prof);
      }
    } catch {}
    return { user: fakeUser, error: null };
  };

  // ── SIGN OUT ────────────────────────────────────────────────────────────────
  const signOut = async () => {
    // Pause listener before signout so SIGNED_OUT event doesn't race
    const sub = listenerRef.current;
    listenerRef.current = null;

    try {
      if (isConfigured()) {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise(r => setTimeout(r, 3000)),
        ]);
      }
    } catch {}

    // Clear state
    setUser(null);
    setProfile(null);
    try { localStorage.removeItem('udie_profile'); } catch {}

    // Resubscribe listener after clearing (for future sign-ins)
    // Actually just unsubscribe — a fresh listener is set on next init
    sub?.unsubscribe();
  };

  // ── SAVE PROFILE ────────────────────────────────────────────────────────────
  const saveProfile = async (profileData) => {
    const uid = user?.id;
    if (!uid) throw new Error('Not logged in');

    const rec = {
      ...profileData,
      user_id:    uid,
      updated_at: new Date().toISOString(),
    };

    // Save locally first (instant feedback)
    try { localStorage.setItem('udie_profile', JSON.stringify(rec)); } catch {}

    // Save to Supabase
    if (isConfigured()) {
      try {
        await sb(s => s.from('company_profiles').upsert(rec, { onConflict: 'user_id' }));
      } catch (e) {
        console.warn('Profile save to Supabase failed:', e);
      }
    }

    setProfile(rec); // triggers App to show HomeScreen
  };

  return (
    <AuthCtx.Provider value={{ user, loading, profile, signUp, signIn, signOut, saveProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
