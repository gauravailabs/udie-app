import React, { useEffect, useState } from 'react';
import { UrgencyBadge, ModeBadge } from '../components/InsightCard.jsx';
import { MODES } from '../logic/ai.js';
import { Clock, AlertTriangle, CheckCircle2, TrendingUp, ExternalLink } from 'lucide-react';

// View-only screen for shared insight links
// URL format: /?share=<base64encodedJSON>
export default function SharedInsightScreen() {
  const [insight, setInsight] = useState(null);
  const [error,   setError]   = useState('');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw    = params.get('share');
      if (!raw) { setError('No insight data in this link.'); return; }
      const decoded = JSON.parse(atob(decodeURIComponent(raw)));
      setInsight(decoded);
    } catch {
      setError('This link appears to be invalid or expired.');
    }
  }, []);

  if (error) return (
    <div style={{ minHeight:'100dvh', background:'#03080F', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif' }}>
      <div style={{ fontSize:40, marginBottom:16 }}>🔗</div>
      <div style={{ color:'#F2F5FF', fontSize:18, fontWeight:700, marginBottom:8, textAlign:'center' }}>Invalid Link</div>
      <div style={{ color:'#8BA3C7', fontSize:14, textAlign:'center', marginBottom:24 }}>{error}</div>
      <a href="/" style={{ background:'#1D7FFF', color:'#fff', padding:'12px 24px', borderRadius:12, textDecoration:'none', fontWeight:600, fontSize:14 }}>
        Open UDIE
      </a>
    </div>
  );

  if (!insight) return (
    <div style={{ minHeight:'100dvh', background:'#03080F', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#8BA3C7', fontSize:14, fontFamily:'-apple-system,sans-serif' }}>Loading insight…</div>
    </div>
  );

  const mode  = MODES[insight.mode];
  const isRisk = insight.opportunity_or_risk === 'risk';
  const isOpp  = insight.opportunity_or_risk === 'opportunity';
  const accentColor = insight.urgency === 'high' ? '#FF4D6A' : insight.urgency === 'medium' ? '#FFB547' : '#00D68F';

  return (
    <div style={{ minHeight:'100dvh', background:'#03080F', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', padding:'0 0 40px' }}>
      {/* Header */}
      <div style={{ background:'rgba(0,0,0,0.8)', backdropFilter:'blur(20px)', padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:'.06em', color:'#4DA3FF' }}>🧠 UDIE</div>
          <div style={{ fontSize:11, color:'#4A6280', marginTop:1 }}>Shared Intelligence Report</div>
        </div>
        <a href="/" style={{ display:'flex', alignItems:'center', gap:6, background:'#1D7FFF', color:'#fff', padding:'7px 14px', borderRadius:10, textDecoration:'none', fontSize:12, fontWeight:600 }}>
          <ExternalLink size={12}/> Open App
        </a>
      </div>

      <div style={{ maxWidth:600, margin:'0 auto', padding:'20px 16px' }}>
        {/* Title card */}
        <div style={{ background:'#111827', border:`1px solid rgba(255,255,255,0.08)`, borderLeft:`4px solid ${accentColor}`, borderRadius:20, padding:20, marginBottom:14 }}>
          <div style={{ fontSize:21, fontWeight:700, letterSpacing:'-.03em', lineHeight:1.25, color:'#F2F5FF', marginBottom:12 }}>
            {insight.title}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:999, fontSize:11, fontWeight:700, background: insight.urgency==='high'?'rgba(255,77,106,.12)':insight.urgency==='medium'?'rgba(255,181,71,.12)':'rgba(0,214,143,.12)', color: insight.urgency==='high'?'#FF4D6A':insight.urgency==='medium'?'#FFB547':'#00D68F', border:`1px solid ${insight.urgency==='high'?'rgba(255,77,106,.25)':insight.urgency==='medium'?'rgba(255,181,71,.25)':'rgba(0,214,143,.25)'}` }}>
              {insight.urgency==='high'?'🔴':insight.urgency==='medium'?'🟡':'🟢'} {insight.urgency?.toUpperCase()}
            </span>
            {mode && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:999, fontSize:11, fontWeight:700, background:`${mode.color}18`, color:mode.color, border:`1px solid ${mode.color}28` }}>
                {mode.icon} {mode.label}
              </span>
            )}
            {insight.opportunity_or_risk && (
              <span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:999, fontSize:11, fontWeight:700, background: isOpp?'rgba(0,214,143,.12)':isRisk?'rgba(255,77,106,.12)':'rgba(29,127,255,.12)', color: isOpp?'#00D68F':isRisk?'#FF4D6A':'#4DA3FF' }}>
                {isOpp?'📈 Opportunity':isRisk?'⚠️ Risk':'⚡ Mixed'}
              </span>
            )}
          </div>
        </div>

        {/* Signal */}
        <Section title="The Signal" icon="📡">
          <div style={{ fontSize:15, color:'#F2F5FF', lineHeight:1.65 }}>{insight.signal}</div>
        </Section>

        {/* Context */}
        <Section title="Why It Matters" icon="💡">
          <div style={{ fontSize:14, color:'#8BA3C7', lineHeight:1.65 }}>{insight.context}</div>
        </Section>

        {/* Impact */}
        {insight.impact?.length > 0 && (
          <Section title="Business Impact" icon="⚡">
            {insight.impact.map((item, i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom: i<insight.impact.length-1?'1px solid rgba(255,255,255,0.06)':'none', fontSize:14, color:'#8BA3C7', lineHeight:1.5 }}>
                <span style={{ color: i===0?accentColor:'#4A6280', flexShrink:0, marginTop:1 }}>→</span>
                {item}
              </div>
            ))}
          </Section>
        )}

        {/* Actions */}
        {insight.actions?.length > 0 && (
          <Section title="Recommended Actions" icon="🎯">
            {insight.actions.map((a, i) => (
              <div key={i} style={{ background:'#1C2536', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'#1D7FFF', color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'#F2F5FF', lineHeight:1.4, marginBottom:6 }}>{a.action}</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {a.owner && <span style={{ fontSize:11, color:'#4A6280', background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:999 }}>👤 {a.owner}</span>}
                      {a.timeline && <span style={{ fontSize:11, color:'#4A6280', background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:999 }}>⏱ {a.timeline}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Timeframe */}
        {insight.urgency_timeframe && (
          <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 16px', background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, marginTop:4 }}>
            <div>
              <div style={{ fontSize:11, color:'#4A6280' }}>Time Horizon</div>
              <div style={{ fontSize:14, fontWeight:600, color:'#F2F5FF', marginTop:3 }}>{insight.urgency_timeframe}</div>
            </div>
            {insight.confidence && (
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11, color:'#4A6280' }}>Confidence</div>
                <div style={{ fontSize:14, fontWeight:600, color:'#F2F5FF', marginTop:3, textTransform:'capitalize' }}>{insight.confidence}</div>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop:24, textAlign:'center', padding:'20px', background:'linear-gradient(135deg,rgba(29,127,255,0.08),rgba(0,214,143,0.05))', borderRadius:16, border:'1px solid rgba(29,127,255,0.15)' }}>
          <div style={{ fontSize:13, color:'#8BA3C7', marginBottom:12 }}>
            This insight was generated by <strong style={{ color:'#4DA3FF' }}>UDIE</strong> — Unified Decision Intelligence Engine
          </div>
          <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#1D7FFF', color:'#fff', padding:'12px 24px', borderRadius:12, textDecoration:'none', fontWeight:600, fontSize:14, boxShadow:'0 4px 20px rgba(29,127,255,0.35)' }}>
            🧠 Get your own intelligence briefing
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase', color:'#4A6280', marginBottom:8 }}>
        {icon} {title}
      </div>
      <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:16 }}>
        {children}
      </div>
    </div>
  );
}
