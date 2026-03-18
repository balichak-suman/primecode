import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { API_URL } from '../config/api';

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    officeStartTime: '09:00',
    officeEndTime: '18:00',
    gracePeriodMinutes: 15,
    maxWfhDays: 4
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Using generic analytics or settings endpoint if created, or simulated
      // If we didn't create a specific GET /settings route yet, we'll mock it temporarily
      // We will assume backend returns it from a new route we build shortly
      const res = await axios.get(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) setSettings(res.data);
    } catch (err) {
      console.warn('Could not fetch settings, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/admin/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('System Settings updated successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: '#00D2FF', textAlign: 'center', marginTop: '2rem' }}>Loading Configuration...</div>;

  return (
    <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 2rem' }}>
      <h2 className="gradient-text" style={{ marginBottom: '0.5rem' }}>System Configuration</h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Configure core parameters for attendance, grace periods, and WFH limits. Changes apply immediately to all incoming punches.
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', color: '#00D2FF', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Office Start Time</label>
            <input 
              type="time" 
              name="officeStartTime"
              value={settings.officeStartTime}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px', color: '#fff' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#00D2FF', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Office End Time</label>
            <input 
              type="time" 
              name="officeEndTime"
              value={settings.officeEndTime}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px', color: '#fff' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: '#00D2FF', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Grace Period (Minutes)</label>
          <input 
            type="number" 
            name="gracePeriodMinutes"
            min="0"
            max="120"
            value={settings.gracePeriodMinutes}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px', color: '#fff' }}
          />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', display: 'block' }}>
            Employees arriving after (Start Time + Grace Period) will be flagged as LATE automatically.
          </span>
        </div>

        <div>
          <label style={{ display: 'block', color: '#00D2FF', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Max WFH Days Allowed</label>
          <input 
            type="number" 
            name="maxWfhDays"
            min="0"
            max="31"
            value={settings.maxWfhDays}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px', color: '#fff' }}
          />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', display: 'block' }}>
            Maximum remote work days an employee can request per month.
          </span>
        </div>

        <button 
          type="submit" 
          className="btn-glow" 
          disabled={saving}
          style={{ marginTop: '1rem', width: '100%' }}
        >
          {saving ? 'Saving Config...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
};

export default SystemSettings;
