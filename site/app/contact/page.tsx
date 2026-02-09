import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { SITE } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the Byte AI team.',
}

export default function Contact() {
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
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Contact Us</h1>
        <p className="text-text-secondary text-lg mb-12">
          Got questions, feedback, or just want to say hi? We&apos;d love to hear from you.
        </p>

        <div className="space-y-8">
          <div className="rounded-xl border border-bg-header bg-bg-content p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white mb-3">Get in Touch</h2>
            <p className="text-text-secondary mb-4">
              Questions, feedback, suggestions — send it all our way. We read every email.
            </p>
            <a
              href={`mailto:${SITE.contactEmail}?subject=Byte%20—%20Contact`}
              className="inline-flex items-center gap-2 text-accent hover:text-white transition-colors font-medium"
            >
              <span aria-hidden="true">⚡</span>
              {SITE.contactEmail}
            </a>
          </div>

          <div className="rounded-xl border border-bg-header bg-bg-content p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white mb-3">Try Byte</h2>
            <p className="text-text-secondary mb-4">
              Want to use Byte? Just send an email — no sign-up needed.
            </p>
            <a
              href={`mailto:${SITE.email}`}
              className="inline-flex items-center gap-2 text-accent hover:text-white transition-colors font-medium"
            >
              <span aria-hidden="true">⚡</span>
              {SITE.email}
            </a>
          </div>

          <div className="rounded-xl border border-bg-header bg-bg-content p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white mb-3">Report an Issue</h2>
            <p className="text-text-secondary mb-4">
              Found a bug or something not working right? Let us know so we can fix it.
            </p>
            <a
              href={SITE.github}
              className="text-accent hover:text-white transition-colors font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open an issue on GitHub &rarr;
            </a>
          </div>

          <div className="pt-4">
            <h2 className="text-xl font-semibold text-white mb-3">Response Time</h2>
            <p className="text-text-secondary">
              Byte responds to emails in seconds. For human inquiries about the project, we
              typically respond within 24-48 hours.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
