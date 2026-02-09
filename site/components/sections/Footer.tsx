import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { SITE } from '@/lib/constants'

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Contact', href: '/contact' },
]

export function Footer() {
  return (
    <footer className="border-t border-bg-header bg-bg-footer">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="text-center md:text-left">
            <Logo size="sm" className="mb-3" />
            <p className="text-sm text-text-muted">AI that meets you where you already are.</p>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-6">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-accent transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-bg-header/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Byte AI &middot; A community project by{' '}
            <a
              href={SITE.authorUrl}
              className="text-text-secondary hover:text-accent transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {SITE.author}
            </a>
          </p>
          <a
            href={`mailto:${SITE.email}`}
            className="text-xs text-text-muted hover:text-accent transition-colors"
          >
            {SITE.email}
          </a>
        </div>
      </div>
    </footer>
  )
}
