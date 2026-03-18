import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Target, TrendingUp, Award, Clock, BarChart2, 
  Brain, Briefcase, Zap, History
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

import { API_URL } from '../config/api';

const Performance = () => {
  const [activeTab, setActiveTab] = useState('goals');
  const [goals, setGoals] = useState([]);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [appraisalStep, setAppraisalStep] = useState(1);
  const hasFetchedGoals = useRef(false);

  // Fetch goals on mount - only once
  useEffect(() => {
    if (!hasFetchedGoals.current) {
      hasFetchedGoals.current = true;
      loadGoals();
    }
  }, []);

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    if (activeTab === 'appraisal' && !review) {
      loadAppraisal();
    }
  }, [activeTab]);

  const getToken = () => localStorage.getItem('token');

  const loadGoals = async () => {
    console.log('[Performance] Loading goals...');
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) { setError('No auth token found'); return; }
      
      const res = await axios.get(`${API_URL}/performance/goals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[Performance] Goals response:', res.data);
      const data = Array.isArray(res.data) ? res.data : [];
      setGoals(data);
      console.log(`[Performance] Set ${data.length} goals`);
    } catch (err) {
      console.error('[Performance] Goals fetch error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAppraisal = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) return;
      const res = await axios.get(`${API_URL}/performance/reviews/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReview(res.data || null);
    } catch (err) {
      console.error('[Performance] Appraisal fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ===== RENDER SECTIONS =====

  const GoalsSection = () => {
    console.log('[Performance] Rendering GoalsSection, goals.length =', goals.length);
    
    if (loading && goals.length === 0) {
      return <div style={{ textAlign: 'center', padding: '4rem', color: '#00D2FF' }}>Loading objectives...</div>;
    }

    if (error && goals.length === 0) {
      return (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Briefcase size={40} style={{ color: '#ff3366', marginBottom: '1rem' }} />
          <h3 style={{ color: '#ff3366' }}>Sync Failed</h3>
          <p style={{ opacity: 0.5 }}>{error}</p>
          <button className="btn-outline" style={{ marginTop: '1rem' }} onClick={loadGoals}>Retry</button>
        </div>
      );
    }

    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="gradient-text">Personnel Objectives</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '4px' }}>
            Operational goals for the current cycle
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
            <Target style={{ color: '#00D2FF' }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Goals</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{goals.length}</div>
            </div>
          </div>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
            <TrendingUp style={{ color: '#7928CA' }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Avg Progress</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {goals.length > 0 ? Math.round(goals.reduce((a, g) => a + ((g.current || 0) / (g.target || 100)) * 100, 0) / goals.length) : 0}%
              </div>
            </div>
          </div>
        </div>

        {goals.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {goals.map(goal => {
              const pct = goal.target ? Math.round((goal.current / goal.target) * 100) : 0;
              const statusColor = goal.status === 'COMPLETED' ? '#39FF14' : goal.status === 'AT_RISK' ? '#ff3366' : '#00D2FF';
              const statusBg = goal.status === 'COMPLETED' ? 'rgba(57,255,20,0.1)' : goal.status === 'AT_RISK' ? 'rgba(255,51,102,0.1)' : 'rgba(0,210,255,0.1)';
              
              return (
                <div key={goal.id} className="glass-card" style={{ padding: '1.5rem', position: 'relative', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', fontSize: '0.6rem', fontWeight: 800, padding: '4px 8px', borderRadius: '4px', background: statusBg, color: statusColor }}>
                    {goal.status}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#00D2FF', marginTop: '0.5rem' }}>{goal.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, height: '3rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
                    {goal.description || 'No description.'}
                  </p>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '5px' }}>
                      <span style={{ opacity: 0.6 }}>Progress</span>
                      <span style={{ color: '#00D2FF' }}>{pct}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #7928CA, #00D2FF)', transition: 'width 1s ease' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', opacity: 0.5 }}>
                    <Clock size={14} />
                    <span>{goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : 'No deadline'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', textAlign: 'center' }}>
            <Target size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p style={{ opacity: 0.5 }}>No objectives found. Goals will appear here once created.</p>
            <button className="btn-glow" style={{ marginTop: '1.5rem' }} onClick={loadGoals}>Refresh</button>
          </div>
        )}
      </div>
    );
  };

  const AppraisalSection = () => {
    if (!review) {
      return (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', textAlign: 'center' }}>
          <Brain size={48} style={{ color: '#00D2FF', marginBottom: '1rem', opacity: 0.2 }} />
          <p style={{ opacity: 0.5 }}>No active review cycle detected.</p>
        </div>
      );
    }

    const selfGoals = review.selfAssessment?.goals || [];
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 className="gradient-text">Personnel Core Review</h2>
          <div style={{ fontSize: '0.8rem', textAlign: 'right' }}>
            Phase {appraisalStep} of 6
            <div style={{ width: '120px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px' }}>
              <div style={{ height: '100%', width: `${(appraisalStep/6)*100}%`, background: '#00D2FF', transition: 'width 0.4s' }}></div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          {appraisalStep === 1 && (
            <div>
              <h3 style={{ color: '#00D2FF', marginBottom: '1.5rem' }}>1. Goal Achievement</h3>
              {selfGoals.length > 0 ? selfGoals.map((g, i) => (
                <div key={i} style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>{g.title || 'Objective'}</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                    {[1,2,3,4,5].map(r => (
                      <button key={r} style={{ width: '36px', height: '36px', borderRadius: '6px', background: g.score === r ? '#00D2FF' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: g.score === r ? '#000' : '#fff', cursor: 'pointer', fontWeight: g.score === r ? 'bold' : 'normal' }}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea placeholder="Notes..." style={{ width: '100%', height: '80px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '1rem', borderRadius: '8px' }} defaultValue={g.comments || ''} />
                </div>
              )) : <p style={{ opacity: 0.5 }}>No goals in this review.</p>}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button className="btn-outline" onClick={() => setAppraisalStep(s => Math.max(1, s-1))} disabled={appraisalStep === 1}>Return</button>
            <button className="btn-glow" onClick={() => setAppraisalStep(s => Math.min(6, s+1))}>
              {appraisalStep === 6 ? 'Submit Final' : 'Next Phase'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AnalyticsSection = () => (
    <div>
      <h2 className="gradient-text" style={{ marginBottom: '2rem' }}>Performance Intelligence</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', height: '400px' }}>
          <h3 style={{ opacity: 0.7, marginBottom: '2rem' }}>Competency Radar</h3>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="99%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                { subject: 'Communication', A: 120 },
                { subject: 'Technical', A: 140 },
                { subject: 'Teamwork', A: 98 },
                { subject: 'Initiative', A: 110 },
                { subject: 'Leadership', A: 85 },
              ]}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                <Radar name="Score" dataKey="A" stroke="#00D2FF" fill="#00D2FF" fillOpacity={0.6} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #00D2FF' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', height: '400px' }}>
          <h3 style={{ opacity: 0.7, marginBottom: '2rem' }}>Rating Comparison</h3>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={[
                { name: 'Self', score: 4.2 },
                { name: 'Manager', score: 3.8 },
                { name: 'Peer', score: 4.5 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#0a0a0a', border: '1px solid #7928CA' }} />
                <Bar dataKey="score" fill="#7928CA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const ArchivesSection = () => (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', textAlign: 'center' }}>
      <History size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
      <p style={{ opacity: 0.5 }}>Archived metrics will appear here.</p>
    </div>
  );

  return (
    <div style={{ color: '#fff' }}>
      {/* TABS */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
        {[
          { id: 'goals', icon: <Target size={18} />, label: 'Objectives' },
          { id: 'appraisal', icon: <Award size={18} />, label: 'Appraisal' },
          { id: 'analytics', icon: <BarChart2 size={18} />, label: 'Analytics' },
          { id: 'history', icon: <History size={18} />, label: 'Archives' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === tab.id ? '#00D2FF' : 'rgba(255,255,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '1rem 0.5rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap',
              borderBottom: activeTab === tab.id ? '2px solid #00D2FF' : '2px solid transparent',
              fontSize: '0.9rem',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div>
        {activeTab === 'goals' && <GoalsSection />}
        {activeTab === 'appraisal' && <AppraisalSection />}
        {activeTab === 'analytics' && <AnalyticsSection />}
        {activeTab === 'history' && <ArchivesSection />}
      </div>
    </div>
  );
};

export default Performance;
