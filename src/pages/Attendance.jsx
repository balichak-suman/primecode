import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

import { API_URL } from '../config/api';

const Attendance = () => {
  const [history, setHistory] = useState([]);
  const [teamHistory, setTeamHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [workedSeconds, setWorkedSeconds] = useState(0);
  const [viewMode, setViewMode] = useState('ME'); // ME or TEAM
  
  const { user, hasPermission } = useAuth(); // Has role & permissions

  // Fetch initial data & start timer
  useEffect(() => {
    fetchHistory();
    if (hasPermission('view:all_attendance')) {
      fetchTeamHistory();
    }
    
    // Clock tick
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [hasPermission]);

  // Update live worked seconds if currently clocked in
  useEffect(() => {
    let interval;
    if (todayAttendance && todayAttendance.clockIn && !todayAttendance.clockOut) {
      interval = setInterval(() => {
        const diffMs = new Date() - new Date(todayAttendance.clockIn);
        setWorkedSeconds(Math.floor(diffMs / 1000));
      }, 1000);
    } else if (todayAttendance && todayAttendance.totalHours) {
      setWorkedSeconds(Math.floor(todayAttendance.totalHours * 3600));
    }
    return () => clearInterval(interval);
  }, [todayAttendance]);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/attendance/my-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data.history);
      setStats(res.data.stats);

      // Find today's active punch if exists
      const todayString = new Date().toDateString();
      const todayRecord = res.data.history.find(r => new Date(r.date).toDateString() === todayString);
      setTodayAttendance(todayRecord);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const fetchTeamHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetching today's team attendance by default
      const res = await axios.get(`${API_URL}/attendance/all?date=${new Date().toISOString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch team history', err);
    }
  };

  const handlePunch = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    // Simulate getting location
    const simLocation = Math.random() > 0.5 ? "Office (HQ)" : "Remote (Home)";
    
    try {
      if (!todayAttendance || (todayAttendance && todayAttendance.clockOut)) {
        // Clock In
        await axios.post(`${API_URL}/attendance/clock-in`, {
          location: simLocation,
          ipAddress: "192.168.1.100" // Hardcoded simulation for IP
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        // Clock Out
        await axios.post(`${API_URL}/attendance/clock-out`, {}, { headers: { Authorization: `Bearer ${token}` } });
      }
      fetchHistory();
      if (hasPermission('view:all_attendance')) fetchTeamHistory();
    } catch (err) {
      alert(err.response?.data?.error || 'Punch action failed');
    } finally {
      setLoading(false);
    }
  };

  // Format digital clock
  const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Format live worked hours: HH:MM:SS
  const hrs = Math.floor(workedSeconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((workedSeconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (workedSeconds % 60).toString().padStart(2, '0');
  
  const isPunchedIn = todayAttendance && todayAttendance.clockIn && !todayAttendance.clockOut;

  // --- Calendar Generation ---
  const generateMonthGrid = () => {
    const year = currentTime.getFullYear();
    const month = currentTime.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const grid = [];
    for (let i = 0; i < firstDay; i++) grid.push(null); // Empty slots
    for (let i = 1; i <= daysInMonth; i++) {
      const match = history.find(h => {
        const d = new Date(h.date);
        return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
      });
      grid.push({ day: i, record: match });
    }
    return grid;
  };

  const renderStatusChips = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      {[
        { label: 'Present', val: stats.PRESENT || 0, color: '#00D2FF' },
        { label: 'Absent', val: stats.ABSENT || 0, color: '#FF3366' },
        { label: 'Late', val: stats.LATE || 0, color: '#FFB800' },
        { label: 'Half-Day', val: stats.HALF_DAY || 0, color: '#7928CA' },
        { label: 'WFH', val: stats.WFH || 0, color: '#39FF14' }
      ].map(s => (
        <div key={s.label} className="glass-card" style={{ padding: '1rem', textAlign: 'center', borderTop: `2px solid ${s.color}` }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{s.val}</div>
          <div style={{ fontSize: '0.8rem', color: s.color }}>{s.label}</div>
        </div>
      ))}
    </div>
  );

  const renderTeamView = () => (
    <div className="glass-card" style={{ padding: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem' }}>Team Attendance (Today)</h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              <th style={{ padding: '1rem' }}>Employee</th>
              <th style={{ padding: '1rem' }}>Department</th>
              <th style={{ padding: '1rem' }}>Punch In</th>
              <th style={{ padding: '1rem' }}>Punch Out</th>
              <th style={{ padding: '1rem' }}>Hours</th>
              <th style={{ padding: '1rem' }}>Location</th>
              <th style={{ padding: '1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {teamHistory.map((record) => (
              <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                   {record.user?.avatar ? (
                     <img src={record.user.avatar} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="avatar"/>
                   ) : (
                     <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                       {record.user?.name?.charAt(0) || '?'}
                     </div>
                   )}
                   <div>
                     <div style={{ fontWeight: 'bold' }}>{record.user?.name}</div>
                     <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{record.user?.employeeId}</div>
                   </div>
                </td>
                <td style={{ padding: '1rem', color: 'rgba(255,255,255,0.8)' }}>{record.user?.department || '---'}</td>
                <td style={{ padding: '1rem' }}>{record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '---'}</td>
                <td style={{ padding: '1rem' }}>{record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '---'}</td>
                <td style={{ padding: '1rem' }}>
                   {record.totalHours ? (
                     <span style={{ color: record.overtime > 0 ? '#39FF14' : '#fff' }}>
                       {record.totalHours}h {record.overtime > 0 && <span style={{ fontSize: '0.75rem' }}>(+{record.overtime} OT)</span>}
                     </span>
                   ) : '---'}
                </td>
                <td style={{ padding: '1rem', color: '#00D2FF', fontSize: '0.85rem' }}>{record.location || '---'}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    background: record.status === 'LATE' ? 'rgba(255,184,0,0.1)' : record.status === 'WFH' ? 'rgba(57,255,20,0.1)' : 'rgba(0,210,255,0.1)',
                    color: record.status === 'LATE' ? '#FFB800' : record.status === 'WFH' ? '#39FF14' : '#00D2FF',
                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' 
                  }}>
                    {record.status} {record.lateMinutes > 0 && `(${record.lateMinutes}m)`}
                  </span>
                </td>
              </tr>
            ))}
            {teamHistory.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>No attendance records found for today.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Dynamic View Toggle (For HR/Admins) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="gradient-text">Attendance Tracking</h2>
        
        {hasPermission('view:all_attendance') && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' }}>
            <button 
              onClick={() => setViewMode('ME')}
              style={{ background: viewMode === 'ME' ? '#7928CA' : 'transparent', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', transition: '0.2s', fontWeight: viewMode === 'ME' ? 'bold' : 'normal' }}
            >
              My Attendance
            </button>
            <button 
              onClick={() => setViewMode('TEAM')}
              style={{ background: viewMode === 'TEAM' ? '#7928CA' : 'transparent', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', transition: '0.2s', fontWeight: viewMode === 'TEAM' ? 'bold' : 'normal' }}
            >
              Team Overview
            </button>
          </div>
        )}
      </div>

      {viewMode === 'TEAM' ? renderTeamView() : (
        <>
          {/* Top Section: Punch Card & Today's Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
        
        {/* Left: Punch Interaction */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>{dateString}</div>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#00D2FF', letterSpacing: '4px', textShadow: '0 0 20px rgba(0,210,255,0.3)', fontFamily: 'monospace', marginBottom: '3rem' }}>
            {timeString}
          </div>

          {/* Animated Cyber Circle */}
          <div 
            onClick={!loading ? handlePunch : undefined}
            style={{ 
              width: '180px', height: '180px', borderRadius: '50%', 
              background: isPunchedIn ? 'transparent' : 'rgba(0,0,0,0.5)', 
              border: `4px solid ${isPunchedIn ? '#7928CA' : '#00D2FF'}`,
              boxShadow: isPunchedIn ? '0 0 40px rgba(121, 40, 202, 0.4), inset 0 0 30px rgba(121, 40, 202, 0.2)' : '0 0 40px rgba(0, 210, 255, 0.4), inset 0 0 20px rgba(0, 210, 255, 0.2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: loading ? 'scale(0.95)' : 'scale(1)',
              position: 'relative'
            }}
            onMouseEnter={(e) => { if(!loading) e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseLeave={(e) => { if(!loading) e.currentTarget.style.transform = 'scale(1)' }}
          >
            {loading ? (
               <div style={{ border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
            ) : (
               <>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', letterSpacing: '2px', zIndex: 2 }}>
                    {isPunchedIn ? 'PUNCH OUT' : 'PUNCH IN'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', zIndex: 2 }}>
                    Click to capture
                  </div>
               </>
            )}
            
            {/* Ripple effect rings */}
            <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: `1px solid ${isPunchedIn ? '#7928CA' : '#00D2FF'}`, animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite', opacity: 0.5 }}></div>
          </div>

          <div style={{ marginTop: '3rem', textAlign: 'center' }}>
             <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>Total Logged Today</div>
             <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' }}>
               {hrs}:{mins}:{secs}
             </div>
          </div>
        </div>

        {/* Right: Today's Detail & Action Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card" style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: '#00D2FF' }}>Current Status</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Punch In</span>
              <span style={{ fontWeight: 'bold' }}>{todayAttendance?.clockIn ? new Date(todayAttendance.clockIn).toLocaleTimeString() : '--:--:--'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Punch Out</span>
              <span style={{ fontWeight: 'bold' }}>{todayAttendance?.clockOut ? new Date(todayAttendance.clockOut).toLocaleTimeString() : '--:--:--'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Captured Location</span>
              <span style={{ color: '#39FF14' }}>{todayAttendance?.location || '---'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>IP Address</span>
              <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{todayAttendance?.ipAddress || '---'}</span>
            </div>
          </div>
          
          <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(90deg, rgba(121,40,202,0.1) 0%, transparent 100%)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Attendance Regularization</h3>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>Forgot to punch or have a system error? Request a correction from your manager.</p>
            <button className="btn-outline" style={{ width: '100%', borderColor: '#7928CA', color: '#7928CA' }}>Request Regularization</button>
          </div>

        </div>
      </div>

      {renderStatusChips()}

      {/* Calendar Grid */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem' }}>Monthly Log</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>&lt; Prev</button>
            <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Next &gt;</button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '10px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', paddingBottom: '10px' }}>{d}</div>
          ))}
          
          {generateMonthGrid().map((cell, i) => {
            if (!cell) return <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', minHeight: '80px' }} />;
            
            const rec = cell.record;
            let bgColor = 'rgba(255,255,255,0.05)';
            let accentColor = 'transparent';
            if (rec) {
               if(rec.status === 'PRESENT') accentColor = '#00D2FF';
               if(rec.status === 'LATE') accentColor = '#FFB800';
               if(rec.status === 'ABSENT') accentColor = '#FF3366';
               if(rec.status === 'WFH') accentColor = '#39FF14';
               if(rec.status === 'HALF_DAY') accentColor = '#7928CA';
               
               bgColor = `rgba(${parseInt(accentColor.slice(1,3), 16)}, ${parseInt(accentColor.slice(3,5), 16)}, ${parseInt(accentColor.slice(5,7), 16)}, 0.1)`;
            }

            return (
              <div key={i} style={{ 
                background: bgColor, borderTop: `3px solid ${accentColor}`, borderRadius: '8px', 
                padding: '10px', minHeight: '80px', display: 'flex', flexDirection: 'column', 
                cursor: 'pointer', transition: 'all 0.2s', ':hover': { transform: 'scale(1.02)' }
              }}>
                <div style={{ fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' }}>{cell.day}</div>
                {rec && (
                  <div style={{ marginTop: 'auto', fontSize: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: accentColor, fontWeight: 'bold' }}>{rec.status}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{rec.totalHours ? `${rec.totalHours}h` : '--'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}

    </div>
  );
};

export default Attendance;
