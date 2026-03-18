import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Bell, Check, CheckCheck, Trash2, Filter, Megaphone, Calendar, Award,
  DollarSign, Gift, Clock, AlertTriangle, UserCheck, FileText, X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const TYPE_CONFIG = {
  announcement: { icon: Megaphone, color: '#00D2FF' },
  leave_approved: { icon: Check, color: '#39FF14' },
  leave_rejected: { icon: X, color: '#ff3366' },
  new_leave: { icon: Calendar, color: '#7928CA' },
  payslip: { icon: DollarSign, color: '#FFD700' },
  birthday: { icon: Gift, color: '#f472b6' },
  anniversary: { icon: Award, color: '#00D2FF' },
  probation: { icon: Clock, color: '#ff8800' },
  low_balance: { icon: AlertTriangle, color: '#ff3366' },
  regularization: { icon: UserCheck, color: '#39FF14' },
  default: { icon: Bell, color: '#00D2FF' },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState(new Set());

  const token = () => localStorage.getItem('token');
  const config = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/notifications`, config());
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await axios.patch(`${API_URL}/notifications/${id}/read`, {}, config());
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await axios.patch(`${API_URL}/notifications/mark-all-read`, {}, config());
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) { console.error(err); }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`${API_URL}/notifications/${id}`, config());
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) { console.error(err); }
  };

  const bulkDelete = async () => {
    try {
      const ids = [...selected];
      await axios.post(`${API_URL}/notifications/bulk-delete`, { ids }, config());
      setNotifications(prev => prev.filter(n => !selected.has(n.id)));
      setSelected(new Set());
    } catch (err) { console.error(err); }
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // Time grouping
  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  const isToday = (d) => new Date(d).toDateString() === new Date().toDateString();
  const isYesterday = (d) => {
    const y = new Date(); y.setDate(y.getDate() - 1);
    return new Date(d).toDateString() === y.toDateString();
  };
  const isThisWeek = (d) => (Date.now() - new Date(d)) < 7 * 86400000;

  const groupNotifications = (items) => {
    const groups = { 'Today': [], 'Yesterday': [], 'This Week': [], 'Older': [] };
    items.forEach(n => {
      if (isToday(n.createdAt)) groups['Today'].push(n);
      else if (isYesterday(n.createdAt)) groups['Yesterday'].push(n);
      else if (isThisWeek(n.createdAt)) groups['This Week'].push(n);
      else groups['Older'].push(n);
    });
    return groups;
  };

  const filtered = filterType === 'all' ? notifications : notifications.filter(n => n.type === filterType);
  const grouped = groupNotifications(filtered);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const uniqueTypes = [...new Set(notifications.map(n => n.type))];

  return (
    <div style={{ color: '#fff', maxWidth: '800px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="gradient-text" style={{ margin: 0 }}>Notification Matrix</h2>
          <p style={{ opacity: 0.5, fontSize: '0.85rem', marginTop: '4px' }}>
            {unreadCount > 0 ? `${unreadCount} unread signal${unreadCount > 1 ? 's' : ''}` : 'All signals acknowledged'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selected.size > 0 && (
            <button className="btn-outline" onClick={bulkDelete} style={{ fontSize: '0.75rem', color: '#ff3366', borderColor: 'rgba(255,51,102,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trash2 size={14} /> Delete ({selected.size})
            </button>
          )}
          <button className="btn-outline" onClick={markAllRead} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCheck size={14} /> Mark All Read
          </button>
        </div>
      </div>

      {/* FILTER */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setFilterType('all')} style={{
          padding: '6px 12px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', border: 'none',
          background: filterType === 'all' ? 'rgba(0,210,255,0.15)' : 'rgba(255,255,255,0.03)',
          color: filterType === 'all' ? '#00D2FF' : 'rgba(255,255,255,0.4)'
        }}>All</button>
        {uniqueTypes.map(t => {
          const cfg = TYPE_CONFIG[t] || TYPE_CONFIG.default;
          return (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding: '6px 12px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', border: 'none',
              background: filterType === t ? `${cfg.color}20` : 'rgba(255,255,255,0.03)',
              color: filterType === t ? cfg.color : 'rgba(255,255,255,0.4)',
              textTransform: 'capitalize'
            }}>{t.replace(/_/g, ' ')}</button>
          );
        })}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '4rem', color: '#00D2FF' }}>Loading signals...</div>}

      {/* GROUPED LIST */}
      {Object.entries(grouped).map(([group, items]) => {
        if (items.length === 0) return null;
        return (
          <div key={group} style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem', paddingLeft: '4px' }}>{group}</div>
            {items.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.default;
              const Icon = cfg.icon;
              return (
                <div key={n.id} onClick={() => markRead(n.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', marginBottom: '6px',
                  background: n.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(0,210,255,0.03)',
                  border: `1px solid ${n.isRead ? 'rgba(255,255,255,0.04)' : 'rgba(0,210,255,0.1)'}`,
                  borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  {/* Checkbox */}
                  <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggleSelect(n.id)} onClick={e => e.stopPropagation()} style={{ accentColor: '#00D2FF' }} />

                  {/* Icon */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: n.isRead ? 400 : 600 }}>{n.title}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '2px' }}>{n.message}</div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.65rem', opacity: 0.4 }}>{timeAgo(n.createdAt)}</span>
                    {!n.isRead && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00D2FF', boxShadow: '0 0 6px #00D2FF' }}></div>}
                  </div>

                  {/* Delete */}
                  <button onClick={e => { e.stopPropagation(); deleteNotification(n.id); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}

      {!loading && filtered.length === 0 && (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <Bell size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
          <p style={{ opacity: 0.5 }}>No notifications in the matrix.</p>
        </div>
      )}
    </div>
  );
};

export default Notifications;
