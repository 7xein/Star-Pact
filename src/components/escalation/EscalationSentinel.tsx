'use client'

// Escalation — Direction 4: "Sentinel"
// Lifted from escalation_sentinel_handoff/src-reference/escalation-sentinel.jsx
//
// Adaptations for this codebase:
//   - Converted JSX → TSX
//   - SN_GAME singleton lives on a module-level variable instead of `window.__SN_GAME`
//     (still attached to `globalThis` for cross-context reuse via React HMR)
//   - PLANET_BY_ID and RESOURCES are module-level constants (no `window.*`)
//   - <PlanetOrb> uses the local v2 component (props: name, size, pulse)
//
// Exports:
//   - EscalationSentinelFacilitator   (1440x900) — projector mid-volley
//   - EscalationSentinelAlliance      (1440x900) — alliance window
//   - EscalationSentinelMobilePick / MobileFire  — paired mobile views

import React from 'react'
import { createPortal } from 'react-dom'
import PlanetOrb from '@/components/PlanetOrb'

// ─── Tokens ─────────────────────────────────────────────────
const SN_BG       = '#050308'
const SN_INK      = '#f4efe5'
const SN_DIM      = 'rgba(244,239,229,0.6)'
const SN_FAINT    = 'rgba(244,239,229,0.32)'
const SN_HAIR     = 'rgba(244,239,229,0.10)'
const SN_GOLD     = '#e8c87a'
const SN_RED      = '#d76262'
const SN_BLUE     = '#7aa6e8'
const SN_SERIF    = '"Fraunces", "Source Serif 4", Georgia, serif'
const SN_SANS     = '"Inter Tight", "Inter", system-ui, sans-serif'
const SN_MONO     = '"JetBrains Mono", ui-monospace, monospace'
const SN_EASE     = 'cubic-bezier(0.22, 1, 0.36, 1)'

// Inject keyframes once (browser only)
function injectKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById('sn-keyframes')) return
  const s = document.createElement('style')
  s.id = 'sn-keyframes'
  s.textContent = `
    @keyframes snBreathe { 0%,100% { opacity:0.85; transform:scale(1) } 50% { opacity:1; transform:scale(1.012) } }
    @keyframes snDrift   { 0%   { transform: translate(0,0) }
                           50%  { transform: translate(0,-4px) }
                           100% { transform: translate(0,0) } }
    @keyframes snFadeIn  { from { opacity:0; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }
    @keyframes snPulseDot{ 0%,100% { opacity: 0.4 } 50% { opacity: 1 } }
    @media (prefers-reduced-motion: reduce) {
      [style*="snBreathe"], [style*="snDrift"], [style*="snPulseDot"] { animation: none !important; }
    }
  `
  document.head.appendChild(s)
}

// ─── Planet & resource data ─────────────────────────────────
// Matches the reference data.jsx — id/name/motto for all 10 planets.
export interface Planet {
  id: string
  name: string
  motto: string
}

export const PLANET_BY_ID: Record<string, Planet> = {
  ignis:    { id: 'ignis',    name: 'IGNIS PRIME', motto: 'We burned first. We will burn last.' },
  solara:   { id: 'solara',   name: 'SOLARA',      motto: "If it's not dangerous, it's not worth doing." },
  glacius:  { id: 'glacius',  name: 'GLACIUS',     motto: 'We remember. That is enough.' },
  rosara:   { id: 'rosara',   name: 'ROSARA',      motto: 'Beauty is a weapon.' },
  verdania: { id: 'verdania', name: 'VERDANIA',    motto: 'The garden tends itself.' },
  lumenor:  { id: 'lumenor',  name: 'LUMENOR',     motto: 'We illuminate the path.' },
  dustara:  { id: 'dustara',  name: 'DUSTARA',     motto: 'The storm provides.' },
  aqualis:  { id: 'aqualis',  name: 'AQUALIS',     motto: 'The tide remembers every shore.' },
  voidara:  { id: 'voidara',  name: 'VOIDARA',     motto: 'In silence, certainty.' },
  ferron:   { id: 'ferron',   name: 'FERRON',      motto: 'Steel does not bend.' },
}

export interface Resource {
  id: string
  label: string
  glyph?: string
}

export const RESOURCES: Resource[] = [
  { id: 'energy',  label: 'Energy',  glyph: '⚡' },
  { id: 'oxygen',  label: 'Oxygen',  glyph: '○' },
  { id: 'crew',    label: 'Crew',    glyph: '◉' },
  { id: 'rockets', label: 'Rockets', glyph: '◈' },
]

// ─── Global rocket bus ──────────────────────────────────────
type GLOBAL_T = typeof globalThis & {
  __SN_ROCKET_BUS?: EventTarget
  __SN_GAME?: ReturnType<typeof createSNGame>
}
const SN_ROCKET_BUS: EventTarget = (() => {
  const g = globalThis as GLOBAL_T
  if (!g.__SN_ROCKET_BUS) g.__SN_ROCKET_BUS = new EventTarget()
  return g.__SN_ROCKET_BUS
})()
export function dispatchRocketFire(side: 'A' | 'D', planetId: string) {
  SN_ROCKET_BUS.dispatchEvent(new CustomEvent('fire', { detail: { side, planetId } }))
}

// ─── Shared game state machine ──────────────────────────────
export interface SNGameState {
  phase: 'fire' | 'hit' | 'resolution' | 'done'
  attackerId: string
  defenderId: string
  resource: string
  stake: number
  attackerShots: number
  defenderShots: number
  attackerRockets: number
  defenderRockets: number
  activeTimer: 'response' | 'stalemate' | null
  timerDeadline: number | null
  loser: 'attacker' | 'defender' | null
  attackerStarted: boolean
  revealAt: number | null
  version: number     // bumped on every mutation — used for last-write-wins reconciliation
}

function createSNGame() {
  const listeners = new Set<(s: SNGameState) => void>()
  const initial = (): SNGameState => ({
    phase: 'fire',
    attackerId: 'ignis',
    defenderId: 'aqualis',
    resource: 'oxygen',
    stake: 6,
    attackerShots: 0,
    defenderShots: 0,
    attackerRockets: 5,
    defenderRockets: 5,
    activeTimer: null,
    timerDeadline: null,
    loser: null,
    attackerStarted: false,
    revealAt: null,
    version: 0,
  })
  let state = initial()
  let nextPhaseTimer: ReturnType<typeof setTimeout> | null = null

  const getState = () => state
  const setState = (patch: Partial<SNGameState>) => {
    state = { ...state, ...patch }
    listeners.forEach(fn => fn(state))
  }
  const subscribe = (fn: (s: SNGameState) => void) => { listeners.add(fn); return () => listeners.delete(fn) }

  function scheduleHitToResolution() {
    if (nextPhaseTimer) clearTimeout(nextPhaseTimer)
    nextPhaseTimer = setTimeout(() => {
      setState({ phase: 'resolution', revealAt: performance.now() })
      scheduleResolutionEnd()
    }, 3000)
  }
  function scheduleResolutionEnd() {
    if (nextPhaseTimer) clearTimeout(nextPhaseTimer)
    nextPhaseTimer = setTimeout(() => {
      setState(initial())
    }, 7000)
  }

  function fire(side: 'attacker' | 'defender') {
    if (state.phase !== 'fire') return
    if (!state.attackerStarted && side !== 'attacker') return
    const isA = side === 'attacker'
    const rocketsLeft = isA ? state.attackerRockets : state.defenderRockets
    if (rocketsLeft <= 0) return

    dispatchRocketFire(isA ? 'A' : 'D', isA ? state.attackerId : state.defenderId)

    const aShots = state.attackerShots + (isA ? 1 : 0)
    const dShots = state.defenderShots + (isA ? 0 : 1)
    const aRox = state.attackerRockets - (isA ? 1 : 0)
    const dRox = state.defenderRockets - (isA ? 0 : 1)
    const next: Partial<SNGameState> = {
      attackerShots: aShots, defenderShots: dShots,
      attackerRockets: aRox, defenderRockets: dRox,
      attackerStarted: state.attackerStarted || isA,
    }

    if (aRox === 0 && dRox === 0 && aShots === dShots) {
      setState({ ...next, phase: 'resolution', loser: null, activeTimer: null, timerDeadline: null, revealAt: performance.now() })
      scheduleResolutionEnd()
      return
    }
    if (aRox === 0 && aShots < dShots) {
      setState({ ...next, phase: 'hit', loser: 'attacker', activeTimer: null, timerDeadline: null, revealAt: performance.now() })
      scheduleHitToResolution()
      return
    }
    if (dRox === 0 && dShots < aShots) {
      setState({ ...next, phase: 'hit', loser: 'defender', activeTimer: null, timerDeadline: null, revealAt: performance.now() })
      scheduleHitToResolution()
      return
    }

    const now = performance.now()
    if (aShots === dShots) {
      setState({ ...next, activeTimer: 'stalemate', timerDeadline: now + 15000 })
    } else {
      setState({ ...next, activeTimer: 'response', timerDeadline: now + 10000 })
    }
  }

  function reset() {
    if (nextPhaseTimer) clearTimeout(nextPhaseTimer)
    setState(initial())
  }

  function tickLoop() {
    if (typeof requestAnimationFrame === 'undefined') return
    requestAnimationFrame(tickLoop)
    if (state.phase !== 'fire' || !state.timerDeadline) return
    if (performance.now() >= state.timerDeadline) {
      if (state.activeTimer === 'response') {
        const behind: 'attacker' | 'defender' = state.attackerShots < state.defenderShots ? 'attacker' : 'defender'
        setState({ phase: 'hit', loser: behind, activeTimer: null, timerDeadline: null, revealAt: performance.now() })
        scheduleHitToResolution()
      } else if (state.activeTimer === 'stalemate') {
        setState({ phase: 'resolution', loser: null, activeTimer: null, timerDeadline: null, revealAt: performance.now() })
        scheduleResolutionEnd()
      }
    }
  }
  if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(tickLoop)

  return { getState, setState, subscribe, fire, reset }
}

export const SN_GAME = (() => {
  const g = globalThis as GLOBAL_T
  if (!g.__SN_GAME) g.__SN_GAME = createSNGame()
  return g.__SN_GAME
})()

// ─── Network sync ───────────────────────────────────────────
// Every tab gets a stable random clientId. When a fire/reset is broadcast via
// SSE, the originator's own clientId lets them skip the self-echo (so they
// don't apply the same action twice). Other tabs apply it to their local
// SN_GAME, keeping all surfaces converged within ~50–150ms of the press.
type CLIENT_ID_G = typeof globalThis & { __SN_CLIENT_ID?: string }
export const SN_CLIENT_ID: string = (() => {
  const g = globalThis as CLIENT_ID_G
  if (!g.__SN_CLIENT_ID) {
    g.__SN_CLIENT_ID = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `c-${Math.random().toString(36).slice(2)}-${Date.now()}`
  }
  return g.__SN_CLIENT_ID
})()

// Authoritative fire — POST to /api/sn/fire. Server applies the state
// transition against the canonical KV-backed state and broadcasts the new
// state to all clients (including the sender, who reconciles to the
// server's verdict). Scenario hints let the server seed KV on first touch.
async function broadcastFire(
  sessionId: string,
  side: 'attacker' | 'defender',
  planetId?: string,
  scenario?: { attackerId?: string; defenderId?: string; resource?: string; amount?: number },
): Promise<SNGameState | null> {
  try {
    const r = await fetch('/api/sn/fire', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, side, clientId: SN_CLIENT_ID, planetId, ...(scenario || {}) }),
      keepalive: true,
    })
    if (!r.ok) return null
    const j = await r.json() as { state: SNGameState }
    if (j.state) {
      SN_GAME.setState(j.state)
      return j.state
    }
    return null
  } catch { return null }
}
async function broadcastReset(sessionId: string): Promise<SNGameState | null> {
  try {
    const r = await fetch('/api/sn/reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, clientId: SN_CLIENT_ID }),
      keepalive: true,
    })
    if (!r.ok) return null
    const j = await r.json() as { state: SNGameState }
    if (j.state) {
      SN_GAME.setState(j.state)
      return j.state
    }
    return null
  } catch { return null }
}

// Push scenario to KV so the polling backstop sees the right principals/stake
// instead of falling back to defaults. Called when the Sentinel components
// mount with specific scenario props.
async function broadcastScenario(
  sessionId: string,
  scenario: { attackerId: string; defenderId: string; resource: string; amount: number },
): Promise<SNGameState | null> {
  try {
    const r = await fetch('/api/sn/scenario', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, clientId: SN_CLIENT_ID, ...scenario }),
      keepalive: true,
    })
    if (!r.ok) return null
    const j = await r.json() as { state: SNGameState }
    if (j.state) {
      SN_GAME.setState(j.state)
      return j.state
    }
    return null
  } catch { return null }
}

// Apply an SSE-delivered SN event from another client to the local SN_GAME.
// Pages already have an EventSource subscription; they call this from the
// `onmessage` handler for SN_STATE events (server-authoritative full-state
// broadcasts) as well as legacy SN_FIRE/SN_RESET event-style broadcasts.
//
// SN_STATE: replaces the entire local SN_GAME state with the server's
// authoritative snapshot. The local state machine is just a cache.
// Self-echo isn't skipped for SN_STATE — even the sender benefits from
// reconciling to the server's view (catches race conditions).
export function applySNEvent(evt: {
  type: string;
  side?: 'attacker' | 'defender';
  clientId?: string;
  state?: Partial<SNGameState>;
}) {
  if (!evt || !evt.type) return
  if (evt.type === 'SN_STATE' && evt.state) {
    // Only replace if the broadcast version is newer than what we have.
    const cur = SN_GAME.getState() as SNGameState & { version?: number }
    const broadcastVer = (evt.state as { version?: number }).version ?? 0
    const localVer = cur.version ?? 0
    if (broadcastVer >= localVer) {
      SN_GAME.setState(evt.state)
    }
    return
  }
  // Legacy event-style broadcasts (kept for compatibility with older clients).
  if (evt.clientId && evt.clientId === SN_CLIENT_ID) return
  if (evt.type === 'SN_FIRE' && (evt.side === 'attacker' || evt.side === 'defender')) {
    SN_GAME.fire(evt.side)
  } else if (evt.type === 'SN_RESET') {
    SN_GAME.reset()
  }
}

// Poll the authoritative state from the server. Use as a reliability
// backstop in case SSE drops a broadcast. Returns the fetched state (or null).
export async function fetchSNState(sessionId: string) {
  try {
    const r = await fetch(`/api/sn/state?sessionId=${encodeURIComponent(sessionId)}`)
    if (!r.ok) return null
    const j = await r.json() as { state: SNGameState & { version: number } }
    if (j.state) {
      const cur = SN_GAME.getState() as SNGameState & { version?: number }
      if ((j.state.version ?? 0) >= (cur.version ?? 0)) {
        SN_GAME.setState(j.state)
      }
      return j.state
    }
    return null
  } catch { return null }
}

export function useSNGame(): SNGameState {
  const [state, setLocal] = React.useState(SN_GAME.getState())
  React.useEffect(() => SN_GAME.subscribe(setLocal) as () => void, [])
  return state
}
export function useAnimationFrame() {
  const [, setT] = React.useState(0)
  React.useEffect(() => {
    let raf: number
    const tick = () => { setT(t => t + 1); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
}

// ─── Small atoms ────────────────────────────────────────────
function SNRule({ width = '100%', accent = SN_HAIR, opacity = 1, style = {} }: { width?: number | string; accent?: string; opacity?: number; style?: React.CSSProperties }) {
  return <div style={{ position: 'relative', width, height: 1, background: accent, opacity, ...style }} />
}

function SNLabel({ children, color = SN_FAINT, size = 10, style = {} }: { children: React.ReactNode; color?: string; size?: number | string; style?: React.CSSProperties }) {
  return <div style={{
    fontFamily: SN_MONO, fontSize: size, letterSpacing: '0.32em',
    color, textTransform: 'uppercase', fontWeight: 500, ...style,
  }}>{children}</div>
}

function SNCountdownArc({ size = 240, remaining = 5, total = 10, color = SN_GOLD, thickness = 1.5, showNumber = true }: { size?: number; remaining?: number; total?: number; color?: string; thickness?: number; showNumber?: boolean }) {
  const r = (size / 2) - 8
  const C = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, remaining / total))
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={SN_HAIR} strokeWidth="1"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={`${C * frac} ${C}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          strokeLinecap="round"
          style={{ transition: `stroke-dasharray 0.4s ${SN_EASE}` }}/>
      </svg>
      {showNumber && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontFamily: SN_SERIF, fontSize: size * 0.34, fontWeight: 300, fontStyle: 'italic', lineHeight: 1, color: SN_INK }}>
            {Math.ceil(remaining)}
          </div>
          <div style={{ fontFamily: SN_MONO, fontSize: 9, letterSpacing: '0.4em', color: SN_FAINT }}>
            SECONDS
          </div>
        </div>
      )}
    </div>
  )
}

interface SNRocketProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  progress?: number
  color?: string
  thickness?: number
  archHeight?: number
}

function SNRocket({ from, to, progress = 0.5, color = SN_GOLD, thickness = 2, archHeight = 180 }: SNRocketProps) {
  const cx = (from.x + to.x) / 2
  const cy = Math.min(from.y, to.y) - archHeight
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  const pBody = Math.min(1, Math.max(0, progress))
  const bx = lerp(lerp(from.x, cx, pBody), lerp(cx, to.x, pBody), pBody)
  const by = lerp(lerp(from.y, cy, pBody), lerp(cy, to.y, pBody), pBody)
  const dx = lerp(cx, to.x, pBody) - lerp(from.x, cx, pBody)
  const dy = lerp(cy, to.y, pBody) - lerp(from.y, cy, pBody)
  const ang = Math.atan2(dy, dx) * 180 / Math.PI

  const m = Math.hypot(dx, dy) || 1
  const tx = dx / m, ty = dy / m

  const impact = progress >= 1
  const impactAge = Math.max(0, progress - 1)
  const showFlash = impact && impactAge < 0.5
  const ringR = thickness * (10 + impactAge * 80)
  const ringOp = Math.max(0, 1 - impactAge * 2)

  const id = `sn-rk-${color.replace('#','')}-${Math.round(from.x)}-${Math.round(from.y)}-${Math.round(to.x)}-${Math.round(to.y)}`

  const flameLen = thickness * 28
  const flameTailX = bx - tx * flameLen
  const flameTailY = by - ty * flameLen

  const noseLen = thickness * 4.5
  const bodyHalf = thickness * 1.1

  return (
    <g>
      <defs>
        <linearGradient id={`${id}-wake`} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse"
          gradientTransform={`translate(${from.x} ${from.y}) rotate(${ang})`}>
          <stop offset="0%"  stopColor={color} stopOpacity="0"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.22"/>
        </linearGradient>
        <linearGradient id={`${id}-flame`} x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse"
          gradientTransform={`translate(${flameTailX} ${flameTailY}) rotate(${ang})`}>
          <stop offset="0%"   stopColor={color} stopOpacity="0"/>
          <stop offset="45%"  stopColor={color} stopOpacity="0.7"/>
          <stop offset="85%"  stopColor="#ffd9a0" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1"/>
        </linearGradient>
        <radialGradient id={`${id}-bloom`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="35%"  stopColor={color} stopOpacity="0.9"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </radialGradient>
      </defs>

      {!impact && (<>
        <path
          d={`M ${from.x} ${from.y} Q ${cx} ${cy}, ${bx} ${by}`}
          fill="none"
          stroke={`url(#${id}-wake)`}
          strokeWidth={thickness * 0.9}
          strokeLinecap="round"
        />
        <line
          x1={flameTailX} y1={flameTailY} x2={bx} y2={by}
          stroke={`url(#${id}-flame)`}
          strokeWidth={thickness * 1.6}
          strokeLinecap="round"
        />
        <line
          x1={flameTailX} y1={flameTailY} x2={bx} y2={by}
          stroke={color}
          strokeOpacity="0.25"
          strokeWidth={thickness * 5}
          strokeLinecap="round"
        />
        <g transform={`translate(${bx} ${by}) rotate(${ang})`}>
          <ellipse cx={-noseLen * 0.4} cy="0" rx={noseLen * 0.9} ry={bodyHalf * 1.8}
            fill={`url(#${id}-bloom)`} opacity="0.8"/>
          <path
            d={`M ${noseLen} 0 L ${-noseLen * 0.7} ${-bodyHalf} L ${-noseLen * 0.7} ${bodyHalf} Z`}
            fill="#ffffff"
            stroke={color}
            strokeWidth="0.6"
          />
          <path
            d={`M ${noseLen * 0.7} 0 L ${-noseLen * 0.4} ${-bodyHalf * 0.45} L ${-noseLen * 0.4} ${bodyHalf * 0.45} Z`}
            fill="#ffd9a0"
            opacity="0.9"
          />
        </g>
      </>)}

      {showFlash && (
        <g transform={`translate(${to.x} ${to.y})`}>
          <circle r={thickness * 14 * (1 - impactAge)} fill={`url(#${id}-bloom)`} opacity={0.7 * (1 - impactAge)}/>
          <circle r={thickness * 5 * (1 - impactAge * 1.4)} fill="#ffffff" opacity={Math.max(0, 0.95 - impactAge * 2)}/>
          <circle r={ringR} fill="none" stroke={color} strokeOpacity={ringOp} strokeWidth="1.5"/>
          <circle r={ringR * 1.4} fill="none" stroke={color} strokeOpacity={ringOp * 0.4} strokeWidth="1"/>
        </g>
      )}
    </g>
  )
}

function SNStarfield({ density = 1 }: { density?: number }) {
  const ref = React.useRef<HTMLCanvasElement | null>(null)
  React.useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const r = c.getBoundingClientRect()
      c.width = r.width * dpr; c.height = r.height * dpr
    }
    resize()
    const layers = [0.4, 0.7, 1.0].map((depth) => {
      const stars: Array<{ x: number; y: number; r: number; a: number; tw: number; ph: number }> = []
      const count = Math.floor((c.width * c.height) / 14000 * density * depth)
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * c.width,
          y: Math.random() * c.height,
          r: (Math.random() * 1.1 + 0.25) * dpr * depth,
          a: 0.25 + Math.random() * 0.55 * depth,
          tw: 0.6 + Math.random() * 1.4,
          ph: Math.random() * Math.PI * 2,
        })
      }
      return { stars, depth }
    })
    const reduce = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf: number
    const t0 = performance.now()
    const draw = () => {
      const t = (performance.now() - t0) / 1000
      ctx.clearRect(0, 0, c.width, c.height)
      for (const { stars, depth } of layers) {
        const drift = reduce ? 0 : Math.sin(t * 0.08) * 6 * depth * dpr
        for (const s of stars) {
          const a = reduce ? s.a : Math.max(0.05, s.a + Math.sin(t * s.tw + s.ph) * 0.15 * s.a)
          ctx.fillStyle = `rgba(255,245,225,${a})`
          ctx.beginPath()
          ctx.arc(s.x + drift, s.y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw)   // static single frame when reduced motion
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [density])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}/>
}

function SNBackdrop({ tintLeft = SN_RED, tintRight = SN_BLUE, opacity = 0.18 }: { tintLeft?: string; tintRight?: string; opacity?: number }) {
  const hex = Math.round(opacity * 255).toString(16).padStart(2,'0')
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 60% 60% at 0% 50%, ${tintLeft}${hex} 0%, transparent 50%),
                     radial-gradient(ellipse 60% 60% at 100% 50%, ${tintRight}${hex} 0%, transparent 50%)`,
      }}/>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 0 200px rgba(0,0,0,0.85), inset 0 0 60px rgba(0,0,0,0.55)',
      }}/>
    </>
  )
}

function SNMasthead({ left, center, right }: { left: string; center: string; right: string }) {
  return (
    <div style={{ position: 'relative', padding: '20px 40px 14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <SNLabel>{left}</SNLabel>
        <SNLabel color={SN_GOLD} style={{ textAlign: 'center' }}>{center}</SNLabel>
        <SNLabel style={{ textAlign: 'right' }}>{right}</SNLabel>
      </div>
      <SNRule style={{ marginTop: 14 }}/>
    </div>
  )
}

function SNAlly({ planet, side = 'attack', size = 36, registerRef = null }: { planet: Planet; side?: 'attack' | 'defend'; size?: number; registerRef?: ((id: string, node: HTMLElement | null) => void) | null }) {
  const accent = side === 'attack' ? SN_RED : SN_BLUE
  const orbRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    if (registerRef) registerRef(planet.id, orbRef.current)
    return () => { if (registerRef) registerRef(planet.id, null) }
  }, [planet.id, registerRef])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
      <div ref={orbRef} style={{ position: 'relative', width: size, height: size, overflow: 'visible' }}>
        <PlanetOrb name={planet.name} size={size}/>
      </div>
      <div style={{ fontFamily: SN_SERIF, fontSize: 12, fontStyle: 'italic', color: SN_INK, letterSpacing: '-0.005em' }}>
        {planet.name.charAt(0) + planet.name.slice(1).toLowerCase()}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent, boxShadow: `0 0 5px ${accent}` }}/>
        <span style={{ fontFamily: SN_MONO, fontSize: 8, letterSpacing: '0.28em', color: SN_FAINT }}>COMMITTED</span>
      </div>
    </div>
  )
}

// Render an artboard-px value as a full-bleed responsive length that tracks the
// SAME uniform "contain" scale as the composition: P px on the 1440×900 board
// === min(P/14.4 vw, P/9 vh). Used for full-bleed overlay text so it grows with
// the viewport exactly like the scaled scene does, with no distortion.
const snPx = (p: number) => `min(${(p / 14.4).toFixed(4)}vw, ${(p / 9).toFixed(4)}vh)`

// ─── Stage: full-bleed backdrop + uniform-scaled, centered composition ───
// The big-screen escalation surfaces are authored on a fixed 1440×900 artboard.
// To fill ANY viewport with no letterbox bars AND no distortion we:
//   • bleed the starfield + red/blue washes edge-to-edge (the full viewport), and
//   • uniformly scale (contain) the 1440×900 composition and center it on top.
// The "letterbox" region around the composition is just more backdrop, so the
// bars disappear. Uniform scale keeps planets perfectly circular and rockets
// dead-on-target, so the rocket/shockwave geometry needs no changes at all.
// `overlay` renders full-bleed (un-scaled) above everything — used for the
// hit/resolution washes that must cover the whole screen; their type uses
// snPx() so it tracks the same scale. Portals to <body> to escape the
// dashboard's `zoom`/transform containers.
function SNStage({ children, overlay }: { children: React.ReactNode; overlay?: React.ReactNode }) {
  const [scale, setScale] = React.useState(1)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
    const onResize = () => setScale(Math.min(window.innerWidth / 1440, window.innerHeight / 900))
    onResize()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])
  if (!mounted) return null
  const node = (
    <div style={{ position: 'fixed', inset: 0, background: SN_BG, zIndex: 200, overflow: 'hidden' }}>
      {/* Full-bleed ambience — fills every pixel so no bars are visible */}
      <SNStarfield density={1.0}/>
      <SNBackdrop tintLeft={SN_RED} tintRight={SN_BLUE} opacity={0.18}/>
      {/* Composition — uniform scale (circular planets, on-target rockets), centered */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 1440, height: 900,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      }}>
        {children}
      </div>
      {overlay}
    </div>
  )
  return createPortal(node, document.body)
}

// ─── 4A. Facilitator (1440×900) — fire → hit → resolution ───
interface EscalationSentinelProps {
  attackerId?: string
  defenderId?: string
  resource?: string
  amount?: number
  // When provided, the facilitator polls /api/sn/state as a reliability
  // backstop so a dropped SSE broadcast can't desync the projector.
  sessionId?: string
}

export function EscalationSentinelFacilitator({
  attackerId = 'ignis',
  defenderId = 'aqualis',
  resource = 'oxygen',
  amount = 6,
  sessionId,
}: EscalationSentinelProps = {}) {
  React.useEffect(() => { injectKeyframes() }, [])
  React.useEffect(() => {
    const s = SN_GAME.getState()
    if (s.attackerId !== attackerId || s.defenderId !== defenderId || s.resource !== resource || s.stake !== amount) {
      SN_GAME.reset()
      SN_GAME.setState({ attackerId, defenderId, resource, stake: amount })
    }
    // Push the scenario to KV so the polling backstop sees the right
    // principals instead of stale defaults from a previous escalation.
    if (sessionId) broadcastScenario(sessionId, { attackerId, defenderId, resource, amount })
  }, [attackerId, defenderId, resource, amount, sessionId])

  // Reliability backstop — same as mobile.
  React.useEffect(() => {
    if (!sessionId) return
    fetchSNState(sessionId)
    const id = setInterval(() => { fetchSNState(sessionId) }, 1500)
    return () => clearInterval(id)
  }, [sessionId])

  const game = useSNGame()
  useAnimationFrame()

  const A = PLANET_BY_ID[game.attackerId]
  const D = PLANET_BY_ID[game.defenderId]
  const R = RESOURCES.find(r => r.id === game.resource) || { id: game.resource, label: game.resource }

  const aAllies = ['solara','ferron','dustara'].map(id => PLANET_BY_ID[id])
  const dAllies = ['glacius','verdania','lumenor','rosara'].map(id => PLANET_BY_ID[id])

  const W = 1440, H = 900
  const aCenter = { x: 280, y: 470 }
  const dCenter = { x: W - 280, y: 470 }
  const aPrincipalLaunch = { x: aCenter.x + 130, y: aCenter.y - 20 }
  const dPrincipalLaunch = { x: dCenter.x - 130, y: dCenter.y - 20 }
  const tgtA = { x: dCenter.x - 130, y: dCenter.y }
  const tgtD = { x: aCenter.x + 130, y: aCenter.y }

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const planetNodesRef = React.useRef<Map<string, HTMLElement>>(new Map())
  const registerPlanetRef = React.useCallback((planetId: string, node: HTMLElement | null) => {
    if (node) planetNodesRef.current.set(planetId, node)
    else planetNodesRef.current.delete(planetId)
  }, [])

  interface InFlight { id: number; side: 'A' | 'D'; planetId: string; from: { x: number; y: number }; t0: number; duration: number; jitter: number; archJitter: number }
  const [rockets, setRockets] = React.useState<InFlight[]>([])
  const [now, setNow] = React.useState(performance.now())
  React.useEffect(() => {
    if (rockets.length === 0) return
    let raf: number
    const tick = (t: number) => { setNow(t); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [rockets.length])
  React.useEffect(() => {
    if (rockets.length === 0) return
    const timeoutId = setTimeout(() => {
      const t = performance.now()
      setRockets(rs => rs.filter(r => (t - r.t0) / 1000 < r.duration + 0.55))
    }, 700)
    return () => clearTimeout(timeoutId)
  }, [rockets, now])

  const launchFor = React.useCallback((planetId: string) => {
    if (planetId === game.attackerId) return aPrincipalLaunch
    if (planetId === game.defenderId) return dPrincipalLaunch
    const node = planetNodesRef.current.get(planetId)
    const root = rootRef.current
    if (!node || !root) return null
    const nr = node.getBoundingClientRect()
    const rr = root.getBoundingClientRect()
    const scaleX = rr.width / W
    const scaleY = rr.height / H
    return {
      x: (nr.left + nr.width / 2 - rr.left) / scaleX,
      y: (nr.top + nr.height / 2 - rr.top) / scaleY,
    }
  }, [game.attackerId, game.defenderId, aPrincipalLaunch, dPrincipalLaunch])

  const nextIdRef = React.useRef(1)
  React.useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ side: 'A' | 'D'; planetId: string }>
      const { side, planetId } = ce.detail || {} as { side?: 'A' | 'D'; planetId?: string }
      if (!side || !planetId) return
      const from = launchFor(planetId)
      if (!from) return
      const id = nextIdRef.current++
      setRockets(rs => [...rs, {
        id, side, planetId, from,
        t0: performance.now(),
        duration: 1.4,
        jitter: (Math.random() - 0.5) * 28,
        archJitter: (Math.random() - 0.5) * 60,
      }])
    }
    SN_ROCKET_BUS.addEventListener('fire', handler)
    return () => SN_ROCKET_BUS.removeEventListener('fire', handler)
  }, [launchFor])

  // Launch a rocket for every shot the authoritative state gains. Remote fires
  // arrive here as SN_STATE snapshots (via SSE / the poll backstop), NOT as
  // local SN_GAME.fire() calls — and only fire() dispatches the rocket bus. So
  // the projector must drive the bus off the shot-count delta, or it never
  // animates rockets for fires that happened on players' phones. The facilitator
  // never fires locally, so there's no double-launch.
  const prevShotsRef = React.useRef<{ a: number; d: number } | null>(null)
  React.useEffect(() => {
    const a = game.attackerShots, d = game.defenderShots
    const prev = prevShotsRef.current
    prevShotsRef.current = { a, d }
    if (prev === null) return   // first observation — set baseline, don't burst on mid-game join
    for (let i = 0; i < a - prev.a; i++) dispatchRocketFire('A', game.attackerId)
    for (let i = 0; i < d - prev.d; i++) dispatchRocketFire('D', game.defenderId)
  }, [game.attackerShots, game.defenderShots, game.attackerId, game.defenderId])

  const easeInOutCubic = (u: number) => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2

  const tNow = performance.now()
  const tRemainMs = game.timerDeadline ? Math.max(0, game.timerDeadline - tNow) : 0
  const tRemainS = tRemainMs / 1000
  const timerVisible =
    (game.activeTimer === 'response'  && tRemainMs <= 5000) ||
    (game.activeTimer === 'stalemate' && tRemainMs <= 10000)
  const timerColor = game.activeTimer === 'response' ? SN_RED : SN_GOLD
  const behind: 'attacker' | 'defender' | null = game.attackerShots < game.defenderShots ? 'attacker'
                : game.attackerShots > game.defenderShots ? 'defender'
                : null

  // Hit / resolution take over the WHOLE screen (not just the scaled artboard),
  // so they render full-bleed in the stage overlay with snPx() type that tracks
  // the composition's scale. No seam, no letterbox, undistorted.
  const phaseOverlay = (
    <>
      {game.phase === 'hit' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${SN_RED}33, transparent 70%), rgba(5,3,8,0.65)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          animation: 'snFadeIn 0.4s ease-out', pointerEvents: 'none', textAlign: 'center', padding: '0 4vw',
        }}>
          <SNLabel color={SN_RED} size={snPx(13)} style={{ letterSpacing: '0.5em' }}>DIRECT HIT</SNLabel>
          <div style={{
            fontFamily: SN_SERIF, fontSize: snPx(140), fontWeight: 300, fontStyle: 'italic',
            letterSpacing: '-0.04em', lineHeight: 1, marginTop: snPx(8),
            color: SN_INK, textShadow: `0 0 40px ${SN_RED}88`, whiteSpace: 'nowrap',
          }}>
            {game.loser === 'attacker'
              ? <>{A.name.charAt(0) + A.name.slice(1).toLowerCase()}<span style={{ color: SN_RED }}> falls.</span></>
              : <>{D.name.charAt(0) + D.name.slice(1).toLowerCase()}<span style={{ color: SN_RED }}> falls.</span></>}
          </div>
          <SNLabel color={SN_DIM} size={snPx(11)} style={{ marginTop: snPx(28) }}>
            {game.loser === 'attacker' ? `${A.name} FAILED TO RESPOND` : `${D.name} FAILED TO RESPOND`}
          </SNLabel>
        </div>
      )}
      {game.phase === 'resolution' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${SN_GOLD}1a, transparent 70%), rgba(5,3,8,0.7)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          animation: 'snFadeIn 0.4s ease-out', pointerEvents: 'none', textAlign: 'center', padding: '0 4vw',
        }}>
          {game.loser === null ? (
            <>
              <SNLabel color={SN_GOLD} size={snPx(13)} style={{ letterSpacing: '0.5em' }}>STALEMATE</SNLabel>
              <div style={{
                fontFamily: SN_SERIF, fontSize: snPx(110), fontWeight: 300, fontStyle: 'italic',
                letterSpacing: '-0.04em', lineHeight: 1, marginTop: snPx(8), color: SN_INK,
              }}>
                A <span style={{ color: SN_GOLD }}>draw</span>.
              </div>
              <SNLabel color={SN_DIM} size={snPx(11)} style={{ marginTop: snPx(28) }}>NO RESOURCES EXCHANGED</SNLabel>
            </>
          ) : (
            <>
              <SNLabel color={SN_GOLD} size={snPx(13)} style={{ letterSpacing: '0.5em' }}>SETTLEMENT</SNLabel>
              <div style={{
                fontFamily: SN_SERIF, fontSize: snPx(92), fontWeight: 300, fontStyle: 'italic',
                letterSpacing: '-0.03em', lineHeight: 1.05, marginTop: snPx(12), color: SN_INK,
                whiteSpace: 'nowrap',
              }}>
                {game.stake} <span style={{ color: SN_GOLD }}>{R.label}</span>
              </div>
              <div style={{
                fontFamily: SN_SERIF, fontSize: snPx(30), fontStyle: 'italic',
                color: SN_DIM, marginTop: snPx(14),
              }}>
                {game.loser === 'attacker' ? D.name : A.name} <span style={{ color: SN_GOLD, fontStyle: 'normal' }}>←</span>{' '}
                {game.loser === 'attacker' ? A.name : D.name}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )

  return (
    <SNStage overlay={phaseOverlay}>
    <div ref={rootRef} style={{
      width: W, height: H, color: SN_INK,
      fontFamily: SN_SANS, position: 'relative', overflow: 'hidden',
    }}>
      <SNMasthead
        left="NEBULA ALLIANCE · CH. II"
        center={
          game.phase === 'hit' ? '● DIRECT HIT' :
          game.phase === 'resolution' ? '● RESOLUTION' :
          '● ROCKET STRIKE · LIVE'
        }
        right="SECTOR 07 · HOLLOW RING"
      />

      <div style={{ position: 'absolute', top: 110, left: 60, maxWidth: 520 }}>
        <SNLabel color={SN_RED}>◤ AGGRESSOR</SNLabel>
        <div style={{
          fontFamily: SN_SERIF, fontSize: 84, fontWeight: 300, fontStyle: 'italic',
          letterSpacing: '-0.03em', lineHeight: 0.95, marginTop: 8, color: SN_INK,
          whiteSpace: 'nowrap',
        }}>
          {A.name.charAt(0) + A.name.slice(1).toLowerCase()}<span style={{ color: SN_RED }}>.</span>
        </div>
        <div style={{ fontFamily: SN_SERIF, fontSize: 15, fontStyle: 'italic', color: SN_DIM, marginTop: 6, lineHeight: 1.4, maxWidth: 360 }}>
          {A.motto}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 110, right: 60, maxWidth: 520, textAlign: 'right' }}>
        <SNLabel color={SN_BLUE} style={{ textAlign: 'right' }}>DEFENDER ◢</SNLabel>
        <div style={{
          fontFamily: SN_SERIF, fontSize: 84, fontWeight: 300, fontStyle: 'italic',
          letterSpacing: '-0.03em', lineHeight: 0.95, marginTop: 8, color: SN_INK,
          whiteSpace: 'nowrap',
        }}>
          {D.name.charAt(0) + D.name.slice(1).toLowerCase()}<span style={{ color: SN_BLUE }}>.</span>
        </div>
        <div style={{ fontFamily: SN_SERIF, fontSize: 15, fontStyle: 'italic', color: SN_DIM, marginTop: 6, lineHeight: 1.4, maxWidth: 360, marginLeft: 'auto' }}>
          {D.motto}
        </div>
      </div>

      <div style={{ position: 'absolute', top: 280, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', width: 380 }}>
        <SNLabel>RESOURCE AT STAKE</SNLabel>
        <div style={{
          fontFamily: SN_SERIF, fontSize: 56, fontWeight: 300, fontStyle: 'italic',
          letterSpacing: '-0.04em', lineHeight: 1, marginTop: 8, color: SN_GOLD,
        }}>
          {R.label}<span style={{ color: SN_INK }}>.</span>
          <span style={{ color: SN_INK, opacity: 0.85, fontSize: 28, marginLeft: 10 }}>× {game.stake}</span>
        </div>

        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end' }}>
          <div style={{ textAlign: 'center' }}>
            <SNLabel color={SN_RED}>SHOTS · {A.name}</SNLabel>
            <div style={{
              fontFamily: SN_SERIF, fontSize: 64, fontWeight: 300, fontStyle: 'italic',
              color: SN_RED, lineHeight: 1, marginTop: 4,
            }}>
              {game.attackerShots}
            </div>
            <div style={{ fontFamily: SN_MONO, fontSize: 9, letterSpacing: '0.25em', color: SN_FAINT, marginTop: 8 }}>
              {game.attackerRockets} ROCKETS LEFT
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <SNLabel color={SN_BLUE}>SHOTS · {D.name}</SNLabel>
            <div style={{
              fontFamily: SN_SERIF, fontSize: 64, fontWeight: 300, fontStyle: 'italic',
              color: SN_BLUE, lineHeight: 1, marginTop: 4,
            }}>
              {game.defenderShots}
            </div>
            <div style={{ fontFamily: SN_MONO, fontSize: 9, letterSpacing: '0.25em', color: SN_FAINT, marginTop: 8 }}>
              {game.defenderRockets} ROCKETS LEFT
            </div>
          </div>
        </div>

        <div style={{ marginTop: 22, minHeight: 110 }}>
          {!game.attackerStarted && game.phase === 'fire' && (
            <SNLabel color={SN_GOLD} style={{ animation: 'snPulseDot 1.5s ease-in-out infinite' }}>
              ● {A.name} TO FIRE FIRST
            </SNLabel>
          )}
          {game.attackerStarted && game.phase === 'fire' && game.activeTimer && !timerVisible && (
            <SNLabel color={SN_DIM} style={{ letterSpacing: '0.4em' }}>
              ● {game.activeTimer === 'stalemate' ? 'STALEMATE PENDING' : `${behind === 'attacker' ? A.name : D.name} MUST RESPOND`}
            </SNLabel>
          )}
          {timerVisible && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <SNLabel color={timerColor} style={{ letterSpacing: '0.4em' }}>
                {game.activeTimer === 'response'
                  ? `${behind === 'attacker' ? A.name : D.name} MUST RESPOND`
                  : 'STALEMATE'}
              </SNLabel>
              <div style={{
                fontFamily: SN_SERIF, fontSize: 76, fontWeight: 300, fontStyle: 'italic',
                color: timerColor, lineHeight: 1,
                textShadow: `0 0 24px ${timerColor}77`,
              }}>
                {Math.ceil(tRemainS)}<span style={{ fontSize: 28, color: SN_DIM, marginLeft: 8 }}>s</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={(node) => registerPlanetRef(game.attackerId, node)}
        style={{
          position: 'absolute', left: aCenter.x - 130, top: aCenter.y - 130,
          width: 260, height: 260, overflow: 'visible',
          animation: 'snDrift 6s ease-in-out infinite',
        }}>
        <PlanetOrb name={A.name} size={260}/>
      </div>
      <div
        ref={(node) => registerPlanetRef(game.defenderId, node)}
        style={{
          position: 'absolute', left: dCenter.x - 130, top: dCenter.y - 130,
          width: 260, height: 260, overflow: 'visible',
          animation: 'snDrift 6s ease-in-out infinite 1.2s',
        }}>
        <PlanetOrb name={D.name} size={260}/>
      </div>

      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {rockets.map(r => {
          const u = (now - r.t0) / 1000 / r.duration
          if (u >= 1.55) return null
          const phase = u >= 1 ? u : easeInOutCubic(u)
          const isAttacker = r.side === 'A'
          const to = isAttacker
            ? { x: tgtA.x, y: tgtA.y + r.jitter }
            : { x: tgtD.x, y: tgtD.y + r.jitter }
          return (
            <SNRocket key={r.id} from={r.from} to={to} progress={phase}
              color={isAttacker ? SN_RED : SN_BLUE}
              thickness={2.4} archHeight={170 + r.archJitter}/>
          )
        })}
      </svg>

      <div style={{ position: 'absolute', bottom: 60, left: 60, display: 'flex', alignItems: 'center', gap: 18 }}>
        <SNLabel color={SN_RED}>◤ STRIKING · {1 + aAllies.length}</SNLabel>
        <div style={{ width: 1, height: 40, background: SN_HAIR }}/>
        <div style={{ display: 'flex', gap: 24 }}>
          {aAllies.map(p => <SNAlly key={p.id} planet={p} side="attack" registerRef={registerPlanetRef}/>)}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 60, right: 60, display: 'flex', alignItems: 'center', gap: 18, flexDirection: 'row-reverse' }}>
        <SNLabel color={SN_BLUE} style={{ textAlign: 'right' }}>SHIELDING · {1 + dAllies.length} ◢</SNLabel>
        <div style={{ width: 1, height: 40, background: SN_HAIR }}/>
        <div style={{ display: 'flex', gap: 24, flexDirection: 'row-reverse' }}>
          {dAllies.map(p => <SNAlly key={p.id} planet={p} side="defend" registerRef={registerPlanetRef}/>)}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 20, left: 40, right: 40,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: SN_MONO, fontSize: 9, letterSpacing: '0.32em', color: SN_FAINT,
      }}>
        <span>NEBULA.LIVE/0420A</span>
        <span style={{ color: SN_DIM }}>
          {A.name.slice(0,3)} {game.attackerShots} : {game.defenderShots} {D.name.slice(0,3)}
          {game.activeTimer ? ` · ${game.activeTimer.toUpperCase()}` : ''}
        </span>
        <span>SYNC OK</span>
      </div>

    </div>
    </SNStage>
  )
}

// ─── 4B. Alliance window (1440×900) ────────────────────────
export function EscalationSentinelAlliance({
  attackerId = 'ignis',
  defenderId = 'aqualis',
  resource = 'oxygen',
  amount = 6,
}: EscalationSentinelProps = {}) {
  React.useEffect(() => { injectKeyframes() }, [])
  const A = PLANET_BY_ID[attackerId]
  const D = PLANET_BY_ID[defenderId]
  const R = RESOURCES.find(r => r.id === resource) || { id: resource, label: resource }

  const aAllies = ['solara','ferron'].map(id => PLANET_BY_ID[id])
  const dAllies = ['glacius','verdania','lumenor'].map(id => PLANET_BY_ID[id])
  const undecided = ['rosara','dustara','voidara'].map(id => PLANET_BY_ID[id])

  const [t, setT] = React.useState(0)
  React.useEffect(() => {
    let raf: number
    const start = performance.now()
    const tick = (now: number) => { setT((now - start) / 1000); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const remaining = Math.max(0, 10 - (t % 10))

  const W = 1440, H = 900

  return (
    <SNStage>
    <div style={{
      width: W, height: H, color: SN_INK,
      fontFamily: SN_SANS, position: 'relative', overflow: 'hidden',
    }}>
      <SNMasthead
        left="NEBULA ALLIANCE · CH. II"
        center="● ALLIANCE WINDOW · CHOOSE A SIDE"
        right="10-SECOND COMMIT"
      />

      <div style={{ position: 'absolute', top: 90, left: 0, right: 0, padding: '0 80px', textAlign: 'center' }}>
        <div style={{
          fontFamily: SN_SERIF, fontSize: 110, fontWeight: 300, fontStyle: 'italic',
          letterSpacing: '-0.04em', lineHeight: 0.95, whiteSpace: 'nowrap', color: SN_INK,
        }}>
          <span style={{ color: SN_RED }}>{A.name.charAt(0) + A.name.slice(1).toLowerCase()}</span>
          <span style={{ color: SN_INK, opacity: 0.5, fontStyle: 'normal', fontFamily: SN_SERIF, fontWeight: 300, margin: '0 28px' }}>vs</span>
          <span style={{ color: SN_BLUE }}>{D.name.charAt(0) + D.name.slice(1).toLowerCase()}</span>
          <span style={{ color: SN_GOLD }}>.</span>
        </div>
        <div style={{
          fontFamily: SN_SERIF, fontSize: 22, fontStyle: 'italic', color: SN_DIM, marginTop: 16,
        }}>
          for <span style={{ color: SN_GOLD }}>{R.label}</span> × {amount}
        </div>
      </div>

      <div style={{ position: 'absolute', top: 320, left: '50%', transform: 'translateX(-50%)' }}>
        <SNCountdownArc size={240} remaining={remaining} total={10} color={SN_GOLD}/>
      </div>

      <div style={{ position: 'absolute', bottom: 110, left: 60, width: 420 }}>
        <SNLabel color={SN_RED}>◤ STRIKING · {1 + aAllies.length}</SNLabel>
        <div style={{
          marginTop: 14, padding: 18, display: 'flex', alignItems: 'center', gap: 18,
          border: `1px solid ${SN_RED}33`, background: `${SN_RED}08`,
          animation: 'snFadeIn 0.6s ease-out',
        }}>
          <div style={{ width: 80, height: 80, overflow: 'visible', flexShrink: 0 }}>
            <PlanetOrb name={A.name} size={80}/>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: SN_SERIF, fontSize: 26, fontWeight: 300, fontStyle: 'italic', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {A.name.charAt(0) + A.name.slice(1).toLowerCase()}
            </div>
            <SNLabel color={SN_RED} style={{ marginTop: 4 }}>PRINCIPAL</SNLabel>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 20 }}>
          {aAllies.map(p => <SNAlly key={p.id} planet={p} side="attack"/>)}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 110, right: 60, width: 420, textAlign: 'right' }}>
        <SNLabel color={SN_BLUE} style={{ textAlign: 'right' }}>SHIELDING · {1 + dAllies.length} ◢</SNLabel>
        <div style={{
          marginTop: 14, padding: 18, display: 'flex', alignItems: 'center', gap: 18, flexDirection: 'row-reverse',
          border: `1px solid ${SN_BLUE}33`, background: `${SN_BLUE}08`,
          animation: 'snFadeIn 0.6s ease-out 0.1s backwards',
        }}>
          <div style={{ width: 80, height: 80, overflow: 'visible', flexShrink: 0 }}>
            <PlanetOrb name={D.name} size={80}/>
          </div>
          <div style={{ minWidth: 0, flex: 1, textAlign: 'right' }}>
            <div style={{ fontFamily: SN_SERIF, fontSize: 26, fontWeight: 300, fontStyle: 'italic', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {D.name.charAt(0) + D.name.slice(1).toLowerCase()}
            </div>
            <SNLabel color={SN_BLUE} style={{ marginTop: 4, textAlign: 'right' }}>PRINCIPAL</SNLabel>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 20, justifyContent: 'flex-end' }}>
          {dAllies.map(p => <SNAlly key={p.id} planet={p} side="defend"/>)}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, textAlign: 'center' }}>
        <SNLabel>YET TO COMMIT · {undecided.length}</SNLabel>
        <div style={{ display: 'inline-flex', gap: 24, marginTop: 10, opacity: 0.7 }}>
          {undecided.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 18, height: 18, overflow: 'visible' }}>
                <PlanetOrb name={p.name} size={18}/>
              </div>
              <span style={{ fontFamily: SN_SERIF, fontStyle: 'italic', fontSize: 13, color: SN_INK, letterSpacing: '-0.01em' }}>
                {p.name.charAt(0) + p.name.slice(1).toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </SNStage>
  )
}

// ─── 4C. Mobile pick ──────────────────────────────────────
interface MobilePickProps extends EscalationSentinelProps {
  myPlanetId?: string
}

export function EscalationSentinelMobilePick({
  attackerId = 'ignis',
  defenderId = 'aqualis',
  resource = 'oxygen',
  amount = 6,
  myPlanetId = 'glacius',
}: MobilePickProps = {}) {
  React.useEffect(() => { injectKeyframes() }, [])
  const A = PLANET_BY_ID[attackerId]
  const D = PLANET_BY_ID[defenderId]
  const me = PLANET_BY_ID[myPlanetId] || PLANET_BY_ID.glacius
  const R = RESOURCES.find(r => r.id === resource) || { id: resource, label: resource }
  const [t, setT] = React.useState(0)
  React.useEffect(() => {
    let raf: number
    const start = performance.now()
    const tick = (now: number) => { setT((now - start) / 1000); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const remaining = Math.max(0, 10 - (t % 10))

  return (
    <div style={{
      width: '100%', height: '100%', background: SN_BG, color: SN_INK,
      fontFamily: SN_SANS, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <SNStarfield density={0.9}/>
      <SNBackdrop tintLeft={SN_RED} tintRight={SN_BLUE} opacity={0.22}/>

      <div style={{ position: 'relative', padding: '14px 18px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
          <SNLabel size={9} style={{ letterSpacing: '0.25em' }}>YOU · {me.name}</SNLabel>
          <SNLabel size={9} color={SN_GOLD} style={{ letterSpacing: '0.25em', textAlign: 'center' }}>● ALLIANCE</SNLabel>
          <div style={{ fontFamily: SN_SERIF, fontStyle: 'italic', fontSize: 16, color: SN_GOLD, textAlign: 'right' }}>
            {Math.ceil(remaining)}s
          </div>
        </div>
        <SNRule style={{ marginTop: 12 }}/>
      </div>

      <div style={{ position: 'relative', padding: '22px 22px 14px', textAlign: 'center' }}>
        <SNLabel>RESOURCE AT STAKE</SNLabel>
        <div style={{
          fontFamily: SN_SERIF, fontSize: 48, fontStyle: 'italic', fontWeight: 300,
          letterSpacing: '-0.04em', lineHeight: 1, marginTop: 6, color: SN_GOLD,
        }}>
          {R.label}<span style={{ color: SN_INK }}>.</span>
        </div>
        <div style={{ fontFamily: SN_SERIF, fontSize: 16, fontStyle: 'italic', color: SN_DIM, marginTop: 4 }}>
          × {amount}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderTop: `1px solid ${SN_HAIR}`, borderBottom: `1px solid ${SN_HAIR}`,
        }}>
          <div style={{ position: 'absolute', top: 14, left: 18 }}>
            <SNLabel color={SN_RED} size={9}>◤ AGGRESSOR</SNLabel>
          </div>
          <div style={{
            width: 140, height: 140, overflow: 'visible',
            animation: 'snDrift 6s ease-in-out infinite',
          }}>
            <PlanetOrb name={A.name} size={140}/>
          </div>
          <div style={{ position: 'absolute', bottom: 14, right: 18, textAlign: 'right' }}>
            <div style={{ fontFamily: SN_SERIF, fontSize: 26, fontStyle: 'italic', fontWeight: 300, color: SN_RED, letterSpacing: '-0.02em' }}>
              {A.name.charAt(0) + A.name.slice(1).toLowerCase()}
            </div>
            <SNLabel size={8} style={{ marginTop: 2, textAlign: 'right' }}>{A.motto.length > 38 ? A.motto.slice(0,36)+'…' : A.motto}</SNLabel>
          </div>
        </div>

        <div style={{
          flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'absolute', top: 14, right: 18, textAlign: 'right' }}>
            <SNLabel color={SN_BLUE} size={9} style={{ textAlign: 'right' }}>DEFENDER ◢</SNLabel>
          </div>
          <div style={{
            width: 140, height: 140, overflow: 'visible',
            animation: 'snDrift 6s ease-in-out infinite 1.2s',
          }}>
            <PlanetOrb name={D.name} size={140}/>
          </div>
          <div style={{ position: 'absolute', bottom: 14, left: 18 }}>
            <div style={{ fontFamily: SN_SERIF, fontSize: 26, fontStyle: 'italic', fontWeight: 300, color: SN_BLUE, letterSpacing: '-0.02em' }}>
              {D.name.charAt(0) + D.name.slice(1).toLowerCase()}
            </div>
            <SNLabel size={8} style={{ marginTop: 2 }}>{D.motto.length > 38 ? D.motto.slice(0,36)+'…' : D.motto}</SNLabel>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button style={{
          width: '100%', padding: '15px 0',
          fontFamily: SN_SERIF, fontSize: 17, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.01em',
          color: SN_INK,
          background: `${SN_RED}1a`, border: `1px solid ${SN_RED}`,
          cursor: 'pointer', transition: `all 0.3s ${SN_EASE}`,
        }}>
          Strike with {A.name.charAt(0) + A.name.slice(1).toLowerCase()}
        </button>
        <button style={{
          width: '100%', padding: '15px 0',
          fontFamily: SN_SERIF, fontSize: 17, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.01em',
          color: SN_INK,
          background: `${SN_BLUE}1a`, border: `1px solid ${SN_BLUE}`,
          cursor: 'pointer', transition: `all 0.3s ${SN_EASE}`,
        }}>
          Shield {D.name.charAt(0) + D.name.slice(1).toLowerCase()}
        </button>
        <button style={{
          width: '100%', padding: '12px 0',
          fontFamily: SN_SERIF, fontSize: 13, fontStyle: 'italic', fontWeight: 400,
          color: SN_DIM,
          background: 'transparent', border: `1px solid ${SN_HAIR}`,
          cursor: 'pointer',
        }}>
          Stand aside
        </button>
      </div>
    </div>
  )
}

// ─── 4D. Mobile fire window ─────────────────────────────────
interface MobileFireProps extends EscalationSentinelProps {
  myPlanetId?: string
  side?: 'attack' | 'defend'
  // sessionId enables real-time broadcast of fire/reset across all clients.
  // When provided, every press immediately POSTs /api/sn/fire so the
  // facilitator dashboard + other mobiles see the counter increment within
  // ~one SSE round-trip (~50–150ms).
  sessionId?: string
}

export function EscalationSentinelMobileFire({
  attackerId,
  defenderId,
  resource,
  amount,
  myPlanetId = 'aqualis',
  side,
  sessionId,
}: MobileFireProps = {}) {
  React.useEffect(() => { injectKeyframes() }, [])
  React.useEffect(() => {
    const s = SN_GAME.getState()
    const patch: Partial<SNGameState> = {}
    if (attackerId && s.attackerId !== attackerId) patch.attackerId = attackerId
    if (defenderId && s.defenderId !== defenderId) patch.defenderId = defenderId
    if (resource && s.resource !== resource) patch.resource = resource
    if (amount && s.stake !== amount) patch.stake = amount
    if (Object.keys(patch).length) SN_GAME.setState(patch)
    // Push scenario to KV — same fix as Facilitator. Without this, the
    // 1500ms polling backstop reads stale defaults and clobbers the
    // correct principals locally.
    if (sessionId && attackerId && defenderId && resource && typeof amount === 'number') {
      broadcastScenario(sessionId, { attackerId, defenderId, resource, amount })
    }
  }, [attackerId, defenderId, resource, amount, sessionId])

  const game = useSNGame()
  useAnimationFrame()

  const me = PLANET_BY_ID[myPlanetId] || PLANET_BY_ID[game.defenderId]
  const A = PLANET_BY_ID[game.attackerId]
  const D = PLANET_BY_ID[game.defenderId]
  const R = RESOURCES.find(r => r.id === game.resource) || { id: game.resource, label: game.resource }

  const myRole: 'attacker' | 'defender' = side
    ? (side === 'attack' ? 'attacker' : 'defender')
    : (myPlanetId === game.attackerId ? 'attacker' : 'defender')
  const accent = myRole === 'attacker' ? SN_RED : SN_BLUE
  const myShots = myRole === 'attacker' ? game.attackerShots : game.defenderShots
  const oppShots = myRole === 'attacker' ? game.defenderShots : game.attackerShots
  const myRockets = myRole === 'attacker' ? game.attackerRockets : game.defenderRockets
  const oppPlanet = myRole === 'attacker' ? D : A
  const opponentName = oppPlanet.name.charAt(0) + oppPlanet.name.slice(1).toLowerCase()

  const lockedDefender = myRole === 'defender' && !game.attackerStarted && game.phase === 'fire'
  const isFireFirst    = myRole === 'attacker' && !game.attackerStarted && game.phase === 'fire'
  const inFireExchange = game.phase === 'fire' && game.attackerStarted

  const tNow = performance.now()
  const tRemainMs = game.timerDeadline ? Math.max(0, game.timerDeadline - tNow) : 0
  const tRemainS = tRemainMs / 1000
  const timerVisible =
    (game.activeTimer === 'response'  && tRemainMs <= 5000) ||
    (game.activeTimer === 'stalemate' && tRemainMs <= 10000)
  const iAmBehind =
    (myRole === 'attacker' && game.attackerShots < game.defenderShots) ||
    (myRole === 'defender' && game.defenderShots < game.attackerShots)
  const timerTotal = game.activeTimer === 'response' ? 5 : 10
  const timerFrac  = Math.min(1, tRemainS / timerTotal)
  const timerColor = game.activeTimer === 'response'
    ? (iAmBehind ? SN_RED : SN_GOLD)
    : SN_GOLD

  const fireDisabled = lockedDefender || myRockets <= 0 || game.phase !== 'fire'

  const handleFire = () => {
    if (fireDisabled) return
    // Optimistic local apply for instant haptic feedback, then authoritative
    // POST to the server (which reconciles us via its response and broadcasts
    // to every other client over SSE).
    SN_GAME.fire(myRole)
    if (sessionId) broadcastFire(sessionId, myRole, myPlanetId, {
      attackerId: game.attackerId, defenderId: game.defenderId,
      resource: game.resource, amount: game.stake,
    })
  }
  const handleReset = () => {
    SN_GAME.reset()
    if (sessionId) broadcastReset(sessionId)
  }

  // Reliability backstop: poll the canonical state every 1500ms while an
  // escalation is active, in case the SSE channel drops a broadcast.
  React.useEffect(() => {
    if (!sessionId) return
    fetchSNState(sessionId)
    const id = setInterval(() => { fetchSNState(sessionId) }, 1500)
    return () => clearInterval(id)
  }, [sessionId])

  return (
    <div style={{
      width: '100%', height: '100%', background: SN_BG, color: SN_INK,
      fontFamily: SN_SANS, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <SNStarfield density={0.9}/>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${accent}28 0%, transparent 60%)`,
      }}/>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.85)',
      }}/>

      <div style={{ position: 'relative', padding: '14px 18px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
          <SNLabel size={9} style={{ letterSpacing: '0.25em' }}>YOU · {me.name}</SNLabel>
          <SNLabel size={9} color={accent} style={{ letterSpacing: '0.25em', textAlign: 'center', whiteSpace: 'nowrap' }}>
            ● {myRole === 'attacker' ? 'AGGRESSOR' : 'DEFENDER'}
          </SNLabel>
          <button
            onClick={handleReset}
            title="Reset"
            style={{
              fontFamily: SN_MONO, fontSize: 9, letterSpacing: '0.25em',
              color: SN_FAINT, background: 'transparent', border: 'none',
              cursor: 'pointer', textAlign: 'right',
            }}>↻ RESET</button>
        </div>
        <SNRule style={{ marginTop: 12 }}/>
      </div>

      <div style={{ position: 'relative', padding: '20px 22px 6px', textAlign: 'center' }}>
        <SNLabel>FOR</SNLabel>
        <div style={{
          fontFamily: SN_SERIF, fontSize: 40, fontStyle: 'italic', fontWeight: 300,
          letterSpacing: '-0.03em', lineHeight: 1, marginTop: 4, color: SN_GOLD,
        }}>
          {R.label}<span style={{ color: SN_INK }}>.</span>
          <span style={{ color: SN_INK, opacity: 0.7, fontSize: 22, marginLeft: 10 }}>× {game.stake}</span>
        </div>
      </div>

      {(inFireExchange || isFireFirst || game.phase !== 'fire') && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8,
          padding: '6px 22px 10px',
        }}>
          <div style={{ textAlign: 'right' }}>
            <SNLabel size={8} color={accent} style={{ letterSpacing: '0.25em' }}>YOU</SNLabel>
            <div style={{ fontFamily: SN_SERIF, fontSize: 36, fontStyle: 'italic', fontWeight: 300, color: accent, lineHeight: 1, marginTop: 2 }}>
              {myShots}
            </div>
          </div>
          <div style={{ fontFamily: SN_MONO, fontSize: 11, letterSpacing: '0.4em', color: SN_FAINT, padding: '0 4px' }}>:</div>
          <div style={{ textAlign: 'left' }}>
            <SNLabel size={8} style={{ letterSpacing: '0.25em' }}>{opponentName.toUpperCase()}</SNLabel>
            <div style={{ fontFamily: SN_SERIF, fontSize: 36, fontStyle: 'italic', fontWeight: 300, color: SN_DIM, lineHeight: 1, marginTop: 2 }}>
              {oppShots}
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px' }}>
        {lockedDefender && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 200, height: 200, margin: '0 auto', overflow: 'visible',
              animation: 'snBreathe 4s ease-in-out infinite', opacity: 0.5,
            }}>
              <PlanetOrb name={D.name} size={200}/>
            </div>
            <SNLabel color={SN_DIM} style={{ marginTop: 28, letterSpacing: '0.4em' }}>HOLDING POSITION</SNLabel>
            <div style={{
              fontFamily: SN_SERIF, fontSize: 28, fontStyle: 'italic', fontWeight: 300,
              color: SN_INK, marginTop: 10, lineHeight: 1.2, letterSpacing: '-0.02em',
            }}>
              Waiting for <span style={{ color: SN_RED }}>{A.name.charAt(0) + A.name.slice(1).toLowerCase()}</span> to fire.
            </div>
            <SNLabel size={9} style={{ marginTop: 14, color: SN_FAINT }}>
              YOU MAY NOT FIRE FIRST
            </SNLabel>
          </div>
        )}

        {isFireFirst && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 220, height: 220, margin: '0 auto', overflow: 'visible',
              animation: 'snBreathe 2.4s ease-in-out infinite',
              filter: `drop-shadow(0 0 30px ${SN_RED}aa)`,
            }}>
              <PlanetOrb name={A.name} size={220}/>
            </div>
            <div style={{
              fontFamily: SN_SERIF, fontSize: 28, fontStyle: 'italic', fontWeight: 300,
              color: SN_INK, marginTop: 22, lineHeight: 1.2, letterSpacing: '-0.02em',
            }}>
              {opponentName} is on watch.
            </div>
            <SNLabel color={SN_RED} style={{ marginTop: 8, letterSpacing: '0.4em' }}>
              FIRE FIRST TO BEGIN
            </SNLabel>
          </div>
        )}

        {inFireExchange && (
          <div style={{ position: 'relative', width: 260, height: 260, margin: '0 auto' }}>
            <svg width={260} height={260} viewBox="0 0 260 260" style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <radialGradient id="sn-mb-bloom" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="60%" stopColor={accent} stopOpacity="0"/>
                  <stop offset="100%" stopColor={accent} stopOpacity="0.32"/>
                </radialGradient>
              </defs>
              <circle cx="130" cy="130" r="124" fill="url(#sn-mb-bloom)" opacity="0.55"/>
              <circle cx="130" cy="130" r="112" fill="none" stroke={SN_HAIR} strokeWidth="1"/>
              {timerVisible && (
                <circle cx="130" cy="130" r="112" fill="none" stroke={timerColor} strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 112 * timerFrac} ${2 * Math.PI * 112}`}
                  transform="rotate(-90 130 130)" strokeLinecap="round"
                  style={{ transition: `stroke-dasharray 0.3s ${SN_EASE}`, filter: `drop-shadow(0 0 10px ${timerColor})` }}/>
              )}
            </svg>
            <div style={{
              position: 'absolute', top: 28, left: 28, width: 204, height: 204,
              overflow: 'visible',
              animation: 'snBreathe 3s ease-in-out infinite',
            }}>
              <PlanetOrb name={(myRole === 'attacker' ? A : D).name} size={204}/>
            </div>
            {timerVisible && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', pointerEvents: 'none',
              }}>
                <div style={{
                  fontFamily: SN_SERIF, fontSize: 86, fontStyle: 'italic', fontWeight: 300,
                  letterSpacing: '-0.04em', lineHeight: 1, color: timerColor,
                  textShadow: `0 0 24px ${timerColor}99`,
                }}>
                  {Math.ceil(tRemainS)}
                </div>
                <SNLabel color={timerColor} size={9} style={{ marginTop: 4, letterSpacing: '0.4em' }}>
                  {game.activeTimer === 'response' ? 'RESPOND' : 'STALEMATE'}
                </SNLabel>
              </div>
            )}
          </div>
        )}

        {game.phase === 'hit' && (
          <div style={{ textAlign: 'center', animation: 'snFadeIn 0.4s ease-out' }}>
            <SNLabel color={SN_RED} size={11} style={{ letterSpacing: '0.5em' }}>DIRECT HIT</SNLabel>
            <div style={{
              fontFamily: SN_SERIF, fontSize: 56, fontWeight: 300, fontStyle: 'italic',
              letterSpacing: '-0.04em', lineHeight: 1, marginTop: 12, color: SN_INK,
              whiteSpace: 'nowrap', textShadow: `0 0 30px ${SN_RED}88`,
            }}>
              {(game.loser === 'attacker') === (myRole === 'attacker')
                ? <>You <span style={{ color: SN_RED }}>fall.</span></>
                : <>{opponentName} <span style={{ color: SN_RED }}>falls.</span></>}
            </div>
            <SNLabel color={SN_DIM} style={{ marginTop: 22 }}>
              {(game.loser === 'attacker') === (myRole === 'attacker')
                ? 'YOU FAILED TO RESPOND'
                : `${opponentName.toUpperCase()} FAILED TO RESPOND`}
            </SNLabel>
          </div>
        )}

        {game.phase === 'resolution' && (
          <div style={{ textAlign: 'center', animation: 'snFadeIn 0.4s ease-out' }}>
            {game.loser === null ? (
              <>
                <SNLabel color={SN_GOLD} size={11} style={{ letterSpacing: '0.5em' }}>STALEMATE</SNLabel>
                <div style={{
                  fontFamily: SN_SERIF, fontSize: 60, fontWeight: 300, fontStyle: 'italic',
                  letterSpacing: '-0.04em', lineHeight: 1, marginTop: 12, color: SN_INK,
                }}>
                  A <span style={{ color: SN_GOLD }}>draw</span>.
                </div>
                <SNLabel color={SN_DIM} style={{ marginTop: 22 }}>NO RESOURCES EXCHANGED</SNLabel>
              </>
            ) : (
              <>
                <SNLabel color={SN_GOLD} size={11} style={{ letterSpacing: '0.5em' }}>SETTLEMENT</SNLabel>
                <div style={{
                  fontFamily: SN_SERIF, fontSize: 54, fontWeight: 300, fontStyle: 'italic',
                  letterSpacing: '-0.04em', lineHeight: 1, marginTop: 12, color: SN_INK,
                }}>
                  {game.stake} <span style={{ color: SN_GOLD }}>{R.label}</span>
                </div>
                <div style={{ fontFamily: SN_SERIF, fontSize: 18, fontStyle: 'italic', color: SN_DIM, marginTop: 16, letterSpacing: '-0.01em' }}>
                  {(game.loser === 'attacker') === (myRole === 'attacker')
                    ? <>You <span style={{ color: SN_RED }}>lose</span> {game.stake} {R.label.toLowerCase()} to {opponentName}.</>
                    : <>You <span style={{ color: '#9bd28a' }}>gain</span> {game.stake} {R.label.toLowerCase()} from {opponentName}.</>}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {(isFireFirst || inFireExchange) && (
        <div style={{ padding: '0 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SNLabel size={8} style={{ letterSpacing: '0.3em' }}>
            ROCKETS LEFT
          </SNLabel>
          <div style={{ fontFamily: SN_SERIF, fontSize: 24, fontStyle: 'italic', fontWeight: 300, color: myRockets > 0 ? accent : SN_FAINT }}>
            {myRockets}<span style={{ fontSize: 14, color: SN_DIM, marginLeft: 4 }}>/ {myRole === 'attacker' ? game.attackerRockets + game.attackerShots : game.defenderRockets + game.defenderShots}</span>
          </div>
        </div>
      )}

      <div style={{ padding: '14px 18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(isFireFirst || inFireExchange) && (
          <button
            onClick={handleFire}
            disabled={fireDisabled}
            style={{
              width: '100%', padding: '18px 0',
              fontFamily: SN_SERIF, fontSize: 18, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.01em',
              color: fireDisabled ? SN_FAINT : SN_BG,
              background: fireDisabled
                ? 'rgba(244,239,229,0.06)'
                : isFireFirst ? SN_RED : SN_GOLD,
              border: `1px solid ${fireDisabled ? SN_HAIR : (isFireFirst ? SN_RED : SN_GOLD)}`,
              cursor: fireDisabled ? 'not-allowed' : 'pointer',
              animation: isFireFirst ? 'snBreathe 1.6s ease-in-out infinite' : 'none',
              boxShadow: fireDisabled ? 'none' : `0 0 24px ${isFireFirst ? SN_RED : SN_GOLD}55`,
              transition: `all 0.25s ${SN_EASE}`,
            }}>
            {isFireFirst ? '◆ FIRE FIRST' : (myRockets <= 0 ? 'No rockets left' : '◆  Launch rocket')}
          </button>
        )}
        {lockedDefender && (
          <button disabled style={{
            width: '100%', padding: '18px 0',
            fontFamily: SN_SERIF, fontSize: 16, fontStyle: 'italic', fontWeight: 400,
            color: SN_FAINT,
            background: 'rgba(244,239,229,0.04)', border: `1px solid ${SN_HAIR}`,
            cursor: 'not-allowed',
          }}>
            ◇  Locked until attack
          </button>
        )}
        {game.phase === 'hit' && (
          <div style={{
            width: '100%', padding: '14px 0', textAlign: 'center',
            fontFamily: SN_MONO, fontSize: 9, letterSpacing: '0.3em', color: SN_FAINT,
            border: `1px solid ${SN_HAIR}`,
          }}>
            ◉ RESOLUTION IN 3s
          </div>
        )}
        {game.phase === 'resolution' && (
          <button
            onClick={handleReset}
            style={{
              width: '100%', padding: '14px 0',
              fontFamily: SN_SERIF, fontSize: 13, fontStyle: 'italic',
              color: SN_DIM, background: 'transparent', border: `1px solid ${SN_HAIR}`,
              cursor: 'pointer',
            }}>
            Tap to dismiss
          </button>
        )}
      </div>
    </div>
  )
}
