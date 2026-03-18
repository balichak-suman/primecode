import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';
import './Login.css';

const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let particles = [];
    const particleCount = 60; // Slightly lower count for login page performance
    const connectionDistance = 150;
    let mouse = { x: null, y: null, radius: 200 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        
        if (mouse.x !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            this.x -= dx * force * 0.05;
            this.y -= dy * force * 0.05;
          }
        }
      }

      draw() {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00D2FF';
        ctx.fillStyle = '#00D2FF';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, index) => {
        p.update();
        p.draw();
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < connectionDistance) {
            ctx.strokeStyle = `rgba(0, 210, 255, ${0.5 * (1 - distance / connectionDistance)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-bg"></canvas>;
};

const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff3366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      {message}
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [showPassword, setShowPassword] = useState(false);
  
  const [errorStatus, setErrorStatus] = useState(null); // 'shake' | 'locked' | 'network'
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutTimer, setLockoutTimer] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const roles = [
    { id: 'EMPLOYEE', label: 'EMPLOYEE', icon: '👤' },
    { id: 'HR', label: 'HR MANAGER', icon: '👥' },
    { id: 'ADMIN', label: 'ADMIN', icon: '⚙️' }
  ];

  useEffect(() => {
    let interval;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
    } else if (lockoutTimer === 0 && errorStatus === 'locked') {
      setErrorStatus(null);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer, errorStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    
    setErrorStatus(null);
    setLoading(true);

    try {
      const user = await login(email, password, role);
      
      setSuccess(true);
      setTimeout(() => {
        if (user.role === 'ADMIN') navigate('/dashboard/analytics');
        else if (user.role === 'HR') navigate('/dashboard/employees');
        else navigate('/dashboard');
      }, 800);

    } catch (err) {
      setLoading(false);
      const resData = err.response?.data;
      
      if (!err.response) {
        setToastMessage('Network Error. Please try again.');
        return;
      }
      
      if (resData?.error?.includes('locked')) {
        setErrorStatus('locked');
        setLockoutTimer(15 * 60); // 15 mins frontend assumption if backend doesn't provide it
        setErrorMessage(resData.error);
      } else {
        setErrorStatus('shake');
        setErrorMessage(resData?.error || 'Invalid credentials');
        setTimeout(() => {
          setErrorStatus(null);
        }, 500); // clear shake class after animation
      }
    }
  };

  const getSliderStyle = () => {
    const index = roles.findIndex(r => r.id === role);
    const width = 100 / roles.length;
    return {
      width: `${width}%`,
      transform: `translateX(${index * 100}%)`,
    };
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="login-container">
      <div className="login-bg-image" />
      <ParticleBackground />

      <div className={`login-glass-card ${errorStatus === 'shake' ? 'shake-error' : ''}`}>
        
        <div className="login-logo-container">
          <img src={logoImg} alt="PrimeCode" className="login-logo-img" />
          <h2 className="login-subtitle">HRMS PORTAL</h2>
        </div>

        {errorStatus === 'locked' && (
          <div className="countdown-msg">
            Account Locked. Try again in {formatTime(lockoutTimer)}
          </div>
        )}

        {/* Role Selector */}
        <div className="role-selector">
          <div className="role-slider" style={getSliderStyle()} />
          {roles.map((r) => (
            <div
              key={r.id}
              className={`role-tab ${role === r.id ? 'active' : ''}`}
              onClick={() => setRole(r.id)}
            >
              <span>{r.icon}</span> {r.label}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group-float">
            <input
              type="email"
              className="float-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              required
              disabled={loading || success || errorStatus === 'locked'}
            />
            <label className="float-label">Email Address</label>
          </div>

          <div className="form-group-float">
            <input
              type={showPassword ? "text" : "password"}
              className="float-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              required
              disabled={loading || success || errorStatus === 'locked'}
            />
            <label className="float-label">Password</label>
            <button
              type="button"
              className="eye-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                   <line x1="1" y1="1" x2="23" y2="23"></line>
                 </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
              Remember Me
            </label>
            <a href="/forgot-password" className="forgot-link">
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || success || errorStatus === 'locked'}
          >
            {success ? (
              <span className="success-check">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
            ) : loading ? (
              <div className="spinner"></div>
            ) : (
              'LOGIN'
            )}
          </button>
        </form>
      </div>

      {toastMessage && (
        <div className="toast-container">
          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        </div>
      )}
    </div>
  );
};

export default Login;
