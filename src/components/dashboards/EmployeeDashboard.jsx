import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';

// Minimal mock data for aesthetics
const weeklyAttendance = [
  { day: 'Mon', hours: 8.5 },
  { day: 'Tue', hours: 7.8 },
  { day: 'Wed', hours: 8.2 },
  { day: 'Thu', hours: 9.1 },
  { day: 'Fri', hours: 6.5 },
];

const teamAnnouncements = [
  { id: 1, title: 'Q3 Town Hall Scheduled', date: 'Oct 15, 10:00 AM', unread: true },
  { id: 2, title: 'New Remote Work Guidelines', date: 'Oct 12, 14:30 PM', unread: true },
  { id: 3, title: 'System Maintenance Window', date: 'Oct 10, 02:00 AM', unread: false },
];

const recentActivity = [
  { id: 1, action: 'Marked Attendance (Punch In)', time: '09:02 AM, Today' },
  { id: 2, action: 'Leave Application Approved', time: '14:45 PM, Yesterday' },
  { id: 3, action: 'Assigned to Project Nexus', time: '11:20 AM, Oct 12' },
  { id: 4, action: 'Marked Attendance (Punch Out)', time: '18:15 PM, Oct 11' },
];

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Greeting Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 210, 255, 0.05)', padding: '1.5rem 2rem', borderRadius: '16px', border: '1px solid rgba(0, 210, 255, 0.1)' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
            <span className="gradient-text">{getGreeting()}, {user?.name?.split(' ')[0] || 'User'}</span> 👋
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem' }}>Ready to conquer the day? You are currently punched in.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', letterSpacing: '2px', textShadow: '0 0 10px rgba(0, 210, 255, 0.5)' }}>
            {formatTime(currentTime)}
          </div>
          <p style={{ color: '#00D2FF', marginTop: '0.5rem', fontWeight: '600' }}>4h 32m worked today</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        
        {/* Attendance Ring Card */}
        <div className="glass-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(0,210,255,0.2) 0%, transparent 70%)', borderRadius: '50%' }}></div>
          <h3 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '500' }}>This Month Attendance</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* CSS-based Progress Ring */}
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'conic-gradient(#00D2FF 82%, rgba(255,255,255,0.1) 0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>
                18/22
              </div>
            </div>
            <span style={{ fontSize: '0.9rem', color: '#00D2FF' }}>Days</span>
          </div>
        </div>

        {/* Leave Balance Card */}
        <div className="glass-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(121, 40, 202,0.2) 0%, transparent 70%)', borderRadius: '50%' }}></div>
          <h3 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '500' }}>Leave Balance</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>14 <span style={{ fontSize: '1rem', color: '#7928CA', fontWeight: 'normal' }}>remaining</span></div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>4 taken this year</div>
        </div>

        {/* Active Projects Card */}
        <div className="glass-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(57, 255, 20,0.2) 0%, transparent 70%)', borderRadius: '50%' }}></div>
          <h3 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '500' }}>Active Projects</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#39FF14', boxShadow: '0 0 10px #39FF14' }}></div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>3</div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>2 deadlines approaching</div>
        </div>

        {/* Payslip Card */}
        <div className="glass-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>
          <h3 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '500' }}>Latest Payslip</h3>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>September 2026</div>
          <div style={{ marginTop: '0.8rem' }}>
            <span style={{ background: 'rgba(57, 255, 20, 0.1)', color: '#39FF14', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              PAID
            </span>
          </div>
        </div>

      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 0' }}>
        <Link to="/dashboard/attendance" className="btn-glow" style={{ flex: 1, textAlign: 'center', padding: '1rem', textDecoration: 'none' }}>Mark Attendance</Link>
        <Link to="/dashboard/leaves" className="btn-outline" style={{ flex: 1, textAlign: 'center', padding: '1rem', textDecoration: 'none' }}>Apply for Leave</Link>
        <Link to="/dashboard/payroll" className="btn-glow" style={{ flex: 1, textAlign: 'center', padding: '1rem', textDecoration: 'none' }}>View Payslip</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Charts & Graphs Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Weekly Hours Logged</h3>
            <div style={{ height: '200px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyAttendance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0, 210, 255, 0.3)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {weeklyAttendance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hours > 8 ? '#00D2FF' : 'rgba(0, 210, 255, 0.4)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.1rem' }}>My Schedule</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '4px solid #7928CA' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', width: '60px' }}>10:30 AM</div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Sprint Planning</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Project Nexus</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '4px solid #00D2FF' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', width: '60px' }}>02:00 PM</div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Client Presentation</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Alpha Dynamics</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Timelines & Feeds Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between' }}>
              Team Announcements
              <span style={{ fontSize: '0.8rem', background: 'rgba(0, 210, 255, 0.1)', color: '#00D2FF', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>2 New</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {teamAnnouncements.map(announcement => (
                <div key={announcement.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                  {announcement.unread && <div style={{ position: 'absolute', top: '16px', right: '16px', width: '8px', height: '8px', borderRadius: '50%', background: '#00D2FF', boxShadow: '0 0 8px #00D2FF' }}></div>}
                  <div style={{ fontWeight: '600', paddingRight: '20px', color: announcement.unread ? '#fff' : 'rgba(255,255,255,0.7)' }}>{announcement.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>{announcement.date}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Recent Activity</h3>
            <div style={{ paddingLeft: '1rem', borderLeft: '2px solid rgba(0, 210, 255, 0.3)', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
              {recentActivity.map((activity, index) => (
                <div key={activity.id} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-21px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: index === 0 ? '#00D2FF' : '#222', border: `2px solid ${index === 0 ? '#00D2FF' : 'rgba(0, 210, 255, 0.5)'}`, boxShadow: index === 0 ? '0 0 10px #00D2FF' : 'none' }}></div>
                  <div style={{ color: index === 0 ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: index === 0 ? '600' : 'normal' }}>{activity.action}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.2rem 0 0' }}>{activity.time}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
};

export default EmployeeDashboard;
