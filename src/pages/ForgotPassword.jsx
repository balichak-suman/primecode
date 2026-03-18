import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import logoImg from '../assets/logo.png';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(45);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setSent(true);
      startCountdown();
      localStorage.setItem('reset_email', email);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      startCountdown();
    } catch (err) {
      setError('Failed to resend OTP');
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
          <h1 className="login-title">Reset Password</h1>
          <p className="login-subtitle">Enter your email to receive a verification code</p>
        </div>

        {error && <div style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '0.8rem', color: '#ff3366' }}>{error}</div>}

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input type="email" id="email" className="floating-input" value={email} onChange={e => setEmail(e.target.value)} placeholder=" " required />
              <label htmlFor="email" className="floating-label">Email Address</label>
              <div className="input-glow"></div>
            </div>
            <button type="submit" className="btn-glow login-btn" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
              {loading ? <span className="btn-loader"></span> : 'Send OTP'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem' }}>✓</div>
            <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>OTP sent to</p>
            <p style={{ color: '#00D2FF', fontWeight: 600, fontSize: '0.95rem', marginBottom: '1.5rem' }}>{email}</p>
            <button className="btn-glow login-btn" onClick={() => navigate('/verify-otp')} style={{ width: '100%', marginBottom: '1rem' }}>
              Enter OTP →
            </button>
            <button onClick={handleResend} disabled={countdown > 0} style={{ background: 'none', border: 'none', color: countdown > 0 ? 'rgba(255,255,255,0.3)' : '#00D2FF', cursor: countdown > 0 ? 'default' : 'pointer', fontSize: '0.8rem' }}>
              {countdown > 0 ? `Resend in 0:${countdown.toString().padStart(2, '0')}` : 'Resend OTP'}
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
