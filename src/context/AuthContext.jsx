import { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { hasPermission, hasRole } from '../config/permissions';
import { API_URL, SOCKET_URL } from '../config/api';

const AuthContext = createContext();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME_MS = 2 * 60 * 1000; // 2 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Session modal states
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningSeconds, setWarningSeconds] = useState(120);
  
  const socket = useRef(null);
  const activityTimer = useRef(null);
  const warningInterval = useRef(null);
  const refreshInterval = useRef(null);
  
  const isAuthenticated = !!user;

  // Track user activity
  const resetActivityTimer = useCallback(() => {
    if (!isAuthenticated) return;
    
    if (activityTimer.current) clearTimeout(activityTimer.current);
    if (warningInterval.current) clearInterval(warningInterval.current);
    
    setShowWarningModal(false);
    setWarningSeconds(120);

    activityTimer.current = setTimeout(() => {
      setShowWarningModal(true);
      
      warningInterval.current = setInterval(() => {
        setWarningSeconds(prev => {
          if (prev <= 1) {
            clearInterval(warningInterval.current);
            handleForceLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    }, SESSION_TIMEOUT_MS - WARNING_TIME_MS);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      window.addEventListener('mousemove', resetActivityTimer);
      window.addEventListener('keydown', resetActivityTimer);
      window.addEventListener('click', resetActivityTimer);
      resetActivityTimer();
    } else {
      if (activityTimer.current) clearTimeout(activityTimer.current);
      if (warningInterval.current) clearInterval(warningInterval.current);
      setShowWarningModal(false);
    }
    return () => {
      window.removeEventListener('mousemove', resetActivityTimer);
      window.removeEventListener('keydown', resetActivityTimer);
      window.removeEventListener('click', resetActivityTimer);
      if (activityTimer.current) clearTimeout(activityTimer.current);
      if (warningInterval.current) clearInterval(warningInterval.current);
    };
  }, [isAuthenticated, resetActivityTimer]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      checkAuth(token);
    } else {
      setLoading(false);
    }
  }, []);

  // Silent token refresh
  useEffect(() => {
    if (isAuthenticated) {
      // 7 hours = 7 * 60 * 60 * 1000 = 25200000 ms
      refreshInterval.current = setInterval(() => {
        refreshToken();
      }, 7 * 60 * 60 * 1000);
    }
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (user && !socket.current) {
      socket.current = io(SOCKET_URL);
      socket.current.emit('join_chat');
    }

    if (!user && socket.current) {
      socket.current.disconnect();
      socket.current = null;
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [user]);

  const checkAuth = async (token) => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data.user);
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, role) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password, role });
    const { token, refreshToken: rToken, user } = res.data;
    localStorage.setItem('token', token);
    if (rToken) localStorage.setItem('refreshToken', rToken);
    setUser(user);
    return user;
  };

  const refreshToken = async () => {
    try {
      const rToken = localStorage.getItem('refreshToken');
      if (!rToken) return;
      const res = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken: rToken });
      localStorage.setItem('token', res.data.accessToken);
    } catch (err) {
      console.error('Token refresh failed', err);
      handleForceLogout();
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const handleForceLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
    window.location.href = '/login';
  };

  // Permission helpers wrapped with current user
  const checkPermission = (permission) => hasPermission(user?.role, permission);
  const checkRole = (roles) => hasRole(user?.role, roles);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      loading, 
      login, 
      logout, 
      refreshToken,
      hasPermission: checkPermission,
      hasRole: checkRole,
      socket: socket.current 
    }}>
      {children}

      {/* Warning Modal */}
      {showWarningModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px' }}>
            <h3 style={{ color: '#ff3366', marginBottom: '1rem' }}>Session Expiring</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
              You will be automatically logged out due to inactivity in:
              <br/>
              <strong style={{ fontSize: '2rem', color: '#fff', display: 'block', marginTop: '1rem' }}>
                {formatTime(warningSeconds)}
              </strong>
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-outline" onClick={logout}>Logout</button>
              <button className="btn-glow" onClick={resetActivityTimer}>Stay Logged In</button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
