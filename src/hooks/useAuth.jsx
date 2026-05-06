import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isConfigured } from '../db/supabase.js';
import { sb } from '../db/supabase.js';
import { loadInsightsLocally } from '../logic/ai.js';

// ── Sync insights from Supabase into localStorage on login ────────────────────
// This makes insights the same on every device (mobile, laptop, etc.)
async function syncInsightsFromCloud(userId) {
  if (!userId || !isConfigured()) return;
  try {
    const { data: rows } = await sb(s =>
      s.from('insights')
        .select('data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)
    );
    if (!rows?.length) return;

    // Extract the insight objects stored in the 'data' column
    const cloudInsights = rows
      .map(r => r.data)
      .filter(Boolean);

    if (!cloudInsights.length) return;

    // Merge with whatever is already in localStorage on this device
    const localInsights  = loadInsightsLocally(userId);
    const allInsights    = [...cloudInsights, ...localInsights];

    // Deduplicate by id — cloud version wins (it's the source of truth)
    const seen    = new Set();
    const merged  = allInsights.filter(ins => {
      if (!ins?.id || seen.has(ins.id)) return false;
      seen.add(ins.id);
      return true;
    }).slice(0, 100);

    // Write merged list back to localStorage — now this device is in sync
    localStorage.setItem(`udie_insights_${userId}`, JSON.stringify(merged));
  } catch (err) {
    // Sync failure is silent — app still works, just shows local insights
    console.warn('Cloud insight sync failed:', err);
  }
}

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
            // Sync cloud insights on every page load so devices stay in sync
            syncInsightsFromCloud(data.session.user.id);
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: (import.meta.env.VITE_APP_URL || window.location.origin) + '/',
        },
      });
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

        // Sync insights from cloud → localStorage so all devices show the same data
        syncInsightsFromCloud(data.user.id); // fire-and-forget, non-blocking
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
