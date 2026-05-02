/**
 * UDIE — AI Intelligence Engine
 *
 * Calls Anthropic Claude directly from the browser.
 * Add your key to .env:  VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
 * Then run:              npm run dev
 *
 * For production (Vercel), add VITE_ANTHROPIC_API_KEY to environment variables.
 */

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
const MODEL   = 'claude-sonnet-4-20250514';
// ─── Strip <cite> tags from ALL string fields recursively ─────────────────────
function stripCiteStr(s) {
  return typeof s !== 'string' ? s
    : s.replace(/<cite[^>]*>([\s\S]*?)<\/cite>/g, '$1').replace(/<\/?cite[^>]*>/g, '').trim();
}
function deepStripCites(obj) {
  if (typeof obj === 'string') return stripCiteStr(obj);
  if (Array.isArray(obj))     return obj.map(deepStripCites);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k,v] of Object.entries(obj)) out[k] = deepStripCites(v);
    return out;
  }
  return obj;
}


// ─── INTELLIGENCE MODES ───────────────────────────────────────────────────────
export const MODES = {
  competitive: {
    id: 'competitive', label: 'Competitive', icon: '🏆', color: '#3B82F6',
    desc: 'Track competitor moves & strategic threats',
    focus: 'competitor behavior, market positioning, product launches, pricing changes, partnerships, talent movements',
  },
  regulatory: {
    id: 'regulatory', label: 'Regulatory', icon: '⚖️', color: '#8B5CF6',
    desc: 'Navigate compliance & policy shifts',
    focus: 'regulatory changes, compliance requirements, policy updates, legal risk, enforcement trends, industry standards',
  },
  market: {
    id: 'market', label: 'Market Intel', icon: '📊', color: '#06B6D4',
    desc: 'Decode market signals & sentiment',
    focus: 'market sentiment, brand perception, customer feedback, media narratives, analyst opinions, reputation risk',
  },
  growth: {
    id: 'growth', label: 'Growth', icon: '📈', color: '#10B981',
    desc: 'Identify revenue & expansion opportunities',
    focus: 'growth opportunities, account expansion, revenue signals, market demand shifts, partnership potential',
  },
  organizational: {
    id: 'organizational', label: 'Org Strategy', icon: '🧩', color: '#F59E0B',
    desc: 'Align internal decisions with strategy',
    focus: 'organizational efficiency, strategic alignment, operational gaps, team performance, resource allocation',
  },
};

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────
function buildSystemPrompt(mode, profile) {
  const m = MODES[mode];
  const ctx = profile
    ? `Company: ${profile.company_name || '?'} | Industry: ${profile.industry || '?'} | Stage: ${profile.stage || '?'} | Geography: ${profile.geography || '?'} | Priorities: ${profile.priorities || '?'} | Challenges: ${profile.challenges || '?'}`
    : 'No company profile set. Provide general strategic intelligence.';

  return `You are UDIE — the Unified Decision Intelligence Engine. You are NOT a chatbot. You are a senior strategic intelligence analyst in ${m.label} mode.

COMPANY CONTEXT: ${ctx}

INTELLIGENCE MODE: ${m.label.toUpperCase()}
Focus: ${m.focus}

CRITICAL INSTRUCTION — SEARCH FIRST:
Before answering, use the web_search tool to find the LATEST real-world information relevant to this query. Search for recent news, developments, and data from the past 30 days. Ground every insight in current, verifiable facts — not just training data. Today's date is ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}.

RULES:
1. Respond ONLY with valid JSON — no markdown, no explanation, no text outside JSON
2. Every insight must be specific to this company's context, not generic
3. Recommended actions must be concrete (who, what, when)
4. Be direct and honest about urgency

OUTPUT FORMAT (strict JSON only):
{
  "title": "6-8 word punchy insight title",
  "signal": "The key signal in 1-2 sentences",
  "context": "Why this matters specifically for this company in 2-3 sentences",
  "impact": ["specific consequence 1", "specific consequence 2", "specific consequence 3"],
  "actions": [
    {"action": "specific action", "owner": "who does it", "timeline": "timeframe"},
    {"action": "specific action", "owner": "who does it", "timeline": "timeframe"},
    {"action": "specific action", "owner": "who does it", "timeline": "timeframe"}
  ],
  "urgency": "high|medium|low",
  "urgency_timeframe": "e.g. 3-6 months",
  "supporting_signals": ["supporting point 1", "supporting point 2"],
  "opportunity_or_risk": "opportunity|risk|both",
  "confidence": "high|medium|low"
}`;
}

function buildScanPrompt(profile) {
  const ctx = profile
    ? `Company: ${profile.company_name}, Industry: ${profile.industry}, Stage: ${profile.stage}, Geography: ${profile.geography}, Priorities: ${profile.priorities}`
    : 'General business context';

  const today = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  return `You are UDIE — Decision Intelligence Engine. Today is ${today}.

${ctx}

INSTRUCTIONS:
1. Use web_search to find the LATEST news and developments from the past 7-30 days relevant to this company's industry and geography
2. Search for: recent competitor moves, regulatory changes, market trends, and growth signals specific to their sector
3. Generate exactly 3 intelligence insights based on what you actually find — not generic advice

Each insight must reference real, current, searchable information.

Respond ONLY with a JSON array (no markdown, no explanation):
[
  {
    "title": "insight title referencing real event",
    "signal": "specific signal with real data/source",
    "context": "why this matters for this company specifically",
    "impact": ["impact 1", "impact 2"],
    "actions": [{"action": "...", "owner": "...", "timeline": "..."}],
    "urgency": "high|medium|low",
    "urgency_timeframe": "timeframe",
    "mode": "competitive|regulatory|market|growth|organizational",
    "opportunity_or_risk": "opportunity|risk|both",
    "confidence": "high|medium|low"
  }
]`;
}

// ─── CORE API CALL (direct browser call) ──────────────────────────────────────
async function callClaude(systemPrompt, userMessage) {
  if (!API_KEY) {
    return generateDemoInsight(userMessage, systemPrompt.includes('"mode"') ? 'scan' : 'single');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':                              'application/json',
      'x-api-key':                                 API_KEY,
      'anthropic-version':                         '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 4096,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
      // ── Web search: Claude searches the live web before answering ──
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        }
      ],
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();

  // Claude may return multiple content blocks when using tools
  // We want the LAST text block — final answer after web searching
  const textBlocks = (data.content || []).filter(b => b.type === 'text');
  const text = textBlocks[textBlocks.length - 1]?.text?.trim() || '';

  if (!text) throw new Error('No response from AI. Please try again.');

  // Strip markdown code fences if present
  const clean = text.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();

  try {
    const parsed = JSON.parse(clean);
    // Strip ALL <cite index="...">text</cite> tags from every string field
    // These come from Claude's web search tool and must never reach the UI
    return deepStripCites(parsed);
  } catch {
    throw new Error('Could not parse AI response. Please try again.');
  }
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────
export async function generateInsight({ query, mode, profile }) {
  const system = buildSystemPrompt(mode, profile);
  const result = await callClaude(system, query);
  return {
    ...result,
    mode,
    query,
    id:         Date.now().toString(),
    created_at: new Date().toISOString(),
  };
}

export async function generateHomeScan(profile) {
  const system = buildScanPrompt(profile);
  const result = await callClaude(system, 'Generate my intelligence briefing for today.');
  const arr = Array.isArray(result) ? result : [result];
  return arr.map((r, i) => ({
    ...r,
    id:         (Date.now() + i).toString(),
    created_at: new Date().toISOString(),
  }));
}

// ─── LOCAL STORAGE — per-user, with scan timestamp ───────────────────────────
function insightsKey(userId) {
  return userId ? `udie_insights_${userId}` : 'udie_insights_guest';
}

function scanKey(userId) {
  return userId ? `udie_last_scan_${userId}` : 'udie_last_scan_guest';
}

export function saveInsightLocally(insight, userId) {
  try {
    const key      = insightsKey(userId);
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    // Avoid duplicate ids
    const deduped  = [insight, ...existing.filter(e => e.id !== insight.id)].slice(0, 100);
    localStorage.setItem(key, JSON.stringify(deduped));
  } catch {}
}

export function loadInsightsLocally(userId) {
  try {
    const key = insightsKey(userId);
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    // Also check legacy key and merge once
    if (data.length === 0 && userId) {
      const legacy = JSON.parse(localStorage.getItem('udie_insights') || '[]');
      if (legacy.length > 0) {
        localStorage.setItem(key, JSON.stringify(legacy));
        localStorage.removeItem('udie_insights');
        return legacy;
      }
    }
    return data;
  } catch { return []; }
}

export function getLastScanTime(userId) {
  try {
    const ts = localStorage.getItem(scanKey(userId));
    return ts ? parseInt(ts) : 0;
  } catch { return 0; }
}

export function markScanTime(userId) {
  try { localStorage.setItem(scanKey(userId), Date.now().toString()); } catch {}
}

import { sb } from '../db/supabase.js';

export async function saveInsightToDB(insight, userId) {
  if (!userId) return;
  try {
    await sb(s => s.from('insights').insert({
      user_id:    userId,
      mode:       insight.mode,
      title:      insight.title,
      signal:     insight.signal,
      context:    insight.context,
      impact:     insight.impact,
      actions:    insight.actions,
      urgency:    insight.urgency,
      data:       insight,
      created_at: insight.created_at,
    }));
  } catch {} // Never crash the UI over a DB save
}

// ─── DEMO FALLBACK ────────────────────────────────────────────────────────────
function generateDemoInsight(query, type) {
  const single = {
    title:              'Add your Anthropic API key to get real insights',
    signal:             'UDIE is running in demo mode. Real AI intelligence requires your Anthropic API key.',
    context:            'To activate Claude-powered intelligence: copy .env.example to .env and add your VITE_ANTHROPIC_API_KEY. Get your key at console.anthropic.com.',
    impact:             [
      'Without API key: demo placeholders only',
      'With API key: real strategic intelligence tailored to your company',
      'Setup takes under 2 minutes',
    ],
    actions:            [
      { action: 'Copy .env.example to .env',       owner: 'You', timeline: 'Now' },
      { action: 'Add VITE_ANTHROPIC_API_KEY value', owner: 'You', timeline: 'Now' },
      { action: 'Restart npm run dev',              owner: 'You', timeline: 'Now' },
    ],
    urgency:            'high',
    urgency_timeframe:  'Immediate — 2 minute setup',
    supporting_signals: ['API key from console.anthropic.com', 'Free tier available'],
    opportunity_or_risk:'opportunity',
    confidence:         'high',
  };

  if (type === 'scan') {
    return [
      { ...single, mode:'competitive', title:'🏆 Setup needed: Add API key for competitive intelligence', urgency:'high'   },
      { ...single, mode:'growth',      title:'📈 Setup needed: Add API key for growth intelligence',      urgency:'medium' },
      { ...single, mode:'regulatory',  title:'⚖️ Setup needed: Add API key for regulatory intelligence',  urgency:'low'    },
    ];
  }
  return single;
}
