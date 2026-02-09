'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'

const navLinks = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#why-free' },
  { label: 'Contact', href: '/contact' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-bg-primary/80 backdrop-blur-xl border-b border-bg-header/50'
          : 'bg-transparent'
      }`}
    >
      <nav
        className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4"
        aria-label="Main navigation"
      >
        <a href="#" aria-label="Back to top">
          <Logo size="sm" />
        </a>

        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm text-text-secondary hover:text-accent transition-colors duration-200"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="mailto:byte@firstlyte.co"
          className="text-sm text-accent hover:text-white transition-colors duration-200 font-medium"
        >
          byte@firstlyte.co
        </a>
      </nav>
    </motion.header>
  )
}
