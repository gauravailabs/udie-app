/**
 * UDIE Share Logic
 * Creates short shareable links by storing insights in Supabase.
 * Falls back to compressed URL param if Supabase not available.
 */

import { supabase, isConfigured } from '../db/supabase.js';

// ── Generate a short 8-char ID ────────────────────────────────────────────────
function shortId() {
  return Math.random().toString(36).slice(2, 10); // e.g. "k7m2x9nq"
}

// ── Slim down insight to only shareable fields ────────────────────────────────
function slimInsight(insight) {
  return {
    title:               insight.title               || '',
    signal:              insight.signal              || '',
    context:             insight.context             || '',
    impact:              insight.impact              || [],
    actions:             insight.actions             || [],
    urgency:             insight.urgency             || 'medium',
    urgency_timeframe:   insight.urgency_timeframe   || '',
    mode:                insight.mode                || '',
    opportunity_or_risk: insight.opportunity_or_risk || 'both',
    confidence:          insight.confidence          || 'medium',
  };
}

// ── Save insight and return short URL ─────────────────────────────────────────
export async function createShareLink(insight) {
  const slim   = slimInsight(insight);
  const origin = window.location.origin;

  if (isConfigured()) {
    try {
      const id = shortId();
      const { error } = await supabase
        .from('shared_insights')
        .insert({ id, insight: slim, created_at: new Date().toISOString() });

      if (!error) {
        return `${origin}/?s=${id}`;
      }
    } catch {}
  }

  // Fallback: compress to base64 URL (still usable, just longer)
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(slim))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${origin}/?i=${b64}`;
}

// ── Fetch insight from short ID or decode from URL param ──────────────────────
export async function resolveShareLink() {
  const params = new URLSearchParams(window.location.search);
  const shortCode = params.get('s');
  const b64Code   = params.get('i') || params.get('share');

  if (shortCode && isConfigured()) {
    try {
      const { data, error } = await supabase
        .from('shared_insights')
        .select('insight')
        .eq('id', shortCode)
        .maybeSingle();

      if (!error && data?.insight) {
        return { insight: data.insight, error: null };
      }
    } catch {}
    return { insight: null, error: 'Insight not found. The link may have expired.' };
  }

  if (shortCode && !isConfigured()) {
    return { insight: null, error: 'This short link requires the full app to load. Please open it in a browser.' };
  }

  if (b64Code) {
    try {
      const padded  = b64Code.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - b64Code.length % 4) % 4);
      const json    = decodeURIComponent(escape(atob(padded)));
      const slim    = JSON.parse(json);
      const insight = slim.title ? slim : {
        title:               slim.t,
        signal:              slim.s,
        context:             slim.c,
        impact:              slim.i,
        actions:             slim.a,
        urgency:             slim.u,
        urgency_timeframe:   slim.ut,
        mode:                slim.m,
        opportunity_or_risk: slim.or,
        confidence:          slim.cf,
      };
      return { insight, error: null };
    } catch {
      return { insight: null, error: 'This link appears to be invalid or corrupted.' };
    }
  }

  return { insight: null, error: 'No insight data found in this link.' };
}

// ── Detect if current URL is a share link ─────────────────────────────────────
export function isShareUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.has('s') || params.has('i') || params.has('share');
}
