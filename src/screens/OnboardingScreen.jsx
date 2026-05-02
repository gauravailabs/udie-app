import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { ArrowRight, Building2, Globe, Target, CheckCircle2 } from 'lucide-react';

const INDUSTRIES = ['Technology','Healthcare','Finance & Banking','Retail & E-commerce','Manufacturing','Consulting','Media & Entertainment','Education','Real Estate','Logistics','Energy','Other'];
const STAGES     = ['Pre-revenue / Idea','Early Stage (Seed)','Growth Stage (Series A/B)','Scale-up (Series C+)','Enterprise / Public','SMB (Established)'];
const GEOS       = ['India','USA','UK','Europe','Southeast Asia','Middle East','Global'];

export default function OnboardingScreen() {
  const { saveProfile } = useAuth();
  const [step,    setStep]    = useState(0);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({
    company_name: '', industry: '', stage: '',
    geography: '', priorities: '', challenges: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canNext = [
    form.company_name.trim().length > 0 && form.industry.length > 0 && form.stage.length > 0,
    form.geography.length > 0,
    form.priorities.trim().length > 0,
  ][step];

  const handleNext = async () => {
    if (step < 2) {
      setStep(s => s + 1);
      return;
    }
    // Final step — save profile
    setSaving(true);
    try {
      await saveProfile(form);
      // saveProfile calls setProfile → App.jsx shows HomeScreen automatically
    } catch (err) {
      console.error('saveProfile failed:', err);
      // Even on error, try to proceed by saving locally
      try { localStorage.setItem('udie_profile', JSON.stringify({ ...form, user_id: 'local' })); } catch {}
      window.location.reload(); // Force reload to pick up localStorage profile
    }
    // Don't setSaving(false) — component will unmount when profile is set
  };

  const steps = [
    {
      icon: <Building2 size={20} color="var(--blue2)" />,
      iconBg: 'var(--blue-bg)',
      title: 'About your company',
      desc: 'This shapes every insight we generate',
      content: (
        <>
          <div className="input-group">
            <div className="input-label">Company Name</div>
            <input className="input" placeholder="e.g. Acme Technologies"
              value={form.company_name} autoFocus
              onChange={e => set('company_name', e.target.value)} />
          </div>
          <div className="input-group">
            <div className="input-label">Industry</div>
            <select className="input" value={form.industry} onChange={e => set('industry', e.target.value)}>
              <option value="">Select industry…</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="input-group">
            <div className="input-label">Company Stage</div>
            <select className="input" value={form.stage} onChange={e => set('stage', e.target.value)}>
              <option value="">Select stage…</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </>
      ),
    },
    {
      icon: <Globe size={20} color="var(--teal)" />,
      iconBg: 'rgba(0,201,167,0.10)',
      title: 'Operating geography',
      desc: 'Where you operate & compete',
      content: (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {GEOS.map(g => (
            <button key={g} onClick={() => set('geography', g)}
              style={{ padding:'14px', borderRadius:'var(--r-md)', border:`1.5px solid ${form.geography===g?'var(--blue)':'var(--border2)'}`, background:form.geography===g?'var(--blue-bg)':'var(--surface2)', color:form.geography===g?'var(--blue2)':'var(--text2)', fontFamily:'var(--font-body)', fontSize:14, fontWeight:600, cursor:'pointer', transition:'all .15s', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {form.geography===g && <CheckCircle2 size={14} color="var(--blue2)"/>}
              {g}
            </button>
          ))}
        </div>
      ),
    },
    {
      icon: <Target size={20} color="var(--amber)" />,
      iconBg: 'var(--amber-bg)',
      title: 'Strategic priorities',
      desc: 'What matters most right now',
      content: (
        <>
          <div className="input-group">
            <div className="input-label">Top Strategic Priorities</div>
            <textarea className="input" autoFocus
              placeholder="e.g. Expand to Southeast Asia, Launch Series B, Achieve profitability by Q4…"
              value={form.priorities} rows={4}
              onChange={e => set('priorities', e.target.value)}
              style={{ minHeight:100, lineHeight:1.6 }} />
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:5 }}>
              This shapes what intelligence matters most to you
            </div>
          </div>
          <div className="input-group">
            <div className="input-label">Key Challenges <span style={{ color:'var(--text3)' }}>(optional)</span></div>
            <textarea className="input"
              placeholder="e.g. Increasing competition, regulatory uncertainty…"
              value={form.challenges} rows={2}
              onChange={e => set('challenges', e.target.value)}
              style={{ minHeight:70 }} />
          </div>
        </>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="screen">
      <div style={{ padding:'20px 16px 0', flexShrink:0 }}>
        <div className="step-indicator">
          {steps.map((_, i) => (
            <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
          ))}
        </div>
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>Step {step+1} of {steps.length}</div>
      </div>

      <div className="content" style={{ paddingTop:12 }}>
        {/* Step header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:current.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {current.icon}
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, letterSpacing:'-0.03em', lineHeight:1.2 }}>
              {current.title}
            </div>
            <div style={{ fontSize:13, color:'var(--text2)', marginTop:3 }}>{current.desc}</div>
          </div>
        </div>

        {current.content}

        {/* Action button */}
        <button className="btn btn-primary" style={{ marginTop:16 }}
          disabled={!canNext || saving}
          onClick={handleNext}>
          {saving ? (
            <span style={{ display:'flex', gap:5 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width:7,height:7,borderRadius:'50%',background:'rgba(255,255,255,0.7)',display:'inline-block',animation:'bounce 1.2s ease-in-out infinite',animationDelay:`${i*0.18}s` }}/>
              ))}
            </span>
          ) : step < 2 ? (
            <>{step === 0 ? 'Continue' : 'Continue'} <ArrowRight size={16}/></>
          ) : (
            <>Activate Intelligence Engine 🧠</>
          )}
        </button>

        {step > 0 && (
          <button className="btn btn-ghost" style={{ margin:'10px auto 0', display:'block' }}
            onClick={() => setStep(s => s - 1)} disabled={saving}>
            ← Back
          </button>
        )}

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'var(--text3)' }}>
          🔒 Your data shapes intelligence, never shared
        </div>
      </div>

      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1.4);opacity:1}}`}</style>
    </div>
  );
}
