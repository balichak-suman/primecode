import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import {
  FileText, Upload, Download, Eye, Share2, Trash2, Search, Filter, Plus,
  File, Image, FileSpreadsheet, FolderOpen, Shield, Clock, AlertTriangle,
  X, Check, Send, ChevronDown, CreditCard, ShieldCheck, Zap, Printer
} from 'lucide-react';

import { API_URL } from '../config/api';

const CATEGORIES = {
  company: { label: 'Company Documents', icon: Shield, color: '#00D2FF', desc: 'Offer Letters, Appointment, Policies' },
  personal: { label: 'Personal Documents', icon: FileText, color: '#7928CA', desc: 'ID Proof, Address Proof, Certificates' },
  tax: { label: 'Tax Documents', icon: FileSpreadsheet, color: '#39FF14', desc: 'Form 16, Investment Declarations' },
  payslips: { label: 'Payslips', icon: File, color: '#FFD700', desc: 'Monthly Payslip Archive' },
};

const FILE_ICONS = {
  pdf: { icon: FileText, color: '#ff3366' },
  image: { icon: Image, color: '#00D2FF' },
  doc: { icon: FileText, color: '#7928CA' },
  excel: { icon: FileSpreadsheet, color: '#39FF14' },
};

const Documents = () => {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [myDocs, setMyDocs] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // HR view
  const [allDocs, setAllDocs] = useState([]);
  const [showHR, setShowHR] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({ userId: '', documentName: '', message: '' });

  // Digital ID
  const [showID, setShowID] = useState(false);
  const [idFlipped, setIdFlipped] = useState(false);

  const isAdmin = hasRole && hasRole(['HR', 'ADMIN']);
  const dropZoneRef = useRef(null);
  const token = () => localStorage.getItem('token');
  const config = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  useEffect(() => {
    fetchMyDocs();
    fetchPolicies();
    if (isAdmin) fetchAllDocs();
  }, []);

  const fetchMyDocs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/documents/my`, config());
      setMyDocs(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchPolicies = async () => {
    try {
      const res = await axios.get(`${API_URL}/documents/policies`, config());
      setPolicies(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const fetchAllDocs = async () => {
    try {
      const res = await axios.get(`${API_URL}/documents/all`, config());
      setAllDocs(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const handleUpload = async (files) => {
    setUploading(true);
    for (const file of files) {
      const fileId = `f_${Date.now()}`;
      setUploadProgress(prev => ({ ...prev, [fileId]: { name: file.name, progress: 0 } }));

      // Simulate upload progress
      for (let p = 0; p <= 100; p += 20) {
        await new Promise(r => setTimeout(r, 150));
        setUploadProgress(prev => ({ ...prev, [fileId]: { name: file.name, progress: p } }));
      }

      try {
        await axios.post(`${API_URL}/documents/upload`, {
          fileName: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          type: file.name.split('.').pop()?.toLowerCase(),
          category: activeTab
        }, config());
      } catch (err) { console.error(err); }

      setUploadProgress(prev => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
    }
    setUploading(false);
    setShowUpload(false);
    fetchMyDocs();
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = [...e.dataTransfer.files].filter(f => f.size <= 5 * 1024 * 1024);
    if (files.length > 0) handleUpload(files);
  }, [activeTab]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);

  const handleFileInput = (e) => {
    const files = [...e.target.files].filter(f => f.size <= 5 * 1024 * 1024);
    if (files.length > 0) handleUpload(files);
  };

  const handleDelete = async (docId) => {
    if (!confirm('Remove this document?')) return;
    try {
      await axios.delete(`${API_URL}/documents/${docId}`, config());
      fetchMyDocs();
    } catch (err) { console.error(err); }
  };

  const handleShare = async (docId) => {
    try {
      const res = await axios.post(`${API_URL}/documents/${docId}/share`, {}, config());
      setShareLink(res.data);
      setTimeout(() => setShareLink(null), 5000);
    } catch (err) { console.error(err); }
  };

  const handleDocRequest = async () => {
    try {
      await axios.post(`${API_URL}/documents/request`, requestForm, config());
      setShowRequest(false);
      setRequestForm({ userId: '', documentName: '', message: '' });
      alert('Document request sent!');
    } catch (err) { console.error(err); }
  };

  const filteredDocs = [...myDocs, ...(activeTab === 'company' ? policies : [])]
    .filter(d => d.category === activeTab || (activeTab === 'company' && !d.category))
    .filter(d => !searchTerm || d.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const qrValue = `PRIME-VERIFY-${user?.employeeId || user?.id}-${user?.email}`;

  return (
    <div style={{ color: '#fff' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="gradient-text" style={{ margin: 0 }}>Document Vault</h2>
          <p style={{ opacity: 0.5, fontSize: '0.85rem', marginTop: '4px' }}>Secure file management & digital identity</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-outline" onClick={() => setShowID(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <CreditCard size={14} /> Digital ID
          </button>
          {isAdmin && (
            <button className="btn-outline" onClick={() => setShowHR(!showHR)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
              <FolderOpen size={14} /> {showHR ? 'My Docs' : 'All Docs'}
            </button>
          )}
          <button className="btn-glow" onClick={() => setShowUpload(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <Upload size={14} /> Upload
          </button>
        </div>
      </div>

      {/* ═══ HR ALL DOCS VIEW ═══ */}
      {showHR && isAdmin ? (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input className="form-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search employees or documents..." style={{ width: '100%', paddingLeft: '36px' }} />
            </div>
            {isAdmin && (
              <button className="btn-outline" onClick={() => setShowRequest(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                <Send size={14} /> Request Doc
              </button>
            )}
          </div>

          {allDocs.filter(e => !searchTerm || e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || e.documents.some(d => d.name?.toLowerCase().includes(searchTerm.toLowerCase()))).map(emp => (
            <div key={emp.id} className="glass-card" style={{ padding: '1.2rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: emp.documents.length > 0 ? '1rem' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,210,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#00D2FF' }}>
                    {emp.name?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>{emp.employeeId || `ID: ${emp.id}`} • {emp.department || 'N/A'}</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>{emp.documents.length} docs</span>
              </div>
              {emp.documents.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {emp.documents.map((d, i) => <DocMiniCard key={i} doc={d} />)}
                </div>
              )}
            </div>
          ))}

          {allDocs.length === 0 && <EmptyState text="No employee documents found." />}
        </div>
      ) : (
        <>
          {/* ═══ CATEGORY TABS ═══ */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const Icon = cat.icon;
              const count = (key === 'company' ? [...myDocs.filter(d => d.category === 'company'), ...policies] : myDocs.filter(d => d.category === key)).length;
              return (
                <button key={key} onClick={() => setActiveTab(key)} className="glass-card" style={{
                  flex: '1 1 0', minWidth: '150px', padding: '1.2rem', cursor: 'pointer', border: `1px solid ${activeTab === key ? cat.color + '40' : 'rgba(255,255,255,0.05)'}`,
                  background: activeTab === key ? `${cat.color}08` : 'rgba(255,255,255,0.02)', transition: 'all 0.3s', textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Icon size={18} style={{ color: cat.color }} />
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: cat.color }}>{count}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: activeTab === key ? '#fff' : 'rgba(255,255,255,0.6)' }}>{cat.label}</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: '2px' }}>{cat.desc}</div>
                </button>
              );
            })}
          </div>

          {/* SEARCH */}
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input className="form-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search documents..." style={{ width: '100%', paddingLeft: '36px' }} />
          </div>

          {/* DOCUMENTS GRID */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#00D2FF' }}>Loading vault...</div>
          ) : filteredDocs.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {filteredDocs.map((doc, i) => (
                <DocumentCard key={doc.id || i} doc={doc} onDelete={handleDelete} onShare={handleShare} onPreview={() => setPreviewDoc(doc)} />
              ))}
            </div>
          ) : (
            <EmptyState text={`No documents in ${CATEGORIES[activeTab]?.label || 'this category'}.`} />
          )}
        </>
      )}

      {/* ═══ UPLOAD MODAL ═══ */}
      {showUpload && (
        <div className="modal-overlay">
          <div className="glass-card modal-content reveal" style={{ maxWidth: '500px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="gradient-text">Upload to {CATEGORIES[activeTab]?.label}</h3>
              <button onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div ref={dropZoneRef} onDrop={handleDrop} onDragOver={handleDragOver}
              style={{
                border: '2px dashed rgba(0,210,255,0.3)', borderRadius: '12px', padding: '3rem 2rem',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s',
                background: 'rgba(0,210,255,0.02)'
              }}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <Upload size={40} style={{ color: '#00D2FF', opacity: 0.5, marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Drop files here or <span style={{ color: '#00D2FF', textDecoration: 'underline' }}>browse</span></p>
              <p style={{ fontSize: '0.7rem', opacity: 0.4 }}>Max 5MB per file • PDF, DOC, DOCX, JPG, PNG</p>
              <input id="fileInput" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileInput} style={{ display: 'none' }} />
            </div>

            {/* Progress */}
            {Object.entries(uploadProgress).map(([id, { name, progress }]) => (
              <div key={id} style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ opacity: 0.7 }}>{name}</span>
                  <span style={{ color: '#00D2FF' }}>{progress}%</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #7928CA, #00D2FF)', transition: 'width 0.3s', borderRadius: '2px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ PREVIEW MODAL ═══ */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="glass-card modal-content reveal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="gradient-text">{previewDoc.name}</h3>
              <button onClick={() => setPreviewDoc(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={64} style={{ color: '#00D2FF', opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{previewDoc.name}</p>
              <p style={{ opacity: 0.4, fontSize: '0.8rem', marginTop: '8px' }}>Category: {previewDoc.category} • Size: {previewDoc.size} • Type: {previewDoc.type?.toUpperCase()}</p>
              <p style={{ opacity: 0.3, fontSize: '0.7rem', marginTop: '4px' }}>Uploaded: {previewDoc.uploadedAt ? new Date(previewDoc.uploadedAt).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={14} /> Download</button>
              <button className="btn-outline" onClick={() => setPreviewDoc(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SHARE LINK TOAST ═══ */}
      {shareLink && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '4px' }}>Share Link Generated (24h)</div>
          <div style={{ fontSize: '0.85rem', color: '#00D2FF', fontFamily: 'monospace' }}>{shareLink.shareLink}</div>
        </div>
      )}

      {/* ═══ DOC REQUEST MODAL ═══ */}
      {showRequest && (
        <div className="modal-overlay">
          <div className="glass-card modal-content reveal" style={{ maxWidth: '450px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="gradient-text">Request Document</h3>
              <button onClick={() => setShowRequest(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <select className="form-input" value={requestForm.userId} onChange={e => setRequestForm({ ...requestForm, userId: e.target.value })}>
                <option value="">Select Employee</option>
                {allDocs.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId || e.id})</option>)}
              </select>
              <input className="form-input" placeholder="Document Name (e.g., Aadhar Card)" value={requestForm.documentName} onChange={e => setRequestForm({ ...requestForm, documentName: e.target.value })} />
              <textarea className="form-input" placeholder="Optional message..." rows={3} value={requestForm.message} onChange={e => setRequestForm({ ...requestForm, message: e.target.value })} />
              <button className="btn-glow" onClick={handleDocRequest} disabled={!requestForm.userId || !requestForm.documentName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Send size={14} /> Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DIGITAL ID CARD MODAL ═══ */}
      {showID && (
        <div className="modal-overlay" onClick={() => setShowID(false)} style={{ zIndex: 2000 }}>
          <div onClick={e => e.stopPropagation()} style={{ padding: '40px' }}>
            {/* FLIP CARD */}
            <div
              onClick={() => setIdFlipped(!idFlipped)}
              style={{ perspective: '1000px', cursor: 'pointer', width: '440px', height: '280px', margin: '0 auto' }}
            >
              <div style={{
                width: '100%', height: '100%', position: 'relative',
                transformStyle: 'preserve-3d', transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: idFlipped ? 'rotateY(180deg)' : 'rotateY(0)'
              }}>
                {/* FRONT */}
                <div style={{
                  position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                  background: '#080808', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '20px',
                  overflow: 'hidden', boxShadow: '0 0 50px rgba(0,210,255,0.1)'
                }}>
                  {/* Scan line */}
                  <div style={{ position: 'absolute', width: '100%', height: '2px', background: 'rgba(0,210,255,0.5)', top: 0, zIndex: 3, animation: 'idscan 3s linear infinite', boxShadow: '0 0 12px rgba(0,210,255,0.5)' }}></div>
                  {/* Glow */}
                  <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', filter: 'blur(60px)', top: '-100px', left: '-100px', background: 'rgba(121,40,202,0.2)', zIndex: 1 }}></div>
                  <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', filter: 'blur(60px)', bottom: '-100px', right: '-100px', background: 'rgba(0,210,255,0.2)', zIndex: 1 }}></div>

                  <div style={{ padding: '25px', position: 'relative', zIndex: 2, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '4px', color: '#00D2FF', fontWeight: 800 }}>PRIMECODE</h2>
                        <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={12} /> SECURED NODE</div>
                      </div>
                      <Zap size={24} style={{ color: '#7928CA' }} />
                    </div>

                    {/* Body */}
                    <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                      <div style={{ width: '90px', height: '90px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,210,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.1)' }}>{user?.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{user?.name}</h3>
                        <p style={{ margin: '0 0 15px', fontSize: '0.75rem', color: '#00D2FF', opacity: 0.8 }}>{user?.designation || 'Software Engineer'}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                          {[{ l: 'ACCESS ID', v: user?.employeeId || `PC${String(user?.id).padStart(3,'0')}` }, { l: 'ROLE', v: user?.role }, { l: 'JOINED', v: user?.createdAt ? new Date(user.createdAt).getFullYear() : '2025' }].map(m => (
                            <div key={m.l}><div style={{ fontSize: '0.55rem', opacity: 0.4 }}>{m.l}</div><div style={{ fontSize: '0.7rem', fontWeight: 600 }}>{m.v}</div></div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                      <div style={{ background: 'rgba(0,210,255,0.05)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(0,210,255,0.1)' }}>
                        <QRCodeSVG value={qrValue} size={60} bgColor="transparent" fgColor="#00D2FF" level="H" />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '0.5rem', opacity: 0.4, letterSpacing: '1px' }}>AUTHORIZED ENTITY</p>
                        <div style={{ height: '15px', width: '80px', background: 'repeating-linear-gradient(90deg, #fff, #fff 1px, transparent 1px, transparent 3px)', margin: '5px 0', opacity: 0.3 }}></div>
                        <span style={{ fontSize: '0.5rem', opacity: 0.2 }}>v3.0.Cyber</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BACK */}
                <div style={{
                  position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                  background: '#080808', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '20px',
                  overflow: 'hidden', boxShadow: '0 0 50px rgba(0,210,255,0.1)', transform: 'rotateY(180deg)'
                }}>
                  <div style={{ padding: '25px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: '40px', background: 'rgba(0,210,255,0.1)', marginBottom: '20px', borderRadius: '4px' }}></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[{ l: 'Email', v: user?.email }, { l: 'Department', v: user?.department || 'Engineering' }, { l: 'Phone', v: user?.phone || '+91 XXXX-XXXXXX' }, { l: 'Blood Group', v: 'O+' }].map(f => (
                        <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                          <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>{f.l}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{f.v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: 'center', opacity: 0.3, fontSize: '0.6rem', marginTop: 'auto' }}>
                      This card is property of PrimeCode Solutions. If found, return to HR.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.7rem', marginTop: '1rem' }}>Click card to flip • Front / Back</p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className="btn-glow" onClick={() => alert('Exporting card as PNG...')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Download size={16} /> Export PNG</button>
              <button className="btn-outline" onClick={() => alert('Print layout rendering...')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Printer size={16} /> Print</button>
              <button className="btn-outline" onClick={() => setShowID(false)}>Close</button>
            </div>
          </div>

          <style>{`
            @keyframes idscan { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
          `}</style>
        </div>
      )}
    </div>
  );
};

// ─── Document Card ───
const DocumentCard = ({ doc, onDelete, onShare, onPreview }) => {
  const iconCfg = FILE_ICONS[doc.type] || FILE_ICONS.pdf;
  const Icon = iconCfg.icon;

  return (
    <div className="glass-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${iconCfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 15px ${iconCfg.color}20` }}>
          <Icon size={20} style={{ color: iconCfg.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: '2px' }}>{doc.size} • {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={onPreview} style={{ flex: 1, background: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.15)', color: '#00D2FF', borderRadius: '6px', padding: '6px', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <Eye size={12} /> Preview
        </button>
        <button style={{ flex: 1, background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.15)', color: '#39FF14', borderRadius: '6px', padding: '6px', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <Download size={12} /> Download
        </button>
        <button onClick={() => onShare(doc.id)} style={{ background: 'rgba(121,40,202,0.08)', border: '1px solid rgba(121,40,202,0.15)', color: '#7928CA', borderRadius: '6px', padding: '6px', cursor: 'pointer', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Share2 size={12} />
        </button>
        {doc.status !== 'system' && (
          <button onClick={() => onDelete(doc.id)} style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.15)', color: '#ff3366', borderRadius: '6px', padding: '6px', cursor: 'pointer', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Mini Card ───
const DocMiniCard = ({ doc }) => {
  const iconCfg = FILE_ICONS[doc.type] || FILE_ICONS.pdf;
  const Icon = iconCfg.icon;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
      <Icon size={14} style={{ color: iconCfg.color, flexShrink: 0 }} />
      <span style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
    </div>
  );
};

// ─── Empty State ───
const EmptyState = ({ text }) => (
  <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
    <FolderOpen size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
    <p style={{ opacity: 0.5 }}>{text}</p>
  </div>
);

export default Documents;
