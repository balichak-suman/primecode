import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import logoSymbolSvg from '../assets/logo-symbol.svg';

import { API_URL } from '../config/api';

const TYPE_COLORS = { 'Full-time': '#00D2FF', 'Part-time': '#7928CA', 'Contract': '#FFD700', 'Remote': '#39FF14' };

export default function JobOpenings() {
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
      <Helmet>
        <title>Open Positions | PrimeCode Careers</title>
        <meta name="description" content="View all current job openings at PrimeCode. Apply now to join our global engineering team." />
      </Helmet>
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
        {/* ═══ FILTERS ═══ */}
        <div style={{ paddingTop: '80px', paddingBottom: '20px', paddingLeft: '5%', paddingRight: '5%', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', position: 'sticky', top: '0', zIndex: 50 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 250px', maxWidth: '350px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles..."
                  style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '1rem', outline: 'none', transition: 'all 0.2s' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(0,210,255,0.4)'; e.target.style.background = 'rgba(0,210,255,0.02)'; }} 
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }} />
              </div>
              
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', opacity: 0.5, alignSelf: 'center', marginRight: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Dept:</span>
                {['All', ...departments].map(d => (
                  <button key={d} onClick={() => setDeptFilter(d)} style={{
                    padding: '8px 16px', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                    background: deptFilter === d ? 'rgba(0,210,255,0.1)' : 'transparent',
                    border: `1px solid ${deptFilter === d ? 'rgba(0,210,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    color: deptFilter === d ? '#00D2FF' : 'rgba(255,255,255,0.6)'
                  }}>{d}</button>
                ))}
              </div>

              <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)', margin: '0 8px', display: 'none' }} />

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['All', 'Full-time', 'Part-time', 'Contract'].map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)} style={{
                    padding: '8px 16px', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                    background: typeFilter === t ? 'rgba(121,40,202,0.1)' : 'transparent',
                    border: `1px solid ${typeFilter === t ? 'rgba(121,40,202,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    color: typeFilter === t ? '#c084fc' : 'rgba(255,255,255,0.6)'
                  }}>{t}</button>
                ))}
              </div>

              <div style={{ marginLeft: 'auto', fontSize: '0.95rem', opacity: 0.8, fontWeight: 500, padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                {filtered.length} opening{filtered.length !== 1 ? 's' : ''} available
              </div>

            </div>
          </div>
        </div>

        {/* ═══ JOB LISTINGS ═══ */}
        <section style={{ padding: '4rem 5%', maxWidth: '1000px', margin: '0 auto' }}>
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
                  borderRadius: '16px', padding: '2rem', marginBottom: '1.2rem', cursor: 'pointer', transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)'
                }}>
                {/* Collapsed */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(0,210,255,0.2)', color: '#00D2FF', marginBottom: '12px', display: 'inline-block', fontWeight: 600 }}>{job.department}</span>
                    <h3 style={{ margin: '8px 0 16px', fontSize: '1.5rem', fontWeight: 700 }}>{job.title}</h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', padding: '6px 14px', borderRadius: '8px', background: `${TYPE_COLORS[job.type] || '#00D2FF'}15`, color: TYPE_COLORS[job.type] || '#00D2FF', border: `1px solid ${TYPE_COLORS[job.type] || '#00D2FF'}25`, fontWeight: 500 }}>{job.type}</span>
                      <span style={{ fontSize: '0.85rem', padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', color: '#ccc', fontWeight: 500 }}>📍 {job.location}</span>
                      <span style={{ fontSize: '0.85rem', padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', color: '#ccc', fontWeight: 500 }}>🎯 {job.experience}</span>
                      <span style={{ fontSize: '0.85rem', padding: '6px 14px', borderRadius: '8px', background: 'rgba(57,255,20,0.06)', color: '#39FF14', border: '1px solid rgba(57,255,20,0.15)', fontWeight: 500 }}>💰 {job.salary}</span>
                      {job.servicePeriod && <span style={{ fontSize: '0.85rem', padding: '6px 14px', borderRadius: '8px', background: 'rgba(0,210,255,0.06)', color: '#00D2FF', border: '1px solid rgba(0,210,255,0.15)', fontWeight: 500 }}>⏳ {job.servicePeriod}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '12px', fontWeight: 500 }}>{daysAgo(job.postedAt)}</div>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"
                      style={{ transition: 'transform 0.3s', transform: expanded === job.id ? 'rotate(180deg)' : 'rotate(0)' }}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>

                {/* Expanded */}
                {expanded === job.id && (
                  <div onClick={e => e.stopPropagation()} style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'cFadeUp 0.3s ease-out' }}>
                    <h4 style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Full Job Description</h4>
                    <div style={{ fontSize: '1.05rem', lineHeight: 1.8, opacity: 0.9, marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>{job.description}</div>

                    <button className="btn-glow" onClick={() => { setApplyJob(job); setAppStep(1); setAppStatus('idle'); setAppErrors({}); setAppForm({ fullName: '', email: '', phone: '', currentRole: '', currentCompany: '', linkedIn: '', portfolio: '', experience: '', coverLetter: '', resumeFile: null }); }} style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 700, borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                      Apply Now <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
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
          <div style={{ flex: half ? '1 1 calc(50% - 12px)' : '1 1 100%', minWidth: half ? '200px' : '100%' }}>
            <label style={{ fontSize: '0.85rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>{label}{required && <span style={{ color: '#ff3366' }}> *</span>}</label>
            <input type={type} value={appForm[k]} onChange={e => upd(k, e.target.value)} placeholder={label}
              style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${appErrors[k] ? 'rgba(255,51,102,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', animation: appErrors[k] ? 'appShake 0.4s' : 'none' }}
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
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.75rem' }}>Application Submitted!</h2>
                  <p style={{ fontSize: '1rem', opacity: 0.8, lineHeight: 1.7, maxWidth: '400px', margin: '0 auto 2.5rem' }}>
                    Thank you for applying for <span style={{ color: '#00D2FF', fontWeight: 600 }}>{applyJob.title}</span>. Our team will review your application and reach out within 5–7 business days.
                  </p>
                  <button className="btn-glow" onClick={() => setApplyJob(null)} style={{ padding: '14px 32px', fontSize: '1rem', borderRadius: '12px' }}>Browse More Openings</button>
                </div>
              ) : (
                /* ═══ FORM ═══ */
                <>
                  {/* Header */}
                  <div style={{ marginBottom: '2rem', paddingRight: '2rem' }}>
                    <span style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(0,210,255,0.2)', color: '#00D2FF', display: 'inline-block', marginBottom: '12px', fontWeight: 600 }}>{applyJob.department}</span>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 8px' }}>Apply for <span style={{ color: '#00D2FF' }}>{applyJob.title}</span></h2>
                    <p style={{ fontSize: '0.95rem', opacity: 0.7 }}>{applyJob.location} · {applyJob.type}</p>
                  </div>

                  {/* Step indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: appStep >= 1 ? '#00D2FF' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: appStep >= 1 ? '#000' : 'rgba(255,255,255,0.3)' }}>{appStep > 1 ? '✓' : '1'}</div>
                      <span style={{ fontSize: '0.85rem', color: appStep >= 1 ? '#00D2FF' : 'rgba(255,255,255,0.3)', fontWeight: 500 }}>Personal Info</span>
                    </div>
                    <div style={{ width: '60px', height: '1px', background: appStep >= 2 ? '#00D2FF' : 'rgba(255,255,255,0.08)', margin: '0 12px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: appStep >= 2 ? '#00D2FF' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: appStep >= 2 ? '#000' : 'rgba(255,255,255,0.3)' }}>2</div>
                      <span style={{ fontSize: '0.85rem', color: appStep >= 2 ? '#00D2FF' : 'rgba(255,255,255,0.3)', fontWeight: 500 }}>Experience & Resume</span>
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
                      <button className="btn-glow" onClick={() => { if (validateStep1()) setAppStep(2); }} style={{ width: '100%', marginTop: '2rem', padding: '16px', fontSize: '1.05rem', fontWeight: 700, borderRadius: '12px' }}>Continue to Experience →</button>
                    </div>
                  )}

                  {appStep === 2 && (
                    <div style={{ animation: 'cFadeUp 0.3s ease-out' }}>
                      {/* Experience dropdown */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Total Experience <span style={{ color: '#ff3366' }}>*</span></label>
                        <select value={appForm.experience} onChange={e => upd('experience', e.target.value)}
                          style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${appErrors.experience ? 'rgba(255,51,102,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', color: '#fff', fontSize: '0.95rem', outline: 'none' }}>
                          <option value="" style={{ background: '#111' }}>Select experience</option>
                          {['Fresher', '0–1 years', '1–3 years', '3–5 years', '5–8 years', '8–12 years', '12+ years'].map(o => <option key={o} value={o} style={{ background: '#111' }}>{o}</option>)}
                        </select>
                        {appErrors.experience && <div style={{ fontSize: '0.65rem', color: '#ff3366', marginTop: '4px' }}>{appErrors.experience}</div>}
                      </div>

                      {/* Resume upload */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Resume <span style={{ color: '#ff3366' }}>*</span></label>
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
                      <div style={{ marginBottom: '2rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Cover Letter <span style={{ opacity: 0.4 }}>(optional)</span></label>
                        <textarea value={appForm.coverLetter} onChange={e => { if (e.target.value.length <= 1000) upd('coverLetter', e.target.value); }} placeholder="Tell us why you're excited about this role..." rows={4}
                          style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '0.95rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                          onFocus={e => e.target.style.borderColor='rgba(0,210,255,0.4)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}
                        />
                        <div style={{ fontSize: '0.6rem', opacity: 0.3, textAlign: 'right', marginTop: '4px' }}>{appForm.coverLetter.length}/1000</div>
                      </div>

                      {appErrors.submit && <div style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.75rem', color: '#ff3366', marginBottom: '1rem' }}>{appErrors.submit}</div>}

                      <div style={{ display: 'flex', gap: '16px' }}>
                        <button className="btn-outline" onClick={() => setAppStep(1)} style={{ flex: 1, padding: '16px', fontSize: '1.05rem', borderRadius: '12px' }}>← Back</button>
                        <button className="btn-glow" onClick={handleSubmit} disabled={appStatus === 'submitting'} style={{ flex: 2, padding: '16px', fontSize: '1.05rem', fontWeight: 700, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {appStatus === 'submitting' ? <><svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'appSpin 1s linear infinite' }}><circle cx="12" cy="12" r="10" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="32" strokeLinecap="round"/></svg> Submitting...</> : 'Submit Application 🚀'}
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

      `}</style>
    </div>
  );
}
