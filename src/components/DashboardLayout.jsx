import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import axios from 'axios';

import { API_URL } from '../config/api';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Close sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 768) setSidebarOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Icon placeholder SVGs
  const icons = {
    dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    attendance: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    leaves: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    payroll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    projects: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
    chat: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
    ai: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>,
    employees: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    announcements: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
    reports: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
    analytics: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    audit: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    performance: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
    briefcase: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
  };

  const getMenuLinks = () => {
    const role = user?.role || 'EMPLOYEE';
    const links = [
      { to: '/dashboard', label: 'Dashboard', icon: icons.dashboard, end: true },
      { to: '/dashboard/attendance', label: role === 'EMPLOYEE' ? 'My Attendance' : 'Attendance', icon: icons.attendance },
      { to: '/dashboard/leaves', label: role === 'EMPLOYEE' ? 'My Leaves' : 'Leaves', icon: icons.leaves },
      { to: '/dashboard/payroll', label: role === 'EMPLOYEE' ? 'My Payslip' : 'Payroll', icon: icons.payroll },
      { to: '/dashboard/performance', label: 'Performance', icon: icons.performance },
      { to: '/dashboard/projects', label: 'Projects', icon: icons.projects },
      { to: '/dashboard/chat', label: 'Chat', icon: icons.chat },
      { to: '/dashboard/documents', label: 'Documents', icon: icons.audit },
      { to: '/dashboard/ai', label: 'AI Assistant', icon: icons.ai },
    ];

    if (role === 'HR' || role === 'ADMIN') {
      links.push(
        { to: '/dashboard/employees', label: 'All Employees', icon: icons.employees },
        { to: '/dashboard/jobs', label: 'Job Postings', icon: icons.briefcase },
        { to: '/dashboard/announcements', label: 'Announcements', icon: icons.announcements },
        { to: '/dashboard/reports', label: 'Reports', icon: icons.reports }
      );
    }

    if (role === 'ADMIN') {
      links.push(
        { to: '/dashboard/analytics', label: 'Analytics', icon: icons.analytics },
        { to: '/dashboard/audit', label: 'Audit Logs', icon: icons.audit },
        { to: '/dashboard/leave-settings', label: 'Leave Policy', icon: icons.settings },
        { to: '/dashboard/settings', label: 'System Settings', icon: icons.settings }
      );
    }
    
    return links;
  };

  const menuLinks = getMenuLinks();

  // Fetch unreviewed application count for badge
  const [newAppCount, setNewAppCount] = useState(0);
  useEffect(() => {
    const role = user?.role;
    if (role === 'HR' || role === 'ADMIN') {
      const token = localStorage.getItem('token');
      if (token) {
        axios.get(`${API_URL}/careers/admin/applications?status=NEW`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => setNewAppCount(r.data?.total || 0)).catch(() => {});
      }
    }
  }, [user, location.pathname]);

  const getRoleBadgeStyle = () => {
    const role = user?.role;
    if (role === 'ADMIN') return { color: '#39FF14', background: 'rgba(57, 255, 20, 0.1)' };
    if (role === 'HR') return { color: '#7928CA', background: 'rgba(121, 40, 202, 0.1)' };
    return { color: '#00D2FF', background: 'rgba(0, 210, 255, 0.1)' };
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    const routeName = path.split('/').pop();
    return routeName.charAt(0).toUpperCase() + routeName.slice(1).replace('-', ' ');
  };

  return (
    <div className="dashboard-layout">
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#00D2FF' }}>PrimeCode</span> HRMS
          </h2>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {menuLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{link.icon}</span>
              <span className="sidebar-link-label">{link.label}</span>
              {link.to === '/dashboard/jobs' && newAppCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#ff3366', color: '#fff', fontSize: '0.6rem', fontWeight: 700, borderRadius: '10px', padding: '2px 6px', minWidth: '18px', textAlign: 'center' }}>{newAppCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        
        {/* Top Header */}
        <header className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Hamburger button — mobile only */}
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h1 className="dashboard-page-title">{getPageTitle()}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <NotificationBell userId={user?.id} />

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <div className="profile-dropdown-trigger" onClick={() => setDropdownOpen(!dropdownOpen)}>
                {user?.avatar ? (
                  <img src={user.avatar} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
                ) : (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                )}
                <div className="profile-info">
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{user?.name || 'User'}</span>
                  <span style={{ ...getRoleBadgeStyle(), fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', alignSelf: 'flex-start', fontWeight: 'bold' }}>
                    {user?.role}
                  </span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '200px',
                  background: 'rgba(10, 10, 10, 0.95)', border: '1px solid rgba(0, 210, 255, 0.3)',
                  borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden',
                  backdropFilter: 'blur(10px)', zIndex: 50
                }}>
                  <div style={{ padding: '0.5rem' }}>
                    <div className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/dashboard/profile'); }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      My Profile
                    </div>
                    <div className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/dashboard/settings'); }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                      Settings
                    </div>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }}></div>
                    <div className="dropdown-item" onClick={() => { setDropdownOpen(false); logout(); }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem', color: '#ff3366', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,51,102,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      Logout
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Outlet Area */}
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default DashboardLayout;
