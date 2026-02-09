'use client'

import { Section } from '@/components/ui/Section'
import { ScrollReveal } from '@/components/animations/ScrollReveal'

export function WhyFree() {
  return (
    <Section id="why-free" labelledBy="why-heading" narrow>
      <ScrollReveal>
        <h2 id="why-heading" className="text-3xl md:text-4xl font-bold text-white text-center mb-6">
          Why Is This Free?
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="space-y-6 text-text-secondary leading-relaxed">
          <p className="text-lg text-center">
            Byte is a <span className="text-white font-medium">community service project</span>. Not
            a product. Not a startup. We built this because AI should be accessible to everyone —
            not locked behind apps, accounts, and paywalls.
          </p>

          <div className="border-l-2 border-accent/40 pl-6 py-2 my-8">
            <p className="text-text-primary italic">
              &ldquo;If you can send an email, you can use AI. That&apos;s the whole point.&rdquo;
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-accent mt-1 text-lg" aria-hidden="true">
                ✦
              </span>
              <p>
                <span className="text-white font-medium">No data selling.</span> Your emails are
                processed and forgotten. Conversations auto-delete after 30 days.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-accent mt-1 text-lg" aria-hidden="true">
                ✦
              </span>
              <p>
                <span className="text-white font-medium">No hidden costs.</span> No premium tier, no
                &ldquo;upgrade to unlock&rdquo; tricks. What you see is what you get.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-accent mt-1 text-lg" aria-hidden="true">
                ✦
              </span>
              <p>
                <span className="text-white font-medium">Transparent about the future.</span> We may
                introduce helpful, relevant suggestions down the road to keep the lights on — but
                they won&apos;t be the spammy kind, and we&apos;ll let everyone know well in
                advance.
              </p>
            </div>
          </div>

          <p className="text-center text-text-secondary pt-4">
            This is built for the community, by the community. Your{' '}
            <a
              href="#feedback"
              className="text-accent hover:text-white transition-colors underline underline-offset-2"
            >
              feedback
            </a>{' '}
            shapes what Byte becomes.
          </p>
        </div>
      </ScrollReveal>
    </Section>
  )
}
