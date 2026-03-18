import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Download, FileText, ChevronRight, DollarSign, PieChart, Users, 
  Settings, CheckCircle, Clock, AlertCircle, Plus, Trash2, Send
} from 'lucide-react';

import { API_URL } from '../config/api';

const Payroll = () => {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('ME'); // 'ME' | 'PROCESS' | 'MANAGE'
  
  // Data States
  const [myPayslips, setMyPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [myClaims, setMyClaims] = useState([]);
  const [allPayroll, setAllPayroll] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // HR Workflow State
  const [step, setStep] = useState(1);
  const [processData, setProcessData] = useState({ month: 'March', year: 2026 });

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'ME') {
        const res = await axios.get(`${API_URL}/payroll/my-payslips`, { headers });
        setMyPayslips(res.data);
        if (res.data.length > 0) setSelectedPayslip(res.data[0]);
        
        const claims = await axios.get(`${API_URL}/payroll/my-reimbursements`, { headers });
        setMyClaims(claims.data);
      } else if (activeTab === 'PROCESS') {
        const res = await axios.get(`${API_URL}/payroll/all`, { headers });
        setAllPayroll(res.data);
      } else if (activeTab === 'MANAGE') {
        const res = await axios.get(`${API_URL}/users`, { headers });
        setEmployees(res.data.filter(e => e.role === 'EMPLOYEE'));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // EMPLOYEE ACTIONS
  // ==========================================
  const downloadPDF = (slip) => {
    const doc = new jsPDF();
    const cyan = [0, 210, 255];
    const red = [255, 50, 50];

    // Background styling
    doc.setFillColor(15, 15, 20);
    doc.rect(0, 0, 210, 297, 'F');

    // Header
    doc.setFontSize(24);
    doc.setTextColor(cyan[0], cyan[1], cyan[2]);
    doc.text('PRIMECODE HRMS', 20, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(200);
    doc.text('Confidential Payslip Statement', 20, 38);

    // Employee Details Box
    doc.setDrawColor(50, 50, 60);
    doc.setFillColor(25, 25, 35);
    doc.roundedRect(20, 45, 170, 40, 3, 3, 'FD');
    
    doc.setFontSize(10);
    doc.setTextColor(255);
    doc.text(`Employee: ${user.name}`, 30, 55);
    doc.text(`ID: ${user.employeeId}`, 30, 62);
    doc.text(`Period: ${slip.month} ${slip.year}`, 30, 69);
    doc.text(`Payment Date: ${new Date(slip.paymentDate || Date.now()).toLocaleDateString()}`, 110, 55);
    doc.text(`Net Pay: $${slip.netSalary.toLocaleString()}`, 110, 62);

    // Earnings Table
    doc.autoTable({
      startY: 95,
      head: [['Earnings', 'Amount']],
      body: Object.entries(slip.earnings).map(([k, v]) => [k.toUpperCase(), `$${v.toFixed(2)}`]),
      theme: 'grid',
      headStyles: { fillColor: cyan, textColor: 0 },
      styles: { fillColor: [30, 30, 40], textColor: 255, lineColor: [50, 50, 60] }
    });

    // Deductions Table
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Deductions', 'Amount']],
      body: Object.entries(slip.deductions).map(([k, v]) => [k.toUpperCase(), `$${v.toFixed(2)}`]),
      theme: 'grid',
      headStyles: { fillColor: red, textColor: 255 },
      styles: { fillColor: [30, 30, 40], textColor: 255, lineColor: [50, 50, 60] }
    });

    doc.save(`Payslip_${slip.month}_${slip.year}.pdf`);
  };

  // ==========================================
  // HR / ADMIN ACTIONS
  // ==========================================
  const startPayrollRun = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/payroll/process-monthly`, processData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStep(4); // Move to Preview
      fetchInitialData();
    } catch (err) {
      alert('Processing failed');
    }
  };

  const markAllPaid = async () => {
    try {
      const token = localStorage.getItem('token');
      const ids = allPayroll.filter(p => p.status !== 'PAID').map(p => p.id);
      await axios.put(`${API_URL}/payroll/mark-paid`, {
        payrollIds: ids,
        paymentDate: new Date().toISOString(),
        paymentMode: 'BANK_TRANSFER'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('All marked as PAID');
      setStep(6);
      fetchInitialData();
    } catch (err) {
      alert('Update failed');
    }
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const renderEmployeeView = () => {
    const chartData = myPayslips.slice(0, 6).reverse().map(p => ({
      name: p.month,
      gross: p.grossSalary,
      net: p.netSalary
    }));

    return (
      <div className="employee-payroll-view">
        {/* MONTH TAB SELECTOR */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '10px' }}>
          {myPayslips.map(p => (
            <button 
              key={p.id}
              onClick={() => setSelectedPayslip(p)}
              style={{
                padding: '10px 20px',
                borderRadius: '30px',
                border: '1px solid rgba(0,210,255,0.2)',
                background: selectedPayslip?.id === p.id ? 'rgba(0,210,255,0.2)' : 'rgba(255,255,255,0.03)',
                color: selectedPayslip?.id === p.id ? '#00D2FF' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {p.month} {p.year}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          {/* PAYSLIP CARD */}
          {selectedPayslip ? (
            <div className="glass-card" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '1.5rem', opacity: 0.1 }}>
                <PieChart size={150} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ color: '#00D2FF', margin: 0 }}>PrimeCode</h2>
                  <p style={{ margin: 0, opacity: 0.5, letterSpacing: '2px', fontSize: '0.8rem' }}>SALARY STATEMENT</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ margin: 0 }}>{user.name}</h4>
                  <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>{user.designation}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
                <div>
                  <h4 style={{ color: '#00D2FF', borderBottom: '1px solid rgba(0,210,255,0.2)', paddingBottom: '8px' }}>EARNINGS</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1rem' }}>
                    {Object.entries(selectedPayslip.earnings).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ opacity: 0.7 }}>{k.toUpperCase()}</span>
                        <span>${v.toLocaleString()}</span>
                      </div>
                    ))}
                    <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', color: '#00D2FF', display: 'flex', justifyContent: 'space-between' }}>
                      <span>GROSS EARNINGS</span>
                      <span>${selectedPayslip.grossSalary.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ color: '#ff3333', borderBottom: '1px solid rgba(255,50,50,0.2)', paddingBottom: '8px' }}>DEDUCTIONS</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1rem' }}>
                    {Object.entries(selectedPayslip.deductions).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ opacity: 0.7 }}>{k.toUpperCase()}</span>
                        <span>${v.toLocaleString()}</span>
                      </div>
                    ))}
                    <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', color: '#ff3333', display: 'flex', justifyContent: 'space-between' }}>
                      <span>TOTAL DEDUCTIONS</span>
                      <span>${selectedPayslip.totalDeductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '3rem', background: 'rgba(0,210,255,0.05)', padding: '2rem', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, opacity: 0.5, fontSize: '0.8rem' }}>NET PAYABLE AMOUNT</p>
                  <h1 style={{ margin: 0, color: '#00D2FF', fontSize: '2.5rem' }}>${selectedPayslip.netSalary.toLocaleString()}</h1>
                </div>
                <button onClick={() => downloadPDF(selectedPayslip)} className="btn-glow" style={{ padding: '12px 25px' }}>
                  <Download size={20} style={{ marginRight: '8px' }} /> Download PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>No payslips found for display.</div>
          )}

          {/* SIDE ASSETS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ color: '#fff', marginBottom: '1.5rem' }}>Salary Trend (6m)</h4>
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Bar dataKey="gross" fill="#00D2FF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="net" fill="#7928CA" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ color: '#fff', marginBottom: '1rem' }}>Form 16 & Tax Docs</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-outline" style={{ flex: 1, fontSize: '0.85rem' }}><FileText size={16} /> 2025-26</button>
                <button className="btn-outline" style={{ flex: 1, fontSize: '0.85rem' }}><FileText size={16} /> 2024-25</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHRView = () => {
    const steps = ["Config", "Attendance", "Review", "Preview", "Process", "Final"];
    return (
      <div className="hr-payroll-view">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '15px', marginBottom: '2rem' }}>
          {steps.map((s, idx) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: step > idx ? '#00ff88' : idx + 1 === step ? '#00D2FF' : 'rgba(255,255,255,0.2)' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                {step > idx + 1 ? <CheckCircle size={16} /> : idx + 1}
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{s}</span>
              {idx < steps.length - 1 && <ChevronRight size={16} opacity={0.2} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ color: '#00D2FF' }}>Initiate Monthly Payroll</h3>
            <p style={{ opacity: 0.6, marginBottom: '2rem' }}>Select the billing month and year to start processing wage calculations.</p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '2rem' }}>
               <select className="form-input" value={processData.month} onChange={e => setProcessData({...processData, month:e.target.value})} style={{ width: '150px' }}>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => <option key={m} value={m}>{m}</option>)}
               </select>
               <input type="number" className="form-input" value={processData.year} onChange={e => setProcessData({...processData, year:e.target.value})} style={{ width: '100px' }} />
            </div>
            <button onClick={() => setStep(2)} className="btn-glow">Proceed to Attendance Verify</button>
          </div>
        )}

        {step === 2 && (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ color: '#00D2FF' }}>Step 2: Verify Attendance Data</h3>
            <p style={{ opacity: 0.6 }}>Synchronizing with Biometric & Remote Logs for {processData.month} {processData.year}...</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '2rem 0' }}>
               <div style={{ padding: '1rem 2rem', background: 'rgba(0,255,100,0.1)', border: '1px solid #00ff88', borderRadius: '10px' }}>
                  <Users size={20} color="#00ff88" /> 124 Active Employees
               </div>
               <div style={{ padding: '1rem 2rem', background: 'rgba(255,255,0,0.1)', border: '1px solid #ffff00', borderRadius: '10px' }}>
                  <AlertCircle size={20} color="#ffff00" /> 3 Pending Regularizations
               </div>
            </div>
            <button onClick={() => setStep(3)} className="btn-glow">Review Salary Splits</button>
          </div>
        )}

        {step === 3 && (
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
               <h3 style={{ color: '#00D2FF' }}>Step 3: Bulk Review & Manual Overrides</h3>
               <button onClick={startPayrollRun} className="btn-glow">Generate Draft Payroll</button>
            </div>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ opacity: 0.5, fontSize: '0.8rem' }}>
                    <th style={{ padding: '1rem' }}>Employee</th>
                    <th style={{ padding: '1rem' }}>Basic</th>
                    <th style={{ padding: '1rem' }}>Bonus / Reim</th>
                    <th style={{ padding: '1rem' }}>Deductions</th>
                    <th style={{ padding: '1rem' }}>Actions</th>
                 </tr>
               </thead>
               <tbody>
                  {allPayroll.slice(0, 5).map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                       <td style={{ padding: '1rem' }}>{p.user?.name}</td>
                       <td style={{ padding: '1rem' }}>${p.baseSalary.toLocaleString()}</td>
                       <td style={{ padding: '1rem' }}><input type="number" defaultValue={0} style={{ width: '60px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '4px' }} /></td>
                       <td style={{ padding: '1rem' }}>${p.totalDeductions.toLocaleString()}</td>
                       <td style={{ padding: '1rem' }}><button style={{ color: '#ff3333', background: 'none', border: 'none' }}>Hold</button></td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>
        )}

        {step === 4 && (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ color: '#00D2FF' }}>Step 4: Payroll Preview Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', margin: '2rem 0' }}>
               <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <p style={{ margin: '0 0 10px 0', opacity: 0.5 }}>Total Payout</p>
                  <h2 style={{ margin:0, color: '#00ff88' }}>$248,500</h2>
               </div>
               <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <p style={{ margin: '0 0 10px 0', opacity: 0.5 }}>PF/ESI Contributions</p>
                  <h2 style={{ margin:0, color: '#8A2BE2' }}>$24,000</h2>
               </div>
               <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <p style={{ margin: '0 0 10px 0', opacity: 0.5 }}>TDS/Tax Wallet</p>
                  <h2 style={{ margin:0, color: '#00D2FF' }}>$42,100</h2>
               </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setStep(3)} className="btn-outline">Back to Edit</button>
              <button onClick={() => setStep(5)} className="btn-glow">Confirm & Lock Payroll</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ color: '#00D2FF' }}>Step 5: Process Disbursement</h3>
            <p>Payroll for {processData.month} has been locked. Generating NEFT file for bank...</p>
            <div style={{ margin: '2rem 0' }}>
              <button onClick={markAllPaid} className="btn-glow" style={{ padding: '15px 40px' }}>DISBURSE SALARIES</button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(0,255,100,0.1)', color: '#00ff88', padding: '2rem', borderRadius: '50%', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle size={50} />
            </div>
            <h2 style={{ color: '#fff' }}>Mission Accomplished</h2>
            <p style={{ opacity: 0.6 }}>Payroll for {processData.month} {processData.year} has been processed and paid.</p>
            <button onClick={() => setStep(1)} className="btn-outline" style={{ marginTop: '2rem' }}>Run Next Pipeline</button>
          </div>
        )}
      </div>
    );
  };

  const renderAdminView = () => {
    return (
      <div className="admin-payroll-view">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          {/* SALARY STRUCTURE EDITOR */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ color: '#00D2FF', display: 'flex', alignItems: 'center', gap: '10px' }}><Settings /> Structure Editor</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1.5rem' }}>
               <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '6px' }}>Select Employee</label>
                  <select className="form-input" style={{ width: '100%' }}>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
                  </select>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '6px' }}>Annual CTC ($)</label>
                    <input type="number" className="form-input" placeholder="e.g. 50000" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '6px' }}>Effective From</label>
                    <input type="date" className="form-input" style={{ width: '100%' }} />
                  </div>
               </div>
               <button className="btn-glow">Apply New Structure</button>
            </div>
          </div>

          {/* QUICK REPORTS */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ color: '#8A2BE2', display: 'flex', alignItems: 'center', gap: '10px' }}><PieChart /> Payroll Intelligence</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
               <button className="btn-outline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', gap: '10px' }}>
                 <Users size={24} /> <span>Dept. wise Cost</span>
               </button>
               <button className="btn-outline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', gap: '10px' }}>
                 <AlertCircle size={24} /> <span>TDS Compliance</span>
               </button>
               <button className="btn-outline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', gap: '10px' }}>
                 <DollarSign size={24} /> <span>PF Account Ledger</span>
               </button>
               <button className="btn-outline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', gap: '10px' }}>
                 <Send size={24} /> <span>Bank Export (NEFT)</span>
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="payroll-page" style={{ paddingBottom: '5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h2 className="gradient-text">Payroll Cyber-Center</h2>
        
        <div className="view-toggle" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '30px', padding: '4px' }}>
          <button className={`toggle-btn ${activeTab === 'ME' ? 'active' : ''}`} onClick={() => setActiveTab('ME')} style={toggleBtnStyle(activeTab === 'ME')}>My Payslip</button>
          {hasRole(['HR', 'ADMIN']) && <button className={`toggle-btn ${activeTab === 'PROCESS' ? 'active' : ''}`} onClick={() => setActiveTab('PROCESS')} style={toggleBtnStyle(activeTab === 'PROCESS')}>Process Payroll</button>}
          {hasRole(['ADMIN']) && <button className={`toggle-btn ${activeTab === 'MANAGE' ? 'active' : ''}`} onClick={() => setActiveTab('MANAGE')} style={toggleBtnStyle(activeTab === 'MANAGE')}>Salary Settings</button>}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#00D2FF', marginTop: '5rem' }}>Initializing Quantum Ledger...</div>
      ) : (
        <>
          {activeTab === 'ME' && renderEmployeeView()}
          {activeTab === 'PROCESS' && renderHRView()}
          {activeTab === 'MANAGE' && renderAdminView()}
        </>
      )}
    </div>
  );
};

const toggleBtnStyle = (active) => ({
  padding: '8px 20px',
  borderRadius: '20px',
  border: 'none',
  background: active ? 'rgba(0,210,255,0.2)' : 'transparent',
  color: active ? '#00D2FF' : '#fff',
  cursor: 'pointer',
  transition: 'all 0.3s',
  fontSize: '0.85rem',
  fontWeight: active ? '600' : '400'
});

export default Payroll;
