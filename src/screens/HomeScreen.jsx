import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { loadInsightsLocally, MODES } from '../logic/ai.js';
import InsightCard from '../components/InsightCard.jsx';
import { BrainCircuit } from 'lucide-react';

export default function HomeScreen({ navigate }) {
  const { profile, user } = useAuth();
  const userId = user?.id;

  const [insights,   setInsights]   = useState([]);
  const [activeMode, setActiveMode] = useState('all');

  // Bug 1 & 2 fix: NEVER auto-scan. Only load from cache.
  // New accounts start empty → prompt user to use Intelligence tab.
  useEffect(() => {
    if (!userId) return;
    const cached = loadInsightsLocally(userId);
    setInsights(cached);
  }, [userId]);

  const filtered = activeMode === 'all'
    ? insights
    : activeMode === 'high-filter'
    ? insights.filter(i => i.urgency === 'high')
    : insights.filter(i => i.mode === activeMode);

  const high   = insights.filter(i => i.urgency === 'high').length;
  const medium = insights.filter(i => i.urgency === 'medium').length;
  const low    = insights.filter(i => i.urgency === 'low').length;

  const firstName = profile?.company_name || user?.email?.split('@')[0] || 'there';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="screen">
      {/* Header */}
      <div className="home-header">
        <div className="greeting">{greeting},</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div className="greeting-name">{firstName}</div>
        </div>
        <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>
          {insights.length > 0
            ? `${insights.length} insight${insights.length !== 1 ? 's' : ''} saved`
            : 'Ask a question to generate your first insight'}
        </div>
      </div>

      {/* Priority strips — only show when there are insights */}
      {insights.length > 0 && (
        <div style={{ padding:'0 14px 10px', flexShrink:0 }}>
          <div className="priority-strip">
            <div className="priority-item"
              style={{ borderColor:'rgba(255,77,106,0.20)' }}
              onClick={() => setActiveMode(activeMode==='high-filter'?'all':'high-filter')}>
              <div className="priority-count" style={{ color:'var(--red)' }}>{high}</div>
              <div className="priority-label" style={{ color:'var(--red)' }}>Critical</div>
            </div>
            <div className="priority-item" style={{ borderColor:'rgba(255,181,71,0.20)' }}
              onClick={() => setActiveMode('all')}>
              <div className="priority-count" style={{ color:'var(--amber)' }}>{medium}</div>
              <div className="priority-label" style={{ color:'var(--amber)' }}>Emerging</div>
            </div>
            <div className="priority-item" style={{ borderColor:'rgba(0,214,143,0.20)' }}>
              <div className="priority-count" style={{ color:'var(--green)' }}>{low}</div>
              <div className="priority-label" style={{ color:'var(--green)' }}>Monitor</div>
            </div>
          </div>
        </div>
      )}

      {/* Mode filter — only show when there are insights */}
      {insights.length > 0 && (
        <div className="modes-scroll" style={{ paddingBottom:10 }}>
          <button className={`mode-pill ${activeMode==='all'?'active':''}`} onClick={() => setActiveMode('all')}>
            <span className="mode-pill-icon">⚡</span>
            <span className="mode-pill-label">All</span>
          </button>
          {Object.values(MODES).map(m => (
            <button key={m.id}
              className={`mode-pill ${activeMode===m.id?'active':''}`}
              style={activeMode===m.id?{borderColor:m.color,background:`${m.color}15`}:{}}
              onClick={() => setActiveMode(m.id)}>
              <span className="mode-pill-icon">{m.icon}</span>
              <span className="mode-pill-label" style={activeMode===m.id?{color:m.color}:{}}>{m.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="content" style={{ paddingTop: insights.length > 0 ? 4 : 0 }}>

        {/* Empty state — clean, prompts user to Intelligence tab */}
        {insights.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', padding:'0 24px', textAlign:'center' }}>
            <div style={{ width:72, height:72, background:'var(--blue-bg)', borderRadius:22, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, border:'1px solid var(--border2)' }}>
              <BrainCircuit size={32} color="var(--blue2)"/>
            </div>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-.04em', color:'var(--text)', marginBottom:8 }}>
              Ready for Intelligence
            </div>
            <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.6, marginBottom:28, maxWidth:280 }}>
              Ask a question in the Intelligence tab to generate your first insight. Every answer is saved here automatically.
            </div>
            <button onClick={() => navigate('intelligence')}
              style={{ display:'flex', alignItems:'center', gap:8, background:'var(--blue)', color:'#fff', border:'none', borderRadius:'var(--r-lg)', padding:'13px 24px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)', boxShadow:'0 4px 20px var(--blue-glow)' }}>
              <BrainCircuit size={16}/> Go to Intelligence
            </button>
          </div>
        )}

        {/* No results in filter */}
        {insights.length > 0 && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No insights in this category</div>
            <div className="empty-desc">Switch to All or ask a question in the selected mode.</div>
          </div>
        )}

        {/* Insight cards */}
        {filtered.map((insight, idx) => (
          <InsightCard
            key={insight.id || idx}
            insight={insight}
            delay={idx * 40}
            onClick={i => navigate('detail', { insight: i })}
          />
        ))}

      </div>
    </div>
  );
}
