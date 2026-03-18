import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import DigitalID from '../components/DigitalID';
import { 
  ArrowLeft, Edit3, Trash2, Calendar, MapPin, 
  Mail, Phone, Briefcase, Award, Shield, FileText, 
  Clock, Download, ExternalLink, Save, X 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, hasRole } = useAuth();
  
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showDigitalID, setShowDigitalID] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployee(res.data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      // alert('Profile not found or access denied');
      // navigate('/dashboard/employee-management');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (profileData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/users/${id}`, { profileData }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditMode(false);
      fetchProfile();
    } catch (err) {
      alert('Update failed');
    }
  };

  const handleUploadDocument = async () => {
    try {
      const name = prompt('Enter document name (e.g. Passport, Degree):');
      if (!name) return;
      
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/users/${id}/documents`, {
        name,
        type: 'PDF',
        url: 'https://primecode.tech/cdn/simulated-doc.pdf'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProfile();
    } catch (err) {
      alert('Upload simulation failed');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '5rem', color: '#00D2FF' }}>Syncing Neural Profile...</div>;
  if (!employee) return <div>Identity not found in matrix.</div>;

  const profile = employee.employeeProfile || {};

  return (
    <div className="profile-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <button className="btn-outline" onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={18} /> Back to Directory
        </button>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <button className="btn-outline" onClick={() => setShowDigitalID(true)}>Generate ID Card</button>
           {hasRole(['HR', 'ADMIN']) && (
             <button className="btn-glow" onClick={() => setEditMode(!editMode)}>
               {editMode ? <X size={18} /> : <Edit3 size={18} />} {editMode ? 'Cancel Edit' : 'Modify Entity'}
             </button>
           )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* LEFT COLLUMN: KEY INFO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
           <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(0,210,255,0.1)', border: '4px solid rgba(0,210,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2.5rem', fontWeight: 'bold', color: '#00D2FF' }}>
                 {employee.name.charAt(0)}
              </div>
              <h2 style={{ margin: '0 0 5px 0' }}>{employee.name}</h2>
              <p style={{ margin: '0 0 15px 0', opacity: 0.6, fontSize: '0.9rem' }}>{employee.designation}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '2rem' }}>
                 <span className="status-badge" style={{ background: 'rgba(0,255,100,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,100,0.2)', fontSize: '0.7rem' }}>ACTIVE</span>
                 <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.7rem' }}>{employee.employeeId}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
                    <Mail size={16} color="#00D2FF" /> <span style={{ opacity: 0.6 }}>{employee.email}</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
                    <Briefcase size={16} color="#00D2FF" /> <span style={{ opacity: 0.6 }}>{profile.department}</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
                    <MapPin size={16} color="#00D2FF" /> <span style={{ opacity: 0.6 }}>{profile.workLocation || 'OFFICE'}</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
                    <Calendar size={16} color="#00D2FF" /> <span style={{ opacity: 0.6 }}>Joined {new Date(profile.joiningDate).toLocaleDateString()}</span>
                 </div>
              </div>
           </div>

           <div className="glass-card" style={{ padding: '2rem' }}>
              <h4 style={{ marginBottom: '1.5rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Stats</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div className="stat-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ margin: 0, color: '#00D2FF' }}>{employee.attendance?.length || 0}</h3>
                    <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.5 }}>PRESENCE</p>
                 </div>
                 <div className="stat-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ margin: 0, color: '#ff3333' }}>{employee.leaves?.length || 0}</h3>
                    <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.5 }}>LEAVES</p>
                 </div>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN: TABS & DETAILS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
           <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {['overview', 'documents', 'timeline'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setActiveTab(t)}
                    style={{ padding: '1.2rem 2rem', background: 'none', border: 'none', color: activeTab === t ? '#00D2FF' : '#fff', borderBottom: activeTab === t ? '2px solid #00D2FF' : 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', textTransform: 'uppercase' }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div style={{ padding: '2.5rem' }}>
                 {activeTab === 'overview' && (
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                      <section>
                         <h4 style={{ color: '#00D2FF', marginBottom: '1.5rem' }}>Personal Core</h4>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="detail-item">
                               <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '5px' }}>Date of Birth</label>
                               <div>{profile.dob ? new Date(profile.dob).toLocaleDateString() : 'Not Specified'}</div>
                            </div>
                            <div className="detail-item">
                               <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '5px' }}>Gender</label>
                               <div>{profile.gender || 'Not Specified'}</div>
                            </div>
                            <div className="detail-item">
                               <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '5px' }}>Blood Group</label>
                               <div style={{ color: '#ff3333' }}>{profile.bloodGroup || 'O+'}</div>
                            </div>
                         </div>
                      </section>

                      <section>
                         <h4 style={{ color: '#7928CA', marginBottom: '1.5rem' }}>Organization Node</h4>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="detail-item">
                               <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '5px' }}>Employment Mode</label>
                               <div style={{ textTransform: 'capitalize' }}>{profile.employmentType?.toLowerCase() || 'Full-time'}</div>
                            </div>
                            <div className="detail-item">
                               <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '5px' }}>Entity Grade</label>
                               <div style={{ color: '#00D2FF' }}>{profile.grade || 'L1'}</div>
                            </div>
                            <div className="detail-item">
                               <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '5px' }}>Reporting Context</label>
                               <div>Human Resource Manager</div>
                            </div>
                         </div>
                      </section>
                   </div>
                 )}

                 {activeTab === 'documents' && (
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                      {(profile.documents || [
                        { name: 'Offer Letter.pdf', type: 'PDF' },
                        { name: 'Identity Proof.jpg', type: 'IMG' },
                        { name: 'Experience Certificate.pdf', type: 'PDF' }
                      ]).map((doc, i) => (
                        <div key={i} className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                           <FileText size={30} color={doc.type === 'PDF' ? '#ff3333' : '#00D2FF'} style={{ marginBottom: '1rem' }} />
                           <p style={{ fontSize: '0.8rem', marginBottom: '1.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
                           <button className="btn-outline" style={{ width: '100%', fontSize: '0.7rem' }}><Download size={14} /> Download</button>
                        </div>
                      ))}
                      <div className="glass-card" onClick={handleUploadDocument} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(0,210,255,0.3)', cursor: 'pointer' }}>
                         <Upload size={20} color="#00D2FF" style={{ marginBottom: '8px' }} />
                         <span style={{ fontSize: '0.75rem', color: '#00D2FF' }}>Sync New Node</span>
                      </div>
                   </div>
                 )}

                 {activeTab === 'timeline' && (
                   <div className="timeline-container" style={{ padding: '1rem' }}>
                      {[
                        { date: 'Oct 2025', title: 'Salary Increment Applied', details: '+15.5% Adjustment', color: '#00ff88' },
                        { date: 'Aug 2025', title: 'Casual Leave Consumed', details: '3.0 Units - Family Event', color: '#00D2FF' },
                        { date: 'Jun 2025', title: 'Probation Successfully Terminated', details: 'Confirmed as Regular Entity', color: '#7928CA' },
                        { date: 'Jan 2025', title: 'Entity Initialized', details: 'Node Induction to Engineering', color: '#fff' }
                      ].map((evt, idx) => (
                        <div key={idx} style={{ position: 'relative', paddingLeft: '30px', paddingBottom: '2.5rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                           <div style={{ position: 'absolute', left: '-7px', top: '0', width: '12px', height: '12px', borderRadius: '50%', background: evt.color, boxShadow: `0 0 10px \${evt.color}` }}></div>
                           <span style={{ fontSize: '0.75rem', opacity: 0.5, display: 'block', marginBottom: '5px' }}>{evt.date}</span>
                           <h5 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{evt.title}</h5>
                           <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>{evt.details}</p>
                        </div>
                      ))}
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {showDigitalID && <DigitalID employee={employee} onClose={() => setShowDigitalID(false)} />}
      
      <style>{`
        .profile-page { padding: 2rem; }
        .detail-item div { font-weight: 500; font-size: 1.1rem; }
        .status-badge { padding: 4px 12px; border-radius: 20px; font-weight: 600; }
        @keyframes reveal { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .reveal { animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
};

export default EmployeeProfile;
