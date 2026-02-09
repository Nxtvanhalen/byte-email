'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FadeIn } from '@/components/animations/FadeIn'
import { LightningEffect } from '@/components/animations/LightningEffect'
import { SITE } from '@/lib/constants'

export function Hero() {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard failed silently
    }
    window.location.href = `mailto:${SITE.email}`
  }

  return (
    <section
      className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <LightningEffect count={5} />

      {/* Purple radial glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07]"
        style={{
          background: 'radial-gradient(circle, #9B7ED1 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <FadeIn delay={0.1}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-bg-header bg-bg-content/50 text-sm text-text-secondary mb-8">
            <span aria-hidden="true">⚡</span>
            <span>Free AI assistant — no sign-up required</span>
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <h1
            id="hero-heading"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6"
          >
            Your AI Assistant
            <br />
            <span className="text-accent">Lives in Your Inbox</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.4}>
          <p className="text-lg md:text-xl text-text-secondary max-w-xl mx-auto mb-10">
            No app. No login. No website. Just email{' '}
            <span className="text-accent font-medium">{SITE.email}</span> and get intelligent
            responses in seconds.
          </p>
        </FadeIn>

        <FadeIn delay={0.55}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              onClick={handleClick}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group relative px-8 py-4 bg-accent text-white rounded-xl font-semibold text-lg
                shadow-lg shadow-accent/25 hover:shadow-accent/40
                transition-shadow duration-300 cursor-pointer"
            >
              <span className="relative z-10">{copied ? 'Copied!' : SITE.email}</span>
              <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>

            <a
              href="#how-it-works"
              className="text-text-secondary hover:text-accent transition-colors duration-200 text-sm font-medium flex items-center gap-1"
            >
              See how it works
              <span aria-hidden="true" className="text-xs">
                ↓
              </span>
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={0.7}>
          <p className="text-xs text-text-muted mt-6">
            Opens your email client and copies the address to clipboard
          </p>
        </FadeIn>
      </div>
    </section>
  )
}
