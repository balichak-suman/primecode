import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import { FileText, CheckCircle, XCircle, Clock, Calendar as CalendarIcon, X, Plus, Download, MessageSquare } from 'lucide-react';

import { API_URL } from '../config/api';

// Utility for calculating business days on frontend
const calculateBusinessDays = (start, end, holidays = []) => {
  if (!start || !end) return 0;
  let count = 0;
  let curDate = new Date(start);
  const endDate = new Date(end);
  
  if (curDate > endDate) return 0;

  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isHoliday = holidays.some(h => new Date(h.date).toDateString() === curDate.toDateString());

    if (!isWeekend && !isHoliday) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};

const Leaves = () => {
  const { user, hasPermission, hasRole } = useAuth();
  const [viewMode, setViewMode] = useState('ME'); // 'ME' | 'TEAM'
  
  const [balance, setBalance] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'CASUAL',
    startDate: '',
    endDate: '',
    reason: '',
    halfDay: false
  });
  const [calcDays, setCalcDays] = useState(0);

  // Approve/Reject Modal State
  const [actionModal, setActionModal] = useState({ show: false, leaveId: null, actionType: null, comments: '' });

  useEffect(() => {
    fetchInitialData();
  }, [viewMode]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Always fetch balance and holidays for ME view/Applying
      const balRes = await axios.get(`${API_URL}/leaves/my-balance`, { headers });
      setBalance(balRes.data);

      const holRes = await axios.get(`${API_URL}/leaves/holidays`, { headers });
      setHolidays(holRes.data);

      if (viewMode === 'ME') {
        const myRes = await axios.get(`${API_URL}/leaves/my-leaves`, { headers });
        setMyLeaves(myRes.data);
      } else if (viewMode === 'TEAM') {
        const teamRes = await axios.get(`${API_URL}/leaves/pending`, { headers });
        setTeamLeaves(teamRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch leave data', err);
    } finally {
      setLoading(false);
    }
  };

  // Live calculation of business days in Form
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      let days = calculateBusinessDays(formData.startDate, formData.endDate, holidays);
      if (formData.halfDay) days = 0.5;
      setCalcDays(days);
    } else {
      setCalcDays(0);
    }
  }, [formData.startDate, formData.endDate, formData.halfDay, holidays]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (calcDays <= 0 && !formData.halfDay) return alert('Selected range has 0 business days.');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/leaves/apply`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Leave requested successfully!');
      setShowApplyModal(false);
      setFormData({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '', halfDay: false });
      fetchInitialData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to apply.');
    }
  };

  const handleCancel = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/leaves/cancel/${leaveId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInitialData();
    } catch (err) {
      alert('Failed to cancel');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/leaves/review/${actionModal.leaveId}`, {
        status: actionModal.actionType,
        comments: actionModal.comments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionModal({ show: false, leaveId: null, actionType: null, comments: '' });
      fetchInitialData(); // Refresh TEAM pending list
    } catch (err) {
      alert('Failed to process review.');
    }
  };

  const downloadLeaveLetter = (leave) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(0, 210, 255);
    doc.text('Leave Approval Certificate', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`Employee Name: ${user.name}`, 20, 40);
    doc.text(`Leave Type: ${leave.leaveType}`, 20, 50);
    doc.text(`From: ${new Date(leave.startDate).toLocaleDateString()}   To: ${new Date(leave.endDate).toLocaleDateString()}`, 20, 60);
    doc.text(`Total Days: ${leave.days}`, 20, 70);
    doc.text(`Status: ${leave.status}`, 20, 80);
    doc.text(`Approved On: ${new Date(leave.reviewedOn || leave.updatedAt).toLocaleDateString()}`, 20, 90);
    
    doc.text('This is an automatically generated document by PrimeCode HRMS.', 20, 120);
    doc.save(`Leave_Letter_${leave.id}.pdf`);
  };

  const renderStatus = (status) => {
    switch(status) {
      case 'APPROVED': return <span className="status-badge" style={{background: 'rgba(0,255,100,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,100,0.3)'}}><CheckCircle size={14} style={{marginRight: '4px'}}/> Approved</span>;
      case 'PENDING': return <span className="status-badge" style={{background: 'rgba(0,210,255,0.1)', color: '#00D2FF', border: '1px solid rgba(0,210,255,0.3)', animation: 'pulse 2s infinite'}}><Clock size={14} style={{marginRight: '4px'}}/> Pending</span>;
      case 'REJECTED': return <span className="status-badge" style={{background: 'rgba(255,50,50,0.1)', color: '#ff3333', border: '1px solid rgba(255,50,50,0.3)'}}><XCircle size={14} style={{marginRight: '4px'}}/> Rejected</span>;
      case 'CANCELLED': return <span className="status-badge" style={{background: 'rgba(255,255,255,0.1)', color: '#ccc', border: '1px solid rgba(255,255,255,0.3)'}}><X size={14} style={{marginRight: '4px'}}/> Cancelled</span>;
      default: return <span>{status}</span>;
    }
  };

  const leaveTypes = [
    { key: 'casual', label: 'Casual Leave', color: '#00D2FF' },
    { key: 'sick', label: 'Sick Leave', color: '#8A2BE2' },
    { key: 'earned', label: 'Earned Leave', color: '#00ff88' },
    { key: 'compensatory', label: 'Compensatory', color: '#FFA500' }
  ];

  return (
    <div className="leaves-page" style={{ position: 'relative', minHeight: '100%' }}>
      
      {/* HEADER & TOGGLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="gradient-text">Leave Management</h2>
        
        {hasPermission('approve:leave') && (
          <div className="view-toggle" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '30px', padding: '4px' }}>
            <button 
              className={`toggle-btn ${viewMode === 'ME' ? 'active' : ''}`}
              onClick={() => setViewMode('ME')}
              style={{ padding: '8px 24px', borderRadius: '20px', border: 'none', background: viewMode==='ME'?'rgba(0,210,255,0.2)':'transparent', color: viewMode==='ME'?'#00D2FF':'#fff', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              My Leaves
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'TEAM' ? 'active' : ''}`}
              onClick={() => setViewMode('TEAM')}
              style={{ padding: '8px 24px', borderRadius: '20px', border: 'none', background: viewMode==='TEAM'?'rgba(0,210,255,0.2)':'transparent', color: viewMode==='TEAM'?'#00D2FF':'#fff', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              Pending Approvals {teamLeaves.length > 0 && <span style={{ background: '#ff3333', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', marginLeft: '6px' }}>{teamLeaves.length}</span>}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ color: '#00D2FF', textAlign: 'center', marginTop: '3rem' }}>Syncing Systems...</div>
      ) : (
        <>
          {viewMode === 'ME' && (
            <>
              {/* BALANCE QUOTAS ROW */}
              {balance && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  {leaveTypes.map(lt => {
                    const data = balance[lt.key] || { total: 0, used: 0, remaining: 0 };
                    const progress = data.total > 0 ? (data.used / data.total) * 100 : 0;
                    return (
                      <div key={lt.key} className="glass-card" style={{ padding: '1.5rem', borderTop: `3px solid ${lt.color}` }}>
                        <h4 style={{ color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>{lt.label}</h4>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: lt.color, margin: '0.5rem 0', fontFamily: 'monospace' }}>
                          {data.remaining} <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>/ {data.total}</span>
                        </div>
                        <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: lt.color, transition: 'width 1s ease-in-out' }}></div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>Used: {data.used} days</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MY HISTORY TABLE */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h3 style={{ borderBottom: '1px solid rgba(0,210,255,0.2)', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#fff' }}>Leave History</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>
                        <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Type</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Duration</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Days</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Applied On</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Status</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myLeaves.length === 0 ? (
                        <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>No leave history found.</td></tr>
                      ) : (
                        myLeaves.map(lv => (
                          <tr key={lv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="table-row-hover">
                            <td style={{ padding: '1rem', color: '#fff', fontWeight: '500' }}>{lv.leaveType}</td>
                            <td style={{ padding: '1rem', color: 'rgba(255,255,255,0.8)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CalendarIcon size={14} color="#00D2FF" />
                                {new Date(lv.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} 
                                {' - '} 
                                {new Date(lv.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', color: '#fff' }}>{lv.days} {lv.halfDay ? '(Half)' : ''}</td>
                            <td style={{ padding: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{new Date(lv.appliedOn).toLocaleDateString()}</td>
                            <td style={{ padding: '1rem' }}>{renderStatus(lv.status)}</td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                               {lv.status === 'PENDING' && (
                                 <button onClick={() => handleCancel(lv.id)} style={{ background: 'transparent', border: '1px solid rgba(255,50,50,0.5)', color: '#ff3333', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                               )}
                               {lv.status === 'APPROVED' && (
                                 <button onClick={() => downloadLeaveLetter(lv)} style={{ background: 'transparent', border: 'none', color: '#00D2FF', cursor: 'pointer' }} title="Download Approved Letter">
                                   <Download size={18} />
                                 </button>
                               )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FLOATING ACTION BUTTON */}
              <button 
                onClick={() => setShowApplyModal(true)}
                className="btn-glow"
                style={{ position: 'fixed', bottom: '2rem', right: '3rem', width: '60px', height: '60px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,210,255,0.4)', zIndex: 100 }}
              >
                <Plus size={30} />
              </button>
            </>
          )}

          {viewMode === 'TEAM' && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ borderBottom: '1px solid rgba(0,210,255,0.2)', paddingBottom: '1rem', marginBottom: '1.5rem', color: '#fff' }}>Pending Approvals</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {teamLeaves.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem' }}>No pending leave requests.</p>
                ) : (
                  teamLeaves.map(lv => (
                    <div key={lv.id} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,210,255,0.1)', borderRadius: '12px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <img src={lv.user?.avatar || `https://ui-avatars.com/api/?name=${lv.user?.name}&background=0D8ABC&color=fff`} alt={lv.user?.name} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid rgba(0,210,255,0.3)' }} />
                        <div>
                          <h4 style={{ color: '#fff', margin: '0 0 4px 0' }}>{lv.user?.name} <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal' }}>({lv.user?.employeeId})</span></h4>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={14} color="#00D2FF" /> {lv.leaveType}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CalendarIcon size={14} color="#8A2BE2" /> {new Date(lv.startDate).toLocaleDateString()} to {new Date(lv.endDate).toLocaleDateString()}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} color="#00ff88" /> {lv.days} Days</span>
                          </div>
                          {lv.reason && <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', marginTop: '8px', fontStyle: 'italic' }}>"{lv.reason}"</p>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setActionModal({ show: true, leaveId: lv.id, actionType: 'APPROVED', comments: '' })} style={{ background: 'rgba(0,255,100,0.1)', border: '1px solid #00ff88', color: '#00ff88', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} className="hover-glow-green">
                          <CheckCircle size={16} /> Approve
                        </button>
                        <button onClick={() => setActionModal({ show: true, leaveId: lv.id, actionType: 'REJECTED', comments: '' })} style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid #ff3333', color: '#ff3333', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} className="hover-glow-red">
                          <XCircle size={16} /> Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* APPLY LEAVE MODAL (GLASSMORPHISM) */}
      {showApplyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', border: '1px solid rgba(0,210,255,0.4)', boxShadow: '0 0 40px rgba(0,210,255,0.15)' }}>
            <button onClick={() => setShowApplyModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
            
            <h3 style={{ color: '#00D2FF', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} /> Request Leave
            </h3>

            <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Leave Type</label>
                <select 
                  className="form-input" 
                  value={formData.leaveType}
                  onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <option value="CASUAL">Casual Leave (Balance: {balance?.casual?.remaining || 0})</option>
                  <option value="SICK">Sick Leave (Balance: {balance?.sick?.remaining || 0})</option>
                  <option value="EARNED">Earned Leave (Balance: {balance?.earned?.remaining || 0})</option>
                  <option value="COMPENSATORY">Compensatory (Balance: {balance?.compensatory?.remaining || 0})</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Start Date</label>
                  <input 
                    type="date" 
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                    style={{ width: '100%', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>End Date</label>
                  <input 
                    type="date" 
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                    style={{ width: '100%', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{ color: '#fff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.halfDay}
                    onChange={(e) => setFormData({...formData, halfDay: e.target.checked})}
                    style={{ accentColor: '#00D2FF', width: '16px', height: '16px' }}
                  />
                  Request Half Day
                </label>
                <div style={{ color: '#00D2FF', fontWeight: 'bold' }}>
                  {calcDays} Business Days
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Reason / Remarks</label>
                <textarea 
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  required
                  rows="3"
                  maxLength="200"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', resize: 'none' }}
                  placeholder="Provide a valid reason for your leave..."
                ></textarea>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  {formData.reason.length}/200
                </div>
              </div>

              <button type="submit" className="btn-glow" style={{ marginTop: '1rem', width: '100%' }}>
                Apply For {calcDays} Days
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HR ACTION MODAL */}
      {actionModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
           <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
              <h3 style={{ color: actionModal.actionType === 'APPROVED' ? '#00ff88' : '#ff3333', marginBottom: '1rem' }}>
                {actionModal.actionType === 'APPROVED' ? 'Approve Leave' : 'Reject Leave'}
              </h3>
              <form onSubmit={handleReviewSubmit}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '6px' }}>Add Comment (Optional)</label>
                <textarea 
                  value={actionModal.comments}
                  onChange={(e) => setActionModal({...actionModal, comments: e.target.value})}
                  rows="3"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', resize: 'none', marginBottom: '1.5rem' }}
                  placeholder="E.g. Approved, enjoy your time off."
                ></textarea>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setActionModal({ show: false, leaveId: null, actionType: null, comments: '' })} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: actionModal.actionType === 'APPROVED' ? '#00ff88' : '#ff3333', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
                    Confirm
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default Leaves;
