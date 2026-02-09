'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  y?: number
  className?: string
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.6,
  y = 20,
  className = '',
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.4, 0.25, 1] as const }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
