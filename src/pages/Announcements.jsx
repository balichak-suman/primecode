import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Megaphone, Pin, AlertTriangle, Calendar, Gift, FileText, Users,
  Plus, X, Eye, Clock, Trash2, ChevronDown, ChevronUp, Send, Search
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const TYPE_STYLES = {
  GENERAL: { color: '#00D2FF', bg: 'rgba(0,210,255,0.1)', border: 'rgba(0,210,255,0.2)', icon: Megaphone, label: 'General' },
  URGENT: { color: '#ff3366', bg: 'rgba(255,51,102,0.1)', border: 'rgba(255,51,102,0.4)', icon: AlertTriangle, label: 'Urgent' },
  HOLIDAY: { color: '#39FF14', bg: 'rgba(57,255,20,0.1)', border: 'rgba(57,255,20,0.2)', icon: Calendar, label: 'Holiday' },
  POLICY: { color: '#7928CA', bg: 'rgba(121,40,202,0.1)', border: 'rgba(121,40,202,0.2)', icon: FileText, label: 'Policy' },
};

const Announcements = () => {
  const { user, hasRole } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Composer state
  const [form, setForm] = useState({
    title: '', content: '', type: 'GENERAL', category: 'General',
    targetRoles: ['ALL'], targetDept: '', expiresAt: '', scheduledAt: '', pinned: false
  });
  const [preview, setPreview] = useState(false);

  const isAdmin = hasRole && hasRole(['HR', 'ADMIN']);

  useEffect(() => { fetchAnnouncements(); }, []);

  const token = () => localStorage.getItem('token');
  const config = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/announcements`, config());
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Fetch announcements error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      await axios.post(`${API_URL}/announcements`, form, config());
      setShowComposer(false);
      setForm({ title: '', content: '', type: 'GENERAL', category: 'General', targetRoles: ['ALL'], targetDept: '', expiresAt: '', scheduledAt: '', pinned: false });
      setPreview(false);
      fetchAnnouncements();
    } catch (err) {
      alert('Failed to publish announcement');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await axios.patch(`${API_URL}/announcements/${id}/read`, {}, config());
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, readBy: [...(a.readBy || []), user?.id] } : a));
    } catch (err) { console.error(err); }
  };

  const handleTogglePin = async (id) => {
    try {
      await axios.patch(`${API_URL}/announcements/${id}/pin`, {}, config());
      fetchAnnouncements();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await axios.delete(`${API_URL}/announcements/${id}`, config());
      fetchAnnouncements();
    } catch (err) { console.error(err); }
  };

  const toggleExpand = (id) => {
    if (expandedId !== id) handleMarkRead(id);
    setExpandedId(expandedId === id ? null : id);
  };

  const isUnread = (a) => !a.readBy || !a.readBy.includes(user?.id);
  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  const filtered = announcements
    .filter(a => filterType === 'ALL' || a.type === filterType)
    .filter(a => !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.content.toLowerCase().includes(searchTerm.toLowerCase()));

  const pinned = filtered.filter(a => a.pinned);
  const unpinned = filtered.filter(a => !a.pinned);

  return (
    <div style={{ color: '#fff', maxWidth: '900px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="gradient-text" style={{ margin: 0 }}>Broadcast Center</h2>
          <p style={{ opacity: 0.5, fontSize: '0.85rem', marginTop: '4px' }}>Company-wide announcements & bulletins</p>
        </div>
        {isAdmin && (
          <button className="btn-glow" onClick={() => setShowComposer(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> New Broadcast
          </button>
        )}
      </div>

      {/* SEARCH + FILTER */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          <input className="form-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search announcements..." style={{ width: '100%', paddingLeft: '36px' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'GENERAL', 'URGENT', 'HOLIDAY', 'POLICY'].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', border: 'none',
              background: filterType === t ? (TYPE_STYLES[t]?.bg || 'rgba(0,210,255,0.15)') : 'rgba(255,255,255,0.03)',
              color: filterType === t ? (TYPE_STYLES[t]?.color || '#00D2FF') : 'rgba(255,255,255,0.4)',
              transition: 'all 0.3s'
            }}>{t === 'ALL' ? 'All' : TYPE_STYLES[t]?.label}</button>
          ))}
        </div>
      </div>

      {/* COMPOSER MODAL */}
      {showComposer && (
        <div className="modal-overlay">
          <div className="glass-card modal-content reveal" style={{ maxWidth: '700px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="gradient-text">{preview ? 'Preview Broadcast' : 'Compose Broadcast'}</h3>
              <button onClick={() => { setShowComposer(false); setPreview(false); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {!preview ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <input className="form-input" placeholder="Announcement Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', marginBottom: '4px' }}>TYPE</label>
                    <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="GENERAL">General</option><option value="URGENT">🚨 Urgent</option>
                      <option value="HOLIDAY">🎉 Holiday</option><option value="POLICY">📋 Policy</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', marginBottom: '4px' }}>AUDIENCE</label>
                    <select className="form-input" value={form.targetRoles[0]} onChange={e => setForm({ ...form, targetRoles: [e.target.value] })}>
                      <option value="ALL">All Personnel</option><option value="EMPLOYEE">Employees Only</option>
                      <option value="HR">HR Only</option><option value="ADMIN">Admins Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', marginBottom: '4px' }}>CONTENT</label>
                  <textarea className="form-input" rows={8} placeholder="Write your announcement content here... (supports basic formatting)" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ minHeight: '150px', lineHeight: '1.6' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', marginBottom: '4px' }}>EXPIRY DATE (optional)</label>
                    <input type="date" className="form-input" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', opacity: 0.5, display: 'block', marginBottom: '4px' }}>SCHEDULE FOR (optional)</label>
                    <input type="datetime-local" className="form-input" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} style={{ accentColor: '#00D2FF' }} />
                  <Pin size={14} style={{ color: '#FFD700' }} /> Pin to top of feed
                </label>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button className="btn-outline" onClick={() => setPreview(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Eye size={14} /> Preview</button>
                  <button className="btn-glow" onClick={handlePublish} disabled={!form.title || !form.content} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Send size={14} /> Publish Now</button>
                </div>
              </div>
            ) : (
              <div>
                <AnnouncementCard announcement={{ ...form, postedBy: { name: user?.name }, postedAt: new Date(), readBy: [] }} isPreview />
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button className="btn-outline" onClick={() => setPreview(false)}>← Edit</button>
                  <button className="btn-glow" onClick={handlePublish}><Send size={14} /> Confirm & Publish</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && <div style={{ textAlign: 'center', padding: '4rem', color: '#00D2FF' }}>Loading broadcasts...</div>}

      {/* PINNED */}
      {pinned.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', opacity: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <Pin size={12} style={{ color: '#FFD700' }} /> Pinned
          </div>
          {pinned.map(a => (
            <AnnouncementCard key={a.id} announcement={a} expanded={expandedId === a.id} onToggle={() => toggleExpand(a.id)} unread={isUnread(a)} isAdmin={isAdmin} onPin={() => handleTogglePin(a.id)} onDelete={() => handleDelete(a.id)} timeAgo={timeAgo} />
          ))}
        </div>
      )}

      {/* ALL OTHERS */}
      {unpinned.map(a => (
        <AnnouncementCard key={a.id} announcement={a} expanded={expandedId === a.id} onToggle={() => toggleExpand(a.id)} unread={isUnread(a)} isAdmin={isAdmin} onPin={() => handleTogglePin(a.id)} onDelete={() => handleDelete(a.id)} timeAgo={timeAgo} />
      ))}

      {!loading && filtered.length === 0 && (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <Megaphone size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
          <p style={{ opacity: 0.5 }}>No broadcasts found.</p>
        </div>
      )}
    </div>
  );
};

// ─── CARD COMPONENT ───
const AnnouncementCard = ({ announcement: a, expanded, onToggle, unread, isAdmin, onPin, onDelete, timeAgo, isPreview }) => {
  const style = TYPE_STYLES[a.type] || TYPE_STYLES.GENERAL;
  const Icon = style.icon;

  return (
    <div className="glass-card" onClick={isPreview ? undefined : onToggle} style={{
      padding: '1.5rem', marginBottom: '1rem', cursor: isPreview ? 'default' : 'pointer',
      border: `1px solid ${a.type === 'URGENT' ? style.border : 'rgba(255,255,255,0.05)'}`,
      boxShadow: a.type === 'URGENT' ? `0 0 20px ${style.border}` : 'none',
      transition: 'all 0.3s', position: 'relative'
    }}>
      {/* Unread dot */}
      {unread && !isPreview && (
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', width: '8px', height: '8px', borderRadius: '50%', background: '#00D2FF', boxShadow: '0 0 8px #00D2FF' }}></div>
      )}

      {/* Urgent pulse */}
      {a.type === 'URGENT' && (
        <div style={{ position: 'absolute', top: '1.5rem', right: unread ? '2.5rem' : '1.5rem' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ff3366', animation: 'pulse 1.5s infinite' }}></span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} style={{ color: style.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {a.pinned && <Pin size={12} style={{ color: '#FFD700' }} />}
            <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', background: style.bg, color: style.color, fontWeight: 600 }}>{style.label}</span>
          </div>
          <h3 style={{ margin: '4px 0', fontSize: '1.05rem', fontWeight: 600 }}>{a.title}</h3>
          
          {!expanded && !isPreview && (
            <p style={{ fontSize: '0.85rem', opacity: 0.5, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
              {a.content?.replace(/<[^>]*>/g, '').substring(0, 120)}...
            </p>
          )}

          {(expanded || isPreview) && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.9rem', lineHeight: 1.7, opacity: 0.8, whiteSpace: 'pre-wrap' }}>
              {a.content}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', fontSize: '0.7rem', opacity: 0.4 }}>
            <span>{a.postedBy?.name || 'System'}</span>
            <span>{timeAgo ? timeAgo(a.postedAt) : 'Preview'}</span>
            {a.readBy && <span><Eye size={10} /> {a.readBy.length} read</span>}
          </div>

          {isAdmin && !isPreview && expanded && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }} onClick={e => e.stopPropagation()}>
              <button className="btn-outline" onClick={onPin} style={{ fontSize: '0.7rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Pin size={12} /> {a.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button className="btn-outline" onClick={onDelete} style={{ fontSize: '0.7rem', padding: '4px 10px', color: '#ff3366', borderColor: 'rgba(255,51,102,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
};

export default Announcements;
