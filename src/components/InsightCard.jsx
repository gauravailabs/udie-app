import React from 'react';
import { MODES } from '../logic/ai.js';

export function UrgencyBadge({ urgency }) {
  const labels = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };
  return <span className={`badge badge-${urgency}`}>{labels[urgency] || urgency}</span>;
}

export function ModeBadge({ mode }) {
  const m = MODES[mode];
  if (!m) return null;
  return (
    <span className="badge badge-mode" style={{ background:`${m.color}15`, color:m.color, borderColor:`${m.color}30` }}>
      {m.icon} {m.label}
    </span>
  );
}

export default function InsightCard({ insight, onClick, style = {}, delay = 0 }) {
  if (!insight) return null;
  const isRisk = insight.opportunity_or_risk === 'risk';
  const isOpp  = insight.opportunity_or_risk === 'opportunity';

  return (
    <div className="insight-card card-pressable"
      style={{ animationDelay: `${delay}ms`, borderLeft:`3px solid ${isRisk ? 'var(--red)' : isOpp ? 'var(--green)' : 'var(--blue)'}`, ...style }}
      onClick={() => onClick?.(insight)}>
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, letterSpacing:'-0.02em', color:'var(--text)', lineHeight:1.3, marginBottom:6 }}>
            {insight.title}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            <UrgencyBadge urgency={insight.urgency} />
            {insight.mode && <ModeBadge mode={insight.mode} />}
          </div>
        </div>
      </div>

      {/* Signal */}
      <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5, marginBottom:10 }}>
        {insight.signal}
      </div>

      {/* Timeframe */}
      {insight.urgency_timeframe && (
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text3)' }}>
          <span>⏱</span>
          <span>{insight.urgency_timeframe}</span>
          {insight.confidence && (
            <>
              <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--text3)', display:'inline-block' }}/>
              <span>{insight.confidence} confidence</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
