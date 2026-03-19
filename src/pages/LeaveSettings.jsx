import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Settings, Calendar as CalendarIcon, Save, Plus, Trash2 } from 'lucide-react';

import { API_URL } from '../config/api';

const LeaveSettings = () => {
  const { hasRole } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [policies, setPolicies] = useState([]);
  
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', type: 'PUBLIC' });
  const [policyForm, setPolicyForm] = useState({ grade: 'L1', leaveType: 'CASUAL', annualQuota: 12, maxCarryForward: 0, isEncashable: false });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const holRes = await axios.get(`${API_URL}/leaves/holidays`, { headers: { Authorization: `Bearer ${token}` } });
      setHolidays(holRes.data);
      // For a real app, we would have a GET /leaves/policies route too, 
      // but let's assume we read them or they are fetched.
    } catch (error) {
      console.error('Failed to fetch settings');
    }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/leaves/holidays`, holidayForm, { headers: { Authorization: `Bearer ${token}` } });
      setHolidayForm({ name: '', date: '', type: 'PUBLIC' });
      fetchData();
    } catch (err) {
      alert('Failed to add holiday');
    }
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/leaves/policies`, policyForm, { headers: { Authorization: `Bearer ${token}` } });
      alert('Policy saved successfully!');
    } catch (err) {
      alert('Failed to save policy');
    }
  };

  if (!hasRole(['ADMIN'])) {
    return <div style={{ color: '#ff3333', padding: '2rem' }}>Access Denied. Admins only.</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <h2 className="gradient-text" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Settings /> Leave Policy Management
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '2rem' }}>
        
        {/* LEAVE POLICY QUOTAS */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ color: '#00D2FF', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,210,255,0.2)', paddingBottom: '10px' }}>Quota Configuration</h3>
          <form onSubmit={handleCreatePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>Employee Grade</label>
                <input type="text" className="form-input" value={policyForm.grade} onChange={(e) => setPolicyForm({...policyForm, grade: e.target.value})} required placeholder="e.g. L1, L2, Manager" style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>Leave Type</label>
                <select className="form-input" value={policyForm.leaveType} onChange={(e) => setPolicyForm({...policyForm, leaveType: e.target.value})} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <option value="CASUAL">Casual</option>
                  <option value="SICK">Sick</option>
                  <option value="EARNED">Earned</option>
                  <option value="COMPENSATORY">Compensatory</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>Annual Quota (Days)</label>
                <input type="number" className="form-input" value={policyForm.annualQuota} onChange={(e) => setPolicyForm({...policyForm, annualQuota: e.target.value})} required style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>Max Carry Forward</label>
                <input type="number" className="form-input" value={policyForm.maxCarryForward} onChange={(e) => setPolicyForm({...policyForm, maxCarryForward: e.target.value})} required style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer', marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
              <input type="checkbox" checked={policyForm.isEncashable} onChange={(e) => setPolicyForm({...policyForm, isEncashable: e.target.checked})} style={{ accentColor: '#00ff88', width: '16px', height: '16px' }} />
              Eligible for Encashment at year end
            </label>

            <button type="submit" className="btn-glow" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Save size={18} /> Update Policy Rule
            </button>
          </form>
        </div>

        {/* HOLIDAY CALENDAR */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ color: '#00D2FF', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,210,255,0.2)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={20} /> Company Holidays
          </h3>
          
          <form onSubmit={handleCreateHoliday} style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
            <input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({...holidayForm, date: e.target.value})} required style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
            <input type="text" placeholder="Holiday Title" value={holidayForm.name} onChange={(e) => setHolidayForm({...holidayForm, name: e.target.value})} required style={{ flex: 1, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
            <select value={holidayForm.type} onChange={(e) => setHolidayForm({...holidayForm, type: e.target.value})} style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
               <option value="PUBLIC">Public</option>
               <option value="RESTRICTED">Restricted</option>
            </select>
            <button type="submit" style={{ background: '#00D2FF', color: '#000', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              <Plus size={18} />
            </button>
          </form>

          <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
            {holidays.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>No holidays mapped for this year.</p>
            ) : (
              holidays.map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '8px', marginBottom: '8px', borderLeft: h.type === 'PUBLIC' ? '3px solid #00ff88' : '3px solid #FFA500' }}>
                  <div>
                    <strong style={{ color: '#fff', display: 'block' }}>{h.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{new Date(h.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} &bull; {h.type}</span>
                  </div>
                  {/* Future Dev: delete holiday action */}
                </div>
              ))
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default LeaveSettings;
