import React, { useState, useEffect } from 'react';
import { supabase } from '../db/supabase.js';
import { Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ResetPasswordScreen() {
  const [pass,     setPass]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    // Check for error in hash (expired/invalid token from Supabase)
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const desc = params.get('error_description') || 'Reset link is invalid or expired.';
      setTokenError(desc.replace(/\+/g, ' '));
    }
  }, []);

  const handleReset = async () => {
    if (pass.length < 6)      { setError('Password must be at least 6 characters'); return; }
    if (pass !== confirm)     { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const { error: e } = await supabase.auth.updateUser({ password: pass });
      if (e) throw e;
      setDone(true);
      // Redirect to sign-in after 3 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (e) {
      setError(e.message || 'Failed to reset password. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100dvh', background:'#03080F', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        {/* Logo */}
        <div style={{ width:52, height:52, background:'linear-gradient(135deg,#0A1E5E,#1D7FFF,#00D68F)', clipPath:'polygon(50% 0%,93.3% 25%,93.3% 75%,50% 100%,6.7% 75%,6.7% 25%)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:24 }}>
          🧠
        </div>

        {tokenError ? (
          /* Token expired / invalid */
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:'#F2F5FF', marginBottom:8 }}>Link Expired</div>
            <div style={{ fontSize:14, color:'#8BA3C7', marginBottom:20, lineHeight:1.5 }}>
              {tokenError}
            </div>
            <div style={{ padding:'12px 14px', background:'rgba(255,77,106,0.10)', border:'1px solid rgba(255,77,106,0.25)', borderRadius:12, fontSize:13, color:'#FF4D6A', marginBottom:20, lineHeight:1.5 }}>
              Password reset links expire after 1 hour. Please request a new one from the Profile page.
            </div>
            <a href="/" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#1D7FFF', color:'#fff', padding:'14px', borderRadius:14, textDecoration:'none', fontWeight:600, fontSize:15, boxShadow:'0 4px 20px rgba(29,127,255,0.35)' }}>
              Back to Sign In
            </a>
          </div>
        ) : done ? (
          /* Success */
          <div style={{ textAlign:'center' }}>
            <CheckCircle2 size={52} color="#00D68F" style={{ marginBottom:16 }}/>
            <div style={{ fontSize:22, fontWeight:700, color:'#F2F5FF', marginBottom:8 }}>Password Updated!</div>
            <div style={{ fontSize:14, color:'#8BA3C7', marginBottom:20, lineHeight:1.5 }}>
              Your password has been reset successfully. Redirecting to sign in…
            </div>
            <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#1D7FFF', color:'#fff', padding:'12px 24px', borderRadius:14, textDecoration:'none', fontWeight:600, fontSize:14 }}>
              Go to Sign In
            </a>
          </div>
        ) : (
          /* Reset form */
          <>
            <div style={{ fontSize:26, fontWeight:700, letterSpacing:'-.04em', color:'#F2F5FF', marginBottom:6 }}>Set New Password</div>
            <div style={{ fontSize:14, color:'#8BA3C7', marginBottom:28, lineHeight:1.5 }}>
              Choose a strong password for your account.
            </div>

            {error && (
              <div style={{ padding:'11px 14px', background:'rgba(255,77,106,0.10)', border:'1px solid rgba(255,77,106,0.25)', borderRadius:12, fontSize:13, color:'#FF4D6A', marginBottom:14 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#8BA3C7', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:6 }}>New Password</div>
              <div style={{ position:'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={pass}
                  onChange={e => { setPass(e.target.value); setError(''); }}
                  style={{ width:'100%', background:'#111827', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:12, padding:'13px 44px 13px 15px', fontSize:15, color:'#F2F5FF', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor='#1D7FFF'}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'}
                />
                <button onClick={() => setShowPw(v=>!v)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#4A6280', cursor:'pointer', display:'flex' }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#8BA3C7', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:6 }}>Confirm Password</div>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Repeat your new password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                style={{ width:'100%', background:'#111827', border:`1.5px solid ${confirm && confirm !== pass ? '#FF4D6A' : 'rgba(255,255,255,0.12)'}`, borderRadius:12, padding:'13px 15px', fontSize:15, color:'#F2F5FF', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                onFocus={e => e.target.style.borderColor='#1D7FFF'}
                onBlur={e => e.target.style.borderColor = confirm && confirm !== pass ? '#FF4D6A' : 'rgba(255,255,255,0.12)'}
              />
              {confirm && confirm !== pass && (
                <div style={{ fontSize:12, color:'#FF4D6A', marginTop:5 }}>Passwords don't match</div>
              )}
            </div>

            <button onClick={handleReset} disabled={loading || !pass || !confirm}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, background: loading || !pass || !confirm ? '#1C2536' : '#1D7FFF', color: loading || !pass || !confirm ? '#4A6280' : '#fff', padding:'15px', borderRadius:14, border:'none', fontSize:15, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit', transition:'all .18s', boxShadow: !loading && pass && confirm ? '0 4px 20px rgba(29,127,255,0.35)' : 'none' }}>
              {loading ? (
                <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
              ) : (
                <><ArrowRight size={16}/> Update Password</>
              )}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
