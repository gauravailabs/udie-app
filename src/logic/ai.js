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

  return `You are UDIE — Decision Intelligence Engine. Generate a briefing of exactly 3 intelligence insights for this company.

${ctx}

Generate 3 insights across different domains (one competitive threat, one growth opportunity, one regulatory/market risk). Make them specific and actionable for today's environment.

Respond ONLY with a JSON array:
[
  {
    "title": "insight title",
    "signal": "key signal",
    "context": "why it matters",
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
      'Content-Type':                             'application/json',
      'x-api-key':                                API_KEY,
      'anthropic-version':                        '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 2048,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = (data.content?.[0]?.text || '').trim();

  // Strip markdown code fences if present
  const clean = text.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();

  try {
    return JSON.parse(clean);
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

// ─── LOCAL STORAGE ────────────────────────────────────────────────────────────
export function saveInsightLocally(insight) {
  try {
    const existing = JSON.parse(localStorage.getItem('udie_insights') || '[]');
    const updated  = [insight, ...existing].slice(0, 50);
    localStorage.setItem('udie_insights', JSON.stringify(updated));
  } catch {}
}

export function loadInsightsLocally() {
  try { return JSON.parse(localStorage.getItem('udie_insights') || '[]'); }
  catch { return []; }
}

import { sb } from '../db/supabase.js';

export async function saveInsightToDB(insight, userId) {
  if (!userId) return;
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
  })).catch(() => {});
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
