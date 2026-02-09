'use client'

import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { ScrollReveal } from '@/components/animations/ScrollReveal'
import { SITE } from '@/lib/constants'

export function Feedback() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    const name = data.get('name') || 'Anonymous'
    const email = data.get('email')
    const message = data.get('message')

    const subject = encodeURIComponent(`Byte Feedback from ${name}`)
    const body = encodeURIComponent(`From: ${name}\nEmail: ${email}\n\n${message}`)

    window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
  }

  return (
    <Section id="feedback" labelledBy="feedback-heading" narrow>
      <ScrollReveal>
        <h2
          id="feedback-heading"
          className="text-3xl md:text-4xl font-bold text-white text-center mb-4"
        >
          Help Us Improve
        </h2>
        <p className="text-text-secondary text-center max-w-md mx-auto mb-12">
          Byte is built for you. Every piece of feedback helps us make it better.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <span className="text-4xl mb-4 block" role="img" aria-label="Thank you">
              ⚡
            </span>
            <p className="text-xl text-white font-medium mb-2">Thanks for your feedback!</p>
            <p className="text-text-secondary">
              Your email client should have opened. Send it our way!
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="feedback-name" className="block text-sm text-text-secondary mb-2">
                Name <span className="text-text-muted">(optional)</span>
              </label>
              <input
                type="text"
                id="feedback-name"
                name="name"
                autoComplete="name"
                className="w-full px-4 py-3 rounded-lg bg-bg-content border border-bg-header
                  text-text-primary placeholder:text-text-muted
                  focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent
                  transition-colors duration-200"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="feedback-email" className="block text-sm text-text-secondary mb-2">
                Email <span className="text-accent">*</span>
              </label>
              <input
                type="email"
                id="feedback-email"
                name="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg bg-bg-content border border-bg-header
                  text-text-primary placeholder:text-text-muted
                  focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent
                  transition-colors duration-200"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="feedback-message" className="block text-sm text-text-secondary mb-2">
                Message <span className="text-accent">*</span>
              </label>
              <textarea
                id="feedback-message"
                name="message"
                required
                rows={5}
                className="w-full px-4 py-3 rounded-lg bg-bg-content border border-bg-header
                  text-text-primary placeholder:text-text-muted
                  focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent
                  transition-colors duration-200 resize-y"
                placeholder="What's working? What could be better? We're all ears."
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full sm:w-auto">
                Send Feedback
              </Button>
            </div>
          </form>
        )}
      </ScrollReveal>
    </Section>
  )
}
