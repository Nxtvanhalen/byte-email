'use client'

import { type ButtonHTMLAttributes, type AnchorHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-dim shadow-lg shadow-accent/20 hover:shadow-accent/30',
  secondary: 'border border-bg-header text-text-primary hover:border-accent hover:text-accent',
  ghost: 'text-text-secondary hover:text-accent',
}

type BaseProps = {
  variant?: Variant
  className?: string
}

type AsButton = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never }
type AsLink = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

type ButtonProps = AsButton | AsLink

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base = `inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium
    transition-all duration-200 ease-out cursor-pointer
    focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
    ${variantStyles[variant]} ${className}`

  if ('href' in props && props.href) {
    return <a className={base} {...(props as AsLink)} />
  }

  return <button className={base} {...(props as AsButton)} />
}
