'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { bolt: 'text-lg', text: 'text-base' },
  md: { bolt: 'text-2xl', text: 'text-xl' },
  lg: { bolt: 'text-4xl', text: 'text-3xl' },
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const s = sizes[size]

  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Byte AI">
      <span className={s.bolt} role="img" aria-hidden="true">
        ⚡
      </span>
      <span
        className={`${s.text} font-semibold tracking-tight text-white`}
        style={{ letterSpacing: '-0.5px' }}
      >
        Byte
      </span>
    </span>
  )
}
