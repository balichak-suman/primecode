import { useState, useEffect } from 'react'
import './Navbar.css'
import logoImg from '../../assets/logo.png'

const NAV_LINKS = ['Services', 'Portfolio', 'About Us', 'Contact']

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const toggleMenu = () => setMenuOpen(prev => !prev)
    const closeMenu = () => setMenuOpen(false)

    return (
        <header className={`navbar${scrolled ? ' scrolled' : ''}`} id="navbar">
            <div className="nav-container">
                {/* Logo */}
                <div className="logo" id="logo-link">
                    <img src={logoImg} alt="PrimeCode Logo" className="logo-img" />
                </div>

                {/* Nav Links */}
                <nav className={`nav-links${menuOpen ? ' open' : ''}`} id="nav-links">
                    {NAV_LINKS.map(link => (
                        <a
                            key={link}
                            href={`#${link.toLowerCase().replace(' ', '-')}`}
                            className="nav-link"
                            onClick={closeMenu}
                        >
                            {link}
                        </a>
                    ))}
                </nav>

                {/* CTA */}
                <a href="#contact" className="btn-get-started" id="get-started-btn">
                    Get Started
                </a>

                {/* Hamburger */}
                <button
                    className="hamburger"
                    id="hamburger"
                    aria-label="Toggle menu"
                    onClick={toggleMenu}
                    style={{
                        '--bar1-transform': menuOpen ? 'rotate(45deg) translate(5px,5px)' : 'none',
                        '--bar2-opacity': menuOpen ? '0' : '1',
                        '--bar3-transform': menuOpen ? 'rotate(-45deg) translate(5px,-5px)' : 'none',
                    }}
                >
                    <span style={{ transform: menuOpen ? 'rotate(45deg) translate(5px,5px)' : '' }} />
                    <span style={{ opacity: menuOpen ? 0 : 1 }} />
                    <span style={{ transform: menuOpen ? 'rotate(-45deg) translate(5px,-5px)' : '' }} />
                </button>
            </div>
        </header>
    )
}
