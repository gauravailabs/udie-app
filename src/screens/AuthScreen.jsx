import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { isConfigured } from '../db/supabase.js';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [tab,     setTab]     = useState('signin');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const switchTab = (t) => { setTab(t); setError(''); setSuccess(''); };

  const handle = async () => {
    const e = email.trim();
    if (!e)          { setError('Enter your email address'); return; }
    if (!e.includes('@')) { setError('Enter a valid email address'); return; }
    if (pass.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true); setError(''); setSuccess('');
    try {
      if (tab === 'signup') {
        const { error: err } = await signUp({ email: e, password: pass });
        if (err) throw err;
        setSuccess('Account created! You can now sign in.');
        setTab('signin');
      } else {
        const { user, error: err } = await signIn({ email: e, password: pass });
        if (err) throw err;
        // App.jsx will re-render automatically when user state changes
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      {/* Logo */}
      <div className="auth-logo">🧠</div>

      <div className="auth-title">
        {tab === 'signin' ? 'Welcome back' : 'Get started'}
      </div>
      <div className="auth-subtitle">
        {tab === 'signin'
          ? 'Sign in to your intelligence dashboard'
          : 'Create your account to unlock UDIE'}
      </div>

      {/* Tab Toggle */}
      <div className="auth-tab-row">
        <button className={`auth-tab ${tab==='signin'?'active':''}`} onClick={() => switchTab('signin')}>Sign In</button>
        <button className={`auth-tab ${tab==='signup'?'active':''}`} onClick={() => switchTab('signup')}>Create Account</button>
      </div>

      {/* Feedback */}
      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Email */}
      <div className="input-group">
        <div className="input-label">Email address</div>
        <input className="input" type="email" placeholder="you@company.com"
          value={email} autoCapitalize="none" autoCorrect="off"
          onChange={e => { setEmail(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && !loading && handle()} />
      </div>

      {/* Password */}
      <div className="input-group">
        <div className="input-label">Password</div>
        <div style={{ position:'relative' }}>
          <input className="input" type={showPw ? 'text' : 'password'}
            placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
            value={pass} style={{ paddingRight:44 }}
            onChange={e => { setPass(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && !loading && handle()} />
          <button onClick={() => setShowPw(v => !v)}
            style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', padding:0, display:'flex' }}>
            {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        </div>
      </div>

      {/* Submit */}
      <button className="btn btn-primary" style={{ marginTop:8 }}
        onClick={handle} disabled={loading || !email.trim() || !pass}>
        {loading ? (
          <span style={{ display:'flex', gap:5 }}>
            {[0,1,2].map(i=>(
              <span key={i} style={{ width:7,height:7,borderRadius:'50%',background:'rgba(255,255,255,0.8)',display:'inline-block',animation:'bounce 1.2s ease-in-out infinite',animationDelay:`${i*0.18}s` }}/>
            ))}
          </span>
        ) : (
          <>{tab === 'signin' ? 'Sign In' : 'Create Account'}<ArrowRight size={16}/></>
        )}
      </button>

      {/* Only show demo notice when Supabase is genuinely not configured */}
      {!isConfigured() && (
        <div style={{ marginTop:16, padding:'12px 14px', background:'var(--blue-bg)', border:'1px solid var(--border2)', borderRadius:'var(--r-md)', fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>
          <strong style={{ color:'var(--blue2)' }}>Demo mode:</strong> No Supabase configured. Use any email + password (6+ chars) to continue.
        </div>
      )}

      <div style={{ marginTop:'auto', paddingTop:24, textAlign:'center', fontSize:11, color:'var(--text3)', lineHeight:1.7 }}>
        🔒 Secured by Supabase · End-to-end encrypted
      </div>

      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1.4);opacity:1}}`}</style>
    </div>
  );
}
