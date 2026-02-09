'use client'

import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-bg-header bg-bg-content p-6 md:p-8
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(155,126,209,0.12)]
        hover:border-accent/30
        ${className}`}
    >
      {children}
    </div>
  )
}
