import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { generateHomeScan, loadInsightsLocally, MODES } from '../logic/ai.js';
import InsightCard from '../components/InsightCard.jsx';
import { RefreshCw, Zap } from 'lucide-react';

export default function HomeScreen({ navigate }) {
  const { profile, user } = useAuth();
  const [insights, setInsights]   = useState([]);
  const [scanning, setScanning]   = useState(false);
  const [activeMode, setActiveMode] = useState('all');

  useEffect(() => {
    // Load cached insights first
    const cached = loadInsightsLocally();
    if (cached.length > 0) {
      setInsights(cached);
    } else {
      runScan();
    }
  }, []);

  const runScan = async () => {
    setScanning(true);
    try {
      const results = await generateHomeScan(profile);
      if (results.length > 0) {
        const cached = loadInsightsLocally();
        const combined = [...results, ...cached.filter(c => !results.find(r => r.id === c.id))].slice(0, 20);
        setInsights(combined);
        localStorage.setItem('udie_insights', JSON.stringify(combined));
      }
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setScanning(false);
    }
  };

  const filtered = activeMode === 'all' ? insights : insights.filter(i => i.mode === activeMode);
  const high   = insights.filter(i => i.urgency === 'high').length;
  const medium = insights.filter(i => i.urgency === 'medium').length;
  const low    = insights.filter(i => i.urgency === 'low').length;

  const firstName = profile?.company_name || user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="screen">
      {/* Header */}
      <div className="home-header">
        <div className="greeting">{greeting},</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div className="greeting-name">{firstName}</div>
          <button onClick={runScan} disabled={scanning}
            style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'8px', cursor:'pointer', color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
            <RefreshCw size={16} className={scanning ? 'spin' : ''} style={{ animation: scanning ? 'spin 1s linear infinite' : 'none' }}/>
          </button>
        </div>
        <div style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>
          {scanning ? 'Scanning for intelligence…' : `${insights.length} intelligence signals`}
        </div>
      </div>

      {/* Priority strips */}
      {insights.length > 0 && (
        <div style={{ padding:'0 16px 12px', flexShrink:0 }}>
          <div className="priority-strip">
            <div className="priority-item" onClick={() => setActiveMode(activeMode === 'high-filter' ? 'all' : 'high-filter')}
              style={{ borderColor: 'rgba(239,68,68,0.20)' }}>
              <div className="priority-count" style={{ color:'var(--red)' }}>{high}</div>
              <div className="priority-label" style={{ color:'var(--red)' }}>Critical</div>
            </div>
            <div className="priority-item" onClick={() => setActiveMode('all')}
              style={{ borderColor:'rgba(245,158,11,0.20)' }}>
              <div className="priority-count" style={{ color:'var(--amber)' }}>{medium}</div>
              <div className="priority-label" style={{ color:'var(--amber)' }}>Emerging</div>
            </div>
            <div className="priority-item"
              style={{ borderColor:'rgba(34,197,94,0.20)' }}>
              <div className="priority-count" style={{ color:'var(--green)' }}>{low}</div>
              <div className="priority-label" style={{ color:'var(--green)' }}>Monitor</div>
            </div>
          </div>
        </div>
      )}

      {/* Mode filter */}
      <div className="modes-scroll" style={{ paddingBottom:12 }}>
        <button className={`mode-pill ${activeMode==='all'?'active':''}`} onClick={() => setActiveMode('all')}>
          <span className="mode-pill-icon">⚡</span>
          <span className="mode-pill-label">All</span>
        </button>
        {Object.values(MODES).map(m => (
          <button key={m.id} className={`mode-pill ${activeMode===m.id?'active':''}`}
            style={activeMode===m.id ? { borderColor:m.color, background:`${m.color}15` } : {}}
            onClick={() => setActiveMode(m.id)}>
            <span className="mode-pill-icon">{m.icon}</span>
            <span className="mode-pill-label" style={activeMode===m.id ? { color:m.color } : {}}>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="content" style={{ paddingTop:4 }}>

        {scanning && insights.length === 0 && (
          <>
            {[0,1,2].map(i => (
              <div key={i} className="skeleton" style={{ height:110, marginBottom:12, animationDelay:`${i*0.15}s` }} />
            ))}
          </>
        )}

        {!scanning && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🧠</div>
            <div className="empty-title">No intelligence yet</div>
            <div className="empty-desc">Tap the refresh button to scan for insights, or ask a question in the Intelligence tab.</div>
            <button className="btn btn-primary" style={{ marginTop:20 }} onClick={runScan}>
              <Zap size={16}/> Generate Intelligence Briefing
            </button>
          </div>
        )}

        {filtered
          .filter(i => activeMode !== 'high-filter' || i.urgency === 'high')
          .map((insight, idx) => (
            <InsightCard
              key={insight.id || idx}
              insight={insight}
              delay={idx * 60}
              onClick={i => navigate('detail', { insight: i })}
            />
          ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
