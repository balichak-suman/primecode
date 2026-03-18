import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import axios from 'axios';

import { API_URL } from '../../config/api';

const deptData = [
  { name: 'Engineering', value: 45 },
  { name: 'Design', value: 15 },
  { name: 'Marketing', value: 20 },
  { name: 'HR & Ops', value: 10 },
  { name: 'Sales', value: 25 },
];
const COLORS = ['#00D2FF', '#7928CA', '#39FF14', '#FF3366', '#FFB800'];

const attendanceTrend = [
  { date: 'Oct 01', rate: 92 },
  { date: 'Oct 05', rate: 95 },
  { date: 'Oct 10', rate: 88 },
  { date: 'Oct 15', rate: 96 },
  { date: 'Oct 20', rate: 94 },
  { date: 'Oct 25', rate: 97 },
];

const pendingLeaves = [
  { id: 1, emp: 'Alex Chen', type: 'Sick Leave', dates: 'Oct 28 - Oct 29', status: 'Pending' },
  { id: 2, emp: 'Sarah Jenkins', type: 'Annual', dates: 'Nov 01 - Nov 05', status: 'Pending' },
  { id: 3, emp: 'Mike Ross', type: 'Personal', dates: 'Oct 31', status: 'Pending' },
];

const upcomingEvents = [
  { id: 1, title: "Diwali Holiday", date: "Nov 02", type: "Holiday", color: "#FFB800" },
  { id: 2, title: "Alex's Work Anniversary (2 Yrs)", date: "Nov 05", type: "Anniversary", color: "#39FF14" },
  { id: 3, title: "Sarah's Birthday", date: "Nov 08", type: "Birthday", color: "#FF3366" },
];

const HRDashboard = () => {
  const { user } = useAuth();
  const [openPositions, setOpenPositions] = useState(0);
  const [newApps, setNewApps] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    axios.get(`${API_URL}/careers/jobs`).then(r => setOpenPositions(r.data?.total || r.data?.jobs?.length || 0)).catch(() => {});
    axios.get(`${API_URL}/careers/admin/applications?status=NEW`, { headers: h }).then(r => setNewApps(r.data?.total || 0)).catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            HR Overview
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>Here's what's happening across the organization today.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export Report
          </button>
          <Link to="/dashboard/employees" className="btn-glow" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Employee
          </Link>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
        {[
          { label: 'Total Employees', value: '115', trend: '+3', color: '#00D2FF' },
          { label: 'Present Today', value: '102', trend: '88%', color: '#39FF14' },
          { label: 'On Leave Today', value: '8', trend: '-2', color: '#FFB800' },
          { label: 'New Joiners (Month)', value: '5', trend: '+1', color: '#7928CA' },
          { label: 'Open Positions', value: String(openPositions), trend: `${newApps} new`, color: '#00D2FF' }
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column: Charts & Tables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {/* Department Headcount (Pie Card) */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Department Headcount</h3>
              <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deptData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {deptData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>115</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Total</div>
                </div>
              </div>
            </div>

            {/* Attendance Trend (Line Card) */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Overall Attendance Rate</h3>
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis domain={['auto', 'auto']} stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                    <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #7928CA', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="rate" stroke="#7928CA" strokeWidth={3} dot={{ fill: '#7928CA', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Leave Requests */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Pending Leave Approvals</h3>
              <Link to="/dashboard/leaves" style={{ color: '#00D2FF', fontSize: '0.85rem', textDecoration: 'none' }}>View All</Link>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.5rem 1rem 1rem' }}>Employee</th>
                  <th style={{ padding: '0.5rem 1rem 1rem' }}>Leave Type</th>
                  <th style={{ padding: '0.5rem 1rem 1rem' }}>Dates</th>
                  <th style={{ padding: '0.5rem 1rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map(leave => (
                  <tr key={leave.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{leave.emp}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{leave.type}</span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>{leave.dates}</td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button style={{ background: 'rgba(57, 255, 20, 0.1)', color: '#39FF14', border: '1px solid rgba(57, 255, 20, 0.3)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(57, 255, 20, 0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(57, 255, 20, 0.1)'}>Approve</button>
                      <button style={{ background: 'rgba(255, 51, 102, 0.1)', color: '#FF3366', border: '1px solid rgba(255, 51, 102, 0.3)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255, 51, 102, 0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255, 51, 102, 0.1)'}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Column: Pending Actions & Events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,51,102,0.02) 100%)', border: '1px solid rgba(255,51,102,0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: '#FF3366', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              Attention Required
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem' }}>Leave Approvals</div>
                <div style={{ background: '#FF3366', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>3</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem' }}>Probation Reviews Due</div>
                <div style={{ background: '#FFB800', color: '#000', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>2</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem' }}>Expiring ID Documents</div>
                <div style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>0</div>
              </div>
              {newApps > 0 && (
                <Link to="/dashboard/jobs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,210,255,0.05)', padding: '1rem', borderRadius: '8px', textDecoration: 'none', color: '#fff', border: '1px solid rgba(0,210,255,0.1)' }}>
                  <div style={{ fontSize: '0.9rem' }}>New Applications</div>
                  <div style={{ background: '#00D2FF', color: '#000', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>{newApps}</div>
                </Link>
              )}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Upcoming Events</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {upcomingEvents.map(event => (
                <div key={event.id} style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem', width: '60px', height: '60px', borderTop: `2px solid ${event.color}` }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{event.date.split(' ')[0]}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{event.date.split(' ')[1]}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{event.title}</div>
                    <div style={{ fontSize: '0.8rem', color: event.color, marginTop: '0.2rem' }}>{event.type}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-outline" style={{ width: '100%', marginTop: '1.5rem', padding: '0.6rem', fontSize: '0.85rem' }}>
              View Full Calendar
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default HRDashboard;
