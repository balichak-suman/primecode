import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { Bell, CheckCheck, Megaphone, Calendar, Award, DollarSign, Gift, Clock, AlertTriangle, UserCheck, FileText, X, Check, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { API_URL, SOCKET_URL } from '../config/api';

const TYPE_ICONS = {
  announcement: Megaphone, leave_approved: Check, leave_rejected: X,
  new_leave: Calendar, payslip: DollarSign, birthday: Gift,
  anniversary: Award, probation: Clock, low_balance: AlertTriangle,
  regularization: UserCheck, CAREER: Briefcase, new_application: Briefcase
};

const TYPE_COLORS = {
  announcement: '#00D2FF', leave_approved: '#39FF14', leave_rejected: '#ff3366',
  new_leave: '#7928CA', payslip: '#FFD700', birthday: '#f472b6',
  anniversary: '#00D2FF', probation: '#ff8800', low_balance: '#ff3366',
  regularization: '#39FF14', CAREER: '#00D2FF', new_application: '#00D2FF'
};

const NotificationBell = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Socket.io real-time
    const socket = io(SOCKET_URL);
    if (userId) {
      socket.emit('join_notifications', userId);
    }
    // Join role-based room for career notifications
    if (user?.role && (user.role === 'HR' || user.role === 'ADMIN')) {
      socket.emit('join_role', user.role);
    }
    socket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      // Show toast for new application
      if (notification.type === 'new_application') {
        setToast(notification.message);
        setTimeout(() => setToast(null), 5000);
      }
    });
    return () => socket.disconnect();
  }, [userId, user?.role]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const token = () => localStorage.getItem('token');
  const config = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications`, config());
      setNotifications(Array.isArray(res.data) ? res.data.slice(0, 10) : []);
    } catch (err) { console.error(err); }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications/unread-count`, config());
      setUnreadCount(res.data.count || 0);
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await axios.patch(`${API_URL}/notifications/mark-all-read`, {}, config());
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) { console.error(err); }
  };

  const markRead = async (id) => {
    try {
      await axios.patch(`${API_URL}/notifications/${id}/read`, {}, config());
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`;
    return `${Math.floor(s/86400)}d`;
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.7)', position: 'relative', padding: '4px' }}>
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            background: '#ff3366', color: '#fff', fontSize: '0.55rem', fontWeight: 'bold',
            minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', border: '2px solid #000'
          }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 12px)', right: '-60px', width: '360px',
          background: 'rgba(10,10,10,0.98)', border: '1px solid rgba(0,210,255,0.2)',
          borderRadius: '14px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)', zIndex: 100, overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
            <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#00D2FF', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCheck size={12} /> Mark all read
            </button>
          </div>

          {/* List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.4, fontSize: '0.85rem' }}>No notifications</div>
            ) : notifications.map(n => {
              const Icon = TYPE_ICONS[n.type] || Bell;
              const color = TYPE_COLORS[n.type] || '#00D2FF';
              return (
                <div key={n.id} onClick={() => { markRead(n.id); if (n.link) { navigate(n.link); setIsOpen(false); } }}
                  style={{
                    display: 'flex', gap: '10px', padding: '12px 16px', cursor: 'pointer',
                    background: n.isRead ? 'transparent' : 'rgba(0,210,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(0,210,255,0.03)'}
                >
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: n.isRead ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.6rem', opacity: 0.3 }}>{timeAgo(n.createdAt)}</span>
                    {!n.isRead && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00D2FF' }}></div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div onClick={() => { navigate('/dashboard/notifications'); setIsOpen(false); }}
            style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: '#00D2FF', fontSize: '0.8rem', fontWeight: 500 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,210,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            View All Notifications
          </div>
        </div>
      )}

      {/* Toast notification for new applications */}
      {toast && (
        <div onClick={() => { navigate('/dashboard/jobs'); setToast(null); }} style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 300,
          background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(0,210,255,0.3)',
          borderRadius: '12px', padding: '12px 16px', maxWidth: '340px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)', cursor: 'pointer',
          animation: 'toastSlide 0.3s ease-out', display: 'flex', gap: '10px', alignItems: 'center'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0,210,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Briefcase size={14} style={{ color: '#00D2FF' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#00D2FF' }}>New Application</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '2px' }}>{toast}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); setToast(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '2px', marginLeft: 'auto' }}>✕</button>
        </div>
      )}

      <style>{`
        @keyframes toastSlide { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
};

export default NotificationBell;
