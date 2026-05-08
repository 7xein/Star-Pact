'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import QRCode from 'qrcode'
import FacilitatorTV from '@/components/scandal/FacilitatorTV'
import type { ScandalFull } from '@/components/scandal/ScandalOverlay'
import PlanetOrb from '@/components/PlanetOrb'

// ── Design tokens (from README) ───────────────────────────────
const B_BG    = '#0b0a14'
const B_INK   = '#f4efe5'
const B_DIM   = 'rgba(244,239,229,0.6)'
const B_FAINT = 'rgba(244,239,229,0.55)'
const B_LINE  = 'rgba(244,239,229,0.12)'
const B_GOLD  = '#e8c87a'
const B_GOOD  = '#9bd28a'
const B_BAD   = '#d28a8a'
const B_SERIF = '"Fraunces", "Source Serif 4", "Cormorant Garamond", Georgia, serif'
const B_SANS  = '"Inter Tight", "Inter", system-ui, sans-serif'
const B_MONO  = '"JetBrains Mono", ui-monospace, monospace'

const RES_GLYPH: Record<string, string> = { energy: '⚡', oxygen: '○', crew: '◉', smugglers: '◈' }

const PLANET_MOTTOS: Record<string, string> = {
  ignis:    'We burned first. We will burn last.',
  solara:   "If it's not dangerous, it's not worth doing.",
  glacius:  'We remember. That is enough.',
  rosara:   'Even in war, comfort is mandatory.',
  verdania: 'Survival must be sustainable.',
  lumenor:  "If it shines, it's worth building.",
  dustara:  'Trust instinct. Distrust everyone else.',
  aqualis:  'We solved it yesterday.',
  voidara:  'Sing a song. Invoice to follow.',
  ferron:   "What's the worst that could happen?",
}

const CHAPTER_WORDS = ['One', 'Two', 'Three', 'Four', 'Five']
const CHAPTER_ROMAN = ['I', 'II', 'III', 'IV', 'V']

// DB phase → tab index
const DB_PHASE_TO_IDX: Record<string, number> = {
  TRADING: 0, SCANDAL: 1, PROMISE_CHECK: 2, YEAR_END: 3, DEBRIEF: 3,
}
// Tab labels
const PHASE_LABELS = ['Trade', 'Diplomacy', 'Target', 'Resolution']

// ── Trade log ─────────────────────────────────────────────────
interface TradeEntry {
  tStr: string; from: string; to: string
  give: { n: number; r: string }; take: { n: number; r: string }
  status: 'sealed' | 'pending' | 'broken' | 'raided'
}

const TRADE_STATUS: Record<string, { label: string; color: string }> = {
  sealed:  { label: 'SEALED',  color: B_GOOD },
  pending: { label: 'PENDING', color: B_GOLD },
  broken:  { label: 'BROKEN',  color: B_BAD  },
  raided:  { label: 'RAIDED',  color: B_BAD  },
}

const MOCK_TRADES: TradeEntry[] = [
  { tStr:'14:08', from:'aqualis', to:'verdania', give:{n:4,r:'crew'},   take:{n:3,r:'oxygen'}, status:'sealed'  },
  { tStr:'14:06', from:'lumenor', to:'ignis',    give:{n:6,r:'energy'}, take:{n:2,r:'crew'},   status:'sealed'  },
  { tStr:'14:05', from:'rosara',  to:'glacius',  give:{n:3,r:'oxygen'}, take:{n:1,r:'energy'}, status:'pending' },
  { tStr:'14:03', from:'voidara', to:'rosara',   give:{n:2,r:'oxygen'}, take:{n:5,r:'crew'},   status:'broken'  },
  { tStr:'14:01', from:'ferron',  to:'solara',   give:{n:5,r:'energy'}, take:{n:4,r:'oxygen'}, status:'sealed'  },
]

// ── Planet color lookup (for trade log etc) ──
const PLANET_COLORS: Record<string, string> = {
  ignis: '#ef4444', solara: '#facc15', glacius: '#22c55e', rosara: '#ec4899',
  verdania: '#4ade80', lumenor: '#a855f7', dustara: '#f97316', aqualis: '#3b82f6',
  voidara: '#94a3b8', ferron: '#7dd3fc',
}

// ── StarField (animated canvas, from atoms.jsx) ──────────────
function StarField({ density = 1 }: { density?: number }) {
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
  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}/>
}

// ── Editorial Constellation (420×240) ────────────────────────
const CONSTELLATION_LAYOUT: Record<string, { x: number; y: number; size: number }> = {
  ignis:    { x: 52,  y: 64,  size: 30 },
  solara:   { x: 132, y: 36,  size: 24 },
  glacius:  { x: 224, y: 58,  size: 28 },
  rosara:   { x: 268, y: 138, size: 22 },
  verdania: { x: 198, y: 116, size: 26 },
  lumenor:  { x: 132, y: 138, size: 38 },
  dustara:  { x: 38,  y: 144, size: 22 },
  aqualis:  { x: 78,  y: 210, size: 32 },
  voidara:  { x: 178, y: 218, size: 26 },
  ferron:   { x: 252, y: 208, size: 22 },
}

function EditorialConstellation({ planets, reclaimed, audit, caption }: {
  planets: Array<{ id: string; color: string; name: string }>
  reclaimed: Set<string>
  audit: boolean
  caption: string | null
}) {
  const W = 420, H = 240
  const orbRefs = useRef<(HTMLDivElement | null)[]>([])
  const arcRef  = useRef<SVGPathElement | null>(null)

  useEffect(() => {
    let raf: number
    const start = performance.now()
    const phases = planets.map((_, i) => i * 0.7)
    const tick = (now: number) => {
      const t = (now - start) / 1000
      planets.forEach((_, i) => {
        const node = orbRefs.current[i]
        if (!node) return
        const dx = Math.cos(t * 0.18 + phases[i]) * 1.4
        const dy = Math.sin(t * 0.22 + phases[i] * 1.3) * 1.4
        node.style.transform = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`
      })
      if (arcRef.current) {
        const breathe = 0.32 + 0.08 * Math.sin(t * 0.4)
        arcRef.current.setAttribute('stroke-opacity', breathe.toFixed(3))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [planets.length])

  const starDust: [number,number][] = [
    [22,24],[68,18],[256,26],[292,80],[12,100],
    [108,78],[168,70],[240,92],[16,188],[112,220],
    [228,200],[294,200],[54,228],[196,210],[276,158],
    [148,192],[86,110],[220,30],[44,114],[262,124],
  ]

  return (
    <div style={{ position:'relative', width:W, height:H, flexShrink:0 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {starDust.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y}
            r={i % 4 === 0 ? 0.9 : 0.5} fill="#f4efe5"
            opacity={0.18 + (i % 5) * 0.05}/>
        ))}
        {/* gold editorial arc */}
        <path ref={arcRef}
          d={`M -10 ${H-60} Q ${W*0.5} ${H-200} ${W+10} 50`}
          fill="none" stroke={B_GOLD} strokeOpacity="0.32" strokeWidth="0.8"/>
        {/* faint counter-arc */}
        <path
          d={`M -10 60 Q ${W*0.5} ${H+60} ${W+10} ${H-30}`}
          fill="none" stroke="#f4efe5" strokeOpacity="0.06" strokeWidth="0.6"/>
      </svg>
      {planets.map((p, i) => {
        const layout = CONSTELLATION_LAYOUT[p.id]
        if (!layout) return null
        const lit = !audit || reclaimed.has(p.id)
        return (
          <div key={p.id} ref={el => { orbRefs.current[i] = el }}
            style={{ position:'absolute',
              left: layout.x - layout.size/2,
              top:  layout.y - layout.size/2,
              width: layout.size, height: layout.size,
              transition: 'filter 0.6s ease, opacity 0.6s ease',
              filter: lit ? 'none' : 'saturate(0.18) brightness(0.55)',
              opacity: lit ? 1 : 0.6, willChange:'transform' }}>
            <PlanetOrb name={p.name} color={p.color} size={layout.size} glow={lit} lit={lit}/>
            {audit && lit && (
              <div style={{ position:'absolute', top:-2, right:-2, width:4, height:4,
                borderRadius:'50%', background:B_GOLD, boxShadow:`0 0 6px ${B_GOLD}` }}/>
            )}
          </div>
        )
      })}
      {/* corner annotations */}
      <div style={{ position:'absolute', top:0, left:0, fontFamily:B_MONO, fontSize:8, letterSpacing:'0.28em', color:B_FAINT }}>SECTOR · 07</div>
      <div style={{ position:'absolute', top:0, right:0, fontFamily:B_MONO, fontSize:8, letterSpacing:'0.28em', color:B_FAINT }}>HOLLOW RING</div>
      <div style={{ position:'absolute', bottom:0, left:0, fontFamily:B_MONO, fontSize:8, letterSpacing:'0.28em', color:B_GOLD,
        opacity: caption ? 0.75 : 0, transition:'opacity 0.4s ease' }}>{caption || ''}</div>
      <div style={{ position:'absolute', bottom:0, right:0, fontFamily:B_MONO, fontSize:8, letterSpacing:'0.28em', color:B_FAINT }}>PLATE · II</div>
    </div>
  )
}

// ── Button style ──────────────────────────────────────────────
function btnB(primary: boolean): React.CSSProperties {
  return {
    fontFamily: B_SANS, fontSize: 12, letterSpacing: '0.08em', fontWeight: 500,
    padding: '12px 22px', borderRadius: 0, cursor: 'pointer',
    border: `1px solid ${primary ? B_GOLD : B_LINE}`,
    background: primary ? B_GOLD : 'transparent',
    color: primary ? '#0b0a14' : B_INK,
  }
}

// ── Interfaces ────────────────────────────────────────────────
interface Country {
  id: string; name: string; color: string
  food: number; wealth: number; environment: number; kushBalls: number
  promisesData?: string
}
interface PromiseCheck {
  id: string; countryId: string; year: number; resource: string
  required: number; actual: number; passed: boolean; country: Country
}
interface DebriefResponse {
  id: string; countryId: string; q1: string; q2: string; q3: string; q4: string; q5: string; country: Country; createdAt: string
}
interface ScandalData {
  id: string; attackerId: string; defenderId: string
  attacker: { id: string; name: string; color: string }
  defender: { id: string; name: string; color: string }
  resource: string; amount: number; status: string
  alliances: Array<{ countryId: string; country?: { name: string; color: string }; side: string }>
  volleys?: Array<{ countryId: string; round: number; side: string }>
  beat?: string; beatEndsAt?: string | null; currentRound?: number; hitSide?: string | null; sessionId?: string
}
interface Session {
  id: string; year: number; phase: string; timerEnd: string | null; timerRunning: boolean; countries: Country[]
}
interface RaidResult {
  scandalId: string; outcome: string; attackerName: string; defenderName: string; resource: string; amount: number
}

function getPlanetId(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('ignis'))    return 'ignis'
  if (n.includes('solara'))   return 'solara'
  if (n.includes('glacius'))  return 'glacius'
  if (n.includes('rosara'))   return 'rosara'
  if (n.includes('verdania')) return 'verdania'
  if (n.includes('lumenor'))  return 'lumenor'
  if (n.includes('dustara'))  return 'dustara'
  if (n.includes('aqualis'))  return 'aqualis'
  if (n.includes('voidara'))  return 'voidara'
  if (n.includes('ferron'))   return 'ferron'
  return n.split(' ')[0] || 'ignis'
}

// ── Main component ────────────────────────────────────────────
export default function FacilitatorDashboard() {
  const [session, setSession]             = useState<Session | null>(null)
  const [promiseChecks, setPromiseChecks] = useState<PromiseCheck[]>([])
  const [debriefResponses, setDebriefResponses] = useState<DebriefResponse[]>([])
  const [scandals, setScandals]           = useState<ScandalData[]>([])
  const [raidAlert, setRaidAlert]         = useState<{ attacker: string; defender: string } | null>(null)
  const [raidOverlay, setRaidOverlay]     = useState<RaidResult | null>(null)
  const [raidResolving, setRaidResolving] = useState<string | null>(null)
  const [tvScandal, setTvScandal]         = useState<ScandalFull | null>(null)
  const [recentTrades, setRecentTrades]   = useState<TradeEntry[]>(MOCK_TRADES)
  const [qrUrl, setQrUrl]                 = useState('')
  const [qrOpen, setQrOpen]               = useState(false)

  const sessionIdRef    = useRef<string | null>(null)
  const raidAlertTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advancingBeatRef = useRef(false)

  const loadPromiseChecks = useCallback(async (sessionId: string, year: number) => {
    const res = await fetch(`/api/promises?sessionId=${sessionId}&year=${year}`)
    if (res.ok) setPromiseChecks(await res.json())
  }, [])

  const loadDebriefResponses = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/debrief?sessionId=${sessionId}`)
    if (res.ok) setDebriefResponses(await res.json())
  }, [])

  const loadSession = useCallback(async (id: string) => {
    const res = await fetch('/api/session')
    if (res.ok) {
      const data = await res.json()
      setSession(data)
      if (data.phase === 'PROMISE_CHECK') loadPromiseChecks(id, data.year)
      if (data.phase === 'DEBRIEF') loadDebriefResponses(id)
    }
  }, [loadPromiseChecks, loadDebriefResponses])

  useEffect(() => {
    const id = localStorage.getItem('sessionId')
    if (!id) { window.location.href = '/facilitator'; return }
    sessionIdRef.current = id
    loadSession(id)
    QRCode.toDataURL(`${window.location.origin}/join`, {
      width: 200, margin: 1, color: { dark: '#e8c87a', light: '#07021a' },
    }).then(setQrUrl)

    const es = new EventSource(`/api/sse?sessionId=${id}`)
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'SESSION_UPDATE' || data.type === 'SESSION_CREATED') {
        setSession(data.session)
        if (data.session.phase === 'PROMISE_CHECK') loadPromiseChecks(id, data.session.year)
        if (data.session.phase === 'DEBRIEF') loadDebriefResponses(id)
      }
      if (data.type === 'DEBRIEF_RESPONSE')
        setDebriefResponses(prev => [...prev.filter(r => r.id !== data.response.id), data.response])
      if (data.type === 'SCANDAL_LAUNCHED') {
        const sc = data.scandal as ScandalData
        setScandals(prev => [...prev, { ...sc, alliances: sc.alliances ?? [] }])
        setTvScandal(sc as ScandalFull)
        setRaidAlert({ attacker: data.scandal.attacker?.name, defender: data.scandal.defender?.name })
        if (raidAlertTimer.current) clearTimeout(raidAlertTimer.current)
        raidAlertTimer.current = setTimeout(() => setRaidAlert(null), 5000)
      }
      if (data.type === 'SCANDAL_BEAT_ADVANCED') {
        const updated = data.scandal as ScandalFull
        setTvScandal(prev => prev?.id === updated.id ? updated : prev)
        setScandals(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } as ScandalData : s))
        advancingBeatRef.current = false
        if (updated.beat === 'CLOSED') setTimeout(() => setTvScandal(null), 500)
      }
      if (data.type === 'SCANDAL_VOLLEY_FIRED') {
        setTvScandal(prev => {
          if (!prev || prev.id !== data.scandalId) return prev
          return { ...prev, volleys: [...(prev.volleys ?? []), { countryId: data.countryId, round: data.round, side: data.side }] }
        })
      }
      if (data.type === 'SCANDAL_ALLY') {
        setScandals(prev => prev.map(s => s.id === data.scandalId ? { ...s, alliances: [...(s.alliances || []), data.alliance] } : s))
        setTvScandal(prev => prev?.id === data.scandalId ? { ...prev, alliances: [...(prev?.alliances ?? []), data.alliance] } as ScandalFull : prev)
      }
      if (data.type === 'SCANDAL_RESOLVED') {
        setScandals(prev => prev.map(s => s.id === data.scandalId ? { ...s, status: 'RESOLVED' } : s))
        if (data.session) setSession(data.session)
        setScandals(prev => {
          const sc = prev.find(s => s.id === data.scandalId)
          if (sc) {
            setRaidOverlay({ scandalId: data.scandalId, outcome: data.outcome, attackerName: sc.attacker?.name || '?', defenderName: sc.defender?.name || '?', resource: sc.resource, amount: sc.amount })
            setTimeout(() => setRaidOverlay(null), 6000)
          }
          return prev
        })
        setRaidResolving(null)
      }
      // Trade events — add to recent trades feed
      if (data.type === 'TRADE_ACCEPTED' && data.trade) {
        const t = data.trade
        const now = new Date()
        const tStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
        const entry: TradeEntry = {
          tStr,
          from: getPlanetId(data.sender?.name || t.senderName || ''),
          to:   getPlanetId(data.receiver?.name || t.receiverName || ''),
          give: { n: t.offerAmount || 0, r: t.offerResource || 'energy' },
          take: { n: t.requestAmount || 0, r: t.requestResource || 'oxygen' },
          status: 'sealed',
        }
        setRecentTrades(prev => [entry, ...prev].slice(0, 5))
      }
      if (data.type === 'TRADE_OFFER' && data.trade) {
        const t = data.trade
        const now = new Date()
        const tStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
        const entry: TradeEntry = {
          tStr,
          from: getPlanetId(data.senderName || ''),
          to:   getPlanetId(data.receiverName || ''),
          give: { n: t.offerAmount || 0, r: t.offerResource || 'energy' },
          take: { n: t.requestAmount || 0, r: t.requestResource || 'oxygen' },
          status: 'pending',
        }
        setRecentTrades(prev => [entry, ...prev].slice(0, 5))
      }
    }

    // Polling fallback — serverless workers may not share the in-memory
    // EventEmitter, so SSE events can be silently lost. Poll every 4s as backup.
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/session')
        if (res.ok) {
          const fresh = await res.json()
          setSession((prev: Session | null) => {
            if (!prev) return fresh
            // Only update if something actually changed
            if (prev.phase !== fresh.phase || prev.year !== fresh.year ||
                JSON.stringify(prev.countries) !== JSON.stringify(fresh.countries)) {
              if (fresh.phase === 'PROMISE_CHECK') loadPromiseChecks(id, fresh.year)
              if (fresh.phase === 'DEBRIEF') loadDebriefResponses(id)
              return fresh
            }
            return prev
          })
        }
        // Also poll scandals
        const scanRes = await fetch(`/api/scandal?sessionId=${id}`)
        if (scanRes.ok) {
          const scandals = await scanRes.json()
          if (scandals.length > 0) {
            const sc = scandals[0] as ScandalFull
            setTvScandal(prev => {
              if (!prev) {
                // New scandal detected via poll — show raid alert
                setRaidAlert({ attacker: sc.attacker?.name || '?', defender: sc.defender?.name || '?' })
                if (raidAlertTimer.current) clearTimeout(raidAlertTimer.current)
                raidAlertTimer.current = setTimeout(() => setRaidAlert(null), 5000)
                return sc
              }
              // Update existing scandal
              if (prev.id === sc.id) return sc
              return prev
            })
          }
        }
      } catch { /* ignore polling errors */ }
    }, 4000)

    return () => { es.close(); clearInterval(poll) }
  }, [loadSession, loadPromiseChecks, loadDebriefResponses])

  // Beat advance: fire right when timer expires + 1s fallback
  useEffect(() => {
    if (!tvScandal?.beatEndsAt || tvScandal.beat === 'CLOSED') return
    let cancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null

    const doAdvance = async () => {
      if (cancelled || advancingBeatRef.current) return
      advancingBeatRef.current = true
      try {
        const res = await fetch('/api/scandal/advance-beat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ scandalId: tvScandal.id }) })
        if (res.ok) {
          const data = await res.json()
          if (data.scandal) setTvScandal(data.scandal)
        }
      } catch { /* ignore */ }
      advancingBeatRef.current = false
    }

    const diff = new Date(tvScandal.beatEndsAt!).getTime() - Date.now()
    if (diff <= 0) { doAdvance() }
    else { timerId = setTimeout(doAdvance, diff + 100) }

    const fallbackId = setInterval(() => {
      if (new Date(tvScandal.beatEndsAt!).getTime() - Date.now() <= 0) doAdvance()
    }, 1000)

    return () => { cancelled = true; if (timerId) clearTimeout(timerId); clearInterval(fallbackId) }
  }, [tvScandal?.id, tvScandal?.beatEndsAt, tvScandal?.beat])

  const phaseAction = async (action: string, extra?: object) => {
    const id = sessionIdRef.current; if (!id) return
    await fetch('/api/session/phase', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sessionId: id, action, ...extra }) })
  }

  const resolveScandal = async (scandalId: string) => {
    setRaidResolving(scandalId)
    setTimeout(async () => {
      await fetch('/api/scandal/resolve', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ scandalId }) })
    }, 3000)
  }

  // ── Derived values ────────────────────────────────────────
  const phaseIdx = session ? (DB_PHASE_TO_IDX[session.phase] ?? 0) : 0

  const constellationPlanets = useMemo(() => {
    if (!session) return []
    return session.countries.map(c => ({ id: getPlanetId(c.name), color: c.color, name: c.name }))
  }, [session?.countries])

  const reclaimed = useMemo(() => {
    if (!session) return new Set<string>()
    if (session.phase !== 'PROMISE_CHECK') return new Set(constellationPlanets.map(p => p.id))
    const s = new Set<string>()
    for (const c of session.countries) {
      const checks = promiseChecks.filter(ch => ch.countryId === c.id)
      if (checks.length > 0 && checks.every(ch => ch.passed)) s.add(getPlanetId(c.name))
    }
    return s
  }, [session?.phase, promiseChecks, constellationPlanets])

  // Pact progress for ledger column
  const pactProgress = useMemo(() => {
    if (!session) return []
    return session.countries.map(c => {
      const pid = getPlanetId(c.name)
      const checks = promiseChecks.filter(ch => ch.countryId === c.id)
      const due = checks.length
      if (due === 0) return { country: c, pid, pct: 0, due: 0, met: 0 }
      const met = checks.filter(ch => ch.passed).length
      const pct = checks.reduce((acc, ch) => acc + Math.min(1, ch.actual / Math.max(1, ch.required)), 0) / due
      return { country: c, pid, pct, due, met }
    })
  }, [session?.countries, promiseChecks])

  const activeRaids = scandals.filter(s => s.status === 'OPEN')

  if (!session) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:B_BG }}>
      <p style={{ fontFamily:B_MONO, fontSize:10, letterSpacing:'0.3em', color:B_FAINT, textTransform:'uppercase' }}>
        INITIALIZING COMMAND CENTER…
      </p>
    </div>
  )

  const nowStr = new Date().toLocaleString('en-GB', {
    day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit',
  }).toUpperCase().replace(/ /g,'·').replace(',','')

  const isPactCheck = session.phase === 'PROMISE_CHECK'

  return (
    <div style={{ position:'fixed', inset:0, background:B_BG, overflow:'hidden' }}>

      {/* ── Theater of Voids overlay ── */}
      {tvScandal && tvScandal.beat !== 'CLOSED' && (
        <FacilitatorTV scandal={tvScandal} session={session}/>
      )}

      {/* ── Raid alert banner ── */}
      {raidAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 anim-slide-down"
          style={{ background:'rgba(255,59,59,0.15)', borderBottom:'1px solid var(--red-raid)', backdropFilter:'blur(8px)', padding:'0.75rem', textAlign:'center' }}>
          <span style={{ fontFamily:B_MONO, fontSize:11, letterSpacing:'0.2em', color:'#ff3b3b', textShadow:'0 0 10px #ff3b3b' }}>
            ◤ ESCALATION LAUNCHED — {raidAlert.attacker} vs {raidAlert.defender}
          </span>
        </div>
      )}

      {/* ── Raid resolve overlay ── */}
      {(raidResolving || raidOverlay) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background:'rgba(0,0,0,0.9)', backdropFilter:'blur(8px)' }}
          onClick={() => { setRaidOverlay(null); setRaidResolving(null) }}>
          <div style={{ background:'#160a0a', border:'1px solid rgba(255,59,59,0.4)', boxShadow:'0 0 40px rgba(255,59,59,0.15)', padding:'2rem', maxWidth:'28rem', width:'100%', textAlign:'center' }}>
            {raidResolving && !raidOverlay
              ? <p style={{ fontFamily:B_MONO, fontSize:11, letterSpacing:'0.2em', color:'#ff3b3b' }}>RESOLVING ESCALATION…</p>
              : raidOverlay
                ? <div className="anim-fade-in">
                    {raidOverlay.outcome === 'ATTACKER_WINS'
                      ? <p style={{ fontFamily:B_SERIF, fontSize:32, fontWeight:300, fontStyle:'italic', color:'#22c55e' }}>Raid successful.</p>
                      : <p style={{ fontFamily:B_SERIF, fontSize:32, fontWeight:300, fontStyle:'italic', color:'#ff3b3b' }}>Raid repelled.</p>}
                    <p style={{ fontFamily:B_MONO, fontSize:10, letterSpacing:'0.2em', color:B_FAINT, marginTop:12 }}>TAP TO DISMISS</p>
                  </div>
                : null}
          </div>
        </div>
      )}

      {/* ── Active raids panel ── */}
      {activeRaids.length > 0 && (
        <div style={{ position:'absolute', top:16, right:16, zIndex:20, maxWidth:320, display:'flex', flexDirection:'column', gap:8 }}>
          {activeRaids.map(s => (
            <div key={s.id} style={{ background:'rgba(22,10,10,0.95)', border:'1px solid rgba(255,59,59,0.4)', padding:'12px 16px', backdropFilter:'blur(8px)' }}>
              <p style={{ fontFamily:B_MONO, fontSize:9, letterSpacing:'0.2em', color:'#ff3b3b', marginBottom:6 }}>◤ ACTIVE ESCALATION</p>
              <p style={{ fontFamily:B_SERIF, fontSize:16, fontWeight:400 }}>{s.attacker?.name} <span style={{ color:B_FAINT }}>vs</span> {s.defender?.name}</p>
              <button onClick={() => resolveScandal(s.id)} style={{ marginTop:8, fontFamily:B_SANS, fontSize:11, letterSpacing:'0.08em', padding:'6px 14px', border:'1px solid rgba(255,59,59,0.5)', background:'transparent', color:'#ff3b3b', cursor:'pointer' }}>
                RESOLVE
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Main editorial stage ── */}
      <div style={{ position:'absolute', inset:0, color:B_INK, fontFamily:B_SANS, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Animated star field (canvas) */}
        <StarField density={0.7}/>

        {/* Nebula gradient */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          background:`radial-gradient(ellipse at 80% 0%, #5b3a8a33 0%, transparent 50%), radial-gradient(ellipse at 0% 100%, #c9885633 0%, transparent 50%)` }}/>

        {/* ── Masthead ── */}
        <div style={{ position:'relative', flexShrink:0, display:'grid', gridTemplateColumns:'auto 1fr auto', alignItems:'center', padding:'18px 40px 14px', borderBottom:`1px solid ${B_LINE}` }}>
          <div>
            <div style={{ fontFamily:B_SERIF, fontSize:30, fontWeight:300, fontStyle:'italic', letterSpacing:'-0.01em' }}>
              Nebula <span style={{ color:B_GOLD }}>Alliance</span>
            </div>
            <div style={{ fontFamily:B_MONO, fontSize:9, letterSpacing:'0.3em', color:B_FAINT, marginTop:2 }}>
              VOL. V · THE WAR MANUAL · SECTOR 07
            </div>
          </div>
          <div style={{ textAlign:'center', fontFamily:B_MONO, fontSize:10, letterSpacing:'0.25em', color:B_DIM }}>
            THE EMPERIUM · OFFICIAL FACILITATOR DISPATCH
          </div>
          <div style={{ textAlign:'right', fontFamily:B_MONO, fontSize:10, letterSpacing:'0.2em', color:B_DIM }}>
            {nowStr}<br/>
            <span style={{ color:B_GOLD }}>● </span>BROADCAST LIVE
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ position:'relative', flex:1, minHeight:0, display:'grid', gridTemplateColumns:'1.05fr 0.95fr' }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ padding:'24px 40px', borderRight:`1px solid ${B_LINE}`, display:'flex', flexDirection:'column', gap:18, overflow:'hidden' }}>

            {/* Chapter */}
            <div style={{ fontFamily:B_MONO, fontSize:10, letterSpacing:'0.3em', color:B_FAINT, textTransform:'uppercase', fontWeight:500 }}>
              CHAPTER <span style={{ color:B_GOLD }}>{CHAPTER_WORDS[session.year - 1] || 'One'}</span><span style={{ color:B_GOLD }}>.</span> <span style={{ color:B_DIM }}>of five.</span>
            </div>

            {/* Hairline */}
            <div style={{ height:1, background:B_LINE }}/>

            {/* Phase name + tabs */}
            <div>
              <div style={{ display:'flex', alignItems:'baseline', gap:18 }}>
                <div style={{ fontFamily:B_MONO, fontSize:10, letterSpacing:'0.3em', color:B_FAINT, textTransform:'uppercase', fontWeight:500, flexShrink:0 }}>PHASE</div>
                <div style={{ fontFamily:B_SERIF, fontSize:42, fontWeight:300, letterSpacing:'-0.02em', fontStyle:'italic' }}>
                  {PHASE_LABELS[phaseIdx]}
                </div>
              </div>
              <div style={{ display:'flex', gap:0, borderTop:`1px solid ${B_LINE}`, borderBottom:`1px solid ${B_LINE}`, marginTop:8 }}>
                {PHASE_LABELS.map((label, i) => (
                  <div key={i} style={{ flex:1, padding:'10px 0', textAlign:'center',
                    borderRight: i < 3 ? `1px solid ${B_LINE}` : 'none',
                    background: i === phaseIdx ? 'rgba(255,255,255,0.067)' : 'transparent' }}>
                    <div style={{ fontFamily:B_MONO, fontSize:9, letterSpacing:'0.25em', color: i===phaseIdx ? B_GOLD : B_FAINT }}>0{i+1}</div>
                    <div style={{ fontFamily:B_SERIF, fontSize:14, fontStyle: i===phaseIdx ? 'italic' : 'normal', marginTop:3, color: i===phaseIdx ? B_INK : B_DIM }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Constellation */}
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center' }}>
              <EditorialConstellation
                planets={constellationPlanets}
                reclaimed={reclaimed}
                audit={isPactCheck}
                caption={isPactCheck ? `◈ PACTS KEPT · ${reclaimed.size}/10` : null}
              />
            </div>

            {/* Trade log */}
            <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontFamily:B_MONO, fontSize:10, letterSpacing:'0.3em', color:B_FAINT, textTransform:'uppercase', fontWeight:500 }}>TRADE LOG</div>
                <div style={{ fontFamily:B_MONO, fontSize:9, letterSpacing:'0.2em', color:B_GOLD }}>● LIVE</div>
              </div>
              <div style={{ flex:1, minHeight:0, overflow:'hidden', borderTop:`1px solid ${B_LINE}`, display:'flex', flexDirection:'column' }}>
                {recentTrades.slice(0, 5).map((e, i) => {
                  const st = TRADE_STATUS[e.status] || TRADE_STATUS.pending
                  const fromColor = PLANET_COLORS[e.from] || '#888'
                  const toColor   = PLANET_COLORS[e.to] || '#888'
                  const fromName  = e.from.charAt(0).toUpperCase() + e.from.slice(1)
                  const toName    = e.to.charAt(0).toUpperCase() + e.to.slice(1)
                  return (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'42px 1fr 70px', gap:10, alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${B_LINE}` }}>
                      <div style={{ fontFamily:B_MONO, fontSize:10, color:B_FAINT, letterSpacing:'0.1em' }}>{e.tStr}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0, fontFamily:B_SERIF, fontSize:13, fontStyle:'italic', color:B_INK, letterSpacing:'-0.005em' }}>
                        <PlanetOrb name={e.from} color={fromColor} size={14}/>
                        <span style={{ whiteSpace:'nowrap' }}>{fromName}</span>
                        <span style={{ fontFamily:B_MONO, fontSize:10, color:B_GOLD }}>{e.give.n}{RES_GLYPH[e.give.r]||e.give.r}</span>
                        <span style={{ fontFamily:B_MONO, fontSize:11, color:B_FAINT }}>→</span>
                        <span style={{ fontFamily:B_MONO, fontSize:10, color:B_GOLD }}>{e.take.n}{RES_GLYPH[e.take.r]||e.take.r}</span>
                        <PlanetOrb name={e.to} color={toColor} size={14}/>
                        <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{toName}</span>
                      </div>
                      <div style={{ fontFamily:B_MONO, fontSize:9, letterSpacing:'0.2em', color:st.color, textAlign:'right' }}>{st.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Action row */}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => phaseAction('NEXT_PHASE')} style={btnB(true)}>Advance phase</button>
              <button onClick={() => phaseAction('NEXT_YEAR')} style={btnB(false)}>
                Open chapter {CHAPTER_ROMAN[Math.min(session.year, 4)]}
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ padding:'16px 40px', display:'flex', flexDirection:'column', gap:8, overflow:'hidden' }}>
            {isPactCheck ? (
              // Pact ledger mode
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                  <div>
                    <div style={{ fontFamily:B_MONO, fontSize:10, letterSpacing:'0.3em', color:B_FAINT, textTransform:'uppercase', fontWeight:500 }}>PACTS · BY CHAPTER V</div>
                    <div style={{ fontFamily:B_SERIF, fontSize:22, fontWeight:300, letterSpacing:'-0.02em', fontStyle:'italic', marginTop:2 }}>The ledger.</div>
                  </div>
                  <div style={{ fontFamily:B_MONO, fontSize:11, letterSpacing:'0.2em', color:B_GOLD, paddingBottom:4 }}>
                    KEPT · PROGRESS
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
                  {pactProgress.map(({ country: c, pid, pct, due, met }, i) => {
                    const allMet = due > 0 && met === due
                    const fail   = due > 0 && pct < 0.5
                    const barColor = allMet ? B_GOOD : fail ? B_BAD : B_GOLD
                    return (
                      <div key={c.id} style={{ display:'grid', gridTemplateColumns:'22px 1fr 168px',
                        alignItems:'center', gap:10, flex:1, minHeight:0, padding:'2px 0',
                        borderTop: i===0 ? `1px solid ${B_LINE}` : 'none',
                        borderBottom: `1px solid ${B_LINE}` }}>
                        <div style={{ fontFamily:B_SERIF, fontSize:14, color:B_FAINT, fontStyle:'italic' }}>{String(i+1).padStart(2,'0')}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                          <PlanetOrb name={c.name} color={c.color} size={36}/>
                          <div style={{ minWidth:0, flex:1 }}>
                            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8 }}>
                              <div style={{ fontFamily:B_SERIF, fontSize:19, fontWeight:400, letterSpacing:'-0.01em' }}>
                                {c.name.charAt(0)+c.name.slice(1).toLowerCase()}
                              </div>
                              <div style={{ fontFamily:B_MONO, fontSize:11, letterSpacing:'0.1em', color:barColor }}>
                                {met}/{due} KEPT
                              </div>
                            </div>
                            <div style={{ marginTop:3, height:4, background:'rgba(244,239,229,0.1)', position:'relative' }}>
                              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${Math.round(pct*100)}%`, background:barColor }}/>
                            </div>
                          </div>
                        </div>
                        <div style={{ fontFamily:B_MONO, fontSize:14, fontWeight:500, textAlign:'right', letterSpacing:'0.15em', color:barColor }}>
                          {allMet ? 'KEPT' : fail ? 'FAILING' : 'IN-PROG'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Spacer aligns with action row on the left */}
                <div style={{ height:46, flexShrink:0 }}/>
              </>
            ) : (
              // Standings mode
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                  <div>
                    <div style={{ fontFamily:B_MONO, fontSize:10, letterSpacing:'0.3em', color:B_FAINT, textTransform:'uppercase', fontWeight:500 }}>THE TEN</div>
                    <div style={{ fontFamily:B_SERIF, fontSize:22, fontWeight:300, letterSpacing:'-0.02em', fontStyle:'italic', marginTop:2 }}>The standings.</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,56px)', fontFamily:B_MONO, fontSize:11, letterSpacing:'0.2em', color:B_FAINT, paddingBottom:4, textAlign:'right' }}>
                    <span>NRG</span><span>OXG</span><span>CRW</span>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
                  {session.countries.map((c, i) => {
                    const pid = getPlanetId(c.name)
                    return (
                      <div key={c.id} style={{ display:'grid', gridTemplateColumns:'22px 1fr 168px',
                        alignItems:'center', gap:10, flex:1, minHeight:0, padding:'2px 0',
                        borderTop: i===0 ? `1px solid ${B_LINE}` : 'none',
                        borderBottom: `1px solid ${B_LINE}` }}>
                        <div style={{ fontFamily:B_SERIF, fontSize:14, color:B_FAINT, fontStyle:'italic' }}>{String(i+1).padStart(2,'0')}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                          <PlanetOrb name={c.name} color={c.color} size={36}/>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontFamily:B_SERIF, fontSize:19, fontWeight:400, letterSpacing:'-0.01em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {c.name.charAt(0)+c.name.slice(1).toLowerCase()}
                            </div>
                            <div style={{ fontFamily:B_SERIF, fontSize:12, color:B_FAINT, fontStyle:'italic', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {PLANET_MOTTOS[pid] || '—'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,56px)', fontFamily:B_MONO, fontSize:16, fontWeight:500, textAlign:'right' }}>
                          <span style={{ color:B_INK }}>{c.food}</span>
                          <span style={{ color:B_INK }}>{c.environment}</span>
                          <span style={{ color:B_INK }}>{c.wealth}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Spacer aligns with action row on the left */}
                <div style={{ height:46, flexShrink:0 }}/>
              </>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ position:'absolute', bottom:14, left:40, right:40, display:'flex', justifyContent:'flex-end', alignItems:'center', gap:8 }}>
          <button onClick={async () => {
            if (!confirm('Reset session? This clears all planet picks, trades, and game state. Players will need to rejoin.')) return
            const res = await fetch('/api/session/new', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: 'admin123' }) })
            if (res.ok) {
              const fresh = await res.json()
              localStorage.setItem('sessionId', fresh.id)
              window.location.reload()
            } else { alert('Failed to reset session') }
          }}
            style={{ fontFamily:B_MONO, fontSize:9, letterSpacing:'0.3em', color:B_FAINT, background:'transparent', border:`1px solid ${B_LINE}`, padding:'4px 12px', cursor:'pointer' }}>
            ↺ RESET SESSION
          </button>
          <button onClick={() => setQrOpen(o => !o)}
            style={{ fontFamily:B_MONO, fontSize:9, letterSpacing:'0.3em', color:B_FAINT, background:'transparent', border:`1px solid ${B_LINE}`, padding:'4px 12px', cursor:'pointer' }}>
            {qrOpen ? 'HIDE QR' : 'SCAN TO JOIN ▾'}
          </button>
        </div>

        {/* QR popup */}
        {qrOpen && (
          <div style={{ position:'absolute', bottom:42, right:40, background:'#07021a', border:`1px solid ${B_LINE}`, padding:20, boxShadow:'0 0 40px rgba(232,200,122,0.12)', zIndex:30 }}>
            {qrUrl
              ? <img src={qrUrl} alt="Join QR" style={{ display:'block', width:160, height:160 }}/>
              : <div style={{ width:160, height:160, display:'flex', alignItems:'center', justifyContent:'center', color:B_FAINT }}>…</div>}
            <div style={{ fontFamily:B_MONO, fontSize:9, letterSpacing:'0.3em', color:B_GOLD, textAlign:'center', marginTop:10 }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/join` : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
