'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import PlanetOrb from '@/components/PlanetOrb'
import StarField from '@/components/StarField'
import { EscalationSentinelMobileFire, applySNEvent } from '@/components/escalation/EscalationSentinel'

// Internal interface — replaces the deleted ScandalFull import (was previously
// re-exported by ScandalOverlay). Only the fields this file actually reads
// remain.
interface ScandalFull {
  id: string
  attackerId: string
  defenderId: string
  resource: string
  amount: number
  status: string
  beat?: string
  beatEndsAt?: string | null
  currentRound?: number
  hitSide?: string | null
  attacker?: { id: string; name: string; color: string }
  defender?: { id: string; name: string; color: string }
  alliances?: Array<{ countryId: string; side: string; country?: { name: string; color: string } }>
  volleys?: Array<{ countryId: string; round: number; side: string }>
  sessionId?: string
}

// Map planet name → lowercase id used by EscalationSentinel
function nameToSnId(name: string | undefined): string {
  if (!name) return 'ignis'
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
  return 'ignis'
}
function dbResourceToSn(r: string): string {
  if (r === 'food') return 'energy'
  if (r === 'wealth') return 'crew'
  if (r === 'environment') return 'oxygen'
  if (r === 'kushBalls') return 'rockets'
  return r
}

interface Country {
  id: string
  name: string
  color: string
  motto: string
  story: string
  famousFor: string
  food: number
  wealth: number
  environment: number
  kushBalls: number
  relationsData: string
  promisesData: string
}

interface Session {
  id: string
  year: number
  phase: string
  timerEnd: string | null
  timerRunning: boolean
  countries: Country[]
}

interface Trade {
  id: string
  senderId: string
  receiverId: string
  offerResource: string
  offerAmount: number
  requestResource: string
  requestAmount: number
  status: string
  senderName?: string
}

interface Scandal {
  id: string
  attackerId: string
  defenderId: string
  resource: string
  amount: number
  status: string
  windowEndsAt: string
  attacker?: { id: string; name: string; color: string }
  defender?: { id: string; name: string; color: string }
  // Theater of Voids
  beat?: string
  beatEndsAt?: string | null
  currentRound?: number
  hitSide?: string | null
  alliances?: Array<{ countryId: string; side: string; country?: { name: string; color: string } }>
  volleys?: Array<{ countryId: string; round: number; side: string }>
  sessionId?: string
}

const RESOURCES = ['food', 'wealth', 'environment', 'kushBalls'] as const
const RES_LABELS: Record<string, string> = { food: 'Energy', wealth: 'Crew', environment: 'Oxygen', kushBalls: 'Rockets' }
const RES_ICONS: Record<string, string>  = { food: '⚡', wealth: '◉', environment: '○', kushBalls: '◈' }

// Editorial design tokens (mobile_handoff_v2: pure-black surface, blue top-glow,
// gold as the only brand accent)
const B_BG    = '#000'                              // rule 1 — pure black, every surface
const B_GLOW  = '#5b9eff33'                         // rule 3 — fixed blue top-glow @ ~20% alpha
const B_GOLD  = '#e8c87a'                           // rule 4 — single brand accent
const B_INK   = '#f4efe5'
const B_DIM   = 'rgba(244,239,229,0.78)'
const B_FAINT = 'rgba(244,239,229,0.55)'
const B_LINE  = 'rgba(244,239,229,0.14)'
const B_SERIF = '"Century Gothic", "AppleGothic", "Futura", sans-serif'
const B_SANS  = '"Century Gothic", "AppleGothic", "Futura", sans-serif'
const B_MONO  = '"JetBrains Mono", "Courier New", monospace'

const PHASE_LABELS: Record<string, string> = {
  TRADING: 'Trading Phase',
  PROMISE_CHECK: 'Target',
  SCANDAL: 'Escalation',
  YEAR_END: 'Chapter End',
  DEBRIEF: 'Debrief',
}
const PHASE_COLORS: Record<string, string> = {
  TRADING: '#74b9ff',
  PROMISE_CHECK: B_GOLD,
  SCANDAL: '#ff3b3b',
  YEAR_END: '#94a3b8',
  DEBRIEF: '#a78bfa',
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return m ? m[2] : null
}

// Thin 2px progress bar
function ResBar({ value, max = 20, color = B_GOLD }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ width: '100%', height: 2, background: B_LINE, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, boxShadow: `0 0 6px ${color}88`, transition: 'width 0.6s ease' }} />
    </div>
  )
}

// Horizontal rule
function Rule() {
  return <div style={{ height: 1, background: B_LINE, margin: '0 0 16px' }} />
}

// Mono label
function Label({ children, color = B_FAINT, style }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.2em', color, textTransform: 'uppercase', ...style }}>
      {children}
    </div>
  )
}

type TabId = 'identity' | 'resources' | 'pacts' | 'allies'

export default function PlayPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [myCountry, setMyCountry] = useState<Country | null>(null)
  const [tab, setTab] = useState<TabId>('identity')
  const [incomingTrades, setIncomingTrades] = useState<Trade[]>([])
  const [activeScandals, setActiveScandals] = useState<Scandal[]>([])
  const [notification, setNotification] = useState<string | null>(null)
  const [notifType, setNotifType] = useState<'info' | 'raid' | 'error'>('info')
  const [flashRes, setFlashRes] = useState<Record<string, 'up' | 'down' | null>>({})
  const prevResRef = useRef<Record<string, number>>({})
  const [activeScandal, setActiveScandal] = useState<ScandalFull | null>(null)
  const advancingBeatRef = useRef(false)
  const notifiedTradeIdsRef = useRef<Set<string>>(new Set())
  const clockOffsetRef = useRef(0) // serverTime - clientTime in ms

  // Trade modal
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [tradeTarget, setTradeTarget] = useState('')
  const [offerResource, setOfferResource] = useState('food')
  const [offerAmount, setOfferAmount] = useState(1)
  const [requestResource, setRequestResource] = useState('wealth')
  const [requestAmount, setRequestAmount] = useState(1)

  // Target warning popup (shown when entering escalation phase with unmet targets)
  const [showTargetWarning, setShowTargetWarning] = useState(false)

  // Escalation modal
  const [showEscalationModal, setShowEscalationModal] = useState(false)
  const [submittingTrade, setSubmittingTrade] = useState(false)
  const [submittingEscalation, setSubmittingEscalation] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [escalationError, setEscalationError] = useState<string | null>(null)
  const [scandalTarget, setScandalTarget] = useState('')
  const [scandalResource, setScandalResource] = useState('food')
  const [scandalAmount, setScandalAmount] = useState(1)

  // Debrief
  const [debriefStep, setDebriefStep] = useState(0)
  const [debriefAnswers, setDebriefAnswers] = useState({ q1: '', q2: '', q3: '', q4: '', q5: '' })
  const [debriefSubmitted, setDebriefSubmitted] = useState(false)

  const sessionIdRef = useRef<string | null>(null)
  const countryIdRef = useRef<string | null>(null)
  const prevPhaseRef = useRef<string | null>(null)
  const targetWarningShownRef = useRef<string | null>(null) // tracks "year-phase" combo we already showed warning for

  const DEBRIEF_QUESTIONS = [
    'How does this simulation represent your real organization?',
    'Did you focus on your planet\'s survival or the Federation\'s success? What does that mirror at work?',
    'How do departments in your organization "raid" each other\'s resources?',
    'How safe did you feel after the first escalation — and who did you trust?',
    'What would you do differently — in the simulation, and at work?',
  ]

  const showNotif = (msg: string, type: 'info' | 'raid' | 'error' = 'info', ms = 4000) => {
    setNotification(msg)
    setNotifType(type)
    setTimeout(() => setNotification(null), ms)
  }

  const loadData = useCallback(async () => {
    const sessionId = sessionIdRef.current
    const countryId = countryIdRef.current
    if (!sessionId || !countryId) return
    const res = await fetch('/api/session')
    if (!res.ok) return
    const data: Session = await res.json()
    setSession(data)
    const me = data.countries.find(c => c.id === countryId)
    if (me) setMyCountry(me)
  }, [])

  // Beat advance: fire exactly when timer expires, with 1s fallback poll
  useEffect(() => {
    if (!activeScandal?.beatEndsAt || activeScandal.beat === 'CLOSED') return
    let cancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null

    const doAdvance = async () => {
      if (cancelled || advancingBeatRef.current) return
      advancingBeatRef.current = true
      try {
        const res = await fetch('/api/scandal/advance-beat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scandalId: activeScandal.id }),
        })
        if (res.ok) {
          const data = await res.json()
          // Immediately apply the new beat to local state
          if (data.scandal) {
            setActiveScandal(prev => prev?.id === activeScandal.id ? data.scandal : prev)
          }
        }
      } catch { /* ignore */ }
      advancingBeatRef.current = false
    }

    const serverNow = Date.now() + clockOffsetRef.current
    const diff = new Date(activeScandal.beatEndsAt!).getTime() - serverNow
    if (diff <= 0) {
      // Already expired — advance immediately
      doAdvance()
    } else {
      // Schedule to fire right when timer expires (adjusted for clock offset)
      timerId = setTimeout(doAdvance, diff + 100) // +100ms buffer
    }

    // Safety fallback: poll every 1s in case the timeout missed
    const fallbackId = setInterval(() => {
      const sNow = Date.now() + clockOffsetRef.current
      const remaining = new Date(activeScandal.beatEndsAt!).getTime() - sNow
      if (remaining <= 0) doAdvance()
    }, 1000)

    return () => { cancelled = true; if (timerId) clearTimeout(timerId); clearInterval(fallbackId) }
  }, [activeScandal?.id, activeScandal?.beatEndsAt, activeScandal?.beat])

  const updateMyCountry = (me: Country) => {
    const prev = prevResRef.current
    const flashes: Record<string, 'up' | 'down' | null> = {}
    RESOURCES.forEach(r => {
      const cur = me[r] as number
      const p = prev[r]
      if (p !== undefined && cur !== p) flashes[r] = cur > p ? 'up' : 'down'
    })
    RESOURCES.forEach(r => { prevResRef.current[r] = me[r] as number })
    if (Object.keys(flashes).length > 0) {
      setFlashRes(flashes)
      setTimeout(() => setFlashRes({}), 800)
    }
    setMyCountry(me)
  }

  useEffect(() => {
    const sid = getCookie('sessionId')
    const cid = getCookie('countryId')
    if (!sid || !cid) { window.location.href = '/join'; return }
    sessionIdRef.current = sid
    countryIdRef.current = cid
    loadData()

    const es = new EventSource(`/api/sse?sessionId=${sid}`)
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'PLAYER_KICKED' && data.countryId === cid) {
        // Facilitator removed this player from their planet. Clear cookies and
        // bounce back to the join screen so they can rejoin or pick a new one.
        document.cookie = 'countryId=; path=/; max-age=0'
        document.cookie = 'sessionId=; path=/; max-age=0'
        window.location.href = '/join'
        return
      }
      if (data.type === 'SESSION_UPDATE' || data.type === 'SESSION_CREATED') {
        setSession(data.session)
        const me = data.session.countries.find((c: Country) => c.id === cid)
        if (me) updateMyCountry(me)
      }
      if (data.type === 'TRADE_OFFER' && data.trade.receiverId === cid) {
        setIncomingTrades(prev => [...prev, { ...data.trade, senderName: data.senderName }])
        showNotif(`Trade offer from ${data.senderName}`)
      }
      if (data.type === 'TRADE_ACCEPTED' || data.type === 'TRADE_REJECTED') {
        setIncomingTrades(prev => prev.filter(t => t.id !== data.trade?.id))
        const me2 = data.sender?.id === cid ? data.sender : data.receiver?.id === cid ? data.receiver : null
        if (me2) updateMyCountry(me2)
        showNotif(data.type === 'TRADE_ACCEPTED' ? 'Trade accepted.' : 'Trade rejected.')
      }
      if (data.type === 'SCANDAL_LAUNCHED') {
        setActiveScandals(prev => [...prev, data.scandal])
        setActiveScandal(data.scandal as ScandalFull)
        showNotif('Escalation in progress', 'raid')
      }
      if (data.type === 'SCANDAL_ALLY') {
        setActiveScandal(prev => {
          if (!prev || prev.id !== data.scandalId) return prev
          const already = prev.alliances?.some((a: { countryId: string }) => a.countryId === data.alliance.countryId)
          if (already) return prev
          return { ...prev, alliances: [...(prev.alliances ?? []), data.alliance] }
        })
      }
      if (data.type === 'SCANDAL_BEAT_ADVANCED') {
        const updated = data.scandal as ScandalFull
        setActiveScandal(prev => (prev?.id === updated.id) ? updated : prev)
        setActiveScandals(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
        advancingBeatRef.current = false
      }
      if (data.type === 'SCANDAL_VOLLEY_FIRED') {
        setActiveScandal(prev => {
          if (!prev || prev.id !== data.scandalId) return prev
          const newVolley = { countryId: data.countryId, round: data.round, side: data.side }
          return { ...prev, volleys: [...(prev.volleys ?? []), newVolley] }
        })
        // Update my rocket count if it's me
        if (data.countryId === cid) {
          setMyCountry(prev => prev ? { ...prev, kushBalls: data.remainingRockets } : prev)
        } else {
          // Update session country rockets
          setSession(prev => prev ? {
            ...prev,
            countries: prev.countries.map(c => c.id === data.countryId ? { ...c, kushBalls: data.remainingRockets } : c)
          } : prev)
        }
      }
      if (data.type === 'SCANDAL_RESOLVED') {
        setActiveScandals(prev => prev.map(s => s.id === data.scandalId ? { ...s, status: 'RESOLVED' } : s))
        setActiveScandal(prev => prev?.id === data.scandalId ? null : prev)
        if (data.session) {
          setSession(data.session)
          const me2 = data.session.countries.find((c: Country) => c.id === cid)
          if (me2) updateMyCountry(me2)
        }
        const outcome = data.outcome === 'ATTACKER_WINS' ? 'Attacker wins.' : 'Defender holds.'
        showNotif(`Escalation resolved — ${outcome}`)
      }
      // Sentinel real-time sync — server-authoritative state broadcasts.
      // SN_STATE carries the full canonical state (KV-backed); applySNEvent
      // replaces the local SN_GAME cache, advancing only if version >= local.
      if (data.type === 'SN_STATE' || data.type === 'SN_FIRE' || data.type === 'SN_RESET') {
        applySNEvent(data)
      }
    }

    // Poll as fallback since Vercel serverless doesn't share in-memory SSE across instances
    const poll = setInterval(async () => {
      try {
        // Refresh session state (resources, phase, etc.)
        const sesRes = await fetch('/api/session')
        if (sesRes.ok) {
          const fresh: Session = await sesRes.json()
          setSession(fresh)
          const me = fresh.countries.find((c: Country) => c.id === cid)
          if (me) updateMyCountry(me)
        }
        // Refresh trades (incoming + resolved)
        const tradeRes = await fetch(`/api/trade?sessionId=${sid}&countryId=${cid}`)
        if (tradeRes.ok) {
          const data = await tradeRes.json()
          setIncomingTrades(data.incoming || [])
          // Notify about resolved trades we sent
          for (const t of (data.resolved || [])) {
            if (!notifiedTradeIdsRef.current.has(t.id)) {
              notifiedTradeIdsRef.current.add(t.id)
              const name = t.receiverName || 'Unknown'
              if (t.status === 'ACCEPTED') {
                showNotif(`${name} accepted your trade offer.`)
              } else {
                showNotif(`${name} rejected your trade offer.`, 'error')
              }
            }
          }
        }
        // Refresh active scandals
        const scanRes = await fetch(`/api/scandal?sessionId=${sid}`)
        if (scanRes.ok) {
          // Compute clock offset from server time header
          const serverTimeStr = scanRes.headers.get('X-Server-Time')
          if (serverTimeStr) {
            clockOffsetRef.current = new Date(serverTimeStr).getTime() - Date.now()
          }
          const scandals = await scanRes.json()
          setActiveScandals(scandals)
          // Update active scandal if one is open, clear if none
          if (scandals.length > 0) {
            const current = scandals[0]
            setActiveScandal((prev: ScandalFull | null) => {
              if (!prev || prev.id === current.id) return current
              return prev
            })
          } else {
            setActiveScandal((prev: ScandalFull | null) => {
              // Only clear if the current scandal is CLOSED or RESOLVED
              if (prev && (prev.beat === 'CLOSED' || prev.status === 'RESOLVED')) return null
              return prev
            })
          }
        }
      } catch { /* ignore */ }
    }, 3000)

    return () => { es.close(); clearInterval(poll) }
  }, [loadData])

  // Show target warning popup when entering SCANDAL phase with unmet targets
  useEffect(() => {
    if (!session || !myCountry) return
    const currentPhase = session.phase
    const key = `${session.year}-SCANDAL`

    // When phase is SCANDAL and we haven't shown the warning for this year yet
    if (currentPhase === 'SCANDAL' && targetWarningShownRef.current !== key) {
      const pacts = JSON.parse(myCountry.promisesData) as Array<{ resource: string; target: number; byYear: number }>
      const unmet = pacts.filter(p =>
        p.resource !== 'kushBalls' &&
        p.byYear <= session.year &&
        (myCountry[p.resource as keyof Country] as number) < p.target
      )
      if (unmet.length > 0) {
        targetWarningShownRef.current = key
        setShowTargetWarning(true)
      }
    }
    // Reset the tracker when phase moves away from SCANDAL (so it re-shows next time)
    if (currentPhase !== 'SCANDAL') {
      const prevKey = `${session.year}-SCANDAL`
      if (targetWarningShownRef.current === prevKey) {
        targetWarningShownRef.current = null
      }
    }
  }, [session?.phase, session?.year, myCountry])

  const submitTrade = async () => {
    const sid = sessionIdRef.current; const cid = countryIdRef.current
    if (!sid || !cid || !tradeTarget || submittingTrade) return
    setSubmittingTrade(true)
    setTradeError(null)
    try {
      const res = await fetch('/api/trade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, senderId: cid, receiverId: tradeTarget, offerResource, offerAmount, requestResource, requestAmount }),
      })
      if (!res.ok) {
        const err = await res.json()
        setTradeError(err.error || 'Trade failed')
      } else {
        showNotif('Trade offer transmitted.')
        setShowTradeModal(false)
      }
    } finally { setSubmittingTrade(false) }
  }

  const respondTrade = async (tradeId: string, accept: boolean) => {
    await fetch('/api/trade/respond', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeId, accept }),
    })
    setIncomingTrades(prev => prev.filter(t => t.id !== tradeId))
    showNotif(accept ? 'Trade accepted.' : 'Trade rejected.')
  }

  const submitEscalation = async () => {
    const sid = sessionIdRef.current; const cid = countryIdRef.current
    if (!sid || !cid || !scandalTarget || submittingEscalation) return
    setSubmittingEscalation(true)
    setEscalationError(null)
    try {
      const target = session?.countries.find(c => c.id === scandalTarget)
      const amount = target ? (target[scandalResource as keyof Country] as number) : 1
      const res = await fetch('/api/scandal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, attackerId: cid, defenderId: scandalTarget, resource: scandalResource, amount }),
      })
      if (!res.ok) {
        const err = await res.json()
        setEscalationError(err.error || 'Escalation failed')
      } else {
        setShowEscalationModal(false)
      }
    } finally { setSubmittingEscalation(false) }
  }

  const joinScandal = async (scandalId: string, side: 'ATTACKER' | 'DEFENDER') => {
    const cid = countryIdRef.current; if (!cid) return
    await fetch('/api/scandal/ally', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scandalId, countryId: cid, side }),
    })
  }

  const fireRocket = async (): Promise<string | null> => {
    const cid = countryIdRef.current
    if (!cid || !activeScandal) return null
    const res = await fetch('/api/scandal/fire', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scandalId: activeScandal.id, countryId: cid }),
    })
    if (!res.ok) {
      const err = await res.json()
      return err.error || 'Failed to fire'
    } else {
      const data = await res.json()
      // Optimistically update local rocket count and volley list
      setMyCountry(prev => prev ? { ...prev, kushBalls: prev.kushBalls - 1 } : prev)
      setActiveScandal(prev => {
        if (!prev || prev.id !== activeScandal.id) return prev
        return { ...prev, volleys: [...(prev.volleys ?? []), { countryId: cid, round: data.round, side: data.side }] }
      })
      // If auto-advanced, refetch scandal immediately to get new beat state
      if (data.autoAdvanced) {
        const scanRes = await fetch(`/api/scandal?sessionId=${sessionIdRef.current}`)
        if (scanRes.ok) {
          const scandals = await scanRes.json()
          if (scandals.length > 0) setActiveScandal(scandals[0])
        }
      }
      return null
    }
  }

  const joinAllianceForScandal = async (side: 'ATTACKER' | 'DEFENDER') => {
    if (!activeScandal) return
    await joinScandal(activeScandal.id, side)
    // Update local state immediately
    const cid = countryIdRef.current
    if (cid) {
      setActiveScandal(prev => prev ? {
        ...prev,
        alliances: [...(prev.alliances ?? []), { countryId: cid, side }]
      } : prev)
    }
  }

  const submitDebrief = async () => {
    const sid = sessionIdRef.current; const cid = countryIdRef.current; if (!sid || !cid) return
    await fetch('/api/debrief', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, countryId: cid, ...debriefAnswers }),
    })
    setDebriefSubmitted(true)
  }

  // ── Loading state ─────────────────────────────────────────────
  if (!session || !myCountry) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: B_BG,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.6 }}>
          <svg viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke={B_GOLD} strokeWidth="1" strokeOpacity="0.4"/>
            <circle cx="24" cy="24" r="20" stroke={B_GOLD} strokeWidth="1.5"
              strokeDasharray="30 100" strokeLinecap="round"
              style={{ animation: 'spin-slow 2s linear infinite', transformOrigin: '24px 24px' }}/>
          </svg>
        </div>
        <p style={{ fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.2em', color: B_FAINT }}>
          CONNECTING TO FEDERATION
        </p>
      </div>
    </div>
  )

  const relations = JSON.parse(myCountry.relationsData)
  const pacts = JSON.parse(myCountry.promisesData) as Array<{ resource: string; target: number; byYear: number }>
  const otherCountries = session.countries.filter(c => c.id !== myCountry.id)

  // Pacts that are due this year and not yet met (excluding kushBalls/operatives)
  const failedPacts = pacts.filter(p =>
    p.resource !== 'kushBalls' &&
    p.byYear <= session.year &&
    (myCountry[p.resource as keyof Country] as number) < p.target
  )
  const pendingTrades = incomingTrades.filter(t => t.status === 'PENDING')
  const openRaids = activeScandals.filter(s => s.status === 'OPEN' && s.attackerId !== myCountry.id && s.defenderId !== myCountry.id)
  const phaseColor = PHASE_COLORS[session.phase] ?? B_FAINT
  const myColor = myCountry.color

  const TABS: { id: TabId; label: string }[] = [
    { id: 'identity',  label: 'Identity'  },
    { id: 'resources', label: 'Resources' },
    { id: 'pacts',     label: 'Targets'   },
    { id: 'allies',    label: 'Allies'    },
  ]

  return (
    <div style={{
      height: '100dvh',
      width: '100%',
      maxWidth: '32rem',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      background: B_BG,
      fontFamily: B_SANS,
      color: B_INK,
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* (rule 2) Stars — first child of mobile root */}
      <StarField density={1.0} />

      {/* (rule 3) Fixed blue top-glow — same on every tab, NEVER per-planet */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 0%, ${B_GLOW}, transparent 55%)`,
        pointerEvents: 'none',
      }}/>

      {/* ── Notification ── */}
      {notification && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, width: 'calc(100% - 32px)', maxWidth: '30rem',
          padding: '10px 16px', textAlign: 'center',
          background: notifType === 'raid' || notifType === 'error' ? 'rgba(255,59,59,0.15)' : 'rgba(232,200,122,0.1)',
          border: `1px solid ${notifType === 'raid' || notifType === 'error' ? 'rgba(255,59,59,0.4)' : B_LINE}`,
          backdropFilter: 'blur(8px)',
          animation: 'slide-down 0.3s ease-out',
        }}>
          <span style={{
            fontFamily: B_MONO, fontSize: 12, letterSpacing: '0.15em',
            color: notifType === 'raid' || notifType === 'error' ? '#ff3b3b' : B_GOLD,
          }}>
            {notification.toUpperCase()}
          </span>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        position: 'relative',
        padding: '14px 18px 12px',
        borderBottom: `1px solid ${B_LINE}`,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: B_SERIF, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>
          Nebula <span style={{ color: B_GOLD }}>·</span>
        </div>
        <div style={{ fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.2em', color: B_FAINT, textAlign: 'center' }}>
          CHAPTER {session.year}
        </div>
        <div style={{ textAlign: 'right', fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.15em', color: B_GOLD }}>
          ● {(PHASE_LABELS[session.phase] ?? session.phase).toUpperCase()}
        </div>
      </div>

      {/* ── Incoming Trades ── */}
      {pendingTrades.map(t => (
        <div key={t.id} style={{
          position: 'relative',
          margin: '8px 16px 0',
          padding: '12px 14px',
          border: `1px solid ${B_GOLD}44`,
          background: `${B_GOLD}08`,
        }}>
          <Label color={B_GOLD}>Trade offer · {t.senderName}</Label>
          <div style={{ marginTop: 6, fontSize: 14, color: B_INK }}>
            Offer {t.offerAmount} {RES_LABELS[t.offerResource]} &nbsp;·&nbsp; Want {t.requestAmount} {RES_LABELS[t.requestResource]}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => respondTrade(t.id, true)} className="btn-cyan flex-1" style={{ fontSize: '0.8rem' }}>ACCEPT</button>
            <button onClick={() => respondTrade(t.id, false)} className="btn-red flex-1" style={{ fontSize: '0.8rem' }}>REJECT</button>
          </div>
        </div>
      ))}

      {/* ── Escalation Alliance Requests ── */}
      {openRaids.map(s => (
        <div key={s.id} style={{
          position: 'relative',
          margin: '8px 16px 0',
          padding: '12px 14px',
          border: '1px solid rgba(255,59,59,0.4)',
          background: 'rgba(255,59,59,0.06)',
        }}>
          <Label color="#ff3b3b">Escalation · {s.attacker?.name} vs {s.defender?.name}</Label>
          <div style={{ marginTop: 6, fontSize: 14, color: B_INK }}>
            {s.amount} {RES_LABELS[s.resource]} at stake
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => joinScandal(s.id, 'ATTACKER')} className="btn-red flex-1" style={{ fontSize: '0.8rem' }}>◤ STRIKE</button>
            <button onClick={() => joinScandal(s.id, 'DEFENDER')} className="btn-cyan flex-1" style={{ fontSize: '0.8rem' }}>SHIELD ◢</button>
          </div>
        </div>
      ))}

      {/* ── Tab Content ── */}
      <div style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: '20px 20px 0', paddingBottom: '144px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>

        {/* ── IDENTITY ── */}
        {session.phase !== 'DEBRIEF' && tab === 'identity' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            {/* Match mobile_handoff_v2 BPassport: flex centering, no pulse */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0' }}>
              <PlanetOrb name={myCountry.name} size={150} />
            </div>

            <div style={{ fontFamily: B_SERIF, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 0.95, textAlign: 'center', marginBottom: 10 }}>
              {myCountry.name}<span style={{ color: B_GOLD }}>.</span>
            </div>
            <div style={{ fontFamily: B_SERIF, fontSize: 14, color: B_GOLD, textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
              &ldquo;{myCountry.motto}&rdquo;
            </div>

            <Rule />

            <div style={{ width: '100%', marginBottom: 20 }}>
              <Label>About</Label>
              <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.65, color: B_DIM }}>
                {myCountry.story}
              </p>
            </div>

            <Rule />

            <div style={{ width: '100%' }}>
              <Label>Famous for</Label>
              <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.65, color: B_DIM, fontStyle: 'italic' }}>
                {myCountry.famousFor}
              </p>
            </div>
          </div>
        )}

        {/* ── RESOURCES ── */}
        {session.phase !== 'DEBRIEF' && tab === 'resources' && (
          <div style={{ width: '100%' }}>
            {RESOURCES.map(r => {
              const val = myCountry[r] as number
              const flash = flashRes[r]
              return (
                <div key={r} style={{
                  marginBottom: 20,
                  animation: flash === 'up' ? 'flash-green 0.8s ease-out' : flash === 'down' ? 'flash-red-bg 0.8s ease-out' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <Label color={B_GOLD} style={{ fontSize: 16 }}>{RES_ICONS[r]} {RES_LABELS[r]}</Label>
                    <div style={{
                      fontFamily: B_SERIF, fontSize: 34, fontWeight: 700,
                      lineHeight: 1, color: B_GOLD, letterSpacing: '-0.03em',
                    }}>
                      {val}
                    </div>
                  </div>
                  <ResBar value={val} max={20} color={B_GOLD} />
                  {r !== 'kushBalls' && <div style={{ height: 1, background: B_LINE, marginTop: 20 }} />}
                </div>
              )
            })}

          </div>
        )}

        {/* ── PACTS ── */}
        {session.phase !== 'DEBRIEF' && tab === 'pacts' && (
          <div style={{ width: '100%' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: B_SERIF, fontSize: 22, fontWeight: 600, color: B_INK, marginBottom: 4 }}>
                The targets<span style={{ color: B_GOLD }}>.</span>
              </div>
              <div style={{ fontFamily: B_MONO, fontSize: 9, letterSpacing: '0.3em', color: B_FAINT }}>
                COMMITMENTS TO THE FEDERATION
              </div>
            </div>

            {pacts.map((p, i) => {
              const current = myCountry[p.resource as keyof Country] as number
              const pct = Math.min(100, (current / p.target) * 100)
              const isDue = p.byYear <= session.year
              const met = current >= p.target
              const barColor = pct >= 100 ? '#22c55e' : pct >= 60 ? B_GOLD : '#ff3b3b'

              return (
                <div key={i} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: B_SERIF, fontSize: 16, fontWeight: 600, color: B_INK }}>
                        {RES_LABELS[p.resource]}
                        <span style={{ color: B_GOLD }}> → {p.target}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Label color={isDue && !met ? '#ff3b3b' : B_FAINT}>
                        {isDue && !met ? '⚠ ' : met ? '✓ ' : ''}by Ch.{p.byYear}
                      </Label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Label color={B_FAINT}>Current</Label>
                    <span style={{ fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.1em', color: barColor, fontWeight: 500 }}>
                      {current} / {p.target}
                    </span>
                  </div>
                  <ResBar value={current} max={p.target} color={barColor} />
                  {i < pacts.length - 1 && <div style={{ height: 1, background: B_LINE, marginTop: 20 }} />}
                </div>
              )
            })}
          </div>
        )}

        {/* ── ALLIES ── */}
        {session.phase !== 'DEBRIEF' && tab === 'allies' && (
          <div style={{ width: '100%' }}>
            {([
              { key: 'rightOn',  label: 'Warp Lane',  color: '#22c55e' },
              { key: 'writeOff', label: 'Blockaded',   color: '#ff3b3b' },
            ] as const).map(({ key, label, color }) => {
              const names = relations[key] as string[]
              return (
                <div key={key} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 24, height: 1, background: color }} />
                    <Label color={color} style={{ fontSize: 17, letterSpacing: '0.16em' }}>{label}</Label>
                  </div>
                  {names.length === 0 ? (
                    <Label color={B_FAINT}>None</Label>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {names.map((name: string) => {
                        const planet = session.countries.find(c => c.name === name)
                        return (
                          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {planet && (
                              <PlanetOrb name={planet.name} color={planet.color} size={28} />
                            )}
                            <div style={{
                              fontFamily: B_SERIF, fontSize: 15, fontWeight: 500,
                              color: key === 'writeOff' ? B_DIM : B_INK,
                            }}>
                              {name}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div style={{ height: 1, background: B_LINE, marginTop: 20 }} />
                </div>
              )
            })}
          </div>
        )}

        {/* ── DEBRIEF ── */}
        {session.phase === 'DEBRIEF' && (
          <div style={{ marginTop: 8 }}>
            {debriefSubmitted ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontFamily: B_SERIF, fontSize: 48, fontWeight: 700, color: B_GOLD, marginBottom: 12 }}>
                  ◉
                </div>
                <div style={{ fontFamily: B_MONO, fontSize: 12, letterSpacing: '0.2em', color: B_GOLD }}>
                  TRANSMISSION RECEIVED
                </div>
                <div style={{ fontFamily: B_SANS, fontSize: 15, color: B_DIM, marginTop: 8 }}>
                  Thank you, Governor.
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: B_SERIF, fontSize: 22, fontWeight: 700, color: B_INK, marginBottom: 4 }}>
                    Debrief<span style={{ color: B_GOLD }}>.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {DEBRIEF_QUESTIONS.map((_, i) => (
                      <div key={i} style={{
                        flex: 1, height: 2,
                        background: i === debriefStep ? B_GOLD : i < debriefStep ? `${B_GOLD}60` : B_LINE,
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Label color={B_FAINT}>Question {debriefStep + 1} of {DEBRIEF_QUESTIONS.length}</Label>
                  <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.7, color: B_INK }}>
                    {DEBRIEF_QUESTIONS[debriefStep]}
                  </p>
                </div>

                <textarea
                  value={debriefAnswers[`q${debriefStep + 1}` as keyof typeof debriefAnswers]}
                  onChange={e => setDebriefAnswers(prev => ({ ...prev, [`q${debriefStep + 1}`]: e.target.value }))}
                  rows={4}
                  className="sp-input"
                  style={{ resize: 'none' }}
                  placeholder="Transmit your response..."
                />

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {debriefStep > 0 && (
                    <button onClick={() => setDebriefStep(s => s - 1)} className="btn-ghost flex-1">← BACK</button>
                  )}
                  {debriefStep < DEBRIEF_QUESTIONS.length - 1 ? (
                    <button onClick={() => setDebriefStep(s => s + 1)} className="btn-cyan flex-1">NEXT →</button>
                  ) : (
                    <button onClick={submitDebrief} className="btn-cyan flex-1" style={{ boxShadow: 'var(--cyan-glow)' }}>
                      TRANSMIT ALL
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Action Ribbon (above tabs) — hidden during scandal overlay ── */}
      {!(activeScandal && activeScandal.beat !== 'CLOSED') && <div style={{
        position: 'absolute', bottom: 64, left: 0, right: 0,
        padding: '10px 16px', display: 'flex', gap: 8,
        borderTop: `1px solid ${B_LINE}`,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      }}>
        {session.phase === 'TRADING' && (
          <button onClick={() => { setTradeError(null); setShowTradeModal(true) }} style={{
            flex: 1, padding: '12px 0',
            background: B_GOLD, border: 'none', color: '#0b0a14',
            fontFamily: B_SERIF, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', letterSpacing: '-0.01em',
          }}>
            Propose a trade
          </button>
        )}
        {session.phase === 'SCANDAL' && failedPacts.length > 0 && (
          <button onClick={() => { setEscalationError(null); setScandalResource(failedPacts[0].resource); setShowEscalationModal(true) }} style={{
            flex: 1, padding: '12px 0',
            background: '#ff3b3b', border: 'none', color: '#fff',
            fontFamily: B_SERIF, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', letterSpacing: '-0.01em',
          }}>
            Launch escalation
          </button>
        )}
        {session.phase !== 'TRADING' && session.phase !== 'SCANDAL' && (
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.2em', color: B_FAINT }}>
            {PHASE_LABELS[session.phase]?.toUpperCase() ?? 'STANDBY'}
          </div>
        )}
        {session.phase === 'SCANDAL' && failedPacts.length === 0 && (
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.2em', color: B_FAINT }}>
            ESCALATION PHASE · STANDBY
          </div>
        )}
      </div>}

      {/* ── Bottom Tab Bar — hidden during scandal overlay ── */}
      {!(activeScandal && activeScandal.beat !== 'CLOSED') && <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 64,
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        borderTop: `1px solid ${B_LINE}`,
        background: B_BG,
      }}>
        {TABS.map(({ id, label }) => {
          const active = tab === id
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '13px 0 16px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: active ? B_GOLD : B_DIM,
              fontFamily: B_SERIF, fontSize: 14, fontWeight: active ? 600 : 400,
              letterSpacing: '-0.01em',
              position: 'relative',
            }}>
              {label}
              {active && (
                <div style={{ position: 'absolute', top: 0, left: '30%', right: '30%', height: 1, background: B_GOLD }} />
              )}
            </button>
          )
        })}
      </div>}

      {/* ── Trade Modal ── */}
      {showTradeModal && (
        <div className="sp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowTradeModal(false) }}>
          <div className="sp-modal">
            <div style={{ fontFamily: B_SERIF, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              Propose trade<span style={{ color: B_GOLD }}>.</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '12px 0' }}>
              {RESOURCES.map(r => (
                <div key={r} style={{ background: 'rgba(244,239,229,0.06)', borderRadius: 6, padding: '8px 0', textAlign: 'center' }}>
                  <div style={{ fontFamily: B_MONO, fontSize: 9, letterSpacing: '0.15em', color: B_FAINT, marginBottom: 2 }}>{RES_LABELS[r]}</div>
                  <div style={{ fontFamily: B_SERIF, fontSize: 20, fontWeight: 700, color: B_GOLD }}>{myCountry![r as keyof Country] as number}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: B_LINE, margin: '0 0 12px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Label>Target planet</Label>
                <select value={tradeTarget} onChange={e => setTradeTarget(e.target.value)} className="sp-input" style={{ marginTop: 6 }}>
                  <option value="">Select…</option>
                  {otherCountries.map(c => {
                    const blocked = relations.writeOff.includes(c.name)
                    return (
                      <option key={c.id} value={c.id} disabled={blocked}>
                        {c.name}{blocked ? ' (Blockaded)' : relations.rightOn?.includes(c.name) ? ' · Warp Lane' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Label style={{ marginBottom: 6 }}>I offer</Label>
                  <select value={offerResource} onChange={e => setOfferResource(e.target.value)} className="sp-input" style={{ marginBottom: 8 }}>
                    {RESOURCES.map(r => <option key={r} value={r}>{RES_LABELS[r]}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setOfferAmount(a => Math.max(0, a - 1))} className="btn-ghost" style={{ padding: '4px 10px' }}>−</button>
                    <span style={{ fontFamily: B_SERIF, fontSize: 24, fontWeight: 700, color: B_GOLD, flex: 1, textAlign: 'center' }}>{offerAmount}</span>
                    <button onClick={() => setOfferAmount(a => a + 1)} className="btn-ghost" style={{ padding: '4px 10px' }}>+</button>
                  </div>
                </div>
                <div>
                  <Label style={{ marginBottom: 6 }}>I want</Label>
                  <select value={requestResource} onChange={e => setRequestResource(e.target.value)} className="sp-input" style={{ marginBottom: 8 }}>
                    {RESOURCES.map(r => <option key={r} value={r}>{RES_LABELS[r]}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setRequestAmount(a => Math.max(0, a - 1))} className="btn-ghost" style={{ padding: '4px 10px' }}>−</button>
                    <span style={{ fontFamily: B_SERIF, fontSize: 24, fontWeight: 700, color: B_GOLD, flex: 1, textAlign: 'center' }}>{requestAmount}</span>
                    <button onClick={() => setRequestAmount(a => a + 1)} className="btn-ghost" style={{ padding: '4px 10px' }}>+</button>
                  </div>
                </div>
              </div>

              {tradeError && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(255,59,59,0.12)',
                  border: '1px solid rgba(255,59,59,0.4)',
                  borderRadius: 6,
                }}>
                  <span style={{ fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.1em', color: '#ff3b3b' }}>
                    {tradeError.toUpperCase()}
                  </span>
                </div>
              )}
              <button onClick={submitTrade} disabled={!tradeTarget || submittingTrade} className="btn-cyan w-full" style={{ padding: '12px 0' }}>
                {submittingTrade ? 'TRANSMITTING…' : 'TRANSMIT OFFER'}
              </button>
              <button onClick={() => setShowTradeModal(false)} className="btn-ghost w-full" style={{ padding: '10px 0' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Escalation Sentinel — full-screen mobile fire UI ── */}
      {activeScandal && activeScandal.beat !== 'CLOSED' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#050308' }}>
          <EscalationSentinelMobileFire
            myPlanetId={nameToSnId(myCountry.name)}
            attackerId={nameToSnId(activeScandal.attacker?.name)}
            defenderId={nameToSnId(activeScandal.defender?.name)}
            resource={dbResourceToSn(activeScandal.resource)}
            amount={activeScandal.amount}
            sessionId={session.id}
          />
        </div>
      )}

      {/* ── Target Warning Popup ── */}
      {showTargetWarning && (
        <div className="sp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowTargetWarning(false) }}>
          <div className="sp-modal sp-modal-red" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Blinking red border glow */}
            <div style={{
              position: 'absolute', inset: -1, border: '2px solid #ff3b3b',
              animation: 'target-warn-blink 1.2s ease-in-out infinite',
              pointerEvents: 'none',
            }}/>

            {/* Warning icon */}
            <div style={{
              width: 56, height: 56, margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,59,59,0.12)', borderRadius: '50%',
              animation: 'target-warn-blink 1.2s ease-in-out infinite',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.9 }}>
                <path d="M12 2L1 21h22L12 2z" fill="rgba(255,59,59,0.25)" stroke="#ff3b3b" strokeWidth="1.5"/>
                <line x1="12" y1="9" x2="12" y2="14" stroke="#ff3b3b" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1" fill="#ff3b3b"/>
              </svg>
            </div>

            <div style={{ fontFamily: B_MONO, fontSize: 10, letterSpacing: '0.3em', color: '#ff3b3b', marginBottom: 8, textTransform: 'uppercase' }}>
              ◤ ALERT · TARGET BREACH
            </div>
            <div style={{ fontFamily: B_SERIF, fontSize: 26, fontWeight: 700, color: '#ff3b3b', marginBottom: 6, fontStyle: 'italic' }}>
              Target not met.
            </div>
            <div style={{ fontFamily: B_SERIF, fontSize: 15, color: B_DIM, marginBottom: 8, lineHeight: 1.5 }}>
              Your planet has failed to reach its resource target this chapter.
            </div>
            <div style={{ fontFamily: B_MONO, fontSize: 10, letterSpacing: '0.2em', color: B_FAINT, marginBottom: 24 }}>
              SEIZE WHAT YOU NEED · LAUNCH AN ESCALATION
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowTargetWarning(false)
                  setEscalationError(null)
                  const pacts = JSON.parse(myCountry!.promisesData) as Array<{ resource: string; target: number; byYear: number }>
                  const unmet = pacts.filter(p =>
                    p.resource !== 'kushBalls' &&
                    p.byYear <= session!.year &&
                    (myCountry![p.resource as keyof Country] as number) < p.target
                  )
                  if (unmet.length > 0) setScandalResource(unmet[0].resource)
                  setShowEscalationModal(true)
                }}
                style={{
                  flex: 1, padding: '14px 0',
                  background: '#ff3b3b', border: 'none', color: '#fff',
                  fontFamily: B_SERIF, fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', letterSpacing: '-0.01em',
                  boxShadow: '0 0 20px rgba(255,59,59,0.4)',
                }}
              >
                ◤ ESCALATE
              </button>
              <button
                onClick={() => setShowTargetWarning(false)}
                style={{
                  flex: 1, padding: '14px 0',
                  background: 'transparent', border: '1px solid rgba(255,59,59,0.3)', color: B_FAINT,
                  fontFamily: B_SERIF, fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', letterSpacing: '-0.01em',
                }}
              >
                STAND DOWN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Escalation Modal ── */}
      {showEscalationModal && (
        <div className="sp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowEscalationModal(false) }}>
          <div className="sp-modal sp-modal-red">
            <div style={{ fontFamily: B_SERIF, fontSize: 22, fontWeight: 700, color: '#ff3b3b', marginBottom: 4 }}>
              Launch escalation<span style={{ color: B_INK }}>.</span>
            </div>
            <div style={{ fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.2em', color: B_FAINT, marginBottom: 12 }}>
              PICK A TARGET · PICK A RESOURCE · ALL OR NOTHING
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '0 0 12px' }}>
              {RESOURCES.map(r => (
                <div key={r} style={{ background: 'rgba(255,59,59,0.08)', borderRadius: 6, padding: '8px 0', textAlign: 'center' }}>
                  <div style={{ fontFamily: B_MONO, fontSize: 9, letterSpacing: '0.15em', color: B_FAINT, marginBottom: 2 }}>{RES_LABELS[r]}</div>
                  <div style={{ fontFamily: B_SERIF, fontSize: 20, fontWeight: 700, color: '#ff3b3b' }}>{myCountry![r as keyof Country] as number}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: 'rgba(255,59,59,0.3)', margin: '0 0 16px' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Label color="rgba(255,59,59,0.7)">Target planet</Label>
                <select value={scandalTarget} onChange={e => setScandalTarget(e.target.value)} className="sp-input" style={{ marginTop: 6 }}>
                  <option value="">Select…</option>
                  {otherCountries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <Label color="rgba(255,59,59,0.7)">Failed target to seize</Label>
                <select value={scandalResource} onChange={e => setScandalResource(e.target.value)} className="sp-input" style={{ marginTop: 6 }}>
                  {failedPacts.map(p => (
                    <option key={p.resource} value={p.resource}>
                      {RES_LABELS[p.resource]} (need {p.target}, have {myCountry![p.resource as keyof Country] as number})
                    </option>
                  ))}
                </select>
                <div style={{ fontFamily: B_MONO, fontSize: 10, letterSpacing: '0.15em', color: B_FAINT, marginTop: 6 }}>
                  ALL of the target&apos;s {RES_LABELS[scandalResource]} will be at stake
                </div>
              </div>

              {escalationError && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(255,59,59,0.12)',
                  border: '1px solid rgba(255,59,59,0.4)',
                  borderRadius: 6,
                }}>
                  <span style={{ fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.1em', color: '#ff3b3b' }}>
                    {escalationError.toUpperCase()}
                  </span>
                </div>
              )}
              <button onClick={submitEscalation} disabled={!scandalTarget || submittingEscalation} className="btn-red w-full" style={{ padding: '12px 0' }}>
                {submittingEscalation ? 'LAUNCHING…' : '◤ LAUNCH'}
              </button>
              <button onClick={() => setShowEscalationModal(false)} className="btn-ghost w-full" style={{ padding: '10px 0' }}>
                STAND DOWN
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
