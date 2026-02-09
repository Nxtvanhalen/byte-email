import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { SITE } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Byte AI email assistant.',
}

export default function Privacy() {
  return (
    <>
      <header className="border-b border-bg-header bg-bg-primary/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Back to homepage">
            <Logo size="sm" />
          </Link>
          <Link
            href="/"
            className="text-sm text-text-secondary hover:text-accent transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-text-muted text-sm mb-12">Last updated: February 2025</p>

        <div className="prose-custom space-y-8">
          <section>
            <h2>Overview</h2>
            <p>
              Byte AI (&ldquo;Byte,&rdquo; &ldquo;we,&rdquo; &ldquo;our&rdquo;) is a free,
              community-driven email AI assistant. We take your privacy seriously and collect only
              what&apos;s necessary to provide the service.
            </p>
          </section>

          <section>
            <h2>Information We Collect</h2>
            <p>When you email {SITE.email}, we receive and process:</p>
            <ul>
              <li>
                <strong>Your email address</strong> — used to send replies and manage rate limits.
              </li>
              <li>
                <strong>Message content</strong> — the text of your email, used to generate a
                response.
              </li>
              <li>
                <strong>Attachments</strong> — images, PDFs, and spreadsheets you send are processed
                to generate responses, then discarded.
              </li>
            </ul>
          </section>

          <section>
            <h2>How We Use Your Information</h2>
            <ul>
              <li>To generate and send AI-powered responses to your emails.</li>
              <li>
                To maintain conversation context within threads (stored for 30 days, then
                automatically deleted).
              </li>
              <li>To enforce rate limits and prevent abuse.</li>
              <li>To improve the service based on aggregate, anonymized usage patterns.</li>
            </ul>
          </section>

          <section>
            <h2>Data Storage &amp; Retention</h2>
            <p>
              Conversation history is stored in encrypted cloud storage (Upstash Redis) and is{' '}
              <strong>automatically deleted after 30 days</strong>. We do not maintain long-term
              archives of your emails or conversations.
            </p>
            <p>
              Attachments are processed in memory and are not stored after your response is
              generated.
            </p>
          </section>

          <section>
            <h2>Third-Party Services</h2>
            <p>
              To provide AI responses, your message content is processed by the following services:
            </p>
            <ul>
              <li>
                <strong>Anthropic (Claude AI)</strong> — processes messages containing images or
                PDFs.
              </li>
              <li>
                <strong>DeepSeek</strong> — processes text-only messages.
              </li>
              <li>
                <strong>Resend</strong> — handles email delivery infrastructure.
              </li>
              <li>
                <strong>Upstash</strong> — provides encrypted cloud storage for conversation
                history.
              </li>
            </ul>
            <p>
              Each of these services has their own privacy policies. We encourage you to review
              them.
            </p>
          </section>

          <section>
            <h2>What We Don&apos;t Do</h2>
            <ul>
              <li>We do not sell your data. Ever.</li>
              <li>We do not use tracking cookies or advertising pixels.</li>
              <li>We do not build advertising profiles from your emails.</li>
              <li>We do not share your information with marketers.</li>
            </ul>
          </section>

          <section>
            <h2>Your Rights</h2>
            <p>You can request at any time:</p>
            <ul>
              <li>
                <strong>Deletion</strong> of your conversation history and any stored data.
              </li>
              <li>
                <strong>Information</strong> about what data we hold about you.
              </li>
            </ul>
            <p>
              To make a request, email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with the
              subject line &ldquo;Privacy Request.&rdquo;
            </p>
          </section>

          <section>
            <h2>Changes to This Policy</h2>
            <p>
              We may update this policy as the service evolves. Significant changes will be
              communicated via a notice on this website. Continued use of Byte after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about this policy? Email us at{' '}
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}
