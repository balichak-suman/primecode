import { useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import logoSymbolSvg from './assets/logo-symbol.svg'
import './index.css'

export default function App() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let particles = [];
    const particleCount = 80; // Optimized for performance
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
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.size = Math.random() * 2.5 + 1.5;
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
            this.x -= dx * force * 0.08;
            this.y -= dy * force * 0.08;
          }
        }
      }

      draw() {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#39FF14';
        ctx.fillStyle = '#39FF14';
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
            ctx.strokeStyle = `rgba(57, 255, 20, ${0.8 * (1 - distance / connectionDistance)})`;
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

  return (
    <div className="app-container">
      {/* Fixed Background Layer */}
      <div className="bg-fixed-container">
        <div className="tech-bg-image"></div>
        <div className="bg-overlay"></div>
        <canvas ref={canvasRef} className="particle-canvas"></canvas>
      </div>

      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-logo">
          <img src={logoSymbolSvg} alt="PrimeCode Symbol" className="logo-img" />
          <span>PrimeCode</span>
        </div>
        <div className="nav-links">
          <a href="#hero" className="nav-link">Home</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#services" className="nav-link">Services</a>
          <a href="#contact" className="nav-link">Contact</a>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section id="hero" className="section hero-section">
          {/* 3D Model Background */}
          <div className="spline-wrapper">
            <div className="spline-crop-container">
              <Spline scene="https://prod.spline.design/DbP1cAh4boP4F2lP/scene.splinecode" />
            </div>
          </div>

          {/* Overlays - TOP RIGHT VISION */}
          <div className="hero-top-right">
            <p className="vision-quote">"Innovation is the DNA of PrimeCode. We don't just write code; we architect global digital systems."</p>
            <p className="vision-author">-- PrimeCode Engineering Vision</p>
          </div>

          {/* Overlays - LEFT BRANDING */}
          <div className="hero-left">
            <h1 className="hero-headline">PrimeCode</h1>
            <p className="hero-quote">Engineering Digital Excellence for Global Brands.</p>
          </div>

          {/* Overlays - RIGHT FEATURES */}
          <div className="hero-features-container">
            <ul className="hero-features">
              <li className="feature-item">
                Scalable Solutions <div className="feature-line"></div>
              </li>
              <li className="feature-item">
                <svg className="feature-icon" viewBox="0 0 40 20">
                  <path d="M0,10 Q5,0 10,10 T20,10 T30,10 T40,10" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
                AI Intelligence <div className="feature-line"></div>
              </li>
              <li className="feature-item">
                Cloud Native <div className="feature-line"></div>
              </li>
              <li className="feature-item">
                Cyber Secure
                <svg className="feature-icon" style={{ width: '20px' }} viewBox="0 0 24 24">
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </li>
            </ul>
          </div>

          {/* Overlays - BOTTOM RIGHT CTA */}
          <div className="hero-bottom-right">
            <h2 className="impact-text">GLOBAL IMPACT.<br />UNCOMPROMISING SECURITY.</h2>
            <button className="cta-button">Request Consultation</button>
          </div>

          {/* Decorative Sparkle */}
          <svg className="sparkle" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12,2L14.5,9.5L22,12L14.5,14.5L12,22L9.5,14.5L2,12L9.5,9.5L12,2Z" />
          </svg>
        </section>

        {/* About Section */}
        <section id="about" className="section">
          <div className="glass-card">
            <h2 className="section-title">Who We Are</h2>
            <p className="section-text">
              PrimeCode is a leading software solutions partner dedicated to accelerating digital transformation for brands worldwide.
              We blend cutting-edge technology with creative engineering to build software that scales, inspires, and delivers results.
            </p>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="section">
          <h2 className="section-title">Our Solutions</h2>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">🌐</div>
              <h3>Web Development</h3>
              <p>High-performance, scalable web apps built with modern frameworks to ensure speed and reliability.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">📱</div>
              <h3>Mobile Solutions</h3>
              <p>Native and cross-platform mobile experiences that engage users on every device, anytime, anywhere.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">☁️</div>
              <h3>Cloud Engineering</h3>
              <p>Robust cloud infrastructure and DevOps services to automate your workflow and secure your data.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">🤖</div>
              <h3>AI & Data</h3>
              <p>Intelligent solutions powered by data science and machine learning to give your brand a competitive edge.</p>
            </div>
          </div>
        </section>

        {/* Contact Footer */}
        <footer id="contact" className="footer">
          <div className="footer-content">
            <h2 className="section-title">Ready to Sync?</h2>
            <p className="section-text">Let's build the future of software together. Our team is ready to transform your vision into reality.</p>
            <a href="mailto:hello@primecode.tech" className="cta-button">Start a Project</a>
            <div className="copyright">
              &copy; {new Date().getFullYear()} PrimeCode Solutions. All Rights Reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
