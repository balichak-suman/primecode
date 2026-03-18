import React from 'react';
import { useAuth } from '../context/AuthContext';
import EmployeeDashboard from '../components/dashboards/EmployeeDashboard';
import HRDashboard from '../components/dashboards/HRDashboard';
import AdminDashboard from '../components/dashboards/AdminDashboard';

const DashboardHome = () => {
  const { user } = useAuth();
  
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'HR') return <HRDashboard />;
  
  return <EmployeeDashboard />;
};

export default DashboardHome;
