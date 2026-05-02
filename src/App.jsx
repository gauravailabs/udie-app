import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { ThemeProvider } from './hooks/useTheme.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import SplashScreen        from './screens/SplashScreen.jsx';
import AuthScreen          from './screens/AuthScreen.jsx';
import OnboardingScreen    from './screens/OnboardingScreen.jsx';
import HomeScreen          from './screens/HomeScreen.jsx';
import IntelligenceScreen  from './screens/IntelligenceScreen.jsx';
import InsightDetailScreen from './screens/InsightDetailScreen.jsx';
import ProfileScreen       from './screens/ProfileScreen.jsx';
import SharedInsightScreen from './screens/SharedInsightScreen.jsx';
import ResetPasswordScreen  from './screens/ResetPasswordScreen.jsx';
import { isShareUrl } from './logic/share.js';
import { LayoutDashboard, BrainCircuit, User } from 'lucide-react';
import './index.css';

// If URL has ?share= param, show public view without login
const isShareLink = isShareUrl();
// Password reset email from Supabase — detect by hash params
const isResetLink = window.location.hash.includes('access_token') ||
                    window.location.hash.includes('reset-password') ||
                    window.location.hash.includes('error=access_denied') ||
                    window.location.hash.includes('otp_expired');

function TabBar({ active, onChange }) {
  const tabs = [
    { id:'home',         label:'Dashboard',   icon:<LayoutDashboard size={18}/> },
    { id:'intelligence', label:'Intelligence', icon:<BrainCircuit size={18}/> },
    { id:'profile',      label:'Profile',      icon:<User size={18}/> },
  ];
  return (
    <div className="tab-bar">
      {tabs.map(t => (
        <button key={t.id} className={`tab-item ${active===t.id?'active':''}`} onClick={() => onChange(t.id)}>
          <div className="tab-icon">{t.icon}</div>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function Router() {
  const { user, loading, profile } = useAuth();
  const [splash, setSplash]       = useState(true);
  const [tab, setTab]             = useState('home');
  const [screen, setScreen]       = useState(null);
  const [screenParams, setScreenParams] = useState({});
  const [history, setHistory]     = useState([]);

  const navigate = (to, params = {}) => {
    if (to === -1) {
      if (history.length > 0) {
        const prev = history[history.length - 1];
        setHistory(h => h.slice(0,-1));
        setScreen(prev.screen);
        setScreenParams(prev.params);
      } else { setScreen(null); }
      return;
    }
    if (['home','intelligence','profile'].includes(to)) {
      setScreen(null); setHistory([]); setTab(to);
    } else {
      setHistory(h => [...h, { screen, params: screenParams }]);
      setScreen(to); setScreenParams(params);
    }
    window.scrollTo(0,0);
  };

  if (splash)  return <SplashScreen onDone={() => setSplash(false)} />;
  if (loading) return (
    <div style={{ height:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <div style={{ width:48,height:48,background:'linear-gradient(135deg,#0A1E5E,#1D7FFF,#00D68F)',clipPath:'polygon(50% 0%,93.3% 25%,93.3% 75%,50% 100%,6.7% 75%,6.7% 25%)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>🧠</div>
      <div style={{ display:'flex', gap:6 }}>
        {[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:'50%',background:['#1D7FFF','#6366F1','#00D68F'][i],animation:'loaderBounce 1.2s ease-in-out infinite',animationDelay:`${i*0.18}s` }}/>)}
      </div>
      <style>{`@keyframes loaderBounce{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1.4);opacity:1}}`}</style>
    </div>
  );

  if (!user) return <div className="app-root"><AuthScreen /></div>;
  if (!profile) return <div className="app-root"><OnboardingScreen /></div>;

  // Detail screens — no tab bar
  if (screen === 'detail') return (
    <div className="app-root">
      <InsightDetailScreen navigate={navigate} insight={screenParams.insight} />
    </div>
  );

  const tabScreens = {
    home:         <HomeScreen navigate={navigate} />,
    intelligence: <IntelligenceScreen navigate={navigate} />,
    profile:      <ProfileScreen navigate={navigate} />,
  };

  return (
    <div className="app-root" style={{ display:'flex', flexDirection:'column' }}>
      <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
        {tabScreens[tab]}
      </div>
      <TabBar active={tab} onChange={navigate} />
    </div>
  );
}

export default function App() {
  // Public share links bypass auth entirely
  if (isShareLink) return <ThemeProvider><SharedInsightScreen /></ThemeProvider>;
  if (isResetLink)  return <ThemeProvider><ResetPasswordScreen /></ThemeProvider>;

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ThemeProvider>
  );
}
