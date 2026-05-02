import { createClient } from '@supabase/supabase-js';

const URL  = import.meta.env.VITE_SUPABASE_URL  || '';
const ANON = import.meta.env.VITE_SUPABASE_ANON || '';

export const supabase     = URL && ANON ? createClient(URL, ANON) : null;
export const isConfigured = () => !!(URL && ANON);

export async function sb(fn) {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  try   { return await fn(supabase); }
  catch (e) { return { data: null, error: e }; }
}
