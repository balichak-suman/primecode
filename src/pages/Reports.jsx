import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Clock, Calendar, DollarSign, Users, Award, FileText, Download, Eye,
  Filter, ChevronRight, BarChart2, AlertTriangle, UserCheck, Briefcase,
  TrendingUp, Gift, MapPin, Table, FileSpreadsheet, Printer, X, Search,
  CheckCircle, XCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

import { API_URL } from '../config/api';

const CATEGORIES = [
  { id: 'attendance', label: 'Attendance', icon: Clock, color: '#00D2FF', reports: [
    { id: 'register', name: 'Monthly Attendance Register', desc: 'All employees, all days', endpoint: '/reports/attendance/register' },
    { id: 'late', name: 'Late Arrival Report', desc: 'Who was late, how many minutes', endpoint: '/reports/attendance/late' },
    { id: 'overtime', name: 'Overtime Report', desc: 'Overtime hours by employee', endpoint: '/reports/attendance/overtime' },
    { id: 'awol', name: 'AWOL Report', desc: 'Absent without leave', endpoint: '/reports/attendance/register', filter: r => r.status === 'ABSENT' },
    { id: 'wfh', name: 'WFH vs Office Utilization', desc: 'Work location breakdown', endpoint: '/reports/attendance/register', filter: r => ['WFH', 'PRESENT'].includes(r.status) },
  ]},
  { id: 'leave', label: 'Leave', icon: Calendar, color: '#7928CA', reports: [
    { id: 'balance', name: 'Leave Balance Report', desc: 'All employees, all types', endpoint: '/reports/leave/balance' },
    { id: 'taken', name: 'Leave Taken Report', desc: 'Period-wise leave consumption', endpoint: '/reports/leave/taken' },
    { id: 'pending', name: 'Pending Applications', desc: 'Awaiting approval', endpoint: '/reports/leave/pending' },
    { id: 'encashment', name: 'Leave Encashment Report', desc: 'Eligible earned leave encashment', endpoint: '/reports/leave/balance' },
  ]},
  { id: 'payroll', label: 'Payroll', icon: DollarSign, color: '#39FF14', reports: [
    { id: 'summary', name: 'Monthly Payroll Summary', desc: 'Complete payroll breakdown', endpoint: '/reports/payroll/summary' },
    { id: 'dept', name: 'Department-wise Payroll', desc: 'Cost by department', endpoint: '/reports/payroll/summary' },
    { id: 'pf', name: 'PF Contribution Report', desc: 'EPF format export', endpoint: '/reports/payroll/summary' },
    { id: 'tds', name: 'TDS Deduction Report', desc: 'Income tax deductions', endpoint: '/reports/payroll/summary' },
    { id: 'bank', name: 'Bank Disbursement File', desc: 'NEFT format for banks', endpoint: '/reports/payroll/summary' },
    { id: 'ytd', name: 'Year-to-Date Salary', desc: 'Cumulative salary report', endpoint: '/reports/payroll/summary' },
  ]},
  { id: 'employee', label: 'Employee', icon: Users, color: '#FFD700', reports: [
    { id: 'master', name: 'Employee Master List', desc: 'Complete directory with all details', endpoint: '/reports/employee/master' },
    { id: 'joining', name: 'New Joinings Report', desc: 'Recent hires', endpoint: '/reports/employee/master', filter: r => { const d = new Date(r.createdAt); return (Date.now() - d) < 90 * 86400000; }},
    { id: 'birthday', name: 'Birthday List', desc: 'Upcoming birthdays this month', endpoint: '/reports/employee/master' },
    { id: 'anniversary', name: 'Work Anniversary List', desc: 'Upcoming work anniversaries', endpoint: '/reports/employee/master' },
    { id: 'headcount', name: 'Headcount Summary', desc: 'By department & location', endpoint: '/reports/employee/headcount' },
    { id: 'probation', name: 'Probation Due Report', desc: 'Probation ending soon', endpoint: '/reports/employee/master' },
  ]},
  { id: 'performance', label: 'Performance', icon: Award, color: '#ff3366', reports: [
    { id: 'ratings', name: 'Performance Ratings', desc: 'All employee ratings', endpoint: '/reports/performance/ratings' },
    { id: 'goals', name: 'Goal Completion Report', desc: 'Goal status across teams', endpoint: '/reports/performance/goals' },
  ]},
  { id: 'custom', label: 'Custom', icon: FileText, color: '#f472b6', reports: [
    { id: 'custom1', name: 'Build Custom Report', desc: 'Select fields and filters manually', endpoint: null },
  ]},
];

const DATE_PRESETS = [
  { label: 'This Month', getValue: () => { const n = new Date(); return { start: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0], end: n.toISOString().split('T')[0] }; }},
  { label: 'Last Month', getValue: () => { const n = new Date(); const s = new Date(n.getFullYear(), n.getMonth()-1, 1); const e = new Date(n.getFullYear(), n.getMonth(), 0); return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] }; }},
  { label: 'This Quarter', getValue: () => { const n = new Date(); const q = Math.floor(n.getMonth()/3)*3; return { start: new Date(n.getFullYear(), q, 1).toISOString().split('T')[0], end: n.toISOString().split('T')[0] }; }},
  { label: 'This Year', getValue: () => { const n = new Date(); return { start: new Date(n.getFullYear(), 0, 1).toISOString().split('T')[0], end: n.toISOString().split('T')[0] }; }},
];

const Reports = () => {
  const [activeCategory, setActiveCategory] = useState('attendance');
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [department, setDepartment] = useState('');
  const [format, setFormat] = useState('pdf');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const token = () => localStorage.getItem('token');
  const config = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  const currentCat = CATEGORIES.find(c => c.id === activeCategory);

  const generateReport = async (report) => {
    if (!report.endpoint) { alert('Custom report builder coming soon!'); return; }
    setSelectedReport(report);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      if (department) params.append('department', department);
      const url = `${API_URL}${report.endpoint}${params.toString() ? '?' + params.toString() : ''}`;
      const res = await axios.get(url, config());
      let data = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      if (report.filter) data = data.filter(report.filter);
      setReportData(data);
      setShowPreview(true);
    } catch (err) {
      console.error('Report generation error:', err);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!reportData?.length) return;
    const keys = Object.keys(flattenObj(reportData[0]));
    const rows = reportData.map(r => { const f = flattenObj(r); return keys.map(k => `"${String(f[k] ?? '').replace(/"/g, '""')}"`).join(','); });
    const csv = [keys.join(','), ...rows].join('\n');
    downloadBlob(csv, `${selectedReport?.id || 'report'}.csv`, 'text/csv');
  };

  const exportExcel = () => {
    // Simulate Excel export (would use SheetJS in production)
    alert('Excel export triggered — install xlsx package for full functionality.\nCSV fallback available.');
    exportCSV();
  };

  const exportPDF = () => {
    // Simulate PDF export (would use jsPDF in production)
    alert('PDF export triggered — install jspdf + html2canvas for full functionality.\nCSV fallback available.');
    exportCSV();
  };

  const handleExport = () => {
    if (format === 'csv') exportCSV();
    else if (format === 'excel') exportExcel();
    else exportPDF();
  };

  const flattenObj = (obj, prefix = '') => {
    const result = {};
    for (const [k, v] of Object.entries(obj || {})) {
      const key = prefix ? `${prefix}_${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        Object.assign(result, flattenObj(v, key));
      } else {
        result[key] = v;
      }
    }
    return result;
  };

  const downloadBlob = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const getPreviewColumns = () => {
    if (!reportData?.length) return [];
    const flat = flattenObj(reportData[0]);
    return Object.keys(flat).filter(k => !['id', 'userId', 'user_id', 'createdAt', 'updatedAt'].includes(k)).slice(0, 8);
  };

  return (
    <div style={{ color: '#fff', display: 'flex', gap: '1.5rem', minHeight: 'calc(100vh - 140px)' }}>
      {/* ═══ SIDEBAR ═══ */}
      <div style={{ width: '260px', flexShrink: 0 }}>
        <div className="glass-card" style={{ padding: '1rem', position: 'sticky', top: '1rem' }}>
          <h3 style={{ fontSize: '0.75rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '8px' }}>Report Categories</h3>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setSelectedReport(null); setShowPreview(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px',
                  background: activeCategory === cat.id ? `${cat.color}10` : 'transparent',
                  border: 'none', borderRadius: '8px', color: activeCategory === cat.id ? cat.color : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', textAlign: 'left', marginBottom: '4px',
                  borderLeft: activeCategory === cat.id ? `3px solid ${cat.color}` : '3px solid transparent'
                }}
              >
                <Icon size={16} /> {cat.label}
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', opacity: 0.4 }}>{cat.reports.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ flex: 1 }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 className="gradient-text" style={{ margin: 0 }}>{currentCat?.label} Reports</h2>
            <p style={{ opacity: 0.5, fontSize: '0.8rem', marginTop: '4px' }}>{currentCat?.reports.length} reports available</p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="glass-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.65rem', opacity: 0.4, display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Date Range</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="date" className="form-input" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} style={{ padding: '6px 8px', fontSize: '0.8rem' }} />
              <span style={{ opacity: 0.3 }}>→</span>
              <input type="date" className="form-input" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} style={{ padding: '6px 8px', fontSize: '0.8rem' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {DATE_PRESETS.map(p => (
              <button key={p.label} onClick={() => setDateRange(p.getValue())} className="btn-outline" style={{ fontSize: '0.65rem', padding: '6px 10px' }}>
                {p.label}
              </button>
            ))}
          </div>

          <div>
            <label style={{ fontSize: '0.65rem', opacity: 0.4, display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Department</label>
            <select className="form-input" value={department} onChange={e => setDepartment(e.target.value)} style={{ padding: '6px 8px', fontSize: '0.8rem', minWidth: '140px' }}>
              <option value="">All</option>
              {['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'HR', 'Finance'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.65rem', opacity: 0.4, display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Format</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[{ id: 'pdf', label: 'PDF', icon: FileText }, { id: 'excel', label: 'Excel', icon: FileSpreadsheet }, { id: 'csv', label: 'CSV', icon: Table }].map(f => (
                <button key={f.id} onClick={() => setFormat(f.id)} style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer',
                  border: `1px solid ${format === f.id ? currentCat?.color + '40' : 'rgba(255,255,255,0.08)'}`,
                  background: format === f.id ? `${currentCat?.color}10` : 'rgba(255,255,255,0.03)',
                  color: format === f.id ? currentCat?.color : 'rgba(255,255,255,0.4)',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}><f.icon size={12} /> {f.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* REPORT CARDS */}
        {!showPreview && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
            {currentCat?.reports.map(report => (
              <div key={report.id} className="glass-card" onClick={() => generateReport(report)}
                style={{ padding: '1.5rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = currentCat.color + '30'; e.currentTarget.style.boxShadow = `0 0 20px ${currentCat.color}10`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${currentCat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart2 size={18} style={{ color: currentCat.color }} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{report.name}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.7rem', opacity: 0.4 }}>{report.desc}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', opacity: 0.3, textTransform: 'uppercase' }}>{format.toUpperCase()} Export</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: currentCat.color }}>
                    Generate <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
            <div className="cyber-loader" style={{ margin: '0 auto 1.5rem' }}></div>
            <p style={{ opacity: 0.5 }}>Generating report data...</p>
          </div>
        )}

        {/* ═══ PREVIEW ═══ */}
        {showPreview && !loading && reportData && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button className="btn-outline" onClick={() => { setShowPreview(false); setReportData(null); }} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>← Back</button>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{selectedReport?.name}</h3>
                <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>({reportData.length} records)</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-outline" onClick={() => window.print()} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Printer size={14} /> Print</button>
                <button className="btn-glow" onClick={handleExport} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Download size={14} /> Export {format.toUpperCase()}</button>
              </div>
            </div>

            {/* Report Header */}
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem', borderLeft: `3px solid ${currentCat?.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', color: currentCat?.color }}>PrimeCode Solutions</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', opacity: 0.5 }}>{selectedReport?.name} — Generated {new Date().toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.7rem', opacity: 0.4 }}>
                  {dateRange.start && `${dateRange.start} to ${dateRange.end}`}
                  {department && ` | ${department}`}
                </div>
              </div>
            </div>

            {/* DATA TABLE */}
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: `1px solid ${currentCat?.color}30`, background: `${currentCat?.color}08`, fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px', position: 'sticky', top: 0 }}>#</th>
                      {getPreviewColumns().map(col => (
                        <th key={col} style={{ padding: '12px 14px', textAlign: 'left', borderBottom: `1px solid ${currentCat?.color}30`, background: `${currentCat?.color}08`, fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px', position: 'sticky', top: 0, whiteSpace: 'nowrap' }}>
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.slice(0, 50).map((row, i) => {
                      const flat = flattenObj(row);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 14px', opacity: 0.4 }}>{i + 1}</td>
                          {getPreviewColumns().map(col => {
                            let val = flat[col];
                            if (typeof val === 'boolean') val = val ? '✓' : '✗';
                            if (val && typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) val = new Date(val).toLocaleDateString();
                            if (typeof val === 'number' && val > 100000) val = `₹${(val/100000).toFixed(1)}L`;
                            return <td key={col} style={{ padding: '10px 14px', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(val ?? '—')}</td>;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {reportData.length > 50 && <div style={{ padding: '12px', textAlign: 'center', opacity: 0.4, fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>Showing 50 of {reportData.length} records. Export for full data.</div>}
              {reportData.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.4 }}>No data found for the selected filters.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
