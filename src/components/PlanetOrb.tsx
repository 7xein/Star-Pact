'use client'

// Photo-based PlanetOrb — uses cropped photoreal images.
// Lifted verbatim from mobile_handoff_v2/src-reference/PlanetOrb.jsx
//
// No glow / drop-shadow / atmospheric ring is rendered on top — the PNGs have
// their baked-in atmospheric limb and nothing else goes on top (rule 5 of
// mobile handoff). The `glow` prop is gone. The component takes only the
// planet name (used as id lookup), color (no longer used for tint, kept for
// backwards-compat with call sites), size, pulse. The `lit` prop is kept as
// a grayscale dim for the dashboard's pact-check audit mode.

import React from 'react'

const PLANET_ASSET_BASE = '/planets/'

// Scale per planet is calibrated so every body renders at ~95% of the size box,
// regardless of how much surrounding ring/corona/padding the source crop has.
// scale = 0.95 / (measured body diameter / canvas width)
//
// boxBoost is an optional per-planet multiplier that grows the *visual* render
// past the layout box. The outer wrapper still takes exactly `size × size` of
// layout space (so baseline alignment with other planets is preserved), but
// the inner image renders centered at `size × boxBoost`, bleeding out
// symmetrically. Used for Aqualis & Voidara whose ringed bodies look smaller
// than other planets at the same `size` because their rings consume canvas
// area that would otherwise belong to the body.
// `bright`/`saturate` are optional per-planet CSS-filter boosts applied to the
// PNG when lit. Voidara's ringed grey body reads as muddy on the #050308 void,
// so it gets brightened + slightly resaturated to hold its own next to the
// other worlds. (Filter, not a color swap — the body is a baked photoreal PNG.)
const PLANET_IMG_BOX: Record<string, { scale: number; dx: number; dy: number; boxBoost?: number; bright?: number; saturate?: number }> = {
  ignis:    { scale: 0.96, dx: 0, dy: 0 }, // body Ø 1114 / canvas 1126
  solara:   { scale: 1.16, dx: 0, dy: 0 }, // body Ø 841 / 1024 — corona spills past, intentional
  glacius:  { scale: 1.03, dx: 0, dy: 0 }, // body Ø 946 / 1024
  rosara:   { scale: 0.99, dx: 0, dy: 0 }, // body Ø 982 / 1024
  verdania: { scale: 1.03, dx: 0, dy: 0 }, // body Ø 946 / 1024
  lumenor:  { scale: 1.03, dx: 0, dy: 0 }, // body Ø 945 / 1024
  dustara:  { scale: 1.03, dx: 0, dy: 0 }, // body Ø 947 / 1024
  aqualis:  { scale: 1.59, dx: 0, dy: 0 }, // wide crop — rings spill past the box (overflow:visible); body matches the others
  voidara:  { scale: 1.80, dx: 0, dy: 0, bright: 1.45, saturate: 1.25 }, // ringed grey — body matches the others; brightened so it reads on the void
  ferron:   { scale: 1.03, dx: 0, dy: 0 }, // body Ø 946 / 1024
}

function getPlanetId(name: string): string {
  const n = name.toLowerCase()
  if (n.startsWith('ignis'))    return 'ignis'
  if (n.startsWith('solara'))   return 'solara'
  if (n.startsWith('glacius'))  return 'glacius'
  if (n.startsWith('rosara'))   return 'rosara'
  if (n.startsWith('verdania')) return 'verdania'
  if (n.startsWith('lumenor'))  return 'lumenor'
  if (n.startsWith('dustara'))  return 'dustara'
  if (n.startsWith('aqualis'))  return 'aqualis'
  if (n.startsWith('voidara'))  return 'voidara'
  if (n.startsWith('ferron'))   return 'ferron'
  return n.split(' ')[0]
}

interface PlanetOrbProps {
  name: string
  size?: number
  pulse?: boolean
  // Backwards-compat accepted-but-ignored props from v1.
  // `glow` was deleted per mobile handoff rule 5; `color`/`sigil` are no-ops.
  // `lit` still works — applies a grayscale dim for audit mode.
  color?: string
  glow?: boolean
  sigil?: string
  lit?: boolean
}

export default function PlanetOrb({ name, size = 120, pulse = false, lit = true }: PlanetOrbProps) {
  const id = getPlanetId(name)
  const cfg = PLANET_IMG_BOX[id] || { scale: 1.55, dx: 0, dy: 0 }
  const boxBoost = cfg.boxBoost ?? 1
  // The OUTER wrapper takes `size × size` for layout / baseline alignment.
  // When boxBoost > 1, the image renders larger and bleeds out of the wrapper
  // (overflow:visible) symmetrically — neighbors don't shift, the planet just
  // appears bigger. Used for Aqualis & Voidara.
  const visualSize = size * boxBoost
  // Per-planet brightness/saturation boost (e.g. Voidara) applied only when lit.
  const litFilter = cfg.bright || cfg.saturate
    ? `brightness(${cfg.bright ?? 1}) saturate(${cfg.saturate ?? 1})`
    : 'none'

  return (
    <div style={{
      position: 'relative', width: size, height: size, flexShrink: 0,
      overflow: 'visible',
      filter: lit ? litFilter : 'grayscale(1) brightness(0.6)',
    }}>
      <img
        src={`${PLANET_ASSET_BASE}${id}.png`}
        alt={name}
        draggable={false}
        style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: visualSize * cfg.scale,
          height: 'auto',
          transform: `translate(calc(-50% + ${cfg.dx}px), calc(-50% + ${cfg.dy}px))`,
          pointerEvents: 'none',
          userSelect: 'none',
          animation: pulse ? 'orbPulse 4s ease-in-out infinite' : 'none',
        }}
      />
    </div>
  )
}
