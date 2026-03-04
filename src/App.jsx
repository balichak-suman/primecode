import { useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import logoSvg from './assets/logo.svg'
import './index.css'

export default function App() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let particles = [];
    const particleCount = 120; // High density
    const connectionDistance = 160;
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
            // --- BOLD NEON CONNECTIONS ---
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#39FF14';
            ctx.strokeStyle = `rgba(57, 255, 20, ${0.9 * (1 - distance / connectionDistance)})`;
            ctx.lineWidth = 1.5; // Bold lines
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
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
      <div className="tech-bg-image"></div>
      <div className="bg-overlay"></div>
      <canvas ref={canvasRef} className="particle-canvas"></canvas>

      <div className="top-left-logo">
        <img src={logoSvg} alt="Company Logo" className="logo-img" />
      </div>

      <div className="spline-wrapper">
        <div className="spline-crop-container">
          <Spline scene="https://prod.spline.design/DbP1cAh4boP4F2lP/scene.splinecode" />
        </div>
      </div>
    </div>
  );
}
