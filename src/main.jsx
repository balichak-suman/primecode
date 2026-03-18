import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'

import App from './App.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import VerifyOTP from './pages/VerifyOTP.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Careers from './pages/Careers.jsx'
import JobOpenings from './pages/JobOpenings.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import DashboardLayout from './components/DashboardLayout.jsx'

// Pages
import Analytics from './pages/Analytics.jsx'
import Attendance from './pages/Attendance.jsx'
import Chat from './pages/Chat.jsx'
import EmployeeManagement from './pages/EmployeeManagement.jsx'
import Leaves from './pages/Leaves.jsx'
import Payroll from './pages/Payroll.jsx'
import Projects from './pages/Projects.jsx'
import Settings from './pages/Settings.jsx'
import LeaveSettings from './pages/LeaveSettings.jsx'
import EmployeeProfile from './pages/EmployeeProfile.jsx'
import Performance from './pages/Performance.jsx'
import Announcements from './pages/Announcements.jsx'
import Notifications from './pages/Notifications.jsx'
import Documents from './pages/Documents.jsx'
import Reports from './pages/Reports.jsx'
import JobManagement from './pages/JobManagement.jsx'
import AIAssistant from './components/AIAssistant.jsx'

import DashboardHome from './pages/DashboardHome.jsx'

const Stub = ({ title }) => (
  <div style={{ padding: '2rem', color: '#fff' }}>
    <h2 className="gradient-text">{title}</h2>
    <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.6)' }}>This module is actively being developed.</p>
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/openings" element={<JobOpenings />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            
            {/* Dashboard Overview */}
            <Route index element={<DashboardHome />} />
            
            {/* Common Employee Routes */}
            <Route path="attendance" element={<Attendance />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="performance" element={<Performance />} />
            <Route path="projects" element={<Projects />} />
            <Route path="chat" element={<Chat />} />
            <Route path="ai" element={
              <div style={{ height: 'calc(100vh - 4rem)' }}><AIAssistant /></div>
            } />
            <Route path="documents" element={
              <Documents />
            } />

            {/* HR & ADMIN Routes */}
            <Route path="employees" element={
              <ProtectedRoute requiredRole={['HR', 'ADMIN']}>
                <EmployeeManagement />
              </ProtectedRoute>
            } />
            <Route path="employee/:id" element={
              <ProtectedRoute>
                <EmployeeProfile />
              </ProtectedRoute>
            } />
            <Route path="announcements" element={
              <Announcements />
            } />
            <Route path="notifications" element={
              <Notifications />
            } />
            <Route path="reports" element={
              <ProtectedRoute requiredRole={['HR', 'ADMIN']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="jobs" element={
              <ProtectedRoute requiredRole={['HR', 'ADMIN']}>
                <JobManagement />
              </ProtectedRoute>
            } />

            {/* ADMIN Only Routes */}
            <Route path="analytics" element={
              <ProtectedRoute requiredRole={['ADMIN']}>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="audit" element={
              <ProtectedRoute requiredRole={['ADMIN']}>
                <Stub title="System Audit Logs" />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute requiredRole={['ADMIN']}>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="leave-settings" element={
              <ProtectedRoute requiredRole={['ADMIN']}>
                <LeaveSettings />
              </ProtectedRoute>
            } />

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
