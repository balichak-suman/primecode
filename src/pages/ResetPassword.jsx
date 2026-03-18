import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import logoImg from '../assets/logo.png';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: p => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: p => /[A-Z]/.test(p) },
  { id: 'number', label: 'One number', test: p => /\d/.test(p) },
  { id: 'special', label: 'One special character (!@#$%)', test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

const getStrength = (p) => {
  if (!p) return { level: 0, label: '', color: '' };
  const passed = REQUIREMENTS.filter(r => r.test(p)).length;
  if (passed <= 1) return { level: 1, label: 'Weak', color: '#ff3366' };
  if (passed === 2) return { level: 2, label: 'Fair', color: '#FFD700' };
  if (passed === 3) return { level: 3, label: 'Strong', color: '#00D2FF' };
  return { level: 4, label: 'Very Strong', color: '#39FF14' };
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const resetToken = localStorage.getItem('reset_token') || '';
  const strength = getStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const allReqsMet = REQUIREMENTS.every(r => r.test(password));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allReqsMet || !passwordsMatch) return;
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { resetToken, newPassword: password });
      localStorage.removeItem('reset_email');
      localStorage.removeItem('reset_token');
      // Navigate with success state
      navigate('/login', { state: { toast: 'Password updated successfully! Please log in.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid"></div>
      <div className="login-glow glow-1"></div>
      <div className="login-glow glow-2"></div>

      <div className="login-card reveal">
        <div className="login-header">
          <img src={logoImg} alt="PrimeCode" className="login-logo" />
          <h1 className="login-title">New Password</h1>
          <p className="login-subtitle">Create a strong password for your account</p>
        </div>

        {error && <div style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '0.8rem', color: '#ff3366' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Password */}
          <div className="input-group">
            <input type={showPassword ? 'text' : 'password'} id="newPass" className="floating-input" value={password} onChange={e => setPassword(e.target.value)} placeholder=" " required />
            <label htmlFor="newPass" className="floating-label">New Password</label>
            <div className="input-glow"></div>
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.7rem'
            }}>{showPassword ? 'HIDE' : 'SHOW'}</button>
          </div>

          {/* Strength Meter */}
          {password && (
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                {[1, 2, 3, 4].map(l => (
                  <div key={l} style={{
                    flex: 1, height: '4px', borderRadius: '2px', transition: 'all 0.3s',
                    background: l <= strength.level ? strength.color : 'rgba(255,255,255,0.06)'
                  }} />
                ))}
              </div>
              <div style={{ fontSize: '0.7rem', color: strength.color, textAlign: 'right', fontWeight: 600 }}>{strength.label}</div>
            </div>
          )}

          {/* Confirm Password */}
          <div className="input-group" style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} id="confirmPass" className="floating-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder=" " required />
            <label htmlFor="confirmPass" className="floating-label">Confirm Password</label>
            <div className="input-glow"></div>
            {confirmPassword && (
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem' }}>
                {passwordsMatch ? <span style={{ color: '#39FF14' }}>✓ Match</span> : <span style={{ color: '#ff3366' }}>✗ No match</span>}
              </div>
            )}
          </div>

          {/* Requirements Checklist */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
            {REQUIREMENTS.map(req => {
              const met = req.test(password);
              return (
                <div key={req.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '0.75rem',
                  color: met ? '#00D2FF' : 'rgba(255,255,255,0.3)', transition: 'all 0.2s'
                }}>
                  <span style={{ fontSize: '0.7rem', width: '16px', textAlign: 'center' }}>{met ? '✓' : '✗'}</span>
                  {req.label}
                </div>
              );
            })}
          </div>

          <button type="submit" className="btn-glow login-btn" disabled={loading || !allReqsMet || !passwordsMatch} style={{ width: '100%' }}>
            {loading ? <span className="btn-loader"></span> : 'Reset Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textDecoration: 'none' }}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
