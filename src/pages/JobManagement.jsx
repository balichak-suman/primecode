import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const STATUS_COLORS = { ACTIVE: '#39FF14', PAUSED: '#FFD700', CLOSED: '#ff3366' };
const APP_STATUS_COLORS = { NEW: '#00D2FF', REVIEWED: '#7928CA', SHORTLISTED: '#FFD700', INTERVIEWED: '#00DFD8', OFFERED: '#39FF14', REJECTED: '#ff3366', WITHDRAWN: 'rgba(255,255,255,0.3)' };

export default function JobManagement() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('jobs'); // jobs | applications
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'jobs') {
        const r = await axios.get(`${API_URL}/careers/admin/jobs`, { headers });
        setJobs(r.data.jobs || []);
      } else {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        if (deptFilter) params.department = deptFilter;
        if (jobFilter) params.jobId = jobFilter;
        const r = await axios.get(`${API_URL}/careers/admin/applications`, { headers, params });
        setApplications(r.data.applications || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateJobStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/careers/admin/jobs/${id}`, { status }, { headers });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const updateAppStatus = async (id, status) => {
    try {
      await axios.patch(`${API_URL}/careers/admin/applications/${id}/status`, { status }, { headers });
      fetchData();
      if (selectedApp?.id === id) setSelectedApp(p => ({ ...p, status }));
    } catch (e) { console.error(e); }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            <span style={{ color: '#00D2FF' }}>Job</span> Postings
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.4 }}>Manage open positions and review applications</p>
        </div>
        <a href="/careers" target="_blank" rel="noopener" style={{ fontSize: '0.75rem', color: '#00D2FF', textDecoration: 'none', opacity: 0.7 }}>
          View Public Careers →
        </a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '4px' }}>
        {[{ k: 'jobs', l: `Open Positions (${jobs.length})` }, { k: 'applications', l: `Applications (${applications.length})` }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
            background: tab === t.k ? 'rgba(0,210,255,0.1)' : 'transparent',
            color: tab === t.k ? '#00D2FF' : 'rgba(255,255,255,0.4)'
          }}>{t.l}</button>
        ))}
      </div>

      {/* ═══ JOBS TAB ═══ */}
      {tab === 'jobs' && (
        <div>
          {loading ? <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.3 }}>Loading...</div> : jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💼</div>
              <p style={{ opacity: 0.4 }}>No job postings yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {jobs.map(job => (
                <div key={job.id} style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '14px', padding: '1.2rem', transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(0,210,255,0.2)', color: '#00D2FF' }}>{job.department}</span>
                        <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: '8px', background: `${STATUS_COLORS[job.status]}15`, color: STATUS_COLORS[job.status], border: `1px solid ${STATUS_COLORS[job.status]}25` }}>{job.status}</span>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px' }}>{job.title}</h3>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', opacity: 0.4 }}>
                        <span>{job.type}</span>
                        <span>📍 {job.location || 'Remote'}</span>
                        <span>🎯 {job.experience || 'Any'}</span>
                        <span>Posted {fmtDate(job.postedAt)}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00D2FF' }}>{job.applicationCount}</div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.4 }}>Applications</div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                        {job.status === 'ACTIVE' && (
                          <button onClick={() => updateJobStatus(job.id, 'PAUSED')} style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.6rem', color: '#FFD700', cursor: 'pointer' }}>Pause</button>
                        )}
                        {job.status === 'PAUSED' && (
                          <button onClick={() => updateJobStatus(job.id, 'ACTIVE')} style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.6rem', color: '#39FF14', cursor: 'pointer' }}>Resume</button>
                        )}
                        {job.status !== 'CLOSED' && (
                          <button onClick={() => updateJobStatus(job.id, 'CLOSED')} style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.6rem', color: '#ff3366', cursor: 'pointer' }}>Close</button>
                        )}
                        <button onClick={() => { setTab('applications'); setJobFilter(job.id); }} style={{ background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.6rem', color: '#00D2FF', cursor: 'pointer' }}>View Apps</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ APPLICATIONS TAB ═══ */}
      {tab === 'applications' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTimeout(fetchData, 0); }}
              style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.75rem' }}>
              <option value="" style={{ background: '#111' }}>All Status</option>
              {Object.keys(APP_STATUS_COLORS).map(s => <option key={s} value={s} style={{ background: '#111' }}>{s}</option>)}
            </select>
            {jobFilter && (
              <button onClick={() => { setJobFilter(''); setTimeout(fetchData, 0); }} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.2)', color: '#00D2FF', fontSize: '0.7rem', cursor: 'pointer' }}>
                Clear job filter ✕
              </button>
            )}
          </div>

          {loading ? <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.3 }}>Loading...</div> : applications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📭</div>
              <p style={{ opacity: 0.4 }}>No applications found</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {applications.map(app => (
                <div key={app.id} onClick={() => setSelectedApp(app)} style={{
                  background: selectedApp?.id === app.id ? 'rgba(0,210,255,0.03)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedApp?.id === app.id ? 'rgba(0,210,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '12px', padding: '1rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '1rem'
                }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,210,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#00D2FF', flexShrink: 0 }}>
                    {app.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{app.fullName}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.jobTitle} · {app.department}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.6rem', padding: '3px 8px', borderRadius: '8px', background: `${APP_STATUS_COLORS[app.status]}15`, color: APP_STATUS_COLORS[app.status], border: `1px solid ${APP_STATUS_COLORS[app.status]}25` }}>{app.status}</span>
                    {app.rating && <span style={{ fontSize: '0.6rem', color: '#FFD700' }}>{'★'.repeat(app.rating)}</span>}
                    <span style={{ fontSize: '0.6rem', opacity: 0.3 }}>{fmtDate(app.appliedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Application Detail Modal */}
          {selectedApp && (
            <div onClick={() => setSelectedApp(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '550px', maxHeight: '85vh', overflowY: 'auto', background: 'rgba(12,12,12,0.98)', border: '1px solid rgba(0,210,255,0.2)', borderRadius: '20px', boxShadow: '0 0 60px rgba(0,210,255,0.1)', padding: '2rem', position: 'relative' }}>
                <button onClick={() => setSelectedApp(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,210,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#00D2FF' }}>
                    {selectedApp.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{selectedApp.fullName}</h2>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.4 }}>{selectedApp.jobTitle} · {selectedApp.department}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
                  {[
                    { l: 'Email', v: selectedApp.email },
                    { l: 'Phone', v: selectedApp.phone },
                    { l: 'Experience', v: selectedApp.experience },
                    { l: 'Current Role', v: selectedApp.currentRole || '—' },
                    { l: 'Company', v: selectedApp.currentCompany || '—' },
                    { l: 'Applied', v: fmtDate(selectedApp.appliedAt) },
                  ].map((f, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '8px 12px' }}>
                      <div style={{ fontSize: '0.6rem', opacity: 0.3, textTransform: 'uppercase', marginBottom: '2px' }}>{f.l}</div>
                      <div style={{ fontSize: '0.8rem' }}>{f.v}</div>
                    </div>
                  ))}
                </div>

                {selectedApp.linkedIn && <a href={selectedApp.linkedIn} target="_blank" rel="noopener" style={{ fontSize: '0.75rem', color: '#00D2FF', display: 'block', marginBottom: '4px' }}>🔗 LinkedIn</a>}
                {selectedApp.portfolio && <a href={selectedApp.portfolio} target="_blank" rel="noopener" style={{ fontSize: '0.75rem', color: '#00D2FF', display: 'block', marginBottom: '4px' }}>🔗 Portfolio</a>}
                {selectedApp.resumeUrl && <a href={`${API_URL.replace('/api', '')}${selectedApp.resumeUrl}`} target="_blank" rel="noopener" style={{ fontSize: '0.75rem', color: '#39FF14', display: 'block', marginBottom: '1rem' }}>📄 Download Resume ({selectedApp.resumeOriginalName || 'resume'})</a>}

                {selectedApp.coverLetter && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase', marginBottom: '4px' }}>Cover Letter</div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6, lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '10px 12px' }}>{selectedApp.coverLetter}</p>
                  </div>
                )}

                {/* Status Buttons */}
                <div style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase', marginBottom: '6px' }}>Update Status</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(APP_STATUS_COLORS).map(([s, c]) => (
                    <button key={s} onClick={() => updateAppStatus(selectedApp.id, s)} disabled={selectedApp.status === s}
                      style={{
                        padding: '5px 10px', borderRadius: '6px', fontSize: '0.65rem', cursor: selectedApp.status === s ? 'default' : 'pointer',
                        background: selectedApp.status === s ? `${c}25` : 'transparent',
                        border: `1px solid ${selectedApp.status === s ? c : 'rgba(255,255,255,0.08)'}`,
                        color: selectedApp.status === s ? c : 'rgba(255,255,255,0.4)',
                        opacity: selectedApp.status === s ? 1 : 0.7
                      }}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
