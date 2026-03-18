import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { Link } from 'react-router-dom';
import axios from 'axios';

import { API_URL } from '../../config/api';

const roleDistribution = [
  { role: 'Employees', count: 98 },
  { role: 'HR Managers', count: 12 },
  { role: 'Admins', count: 5 },
];
const ROLE_COLORS = ['#00D2FF', '#7928CA', '#39FF14'];

const revenueData = [
  { month: 'Jun', rev: 120, cost: 80 },
  { month: 'Jul', rev: 135, cost: 85 },
  { month: 'Aug', rev: 150, cost: 95 },
  { month: 'Sep', rev: 180, cost: 110 },
  { month: 'Oct', rev: 210, cost: 120 },
];

const auditLogs = [
  { id: 1, action: 'Role Updated (Alex C. -> HR)', user: 'Admin Sarah', time: '10 mins ago', type: 'SECURITY' },
  { id: 2, action: 'Payroll Disbursed (Sep 2026)', user: 'System Auto', time: '2 hours ago', type: 'FINANCE' },
  { id: 3, action: 'New API Key Generated', user: 'Admin Sarah', time: '5 hours ago', type: 'DEV' },
  { id: 4, action: 'Failed DB Backup', user: 'System Auto', time: '12 hours ago', type: 'WARNING' },
  { id: 5, action: 'System Settings Saved', user: 'Admin John', time: 'Yesterday', type: 'CONFIG' },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [openPositions, setOpenPositions] = useState(0);

  useEffect(() => {
    axios.get(`${API_URL}/careers/jobs`).then(r => setOpenPositions(r.data?.total || r.data?.jobs?.length || 0)).catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            System Administration
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>Supervisory overview of HRMS health and financials.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/dashboard/settings" className="btn-outline" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            System Settings
          </Link>
          <Link to="/dashboard/employees" className="btn-glow" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Manage Roles
          </Link>
        </div>
      </div>

      {/* System Administration & HR Overview Stats */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: '-1rem', color: 'rgba(255,255,255,0.8)' }}>Organization Pulse</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem' }}>
        {[
          { label: 'Total Employees', value: '115', trend: '+3', color: '#00D2FF' },
          { label: 'Present Today', value: '102', trend: '88%', color: '#39FF14' },
          { label: 'On Leave Today', value: '8', trend: '-2', color: '#FFB800' },
          { label: 'New Joiners (Month)', value: '5', trend: '+1', color: '#7928CA' },
          { label: 'Open Positions', value: String(openPositions), trend: 'Active', color: '#00D2FF' }
        ].map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.5rem', borderTop: `2px solid ${stat.color}` }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{stat.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>{stat.value}</div>
              <div style={{ fontSize: '0.85rem', color: stat.color, background: `${stat.color}20`, padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: '1.2rem', marginBottom: '-1rem', marginTop: '1rem', color: 'rgba(255,255,255,0.8)' }}>Infrastructure Health</h3>
      {/* System Health Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '3px solid #39FF14' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#39FF14', boxShadow: '0 0 8px #39FF14' }}></div>
            API Health
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>42<span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal', marginLeft: '5px' }}>ms</span></div>
          <div style={{ fontSize: '0.8rem', color: '#39FF14', marginTop: '0.5rem' }}>100% Uptime</div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '3px solid #00D2FF' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D2FF" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Database Status
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>Syncing</div>
          <div style={{ fontSize: '0.8rem', color: '#00D2FF', marginTop: '0.5rem' }}>Last Backup: 1h ago</div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '3px solid #7928CA' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7928CA" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Active Sessions
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>24</div>
          <div style={{ fontSize: '0.8rem', color: '#7928CA', marginTop: '0.5rem' }}>Peak: 85 (Today)</div>
        </div>

        {/* Failed Logins Security Warning */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(255, 51, 102, 0.05) 0%, transparent 100%)', border: '1px solid rgba(255,51,102,0.2)' }}>
          <div style={{ color: '#FF3366', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Security Flags
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>3</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>Failed lockouts today</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Big Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Revenue & Payroll Cost Area Chart */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Revenue vs Payroll Cost (in $10k)</h3>
              <select style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px', outline: 'none' }}>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <div style={{ height: '280px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D2FF" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00D2FF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF3366" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#FF3366" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="rev" stroke="#00D2FF" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                  <Area type="monotone" dataKey="cost" stroke="#FF3366" fillOpacity={1} fill="url(#colorCost)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User Role Distribution */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>User Role Distribution</h3>
            <div style={{ height: '150px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleDistribution} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="role" type="category" stroke="rgba(255,255,255,0.6)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#fff', fontSize: 12 }}>
                    {roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column: Audit Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-card" style={{ padding: '1.5rem', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Recent Audit Logs</h3>
              <Link to="/dashboard/audit" style={{ color: '#00D2FF', fontSize: '0.85rem', textDecoration: 'none' }}>View Full Log</Link>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {auditLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: `3px solid ${log.type === 'WARNING' ? '#FF3366' : log.type === 'FINANCE' ? '#39FF14' : log.type === 'SECURITY' ? '#7928CA' : '#00D2FF'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{log.action}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{log.time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      {log.user}
                    </span>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                      {log.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
