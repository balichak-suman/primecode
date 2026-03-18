import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import DigitalID from '../components/DigitalID';
import { 
  Search, Grid, List as ListIcon, Filter, MoreVertical, 
  UserPlus, Download, Mail, ChevronRight, User, Briefcase, 
  CreditCard, FileText, X, Upload, CheckCircle, Trash2, Edit 
} from 'lucide-react';

import { API_URL } from '../config/api';

const EmployeeManagement = () => {
  const { user, hasRole } = useAuth();
  
  // UI States
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [bulkResults, setBulkResults] = useState(null);
  const [activeFormTab, setActiveFormTab] = useState('personal');
  
  // Data States
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    designation: '',
    status: '',
    workLocation: ''
  });
  
  const [selectedEmp, setSelectedEmp] = useState(null); // For Digital ID
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'EMPLOYEE',
    designation: '', department: '', grade: '',
    employmentType: 'FULL_TIME', workLocation: 'OFFICE',
    personalEmail: '', dob: '', gender: '', bloodGroup: '',
    bankDetails: { accountNo: '', ifsc: '', bankName: '' }
  });

  useEffect(() => {
    fetchEmployees();
  }, [filters, search]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ search, ...filters });
      const res = await axios.get(`${API_URL}/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/users`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAddModal(false);
      resetForm();
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save employee');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', email: '', password: '', role: 'EMPLOYEE',
      designation: '', department: '', grade: '',
      employmentType: 'FULL_TIME', workLocation: 'OFFICE',
      personalEmail: '', dob: '', gender: '', bloodGroup: '',
      bankDetails: { accountNo: '', ifsc: '', bankName: '' }
    });
    setActiveFormTab('personal');
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderFilterPanel = () => (
    <div className={`filter-sidebar glass-card ${showFilterPanel ? 'open' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3>Filters</h3>
        <button onClick={() => setShowFilterPanel(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><X size={20} /></button>
      </div>
      
      <div className="filter-group">
        <label>Department</label>
        <select className="form-input" value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})}>
          <option value="">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Product">Product</option>
          <option value="Design">Design</option>
          <option value="HR">HR</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Status</label>
        <select className="form-input" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Work Location</label>
        <select className="form-input" value={filters.workLocation} onChange={e => setFilters({...filters, workLocation: e.target.value})}>
          <option value="">All Locations</option>
          <option value="OFFICE">Office</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
        </select>
      </div>

      <button className="btn-outline" onClick={() => setFilters({ department: '', status: '', workLocation: '' })} style={{ width: '100%', marginTop: 'auto' }}>Clear All</button>
    </div>
  );

  const renderAddModal = () => (
    <div className="modal-overlay">
      <div className="glass-card modal-content reveal" style={{ maxWidth: '800px', width: '90%', padding: '0' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {['personal', 'job', 'compensation', 'documents'].map(t => (
            <button 
              key={t}
              onClick={() => setActiveFormTab(t)}
              className={`tab-btn ${activeFormTab === t ? 'active' : ''}`}
              style={{ flex: 1, padding: '1.5rem', background: 'none', border: 'none', color: activeFormTab === t ? '#00D2FF' : '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}
            >
              {t}
            </button>
          ))}
          <button onClick={() => setShowAddModal(false)} style={{ padding: '0 1.5rem', background: 'none', border: 'none', color: '#fff' }}><X /></button>
        </div>

        <form onSubmit={handleSaveEmployee} style={{ padding: '2.5rem' }}>
          {activeFormTab === 'personal' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div className="input-group">
                <label>Full Name</label>
                <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Personal Email</label>
                <input className="form-input" type="email" value={formData.personalEmail} onChange={e => setFormData({...formData, personalEmail: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Date of Birth</label>
                <input className="form-input" type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Gender</label>
                <select className="form-input" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="input-group">
                <label>Blood Group</label>
                <input className="form-input" value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} placeholder="e.g. O+" />
              </div>
            </div>
          )}

          {activeFormTab === 'job' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
               <div className="input-group">
                 <label>Work Email</label>
                 <input className="form-input" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
               </div>
               <div className="input-group">
                 <label>Password</label>
                 <input className="form-input" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Leave blank for default" />
               </div>
               <div className="input-group">
                 <label>Department</label>
                 <input className="form-input" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} required />
               </div>
               <div className="input-group">
                 <label>Designation</label>
                 <input className="form-input" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} required />
               </div>
               <div className="input-group">
                 <label>Work Location</label>
                 <select className="form-input" value={formData.workLocation} onChange={e => setFormData({...formData, workLocation: e.target.value})}>
                   <option value="OFFICE">Office</option>
                   <option value="REMOTE">Remote</option>
                   <option value="HYBRID">Hybrid</option>
                 </select>
               </div>
               <div className="input-group">
                 <label>Joining Date</label>
                 <input className="form-input" type="date" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
               </div>
            </div>
          )}

          {activeFormTab === 'compensation' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
               <div className="input-group">
                 <label>Bank Account Number</label>
                 <input className="form-input" value={formData.bankDetails.accountNo} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails, accountNo: e.target.value}})} />
               </div>
               <div className="input-group">
                 <label>IFSC Code</label>
                 <input className="form-input" value={formData.bankDetails.ifsc} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails, ifsc: e.target.value}})} />
               </div>
               <div className="input-group">
                 <label>Bank Name</label>
                 <input className="form-input" value={formData.bankDetails.bankName} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails, bankName: e.target.value}})} />
               </div>
            </div>
          )}

          {activeFormTab === 'documents' && (
            <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '15px' }}>
               <Upload size={40} style={{ color: '#00D2FF', marginBottom: '1rem' }} />
               <p>Drag & drop employee documents here</p>
               <button type="button" className="btn-outline" style={{ marginTop: '1rem' }}>Browse Files</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', justifyContent: 'flex-end' }}>
             <button type="button" className="btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
             <button type="submit" className="btn-glow">Establish Identity</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="employee-mgmt-page">
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 className="gradient-text" style={{ margin: 0 }}>Personnel Matrix</h2>
          <p style={{ margin: 0, opacity: 0.5, fontSize: '0.9rem' }}>Managing {employees.length} active neural nodes</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
           <div className="search-pill">
             <Search size={18} />
             <input placeholder="Search entities..." value={search} onChange={e => setSearch(e.target.value)} />
           </div>
           
           <button className="icon-btn-glow" title="Add Employee" onClick={() => setShowAddModal(true)}><UserPlus size={20} /></button>
           <button className="icon-btn-outline" title="Bulk Import" onClick={() => setShowBulkModal(true)}><Upload size={20} /></button>
           <button className="icon-btn-outline" title="Filters" onClick={() => setShowFilterPanel(true)}><Filter size={20} /></button>
           
           <div className="view-mode-toggle">
             <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><Grid size={18} /></button>
             <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><ListIcon size={18} /></button>
           </div>
        </div>
      </div>

      {renderFilterPanel()}
      {showAddModal && renderAddModal()}
      
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content reveal" style={{ maxWidth: '600px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="gradient-text">Mass Neural Import</h3>
              <button onClick={() => { setShowBulkModal(false); setBulkResults(null); }} style={{ background: 'none', border: 'none', color: '#fff' }}><X /></button>
            </div>
            
            {!bulkResults ? (
              <>
                <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '1rem' }}>Paste employee JSON data for bulk induction (Array of objects with name, email, department, designation).</p>
                <textarea 
                  className="form-input" 
                  value={bulkData} 
                  onChange={e => setBulkData(e.target.value)}
                  placeholder='[{"name": "Alice", "email": "alice@primecode.tech", "department": "Security"}]'
                  style={{ height: '200px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                  <button className="btn-outline" onClick={() => setShowBulkModal(false)}>Cancel</button>
                  <button className="btn-glow" onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const employees = JSON.parse(bulkData);
                      const res = await axios.post(`${API_URL}/users/bulk-import`, { employees }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      setBulkResults(res.data.results);
                      fetchEmployees();
                    } catch (err) {
                      alert('Invalid JSON format or network error');
                    }
                  }}>Execute Import</button>
                </div>
              </>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ padding: '1rem', background: 'rgba(0,255,100,0.1)', color: '#00ff88', borderRadius: '8px', marginBottom: '1rem' }}>Induction Complete</div>
                {bulkResults.map((r, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{r.email}</span>
                    <span style={{ color: r.status === 'Success' ? '#00ff88' : '#ff3366' }}>{r.status} {r.employeeId || r.error}</span>
                  </div>
                ))}
                <button className="btn-outline" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => { setShowBulkModal(false); setBulkResults(null); setBulkData(''); }}>Close Portal</button>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#00D2FF', marginTop: '5rem' }}>Querying Personnel Database...</div>
      ) : (
        <div className={`employee-container ${viewMode}`}>
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
               {employees.map(emp => (
                 <div key={emp.id} className="glass-card emp-card reveal" style={{ padding: '0', overflow: 'hidden' }}>
                    <div className="emp-card-header" style={{ height: '80px', background: 'linear-gradient(45deg, rgba(0,210,255,0.1), rgba(121,40,202,0.1))' }}></div>
                    <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', marginTop: '-40px', textAlign: 'center' }}>
                       <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0,210,255,0.2)', border: '4px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem', fontWeight: 'bold', color: '#00D2FF' }}>
                          {emp.name.charAt(0)}
                       </div>
                       <h3 style={{ margin: '0 0 5px 0' }}>{emp.name}</h3>
                       <p style={{ margin: '0 0 15px 0', opacity: 0.6, fontSize: '0.85rem' }}>{emp.designation}</p>
                       
                       <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                          <span className="status-dot active"></span>
                          <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>{emp.employeeProfile?.department || emp.department}</span>
                       </div>

                       <div style={{ display: 'flex', gap: '10px' }}>
                          <button className="btn-outline" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => window.location.href = `/dashboard/employee/${emp.id}`}>View Core</button>
                          <button className="btn-outline" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => setSelectedEmp(emp)}>Digital ID</button>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
               <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                 <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', opacity: 0.5, fontSize: '0.85rem' }}>
                       <th style={{ padding: '1.2rem' }}>Identity</th>
                       <th style={{ padding: '1.2rem' }}>Employee ID</th>
                       <th style={{ padding: '1.2rem' }}>Department</th>
                       <th style={{ padding: '1.2rem' }}>Location</th>
                       <th style={{ padding: '1.2rem' }}>Status</th>
                       <th style={{ padding: '1.2rem' }}>Actions</th>
                    </tr>
                 </thead>
                 <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                         <td style={{ padding: '1.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                               <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'rgba(0,210,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D2FF', fontSize: '0.8rem' }}>{emp.name.charAt(0)}</div>
                               <div>
                                  <div style={{ fontWeight: '500' }}>{emp.name}</div>
                                  <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{emp.email}</div>
                               </div>
                            </div>
                         </td>
                         <td style={{ padding: '1.2rem', fontFamily: 'monospace', opacity: 0.8 }}>{emp.employeeId || 'PC000'}</td>
                         <td style={{ padding: '1.2rem', opacity: 0.8 }}>{emp.employeeProfile?.department || emp.department}</td>
                         <td style={{ padding: '1.2rem', opacity: 0.8 }}>{emp.employeeProfile?.workLocation || 'OFFICE'}</td>
                         <td style={{ padding: '1.2rem' }}>
                            <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px', background: 'rgba(0,255,100,0.1)', color: '#00ff88' }}>ACTIVE</span>
                         </td>
                         <td style={{ padding: '1.2rem' }}>
                            <button style={{ background: 'none', border: 'none', color: '#fff' }}><MoreVertical size={18} /></button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
            </div>
          )}
        </div>
      )}

      {selectedEmp && <DigitalID employee={selectedEmp} onClose={() => setSelectedEmp(null)} />}

      <style>{`
        .employee-mgmt-page { padding: 2rem; }
        .search-pill { display: flex; alignItems: center; gap: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 0 1.2rem; border-radius: 30px; width: 300px; transition: border 0.3s; }
        .search-pill:focus-within { border-color: #00D2FF; }
        .search-pill input { background: none; border: none; color: #fff; padding: 10px 0; width: 100%; outline: none; }
        .icon-btn-glow { background: rgba(0,210,255,0.2); border: 1px solid #00D2FF; color: #00D2FF; padding: 10px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; box-shadow: 0 0 15px rgba(0,210,255,0.2); }
        .icon-btn-outline { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; }
        .view-mode-toggle { display: flex; background: rgba(255,255,255,0.05); border-radius: 10px; padding: 4px; }
        .view-mode-toggle button { background: none; border: none; color: rgba(255,255,255,0.4); padding: 8px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; }
        .view-mode-toggle button.active { background: rgba(255,255,255,0.1); color: #00D2FF; }
        
        .filter-sidebar { position: fixed; right: -350px; top: 0; bottom: 0; width: 320px; z-index: 1000; transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 0; border-right: none; padding: 2.5rem; display: flex; flexDirection: column; }
        .filter-sidebar.open { right: 0; }
        .filter-group { margin-bottom: 2rem; }
        .filter-group label { display: block; fontSize: 0.8rem; opacity: 0.5; marginBottom: 8px; textTransform: uppercase; letter-spacing: 1px; }

        .modal-content { transition: all 0.3s; }
        .tab-btn.active { border-bottom: 2px solid #00D2FF !important; }
        .input-group label { display: block; fontSize: 0.8rem; opacity: 0.6; marginBottom: 8px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .status-dot.active { background: #00ff88; box-shadow: 0 0 8px #00ff88; }
      `}</style>
    </div>
  );
};

export default EmployeeManagement;
