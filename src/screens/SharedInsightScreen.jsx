import React, { useEffect, useState } from 'react';
import { MODES } from '../logic/ai.js';
import { resolveShareLink } from '../logic/share.js';
import { Clock, ExternalLink } from 'lucide-react';

export default function SharedInsightScreen() {
  const [insight, setInsight] = useState(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resolveShareLink().then(({ insight, error }) => {
      if (error)   setError(error);
      if (insight) setInsight(insight);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={outerStyle}>
      <div style={{ color:'#8BA3C7', fontSize:14, fontFamily:SF }}>Loading insight…</div>
    </div>
  );

  if (error) return (
    <div style={outerStyle}>
      <div style={{ width:'100%', maxWidth:480, textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🔗</div>
        <div style={{ color:'#F2F5FF', fontSize:20, fontWeight:700, marginBottom:8 }}>Link Not Found</div>
        <div style={{ color:'#8BA3C7', fontSize:14, marginBottom:24, lineHeight:1.5 }}>{error}</div>
        <a href="/" style={ctaBtn}>Open UDIE App</a>
      </div>
    </div>
  );

  const mode   = MODES[insight.mode];
  const isRisk = insight.opportunity_or_risk === 'risk';
  const isOpp  = insight.opportunity_or_risk === 'opportunity';
  const accent = insight.urgency === 'high' ? '#FF4D6A' : insight.urgency === 'medium' ? '#FFB547' : '#00D68F';

  return (
    <div style={{ minHeight:'100dvh', height:'100dvh', overflowY:'auto', background:'#03080F', fontFamily:SF }}>
      {/* Sticky header */}
      <div style={{ position:'sticky', top:0, zIndex:10, background:'rgba(3,8,15,0.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#4DA3FF', letterSpacing:'.06em' }}>🧠 UDIE</div>
          <div style={{ fontSize:11, color:'#4A6280', marginTop:1 }}>Shared Intelligence</div>
        </div>
        <a href="/" style={{ display:'flex', alignItems:'center', gap:6, background:'#1D7FFF', color:'#fff', padding:'7px 14px', borderRadius:10, textDecoration:'none', fontSize:12, fontWeight:600, boxShadow:'0 2px 10px rgba(29,127,255,0.35)' }}>
          <ExternalLink size={12}/> Open App
        </a>
      </div>

      <div style={{ maxWidth:560, margin:'0 auto', padding:'20px 16px 60px' }}>
        {/* Title card */}
        <div style={{ background:'#111827', border:`1px solid rgba(255,255,255,0.08)`, borderLeft:`4px solid ${accent}`, borderRadius:20, padding:20, marginBottom:14 }}>
          <div style={{ fontSize:20, fontWeight:700, letterSpacing:'-.03em', lineHeight:1.25, color:'#F2F5FF', marginBottom:12 }}>
            {insight.title}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            <Pill color={accent} bg={`${accent}18`}>{insight.urgency==='high'?'🔴':insight.urgency==='medium'?'🟡':'🟢'} {insight.urgency?.toUpperCase()}</Pill>
            {mode && <Pill color={mode.color} bg={`${mode.color}18`}>{mode.icon} {mode.label}</Pill>}
            {insight.opportunity_or_risk && <Pill color={isOpp?'#00D68F':isRisk?'#FF4D6A':'#4DA3FF'} bg={isOpp?'rgba(0,214,143,.12)':isRisk?'rgba(255,77,106,.12)':'rgba(29,127,255,.12)'}>{isOpp?'📈 Opportunity':isRisk?'⚠️ Risk':'⚡ Mixed'}</Pill>}
          </div>
        </div>

        <Sect label="📡 The Signal">
          <div style={{ fontSize:15, color:'#F2F5FF', lineHeight:1.65 }}>{insight.signal}</div>
        </Sect>

        <Sect label="💡 Why It Matters">
          <div style={{ fontSize:14, color:'#8BA3C7', lineHeight:1.65 }}>{insight.context}</div>
        </Sect>

        {insight.impact?.length > 0 && (
          <Sect label="⚡ Business Impact">
            {insight.impact.map((item, i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom: i<insight.impact.length-1?'1px solid rgba(255,255,255,0.06)':'none', fontSize:14, color:'#8BA3C7', lineHeight:1.5 }}>
                <span style={{ color: i===0?accent:'#4A6280', flexShrink:0 }}>→</span>{item}
              </div>
            ))}
          </Sect>
        )}

        {insight.actions?.length > 0 && (
          <Sect label="🎯 Recommended Actions">
            {insight.actions.map((a, i) => (
              <div key={i} style={{ background:'#1C2536', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'#1D7FFF', color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'#F2F5FF', lineHeight:1.4, marginBottom:6 }}>{a.action}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {a.owner    && <Tag>👤 {a.owner}</Tag>}
                      {a.timeline && <Tag>⏱ {a.timeline}</Tag>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Sect>
        )}

        {(insight.urgency_timeframe || insight.confidence) && (
          <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 16px', background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, marginTop:4 }}>
            {insight.urgency_timeframe && <div><div style={{ fontSize:11, color:'#4A6280' }}>Time Horizon</div><div style={{ fontSize:14, fontWeight:600, color:'#F2F5FF', marginTop:3 }}>{insight.urgency_timeframe}</div></div>}
            {insight.confidence && <div style={{ textAlign:'right' }}><div style={{ fontSize:11, color:'#4A6280' }}>Confidence</div><div style={{ fontSize:14, fontWeight:600, color:'#F2F5FF', marginTop:3, textTransform:'capitalize' }}>{insight.confidence}</div></div>}
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop:24, textAlign:'center', padding:'20px', background:'linear-gradient(135deg,rgba(29,127,255,0.08),rgba(0,214,143,0.05))', borderRadius:16, border:'1px solid rgba(29,127,255,0.15)' }}>
          <div style={{ fontSize:13, color:'#8BA3C7', marginBottom:14, lineHeight:1.6 }}>
            Shared via <strong style={{ color:'#4DA3FF' }}>UDIE</strong> — Unified Decision Intelligence Engine<br/>
            <span style={{ fontSize:12 }}>AI-powered strategic intelligence for business leaders</span>
          </div>
          <a href="/" style={ctaBtn}>🧠 Get your own intelligence</a>
        </div>
      </div>
    </div>
  );
}

// ── Mini components ───────────────────────────────────────────────────────────
const SF = '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif';

const outerStyle = {
  minHeight:'100dvh', background:'#03080F',
  display:'flex', alignItems:'center', justifyContent:'center',
  padding:24, fontFamily:SF,
};

const ctaBtn = {
  display:'inline-flex', alignItems:'center', gap:8,
  background:'#1D7FFF', color:'#fff',
  padding:'12px 24px', borderRadius:12,
  textDecoration:'none', fontWeight:600, fontSize:14,
  boxShadow:'0 4px 20px rgba(29,127,255,0.35)',
};

function Pill({ color, bg, children }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 9px', borderRadius:999, fontSize:11, fontWeight:700, background:bg, color, border:`1px solid ${color}28` }}>
      {children}
    </span>
  );
}

function Sect({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase', color:'#4A6280', marginBottom:8 }}>{label}</div>
      <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:16 }}>{children}</div>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span style={{ fontSize:11, color:'#4A6280', background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:999 }}>{children}</span>
  );
}
