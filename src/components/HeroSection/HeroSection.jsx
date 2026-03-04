import { useEffect, useRef } from 'react'
import Spline from '@splinetool/react-spline'
import './HeroSection.css'

const FLOAT_CARDS = [
    { icon: '📊', label: 'Analytics', value: '+127%' },
    { icon: '🚀', label: 'Deployments', value: '340+' },
    { icon: '⚡', label: 'Performance', value: '99.9%' },
]

const TRUST_LOGOS = [
    {
        name: 'Nexora',
        color: '#A78BFA',
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 16L9 2L16 16" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.5 11H13.5" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        name: 'Syft',
        color: '#EC4899',
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <polygon points="9,1 17,5 17,13 9,17 1,13 1,5" stroke="#EC4899" strokeWidth="1.8" fill="none" />
                <circle cx="9" cy="9" r="3" fill="#EC4899" />
            </svg>
        ),
    },
    {
        name: 'Cloudix',
        color: '#38BDF8',
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 12H14M6 12V8M12 12V6M9 12V10" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="6" x2="6" y2="3" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                <line x1="6" y1="3" x2="9" y2="6" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="6" x2="12" y2="3" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="3" x2="15" y2="6" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        name: 'Velora',
        color: '#34D399',
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 4L9 14L16 4" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 4L9 10L13 4" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
            </svg>
        ),
    },
    {
        name: 'Zenith',
        color: '#FB923C',
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L14 9H4L9 16" stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="6" y="6" width="6" height="6" rx="1" fill="#FB923C" opacity="0.2" />
            </svg>
        ),
    },
]

export default function HeroSection() {
    const canvasRef = useRef(null)
    const glow1Ref = useRef(null)
    const glow2Ref = useRef(null)

    /* ---- Canvas Particles ---- */
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        let w, h, particles = [], animId

        function resize() {
            w = canvas.width = canvas.offsetWidth
            h = canvas.height = canvas.offsetHeight
        }
        resize()

        const resizeObs = new ResizeObserver(resize)
        resizeObs.observe(canvas)

        function rand(a, b) { return a + Math.random() * (b - a) }

        class Particle {
            constructor() { this.reset() }
            reset() {
                this.x = rand(0, w); this.y = rand(0, h)
                this.r = rand(0.4, 2)
                this.vx = rand(-0.12, 0.12); this.vy = rand(-0.14, 0.14)
                this.alpha = rand(0.15, 0.75)
                this.twDir = 1; this.twSpd = rand(0.005, 0.018)
                const t = Math.random()
                this.color = t < 0.12 ? '#00C9B1' : t < 0.22 ? '#2DECD4' : '#B0B0D0'
            }
            update() {
                this.x += this.vx; this.y += this.vy
                this.alpha += this.twDir * this.twSpd
                if (this.alpha > 0.85 || this.alpha < 0.08) this.twDir *= -1
                if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset()
            }
            draw() {
                ctx.save()
                ctx.globalAlpha = this.alpha
                ctx.fillStyle = this.color
                ctx.shadowColor = this.color
                ctx.shadowBlur = this.r * 2.5
                ctx.beginPath()
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
                ctx.fill()
                ctx.restore()
            }
        }

        for (let i = 0; i < 80; i++) particles.push(new Particle())

        function animate() {
            ctx.clearRect(0, 0, w, h)
            particles.forEach(p => { p.update(); p.draw() })
            animId = requestAnimationFrame(animate)
        }
        animate()

        const visChange = () => { if (document.hidden) cancelAnimationFrame(animId); else animate() }
        document.addEventListener('visibilitychange', visChange)

        return () => {
            cancelAnimationFrame(animId)
            resizeObs.disconnect()
            document.removeEventListener('visibilitychange', visChange)
        }
    }, [])

    /* ---- Mouse Parallax on glow orbs ---- */
    useEffect(() => {
        const onMove = (e) => {
            const cx = window.innerWidth / 2
            const cy = window.innerHeight / 2
            const dx = (e.clientX - cx) / cx
            const dy = (e.clientY - cy) / cy
            if (glow1Ref.current) glow1Ref.current.style.transform = `translate(${dx * 20}px, ${dy * 14}px)`
            if (glow2Ref.current) glow2Ref.current.style.transform = `translate(${-dx * 14}px, ${-dy * 20}px)`
        }
        window.addEventListener('mousemove', onMove, { passive: true })
        return () => window.removeEventListener('mousemove', onMove)
    }, [])

    return (
        <section className="hero" id="hero">
            {/* Canvas particles */}
            <canvas ref={canvasRef} className="particles-canvas" />

            {/* Glow orbs */}
            <div className="hero-glow hero-glow-1" ref={glow1Ref} />
            <div className="hero-glow hero-glow-2" ref={glow2Ref} />
            <div className="hero-glow hero-glow-3" />

            {/* Main content grid */}
            <div className="hero-container">
                {/* ─── LEFT ─── */}
                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="badge-dot" />
                        Software Innovation Studio
                    </div>

                    <h1 className="hero-heading">
                        We Build<br />
                        <span className="hero-highlight">Software Products</span><br />
                        That <strong>Scale</strong>
                    </h1>

                    <p className="hero-subtext">
                        Custom Web, Mobile, and AI Solutions<br />
                        Tailored to Your Needs.
                    </p>

                    <div className="hero-buttons">
                        <a href="#portfolio" className="btn-primary" id="portfolio-btn">
                            View Our Portfolio
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M3.75 9H14.25M14.25 9L9.75 4.5M14.25 9L9.75 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </a>
                        <a href="#portfolio" className="btn-secondary" id="cases-btn">View Cases</a>
                    </div>

                    <p className="hero-trust-small">
                        Trusted by <span className="trust-number">50+</span> Startups
                    </p>
                </div>

                <div className="hero-visual">
                    <div className="spline-wrapper">
                        <Spline
                            scene="https://prod.spline.design/Sj4Afw5-kwmkkr5H/scene.splinecode"
                        />
                    </div>
                </div>
            </div>

            {/* ─── TRUST BAR ─── */}
            <div className="trust-bar" id="trust-bar">
                <span className="trust-bar-label">
                    Trusted by <span className="trust-number">50+</span> Startups
                </span>
                <div className="trust-logos">
                    {TRUST_LOGOS.map(logo => (
                        <div className="trust-logo" key={logo.name} id={`logo-${logo.name.toLowerCase()}`}>
                            {logo.icon}
                            <span>{logo.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
