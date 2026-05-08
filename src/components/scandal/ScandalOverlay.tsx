'use client'

import { useState, useEffect, useRef } from 'react'
import PlanetOrb from '@/components/PlanetOrb'

// ── TV Design Tokens ─────────────────────────────────────
const TV = {
  bg:       '#08020a',
  bgDeep:   '#1a0410',
  ink:      '#fff8e7',
  dim:      'rgba(255,248,231,0.55)',
  faint:    'rgba(255,248,231,0.28)',
  hairline: 'rgba(255,248,231,0.10)',
  red:      '#ff4a55',
  redDeep:  '#7a0d12',
  blue:     '#5cc1ff',
  blueDeep: '#0a3a6e',
  gold:     '#f5c66e',
  display:  '"Anton", "Space Grotesk", system-ui, sans-serif',
  serif:    '"Space Grotesk", Georgia, serif',
  sans:     '"Inter Tight", system-ui, sans-serif',
  mono:     '"JetBrains Mono", monospace',
}

// ── Shared sub-components ────────────────────────────────

function CountdownRing({ remaining, total, size = 130, color = TV.gold }: {
  remaining: number; total: number; size?: number; color?: string
}) {
  const r = size / 2 - 8
  const circ = 2 * Math.PI * r
  const dash = circ * Math.max(0, remaining / total)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}/>
      <text x={size/2} y={size/2 + size*0.07} textAnchor="middle" fill={TV.ink}
        fontFamily={TV.display} fontSize={size * 0.42} fontWeight="700">
        {Math.ceil(Math.max(0, remaining))}
      </text>
      <text x={size/2} y={size/2 + size*0.24} textAnchor="middle" fill={TV.dim}
        fontFamily={TV.mono} fontSize={size * 0.06} letterSpacing="0.3em">
        SEC
      </text>
    </svg>
  )
}

function CornerBracket({ pos, color = TV.gold, sz = 10 }: { pos: string; color?: string; sz?: number }) {
  const isTop = pos[0] === 't'; const isLeft = pos[1] === 'l'
  return (
    <div style={{ position: 'absolute', width: sz, height: sz, color,
      [isTop ? 'top' : 'bottom']: 0, [isLeft ? 'left' : 'right']: 0 }}>
      <div style={{ position: 'absolute', [isTop ? 'top' : 'bottom']: 0, [isLeft ? 'left' : 'right']: 0, width: sz, height: 2, background: 'currentColor' }} />
      <div style={{ position: 'absolute', [isTop ? 'top' : 'bottom']: 0, [isLeft ? 'left' : 'right']: 0, width: 2, height: sz, background: 'currentColor' }} />
    </div>
  )
}

function RocketIcon({ size = 14, color = '#fff', spent = false }: { size?: number; color?: string; spent?: boolean }) {
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 14 22" style={{ opacity: spent ? 0.18 : 1 }}>
      <path d="M7 1 C9 4, 10 7, 10 12 L10 17 L4 17 L4 12 C4 7, 5 4, 7 1 Z" fill={color} stroke="#fff" strokeOpacity="0.3"/>
      <circle cx="7" cy="9" r="1.4" fill="#08020a"/>
      <path d="M4 17 L2 21 L4 19 Z" fill={color} opacity="0.7"/>
      <path d="M10 17 L12 21 L10 19 Z" fill={color} opacity="0.7"/>
      <path d="M7 17 L7 22" stroke="#ffae42" strokeWidth="1.5" opacity="0.9"/>
    </svg>
  )
}

function RocketRack({ remaining, total, accent }: { remaining: number; total: number; accent: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.dim }}>MY ROCKETS</span>
        <span style={{ fontFamily: TV.display, fontSize: 32, lineHeight: 1, color: accent }}>
          {remaining}<span style={{ fontSize: 16, color: TV.dim }}>/{total}</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 5, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}55` }}>
        {Array.from({ length: total }).map((_, i) => (
          <RocketIcon key={i} size={14} color={accent} spent={i >= remaining} />
        ))}
      </div>
    </div>
  )
}

function StakeCard({ resource, amount, accentColor }: { resource: string; amount: number; accentColor: string }) {
  const RES_LABELS: Record<string, string> = { food: 'Energy', wealth: 'Crew', environment: 'Oxygen', kushBalls: 'Operatives' }
  return (
    <div style={{ padding: '12px 14px', border: `1px solid ${accentColor}55`, background: `${accentColor}0d`, position: 'relative' }}>
      <CornerBracket pos="tl" color={accentColor} sz={8} />
      <CornerBracket pos="tr" color={accentColor} sz={8} />
      <CornerBracket pos="bl" color={accentColor} sz={8} />
      <CornerBracket pos="br" color={accentColor} sz={8} />
      <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.dim }}>AT STAKE</div>
      <div style={{ fontFamily: TV.display, fontSize: 28, color: accentColor, marginTop: 4, lineHeight: 1 }}>
        ×{amount} <span style={{ color: TV.ink, fontSize: 16, letterSpacing: '0.06em' }}>{RES_LABELS[resource]?.toUpperCase()}</span>
      </div>
    </div>
  )
}

function CountdownBar({ remaining, total, color }: { remaining: number; total: number; color: string }) {
  return (
    <div style={{ height: 5, background: 'rgba(255,255,255,0.07)' }}>
      <div style={{ height: '100%', width: `${Math.max(0, (remaining / total) * 100)}%`, background: color, transition: 'width 0.2s linear', boxShadow: `0 0 6px ${color}` }} />
    </div>
  )
}

function StarsBg() {
  const stars = [
    [15,8],[45,22],[72,6],[92,18],[28,42],[60,35],[85,50],[10,65],[38,70],[68,60],
    [82,78],[22,88],[55,82],[90,72],[48,12],[76,40],[32,55],[64,15],[18,30],[95,30],
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {stars.map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute', left: `${x}%`, top: `${y}%`,
          width: i % 3 === 0 ? 2 : 1, height: i % 3 === 0 ? 2 : 1,
          borderRadius: '50%', background: '#fff8e7',
          opacity: 0.1 + (i % 5) * 0.04,
        }} />
      ))}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────

export interface ScandalFull {
  id: string
  attackerId: string
  defenderId: string
  resource: string
  amount: number
  status: string
  beat: string
  beatEndsAt: string | null
  currentRound: number
  hitSide: string | null
  lastFiringSide?: string | null
  alliances: Array<{ countryId: string; side: string; country?: { name: string; color: string } }>
  volleys: Array<{ countryId: string; round: number; side: string }>
  attacker?: { id: string; name: string; color: string }
  defender?: { id: string; name: string; color: string }
  sessionId: string
}

interface Country { id: string; name: string; color: string; kushBalls: number }

interface Props {
  scandal: ScandalFull
  myCountry: Country
  session: { countries: Country[] }
  onFire: () => Promise<void>
  onJoinAlliance: (side: 'ATTACKER' | 'DEFENDER') => Promise<void>
  onDismiss?: () => void
}

// ── Timer constants ──────────────────────────────────────
const ALLIANCE_DURATION = 20
const VOLLEY_DURATION = 10

// ── Main Overlay ──────────────────────────────────────────
export default function ScandalOverlay({ scandal, myCountry, session, onFire, onJoinAlliance, onDismiss }: Props) {
  const [remaining, setRemaining] = useState(0)
  const [firedThisRound, setFiredThisRound] = useState(false)
  const [allianceChosen, setAllianceChosen] = useState(false)
  const [abstained, setAbstained] = useState(false)
  const [firing, setFiring] = useState(false)

  // Compute my role
  const isAttacker = scandal.attackerId === myCountry.id
  const isDefender = scandal.defenderId === myCountry.id
  const myAlliance = scandal.alliances.find(a => a.countryId === myCountry.id)
  const isAllyAttacker = !isAttacker && !isDefender && myAlliance?.side === 'ATTACKER'
  const isAllyDefender = !isAttacker && !isDefender && myAlliance?.side === 'DEFENDER'
  const isParticipant = isAttacker || isDefender || !!myAlliance
  const isObserver = abstained || (!isParticipant && scandal.beat !== 'ALLIANCE')

  // Track if already fired this round
  useEffect(() => {
    const fired = scandal.volleys.some(v => v.countryId === myCountry.id && v.round === scandal.currentRound)
    setFiredThisRound(fired)
  }, [scandal.volleys, scandal.currentRound, myCountry.id])

  // Track if already chose alliance side
  useEffect(() => {
    setAllianceChosen(!!scandal.alliances.find(a => a.countryId === myCountry.id) || isAttacker || isDefender)
  }, [scandal.alliances, isAttacker, isDefender, myCountry.id])

  // Countdown clock
  useEffect(() => {
    const tick = () => {
      if (!scandal.beatEndsAt) { setRemaining(0); return }
      const diff = (new Date(scandal.beatEndsAt).getTime() - Date.now()) / 1000
      setRemaining(Math.max(0, diff))
    }
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [scandal.beatEndsAt])

  const handleFire = async () => {
    if (firing || firedThisRound || myCountry.kushBalls < 1) return
    setFiring(true)
    await onFire()
    setFiring(false)
  }

  const handleJoin = async (side: 'ATTACKER' | 'DEFENDER') => {
    await onJoinAlliance(side)
  }

  const handleAbstain = () => {
    setAbstained(true)
  }

  const attacker = scandal.attacker ?? session.countries.find(c => c.id === scandal.attackerId)
  const defender = scandal.defender ?? session.countries.find(c => c.id === scandal.defenderId)
  if (!attacker || !defender) return null

  const attackerAllies = scandal.alliances.filter(a => a.side === 'ATTACKER').length
  const defenderAllies = scandal.alliances.filter(a => a.side === 'DEFENDER').length

  // ── CLOSED — don't render ───────────────────────────────
  if (scandal.beat === 'CLOSED') return null

  const bgStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200,
    background: `radial-gradient(ellipse at 50% 30%, ${TV.bgDeep} 0%, ${TV.bg} 70%)`,
    color: TV.ink, fontFamily: TV.sans, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  }

  // ── HIT beat ────────────────────────────────────────────
  if (scandal.beat === 'HIT') {
    const hitSide = scandal.hitSide
    const attackerWins = hitSide === 'SHIELDER'
    const hitPlanet = attackerWins ? defender : attacker
    const winnerPlanet = attackerWins ? attacker : defender
    const targetColor = attackerWins ? TV.blue : TV.red
    const winnerColor = attackerWins ? TV.red : TV.blue
    return (
      <div style={bgStyle}>
        <StarsBg />
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.5em', color: winnerColor, marginBottom: 12 }} className="tv-blink">
            ◤ DIRECT HIT ◢
          </div>
          <div style={{ fontFamily: TV.display, fontSize: 14, letterSpacing: '0.3em', color: winnerColor, marginBottom: 20 }}>
            {winnerPlanet.name.toUpperCase()} CONNECTED
          </div>
          <div style={{ position: 'relative', marginBottom: 24 }}>
            {[0, 0.3, 0.6].map((d, i) => (
              <div key={i} style={{
                position: 'absolute', inset: '50%', width: 80, height: 80, marginLeft: -40, marginTop: -40,
                borderRadius: '50%', border: `2px solid ${targetColor}`,
                animation: `tvShockwave 1.6s ease-out ${d}s infinite`,
              }} />
            ))}
            <PlanetOrb name={hitPlanet.name} color={hitPlanet.color} size={140} glow />
          </div>
          <div style={{ fontFamily: TV.display, fontSize: 60, lineHeight: 0.9, color: targetColor, textShadow: `0 0 40px ${targetColor}99`, marginBottom: 24 }}>
            {hitPlanet.name.toUpperCase()}
          </div>
          <div style={{ padding: '14px 24px', border: `1px solid ${TV.gold}`, background: `${TV.gold}10`, fontFamily: TV.display, fontSize: 20, color: TV.gold }} className="tv-fade-in">
            {attackerWins
              ? `${attacker.name} claims ×${scandal.amount}`
              : `${defender.name} holds — no loss`}
          </div>
        </div>
      </div>
    )
  }

  // ── RESOLUTION beat — tap to dismiss ────────────────────
  if (scandal.beat === 'RESOLUTION') {
    const attackerWins = scandal.hitSide === 'SHIELDER'
    return (
      <div style={{ ...bgStyle, cursor: 'pointer' }} onClick={() => onDismiss?.()}>
        <StarsBg />
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          {attackerWins ? (
            <>
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.5em', color: TV.red, marginBottom: 14 }} className="tv-blink">◤ DEFEAT ◢</div>
              <div style={{ fontFamily: TV.display, fontSize: 18, color: TV.ink, marginBottom: 6 }}>
                <span style={{ color: TV.red }}>{attacker.name}</span>
                <span style={{ color: TV.gold, fontFamily: TV.serif, fontStyle: 'italic', fontSize: 14, margin: '0 8px' }}>takes from</span>
                <span style={{ color: TV.blue }}>{defender.name}</span>
              </div>
              <div style={{
                padding: '28px 40px', border: `2px solid ${TV.gold}`,
                background: `linear-gradient(180deg, ${TV.gold}22, ${TV.gold}08)`,
                boxShadow: `0 0 40px ${TV.gold}55`, position: 'relative',
                marginTop: 14, marginBottom: 28,
              }} className="tv-slide-up">
                <CornerBracket pos="tl" color={TV.gold} sz={14} />
                <CornerBracket pos="tr" color={TV.gold} sz={14} />
                <CornerBracket pos="bl" color={TV.gold} sz={14} />
                <CornerBracket pos="br" color={TV.gold} sz={14} />
                <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.4em', color: TV.gold, marginBottom: 8 }}>BOUNTY · TRANSFERRED</div>
                <div style={{ fontFamily: TV.display, fontSize: 80, lineHeight: 0.85, color: TV.gold, textShadow: `0 0 20px ${TV.gold}cc` }}>
                  ×{scandal.amount}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <PlanetOrb name={attacker.name} color={attacker.color} size={60} glow />
                  <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.2em', color: TV.gold, marginTop: 8 }}>+{scandal.amount}</div>
                </div>
                <div style={{ fontFamily: TV.display, fontSize: 20, color: TV.gold }}>→</div>
                <div style={{ textAlign: 'center', opacity: 0.6 }}>
                  <PlanetOrb name={defender.name} color={defender.color} size={60} glow />
                  <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.2em', color: TV.red, marginTop: 8 }}>−{scandal.amount}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.5em', color: TV.blue, marginBottom: 14 }} className="tv-blink">◤ HELD ◢</div>
              <div style={{ fontFamily: TV.display, fontSize: 18, color: TV.ink, marginBottom: 14 }}>
                <span style={{ color: TV.blue }}>{defender.name}</span>
                <span style={{ color: TV.gold, fontFamily: TV.serif, fontStyle: 'italic', fontSize: 14, margin: '0 8px' }}>repels</span>
                <span style={{ color: TV.red, opacity: 0.6 }}>{attacker.name}</span>
              </div>
              <div style={{
                padding: '28px 40px', border: `2px solid ${TV.blue}`,
                background: `linear-gradient(180deg, ${TV.blue}22, ${TV.blue}08)`,
                boxShadow: `0 0 40px ${TV.blue}55`, position: 'relative', marginBottom: 20,
              }}>
                <CornerBracket pos="tl" color={TV.blue} sz={14} />
                <CornerBracket pos="tr" color={TV.blue} sz={14} />
                <CornerBracket pos="bl" color={TV.blue} sz={14} />
                <CornerBracket pos="br" color={TV.blue} sz={14} />
                <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.4em', color: TV.blue, marginBottom: 8 }}>STORES INTACT</div>
                <div style={{ fontFamily: TV.display, fontSize: 64, lineHeight: 0.85, color: TV.blue, textShadow: `0 0 20px ${TV.blue}99` }}>NO LOSS</div>
              </div>
              <PlanetOrb name={defender.name} color={defender.color} size={80} glow />
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.blue, marginTop: 10 }}>HOLDS · +0</div>
            </>
          )}
          <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.faint, marginTop: 24 }}>
            TAP ANYWHERE TO CONTINUE
          </div>
        </div>
      </div>
    )
  }

  // ── ALLIANCE beat ────────────────────────────────────────

  // Observer view (abstained or non-participant after alliance)
  if (scandal.beat === 'ALLIANCE' && abstained) {
    return (
      <div style={bgStyle}>
        <StarsBg />
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', gap: 16 }}>
          <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.4em', color: TV.faint }}>ABSTAINED</div>
          <div style={{ fontFamily: TV.display, fontSize: 40, lineHeight: 0.9, color: TV.ink, opacity: 0.7 }}>OBSERVING</div>
          <CountdownRing remaining={remaining} total={ALLIANCE_DURATION} size={120} color={TV.gold} />
          <div style={{ fontFamily: TV.serif, fontSize: 14, color: TV.dim, fontStyle: 'italic' }}>Others are choosing sides…</div>
        </div>
      </div>
    )
  }

  if (scandal.beat === 'ALLIANCE') {
    // Attacker view
    if (isAttacker) {
      return (
        <div style={bgStyle}>
          <StarsBg />
          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: TV.red }} className="tv-blink" />
              <span style={{ fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.3em', color: TV.red }}>YOU ARE ATTACKING</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.dim, marginBottom: 8 }}>YOUR TARGET</div>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <PlanetOrb name={defender.name} color={defender.color} size={120} glow />
                <svg width="160" height="160" viewBox="0 0 160 160" style={{ position: 'absolute', inset: -20, pointerEvents: 'none' }}>
                  <circle cx="80" cy="80" r="76" fill="none" stroke={TV.gold} strokeOpacity="0.35" strokeDasharray="3 5" />
                  <line x1="0" y1="80" x2="18" y2="80" stroke={TV.gold} strokeWidth="2"/>
                  <line x1="142" y1="80" x2="160" y2="80" stroke={TV.gold} strokeWidth="2"/>
                  <line x1="80" y1="0" x2="80" y2="18" stroke={TV.gold} strokeWidth="2"/>
                  <line x1="80" y1="142" x2="80" y2="160" stroke={TV.gold} strokeWidth="2"/>
                </svg>
              </div>
              <div style={{ fontFamily: TV.display, fontSize: 38, color: TV.blue, marginTop: 8, textShadow: `0 0 16px ${TV.blue}77` }}>
                {defender.name.toUpperCase()}
              </div>
            </div>
            <StakeCard resource={scandal.resource} amount={scandal.amount} accentColor={TV.gold} />
            <div style={{ textAlign: 'center' }}>
              <CountdownRing remaining={remaining} total={ALLIANCE_DURATION} size={120} color={TV.gold} />
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.dim, marginTop: 6 }}>
                ALLIANCE WINDOW · {attackerAllies + defenderAllies} PLEDGED
              </div>
            </div>
            <div style={{ fontFamily: TV.serif, fontSize: 13, fontStyle: 'italic', color: TV.dim, textAlign: 'center' }}>
              Others are choosing sides. Volley begins soon.
            </div>
          </div>
        </div>
      )
    }

    // Defender view
    if (isDefender) {
      return (
        <div style={bgStyle}>
          <StarsBg />
          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: TV.blue }} className="tv-blink" />
              <span style={{ fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.3em', color: TV.blue }}>YOU ARE UNDER ATTACK</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.dim, marginBottom: 8 }}>AGGRESSOR</div>
              <PlanetOrb name={attacker.name} color={attacker.color} size={100} glow />
              <div style={{ fontFamily: TV.display, fontSize: 34, color: TV.red, marginTop: 8, textShadow: `0 0 14px ${TV.red}77` }}>
                {attacker.name.toUpperCase()}
              </div>
            </div>
            <div style={{ padding: '12px 14px', border: `1px solid ${TV.red}77`, background: `${TV.red}0d`, position: 'relative' }}>
              <CornerBracket pos="tl" color={TV.red} sz={8} />
              <CornerBracket pos="tr" color={TV.red} sz={8} />
              <CornerBracket pos="bl" color={TV.red} sz={8} />
              <CornerBracket pos="br" color={TV.red} sz={8} />
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.dim }}>AT RISK FROM YOUR STORES</div>
              <div style={{ fontFamily: TV.display, fontSize: 28, color: TV.red, marginTop: 4, lineHeight: 1 }}>
                −×{scandal.amount}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <CountdownRing remaining={remaining} total={ALLIANCE_DURATION} size={120} color={TV.gold} />
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.dim, marginTop: 6 }}>
                OTHERS ARE CHOOSING SIDES
              </div>
            </div>
            <div style={{ fontFamily: TV.serif, fontSize: 13, fontStyle: 'italic', color: TV.dim, textAlign: 'center' }}>
              Match their rockets in the volley. Out-fire them and your stores hold.
            </div>
          </div>
        </div>
      )
    }

    // Ally view — pick a side or abstain
    if (!allianceChosen) {
      return (
        <div style={bgStyle}>
          <StarsBg />
          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <PlanetOrb name={myCountry.name} color={myCountry.color} size={20} glow={false} />
              <span style={{ fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.3em', color: TV.dim }}>
                YOU · {myCountry.name.toUpperCase()}
              </span>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.gold, marginBottom: 8 }} className="tv-blink">
                ◤ ESCALATION OPEN ◢
              </div>
              <div style={{ fontFamily: TV.display, fontSize: 32, lineHeight: 1 }}>
                <span style={{ color: TV.red }}>{attacker.name}</span>
                <span style={{ color: TV.gold, fontFamily: TV.serif, fontStyle: 'italic', fontSize: 20, margin: '0 8px' }}>vs</span>
                <span style={{ color: TV.blue }}>{defender.name}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
              <CountdownRing remaining={remaining} total={ALLIANCE_DURATION} size={120} color={TV.gold} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => handleJoin('ATTACKER')} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px',
                border: `2px solid ${TV.red}`, background: `${TV.red}15`, color: TV.ink,
                fontFamily: TV.sans, textAlign: 'left', cursor: 'pointer',
              }}>
                <PlanetOrb name={attacker.name} color={attacker.color} size={44} glow />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: TV.display, fontSize: 18, color: TV.red, lineHeight: 1 }}>
                    STRIKE WITH {attacker.name.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.2em', color: TV.dim, marginTop: 4 }}>
                    {attackerAllies + 1} striking · share spoils
                  </div>
                </div>
                <span style={{ fontFamily: TV.display, fontSize: 22, color: TV.red }}>→</span>
              </button>

              <button onClick={() => handleJoin('DEFENDER')} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px',
                border: `2px solid ${TV.blue}`, background: `${TV.blue}15`, color: TV.ink,
                fontFamily: TV.sans, textAlign: 'left', cursor: 'pointer',
              }}>
                <PlanetOrb name={defender.name} color={defender.color} size={44} glow />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: TV.display, fontSize: 18, color: TV.blue, lineHeight: 1 }}>
                    SHIELD {defender.name.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.2em', color: TV.dim, marginTop: 4 }}>
                    {defenderAllies + 1} shielding · earn favor
                  </div>
                </div>
                <span style={{ fontFamily: TV.display, fontSize: 22, color: TV.blue }}>→</span>
              </button>

              <button onClick={handleAbstain} style={{
                padding: '10px', border: `1px dashed ${TV.faint}`, background: 'transparent',
                color: TV.dim, fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.3em', cursor: 'pointer',
              }}>
                ABSTAIN
              </button>
            </div>

            <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontFamily: TV.serif, fontSize: 12, fontStyle: 'italic', color: TV.faint }}>
              Don&apos;t pick? You sit this one out.
            </div>
          </div>
        </div>
      )
    }

    // Already chose / waiting for alliance to end
    return (
      <div style={bgStyle}>
        <StarsBg />
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', gap: 16 }}>
          <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.4em', color: isAllyAttacker ? TV.red : TV.blue }}>
            {isAllyAttacker ? `STRIKING WITH ${attacker.name.toUpperCase()}` : isAllyDefender ? `SHIELDING ${defender.name.toUpperCase()}` : 'OBSERVING'}
          </div>
          <CountdownRing remaining={remaining} total={ALLIANCE_DURATION} size={130} color={TV.gold} />
          <div style={{ fontFamily: TV.serif, fontSize: 14, color: TV.dim, fontStyle: 'italic' }}>Volley starts soon…</div>
        </div>
      </div>
    )
  }

  // ── VOLLEY beat ──────────────────────────────────────────
  if (scandal.beat === 'VOLLEY') {
    // Non-participant or observer
    if (isObserver) {
      return (
        <div style={bgStyle}>
          <StarsBg />
          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', gap: 16 }}>
            <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.4em', color: TV.faint }}>ABSTAINED</div>
            <div style={{ fontFamily: TV.display, fontSize: 56, lineHeight: 0.9, color: TV.ink, opacity: 0.7 }}>OBSERVING</div>
            <div style={{ fontFamily: TV.serif, fontSize: 14, color: TV.dim, fontStyle: 'italic', lineHeight: 1.5 }}>
              You sit this one out. No spoils, no losses.
            </div>
            <div style={{ marginTop: 16, padding: '14px', border: `1px solid ${TV.hairline}`, background: 'rgba(255,255,255,0.03)', width: '100%', maxWidth: 280 }}>
              <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.dim, marginBottom: 8 }}>VOLLEY {scandal.currentRound}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <PlanetOrb name={attacker.name} color={attacker.color} size={40} glow={false} />
                  <div style={{ fontFamily: TV.display, fontSize: 14, color: TV.red, marginTop: 4 }}>{attacker.name}</div>
                </div>
                <div style={{ fontFamily: TV.serif, fontStyle: 'italic', fontSize: 14, color: TV.gold }}>vs</div>
                <div style={{ textAlign: 'center' }}>
                  <PlanetOrb name={defender.name} color={defender.color} size={40} glow={false} />
                  <div style={{ fontFamily: TV.display, fontSize: 14, color: TV.blue, marginTop: 4 }}>{defender.name}</div>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <CountdownBar remaining={remaining} total={VOLLEY_DURATION} color={TV.gold} />
                <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.2em', color: TV.gold, marginTop: 4, textAlign: 'center' }}>{remaining.toFixed(1)}s</div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Participant fire view
    const sideColor = (isAttacker || isAllyAttacker) ? TV.red : TV.blue
    const target = (isAttacker || isAllyAttacker) ? defender : attacker
    const sideLabel = isAttacker ? 'YOU ARE ATTACKING'
      : isDefender ? 'YOU ARE DEFENDING'
      : isAllyAttacker ? `STRIKING WITH ${attacker.name.toUpperCase()}`
      : `SHIELDING ${defender.name.toUpperCase()}`

    const outOfRockets = myCountry.kushBalls < 1
    const btnLabel = firedThisRound ? '◤ ROCKET AWAY ◢'
      : outOfRockets ? 'OUT OF ROCKETS'
      : `◤ ${isDefender || isAllyDefender ? 'DEFEND' : 'FIRE ROCKET'} ◢`
    const canFire = !firedThisRound && !outOfRockets

    return (
      <div style={bgStyle}>
        <StarsBg />
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 20px', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sideColor }} className="tv-blink" />
            <span style={{ fontFamily: TV.mono, fontSize: 10, letterSpacing: '0.3em', color: sideColor }}>{sideLabel}</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.dim, marginBottom: 6 }}>
              {isAttacker || isAllyAttacker ? 'TARGET' : 'INCOMING FROM'}
            </div>
            <PlanetOrb name={target.name} color={target.color} size={100} glow />
            <div style={{ fontFamily: TV.display, fontSize: 34, color: sideColor, marginTop: 6, textShadow: `0 0 14px ${sideColor}77` }}>
              {target.name.toUpperCase()}
            </div>
          </div>

          <StakeCard resource={scandal.resource} amount={scandal.amount} accentColor={TV.gold} />

          <RocketRack remaining={myCountry.kushBalls} total={Math.max(3, myCountry.kushBalls + scandal.volleys.filter(v => v.countryId === myCountry.id).length)} accent={sideColor} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: TV.mono, fontSize: 9, letterSpacing: '0.3em', color: TV.dim }}>
              VOLLEY {scandal.currentRound}
            </span>
            <span style={{ fontFamily: TV.display, fontSize: 28, color: TV.gold, lineHeight: 1 }}>{remaining.toFixed(1)}s</span>
          </div>
          <CountdownBar remaining={remaining} total={VOLLEY_DURATION} color={TV.gold} />

          <button
            onClick={handleFire}
            disabled={!canFire || firing}
            style={{
              width: '100%', padding: '20px',
              border: `2px solid ${canFire ? sideColor : TV.faint}`,
              background: canFire ? `linear-gradient(180deg, ${sideColor}33, ${sideColor}11)` : 'rgba(255,255,255,0.03)',
              color: canFire ? TV.ink : TV.dim,
              fontFamily: TV.display, fontSize: 24, letterSpacing: '0.1em',
              boxShadow: canFire ? `0 0 24px ${sideColor}55` : 'none',
              cursor: canFire ? 'pointer' : 'default',
              animation: canFire ? 'tvBlink 1.5s infinite' : 'none',
            }}>
            {btnLabel}
          </button>

          {firedThisRound && (
            <div style={{ textAlign: 'center', fontFamily: TV.serif, fontSize: 12, fontStyle: 'italic', color: TV.dim }}>
              Rocket launched. Awaiting next volley…
            </div>
          )}
          {outOfRockets && !firedThisRound && (
            <div style={{ textAlign: 'center', fontFamily: TV.serif, fontSize: 12, fontStyle: 'italic', color: TV.dim }}>
              No rockets left. Waiting for others…
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
