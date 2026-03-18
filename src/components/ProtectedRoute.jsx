import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, requiredRole = [], requiredPermission = null }) => {
  const { user, isAuthenticated, loading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderColor: '#00D2FF', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roleCheckPass = requiredRole.length === 0 || hasRole(requiredRole);
  const permCheckPass = !requiredPermission || hasPermission(requiredPermission);

  if (!roleCheckPass || !permCheckPass) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px', border: '1px solid rgba(255, 51, 102, 0.3)' }}>
          <div style={{ marginBottom: '1.5rem', color: '#00D2FF' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Access Denied</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>
            You don't have permission to view this page.
          </p>
          <div style={{ marginBottom: '2rem' }}>
            <span style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              padding: '4px 12px', 
              borderRadius: '20px', 
              fontSize: '0.8rem', 
              color: '#00D2FF',
              letterSpacing: '1px'
            }}>
              ROLE: {user?.role}
            </span>
          </div>
          <Link to="/dashboard" className="btn-glow" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export const CanDo = ({ permission, children }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return null;
  return children;
};

export default ProtectedRoute;
