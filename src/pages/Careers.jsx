import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import logoPng from '../assets/logo.png';

import { API_URL } from '../config/api';

const TYPE_COLORS = { 'Full-time': '#00D2FF', 'Part-time': '#7928CA', 'Contract': '#FFD700', 'Remote': '#39FF14' };

export default function Careers() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let animId;
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize); resize();
    let mouse = { x: null, y: null };
    const onMouse = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener('mousemove', onMouse);
    class P {
      constructor() { this.x = Math.random()*canvas.width; this.y = Math.random()*canvas.height; this.vx=(Math.random()-0.5)*0.6; this.vy=(Math.random()-0.5)*0.6; this.s=Math.random()*2+1; }
      update() { this.x+=this.vx; this.y+=this.vy; if(this.x<0||this.x>canvas.width)this.vx*=-1; if(this.y<0||this.y>canvas.height)this.vy*=-1; if(mouse.x){const dx=mouse.x-this.x,dy=mouse.y-this.y,d=Math.sqrt(dx*dx+dy*dy); if(d<180){const f=(180-d)/180; this.x-=dx*f*0.06; this.y-=dy*f*0.06;}} }
      draw() { ctx.shadowBlur=12; ctx.shadowColor='#39FF14'; ctx.fillStyle='#39FF14'; ctx.beginPath(); ctx.arc(this.x,this.y,this.s,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
    }
    for(let i=0;i<60;i++) particles.push(new P());
    const anim = () => { ctx.clearRect(0,0,canvas.width,canvas.height); particles.forEach((p,i)=>{ p.update(); p.draw(); for(let j=i+1;j<particles.length;j++){const p2=particles[j],dx=p.x-p2.x,dy=p.y-p2.y,d=Math.sqrt(dx*dx+dy*dy); if(d<140){ctx.strokeStyle=`rgba(57,255,20,${0.8*(1-d/140)})`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();}}}); animId=requestAnimationFrame(anim); };
    anim();
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('mousemove', onMouse); cancelAnimationFrame(animId); };
  }, []);

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: '#000', color: '#fff', minHeight: '100vh', position: 'relative' }}>
      <Helmet>
        <title>Careers at PrimeCode | Join Our Team</title>
        <meta name="description" content="Explore open roles and build the future with PrimeCode. We're hiring engineers, designers, and innovators." />
      </Helmet>
      {/* BG */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(ellipse at 20% 50%, rgba(121,40,202,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,210,255,0.06) 0%, transparent 50%)' }} />
      </div>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
          <img src={logoPng} alt="PrimeCode" style={{ height: '28px' }} />
        </Link>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
          <span style={{ color: '#00D2FF', fontWeight: 600, fontSize: '0.85rem' }}>Careers</span>
          <Link to="/login" className="btn-outline" style={{ fontSize: '0.8rem', padding: '6px 16px' }}>Login</Link>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ═══ HERO ═══ */}
        <section style={{ paddingTop: '160px', paddingBottom: '40px', paddingLeft: '5%', paddingRight: '5%', display: 'flex', alignItems: 'center', gap: '4rem', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ flex: 1, animation: 'cFadeUp 0.8s ease-out both' }}>
            <div style={{ fontSize: '0.85rem', letterSpacing: '4px', color: '#00D2FF', fontWeight: 600, marginBottom: '1.5rem', textTransform: 'uppercase' }}>WE'RE HIRING</div>
            <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1.5rem' }}>
              Build the <span style={{ background: 'linear-gradient(135deg, #00D2FF, #7928CA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Future</span><br/>with PrimeCode
            </h1>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6, opacity: 0.7, maxWidth: '550px', marginBottom: '2rem' }}>
              Join a team of innovators crafting next-generation software. Explore open roles and find your place in our story.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
              <button className="btn-glow" onClick={() => navigate('/openings')} style={{ padding: '14px 32px', fontSize: '1rem', fontWeight: 600, borderRadius: '10px' }}>
                Apply
              </button>
            </div>
          </div>

          {/* ═══ WHY PRIMECODE (Right Side) ═══ */}
          <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'cFadeUp 1.2s ease-out 0.2s both' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>
              Why <span style={{ background: 'linear-gradient(135deg, #00D2FF, #7928CA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PrimeCode</span>?
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1.5rem' }}>
              {[
                { icon: '🚀', title: 'Real-World Experience', desc: 'Work on live projects and build practical software dev skills.' },
                { icon: '🧠', title: 'Mentorship & Growth', desc: 'Learn directly from experienced developers guiding your journey.' },
                { icon: '🌐', title: '100% Remote', desc: 'Work flexibly from anywhere, at the times that fit your schedule.' },
                { icon: '🤝', title: 'Networking', desc: 'Connect with a growing community of passionate tech professionals.' }
              ].map((card, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px',
                  padding: '1.5rem', transition: 'all 0.3s', cursor: 'default'
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(0,210,255,0.3)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,210,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{card.icon}</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>{card.title}</h3>
                  <p style={{ fontSize: '0.9rem', opacity: 0.7, lineHeight: 1.5 }}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: '2rem 5%', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center', opacity: 0.3, fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} PrimeCode Solutions • <Link to="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Home</Link>
        </footer>
      </div>



      <style>{`
        @keyframes cFadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cOrbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes cShimmer { 0% { transform: translateX(-50%); } 100% { transform: translateX(50%); } }
        @keyframes appShake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-4px); } 40%,80% { transform: translateX(4px); } }
        @keyframes appSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes appCircle { to { stroke-dashoffset: 0; } }
        @keyframes appCheck { to { stroke-dashoffset: 0; } }
        @media (max-width: 768px) {
          section:first-of-type { flex-direction: column !important; padding-top: 100px !important; min-height: auto !important; }
          section:first-of-type > div:last-child { display: none !important; }
        }
      `}</style>
    </div>
  );
}
