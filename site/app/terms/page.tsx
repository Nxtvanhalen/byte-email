import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { SITE } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for Byte AI email assistant.',
}

export default function Terms() {
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
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-text-muted text-sm mb-12">Last updated: February 2025</p>

        <div className="prose-custom space-y-8">
          <section>
            <h2>Acceptance of Terms</h2>
            <p>
              By sending an email to {SITE.email}, you agree to these Terms of Service. If you do
              not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2>Service Description</h2>
            <p>
              Byte AI is a free, community-driven email assistant that uses artificial intelligence
              to respond to your questions and analyze attachments. The service is provided as-is,
              at no cost.
            </p>
          </section>

          <section>
            <h2>Acceptable Use</h2>
            <p>You agree not to use Byte to:</p>
            <ul>
              <li>Send spam, bulk emails, or automated messages.</li>
              <li>
                Generate content that is illegal, harmful, threatening, abusive, harassing,
                defamatory, or otherwise objectionable.
              </li>
              <li>Attempt to exploit, overload, or interfere with the service.</li>
              <li>Impersonate another person or entity.</li>
              <li>Use the service for any purpose that violates applicable laws.</li>
            </ul>
          </section>

          <section>
            <h2>Rate Limits</h2>
            <p>To ensure fair access for everyone, Byte enforces the following limits:</p>
            <ul>
              <li>
                <strong>10 emails per hour</strong> per sender.
              </li>
              <li>
                <strong>25 emails per day</strong> per sender.
              </li>
            </ul>
            <p>
              If you exceed these limits, you&apos;ll receive a notification with your reset time.
            </p>
          </section>

          <section>
            <h2>Content &amp; Intellectual Property</h2>
            <p>
              You retain all rights to the content you send to Byte. By using the service, you grant
              us a limited license to process your content solely to generate responses and maintain
              conversation threads.
            </p>
            <p>
              AI-generated responses are provided for informational purposes. You&apos;re free to
              use them as you see fit, but Byte makes no guarantees about accuracy, completeness, or
              fitness for any particular purpose.
            </p>
          </section>

          <section>
            <h2>Disclaimer of Warranties</h2>
            <p>
              Byte AI is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, either express or implied. We do not guarantee that the
              service will be uninterrupted, error-free, or that responses will be accurate or
              complete.
            </p>
          </section>

          <section>
            <h2>Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Byte AI and its creators shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages, or any loss
              of profits or revenue, whether incurred directly or indirectly, resulting from your
              use of the service.
            </p>
          </section>

          <section>
            <h2>Termination</h2>
            <p>
              We reserve the right to block or restrict access for any user who violates these terms
              or abuses the service. You may stop using Byte at any time by simply not sending
              further emails.
            </p>
          </section>

          <section>
            <h2>Changes to Terms</h2>
            <p>
              We may update these terms as the service evolves. Continued use after changes
              constitutes acceptance. Significant changes will be communicated via a notice on this
              website.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about these terms? Email us at{' '}
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}
