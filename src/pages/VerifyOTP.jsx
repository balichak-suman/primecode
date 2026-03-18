import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import logoImg from '../assets/logo.png';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);
  const email = localStorage.getItem('reset_email') || '';

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp: code });
      localStorage.setItem('reset_token', res.data.resetToken);
      navigate('/reset-password');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setCountdown(45);
      const timer = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
      }, 1000);
      setError('');
      setOtp(['', '', '', '', '', '']);
    } catch (err) { setError('Failed to resend'); }
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid"></div>
      <div className="login-glow glow-1"></div>
      <div className="login-glow glow-2"></div>

      <div className="login-card reveal">
        <div className="login-header">
          <img src={logoImg} alt="PrimeCode" className="login-logo" />
          <h1 className="login-title">Verify OTP</h1>
          <p className="login-subtitle">Enter the 6-digit code sent to <span style={{ color: '#00D2FF' }}>{email || 'your email'}</span></p>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '0.8rem', color: '#ff3366', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '2rem', animation: shake ? 'otpShake 0.5s ease-in-out' : 'none' }}>
            {otp.map((digit, i) => (
              <input key={i} ref={el => inputRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1}
                value={digit} onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} onPaste={i === 0 ? handlePaste : undefined}
                style={{
                  width: '48px', height: '56px', textAlign: 'center', fontSize: '1.4rem', fontWeight: 700,
                  background: 'rgba(255,255,255,0.03)', border: `2px solid ${digit ? 'rgba(0,210,255,0.4)' : error ? 'rgba(255,51,102,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '12px', color: '#fff', outline: 'none', transition: 'all 0.2s',
                  boxShadow: digit ? '0 0 15px rgba(0,210,255,0.15)' : error ? '0 0 15px rgba(255,51,102,0.15)' : 'none'
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(0,210,255,0.6)'; e.target.style.boxShadow = '0 0 20px rgba(0,210,255,0.2)'; }}
                onBlur={e => { e.target.style.borderColor = digit ? 'rgba(0,210,255,0.4)' : 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = digit ? '0 0 15px rgba(0,210,255,0.15)' : 'none'; }}
              />
            ))}
          </div>

          <button type="submit" className="btn-glow login-btn" disabled={loading || otp.join('').length !== 6} style={{ width: '100%' }}>
            {loading ? <span className="btn-loader"></span> : 'Verify OTP'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button onClick={handleResend} disabled={countdown > 0} style={{ background: 'none', border: 'none', color: countdown > 0 ? 'rgba(255,255,255,0.3)' : '#00D2FF', cursor: countdown > 0 ? 'default' : 'pointer', fontSize: '0.8rem' }}>
            {countdown > 0 ? `Resend in 0:${countdown.toString().padStart(2, '0')}` : 'Resend Code'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/forgot-password" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textDecoration: 'none' }}>← Back</Link>
        </div>
      </div>

      <style>{`
        @keyframes otpShake { 0%, 100% { transform: translateX(0); } 10%, 50%, 90% { transform: translateX(-6px); } 30%, 70% { transform: translateX(6px); } }
      `}</style>
    </div>
  );
};

export default VerifyOTP;
