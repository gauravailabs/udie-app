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

// Simple typewriter for title only
function Typewriter({ text, speed = 20, onDone }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!text) return;
    setShown('');
    let i = 0;
    const iv = setInterval(() => {
      setShown(text.slice(0, ++i));
      if (i >= text.length) { clearInterval(iv); onDone?.(); }
    }, speed);
    return () => clearInterval(iv);
  }, [text]);
  return <>{shown}<span className="stream-cursor"/></>;
}

// Streaming card — shows insight progressively as it arrives
function StreamingCard({ insight, modeId, onExpand }) {
  const [phase,    setPhase]    = useState(0); // 0=title 1=signal 2=impact 3=actions 4=done
  const [titleDone, setTitleDone] = useState(false);

  useEffect(() => {
    if (titleDone) {
      const t1 = setTimeout(() => setPhase(1), 100);
      const t2 = setTimeout(() => setPhase(2), 600);
      const t3 = setTimeout(() => setPhase(3), 1000);
      const t4 = setTimeout(() => setPhase(4), 1400);
      return () => [t1,t2,t3,t4].forEach(clearTimeout);
    }
  }, [titleDone]);

  // Bug 4 fix: ALWAYS use modeId (what user selected), never trust Claude's mode field
  const mode = MODES[modeId];
  const isDone = phase >= 4;

  return (
    <div className={isDone ? 'insight-card card-pressable' : 'stream-card'}
      onClick={() => isDone && onExpand(insight)}>
      {/* Mode + urgency — always shows the SELECTED mode */}
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
        {mode && (
          <span className="badge badge-mode"
            style={{ background:`${mode.color}18`, color:mode.color, borderColor:`${mode.color}28` }}>
            {mode.icon} {mode.label}
          </span>
        )}
        {insight?.urgency && (
          <span className={`badge badge-${insight.urgency}`}>
            {insight.urgency==='high'?'🔴':insight.urgency==='medium'?'🟡':'🟢'} {insight.urgency}
          </span>
        )}
        {!isDone && (
          <span style={{ fontSize:11, color:'var(--blue2)', display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--blue)', display:'inline-block', animation:'typingDot 1.4s ease-in-out infinite' }}/>
            Generating…
          </span>
        )}
      </div>

      {/* Title with typewriter */}
      <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-.03em', lineHeight:1.3, color:'var(--text)', marginBottom:10 }}>
        {insight?.title
          ? <Typewriter text={insight.title} onDone={() => setTitleDone(true)} />
          : <span className="stream-cursor"/>}
      </div>

      {phase >= 1 && insight?.signal && (
        <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:10, animation:'cardIn .3s ease both' }}>
          {insight.signal}
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
        <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', animation:'cardIn .3s ease both' }}>
          <span style={{ fontSize:11, color:'var(--text3)' }}>⏱ {insight.urgency_timeframe}</span>
          <span style={{ fontSize:11, color:'var(--blue2)', fontWeight:600 }}>Tap for full analysis →</span>
        </div>
      )}
    </div>
  );
}

export default function IntelligenceScreen({ navigate }) {
  const { profile, user } = useAuth();

  // Bug 4 fix: activeMode is the SINGLE source of truth for which engine runs
  // It is set when user taps a pill and NEVER changed by AI response
  const [activeMode, setActiveMode] = useState('competitive');
  const [query,   setQuery]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  // Each entry: { insight, modeId } — modeId locked at submit time
  const [results, setResults] = useState([]);
  const textRef    = useRef(null);
  const contentRef = useRef(null);

  // Bug 3 fix: synchronous in-flight guard prevents ANY double submission
  const inFlight = useRef(false);

  const submit = async () => {
    const q = query.trim();
    if (!q || inFlight.current) return;

    // Lock the mode at submit time — pill changes after won't affect this query
    const lockedMode = activeMode;

    inFlight.current = true;
    setLoading(true);
    setError('');
    setQuery('');
    if (textRef.current) textRef.current.style.height = 'auto';

    try {
      // ONE call, ONE mode, ONE result
      const insight = await generateInsight({ query: q, mode: lockedMode, profile });

      // Bug 4 fix: force mode to lockedMode regardless of what Claude returned
      const withMode = { ...insight, mode: lockedMode };

      // Prepend with { insight, modeId } so StreamingCard knows the locked mode
      setResults(prev => [{ insight: withMode, modeId: lockedMode }, ...prev]);
      saveInsightLocally(withMode, user?.id);
      if (user?.id) saveInsightToDB(withMode, user.id).catch(() => {});

      setTimeout(() => contentRef.current?.scrollTo({ top:0, behavior:'smooth' }), 100);
    } catch (e) {
      setError(e.message || 'Intelligence generation failed. Check your VITE_ANTHROPIC_API_KEY.');
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  };

  const handleKey  = e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); submit(); } };
  const autoResize = e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'; };
  const clearAll   = () => { if (confirm('Clear this session\'s results?')) setResults([]); };
  const pickExample = q => { setQuery(q); textRef.current?.focus(); };

  // Bug 4 fix: clear results when mode changes so old mode results don't confuse
  const handleModeChange = (id) => {
    setActiveMode(id);
    setError('');
    // Don't clear results — user may want to compare across modes
    // But DO reset query input
    setQuery('');
  };

  const examples = EXAMPLES[activeMode] || EXAMPLES.competitive;

  return (
    <div className="screen">
      <div style={{ padding:'14px 14px 0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-.04em', color:'var(--text)' }}>Intelligence</div>
          {results.filter(e => e.modeId === activeMode).length > 0 && (
            <button onClick={clearAll}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:'var(--font-body)' }}>
              <Trash2 size={13}/> Clear
            </button>
          )}
        </div>
        <div style={{ fontSize:13, color:'var(--text2)', marginBottom:12 }}>
          One question · one engine · one insight.
        </div>

        {/* Mode pills */}
        <div className="modes-scroll" style={{ margin:'0 -14px', padding:'0 14px 2px' }}>
          {Object.values(MODES).map(m => (
            <button key={m.id}
              className={`mode-pill ${activeMode===m.id?'active':''}`}
              style={activeMode===m.id?{borderColor:m.color,background:`${m.color}15`}:{}}
              onClick={() => handleModeChange(m.id)}>
              <span className="mode-pill-icon">{m.icon}</span>
              <span className="mode-pill-label" style={activeMode===m.id?{color:m.color}:{}}>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Active engine indicator */}
        <div style={{ fontSize:11, color:'var(--text3)', marginTop:8, marginBottom:12, padding:'6px 10px', background:'var(--surface)', borderRadius:'var(--r-sm)', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:MODES[activeMode]?.color, flexShrink:0, display:'inline-block' }}/>
          Active: <strong style={{ color:'var(--text2)' }}>{MODES[activeMode]?.label}</strong> — {MODES[activeMode]?.desc}
        </div>
      </div>

      {/* Scrollable results */}
      <div ref={contentRef} className="content" style={{ paddingTop:0 }}>

        {/* Example prompts */}
        {results.filter(e => e.modeId === activeMode).length === 0 && !loading && (
          <div style={{ marginBottom:16 }}>
            <div className="section-title" style={{ margin:'4px 0 8px', display:'flex', alignItems:'center', gap:6 }}>
              <Lightbulb size={10}/> Try asking…
            </div>
            {examples.map((q, i) => (
              <button key={i} onClick={() => pickExample(q)}
                style={{ display:'block', width:'100%', textAlign:'left', padding:'11px 14px', marginBottom:6, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', fontSize:13, color:'var(--text2)', cursor:'pointer', fontFamily:'var(--font-body)', transition:'border-color .15s', lineHeight:1.4 }}
                onTouchStart={e => e.currentTarget.style.borderColor='var(--border2)'}
                onTouchEnd={e => e.currentTarget.style.borderColor='var(--border)'}>
                "{q}"
              </button>
            ))}
            <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center', marginTop:6 }}>
              Tap to fill · press ↑ to send
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="alert alert-error" style={{ marginBottom:12 }}>{error}</div>}

        {/* Loading — shows which engine is running */}
        {loading && (
          <div className="typing-indicator">
            <div style={{ width:36, height:36, borderRadius:10, background:`${MODES[activeMode]?.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
              {MODES[activeMode]?.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:3 }}>
                {MODES[activeMode]?.label} engine running…
              </div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>Searching web · Building context · Formulating actions</div>
            </div>
            <div style={{ display:'flex', gap:5 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:MODES[activeMode]?.color || 'var(--blue)', opacity:0.8, animation:'typingDot 1.4s ease-in-out infinite', animationDelay:`${i*0.2}s` }}/>
              ))}
            </div>
          </div>
        )}

        {/* Results — only show results for the currently active mode */}
        {results.filter(e => e.modeId === activeMode).map((entry, idx) => (
          <StreamingCard
            key={entry.insight?.id || idx}
            insight={entry.insight}
            modeId={entry.modeId}
            onExpand={i => navigate('detail', { insight: i })}
          />
        ))}

        <div style={{ height:120 }}/>
      </div>

      {/* Query input */}
      <div style={{ padding:'10px 14px', paddingBottom:`calc(10px + env(safe-area-inset-bottom,0px))`, background:'rgba(3,8,15,.96)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderTop:'1px solid var(--border)', flexShrink:0 }}>
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
