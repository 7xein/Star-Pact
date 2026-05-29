'use client'

import React, { useEffect, useRef } from 'react'

// Animated star field — pure canvas, no React re-renders.
// Shared by facilitator dashboard, mobile play, and join screens.
export default function StarField({ density = 1 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const r = c.getBoundingClientRect()
      c.width = r.width * dpr
      c.height = r.height * dpr
    }
    resize()
    const stars: Array<{ x: number; y: number; r: number; a: number }> = []
    const count = Math.floor((c.width * c.height) / 8000 * density)
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: Math.random() * 1.4 * dpr + 0.3 * dpr,
        a: Math.random() * 0.7 + 0.2,
      })
    }
    let raf: number
    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height)
      t += 0.016
      for (const s of stars) {
        const a = s.a + Math.sin(t * 2 + s.x) * 0.2
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0.05, a)})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [density])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}/>
}
