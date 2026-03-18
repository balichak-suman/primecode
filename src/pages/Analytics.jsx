import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Users, TrendingUp, TrendingDown, Clock, DollarSign, Target, Award,
  Calendar, Filter, Download, BarChart2, PieChart as PieIcon, Activity,
  Briefcase, UserCheck, UserMinus, ChevronDown, X
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

import { API_URL } from '../config/api';

// ─── Custom Tooltip ───
const CyberTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px', padding: '10px 14px', backdropFilter: 'blur(10px)' }}>
      <p style={{ color: '#00D2FF', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#fff', fontSize: '0.7rem', margin: '2px 0' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── SIMULATED DATA ───
const genMonths = () => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MOCK = {
  kpis: {
    headcount: 847, headcountTrend: 3.2,
    attrition: 4.8, attritionTrend: -0.6,
    attendance: 94.2, attendanceTrend: 1.1,
    payroll: 12450000, payrollTrend: 2.4,
    openPositions: 23, openTrend: -5,
    avgRating: 4.1, ratingTrend: 0.3,
  },
  deptHeadcount: [
    { name: 'Engineering', count: 312 },
    { name: 'Product', count: 124 },
    { name: 'Design', count: 87 },
    { name: 'Marketing', count: 95 },
    { name: 'Sales', count: 108 },
    { name: 'HR', count: 45 },
    { name: 'Finance', count: 38 },
    { name: 'Operations', count: 38 },
  ],
  gender: [
    { name: 'Male', value: 498 },
    { name: 'Female', value: 312 },
    { name: 'Non-Binary', value: 37 },
  ],
  empType: [
    { name: 'Full-Time', value: 712 },
    { name: 'Part-Time', value: 68 },
    { name: 'Contract', value: 67 },
  ],
  ageDist: [
    { range: '18-25', count: 142 }, { range: '26-30', count: 234 },
    { range: '31-35', count: 198 }, { range: '36-40', count: 134 },
    { range: '41-50', count: 89 }, { range: '50+', count: 50 },
  ],
  tenure: [
    { range: '<1yr', count: 187 }, { range: '1-2yr', count: 213 },
    { range: '2-5yr', count: 267 }, { range: '5-10yr', count: 124 },
    { range: '10+yr', count: 56 },
  ],
  hiresExits: genMonths().map(m => ({ month: m, hires: Math.floor(Math.random()*20+8), exits: Math.floor(Math.random()*10+2) })),
  attendanceTrend: genMonths().map(m => ({ month: m, rate: Math.floor(Math.random()*6+90) })),
  deptAttendance: ['Engineering','Product','Design','Marketing','Sales','HR','Finance','Ops'].map(d => ({
    dept: d,
    mon: Math.floor(Math.random()*5+92), tue: Math.floor(Math.random()*5+93),
    wed: Math.floor(Math.random()*5+91), thu: Math.floor(Math.random()*5+94),
    fri: Math.floor(Math.random()*8+85),
  })),
  lateArrivals: [
    { dept: 'Engineering', count: 45 }, { dept: 'Sales', count: 38 },
    { dept: 'Marketing', count: 22 }, { dept: 'Design', count: 15 },
    { dept: 'Product', count: 18 }, { dept: 'HR', count: 8 },
  ],
  wfhRatio: genMonths().map(m => ({ month: m, office: Math.floor(Math.random()*15+55), wfh: Math.floor(Math.random()*15+25), hybrid: Math.floor(Math.random()*10+10) })),
  overtime: [
    { dept: 'Engineering', hours: 342 }, { dept: 'Product', hours: 187 },
    { dept: 'Sales', hours: 234 }, { dept: 'Design', hours: 98 },
    { dept: 'Marketing', hours: 156 }, { dept: 'Operations', hours: 201 },
  ],
  leaveUtil: [
    { type: 'Casual', used: 342, total: 500 }, { type: 'Sick', used: 187, total: 400 },
    { type: 'Earned', used: 89, total: 300 }, { type: 'Comp', used: 45, total: 100 },
  ],
  peakLeave: genMonths().map(m => ({ month: m, leaves: Math.floor(Math.random()*40+10) })),
  sickDays: [
    { dept: 'Engineering', avg: 3.2, benchmark: 4.0 },
    { dept: 'Sales', avg: 4.5, benchmark: 4.0 },
    { dept: 'Marketing', avg: 2.8, benchmark: 4.0 },
    { dept: 'Design', avg: 3.7, benchmark: 4.0 },
    { dept: 'Product', avg: 2.1, benchmark: 4.0 },
  ],
  payrollTrend: genMonths().map(m => ({ month: m, cost: Math.floor(Math.random()*2000000+11000000) })),
  deptPayroll: [
    { dept: 'Engineering', cost: 4200000 }, { dept: 'Product', cost: 1800000 },
    { dept: 'Sales', cost: 2100000 }, { dept: 'Marketing', cost: 1400000 },
    { dept: 'Design', cost: 1200000 }, { dept: 'HR', cost: 800000 },
    { dept: 'Finance', cost: 650000 }, { dept: 'Operations', cost: 300000 },
  ],
  salaryBand: [
    { grade: 'L1', min: 300000, avg: 450000, max: 600000 },
    { grade: 'L2', min: 500000, avg: 750000, max: 1000000 },
    { grade: 'L3', min: 800000, avg: 1200000, max: 1600000 },
    { grade: 'L4', min: 1200000, avg: 1800000, max: 2500000 },
    { grade: 'L5', min: 2000000, avg: 3000000, max: 4500000 },
  ],
  ratingDist: [
    { rating: '1.0-2.0', count: 12 }, { rating: '2.0-3.0', count: 45 },
    { rating: '3.0-3.5', count: 134 }, { rating: '3.5-4.0', count: 298 },
    { rating: '4.0-4.5', count: 245 }, { rating: '4.5-5.0', count: 113 },
  ],
  goalCompletion: [
    { quarter: 'Q1 2025', rate: 67 }, { quarter: 'Q2 2025', rate: 72 },
    { quarter: 'Q3 2025', rate: 81 }, { quarter: 'Q4 2025', rate: 78 },
    { quarter: 'Q1 2026', rate: 85 },
  ],
  topPerformers: [
    { name: 'Alice S.', dept: 'Engineering', rating: 4.9 },
    { name: 'Bob J.', dept: 'Product', rating: 4.8 },
    { name: 'Fiona G.', dept: 'Design', rating: 4.7 },
    { name: 'Diana P.', dept: 'Sales', rating: 4.7 },
    { name: 'Evan D.', dept: 'Marketing', rating: 4.6 },
  ],
};

const CYAN = '#00D2FF';
const PURPLE = '#7928CA';
const GREEN = '#39FF14';
const RED = '#ff3366';
const GOLD = '#FFD700';
const PIE_COLORS = [CYAN, PURPLE, GREEN, GOLD, RED, '#f472b6'];

const Analytics = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [deptFilter, setDeptFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const d = MOCK;

  const formatCurrency = (v) => {
    if (v >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`;
    return `₹${v.toLocaleString()}`;
  };

  // ─── KPI CARD ───
  const KPICard = ({ icon: Icon, label, value, trend, color, prefix = '', suffix = '' }) => (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Icon size={20} style={{ color, opacity: 0.7 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: trend >= 0 ? GREEN : RED }}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{prefix}{typeof value === 'number' && value > 99999 ? formatCurrency(value) : value}{suffix}</div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>{label}</div>
      </div>
    </div>
  );

  // ─── CHART WRAPPER ───
  const ChartCard = ({ title, children, span = 1, height = 350 }) => (
    <div className="glass-card" style={{ padding: '1.5rem', gridColumn: `span ${span}`, minHeight: `${height}px` }}>
      <h4 style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h4>
      <div style={{ width: '100%', height: `${height - 80}px` }}>
        {children}
      </div>
    </div>
  );

  // ─── SECTIONS ───
  const sections = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={16} /> },
    { id: 'workforce', label: 'Workforce', icon: <Users size={16} /> },
    { id: 'attendance', label: 'Attendance', icon: <Clock size={16} /> },
    { id: 'leave', label: 'Leave', icon: <Calendar size={16} /> },
    { id: 'payroll', label: 'Payroll', icon: <DollarSign size={16} /> },
    { id: 'performance', label: 'Performance', icon: <Award size={16} /> },
  ];

  return (
    <div style={{ color: '#fff' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="gradient-text" style={{ margin: 0 }}>Intelligence Hub</h2>
          <p style={{ margin: '4px 0 0', opacity: 0.5, fontSize: '0.85rem' }}>Enterprise analytics & data visualization</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-outline" onClick={() => setShowFilters(!showFilters)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <Filter size={14} /> Filters
          </button>
          <button className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* FILTERS BAR */}
      {showFilters && (
        <div className="glass-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', opacity: 0.5 }}>Department:</label>
            <select className="form-input" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ padding: '6px 10px', fontSize: '0.8rem', minWidth: '150px' }}>
              <option value="">All Departments</option>
              {['Engineering','Product','Design','Marketing','Sales','HR','Finance'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', opacity: 0.5 }}>Period:</label>
            <select className="form-input" style={{ padding: '6px 10px', fontSize: '0.8rem', minWidth: '120px' }}>
              <option>Last 12 months</option><option>Last 6 months</option><option>Last 3 months</option><option>YTD</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', opacity: 0.5 }}>Type:</label>
            <select className="form-input" style={{ padding: '6px 10px', fontSize: '0.8rem', minWidth: '120px' }}>
              <option>All Types</option><option>Full-Time</option><option>Part-Time</option><option>Contract</option>
            </select>
          </div>
          <button onClick={() => setShowFilters(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* NAV TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            style={{
              background: activeSection === s.id ? 'rgba(0,210,255,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${activeSection === s.id ? 'rgba(0,210,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: activeSection === s.id ? CYAN : 'rgba(255,255,255,0.5)',
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.3s'
            }}
          >{s.icon} {s.label}</button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {activeSection === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <KPICard icon={Users} label="Total Headcount" value={d.kpis.headcount} trend={d.kpis.headcountTrend} color={CYAN} />
            <KPICard icon={UserMinus} label="YTD Attrition" value={d.kpis.attrition} trend={d.kpis.attritionTrend} color={RED} suffix="%" />
            <KPICard icon={Clock} label="Avg Attendance" value={d.kpis.attendance} trend={d.kpis.attendanceTrend} color={GREEN} suffix="%" />
            <KPICard icon={DollarSign} label="Monthly Payroll" value={d.kpis.payroll} trend={d.kpis.payrollTrend} color={PURPLE} />
            <KPICard icon={Briefcase} label="Open Positions" value={d.kpis.openPositions} trend={d.kpis.openTrend} color={GOLD} />
            <KPICard icon={Award} label="Avg Performance" value={d.kpis.avgRating} trend={d.kpis.ratingTrend} color={CYAN} suffix="/5" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <ChartCard title="New Hires vs Exits (Monthly)">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.hiresExits}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                  <Tooltip content={<CyberTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar dataKey="hires" fill={CYAN} radius={[3,3,0,0]} name="Hires" />
                  <Line type="monotone" dataKey="exits" stroke={RED} strokeWidth={2} name="Exits" dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Employment Type">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.empType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {d.empType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<CyberTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ═══ WORKFORCE ═══ */}
      {activeSection === 'workforce' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <ChartCard title="Headcount by Department" span={2}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.deptHeadcount} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} width={100} />
                <Tooltip content={<CyberTooltip />} />
                <Bar dataKey="count" fill={CYAN} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Gender Diversity">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.gender} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                  {d.gender.map((_, i) => <Cell key={i} fill={[CYAN, PURPLE, GREEN][i]} />)}
                </Pie>
                <Tooltip content={<CyberTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Age Distribution">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.ageDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="range" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CyberTooltip />} />
                <Area type="monotone" dataKey="count" stroke={PURPLE} fill={PURPLE} fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Employee Tenure">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.tenure}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="range" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CyberTooltip />} />
                <Bar dataKey="count" fill={GREEN} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Hires vs Exits Trend">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.hiresExits}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CyberTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                <Bar dataKey="hires" fill={CYAN} name="New Hires" radius={[3,3,0,0]} />
                <Line type="monotone" dataKey="exits" stroke={RED} strokeWidth={2} name="Exits" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ═══ ATTENDANCE ═══ */}
      {activeSection === 'attendance' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <ChartCard title="Monthly Attendance Rate %" span={2}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <YAxis domain={[80, 100]} stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CyberTooltip />} />
                <Line type="monotone" dataKey="rate" stroke={GREEN} strokeWidth={3} dot={{ fill: GREEN, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Department Attendance Heatmap">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr>{['Dept','Mon','Tue','Wed','Thu','Fri'].map(h => <th key={h} style={{ padding: '8px', textAlign: 'center', opacity: 0.5, fontWeight: 400 }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {d.deptAttendance.map(row => (
                    <tr key={row.dept}>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>{row.dept}</td>
                      {['mon','tue','wed','thu','fri'].map(day => {
                        const v = row[day];
                        const intensity = Math.min(1, Math.max(0, (v - 85) / 15));
                        return <td key={day} style={{ padding: '6px', textAlign: 'center', background: `rgba(0,210,255,${intensity * 0.4})`, borderRadius: '4px', color: v >= 95 ? GREEN : v >= 90 ? CYAN : RED }}>{v}%</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard title="Late Arrivals by Department">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.lateArrivals}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="dept" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CyberTooltip />} />
                <Bar dataKey="count" fill={RED} radius={[4,4,0,0]} name="Late Count" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="WFH vs Office vs Hybrid" span={2}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.wfhRatio}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CyberTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                <Area type="monotone" dataKey="office" stroke={CYAN} fill={CYAN} fillOpacity={0.3} stackId="1" name="Office" />
                <Area type="monotone" dataKey="wfh" stroke={PURPLE} fill={PURPLE} fillOpacity={0.3} stackId="1" name="WFH" />
                <Area type="monotone" dataKey="hybrid" stroke={GREEN} fill={GREEN} fillOpacity={0.3} stackId="1" name="Hybrid" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Overtime Hours by Department" span={2}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.overtime} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="dept" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} width={100} />
                <Tooltip content={<CyberTooltip />} />
                <Bar dataKey="hours" fill={GOLD} radius={[0,4,4,0]} name="OT Hours" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ═══ LEAVE ═══ */}
      {activeSection === 'leave' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <ChartCard title="Leave Utilization by Type" span={2}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.leaveUtil}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="type" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CyberTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                <Bar dataKey="used" fill={CYAN} name="Used" radius={[3,3,0,0]} />
                <Bar dataKey="total" fill="rgba(255,255,255,0.1)" name="Total Quota" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Peak Leave Periods">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.peakLeave}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CyberTooltip />} />
                <Area type="monotone" dataKey="leaves" stroke={PURPLE} fill={PURPLE} fillOpacity={0.4} name="Leave Count" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Avg Sick Days vs Benchmark">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.sickDays}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="dept" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CyberTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                <Bar dataKey="avg" fill={RED} name="Avg Sick Days" radius={[3,3,0,0]} />
                <Line type="monotone" dataKey="benchmark" stroke={GREEN} strokeWidth={2} strokeDasharray="5 5" name="Benchmark" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Leave Balance Alerts" span={2} height={280}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { type: 'Earned Leave', expiring: 34, employees: 12, color: PURPLE },
                { type: 'Compensatory', expiring: 18, employees: 8, color: GREEN },
                { type: 'Casual Leave', expiring: 67, employees: 23, color: CYAN },
              ].map(a => (
                <div key={a.type} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${a.color}30`, borderRadius: '10px', padding: '1.2rem' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '8px' }}>{a.type}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: a.color }}>{a.expiring} days</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '4px' }}>expiring for {a.employees} employees</div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}

      {/* ═══ PAYROLL ═══ */}
      {activeSection === 'payroll' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <ChartCard title="Monthly Payroll Cost Trend" span={2}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.payrollTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} tickFormatter={v => formatCurrency(v)} />
                <Tooltip content={<CyberTooltip />} />
                <Area type="monotone" dataKey="cost" stroke={CYAN} fill={CYAN} fillOpacity={0.2} strokeWidth={2} name="Total Cost" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Department-wise Payroll">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.deptPayroll} dataKey="cost" nameKey="dept" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3}>
                  {d.deptPayroll.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CyberTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Salary Band Analysis by Grade">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.salaryBand}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="grade" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} tickFormatter={v => formatCurrency(v)} />
                <Tooltip content={<CyberTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                <Bar dataKey="min" fill="rgba(0,210,255,0.2)" name="Min" radius={[3,3,0,0]} />
                <Bar dataKey="avg" fill={CYAN} name="Avg" radius={[3,3,0,0]} />
                <Bar dataKey="max" fill={PURPLE} name="Max" radius={[3,3,0,0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="YTD Spend vs Budget" span={2} height={280}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {[
                { label: 'YTD Spend', value: '₹14.2 Cr', sub: 'Jan - Mar 2026', color: CYAN },
                { label: 'Annual Budget', value: '₹52.8 Cr', sub: 'FY 2025-26', color: PURPLE },
                { label: 'Utilization', value: '26.9%', sub: 'On track', color: GREEN },
              ].map(c => (
                <div key={c.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', border: `1px solid ${c.color}20` }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>{c.label}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: c.color, margin: '10px 0' }}>{c.value}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.4 }}>{c.sub}</div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}

      {/* ═══ PERFORMANCE ═══ */}
      {activeSection === 'performance' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <ChartCard title="Rating Distribution (Bell Curve)" span={2}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.ratingDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="rating" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CyberTooltip />} />
                <Area type="monotone" dataKey="count" stroke={CYAN} fill={CYAN} fillOpacity={0.3} strokeWidth={2} name="Employees" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Performers">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {d.topPerformers.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `3px solid ${i === 0 ? GOLD : i === 1 ? '#C0C0C0' : CYAN}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,210,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: CYAN }}>
                      #{i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.4 }}>{p.dept}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: GOLD, fontSize: '1.1rem' }}>{p.rating}</div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Goal Completion Rate by Quarter">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.goalCompletion}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="quarter" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} />
                <YAxis domain={[50, 100]} stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CyberTooltip />} />
                <Line type="monotone" dataKey="rate" stroke={GREEN} strokeWidth={3} dot={{ fill: GREEN, r: 5 }} name="Completion %" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
};

export default Analytics;
