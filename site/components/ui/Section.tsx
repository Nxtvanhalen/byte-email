import type { ReactNode } from 'react'

interface SectionProps {
  id?: string
  labelledBy?: string
  children: ReactNode
  className?: string
  narrow?: boolean
}

export function Section({
  id,
  labelledBy,
  children,
  className = '',
  narrow = false,
}: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`py-20 md:py-28 px-6 ${className}`}>
      <div className={`mx-auto ${narrow ? 'max-w-2xl' : 'max-w-5xl'}`}>{children}</div>
    </section>
  )
}
