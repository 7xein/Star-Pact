'use client'

import { useState, useEffect, useRef } from 'react'
import PlanetOrb from '@/components/PlanetOrb'
import type { ScandalFull } from './ScandalOverlay'

// ── TV Design Tokens ─────────────────────────────────────
const TV = {
  bg:       '#08020a',
  bgDeep:   '#1a0410',
  ink:      '#fff8e7',
  dim:      'rgba(255,248,231,0.55)',
  faint:    'rgba(255,248,231,0.28)',
  hairline: 'rgba(255,248,231,0.10)',
  red:      '#ff4a55',
  blue:     '#5cc1ff',
  gold:     '#f5c66e',
  display:  '"Anton", "Space Grotesk", system-ui, sans-serif',
  serif:    '"Space Grotesk", Georgia, serif',
  sans:     '"Inter Tight", system-ui, sans-serif',
  mono:     '"JetBrains Mono", monospace',
}

function CornerBracket({ pos, color = TV.gold, sz = 16 }: { pos: string; color?: string; sz?: number }) {
  const isTop = pos[0] === 't'; const isLeft = pos[1] === 'l'
  return (
    <div style={{ position: 'absolute', width: sz, height: sz, color,
      [isTop ? 'top' : 'bottom']: 0, [isLeft ? 'left' : 'right']: 0 }}>
      <div style={{ position: 'absolute', [isTop ? 'top' : 'bottom']: 0, [isLeft ? 'left' : 'right']: 0, width: sz, height: 2, background: 'currentColor' }} />
      <div style={{ position: 'absolute', [isTop ? 'top' : 'bottom']: 0, [isLeft ? 'left' : 'right']: 0, width: 2, height: sz, background: 'currentColor' }} />
    </div>
  )
}

function CountdownRing({ remaining, total, size = 180, color = TV.gold, label }: {
  remaining: number; total: number; size?: number; color?: string; label?: string
}) {
  const r = size / 2 - 10
  const circ = 2 * Math.PI * r
  const dash = circ * Math.max(0, remaining / total)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 12px ${color})` }}/>
      <text x={size/2} y={size/2 + size*0.08} textAnchor="middle" fill={TV.ink}
        fontFamily={TV.display} fontSize={size * 0.45} fontWeight="700">
        {Math.ceil(Math.max(0, remaining))}
      </text>
      {label && (
        <text x={size/2} y={size/2 + size*0.24} textAnchor="middle" fill={TV.dim}
          fontFamily={TV.mono} fontSize={size * 0.055} letterSpacing="0.35em">{label}</text>
      )}
    </svg>
  )
}

function StarsBg() {
  const stars = [
    [8,5],[22,12],[38,3],[55,8],[70,15],[85,4],[94,20],
    [12,30],[30,25],[48,35],[62,22],[78,30],[90,38],
    [5,50],[18,55],[35,48],[52,58],[68,45],[82,60],[96,52],
    [10,70],[25,78],[42,65],[58,74],[72,68],[88,78],
    [15,88],[32,92],[50,85],[65,90],[80,95],[95,85],
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {stars.map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute', left: `${x}%`, top: `${y}%`,
          width: i % 4 === 0 ? 2 : 1, height: i % 4 === 0 ? 2 : 1,
          borderRadius: '50%', background: '#fff8e7',
          opacity: 0.08 + (i % 6) * 0.03,
        }} />
      ))}
    </div>
  )
}

interface Country { id: string; name: string; color: string }
interface Props {
  scandal: ScandalFull
  session: { countries: Country[]; year: number }
  clockOffset?: number // serverTime - clientTime in ms
}

export default function FacilitatorTV({ scandal, session, clockOffset = 0 }: Props) {
  const [remaining, setRemaining] = useState(0)
  const rafRef = useRef<number | undefined>(undefined)

  // Wall-clock countdown (adjusted for server/client clock difference)
  useEffect(() => {
    const tick = () => {
      if (scandal.beatEndsAt) {
        const serverNow = Date.now() + clockOffset
        const diff = (new Date(scandal.beatEndsAt).getTime() - serverNow) / 1000
        setRemaining(Math.max(0, diff))
      }
    }
    tick()
    const id = setInterval(tick, 100) // 100ms for smoother countdown
    return () => clearInterval(id)
  }, [scandal.beatEndsAt, clockOffset])

  // Animation clock
  const [clock, setClock] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      setClock((now - start) / 1000)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  const attacker = scandal.attacker ?? session.countries.find(c => c.id === scandal.attackerId)
  const defender = scandal.defender ?? session.countries.find(c => c.id === scandal.defenderId)
  if (!attacker || !defender) return null

  const attackerAllies = scandal.alliances.filter(a => a.side === 'ATTACKER')
  const defenderAllies = scandal.alliances.filter(a => a.side === 'DEFENDER')

  const RES_LABELS: Record<string, string> = { food: 'Energy', wealth: 'Crew', environment: 'Oxygen', kushBalls: 'Operatives' }

  const stageStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 300,
    background: `radial-gradient(ellipse at 50% 50%, ${TV.bgDeep} 0%, ${TV.bg} 65%)`,
    color: TV.ink, fontFamily: TV.sans, overflow: 'hidden',
  }

  // ── Top header shared ────────────────────────────────────
  const beatLabel: Record<string, string> = {
    ALLIANCE: 'ALLIANCE WINDOW · CHOOSE A SIDE',
    VOLLEY: `VOLLEY ${scandal.currentRound} IN PROGRESS`,
    HIT: 'DIRECT HIT',
    RESOLUTION: scandal.hitSide === 'SHIELDER' ? 'ESCALATION RESOLVED · AGGRESSOR PREVAILS' : 'ESCALATION RESOLVED · DEFENDER HOLDS',
  }
  const beatAccent: Record<string, string> = {
    ALLIANCE: TV.gold, VOLLEY: TV.gold, HIT: TV.gold,
    RESOLUTION: scandal.hitSide === 'SHIELDER' ? TV.red : TV.blue,
  }
  const Header = () => (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5 }}>
      <div style={{ fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.3em', color: TV.dim }}>
        NEBULA ALLIANCE · ESCALATION
      </div>
      <div style={{ fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.3em', color: beatAccent[scandal.beat] ?? TV.gold }} className="tv-blink">
        ● {beatLabel[scandal.beat] ?? scandal.beat}
      </div>
      <div style={{ fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.3em', color: TV.dim }}>
        CHAPTER {session.year}
      </div>
    </div>
  )

  // ── Left/right radial washes ─────────────────────────────
  const SideWashes = ({ leftC = '#7a0d12', rightC = '#0a3a6e' }) => (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 0% 50%, ${leftC}cc 0%, transparent 40%), radial-gradient(ellipse at 100% 50%, ${rightC}cc 0%, transparent 40%)` }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 160px rgba(0,0,0,0.75)' }} />
    </div>
  )

  // ── ALLIANCE beat ────────────────────────────────────────
  if (scandal.beat === 'ALLIANCE') {
    const orbitOffset = clock * 0.18
    return (
      <div style={stageStyle}>
        <StarsBg />
        <SideWashes />
        <Header />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column' }}>
          {/* Stacked names */}
          <div style={{ textAlign: 'center', paddingTop: 52, lineHeight: 0.85 }}>
            <div style={{ fontFamily: TV.display, fontSize: 'clamp(60px, 10vw, 150px)', color: TV.red, textShadow: `0 0 50px ${TV.red}66` }}>
              {attacker.name.toUpperCase()}
            </div>
            <div style={{ fontFamily: TV.serif, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px, 3.5vw, 48px)', color: TV.gold, lineHeight: 1, margin: '2px 0' }}>vs</div>
            <div style={{ fontFamily: TV.display, fontSize: 'clamp(60px, 10vw, 150px)', color: TV.blue, textShadow: `0 0 50px ${TV.blue}66` }}>
              {defender.name.toUpperCase()}
            </div>
          </div>

          {/* Center countdown */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 60 }}>
            {/* Attacker side */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 180, height: 180 }}>
                <PlanetOrb name={attacker.name} color={attacker.color} size={160} glow />
                {attackerAllies.map((a, i) => {
                  const ang = -Math.PI * 0.6 + i * Math.PI * 0.35 + orbitOffset * 0.2
                  const dist = 110
                  const x = Math.cos(ang) * dist
                  const y = Math.sin(ang) * dist
                  const ally = session.countries.find(c => c.id === a.countryId)
                  if (!ally) return null
                  return (
                    <div key={a.countryId} style={{ position: 'absolute', left: `calc(50% + ${x}px - 18px)`, top: `calc(50% + ${y}px - 18px)` }}>
                      <PlanetOrb name={ally.name} color={ally.color} size={36} glow={false} />
                    </div>
                  )
                })}
              </div>
              <div style={{ fontFamily: TV.display, fontSize: 22, color: TV.red, marginTop: 52, letterSpacing: '0.06em' }}>
                {1 + attackerAllies.length} STRIKING
              </div>
            </div>

            {/* Countdown ring */}
            <div style={{ textAlign: 'center' }}>
              <CountdownRing remaining={remaining} total={20} size={180} color={TV.gold} label="PICK A SIDE" />
              <div style={{ fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.3em', color: TV.gold, marginTop: 10 }}>
                {RES_LABELS[scandal.resource]?.toUpperCase()} ×{scandal.amount}
              </div>
            </div>

            {/* Defender side */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 180, height: 180 }}>
                <PlanetOrb name={defender.name} color={defender.color} size={160} glow />
                {defenderAllies.map((a, i) => {
                  const ang = -Math.PI * 0.4 - i * Math.PI * 0.35 - orbitOffset * 0.2
                  const dist = 110
                  const x = Math.cos(ang) * dist
                  const y = Math.sin(ang) * dist
                  const ally = session.countries.find(c => c.id === a.countryId)
                  if (!ally) return null
                  return (
                    <div key={a.countryId} style={{ position: 'absolute', left: `calc(50% + ${x}px - 18px)`, top: `calc(50% + ${y}px - 18px)` }}>
                      <PlanetOrb name={ally.name} color={ally.color} size={36} glow={false} />
                    </div>
                  )
                })}
              </div>
              <div style={{ fontFamily: TV.display, fontSize: 22, color: TV.blue, marginTop: 52, letterSpacing: '0.06em' }}>
                {1 + defenderAllies.length} SHIELDING
              </div>
            </div>
          </div>

          {/* Undecided strip */}
          {(() => {
            const allSides = new Set([scandal.attackerId, scandal.defenderId, ...scandal.alliances.map(a => a.countryId)])
            const undecided = session.countries.filter(c => !allSides.has(c.id))
            if (undecided.length === 0) return null
            return (
              <div style={{ textAlign: 'center', paddingBottom: 18 }}>
                <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.dim, marginBottom: 8 }}>
                  UNDECIDED · {undecided.length}
                </div>
                <div style={{ display: 'inline-flex', gap: 24 }}>
                  {undecided.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
                      <PlanetOrb name={p.name} color={p.color} size={22} glow={false} />
                      <span style={{ fontFamily: TV.display, fontSize: 14, letterSpacing: '0.05em', color: TV.ink }}>{p.name}</span>
                      <span style={{ fontFamily: TV.display, fontSize: 14, color: TV.gold }}>?</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  // ── VOLLEY beat ──────────────────────────────────────────
  if (scandal.beat === 'VOLLEY') {
    const cycle = 2.4
    const p = (clock % cycle) / cycle
    const phase = p < 0.85 ? p / 0.85 : 1
    const dust = p > 0.85

    // Positions (percentage-based for responsiveness)
    const aPos = { x: 25, y: 55 }
    const dPos = { x: 75, y: 55 }

    return (
      <div style={stageStyle}>
        <StarsBg />
        <SideWashes />
        <Header />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
          {/* Versus title */}
          <div style={{ position: 'absolute', top: 50, left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ fontFamily: TV.display, fontSize: 'clamp(36px, 5vw, 72px)', lineHeight: 0.9 }}>
              <span style={{ color: TV.red }}>{attacker.name}</span>
              <span style={{ color: TV.gold, fontFamily: TV.serif, fontStyle: 'italic', fontWeight: 300, fontSize: '0.4em', margin: '0 0.4em' }}>vs</span>
              <span style={{ color: TV.blue }}>{defender.name}</span>
            </div>
          </div>

          {/* Stake */}
          <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.4em', color: TV.gold, marginBottom: 4 }}>◤ AT STAKE ◢</div>
            <div style={{ fontFamily: TV.display, fontSize: 'clamp(28px, 4vw, 56px)', color: TV.gold, lineHeight: 0.9 }}>×{scandal.amount}</div>
            <div style={{ fontFamily: TV.display, fontSize: 'clamp(14px, 2vw, 28px)', color: TV.ink, letterSpacing: '0.05em' }}>
              {RES_LABELS[scandal.resource]?.toUpperCase()}
            </div>
          </div>

          {/* Countdown rings */}
          <div style={{ position: 'absolute', top: '22%', left: '8%' }}>
            <CountdownRing remaining={remaining} total={10} size={100} color={TV.red} label="VOLLEY" />
          </div>
          <div style={{ position: 'absolute', top: '22%', right: '8%' }}>
            <CountdownRing remaining={remaining} total={10} size={100} color={TV.blue} label="VOLLEY" />
          </div>

          {/* Planets */}
          <div style={{ position: 'absolute', left: '10%', top: '42%', transform: 'translateY(-50%)' }}>
            <PlanetOrb name={attacker.name} color={attacker.color} size={180} glow />
          </div>
          <div style={{ position: 'absolute', right: '10%', top: '42%', transform: 'translateY(-50%)' }}>
            <PlanetOrb name={defender.name} color={defender.color} size={180} glow />
          </div>

          {/* SVG rockets in flight */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }}>
            {/* Attacker rocket */}
            {(() => {
              const from = { x: 30, y: 42 }
              const to = { x: 72, y: 40 }
              const cx = (from.x + to.x) / 2
              const cy = Math.min(from.y, to.y) - 18
              const lerp = (a: number, b: number, tt: number) => a + (b - a) * tt
              const bx = lerp(lerp(from.x, cx, phase), lerp(cx, to.x, phase), phase)
              const by = lerp(lerp(from.y, cy, phase), lerp(cy, to.y, phase), phase)
              if (dust) return null
              return (
                <g>
                  <path d={`M ${from.x}% ${from.y}% Q ${cx}% ${cy}%, ${bx}% ${by}%`}
                    fill="none" stroke={TV.red} strokeWidth="3" strokeOpacity="0.6" strokeLinecap="round"/>
                  <circle cx={`${bx}%`} cy={`${by}%`} r="5" fill={TV.red} opacity="0.9"
                    style={{ filter: `drop-shadow(0 0 8px ${TV.red})` }}/>
                </g>
              )
            })()}
            {/* Defender rocket */}
            {(() => {
              const from = { x: 70, y: 42 }
              const to = { x: 28, y: 40 }
              const cx = (from.x + to.x) / 2
              const cy = Math.min(from.y, to.y) - 18
              const lerp = (a: number, b: number, tt: number) => a + (b - a) * tt
              const bx = lerp(lerp(from.x, cx, phase), lerp(cx, to.x, phase), phase)
              const by = lerp(lerp(from.y, cy, phase), lerp(cy, to.y, phase), phase)
              if (dust) return null
              return (
                <g>
                  <path d={`M ${from.x}% ${from.y}% Q ${cx}% ${cy}%, ${bx}% ${by}%`}
                    fill="none" stroke={TV.blue} strokeWidth="3" strokeOpacity="0.6" strokeLinecap="round"/>
                  <circle cx={`${bx}%`} cy={`${by}%`} r="5" fill={TV.blue} opacity="0.9"
                    style={{ filter: `drop-shadow(0 0 8px ${TV.blue})` }}/>
                </g>
              )
            })()}
          </svg>

          {/* Bottom info */}
          <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 28px', alignItems: 'center' }}>
            <div style={{ fontFamily: TV.display, fontSize: 36, color: TV.red, letterSpacing: '0.04em' }}>
              VOLLEY {scandal.currentRound}
            </div>
            <div style={{ fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.3em', color: TV.dim }}>
              ROCKETS LAUNCHED — {scandal.volleys.filter(v => v.round === scandal.currentRound && v.side === 'STRIKER').length} vs {scandal.volleys.filter(v => v.round === scandal.currentRound && v.side === 'SHIELDER').length}
            </div>
            <div style={{ fontFamily: TV.display, fontSize: 36, color: TV.blue, letterSpacing: '0.04em', textAlign: 'right' }}>
              T−{Math.ceil(remaining)}s
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── HIT beat ────────────────────────────────────────────
  if (scandal.beat === 'HIT') {
    const attackerWins = scandal.hitSide === 'SHIELDER'
    const hitPlanet = attackerWins ? defender : attacker
    const winnerPlanet = attackerWins ? attacker : defender
    const targetColor = attackerWins ? TV.blue : TV.red
    const winnerColor = attackerWins ? TV.red : TV.blue
    return (
      <div style={{ ...stageStyle }} className={clock < 0.5 ? 'tv-shake' : ''}>
        <StarsBg />
        <SideWashes leftC={attackerWins ? '#7a0d12' : '#0a3a6e'} rightC={attackerWins ? '#0a3a6e' : '#7a0d12'} />
        <Header />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
          <div style={{ fontFamily: TV.mono, fontSize: 12, letterSpacing: '0.5em', color: winnerColor }} className="tv-blink">
            ◤ DIRECT HIT ON {hitPlanet.name.toUpperCase()} ◢
          </div>
          <div style={{ fontFamily: TV.display, fontSize: 'clamp(60px, 12vw, 160px)', lineHeight: 0.9, color: targetColor, textShadow: `0 0 60px ${targetColor}cc` }}>
            {hitPlanet.name.toUpperCase()}
          </div>

          {/* Shockwaves + planet */}
          <div style={{ position: 'relative' }}>
            {[0, 0.25, 0.5].map((delay, i) => (
              <div key={i} style={{
                position: 'absolute', inset: '50%', width: 60, height: 60, marginLeft: -30, marginTop: -30,
                borderRadius: '50%', border: `2px solid ${targetColor}`,
                animation: `tvShockwave 1.6s ease-out ${delay}s infinite`, opacity: 0.7,
              }} />
            ))}
            <PlanetOrb name={hitPlanet.name} color={hitPlanet.color} size={200} glow />
          </div>

          {/* Claim card */}
          <div style={{
            padding: '16px 32px', border: `1px solid ${TV.gold}`,
            background: `${TV.gold}10`, display: 'inline-flex', alignItems: 'center', gap: 20,
          }} className="tv-fade-in">
            <span style={{ fontFamily: TV.display, fontSize: 28, color: TV.red }}>{attacker.name}</span>
            <span style={{ fontFamily: TV.serif, fontStyle: 'italic', fontSize: 18, color: TV.gold }}>claims</span>
            <span style={{ fontFamily: TV.display, fontSize: 40, color: TV.gold }}>×{scandal.amount}</span>
            <span style={{ fontFamily: TV.display, fontSize: 24, color: TV.ink, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {RES_LABELS[scandal.resource]}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── RESOLUTION beat ─────────────────────────────────────
  if (scandal.beat === 'RESOLUTION') {
    const attackerWins = scandal.hitSide === 'SHIELDER'
    const transferP = (clock % 4) / 2.5
    return (
      <div style={stageStyle}>
        <StarsBg />
        <SideWashes leftC={attackerWins ? '#7a0d12' : '#0a3a6e'} rightC={attackerWins ? '#0a3a6e' : '#7a0d12'} />
        <Header />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 40px 40px', textAlign: 'center', gap: 16 }}>
          {/* Headline */}
          {attackerWins ? (
            <>
              <div style={{ fontFamily: TV.mono, fontSize: 11, letterSpacing: '0.5em', color: TV.red, marginBottom: 4 }} className="tv-blink">◤ DEFEAT ◢</div>
              <div style={{ fontFamily: TV.display, fontSize: 'clamp(28px, 5vw, 72px)', lineHeight: 0.9 }}>
                <span style={{ color: TV.red }}>{attacker.name}</span>
                <span style={{ color: TV.gold, fontFamily: TV.serif, fontStyle: 'italic', fontWeight: 300, fontSize: '0.55em', margin: '0 0.2em' }}>takes from</span>
                <span style={{ color: TV.blue }}>{defender.name}</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: TV.mono, fontSize: 11, letterSpacing: '0.5em', color: TV.blue, marginBottom: 4 }} className="tv-blink">◤ HELD ◢</div>
              <div style={{ fontFamily: TV.display, fontSize: 'clamp(28px, 5vw, 72px)', lineHeight: 0.9 }}>
                <span style={{ color: TV.blue }}>{defender.name}</span>
                <span style={{ color: TV.gold, fontFamily: TV.serif, fontStyle: 'italic', fontWeight: 300, fontSize: '0.55em', margin: '0 0.2em' }}>repels</span>
                <span style={{ color: TV.red, opacity: 0.6 }}>{attacker.name}</span>
              </div>
            </>
          )}

          {/* Card */}
          {attackerWins ? (
            <div style={{
              padding: '24px 48px', border: `2px solid ${TV.gold}`,
              background: `linear-gradient(180deg, ${TV.gold}22, ${TV.gold}08)`,
              boxShadow: `0 0 48px ${TV.gold}55`, position: 'relative',
            }} className="tv-slide-up">
              <CornerBracket pos="tl" color={TV.gold} sz={18} />
              <CornerBracket pos="tr" color={TV.gold} sz={18} />
              <CornerBracket pos="bl" color={TV.gold} sz={18} />
              <CornerBracket pos="br" color={TV.gold} sz={18} />
              <div style={{ fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.4em', color: TV.gold, marginBottom: 8 }}>BOUNTY · TRANSFERRED</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, justifyContent: 'center' }}>
                <div style={{ fontFamily: TV.display, fontSize: 'clamp(60px, 10vw, 140px)', lineHeight: 0.85, color: TV.gold, textShadow: `0 0 20px ${TV.gold}cc` }}>
                  ×{scandal.amount}
                </div>
                <div style={{ fontFamily: TV.display, fontSize: 'clamp(28px, 4vw, 56px)', lineHeight: 0.85, color: TV.ink, textTransform: 'uppercase' }}>
                  {RES_LABELS[scandal.resource]}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '24px 48px', border: `2px solid ${TV.blue}`,
              background: `linear-gradient(180deg, ${TV.blue}22, ${TV.blue}08)`,
              boxShadow: `0 0 48px ${TV.blue}55`, position: 'relative',
            }}>
              <CornerBracket pos="tl" color={TV.blue} sz={18} />
              <CornerBracket pos="tr" color={TV.blue} sz={18} />
              <CornerBracket pos="bl" color={TV.blue} sz={18} />
              <CornerBracket pos="br" color={TV.blue} sz={18} />
              <div style={{ fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.4em', color: TV.blue, marginBottom: 8 }}>STORES INTACT</div>
              <div style={{ fontFamily: TV.display, fontSize: 'clamp(60px, 10vw, 120px)', lineHeight: 0.85, color: TV.blue, textShadow: `0 0 20px ${TV.blue}99` }}>
                NO LOSS
              </div>
            </div>
          )}

          {/* Two principals */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 12 }}>
            <div style={{ textAlign: 'center', opacity: attackerWins ? 1 : 0.5 }}>
              <PlanetOrb name={attacker.name} color={attacker.color} size={100} glow={attackerWins} />
              <div style={{ fontFamily: TV.display, fontSize: 22, color: TV.red, marginTop: 8 }}>{attacker.name}</div>
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.25em', color: attackerWins ? TV.gold : TV.dim, marginTop: 4 }}>
                {attackerWins ? `+${scandal.amount}` : 'REPELLED'}
              </div>
            </div>
            <div style={{ color: TV.gold, fontFamily: TV.display, fontSize: 32 }}>{attackerWins ? '→' : '×'}</div>
            <div style={{ textAlign: 'center', opacity: attackerWins ? 0.6 : 1 }}>
              <PlanetOrb name={defender.name} color={defender.color} size={100} glow={!attackerWins} />
              <div style={{ fontFamily: TV.display, fontSize: 22, color: TV.blue, marginTop: 8 }}>{defender.name}</div>
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.25em', color: attackerWins ? TV.red : TV.blue, marginTop: 4 }}>
                {attackerWins ? `−${scandal.amount}` : 'HOLDS · +0'}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
