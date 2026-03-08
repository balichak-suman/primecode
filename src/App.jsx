import { useEffect, useRef, useState } from 'react';
import Spline from '@splinetool/react-spline';
import emailjs from '@emailjs/browser';
import logoSymbolSvg from './assets/logo-symbol.svg'
import './index.css'

export default function App() {
  const canvasRef = useRef(null);
  const cursorGlowRef = useRef(null);
  const formRef = useRef(null);
  const [formStatus, setFormStatus] = useState('idle'); // idle | sending | sent | error
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        ctx.shadowBlur = 15;
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
            ctx.strokeStyle = `rgba(57, 255, 20, ${1.0 * (1 - distance / connectionDistance)})`;
            ctx.lineWidth = 1.2;
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



  // Scroll reveal + per-element parallax
  useEffect(() => {
    // IntersectionObserver: reveal .reveal and .divider-reveal elements
    const revealEls = document.querySelectorAll('.reveal, .divider-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));

    // Parallax — rAF, desktop only, passive scroll
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return () => io.disconnect();

    const SPEEDS = [0.05, 0.08, 0.06, 0.09];
    let ticking = false;

    const applyParallax = () => {
      const y = window.scrollY;
      // About
      const aL = document.querySelector('.about-left');
      const aR = document.querySelector('.about-right');
      const aB = document.querySelector('.about-blob');
      if (aL) aL.style.transform = `translateY(${y * -0.08}px)`;
      if (aR) aR.style.transform = `translateY(${y * 0.05}px)`;
      if (aB) aB.style.transform = `translate(${y * 0.12}px, ${y * 0.15}px) scale(1)`;
      // Services
      const sH = document.querySelector('.services-header');
      if (sH) sH.style.transform = `translateY(${y * -0.05}px)`;
      document.querySelectorAll('.svc-card-wrap').forEach((w, i) => {
        w.style.transform = `translateY(${y * (SPEEDS[i] ?? 0.06)}px)`;
      });
      // Contact
      const cH = document.querySelector('.contact-cta');
      if (cH) cH.style.transform = `translateY(${y * -0.04}px)`;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) { requestAnimationFrame(applyParallax); ticking = true; }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Cursor glow & CSS background variables
  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none)').matches;
    const glow = cursorGlowRef.current;

    const move = (e) => {
      // For touch, use first touch finger
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      // Update global CSS vars for the background mask
      document.documentElement.style.setProperty('--mouse-x', `${clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${clientY}px`);

      // Only move custom cursor if not a touch device
      if (!isTouch && glow) {
        glow.style.left = clientX + 'px';
        glow.style.top = clientY + 'px';
      }
    };

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });

    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
    };
  }, []);

  // Counter animation + skill bar fill on scroll
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animateCounter = (el) => {
      const target = +el.dataset.target;
      const dur = 1800;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(ease * target);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };
      requestAnimationFrame(tick);
    };
    const animateBar = (el) => { el.style.width = el.dataset.width + '%'; };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll('.stat-number').forEach(el => reduced ? (el.textContent = el.dataset.target) : animateCounter(el));
        entry.target.querySelectorAll('.skill-fill').forEach(el => animateBar(el));
        io.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('.about-stats, .skill-card').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Magnetic buttons (desktop only)
  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    const btns = document.querySelectorAll('.btn-glow, .btn-outline');
    const cleanup = [];
    btns.forEach(btn => {
      const onMove = (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.28;
        const y = (e.clientY - r.top - r.height / 2) * 0.28;
        btn.style.transition = 'transform 0.15s ease';
        btn.style.transform = `translate(${x}px, ${y}px)`;
      };
      const onLeave = () => {
        btn.style.transition = 'transform 0.5s ease, box-shadow 0.2s ease, border-color 0.3s ease';
        btn.style.transform = '';
      };
      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
      cleanup.push(() => { btn.removeEventListener('mousemove', onMove); btn.removeEventListener('mouseleave', onLeave); });
    });
    return () => cleanup.forEach(fn => fn());
  }, []);

  // 3D card tilt + mouse-tracked light reflection (desktop only)
  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    const cards = document.querySelectorAll('.svc-card');
    const cleanup = [];
    cards.forEach(card => {
      const onMove = (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const rX = (y - r.height / 2) / 10;
        const rY = -(x - r.width / 2) / 10;
        card.style.transition = 'border-color 0.3s ease, box-shadow 0.3s ease';
        card.style.transform = `perspective(1000px) rotateX(${rX}deg) rotateY(${rY}deg) translateY(-8px)`;
        card.style.setProperty('--mx', `${(x / r.width) * 100}%`);
        card.style.setProperty('--my', `${(y / r.height) * 100}%`);
      };
      const onLeave = () => {
        card.style.transition = 'transform 0.5s ease, border-color 0.3s ease, box-shadow 0.3s ease';
        card.style.transform = '';
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '50%');
      };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      cleanup.push(() => { card.removeEventListener('mousemove', onMove); card.removeEventListener('mouseleave', onLeave); });
    });
    return () => cleanup.forEach(fn => fn());
  }, []);

  // EmailJS form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus('sending');
    try {
      await emailjs.sendForm(
        'YOUR_SERVICE_ID',
        'YOUR_TEMPLATE_ID',
        formRef.current,
        'YOUR_PUBLIC_KEY'
      );
      setFormStatus('sent');
      formRef.current.reset();
    } catch {
      setFormStatus('error');
    }
    setTimeout(() => setFormStatus('idle'), 5000);
  };

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  return (
    <div className="app-container">
      {/* Cursor glow */}
      <div ref={cursorGlowRef} className="cursor-glow" aria-hidden="true" />
      {/* Fixed Background Layer */}
      <div className="bg-fixed-container">
        <div className="tech-bg-image"></div>
        <div className="bg-overlay"></div>
        <canvas ref={canvasRef} className="particle-canvas"></canvas>
      </div>

      {/* Navigation */}
      <nav className={`navbar ${isMobileMenuOpen ? 'menu-open' : ''}`}>
        <div className="nav-logo">
          <img src={logoSymbolSvg} alt="PrimeCode Symbol" className="logo-img" />
          <span>PrimeCode</span>
        </div>

        {/* Desktop Links */}
        <div className="nav-links">
          <a href="#hero" className="nav-link">Home</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#services" className="nav-link">Services</a>
          <a href="#contact" className="nav-link">Contact</a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className="hamburger-btn"
          aria-label="Toggle menu"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
        {/* Close Button top right inside overlay */}
        <button
          className="mobile-close-btn"
          aria-label="Close menu"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="mobile-nav-links">
          {['Home', 'About', 'Services', 'Contact'].map(link => (
            <a
              key={link}
              href={`#${link.toLowerCase() === 'home' ? 'hero' : link.toLowerCase()}`}
              className="mobile-nav-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link}
            </a>
          ))}
        </div>
      </div>

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


        </section>

        {/* ═══ ABOUT SECTION ═══ */}
        <section id="about" className="about-section">
          <div className="section-divider divider-reveal" />

          <div className="about-dots" aria-hidden="true" />
          <div className="about-container">
            {/* Left */}
            <div className="about-left reveal reveal-left">
              <span className="section-label">WHO WE ARE</span>
              <h2 className="about-heading">
                Building the future,<br />
                <span className="gradient-text">one line at a time</span>
              </h2>
              <p className="about-body">
                PrimeCode is a leading software solutions partner dedicated to accelerating
                digital transformation for global brands. We blend cutting-edge engineering
                with creative precision — building software that scales, inspires, and delivers.
              </p>
              <div className="about-stats">
                <div className="stat-item">
                  <div className="stat-number-row">
                    <span className="stat-number" data-target="50">0</span>
                    <span className="stat-suffix">+</span>
                  </div>
                  <span className="stat-label">Projects</span>
                </div>
                <div className="stat-item">
                  <div className="stat-number-row">
                    <span className="stat-number" data-target="5">0</span>
                    <span className="stat-suffix">+</span>
                  </div>
                  <span className="stat-label">Years</span>
                </div>
                <div className="stat-item">
                  <div className="stat-number-row">
                    <span className="stat-number" data-target="100">0</span>
                    <span className="stat-suffix">%</span>
                  </div>
                  <span className="stat-label">Satisfaction</span>
                </div>
              </div>
            </div>
            {/* Right */}
            <div className="about-right reveal reveal-right">
              <div className="skill-card">
                <p className="skill-card-title">Core Technologies</p>
                {[
                  { label: 'React & Next.js', width: 93 },
                  { label: 'Node.js & Express', width: 88 },
                  { label: 'Cloud & DevOps', width: 80 },
                  { label: 'AI & ML Integration', width: 75 },
                  { label: 'Mobile (React Native)', width: 82 },
                ].map(({ label, width }) => (
                  <div className="skill-item" key={label}>
                    <div className="skill-meta">
                      <span className="skill-name">{label}</span>
                      <span className="skill-pct">{width}%</span>
                    </div>
                    <div className="skill-track">
                      <div className="skill-fill" data-width={width} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SERVICES SECTION ═══ */}
        <section id="services" className="services-section">
          <div className="section-divider divider-reveal" />
          <div className="services-dots" aria-hidden="true" />

          <div className="services-header reveal reveal-up">
            <span className="section-label">WHAT WE DO</span>
            <h2 className="services-heading">
              Services that scale<br />
              <span className="gradient-text">with your vision</span>
            </h2>
            <p className="services-subtext">End-to-end solutions engineered for the modern digital landscape.</p>
          </div>
          <div className="services-grid-new">
            {[
              { icon: '🌐', title: 'Web Development', desc: 'High-performance web apps built with modern frameworks — fast, scalable, and reliable.', color: '#0070F3', delay: 0 },
              { icon: '📱', title: 'Mobile Apps', desc: 'Native and cross-platform mobile experiences that engage users on every device.', color: '#7928CA', delay: 100 },
              { icon: '☁️', title: 'Cloud Engineering', desc: 'Robust cloud infrastructure and DevOps pipelines to automate workflows and secure data.', color: '#00DFD8', delay: 200 },
              { icon: '🤖', title: 'AI & Data', desc: 'Intelligent solutions powered by ML and data science to give your brand a competitive edge.', color: '#F76B1C', delay: 300 },
            ].map(({ icon, title, desc, color, delay }) => (
              <div className="svc-card-wrap" key={title}>
                <div
                  className="svc-card reveal reveal-up"
                  style={{ '--svc-color': color, '--mx': '50%', '--my': '50%', transitionDelay: `${delay}ms` }}
                >
                  <div className="svc-icon-wrap">
                    <span className="svc-icon">{icon}</span>
                    <div className="svc-glow" />
                  </div>
                  <h3 className="svc-title">{title}</h3>
                  <p className="svc-desc">{desc}</p>
                  <span className="svc-link">Learn more →</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ CONTACT / FOOTER ═══ */}
        <footer id="contact" className="contact-section">
          <div className="section-divider divider-reveal" />

          {/* CTA */}
          <div className="contact-cta reveal reveal-up">
            <span className="section-label">GET IN TOUCH</span>
            <h2 className="contact-heading">
              Ready to build<br />
              <span className="gradient-text">something great?</span>
            </h2>
            <p className="contact-sub">Let's turn your idea into reality — no fluff, just results.</p>
            <div className="contact-btn-row">
              <a href="#contact-form" className="btn-glow">Start a Project</a>
              <a href="#services" className="btn-outline">View Our Work</a>
            </div>
          </div>

          {/* Info row */}
          <div className="contact-info-row reveal reveal-up">
            <div className="contact-info-col">
              <span className="info-icon">✉</span>
              <span className="info-label">Email</span>
              <a href="mailto:hello@primecode.tech" className="info-value">hello@primecode.tech</a>
            </div>
            <div className="contact-info-col">
              <span className="info-icon">📍</span>
              <span className="info-label">Location</span>
              <span className="info-value">India</span>
            </div>
            <div className="contact-info-col">
              <span className="info-icon">🔗</span>
              <span className="info-label">Social</span>
              <div className="social-links">
                <a href="#" className="social-link" aria-label="LinkedIn">in</a>
                <a href="#" className="social-link" aria-label="GitHub">gh</a>
                <a href="#" className="social-link" aria-label="Twitter">tw</a>
              </div>
            </div>
          </div>

          {/* Form */}
          <form
            id="contact-form"
            ref={formRef}
            className="contact-form reveal reveal-up"
            onSubmit={handleSubmit}
          >
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input name="from_name" className="form-input" type="text" placeholder="John Doe" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input name="reply_to" className="form-input" type="email" placeholder="john@company.com" required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea name="message" className="form-input form-textarea" placeholder="Tell us about your project..." rows={5} required />
            </div>
            <button
              type="submit"
              className={`btn-glow form-submit ${formStatus === 'sending' ? 'sending' : ''}`}
              disabled={formStatus === 'sending'}
            >
              {formStatus === 'sending' ? 'Sending…' : formStatus === 'sent' ? 'Message Sent ✓' : formStatus === 'error' ? 'Failed — try again' : 'Send Message'}
            </button>
          </form>

          {/* Footer bar */}
          <div className="footer-bar">
            <div className="footer-bar-logo">
              <img src={logoSymbolSvg} alt="PrimeCode" className="footer-logo-img" />
              <span>PrimeCode</span>
            </div>
            <nav className="footer-bar-nav">
              {['Home', 'About', 'Services', 'Contact'].map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} className="footer-nav-link">{l}</a>
              ))}
            </nav>
            <span className="footer-copy">&copy; {new Date().getFullYear()} PrimeCode Solutions</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
