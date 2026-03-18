import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import logoSymbolSvg from '../assets/logo-symbol.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const TYPE_COLORS = { 'Full-time': '#00D2FF', 'Part-time': '#7928CA', 'Contract': '#FFD700', 'Remote': '#39FF14' };

export default function Careers() {
  const canvasRef = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [departments, setDepartments] = useState([]);

  // Application modal state
  const [applyJob, setApplyJob] = useState(null);
  const [appStep, setAppStep] = useState(1);
  const [appStatus, setAppStatus] = useState('idle'); // idle | submitting | success
  const [appErrors, setAppErrors] = useState({});
  const [appForm, setAppForm] = useState({ fullName: '', email: '', phone: '', currentRole: '', currentCompany: '', linkedIn: '', portfolio: '', experience: '', coverLetter: '', resumeFile: null });
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

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

  useEffect(() => { fetchJobs(); fetchDepts(); }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try { const r = await axios.get(`${API_URL}/careers/jobs`); setJobs(r.data.jobs || r.data); } catch(e) {}
    finally { setLoading(false); }
  };
  const fetchDepts = async () => {
    try { const r = await axios.get(`${API_URL}/careers/departments`); setDepartments(r.data); } catch(e) {}
  };

  const filtered = jobs.filter(j => {
    if (deptFilter !== 'All' && j.department !== deptFilter) return false;
    if (typeFilter !== 'All' && j.type !== typeFilter) return false;
    if (search) { const s = search.toLowerCase(); return j.title.toLowerCase().includes(s) || j.department.toLowerCase().includes(s); }
    return true;
  });

  const daysAgo = (d) => { const diff = Math.floor((Date.now() - new Date(d)) / 86400000); return diff === 0 ? 'Today' : diff === 1 ? '1 day ago' : `${diff} days ago`; };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: '#000', color: '#fff', minHeight: '100vh', position: 'relative' }}>
      {/* BG */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(ellipse at 20% 50%, rgba(121,40,202,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,210,255,0.06) 0%, transparent 50%)' }} />
      </div>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
          <img src={logoSymbolSvg} alt="PrimeCode" style={{ height: '28px' }} />
          <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '1px' }}>PrimeCode</span>
        </Link>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
          <span style={{ color: '#00D2FF', fontWeight: 600, fontSize: '0.85rem' }}>Careers</span>
          <Link to="/login" className="btn-outline" style={{ fontSize: '0.8rem', padding: '6px 16px' }}>Login</Link>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ═══ HERO ═══ */}
        <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 5% 80px', gap: '4rem' }}>
          <div style={{ flex: 1, animation: 'cFadeUp 0.8s ease-out both' }}>
            <div style={{ fontSize: '0.75rem', letterSpacing: '6px', color: '#00D2FF', fontWeight: 600, marginBottom: '1.5rem', textTransform: 'uppercase' }}>WE'RE HIRING</div>
            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 1.5rem' }}>
              Build the <span style={{ background: 'linear-gradient(135deg, #00D2FF, #7928CA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Future</span> with PrimeCode
            </h1>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, opacity: 0.5, maxWidth: '500px', marginBottom: '2.5rem' }}>
              Join a team of innovators crafting next-generation software. Explore open roles and find your place in our story.
            </p>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[{ n: filtered.length, l: 'Open Roles' }, { n: departments.length || 5, l: 'Departments' }, { n: '100%', l: 'Growth Mindset' }].map(s => (
                <div key={s.l} style={{ animation: 'cFadeUp 1s ease-out both', animationDelay: '0.3s' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00D2FF' }}>{s.n}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Orbital rings */}
          <div style={{ flex: '0 0 320px', height: '320px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'cFadeUp 1s ease-out 0.4s both' }}>
            {[{ s: 280, d: 12, c: '#00D2FF' }, { s: 200, d: 8, c: '#7928CA' }, { s: 120, d: 6, c: '#39FF14' }].map((ring, i) => (
              <div key={i} style={{
                position: 'absolute', width: `${ring.s}px`, height: `${ring.s}px`, borderRadius: '50%',
                border: `1px solid ${ring.c}20`, animation: `cOrbit ${ring.d}s linear infinite ${i % 2 ? 'reverse' : ''}`
              }}>
                <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: ring.c, boxShadow: `0 0 12px ${ring.c}` }} />
              </div>
            ))}
            <span style={{ fontSize: '2rem', fontWeight: 800, opacity: 0.15, fontFamily: 'monospace' }}>&lt;/&gt;</span>
          </div>
        </section>

        {/* ═══ FILTERS ═══ */}
        <div style={{ position: 'sticky', top: '60px', zIndex: 50, padding: '1rem 5%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 250px', maxWidth: '350px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,210,255,0.5)" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles, departments..."
                style={{ width: '100%', padding: '10px 14px 10px 36px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = 'rgba(0,210,255,0.3)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['All', ...departments].map(d => (
                <button key={d} onClick={() => setDeptFilter(d)} style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s',
                  background: deptFilter === d ? 'rgba(0,210,255,0.15)' : 'transparent',
                  border: `1px solid ${deptFilter === d ? 'rgba(0,210,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: deptFilter === d ? '#00D2FF' : 'rgba(255,255,255,0.5)'
                }}>{d}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['All', 'Full-time', 'Part-time', 'Contract'].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s',
                  background: typeFilter === t ? 'rgba(121,40,202,0.15)' : 'transparent',
                  border: `1px solid ${typeFilter === t ? 'rgba(121,40,202,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: typeFilter === t ? '#7928CA' : 'rgba(255,255,255,0.5)'
                }}>{t}</button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.4 }}>{filtered.length} opening{filtered.length !== 1 ? 's' : ''} found</div>
          </div>
        </div>

        {/* ═══ JOB LISTINGS ═══ */}
        <section style={{ padding: '3rem 5%', maxWidth: '900px', margin: '0 auto' }}>
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem', height: '120px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: '-100%', width: '200%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)', animation: 'cShimmer 1.5s infinite' }} />
              </div>
            ))
          ) : filtered.length > 0 ? (
            filtered.map(job => (
              <div key={job.id} onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                style={{
                  background: 'rgba(255,255,255,0.02)', border: `1px solid ${expanded === job.id ? 'rgba(0,210,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem', cursor: 'pointer', transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)'
                }}>
                {/* Collapsed */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.6rem', padding: '3px 10px', borderRadius: '10px', border: '1px solid rgba(0,210,255,0.2)', color: '#00D2FF', marginBottom: '8px', display: 'inline-block' }}>{job.department}</span>
                    <h3 style={{ margin: '8px 0', fontSize: '1.15rem', fontWeight: 700 }}>{job.title}</h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '6px', background: `${TYPE_COLORS[job.type] || '#00D2FF'}15`, color: TYPE_COLORS[job.type] || '#00D2FF', border: `1px solid ${TYPE_COLORS[job.type] || '#00D2FF'}25` }}>{job.type}</span>
                      <span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)' }}>📍 {job.location}</span>
                      <span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)' }}>🎯 {job.experience}</span>
                      <span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(57,255,20,0.06)', color: '#39FF14', border: '1px solid rgba(57,255,20,0.15)' }}>💰 {job.salary}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.65rem', opacity: 0.3, marginBottom: '8px' }}>{daysAgo(job.postedAt)}</div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"
                      style={{ transition: 'transform 0.3s', transform: expanded === job.id ? 'rotate(180deg)' : 'rotate(0)' }}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>

                {/* Expanded */}
                {expanded === job.id && (
                  <div onClick={e => e.stopPropagation()} style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', animation: 'cFadeUp 0.3s ease-out' }}>
                    <h4 style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>About the Role</h4>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.7, opacity: 0.7, marginBottom: '1.5rem' }}>{job.description}</p>

                    <h4 style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Responsibilities</h4>
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                      {job.responsibilities?.map((r, i) => (
                        <li key={i} style={{ padding: '4px 0', fontSize: '0.82rem', opacity: 0.7, display: 'flex', gap: '8px' }}>
                          <span style={{ color: '#00D2FF', fontWeight: 700 }}>▸</span> {r}
                        </li>
                      ))}
                    </ul>

                    <h4 style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Requirements</h4>
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                      {job.requirements?.map((r, i) => (
                        <li key={i} style={{ padding: '4px 0', fontSize: '0.82rem', opacity: 0.7, display: 'flex', gap: '8px' }}>
                          <span style={{ color: '#00D2FF', fontWeight: 700 }}>▸</span> {r}
                        </li>
                      ))}
                    </ul>

                    {job.niceToHave?.length > 0 && (
                      <>
                        <h4 style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Nice to Have</h4>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                          {job.niceToHave.map((r, i) => (
                            <li key={i} style={{ padding: '4px 0', fontSize: '0.82rem', opacity: 0.5, display: 'flex', gap: '8px' }}>
                              <span style={{ color: '#7928CA' }}>▸</span> {r}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <h4 style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Perks & Benefits</h4>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                      {job.perks?.map((p, i) => (
                        <span key={i} style={{ padding: '5px 12px', borderRadius: '16px', fontSize: '0.7rem', border: '1px solid rgba(57,255,20,0.2)', color: '#39FF14', background: 'rgba(57,255,20,0.05)' }}>{p}</span>
                      ))}
                    </div>

                    <button className="btn-glow" onClick={() => { setApplyJob(job); setAppStep(1); setAppStatus('idle'); setAppErrors({}); setAppForm({ fullName: '', email: '', phone: '', currentRole: '', currentCompany: '', linkedIn: '', portfolio: '', experience: '', coverLetter: '', resumeFile: null }); }} style={{ width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '12px' }}>
                      Apply Now →
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔭</div>
              <p style={{ fontSize: '1rem', opacity: 0.5, marginBottom: '1.5rem' }}>No openings match your search</p>
              <button className="btn-outline" onClick={() => { setSearch(''); setDeptFilter('All'); setTypeFilter('All'); }}
                style={{ fontSize: '0.85rem', padding: '8px 20px' }}>Clear Filters</button>
            </div>
          )}
        </section>

        {/* ═══ WHY PRIMECODE ═══ */}
        <section style={{ padding: '4rem 5% 6rem' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: '3rem' }}>
            Why <span style={{ background: 'linear-gradient(135deg, #00D2FF, #7928CA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PrimeCode</span>?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem', maxWidth: '1000px', margin: '0 auto' }}>
            {[
              { icon: '🚀', title: 'Cutting-Edge Projects', desc: 'Work on modern tech stacks building products that impact thousands of users daily.' },
              { icon: '🧠', title: 'Continuous Learning', desc: 'Annual learning budgets, internal tech talks, and mentorship programs for growth.' },
              { icon: '🌐', title: 'Remote Friendly', desc: 'Work from anywhere. We believe great work happens when you are most comfortable.' },
              { icon: '💰', title: 'Competitive Pay', desc: 'Above-market compensation with transparent pay bands and equity options.' },
              { icon: '🛡️', title: 'Full Benefits', desc: 'Health insurance, PTO, parental leave, and wellness programs for you and family.' },
              { icon: '⚡', title: 'Flat Hierarchy', desc: 'No bureaucracy. Direct access to leadership and autonomy to make decisions.' },
            ].map((card, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px',
                padding: '2rem', transition: 'all 0.3s', cursor: 'default'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(0,210,255,0.2)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,210,255,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{card.icon}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{card.title}</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.5, lineHeight: 1.6 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: '2rem 5%', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center', opacity: 0.3, fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} PrimeCode Solutions • <Link to="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Home</Link>
        </footer>
      </div>

      {/* ═══ APPLICATION MODAL ═══ */}
      {applyJob && (() => {
        const upd = (k, v) => { setAppForm(p => ({...p, [k]: v})); setAppErrors(p => { const n = {...p}; delete n[k]; return n; }); };
        const validateStep1 = () => {
          const e = {};
          if (!appForm.fullName.trim()) e.fullName = 'Name is required';
          if (!appForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appForm.email)) e.email = 'Valid email required';
          if (!appForm.phone.trim() || !/^\d{10}$/.test(appForm.phone.replace(/[\s\-+()]/g, '').slice(-10))) e.phone = 'Valid 10-digit phone required';
          setAppErrors(e); return Object.keys(e).length === 0;
        };
        const handleSubmit = async () => {
          if (!appForm.experience) { setAppErrors({experience: 'Select experience'}); return; }
          setAppStatus('submitting');
          try {
            const fd = new FormData();
            fd.append('fullName', appForm.fullName); fd.append('email', appForm.email); fd.append('phone', appForm.phone);
            fd.append('jobId', applyJob.id); fd.append('jobTitle', applyJob.title); fd.append('department', applyJob.department);
            fd.append('experience', appForm.experience);
            if (appForm.currentRole) fd.append('currentRole', appForm.currentRole);
            if (appForm.currentCompany) fd.append('currentCompany', appForm.currentCompany);
            if (appForm.linkedIn) fd.append('linkedIn', appForm.linkedIn);
            if (appForm.portfolio) fd.append('portfolio', appForm.portfolio);
            if (appForm.coverLetter) fd.append('coverLetter', appForm.coverLetter);
            if (appForm.resumeFile) fd.append('resume', appForm.resumeFile);
            await axios.post(`${API_URL}/careers/apply`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setAppStatus('success');
          } catch(err) { setAppErrors({submit: err.response?.data?.error || 'Failed'}); setAppStatus('idle'); }
        };
        const handleFile = (file) => { if (file && file.size <= 5*1024*1024 && /\.(pdf|doc|docx)$/i.test(file.name)) { upd('resumeFile', file); setAppErrors(p => { const n={...p}; delete n.resumeFile; return n; }); } else { setAppErrors(p => ({...p, resumeFile: 'PDF/DOC/DOCX, max 5MB'})); } };

        const inp = (k, label, type='text', required=false, half=false) => (
          <div style={{ flex: half ? '1 1 calc(50% - 8px)' : '1 1 100%', minWidth: half ? '200px' : '100%' }}>
            <label style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>{label}{required && <span style={{ color: '#ff3366' }}> *</span>}</label>
            <input type={type} value={appForm[k]} onChange={e => upd(k, e.target.value)} placeholder={label}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${appErrors[k] ? 'rgba(255,51,102,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', color: '#fff', fontSize: '0.82rem', outline: 'none', transition: 'all 0.2s', animation: appErrors[k] ? 'appShake 0.4s' : 'none' }}
              onFocus={e => { if (!appErrors[k]) e.target.style.borderColor='rgba(0,210,255,0.4)'; e.target.style.background='rgba(0,210,255,0.03)'; }}
              onBlur={e => { if (!appErrors[k]) e.target.style.borderColor='rgba(255,255,255,0.08)'; e.target.style.background='rgba(255,255,255,0.03)'; }}
            />
            {appErrors[k] && <div style={{ fontSize: '0.65rem', color: '#ff3366', marginTop: '4px' }}>{appErrors[k]}</div>}
          </div>
        );

        return (
          <div onClick={() => { setApplyJob(null); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'cFadeUp 0.25s ease-out' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', background: 'rgba(12,12,12,0.98)', border: '1px solid rgba(0,210,255,0.2)', borderRadius: '20px', boxShadow: '0 0 60px rgba(0,210,255,0.1)', padding: '2rem', position: 'relative' }}>
              {/* Close */}
              <button onClick={() => setApplyJob(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1.2rem', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color='#00D2FF'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.3)'}>✕</button>

              {appStatus === 'success' ? (
                /* ═══ SUCCESS SCREEN ═══ */
                <div style={{ textAlign: 'center', padding: '2rem 0', animation: 'cFadeUp 0.5s ease-out' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ margin: '0 auto 1.5rem' }}>
                    <circle cx="40" cy="40" r="36" fill="none" stroke="#00D2FF" strokeWidth="2" opacity="0.2" />
                    <circle cx="40" cy="40" r="36" fill="none" stroke="#00D2FF" strokeWidth="3" strokeDasharray="226" strokeDashoffset="226" strokeLinecap="round" style={{ animation: 'appCircle 0.6s ease-out 0.2s forwards' }} />
                    <polyline points="26,42 36,52 56,30" fill="none" stroke="#39FF14" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="50" strokeDashoffset="50" style={{ animation: 'appCheck 0.4s ease-out 0.7s forwards' }} />
                  </svg>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>Application Submitted!</h2>
                  <p style={{ fontSize: '0.85rem', opacity: 0.5, lineHeight: 1.7, maxWidth: '400px', margin: '0 auto 2rem' }}>
                    Thank you for applying for <span style={{ color: '#00D2FF', fontWeight: 600 }}>{applyJob.title}</span>. Our team will review your application and reach out within 5–7 business days.
                  </p>
                  <button className="btn-glow" onClick={() => setApplyJob(null)} style={{ padding: '10px 28px', fontSize: '0.85rem', borderRadius: '10px' }}>Browse More Openings</button>
                </div>
              ) : (
                /* ═══ FORM ═══ */
                <>
                  {/* Header */}
                  <div style={{ marginBottom: '1.5rem', paddingRight: '2rem' }}>
                    <span style={{ fontSize: '0.6rem', padding: '3px 10px', borderRadius: '10px', border: '1px solid rgba(0,210,255,0.2)', color: '#00D2FF', display: 'inline-block', marginBottom: '8px' }}>{applyJob.department}</span>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px' }}>Apply for <span style={{ color: '#00D2FF' }}>{applyJob.title}</span></h2>
                    <p style={{ fontSize: '0.75rem', opacity: 0.4 }}>{applyJob.location} · {applyJob.type}</p>
                  </div>

                  {/* Step indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: appStep >= 1 ? '#00D2FF' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: appStep >= 1 ? '#000' : 'rgba(255,255,255,0.3)' }}>{appStep > 1 ? '✓' : '1'}</div>
                      <span style={{ fontSize: '0.7rem', color: appStep >= 1 ? '#00D2FF' : 'rgba(255,255,255,0.3)' }}>Personal Info</span>
                    </div>
                    <div style={{ width: '60px', height: '1px', background: appStep >= 2 ? '#00D2FF' : 'rgba(255,255,255,0.08)', margin: '0 8px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: appStep >= 2 ? '#00D2FF' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: appStep >= 2 ? '#000' : 'rgba(255,255,255,0.3)' }}>2</div>
                      <span style={{ fontSize: '0.7rem', color: appStep >= 2 ? '#00D2FF' : 'rgba(255,255,255,0.3)' }}>Experience & Resume</span>
                    </div>
                  </div>

                  {appStep === 1 && (
                    <div style={{ animation: 'cFadeUp 0.3s ease-out' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {inp('fullName', 'Full Name', 'text', true, true)}
                        {inp('email', 'Email Address', 'email', true, true)}
                        {inp('phone', 'Phone Number', 'tel', true, true)}
                        {inp('currentRole', 'Current Role', 'text', false, true)}
                        {inp('currentCompany', 'Current Company', 'text', false, true)}
                        {inp('linkedIn', 'LinkedIn Profile URL', 'url', false, true)}
                        {inp('portfolio', 'Portfolio / GitHub URL', 'url', false, false)}
                      </div>
                      <button className="btn-glow" onClick={() => { if (validateStep1()) setAppStep(2); }} style={{ width: '100%', marginTop: '1.5rem', padding: '12px', fontSize: '0.85rem', fontWeight: 600, borderRadius: '10px' }}>Continue to Experience →</button>
                    </div>
                  )}

                  {appStep === 2 && (
                    <div style={{ animation: 'cFadeUp 0.3s ease-out' }}>
                      {/* Experience dropdown */}
                      <div style={{ marginBottom: '1.2rem' }}>
                        <label style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Total Experience <span style={{ color: '#ff3366' }}>*</span></label>
                        <select value={appForm.experience} onChange={e => upd('experience', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${appErrors.experience ? 'rgba(255,51,102,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', color: '#fff', fontSize: '0.82rem', outline: 'none' }}>
                          <option value="" style={{ background: '#111' }}>Select experience</option>
                          {['Fresher', '0–1 years', '1–3 years', '3–5 years', '5–8 years', '8–12 years', '12+ years'].map(o => <option key={o} value={o} style={{ background: '#111' }}>{o}</option>)}
                        </select>
                        {appErrors.experience && <div style={{ fontSize: '0.65rem', color: '#ff3366', marginTop: '4px' }}>{appErrors.experience}</div>}
                      </div>

                      {/* Resume upload */}
                      <div style={{ marginBottom: '1.2rem' }}>
                        <label style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Resume <span style={{ color: '#ff3366' }}>*</span></label>
                        <div onClick={() => fileInputRef.current?.click()}
                          onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                          style={{ padding: '2rem', border: `2px dashed ${dragOver ? 'rgba(0,210,255,0.5)' : appForm.resumeFile ? 'rgba(57,255,20,0.3)' : 'rgba(0,210,255,0.15)'}`, borderRadius: '12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragOver ? 'rgba(0,210,255,0.03)' : 'transparent' }}>
                          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                          {appForm.resumeFile ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <span style={{ color: '#39FF14', fontSize: '1.1rem' }}>✓</span>
                              <span style={{ fontSize: '0.85rem', color: '#39FF14' }}>{appForm.resumeFile.name}</span>
                              <button onClick={e => { e.stopPropagation(); upd('resumeFile', null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize: '1.5rem', marginBottom: '6px', opacity: 0.3 }}>📄</div>
                              <div style={{ fontSize: '0.82rem', opacity: 0.5 }}>Drag & drop your resume or <span style={{ color: '#00D2FF' }}>browse</span></div>
                              <div style={{ fontSize: '0.65rem', opacity: 0.3, marginTop: '4px' }}>PDF, DOC or DOCX · Max 5MB</div>
                            </>
                          )}
                        </div>
                        {appErrors.resumeFile && <div style={{ fontSize: '0.65rem', color: '#ff3366', marginTop: '4px' }}>{appErrors.resumeFile}</div>}
                      </div>

                      {/* Cover letter */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Cover Letter <span style={{ opacity: 0.4 }}>(optional)</span></label>
                        <textarea value={appForm.coverLetter} onChange={e => { if (e.target.value.length <= 1000) upd('coverLetter', e.target.value); }} placeholder="Tell us why you're excited about this role..." rows={4}
                          style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                          onFocus={e => e.target.style.borderColor='rgba(0,210,255,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
                        />
                        <div style={{ fontSize: '0.6rem', opacity: 0.3, textAlign: 'right', marginTop: '4px' }}>{appForm.coverLetter.length}/1000</div>
                      </div>

                      {appErrors.submit && <div style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.75rem', color: '#ff3366', marginBottom: '1rem' }}>{appErrors.submit}</div>}

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn-outline" onClick={() => setAppStep(1)} style={{ flex: 1, padding: '12px', fontSize: '0.85rem', borderRadius: '10px' }}>← Back</button>
                        <button className="btn-glow" onClick={handleSubmit} disabled={appStatus === 'submitting'} style={{ flex: 2, padding: '12px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {appStatus === 'submitting' ? <><svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'appSpin 1s linear infinite' }}><circle cx="12" cy="12" r="10" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="32" strokeLinecap="round"/></svg> Submitting...</> : 'Submit Application 🚀'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}

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
