'use client'

import { motion } from 'framer-motion'
import { Section } from '@/components/ui/Section'
import { StaggerChildren, staggerItem } from '@/components/animations/StaggerChildren'
import { ScrollReveal } from '@/components/animations/ScrollReveal'
import { STEPS } from '@/lib/constants'

export function HowItWorks() {
  return (
    <Section id="how-it-works" labelledBy="how-heading">
      <ScrollReveal>
        <h2 id="how-heading" className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
          How It Works
        </h2>
        <p className="text-text-secondary text-center max-w-lg mx-auto mb-16">
          Three steps. Zero friction. AI that meets you where you already are.
        </p>
      </ScrollReveal>

      <StaggerChildren staggerDelay={0.15} className="grid md:grid-cols-3 gap-8">
        {STEPS.map((step) => (
          <motion.div
            key={step.number}
            variants={staggerItem}
            className="relative text-center md:text-left"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-bg-header border border-accent/20 mb-5">
              <span className="text-accent font-bold text-lg font-mono">{step.number}</span>
            </div>

            <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
            <p className="text-text-secondary leading-relaxed">{step.description}</p>
          </motion.div>
        ))}
      </StaggerChildren>
    </Section>
  )
}
