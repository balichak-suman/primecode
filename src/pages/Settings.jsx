import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon, Building2, Clock, Calendar, Shield, Bell, Zap,
  Plus, Trash2, Save, Play, X, AlertTriangle, Users, FileText, Database,
  ChevronRight, Check, ToggleLeft, ToggleRight, RefreshCw
} from 'lucide-react';

import { API_URL } from '../config/api';

const TABS = [
  { id: 'company', label: 'Company Profile', icon: Building2 },
  { id: 'working', label: 'Working Hours', icon: Clock },
  { id: 'holidays', label: 'Holiday Calendar', icon: Calendar },
  { id: 'leave', label: 'Leave Policies', icon: FileText },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'alerts', label: 'Alert Rules', icon: AlertTriangle },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield },
  { id: 'backup', label: 'System & Backup', icon: Database },
];

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // State for each section
  const [company, setCompany] = useState({});
  const [workSettings, setWorkSettings] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [automation, setAutomation] = useState({});
  const [alertRules, setAlertRules] = useState({});
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'PUBLIC', description: '' });
  const [newPolicy, setNewPolicy] = useState({ grade: '', leaveType: 'CASUAL', annualQuota: 0, maxCarryForward: 0, isEncashable: false });
  const [runningJob, setRunningJob] = useState(null);

  const token = () => localStorage.getItem('token');
  const config = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  useEffect(() => {
    loadCompany(); loadWorkSettings(); loadHolidays(); loadLeavePolicies(); loadAutomation(); loadAlerts();
  }, []);

  const loadCompany = async () => { try { const r = await axios.get(`${API_URL}/admin/settings/company`, config()); setCompany(r.data); } catch (e) {} };
  const loadWorkSettings = async () => { try { const r = await axios.get(`${API_URL}/admin/settings`, config()); setWorkSettings(r.data); } catch (e) {} };
  const loadHolidays = async () => { try { const r = await axios.get(`${API_URL}/admin/settings/holidays`, config()); setHolidays(Array.isArray(r.data) ? r.data : []); } catch (e) {} };
  const loadLeavePolicies = async () => { try { const r = await axios.get(`${API_URL}/admin/settings/leave-policies`, config()); setLeavePolicies(Array.isArray(r.data) ? r.data : []); } catch (e) {} };
  const loadAutomation = async () => { try { const r = await axios.get(`${API_URL}/admin/settings/automation`, config()); setAutomation(r.data); } catch (e) {} };
  const loadAlerts = async () => { try { const r = await axios.get(`${API_URL}/admin/settings/alerts`, config()); setAlertRules(r.data); } catch (e) {} };

  const saveWithFeedback = async (fn) => {
    setSaving(true); await fn(); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const saveWorkSettings = () => saveWithFeedback(async () => {
    await axios.put(`${API_URL}/admin/settings`, workSettings, config());
  });

  const saveAutomation = () => saveWithFeedback(async () => {
    await axios.put(`${API_URL}/admin/settings/automation`, automation, config());
  });

  const saveAlerts = () => saveWithFeedback(async () => {
    await axios.put(`${API_URL}/admin/settings/alerts`, alertRules, config());
  });

  const addHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) return;
    await axios.post(`${API_URL}/admin/settings/holidays`, newHoliday, config());
    setNewHoliday({ name: '', date: '', type: 'PUBLIC', description: '' });
    loadHolidays();
  };

  const deleteHoliday = async (id) => {
    await axios.delete(`${API_URL}/admin/settings/holidays/${id}`, config());
    loadHolidays();
  };

  const addLeavePolicy = async () => {
    if (!newPolicy.grade || !newPolicy.leaveType) return;
    await axios.post(`${API_URL}/admin/settings/leave-policies`, newPolicy, config());
    setNewPolicy({ grade: '', leaveType: 'CASUAL', annualQuota: 0, maxCarryForward: 0, isEncashable: false });
    loadLeavePolicies();
  };

  const deletePolicy = async (id) => {
    await axios.delete(`${API_URL}/admin/settings/leave-policies/${id}`, config());
    loadLeavePolicies();
  };

  const triggerJob = async (jobName) => {
    setRunningJob(jobName);
    try {
      await axios.post(`${API_URL}/admin/settings/automation/run/${jobName}`, {}, config());
      alert(`Job "${jobName}" executed successfully!`);
    } catch (e) { alert('Job failed'); }
    finally { setRunningJob(null); }
  };

  const Toggle = ({ value, onChange, label }) => (
    <div onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
      <span style={{ fontSize: '0.85rem' }}>{label}</span>
      {value ? <ToggleRight size={22} style={{ color: '#39FF14' }} /> : <ToggleLeft size={22} style={{ color: 'rgba(255,255,255,0.2)' }} />}
    </div>
  );

  const SaveBtn = ({ onClick }) => (
    <button className="btn-glow" onClick={onClick} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1.5rem' }}>
      {saving ? <RefreshCw size={14} className="spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
      {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
    </button>
  );

  return (
    <div style={{ color: '#fff', display: 'flex', gap: '1.5rem', minHeight: 'calc(100vh - 140px)' }}>
      {/* SIDEBAR */}
      <div style={{ width: '240px', flexShrink: 0 }}>
        <div className="glass-card" style={{ padding: '1rem', position: 'sticky', top: '1rem' }}>
          <h3 style={{ fontSize: '0.7rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '8px' }}>System Configuration</h3>
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px',
                background: activeTab === tab.id ? 'rgba(0,210,255,0.08)' : 'transparent',
                border: 'none', borderRadius: '8px', color: activeTab === tab.id ? '#00D2FF' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.2s', textAlign: 'left', marginBottom: '4px',
                borderLeft: activeTab === tab.id ? '3px solid #00D2FF' : '3px solid transparent'
              }}>
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, maxWidth: '720px' }}>
        {/* ═══ COMPANY PROFILE ═══ */}
        {activeTab === 'company' && (
          <Section title="Company Profile" icon={Building2}>
            {Object.entries(company).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
              </div>
            ))}
          </Section>
        )}

        {/* ═══ WORKING HOURS ═══ */}
        {activeTab === 'working' && (
          <Section title="Working Hours Configuration" icon={Clock}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <Field label="Office Start Time" value={workSettings.officeStartTime || ''} onChange={v => setWorkSettings({ ...workSettings, officeStartTime: v })} type="time" />
              <Field label="Office End Time" value={workSettings.officeEndTime || ''} onChange={v => setWorkSettings({ ...workSettings, officeEndTime: v })} type="time" />
              <Field label="Grace Period (minutes)" value={workSettings.gracePeriodMinutes || 0} onChange={v => setWorkSettings({ ...workSettings, gracePeriodMinutes: v })} type="number" />
              <Field label="Max WFH Days/Week" value={workSettings.maxWfhDays || 0} onChange={v => setWorkSettings({ ...workSettings, maxWfhDays: v })} type="number" />
            </div>
            <SaveBtn onClick={saveWorkSettings} />
          </Section>
        )}

        {/* ═══ HOLIDAY CALENDAR ═══ */}
        {activeTab === 'holidays' && (
          <Section title="Holiday Calendar" icon={Calendar}>
            {/* Add form */}
            <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(0,210,255,0.1)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                <input className="form-input" placeholder="Holiday Name" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} style={{ fontSize: '0.8rem' }} />
                <input type="date" className="form-input" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} style={{ fontSize: '0.8rem' }} />
                <select className="form-input" value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })} style={{ fontSize: '0.8rem' }}>
                  <option value="PUBLIC">Public</option><option value="RESTRICTED">Restricted</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="form-input" placeholder="Description (optional)" value={newHoliday.description} onChange={e => setNewHoliday({ ...newHoliday, description: e.target.value })} style={{ flex: 1, fontSize: '0.8rem' }} />
                <button className="btn-glow" onClick={addHoliday} style={{ fontSize: '0.75rem', padding: '6px 14px' }}><Plus size={14} /> Add</button>
              </div>
            </div>

            {/* List */}
            {holidays.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: h.type === 'PUBLIC' ? 'rgba(0,210,255,0.1)' : 'rgba(121,40,202,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={16} style={{ color: h.type === 'PUBLIC' ? '#00D2FF' : '#7928CA' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{h.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', background: h.type === 'PUBLIC' ? 'rgba(0,210,255,0.1)' : 'rgba(121,40,202,0.1)', color: h.type === 'PUBLIC' ? '#00D2FF' : '#7928CA' }}>{h.type}</span>
                  <button onClick={() => deleteHoliday(h.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {holidays.length === 0 && <p style={{ opacity: 0.4, textAlign: 'center', padding: '2rem' }}>No holidays configured.</p>}
          </Section>
        )}

        {/* ═══ LEAVE POLICIES ═══ */}
        {activeTab === 'leave' && (
          <Section title="Leave Policy Editor" icon={FileText}>
            <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(0,210,255,0.1)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                <input className="form-input" placeholder="Grade (A/B/C)" value={newPolicy.grade} onChange={e => setNewPolicy({ ...newPolicy, grade: e.target.value })} style={{ fontSize: '0.8rem' }} />
                <select className="form-input" value={newPolicy.leaveType} onChange={e => setNewPolicy({ ...newPolicy, leaveType: e.target.value })} style={{ fontSize: '0.8rem' }}>
                  <option value="CASUAL">Casual</option><option value="SICK">Sick</option><option value="EARNED">Earned</option>
                  <option value="MATERNITY">Maternity</option><option value="PATERNITY">Paternity</option>
                </select>
                <input type="number" className="form-input" placeholder="Annual Quota" value={newPolicy.annualQuota} onChange={e => setNewPolicy({ ...newPolicy, annualQuota: e.target.value })} style={{ fontSize: '0.8rem' }} />
                <input type="number" className="form-input" placeholder="Max Carry Fwd" value={newPolicy.maxCarryForward} onChange={e => setNewPolicy({ ...newPolicy, maxCarryForward: e.target.value })} style={{ fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newPolicy.isEncashable} onChange={e => setNewPolicy({ ...newPolicy, isEncashable: e.target.checked })} style={{ accentColor: '#00D2FF' }} /> Encashable
                </label>
                <button className="btn-glow" onClick={addLeavePolicy} style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '6px 14px' }}><Plus size={14} /> Add Policy</button>
              </div>
            </div>

            {/* Table */}
            {leavePolicies.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>{['Grade', 'Leave Type', 'Annual Quota', 'Max Carry Fwd', 'Encashable', ''].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid rgba(0,210,255,0.1)', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {leavePolicies.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.grade}</td>
                        <td style={{ padding: '10px 12px' }}>{p.leaveType}</td>
                        <td style={{ padding: '10px 12px' }}>{p.annualQuota} days</td>
                        <td style={{ padding: '10px 12px' }}>{p.maxCarryForward} days</td>
                        <td style={{ padding: '10px 12px' }}>{p.isEncashable ? <Check size={14} style={{ color: '#39FF14' }} /> : '—'}</td>
                        <td style={{ padding: '10px 12px' }}><button onClick={() => deletePolicy(p.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}

        {/* ═══ AUTOMATION ═══ */}
        {activeTab === 'automation' && (
          <Section title="Workflow Automation" icon={Zap}>
            <p style={{ fontSize: '0.75rem', opacity: 0.4, marginBottom: '1.5rem' }}>Enable or disable automated cron jobs. Changes take effect immediately.</p>

            <h4 style={{ fontSize: '0.7rem', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Daily Jobs (Midnight)</h4>
            <Toggle label="Auto-mark absent (no punch = ABSENT)" value={automation.dailyAbsentMarking} onChange={v => setAutomation({ ...automation, dailyAbsentMarking: v })} />
            <Toggle label="Attendance summary to HR" value={automation.dailyAttendanceSummary} onChange={v => setAutomation({ ...automation, dailyAttendanceSummary: v })} />
            <Toggle label="Birthday announcements & notifications" value={automation.dailyBirthdayNotify} onChange={v => setAutomation({ ...automation, dailyBirthdayNotify: v })} />
            <Toggle label="Work anniversary notifications" value={automation.dailyAnniversaryNotify} onChange={v => setAutomation({ ...automation, dailyAnniversaryNotify: v })} />
            <Toggle label="Probation end date alerts (7 days advance)" value={automation.dailyProbationCheck} onChange={v => setAutomation({ ...automation, dailyProbationCheck: v })} />

            <h4 style={{ fontSize: '0.7rem', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '1px', margin: '1.5rem 0 0.5rem' }}>Weekly Jobs (Monday 9 AM)</h4>
            <Toggle label="Attendance summary to employees" value={automation.weeklyAttendanceSummary} onChange={v => setAutomation({ ...automation, weeklyAttendanceSummary: v })} />
            <Toggle label="Pending approvals reminder to HR" value={automation.weeklyPendingReminder} onChange={v => setAutomation({ ...automation, weeklyPendingReminder: v })} />

            <h4 style={{ fontSize: '0.7rem', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '1px', margin: '1.5rem 0 0.5rem' }}>Monthly Jobs (1st of Month)</h4>
            <Toggle label="Reset monthly leave counters" value={automation.monthlyLeaveReset} onChange={v => setAutomation({ ...automation, monthlyLeaveReset: v })} />
            <Toggle label="Generate payroll draft" value={automation.monthlyPayrollDraft} onChange={v => setAutomation({ ...automation, monthlyPayrollDraft: v })} />
            <Toggle label="Leave balance summary to employees" value={automation.monthlyLeaveBalanceSummary} onChange={v => setAutomation({ ...automation, monthlyLeaveBalanceSummary: v })} />
            <Toggle label="Archive notifications older than 90 days" value={automation.monthlyArchiveNotifications} onChange={v => setAutomation({ ...automation, monthlyArchiveNotifications: v })} />

            <SaveBtn onClick={saveAutomation} />

            {/* Manual Triggers */}
            <h4 style={{ fontSize: '0.7rem', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '1px', margin: '2rem 0 1rem' }}>Manual Triggers</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px' }}>
              {[
                { id: 'markAbsent', label: 'Mark Absent' }, { id: 'birthdays', label: 'Birthday Check' },
                { id: 'anniversaries', label: 'Anniversary Check' }, { id: 'probation', label: 'Probation Check' },
                { id: 'pendingReminders', label: 'Pending Reminders' }, { id: 'archiveNotifications', label: 'Archive Old Notifs' },
                { id: 'leaveBalanceSummary', label: 'Leave Balance Email' }, { id: 'lowLeaveBalance', label: 'Low Balance Alert' },
              ].map(job => (
                <button key={job.id} className="btn-outline" onClick={() => triggerJob(job.id)} disabled={runningJob === job.id}
                  style={{ fontSize: '0.7rem', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                  {runningJob === job.id ? <RefreshCw size={12} className="spin" /> : <Play size={12} />} {job.label}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* ═══ ALERT RULES ═══ */}
        {activeTab === 'alerts' && (
          <Section title="Alert Rules" icon={AlertTriangle}>
            <p style={{ fontSize: '0.75rem', opacity: 0.4, marginBottom: '1.5rem' }}>Configure thresholds for automated alerts. Alerts are checked every 6 hours.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <AlertField label="Attendance below threshold → alert HR" value={alertRules.attendanceThreshold} unit="%" onChange={v => setAlertRules({ ...alertRules, attendanceThreshold: parseInt(v) })} desc="Employee with attendance rate below this % in a month" />
              <AlertField label="Leave balance low → alert employee" value={alertRules.leaveBalanceAlert} unit="days" onChange={v => setAlertRules({ ...alertRules, leaveBalanceAlert: parseInt(v) })} desc="Alert when any leave type balance falls below" />
              <AlertField label="Overtime exceeds limit → alert HR" value={alertRules.overtimeAlertHours} unit="hrs/week" onChange={v => setAlertRules({ ...alertRules, overtimeAlertHours: parseInt(v) })} desc="Flag employees working excessive overtime" />
              <AlertField label="Document expiry approaching → alert HR" value={alertRules.documentExpiryDays} unit="days before" onChange={v => setAlertRules({ ...alertRules, documentExpiryDays: parseInt(v) })} desc="Check ID proofs, contracts nearing expiry" />
              <AlertField label="Probation ending → alert HR + Manager" value={alertRules.probationAlertDays} unit="days before" onChange={v => setAlertRules({ ...alertRules, probationAlertDays: parseInt(v) })} desc="Advance notice for probation end reviews" />
            </div>
            <SaveBtn onClick={saveAlerts} />
          </Section>
        )}

        {/* ═══ ROLES & PERMISSIONS ═══ */}
        {activeTab === 'roles' && (
          <Section title="Roles & Permissions Matrix" icon={Shield}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Module</th>
                    <th style={thStyle}>ADMIN</th>
                    <th style={thStyle}>HR</th>
                    <th style={thStyle}>EMPLOYEE</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Dashboard', 'Full', 'Full', 'Own Data'],
                    ['Attendance', 'CRUD All', 'CRUD All', 'View Own + Clock'],
                    ['Leaves', 'CRUD + Approve', 'CRUD + Approve', 'Apply + View Own'],
                    ['Payroll', 'Full CRUD', 'View + Process', 'View Own Payslip'],
                    ['Performance', 'Full CRUD', 'Review + Rate', 'Self Assessment'],
                    ['Employees', 'Full CRUD', 'Full CRUD', 'No Access'],
                    ['Announcements', 'Create + Manage', 'Create + Manage', 'Read Only'],
                    ['Reports', 'All Reports', 'All Reports', 'No Access'],
                    ['Analytics', 'Full Access', 'No Access', 'No Access'],
                    ['Documents', 'All + Request', 'All + Request', 'Own Documents'],
                    ['Settings', 'Full Access', 'Read Only', 'No Access'],
                    ['Audit Logs', 'Full Access', 'No Access', 'No Access'],
                  ].map(([mod, admin, hr, emp]) => (
                    <tr key={mod} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{mod}</td>
                      <td style={{ padding: '10px 12px', color: '#39FF14' }}>{admin}</td>
                      <td style={{ padding: '10px 12px', color: '#7928CA' }}>{hr}</td>
                      <td style={{ padding: '10px 12px', color: '#00D2FF' }}>{emp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ═══ SYSTEM & BACKUP ═══ */}
        {activeTab === 'backup' && (
          <Section title="System & Backup" icon={Database}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Database', value: 'PostgreSQL (Render)', color: '#39FF14' },
                { label: 'ORM', value: 'Prisma v6.19', color: '#7928CA' },
                { label: 'Server', value: 'Node.js + Express', color: '#00D2FF' },
                { label: 'Frontend', value: 'React + Vite', color: '#FFD700' },
                { label: 'Real-time', value: 'Socket.io', color: '#f472b6' },
                { label: 'Auth', value: 'JWT + bcrypt', color: '#ff8800' },
              ].map(s => (
                <div key={s.label} className="glass-card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button className="btn-outline" onClick={() => alert('Database backup initiated...')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Database size={14} /> Backup Database</button>
              <button className="btn-outline" onClick={() => alert('Cache cleared!')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={14} /> Clear Cache</button>
            </div>
          </Section>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

// ─── Helper Components ───
const Section = ({ title, icon: Icon, children }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
      <Icon size={20} style={{ color: '#00D2FF' }} />
      <h2 className="gradient-text" style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h2>
    </div>
    <div className="glass-card" style={{ padding: '1.5rem' }}>{children}</div>
  </div>
);

const Field = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label style={{ fontSize: '0.65rem', opacity: 0.4, display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
    <input className="form-input" type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', fontSize: '0.85rem' }} />
  </div>
);

const AlertField = ({ label, value, unit, onChange, desc }) => (
  <div>
    <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '8px' }}>{desc}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input type="number" className="form-input" value={value} onChange={e => onChange(e.target.value)} style={{ width: '80px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600 }} />
      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{unit}</span>
    </div>
  </div>
);

const thStyle = { padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid rgba(0,210,255,0.1)', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase' };

export default Settings;
