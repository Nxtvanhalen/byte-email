'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Bolt {
  id: number
  x: string
  y: string
  size: number
  delay: number
  duration: number
}

function generateBolts(count: number): Bolt[] {
  const bolts: Bolt[] = []
  for (let i = 0; i < count; i++) {
    bolts.push({
      id: i,
      x: `${15 + Math.random() * 70}%`,
      y: `${10 + Math.random() * 80}%`,
      size: 16 + Math.random() * 20,
      delay: Math.random() * 3,
      duration: 4 + Math.random() * 4,
    })
  }
  return bolts
}

interface LightningEffectProps {
  count?: number
}

export function LightningEffect({ count = 4 }: LightningEffectProps) {
  const [bolts, setBolts] = useState<Bolt[]>([])

  useEffect(() => {
    setBolts(generateBolts(count))
  }, [count])

  if (bolts.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {bolts.map((bolt) => (
        <motion.span
          key={bolt.id}
          className="absolute select-none opacity-0"
          style={{
            left: bolt.x,
            top: bolt.y,
            fontSize: bolt.size,
          }}
          animate={{
            opacity: [0, 0.4, 0.2, 0.5, 0],
            y: [0, -20, -10, -30, -40],
            scale: [0.8, 1, 0.9, 1.1, 0.7],
          }}
          transition={{
            duration: bolt.duration,
            delay: bolt.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          ⚡
        </motion.span>
      ))}
    </div>
  )
}
