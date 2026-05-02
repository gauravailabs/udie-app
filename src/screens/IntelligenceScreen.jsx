import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { generateInsight, saveInsightLocally, saveInsightToDB, MODES } from '../logic/ai.js';
import InsightCard from '../components/InsightCard.jsx';
import { SendHorizonal, Lightbulb, Trash2 } from 'lucide-react';

const EXAMPLES = {
  competitive:    ['What competitor moves should I watch this quarter?', 'How is AI disrupting my competitive landscape?', 'What pricing strategies are competitors using?'],
  regulatory:     ['What compliance risks affect my industry?', 'What new regulations could impact our operations?', 'How do recent policy changes affect our business model?'],
  market:         ['How is market sentiment shifting in our sector?', 'What do customers think of our brand vs competitors?', 'What emerging market trends should we act on?'],
  growth:         ['What growth opportunities are we missing?', 'Which market segments should we prioritize?', 'How can we accelerate our revenue growth?'],
  organizational: ['How should we restructure for scale?', 'What decisions need to be made this quarter?', 'Where do we have strategic misalignment?'],
};

// Typewriter effect for streaming UX
function useTypewriter(text, speed = 18, active = false) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active || !text) { setDisplayed(text || ''); setDone(true); return; }
    setDisplayed(''); setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, ++i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, active]);
  return { displayed, done };
}

function StreamingInsightCard({ insight, onExpand }) {
  const [phase, setPhase] = useState(0);
  const { displayed: titleText, done: titleDone } = useTypewriter(insight?.title, 22, true);
  const { displayed: signalText, done: signalDone } = useTypewriter(titleDone ? insight?.signal : '', 12, titleDone);

  useEffect(() => { if (titleDone) setPhase(1); }, [titleDone]);
  useEffect(() => { if (signalDone && signalText) setPhase(2); }, [signalDone, signalText]);
  useEffect(() => {
    if (phase === 2) { const t = setTimeout(() => setPhase(3), 400); return () => clearTimeout(t); }
    if (phase === 3) { const t = setTimeout(() => setPhase(4), 700); return () => clearTimeout(t); }
  }, [phase]);

  const isStreaming = phase < 4;
  const mode = MODES[insight?.mode];

  return (
    <div className={isStreaming ? 'stream-card' : 'insight-card card-pressable'}
      onClick={() => !isStreaming && onExpand(insight)}>
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
        {mode && (
          <span className="badge badge-mode" style={{ background:`${mode.color}18`, color:mode.color, borderColor:`${mode.color}28` }}>
            {mode.icon} {mode.label}
          </span>
        )}
        {insight?.urgency && (
          <span className={`badge badge-${insight.urgency}`}>
            {insight.urgency==='high'?'🔴':insight.urgency==='medium'?'🟡':'🟢'} {insight.urgency}
          </span>
        )}
        {isStreaming && (
          <span style={{ fontSize:11, color:'var(--blue2)', display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--blue)', display:'inline-block', animation:'typingDot 1.4s ease-in-out infinite' }}/>
            Generating…
          </span>
        )}
      </div>
      <div style={{ fontSize:17, fontWeight:700, letterSpacing:'-0.03em', lineHeight:1.3, color:'var(--text)', marginBottom:10, minHeight:24 }}>
        {titleText}{phase===0 && <span className="stream-cursor"/>}
      </div>
      {phase >= 1 && signalText && (
        <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:10 }}>
          {signalText}{phase===1 && <span className="stream-cursor"/>}
        </div>
      )}
      {phase >= 2 && insight?.impact?.length > 0 && (
        <div style={{ animation:'cardIn .3s ease both' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text3)', marginBottom:6 }}>Impact</div>
          {insight.impact.slice(0,2).map((item,i) => (
            <div key={i} style={{ display:'flex', gap:8, fontSize:12, color:'var(--text2)', marginBottom:4, lineHeight:1.4 }}>
              <span style={{ color:'var(--red)', flexShrink:0 }}>→</span>{item}
            </div>
          ))}
        </div>
      )}
      {phase >= 3 && insight?.actions?.length > 0 && (
        <div style={{ marginTop:10, animation:'cardIn .3s ease both' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text3)', marginBottom:6 }}>Actions</div>
          {insight.actions.slice(0,2).map((a,i) => (
            <div key={i} style={{ display:'flex', gap:8, fontSize:12, color:'var(--text2)', marginBottom:4, lineHeight:1.4 }}>
              <span style={{ color:'var(--blue2)', flexShrink:0 }}>•</span>{a.action}
            </div>
          ))}
        </div>
      )}
      {phase >= 4 && insight?.urgency_timeframe && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text3)' }}>⏱ {insight.urgency_timeframe}</span>
          <span style={{ fontSize:11, color:'var(--blue2)', fontWeight:600 }}>Tap for full analysis →</span>
        </div>
      )}
    </div>
  );
}

export default function IntelligenceScreen({ navigate }) {
  const { profile, user } = useAuth();
  const [activeMode, setActiveMode] = useState('competitive');
  const [query,   setQuery]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [results, setResults] = useState([]);
  const textRef    = useRef(null);
  const contentRef = useRef(null);

  // ── KEY FIX: use a ref as synchronous in-flight guard ──────────────────────
  // React state (loading) is async — two rapid clicks both see loading=false
  // A ref updates synchronously, preventing any double-submissions
  const inFlight = useRef(false);

  const submit = async () => {
    const q = query.trim();
    if (!q || inFlight.current) return; // synchronous guard

    inFlight.current = true;  // block immediately — before any await
    setLoading(true);
    setError('');
    setQuery('');
    if (textRef.current) textRef.current.style.height = 'auto';

    try {
      // Only ONE mode called — whichever is selected in the pill
      const insight  = await generateInsight({ query: q, mode: activeMode, profile });
      const withMode = { ...insight, mode: activeMode };

      setResults(prev => [withMode, ...prev]);
      saveInsightLocally(withMode, user?.id);
      if (user?.id) saveInsightToDB(withMode, user.id).catch(() => {});

      setTimeout(() => contentRef.current?.scrollTo({ top:0, behavior:'smooth' }), 100);
    } catch (e) {
      setError(e.message || 'Intelligence generation failed. Check your VITE_ANTHROPIC_API_KEY in Vercel env vars.');
    } finally {
      setLoading(false);
      inFlight.current = false; // release guard
    }
  };

  const handleKey   = e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); submit(); } };
  const autoResize  = e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'; };
  const clearAll    = () => { if (confirm('Clear this session\'s results?')) setResults([]); };

  // Clicking an example ONLY fills the input — user must press Send themselves
  const pickExample = (q) => {
    setQuery(q);
    textRef.current?.focus();
  };

  const examples = EXAMPLES[activeMode] || EXAMPLES.competitive;

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ padding:'16px 14px 0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-.04em' }}>Intelligence</div>
          {results.length > 0 && (
            <button onClick={clearAll}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
              <Trash2 size={13}/> Clear
            </button>
          )}
        </div>
        <div style={{ fontSize:13, color:'var(--text2)', marginBottom:12 }}>
          Ask anything. One question → one engine → one insight.
        </div>

        {/* Mode selector — determines which single engine runs */}
        <div className="modes-scroll" style={{ margin:'0 -14px', padding:'0 14px 2px' }}>
          {Object.values(MODES).map(m => (
            <button key={m.id}
              className={`mode-pill ${activeMode===m.id?'active':''}`}
              style={activeMode===m.id ? { borderColor:m.color, background:`${m.color}15` } : {}}
              onClick={() => { setActiveMode(m.id); setError(''); }}>
              <span className="mode-pill-icon">{m.icon}</span>
              <span className="mode-pill-label" style={activeMode===m.id?{color:m.color}:{}}>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Active mode description */}
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:7, marginBottom:12, padding:'6px 10px', background:'var(--surface)', borderRadius:'var(--r-sm)', border:'1px solid var(--border)' }}>
          🔍 Active engine: <strong style={{ color:'var(--text2)' }}>{MODES[activeMode]?.label}</strong> — {MODES[activeMode]?.desc}
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={contentRef} className="content" style={{ paddingTop:0 }}>

        {/* Example prompts — tap to fill, not to submit */}
        {results.length === 0 && !loading && (
          <div style={{ marginBottom:16 }}>
            <div className="section-title" style={{ margin:'4px 0 8px', display:'flex', alignItems:'center', gap:6 }}>
              <Lightbulb size={10}/> Example questions for {MODES[activeMode]?.label}
            </div>
            {examples.map((q, i) => (
              <button key={i} onClick={() => pickExample(q)}
                style={{ display:'block', width:'100%', textAlign:'left', padding:'11px 14px', marginBottom:6, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', fontSize:13, color:'var(--text2)', cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .15s', lineHeight:1.4 }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--border2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                "{q}"
              </button>
            ))}
            <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center', marginTop:4 }}>
              Tap a question to fill it in, then press ↑ to send
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom:12 }}>
            {error}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="typing-indicator">
            <div style={{ width:36, height:36, borderRadius:10, background:'var(--blue-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
              {MODES[activeMode]?.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:3 }}>
                {MODES[activeMode]?.label} engine running…
              </div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>
                Searching web · Building context · Formulating actions
              </div>
            </div>
            <div style={{ display:'flex', gap:5 }}>
              <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
            </div>
          </div>
        )}

        {/* Results */}
        {results.map((insight, idx) => (
          <StreamingInsightCard
            key={insight.id || idx}
            insight={insight}
            onExpand={i => navigate('detail', { insight: i })}
          />
        ))}

        <div style={{ height:120 }}/>
      </div>

      {/* Query input — pinned bottom */}
      <div style={{ padding:'10px 14px', paddingBottom:`calc(10px + env(safe-area-inset-bottom,0px))`, background:'rgba(3,8,15,.96)', backdropFilter:'blur(24px)', borderTop:'1px solid var(--border)', flexShrink:0 }}>
        <div className="query-box">
          <textarea ref={textRef} className="query-input"
            placeholder={`Ask ${MODES[activeMode]?.label} intelligence…`}
            value={query} rows={1}
            onChange={e => { setQuery(e.target.value); autoResize(e); }}
            onKeyDown={handleKey}
          />
          <button className="query-submit" onClick={submit}
            disabled={!query.trim() || loading || inFlight.current}>
            <SendHorizonal size={15}/>
          </button>
        </div>
      </div>
    </div>
  );
}
