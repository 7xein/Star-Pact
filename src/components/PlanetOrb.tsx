'use client'

import React from 'react'

interface PlanetOrbProps {
  name: string
  color: string
  size?: number
  glow?: boolean
  sigil?: string
  pulse?: boolean
}

interface PlanetArt {
  base: string
  deep: string
  light: string
  ring?: boolean
  ringTilt?: number
  paint: React.ReactNode
}

const PLANET_ART: Record<string, PlanetArt> = {
  'Ignis Prime': {
    base: '#c2410c', deep: '#7c1d0a', light: '#fb923c',
    paint: (
      <g>
        <path d="M-55 -28 Q -25 -32 0 -28 Q 25 -24 55 -28 Q 55 -20 25 -18 Q 0 -16 -55 -22 Z" fill="#ea580c"/>
        <path d="M-55 -2 Q -20 -6 5 -2 Q 30 2 55 -2 Q 55 6 30 8 Q 0 10 -55 6 Z" fill="#fb923c"/>
        <path d="M-55 22 Q -25 18 0 22 Q 30 26 55 22 Q 55 32 25 34 Q 0 34 -55 30 Z" fill="#ea580c"/>
        <ellipse cx="-22" cy="-8" rx="14" ry="8" fill="#3a0d05"/>
        <ellipse cx="14" cy="14" rx="16" ry="9" fill="#3a0d05"/>
        <ellipse cx="22" cy="-22" rx="9" ry="5" fill="#3a0d05"/>
      </g>
    ),
  },
  'Solara': {
    base: '#f59e0b', deep: '#b45309', light: '#fde68a',
    paint: (
      <g>
        <path d="M-55 -28 Q -25 -32 0 -28 Q 25 -24 55 -28 Q 55 -20 25 -18 Q 0 -16 -55 -22 Z" fill="#fde68a"/>
        <path d="M-55 -2 Q -20 -6 5 -2 Q 30 2 55 -2 Q 55 6 30 8 Q 0 10 -55 6 Z" fill="#fbbf24"/>
        <path d="M-55 22 Q -25 18 0 22 Q 30 26 55 22 Q 55 32 25 34 Q 0 34 -55 30 Z" fill="#fde68a"/>
        <ellipse cx="14" cy="2" rx="8" ry="5" fill="#b45309"/>
      </g>
    ),
  },
  'Glacius': {
    base: '#7fb8e8', deep: '#2c5e93', light: '#e0f2fe',
    paint: (
      <g>
        <ellipse cx="0" cy="-44" rx="40" ry="12" fill="#ffffff"/>
        <ellipse cx="0" cy="46" rx="34" ry="9" fill="#ffffff"/>
        <ellipse cx="-22" cy="-12" rx="16" ry="10" fill="#dbeafe"/>
        <ellipse cx="20" cy="6" rx="18" ry="11" fill="#dbeafe"/>
        <ellipse cx="-10" cy="22" rx="10" ry="6" fill="#dbeafe"/>
      </g>
    ),
  },
  'Rosara': {
    base: '#f9a8d4', deep: '#9d174d', light: '#fce7f3',
    paint: (
      <g>
        <path d="M-55 -25 Q -20 -30 15 -25 Q 35 -20 55 -25 Q 55 -18 35 -16 Q 0 -14 -55 -18 Z" fill="#fce7f3"/>
        <path d="M-55 0 Q -25 -4 0 0 Q 30 4 55 -2 Q 55 6 30 8 Q 0 10 -55 6 Z" fill="#fbcfe8"/>
        <path d="M-55 22 Q -20 18 20 22 Q 45 25 55 22 Q 55 30 30 32 Q 0 32 -55 30 Z" fill="#fce7f3"/>
      </g>
    ),
  },
  'Verdania': {
    base: '#22c55e', deep: '#14532d', light: '#86efac',
    paint: (
      <g>
        <ellipse cx="-22" cy="-18" rx="18" ry="11" fill="#15803d"/>
        <ellipse cx="22" cy="-8" rx="14" ry="9" fill="#15803d"/>
        <ellipse cx="8" cy="22" rx="22" ry="13" fill="#15803d"/>
        <ellipse cx="-22" cy="-18" rx="9" ry="5" fill="#052e15"/>
        <ellipse cx="10" cy="22" rx="11" ry="6" fill="#052e15"/>
      </g>
    ),
  },
  'Lumenor': {
    base: '#a855f7', deep: '#581c87', light: '#e9d5ff',
    ring: true, ringTilt: -28,
    paint: (
      <g>
        <path d="M-55 -25 Q -20 -30 15 -25 Q 35 -20 55 -25 Q 55 -18 35 -16 Q 0 -14 -55 -18 Z" fill="#c4b5fd"/>
        <path d="M-55 12 Q -20 8 20 12 Q 45 15 55 12 Q 55 22 30 24 Q 0 24 -55 22 Z" fill="#c4b5fd"/>
        <ellipse cx="-15" cy="-2" rx="10" ry="6" fill="#e9d5ff"/>
        <ellipse cx="20" cy="20" rx="8" ry="5" fill="#e9d5ff"/>
      </g>
    ),
  },
  'Dustara': {
    base: '#ea580c', deep: '#7c2d12', light: '#fed7aa',
    paint: (
      <g>
        <path d="M-55 -28 Q -25 -32 0 -28 Q 25 -24 55 -28 Q 55 -20 25 -18 Q 0 -16 -55 -22 Z" fill="#c2410c"/>
        <path d="M-55 -2 Q -20 -6 5 -2 Q 30 2 55 -2 Q 55 6 30 8 Q 0 10 -55 6 Z" fill="#fed7aa"/>
        <path d="M-55 22 Q -25 18 0 22 Q 30 26 55 22 Q 55 32 25 34 Q 0 34 -55 30 Z" fill="#9a3412"/>
        <circle cx="-14" cy="-12" r="4" fill="#7c2d12"/>
        <circle cx="20" cy="-2" r="3" fill="#7c2d12"/>
        <circle cx="-8" cy="20" r="3" fill="#7c2d12"/>
        <circle cx="24" cy="22" r="2.5" fill="#7c2d12"/>
      </g>
    ),
  },
  'Aqualis': {
    base: '#1d4ed8', deep: '#1e3a8a', light: '#93c5fd',
    ring: true,
    paint: (
      <g>
        <path d="M-55 -28 Q -25 -32 0 -28 Q 25 -24 55 -28 Q 55 -20 25 -18 Q 0 -16 -55 -22 Z" fill="#3b82f6"/>
        <path d="M-55 -2 Q -20 -6 5 -2 Q 30 2 55 -2 Q 55 6 30 8 Q 0 10 -55 6 Z" fill="#60a5fa"/>
        <path d="M-55 22 Q -25 18 0 22 Q 30 26 55 22 Q 55 32 25 34 Q 0 34 -55 30 Z" fill="#3b82f6"/>
        <ellipse cx="-18" cy="10" rx="6" ry="3" fill="#0c4a6e"/>
        <ellipse cx="-2" cy="14" rx="3" ry="1.5" fill="#0c4a6e"/>
        <ellipse cx="22" cy="-12" rx="5" ry="2.5" fill="#0c4a6e"/>
      </g>
    ),
  },
  'Voidara': {
    base: '#475569', deep: '#0f172a', light: '#cbd5e1',
    ring: true,
    paint: (
      <g>
        <path d="M-55 -28 Q -25 -32 0 -28 Q 25 -24 55 -28 Q 55 -20 25 -18 Q 0 -16 -55 -22 Z" fill="#334155"/>
        <path d="M-55 22 Q -25 18 0 22 Q 30 26 55 22 Q 55 32 25 34 Q 0 34 -55 30 Z" fill="#334155"/>
        <ellipse cx="-18" cy="-2" rx="14" ry="8" fill="#1e293b"/>
        <ellipse cx="18" cy="6" rx="12" ry="7" fill="#1e293b"/>
      </g>
    ),
  },
  'Ferron': {
    base: '#0e7490', deep: '#083344', light: '#67e8f9',
    paint: (
      <g>
        <path d="M-55 -28 Q -25 -32 0 -28 Q 25 -24 55 -28 Q 55 -20 25 -18 Q 0 -16 -55 -22 Z" fill="#155e75"/>
        <path d="M-55 22 Q -25 18 0 22 Q 30 26 55 22 Q 55 32 25 34 Q 0 34 -55 30 Z" fill="#155e75"/>
        <ellipse cx="-22" cy="-6" rx="14" ry="9" fill="#083344"/>
        <ellipse cx="20" cy="8" rx="16" ry="10" fill="#083344"/>
        <circle cx="-22" cy="-6" r="3" fill="#67e8f9"/>
        <circle cx="20" cy="8" r="3" fill="#67e8f9"/>
      </g>
    ),
  },
}

export default function PlanetOrb({ name, color, size = 120, glow = true, sigil, pulse = false }: PlanetOrbProps) {
  const art = PLANET_ART[name]
  const showRing = !!(art?.ring)
  const ringTilt = art?.ringTilt ?? 0
  const c = art?.base ?? color
  const highlightC = art?.light ?? '#ffffff'
  const r = 50
  const uid = `${name.replace(/\s+/g, '-')}-${size}`

  return (
    <div style={{
      position: 'relative', width: size, height: size, flexShrink: 0,
      filter: glow ? `drop-shadow(0 0 ${Math.round(size * 0.16)}px ${c}aa)` : 'none',
    }}>
      {/* Atmospheric halo */}
      {glow && (
        <div style={{
          position: 'absolute',
          inset: -Math.round(size * 0.20),
          borderRadius: '50%',
          background: `radial-gradient(circle, ${c}33 0%, ${c}11 40%, transparent 70%)`,
          animation: pulse ? 'orbPulse 4s ease-in-out infinite' : 'none',
          pointerEvents: 'none',
        }}/>
      )}

      {/* Ring — back half */}
      {showRing && (
        <svg
          width={size * 1.9} height={size * 1.4}
          viewBox="-95 -70 190 140"
          style={{
            position: 'absolute',
            left: -Math.round(size * 0.45),
            top: -Math.round(size * 0.2),
            pointerEvents: 'none',
            overflow: 'visible',
            transform: `rotate(${ringTilt}deg)`,
          }}
        >
          <ellipse cx="0" cy="0" rx="82" ry="15" fill="none" stroke={highlightC} strokeOpacity="0.9" strokeWidth="2.5"/>
          <ellipse cx="0" cy="0" rx="70" ry="11" fill="none" stroke={c} strokeOpacity="0.55" strokeWidth="1.5"/>
        </svg>
      )}

      {/* Core sphere */}
      <svg viewBox="-50 -50 100 100" width={size} height={size} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <clipPath id={`clip-${uid}`}><circle cx="0" cy="0" r={r}/></clipPath>
          <radialGradient id={`shade-${uid}`} cx="0.72" cy="0.78" r="0.95">
            <stop offset="0%"   stopColor="#000" stopOpacity="0"/>
            <stop offset="45%"  stopColor="#000" stopOpacity="0.05"/>
            <stop offset="75%"  stopColor="#000" stopOpacity="0.45"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0.85"/>
          </radialGradient>
          <radialGradient id={`hi-${uid}`} cx="0.25" cy="0.22" r="0.5">
            <stop offset="0%"   stopColor="#ffffff"  stopOpacity="0.7"/>
            <stop offset="35%"  stopColor={highlightC} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={highlightC} stopOpacity="0"/>
          </radialGradient>
          <radialGradient id={`glint-${uid}`} cx="0.3" cy="0.25" r="0.18">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.85"/>
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id={`rim-${uid}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="85%"  stopColor="#000" stopOpacity="0"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0.4"/>
          </radialGradient>
        </defs>
        <circle cx="0" cy="0" r={r} fill={c}/>
        <g clipPath={`url(#clip-${uid})`}>
          {art?.paint}
        </g>
        <circle cx="0" cy="0" r={r} fill={`url(#shade-${uid})`}/>
        <circle cx="0" cy="0" r={r} fill={`url(#rim-${uid})`}/>
        <circle cx="0" cy="0" r={r} fill={`url(#hi-${uid})`}/>
        <circle cx="0" cy="0" r={r} fill={`url(#glint-${uid})`}/>
      </svg>

      {/* Ring — front half */}
      {showRing && (
        <svg
          width={size * 1.9} height={size * 1.4}
          viewBox="-95 -70 190 140"
          style={{
            position: 'absolute',
            left: -Math.round(size * 0.45),
            top: -Math.round(size * 0.2),
            pointerEvents: 'none',
            overflow: 'visible',
            transform: `rotate(${ringTilt}deg)`,
          }}
        >
          <path d="M -82 0 A 82 15 0 0 0 82 0" fill="none" stroke={highlightC} strokeOpacity="1" strokeWidth="2.5"/>
          <path d="M -70 0 A 70 11 0 0 0 70 0" fill="none" stroke={c} strokeOpacity="0.75" strokeWidth="1.5"/>
        </svg>
      )}

      {sigil && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
          fontWeight: 600, fontSize: Math.round(size * 0.30),
          color: '#fff', textShadow: `0 0 ${Math.round(size * 0.1)}px rgba(0,0,0,0.7)`,
          letterSpacing: '0.05em', pointerEvents: 'none',
        }}>{sigil}</div>
      )}
    </div>
  )
}
