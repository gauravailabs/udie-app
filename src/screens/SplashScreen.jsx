import React, { useEffect } from 'react';

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="splash">
      {/* Orbiting rings around the logo */}
      <div style={{ position:'relative', width:220, height:220, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {/* Orbit 3 - outermost */}
        <div style={{ position:'absolute', width:210, height:210, borderRadius:'50%', border:'1px dashed rgba(99,102,241,0.12)', animation:'orbit 20s linear infinite' }}>
          <div style={{ position:'absolute', top:-3, left:'50%', transform:'translateX(-50%)', width:6, height:6, borderRadius:'50%', background:'#A78BFA', boxShadow:'0 0 10px #A78BFA' }}/>
        </div>
        {/* Orbit 2 */}
        <div style={{ position:'absolute', width:178, height:178, borderRadius:'50%', border:'1px dashed rgba(0,214,143,0.18)', animation:'orbit 14s linear infinite reverse' }}>
          <div style={{ position:'absolute', top:-4, left:'50%', transform:'translateX(-50%)', width:8, height:8, borderRadius:'50%', background:'#00D68F', boxShadow:'0 0 12px #00D68F' }}/>
        </div>
        {/* Orbit 1 - innermost */}
        <div style={{ position:'absolute', width:148, height:148, borderRadius:'50%', border:'1px dashed rgba(29,127,255,0.28)', animation:'orbit 8s linear infinite' }}>
          <div style={{ position:'absolute', top:-5, left:'50%', transform:'translateX(-50%)', width:10, height:10, borderRadius:'50%', background:'#1D7FFF', boxShadow:'0 0 14px #1D7FFF' }}/>
        </div>

        {/* Logo wrap */}
        <div style={{ position:'relative', width:100, height:100, display:'flex', alignItems:'center', justifyContent:'center', animation:'logoIn .9s cubic-bezier(.34,1.56,.64,1) .3s both' }}>
          {/* Ring */}
          <div style={{ position:'absolute', width:110, height:110, background:'linear-gradient(135deg,#1D7FFF,#00D68F,#6366F1,#1D7FFF)', backgroundSize:'300% 300%', clipPath:'polygon(50% 0%,93.3% 25%,93.3% 75%,50% 100%,6.7% 75%,6.7% 25%)', animation:'gradientShift 3s ease infinite,ringPulse 2s ease-in-out infinite', zIndex:1 }}/>
          {/* Inner hex */}
          <div style={{ position:'relative', width:90, height:90, background:'linear-gradient(135deg,#0A1E5E 0%,#1D7FFF 50%,#00D68F 100%)', clipPath:'polygon(50% 0%,93.3% 25%,93.3% 75%,50% 100%,6.7% 75%,6.7% 25%)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:38, zIndex:2, boxShadow:'0 0 70px rgba(29,127,255,0.55),0 0 140px rgba(0,214,143,0.20)' }}>
            🧠
          </div>
        </div>
      </div>

      <div className="splash-name">UDIE</div>
      <div className="splash-tagline">Unified Decision Intelligence Engine</div>
      <div className="splash-loader">
        <div className="splash-loader-dot"/>
        <div className="splash-loader-dot"/>
        <div className="splash-loader-dot"/>
      </div>

      <style>{`
        @keyframes orbit { to { transform: rotate(360deg); } }
        @keyframes logoIn { from { opacity:0; transform:scale(.2) rotate(-30deg); } to { opacity:1; transform:scale(1) rotate(0deg); } }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes ringPulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
      `}</style>
    </div>
  );
}
