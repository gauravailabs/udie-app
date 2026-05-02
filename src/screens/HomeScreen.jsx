import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { generateHomeScan, loadInsightsLocally, saveInsightLocally, getLastScanTime, markScanTime, MODES } from '../logic/ai.js';
import InsightCard from '../components/InsightCard.jsx';
import { RefreshCw, Zap } from 'lucide-react';

const SCAN_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function HomeScreen({ navigate }) {
  const { profile, user } = useAuth();
  const userId = user?.id;

  const [insights,    setInsights]    = useState([]);
  const [scanning,    setScanning]    = useState(false);
  const [activeMode,  setActiveMode]  = useState('all');
  const [scanError,   setScanError]   = useState('');

  useEffect(() => {
    // Always load from cache first — never auto-scan if we have data
    const cached = loadInsightsLocally(userId);
    if (cached.length > 0) {
      setInsights(cached);
      return; // ← STOP HERE. Do not auto-scan if we have any insights.
    }

    // Only auto-scan if: cache is empty AND last scan was 24h+ ago
    const lastScan = getLastScanTime(userId);
    const hoursSince = (Date.now() - lastScan) / (1000 * 60 * 60);
    if (hoursSince >= 24 || lastScan === 0) {
      runScan();
    }
  }, [userId]);

  const runScan = async () => {
    if (scanning) return;
    setScanning(true);
    setScanError('');
    try {
      const results = await generateHomeScan(profile);
      if (results.length > 0) {
        // Merge new results with existing cache — don't overwrite
        const existing = loadInsightsLocally(userId);
        const merged   = [...results, ...existing.filter(e => !results.find(r => r.id === e.id))].slice(0, 100);
        setInsights(merged);
        // Save each new insight
        results.forEach(r => saveInsightLocally(r, userId));
        markScanTime(userId);
      }
    } catch (e) {
      console.error('Scan failed:', e);
      setScanError(e.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const filtered = activeMode === 'all'
    ? insights
    : insights.filter(i => i.mode === activeMode || activeMode === `${i.urgency}-filter`);

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
          <button onClick={runScan} disabled={scanning}
            title="Refresh intelligence"
            style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', padding:'8px', cursor: scanning ? 'not-allowed' : 'pointer', color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', opacity: scanning ? 0.6 : 1 }}>
            <RefreshCw size={15} style={{ animation: scanning ? 'spin 1s linear infinite' : 'none' }}/>
          </button>
        </div>
        <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>
          {scanning
            ? 'Scanning for latest intelligence…'
            : `${insights.length} insight${insights.length !== 1 ? 's' : ''} saved · tap ↻ to refresh`}
        </div>
      </div>

      {/* Priority strips */}
      {insights.length > 0 && (
        <div style={{ padding:'0 14px 10px', flexShrink:0 }}>
          <div className="priority-strip">
            <div className="priority-item"
              style={{ borderColor:'rgba(255,77,106,0.20)', cursor:'pointer' }}
              onClick={() => setActiveMode(activeMode === 'high-filter' ? 'all' : 'high-filter')}>
              <div className="priority-count" style={{ color:'var(--red)' }}>{high}</div>
              <div className="priority-label" style={{ color:'var(--red)' }}>Critical</div>
            </div>
            <div className="priority-item"
              style={{ borderColor:'rgba(255,181,71,0.20)', cursor:'pointer' }}
              onClick={() => setActiveMode('all')}>
              <div className="priority-count" style={{ color:'var(--amber)' }}>{medium}</div>
              <div className="priority-label" style={{ color:'var(--amber)' }}>Emerging</div>
            </div>
            <div className="priority-item"
              style={{ borderColor:'rgba(0,214,143,0.20)' }}>
              <div className="priority-count" style={{ color:'var(--green)' }}>{low}</div>
              <div className="priority-label" style={{ color:'var(--green)' }}>Monitor</div>
            </div>
          </div>
        </div>
      )}

      {/* Mode filter pills */}
      <div className="modes-scroll" style={{ paddingBottom:10 }}>
        <button className={`mode-pill ${activeMode==='all'?'active':''}`} onClick={() => setActiveMode('all')}>
          <span className="mode-pill-icon">⚡</span>
          <span className="mode-pill-label">All</span>
        </button>
        {Object.values(MODES).map(m => (
          <button key={m.id}
            className={`mode-pill ${activeMode===m.id?'active':''}`}
            style={activeMode===m.id ? { borderColor:m.color, background:`${m.color}15` } : {}}
            onClick={() => setActiveMode(m.id)}>
            <span className="mode-pill-icon">{m.icon}</span>
            <span className="mode-pill-label" style={activeMode===m.id?{color:m.color}:{}}>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="content" style={{ paddingTop:4 }}>

        {/* Scan error */}
        {scanError && (
          <div className="alert alert-error" style={{ marginBottom:10 }}>
            {scanError} — <button onClick={runScan} style={{ background:'none', border:'none', color:'var(--red)', textDecoration:'underline', cursor:'pointer', fontSize:12 }}>retry</button>
          </div>
        )}

        {/* Skeleton loading */}
        {scanning && insights.length === 0 && (
          [0,1,2].map(i => (
            <div key={i} className="skeleton" style={{ height:110, marginBottom:10, animationDelay:`${i*0.15}s` }}/>
          ))
        )}

        {/* Empty state */}
        {!scanning && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🧠</div>
            <div className="empty-title">No intelligence yet</div>
            <div className="empty-desc">
              {activeMode !== 'all'
                ? 'No insights in this category. Switch to All or ask a question in Intelligence tab.'
                : 'Tap the refresh button to generate your first intelligence briefing.'}
            </div>
            {activeMode === 'all' && (
              <button className="btn btn-primary" style={{ marginTop:20 }} onClick={runScan}>
                <Zap size={16}/> Generate Briefing
              </button>
            )}
          </div>
        )}

        {/* Insight cards */}
        {filtered
          .filter(i => activeMode !== 'high-filter' || i.urgency === 'high')
          .map((insight, idx) => (
            <InsightCard
              key={insight.id || idx}
              insight={insight}
              delay={idx * 40}
              onClick={i => navigate('detail', { insight: i })}
            />
          ))}

      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
