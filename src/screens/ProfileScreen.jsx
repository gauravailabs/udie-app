import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme.jsx';
import { loadInsightsLocally } from '../logic/ai.js';
import { isConfigured, supabase } from '../db/supabase.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import {
  ChevronRight, Building2, LogOut, Trash2,
  Settings, Key, Bell, Shield, Camera, Mail,
  Sun, Moon, CheckCircle2, ArrowLeft
} from 'lucide-react';

export default function ProfileScreen({ navigate }) {
  const { user, profile, signOut, saveProfile } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const fileRef = useRef();

  const [subScreen, setSubScreen] = useState(null); // 'edit'|'password'

  // Edit profile state
  const [form, setForm]     = useState({ ...profile });
  const [logo, setLogo]     = useState(profile?.logo || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Password reset state
  const [pwEmail, setPwEmail]   = useState(user?.email || '');
  const [pwSent, setPwSent]     = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError]   = useState('');

  const insights = loadInsightsLocally(user?.id);
  const email    = user?.email || '';
  const initials = (profile?.company_name || email)?.[0]?.toUpperCase() || 'U';

  // ── Logo upload ──────────────────────────────────────────────────────────────
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Save profile ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    await saveProfile({ ...form, logo });
    setSaving(false); setSaved(true);
    setTimeout(() => { setSaved(false); setSubScreen(null); }, 1200);
  };

  // ── Password reset ────────────────────────────────────────────────────────────
  const handlePasswordReset = async () => {
    if (!pwEmail.trim() || !pwEmail.includes('@')) {
      setPwError('Enter a valid email address'); return;
    }
    setPwLoading(true); setPwError('');
    try {
      if (isConfigured()) {
        const { error } = await supabase.auth.resetPasswordForEmail(pwEmail.trim(), {
          redirectTo: (import.meta.env.VITE_APP_URL || window.location.origin) + '/reset-password',
        });
        if (error) throw error;
        setPwSent(true);
      } else {
        // Demo mode — simulate email sent
        await new Promise(r => setTimeout(r, 800));
        setPwSent(true);
      }
    } catch (e) {
      setPwError(e.message || 'Failed to send reset email. Try again.');
    } finally {
      setPwLoading(false);
    }
  };

  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try { await signOut(); } catch {}
    // App.jsx will redirect to AuthScreen once user state clears
    // If it doesn't within 2s, force reload
    setTimeout(() => {
      if (window.location.pathname !== '/') window.location.reload();
    }, 2000);
  };

  const handleClearInsights = () => {
    if (!confirm('Clear all saved insights? This cannot be undone.')) return;
    try {
      const key = `udie_insights_${user?.id || 'guest'}`;
      localStorage.removeItem(key);
      localStorage.removeItem(`udie_last_scan_${user?.id || 'guest'}`);
    } catch {}
    window.location.reload();
  };

  // ── SUB-SCREEN: Edit Profile ─────────────────────────────────────────────────
  if (subScreen === 'edit') return (
    <div className="screen">
      <div className="header">
        <button className="header-back" onClick={() => { setSubScreen(null); setSaved(false); }}>
          <ArrowLeft size={16}/>
        </button>
        <div style={{ flex:1 }}>
          <div className="header-title">Edit Profile</div>
        </div>
        <button className="btn btn-sm btn-primary" style={{ width:'auto', padding:'8px 16px' }}
          onClick={handleSave} disabled={saving}>
          {saving ? '…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
      <div className="content">
        {/* Logo */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0 24px' }}>
          <div style={{ position:'relative' }} onClick={() => fileRef.current?.click()}>
            {logo
              ? <img src={logo} alt="logo" style={{ width:88, height:88, borderRadius:22, objectFit:'cover', border:'2px solid var(--border2)', cursor:'pointer' }}/>
              : (
                <div className="profile-avatar" style={{ width:88, height:88, fontSize:32, borderRadius:22 }}>
                  {initials}
                </div>
              )
            }
            <div style={{ position:'absolute', bottom:-4, right:-4, width:28, height:28, borderRadius:'50%', background:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
              <Camera size={14} color="#fff"/>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoChange}/>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:10 }}>Tap to change logo</div>
          {logo && (
            <button onClick={() => setLogo(null)} style={{ marginTop:6, background:'none', border:'none', color:'var(--red)', fontSize:12, cursor:'pointer' }}>
              Remove photo
            </button>
          )}
        </div>

        {[
          { key:'company_name', label:'Company Name',   placeholder:'Your company name' },
          { key:'industry',     label:'Industry',       placeholder:'e.g. Healthcare' },
          { key:'stage',        label:'Company Stage',  placeholder:'e.g. Growth Stage' },
          { key:'geography',    label:'Geography',      placeholder:'e.g. India' },
        ].map(f => (
          <div key={f.key} className="input-group">
            <div className="input-label">{f.label}</div>
            <input className="input" placeholder={f.placeholder}
              value={form[f.key] || ''}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          </div>
        ))}

        <div className="input-group">
          <div className="input-label">Strategic Priorities</div>
          <textarea className="input" rows={3}
            placeholder="Your top strategic priorities…"
            value={form.priorities || ''}
            onChange={e => setForm(p => ({ ...p, priorities: e.target.value }))} />
        </div>

        <div className="input-group">
          <div className="input-label">Key Challenges</div>
          <textarea className="input" rows={2}
            placeholder="Current business challenges…"
            value={form.challenges || ''}
            onChange={e => setForm(p => ({ ...p, challenges: e.target.value }))} />
        </div>
      </div>
    </div>
  );

  // ── SUB-SCREEN: Reset Password ───────────────────────────────────────────────
  if (subScreen === 'password') return (
    <div className="screen">
      <div className="header">
        <button className="header-back" onClick={() => { setSubScreen(null); setPwSent(false); setPwError(''); }}>
          <ArrowLeft size={16}/>
        </button>
        <div className="header-title">Reset Password</div>
      </div>
      <div className="content">
        {pwSent ? (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <CheckCircle2 size={52} color="var(--green)" style={{ margin:'0 auto 16px', display:'block' }}/>
            <div style={{ fontSize:20, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Email Sent!</div>
            <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.6, marginBottom:24 }}>
              We've sent a password reset link to<br/>
              <strong style={{ color:'var(--text)' }}>{pwEmail}</strong>
            </div>
            <div style={{ fontSize:13, color:'var(--text3)', background:'var(--surface)', borderRadius:'var(--r-md)', padding:'12px 16px', marginBottom:24, lineHeight:1.5 }}>
              Click the link in the email to set a new password. After resetting, you'll be taken back to the sign-in screen.
            </div>
            {!isConfigured() && (
              <div className="alert alert-info" style={{ textAlign:'left' }}>
                <strong>Demo mode:</strong> No real email sent. In production with Supabase configured, users receive a real reset link.
              </div>
            )}
            <button className="btn btn-secondary" onClick={() => { setSubScreen(null); setPwSent(false); }}>
              Back to Profile
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding:'8px 0 24px' }}>
              <div style={{ width:56, height:56, borderRadius:16, background:'var(--blue-bg)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                <Key size={24} color="var(--blue-light)"/>
              </div>
              <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-.03em', marginBottom:6 }}>Reset Password</div>
              <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.5 }}>
                Enter your email and we'll send a secure reset link.
              </div>
            </div>

            {pwError && <div className="alert alert-error">{pwError}</div>}

            <div className="input-group">
              <div className="input-label">Email Address</div>
              <div style={{ position:'relative' }}>
                <Mail size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }}/>
                <input className="input" type="email" style={{ paddingLeft:40 }}
                  placeholder="you@company.com"
                  value={pwEmail}
                  onChange={e => { setPwEmail(e.target.value); setPwError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordReset()} />
              </div>
            </div>

            <button className="btn btn-primary" onClick={handlePasswordReset} disabled={pwLoading || !pwEmail.trim()} style={{ marginTop:8 }}>
              {pwLoading ? (
                <span style={{ display:'flex', gap:5 }}>
                  {[0,1,2].map(i=><span key={i} style={{ width:7,height:7,borderRadius:'50%',background:'rgba(255,255,255,0.8)',display:'inline-block',animation:'bounce 1.2s ease-in-out infinite',animationDelay:`${i*0.18}s` }}/>)}
                </span>
              ) : (
                <><Mail size={16}/> Send Reset Link</>
              )}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1.4);opacity:1}}`}</style>
    </div>
  );

  // ── MAIN PROFILE SCREEN ──────────────────────────────────────────────────────
  return (
    <div className="screen">
      <div className="header">
        <div style={{ flex:1 }}>
          <div className="header-title">Profile</div>
        </div>
        <ThemeToggle />
      </div>

      <div className="content">
        {/* Avatar + company */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 0 28px', gap:12 }}>
          {profile?.logo
            ? <img src={profile.logo} alt="logo" style={{ width:80, height:80, borderRadius:20, objectFit:'cover', border:'2px solid var(--border2)' }}/>
            : (
              <div className="profile-avatar" onClick={() => setSubScreen('edit')}>
                {initials}
              </div>
            )
          }
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-.04em', color:'var(--text)' }}>
              {profile?.company_name || 'Your Company'}
            </div>
            <div style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>{email}</div>
            {profile?.industry && (
              <div style={{ fontSize:12, color:'var(--blue-light)', background:'var(--blue-bg)', padding:'3px 12px', borderRadius:'var(--r-full)', marginTop:8, display:'inline-block' }}>
                {profile.industry}{profile.geography ? ` · ${profile.geography}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
          {[
            { label:'Insights Generated', value: insights.length, color:'var(--blue-light)' },
            { label:'High Priority',      value: insights.filter(i=>i.urgency==='high').length, color:'var(--red)' },
          ].map((s,i) => (
            <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:'16px', textAlign:'center', boxShadow:'var(--card-shadow)' }}>
              <div style={{ fontSize:30, fontWeight:700, letterSpacing:'-.05em', color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:4, fontWeight:600, letterSpacing:'.03em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Account settings */}
        <div className="section-title">Account</div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', overflow:'hidden', boxShadow:'var(--card-shadow)', marginBottom:10 }}>
          {[
            {
              icon:<Building2 size={16} color="var(--blue-light)"/>, iconBg:'var(--blue-bg)',
              label:'Company Profile', sub:'Update company info & logo',
              action:() => setSubScreen('edit'),
            },
            {
              icon:<Key size={16} color="var(--purple)"/>, iconBg:'var(--purple-bg)',
              label:'Reset Password', sub:'Send reset link to your email',
              action:() => setSubScreen('password'),
            },
            {
              icon: theme==='dark'?<Moon size={16} color="var(--blue-light)"/>:<Sun size={16} color="var(--amber)"/>,
              iconBg: theme==='dark'?'var(--blue-bg)':'var(--amber-bg)',
              label: theme==='dark'?'Dark Mode':'Light Mode',
              sub:'Tap toggle to switch',
              action: null,
              right: <ThemeToggle />,
            },
          ].map((item, i, arr) => (
            <div key={i} onClick={item.action || undefined}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor: item.action ? 'pointer' : 'default', borderBottom: i<arr.length-1?'1px solid var(--border)':'none', transition:'background .15s' }}
              onMouseEnter={e => { if(item.action) e.currentTarget.style.background='var(--surface2)'; }}
              onMouseLeave={e => e.currentTarget.style.background=''}>
              <div className="list-icon" style={{ background:item.iconBg }}>{item.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{item.label}</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{item.sub}</div>
              </div>
              {item.right || <ChevronRight size={15} color="var(--text3)"/>}
            </div>
          ))}
        </div>

        {/* Danger zone */}
        <div className="section-title">Data</div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', overflow:'hidden', boxShadow:'var(--card-shadow)', marginBottom:10 }}>
          <div onClick={handleClearInsights}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer', borderBottom:'1px solid var(--border)' }}>
            <div className="list-icon" style={{ background:'var(--amber-bg)' }}><Trash2 size={16} color="var(--amber)"/></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>Clear Insight History</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{insights.length} insights saved</div>
            </div>
            <ChevronRight size={15} color="var(--text3)"/>
          </div>
          <div onClick={handleSignOut}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor: signingOut ? 'not-allowed' : 'pointer', opacity: signingOut ? 0.6 : 1, transition:'opacity .2s' }}>
            <div className="list-icon" style={{ background:'var(--red-bg)' }}>
              {signingOut
                ? <div style={{ width:16, height:16, border:'2px solid var(--red)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                : <LogOut size={16} color="var(--red)"/>
              }
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--red)' }}>{signingOut ? 'Signing out…' : 'Sign Out'}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Signed in as {email}</div>
            </div>
            {!signingOut && <ChevronRight size={15} color="var(--text3)"/>}
          </div>
        </div>

        <div style={{ textAlign:'center', fontSize:11, color:'var(--text3)', paddingTop:4, lineHeight:1.8 }}>
          UDIE — Unified Decision Intelligence Engine<br/>
          Powered by Claude AI
        </div>
      </div>
    </div>
  );
}
