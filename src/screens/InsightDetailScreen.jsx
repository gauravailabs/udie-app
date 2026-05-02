import React from 'react';
import { ArrowLeft, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { UrgencyBadge, ModeBadge } from '../components/InsightCard.jsx';
import { MODES } from '../logic/ai.js';

export default function InsightDetailScreen({ navigate, insight }) {
  if (!insight) { navigate('home'); return null; }

  const isRisk = insight.opportunity_or_risk === 'risk';
  const isOpp  = insight.opportunity_or_risk === 'opportunity';
  const mode   = MODES[insight.mode];

  const urgencyColors = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--green)' };
  const accentColor = urgencyColors[insight.urgency] || 'var(--blue-light)';

  return (
    <div className="screen">
      {/* Header */}
      <div className="header">
        <button className="header-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="header-title" style={{ fontSize:15 }}>Intelligence Report</div>
          <div className="header-sub">{mode ? `${mode.icon} ${mode.label}` : 'Full Analysis'}</div>
        </div>
        <UrgencyBadge urgency={insight.urgency} />
      </div>

      <div className="content">
        {/* Title block */}
        <div style={{ background:'var(--surface)', border:`1px solid var(--border)`, borderLeft:`4px solid ${accentColor}`, borderRadius:'var(--r-xl)', padding:18, marginBottom:14 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.2, marginBottom:10, color:'var(--text)' }}>
            {insight.title}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            <UrgencyBadge urgency={insight.urgency} />
            {insight.mode && <ModeBadge mode={insight.mode} />}
            {insight.opportunity_or_risk && (
              <span className="badge" style={{ background: isOpp ? 'var(--green-bg)' : isRisk ? 'var(--red-bg)' : 'var(--blue-bg)', color: isOpp ? 'var(--green)' : isRisk ? 'var(--red)' : 'var(--blue-light)', border:'none' }}>
                {isOpp ? '📈 Opportunity' : isRisk ? '⚠️ Risk' : '⚡ Mixed'}
              </span>
            )}
          </div>
        </div>

        {/* Signal */}
        <div className="section-title">
          <TrendingUp size={11} style={{ display:'inline', marginRight:4 }} />
          The Signal
        </div>
        <div className="card">
          <div style={{ fontSize:15, color:'var(--text)', lineHeight:1.6 }}>
            {insight.signal}
          </div>
        </div>

        {/* Context */}
        <div className="section-title">
          <CheckCircle2 size={11} style={{ display:'inline', marginRight:4 }} />
          Why It Matters for You
        </div>
        <div className="card">
          <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.6 }}>
            {insight.context}
          </div>
        </div>

        {/* Impact */}
        {insight.impact?.length > 0 && (
          <>
            <div className="section-title">
              <AlertTriangle size={11} style={{ display:'inline', marginRight:4 }} />
              Business Impact
            </div>
            <div className="card">
              {insight.impact.map((item, i) => (
                <div key={i} className="impact-item">
                  <div className="impact-dot" style={{ background: i===0 ? accentColor : 'var(--text3)' }} />
                  <div>{item}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        {insight.actions?.length > 0 && (
          <>
            <div className="section-title">⚡ Recommended Actions</div>
            {insight.actions.map((a, i) => (
              <div key={i} className="action-item">
                <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div className="action-number">{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'var(--text)', lineHeight:1.4, marginBottom:6 }}>
                      {a.action}
                    </div>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                      {a.owner && (
                        <span style={{ fontSize:11, color:'var(--text3)', background:'var(--surface3)', padding:'2px 8px', borderRadius:999 }}>
                          👤 {a.owner}
                        </span>
                      )}
                      {a.timeline && (
                        <span style={{ fontSize:11, color:'var(--text3)', background:'var(--surface3)', padding:'2px 8px', borderRadius:999 }}>
                          <Clock size={9} style={{ display:'inline', marginRight:3 }} />{a.timeline}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Supporting signals */}
        {insight.supporting_signals?.length > 0 && (
          <>
            <div className="section-title">📡 Supporting Signals</div>
            <div className="card">
              {insight.supporting_signals.map((s, i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom: i < insight.supporting_signals.length-1 ? '1px solid var(--border)' : 'none', fontSize:13, color:'var(--text2)', lineHeight:1.4 }}>
                  <span style={{ color:'var(--text3)' }}>—</span>
                  {s}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Urgency timeframe */}
        {insight.urgency_timeframe && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', marginTop:4 }}>
            <Clock size={14} style={{ color:accentColor, flexShrink:0 }} />
            <div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>Time Horizon</div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginTop:2 }}>{insight.urgency_timeframe}</div>
            </div>
            {insight.confidence && (
              <div style={{ marginLeft:'auto', textAlign:'right' }}>
                <div style={{ fontSize:12, color:'var(--text3)' }}>Confidence</div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginTop:2, textTransform:'capitalize' }}>{insight.confidence}</div>
              </div>
            )}
          </div>
        )}

        <div style={{ height:24 }} />
      </div>
    </div>
  );
}
