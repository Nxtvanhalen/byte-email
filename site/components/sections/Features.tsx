'use client'

import { motion } from 'framer-motion'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { StaggerChildren, staggerItem } from '@/components/animations/StaggerChildren'
import { ScrollReveal } from '@/components/animations/ScrollReveal'
import { FEATURES } from '@/lib/constants'

export function Features() {
  return (
    <Section id="features" labelledBy="features-heading">
      <ScrollReveal>
        <h2
          id="features-heading"
          className="text-3xl md:text-4xl font-bold text-white text-center mb-4"
        >
          What Byte Can Do
        </h2>
        <p className="text-text-secondary text-center max-w-lg mx-auto mb-16">
          Powerful AI capabilities delivered through the simplest interface imaginable — your inbox.
        </p>
      </ScrollReveal>

      <StaggerChildren staggerDelay={0.1} className="grid md:grid-cols-2 gap-6">
        {FEATURES.map((feature) => (
          <motion.div key={feature.title} variants={staggerItem}>
            <Card>
              <div className="flex items-start gap-4">
                <span className="text-3xl shrink-0 mt-0.5" role="img" aria-hidden="true">
                  {feature.icon}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </StaggerChildren>
    </Section>
  )
}
