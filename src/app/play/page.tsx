'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import PlanetOrb from '@/components/PlanetOrb'

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
  attacker?: { name: string }
  defender?: { name: string }
}

const RESOURCES = ['food', 'wealth', 'environment', 'kushBalls'] as const
const RES_LABELS: Record<string, string> = { food: 'Energy', wealth: 'Crew', environment: 'Oxygen', kushBalls: 'Operatives' }
const RES_ICONS: Record<string, string>  = { food: '⚡', wealth: '◉', environment: '○', kushBalls: '◈' }

// Editorial design tokens
const B_GOLD  = '#e8c87a'
const B_INK   = '#f4efe5'
const B_DIM   = 'rgba(244,239,229,0.6)'
const B_FAINT = 'rgba(244,239,229,0.35)'
const B_LINE  = 'rgba(244,239,229,0.12)'
const B_SERIF = '"Fraunces", "Georgia", serif'
const B_MONO  = '"JetBrains Mono", "Courier New", monospace'

const PHASE_LABELS: Record<string, string> = {
  TRADING: 'Trading Phase',
  PROMISE_CHECK: 'Pact Check',
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
    <div style={{ fontFamily: B_MONO, fontSize: 9, letterSpacing: '0.3em', color, textTransform: 'uppercase', ...style }}>
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

  // Trade modal
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [tradeTarget, setTradeTarget] = useState('')
  const [offerResource, setOfferResource] = useState('food')
  const [offerAmount, setOfferAmount] = useState(1)
  const [requestResource, setRequestResource] = useState('wealth')
  const [requestAmount, setRequestAmount] = useState(1)

  // Escalation modal
  const [showEscalationModal, setShowEscalationModal] = useState(false)
  const [scandalTarget, setScandalTarget] = useState('')
  const [scandalResource, setScandalResource] = useState('food')
  const [scandalAmount, setScandalAmount] = useState(1)

  // Debrief
  const [debriefStep, setDebriefStep] = useState(0)
  const [debriefAnswers, setDebriefAnswers] = useState({ q1: '', q2: '', q3: '', q4: '', q5: '' })
  const [debriefSubmitted, setDebriefSubmitted] = useState(false)

  const sessionIdRef = useRef<string | null>(null)
  const countryIdRef = useRef<string | null>(null)

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
        showNotif('Escalation in progress', 'raid')
      }
      if (data.type === 'SCANDAL_RESOLVED') {
        setActiveScandals(prev => prev.map(s => s.id === data.scandalId ? { ...s, status: 'RESOLVED' } : s))
        if (data.session) {
          setSession(data.session)
          const me2 = data.session.countries.find((c: Country) => c.id === cid)
          if (me2) updateMyCountry(me2)
        }
        const outcome = data.outcome === 'ATTACKER_WINS' ? 'Attacker wins.' : 'Defender holds.'
        showNotif(`Escalation resolved — ${outcome}`)
      }
    }
    return () => es.close()
  }, [loadData])

  const submitTrade = async () => {
    const sid = sessionIdRef.current; const cid = countryIdRef.current
    if (!sid || !cid || !tradeTarget) return
    const res = await fetch('/api/trade', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, senderId: cid, receiverId: tradeTarget, offerResource, offerAmount, requestResource, requestAmount }),
    })
    if (!res.ok) {
      const err = await res.json()
      showNotif(err.error, 'error')
    } else {
      showNotif('Trade offer transmitted.')
      setShowTradeModal(false)
    }
  }

  const respondTrade = async (tradeId: string, accept: boolean) => {
    await fetch('/api/trade/respond', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeId, accept }),
    })
    setIncomingTrades(prev => prev.filter(t => t.id !== tradeId))
  }

  const submitEscalation = async () => {
    const sid = sessionIdRef.current; const cid = countryIdRef.current
    if (!sid || !cid || !scandalTarget) return
    const res = await fetch('/api/scandal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, attackerId: cid, defenderId: scandalTarget, resource: scandalResource, amount: scandalAmount }),
    })
    if (!res.ok) {
      const err = await res.json()
      showNotif(err.error, 'error')
    } else {
      setShowEscalationModal(false)
    }
  }

  const joinScandal = async (scandalId: string, side: 'ATTACKER' | 'DEFENDER') => {
    const cid = countryIdRef.current; if (!cid) return
    await fetch('/api/scandal/ally', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scandalId, countryId: cid, side }),
    })
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
      background: '#0b0a14',
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
        <p style={{ fontFamily: B_MONO, fontSize: 10, letterSpacing: '0.3em', color: B_FAINT }}>
          CONNECTING TO FEDERATION
        </p>
      </div>
    </div>
  )

  const relations = JSON.parse(myCountry.relationsData)
  const pacts = JSON.parse(myCountry.promisesData) as Array<{ resource: string; target: number; byYear: number }>
  const otherCountries = session.countries.filter(c => c.id !== myCountry.id)
  const pendingTrades = incomingTrades.filter(t => t.status === 'PENDING')
  const openRaids = activeScandals.filter(s => s.status === 'OPEN' && s.attackerId !== myCountry.id && s.defenderId !== myCountry.id)
  const phaseColor = PHASE_COLORS[session.phase] ?? B_FAINT
  const myColor = myCountry.color

  const TABS: { id: TabId; label: string }[] = [
    { id: 'identity',  label: 'Identity'  },
    { id: 'resources', label: 'Resources' },
    { id: 'pacts',     label: 'Pacts'     },
    { id: 'allies',    label: 'Allies'    },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      maxWidth: '32rem',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      background: '#0b0a14',
      fontFamily: '"Inter Tight", system-ui, sans-serif',
      color: B_INK,
    }}>

      {/* ── Notification ── */}
      {notification && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, width: 'calc(100% - 32px)', maxWidth: '30rem',
          padding: '10px 16px', textAlign: 'center',
          background: notifType === 'raid' ? 'rgba(255,59,59,0.15)' : 'rgba(232,200,122,0.1)',
          border: `1px solid ${notifType === 'raid' ? 'rgba(255,59,59,0.4)' : B_LINE}`,
          backdropFilter: 'blur(8px)',
          animation: 'slide-down 0.3s ease-out',
        }}>
          <span style={{
            fontFamily: B_MONO, fontSize: 10, letterSpacing: '0.2em',
            color: notifType === 'raid' ? '#ff3b3b' : B_GOLD,
          }}>
            {notification.toUpperCase()}
          </span>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: `1px solid ${B_LINE}`,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 12,
      }}>
        <PlanetOrb name={myCountry.name} color={myColor} size={32} glow pulse={session.phase === 'SCANDAL'} />
        <div>
          <div style={{ fontFamily: B_SERIF, fontSize: 15, fontWeight: 300, fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            {myCountry.name}
          </div>
          <div style={{ fontFamily: B_MONO, fontSize: 8, letterSpacing: '0.25em', color: B_FAINT, marginTop: 2 }}>
            PLANETARY GOVERNOR
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: B_SERIF, fontSize: 18, fontWeight: 300, fontStyle: 'italic', color: B_INK, lineHeight: 1 }}>
            Ch.{session.year}
          </div>
          <div style={{
            fontFamily: B_MONO, fontSize: 8, letterSpacing: '0.2em',
            color: phaseColor, marginTop: 3,
          }}>
            {(PHASE_LABELS[session.phase] ?? session.phase).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Incoming Trades ── */}
      {pendingTrades.map(t => (
        <div key={t.id} style={{
          margin: '8px 16px 0',
          padding: '12px 14px',
          border: `1px solid ${B_GOLD}44`,
          background: `${B_GOLD}08`,
        }}>
          <Label color={B_GOLD}>Trade offer · {t.senderName}</Label>
          <div style={{ marginTop: 6, fontSize: 12, color: B_DIM }}>
            Offer {t.offerAmount} {RES_LABELS[t.offerResource]} &nbsp;·&nbsp; Want {t.requestAmount} {RES_LABELS[t.requestResource]}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => respondTrade(t.id, true)} className="btn-cyan flex-1" style={{ fontSize: '0.7rem' }}>ACCEPT</button>
            <button onClick={() => respondTrade(t.id, false)} className="btn-red flex-1" style={{ fontSize: '0.7rem' }}>REJECT</button>
          </div>
        </div>
      ))}

      {/* ── Escalation Alliance Requests ── */}
      {openRaids.map(s => (
        <div key={s.id} style={{
          margin: '8px 16px 0',
          padding: '12px 14px',
          border: '1px solid rgba(255,59,59,0.4)',
          background: 'rgba(255,59,59,0.06)',
        }}>
          <Label color="#ff3b3b">Escalation · {s.attacker?.name} vs {s.defender?.name}</Label>
          <div style={{ marginTop: 6, fontSize: 12, color: B_DIM }}>
            {s.amount} {RES_LABELS[s.resource]} at stake
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => joinScandal(s.id, 'ATTACKER')} className="btn-red flex-1" style={{ fontSize: '0.7rem' }}>◤ STRIKE</button>
            <button onClick={() => joinScandal(s.id, 'DEFENDER')} className="btn-cyan flex-1" style={{ fontSize: '0.7rem' }}>SHIELD ◢</button>
          </div>
        </div>
      ))}

      {/* ── Tab Bar ── */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${B_LINE}`,
        marginTop: pendingTrades.length + openRaids.length > 0 ? 12 : 0,
      }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '12px 0 10px',
              background: 'transparent',
              border: 'none',
              borderTop: active ? `2px solid ${B_GOLD}` : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: active ? B_SERIF : '"Inter Tight", system-ui, sans-serif',
              fontSize: active ? 12 : 11,
              fontStyle: active ? 'italic' : 'normal',
              fontWeight: active ? 300 : 400,
              letterSpacing: active ? '0.01em' : '0.06em',
              color: active ? B_GOLD : B_FAINT,
              transition: 'all 0.2s',
            }}>
              {active ? t.label : t.label.toUpperCase()}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px' }}>

        {/* ── IDENTITY ── */}
        {tab === 'identity' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ marginBottom: 20 }}>
              <PlanetOrb name={myCountry.name} color={myColor} size={150} glow pulse />
            </div>

            <div style={{ fontFamily: B_SERIF, fontSize: 34, fontWeight: 300, fontStyle: 'italic', letterSpacing: '-0.02em', lineHeight: 0.95, textAlign: 'center', marginBottom: 10 }}>
              {myCountry.name}<span style={{ color: B_GOLD }}>.</span>
            </div>
            <div style={{ fontFamily: B_SERIF, fontSize: 14, fontStyle: 'italic', color: B_DIM, textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
              &ldquo;{myCountry.motto}&rdquo;
            </div>

            <Rule />

            <div style={{ width: '100%', marginBottom: 20 }}>
              <Label>About</Label>
              <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.65, color: B_DIM }}>
                {myCountry.story}
              </p>
            </div>

            <Rule />

            <div style={{ width: '100%' }}>
              <Label>Famous for</Label>
              <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.65, color: B_DIM, fontStyle: 'italic' }}>
                {myCountry.famousFor}
              </p>
            </div>
          </div>
        )}

        {/* ── RESOURCES ── */}
        {tab === 'resources' && (
          <div>
            {RESOURCES.map(r => {
              const val = myCountry[r] as number
              const flash = flashRes[r]
              return (
                <div key={r} style={{
                  marginBottom: 20,
                  animation: flash === 'up' ? 'flash-green 0.8s ease-out' : flash === 'down' ? 'flash-red-bg 0.8s ease-out' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <Label>{RES_ICONS[r]} {RES_LABELS[r]}</Label>
                    <div style={{
                      fontFamily: B_SERIF, fontSize: 50, fontWeight: 300, fontStyle: 'italic',
                      lineHeight: 1, color: B_INK, letterSpacing: '-0.03em',
                    }}>
                      {val}
                    </div>
                  </div>
                  <ResBar value={val} max={20} color={myColor} />
                  {r !== 'kushBalls' && <div style={{ height: 1, background: B_LINE, marginTop: 20 }} />}
                </div>
              )
            })}

            {session.phase === 'TRADING' && (
              <button onClick={() => setShowTradeModal(true)} className="btn-cyan w-full" style={{ marginTop: 8, padding: '14px 0', fontSize: '0.7rem', letterSpacing: '0.12em' }}>
                PROPOSE TRADE
              </button>
            )}

            {session.phase === 'SCANDAL' && (
              <button onClick={() => setShowEscalationModal(true)} className="btn-red w-full" style={{ marginTop: 8, padding: '14px 0', fontSize: '0.7rem', letterSpacing: '0.12em', boxShadow: '0 0 10px rgba(255,59,59,0.3)' }}>
                ◤ LAUNCH ESCALATION
              </button>
            )}
          </div>
        )}

        {/* ── PACTS ── */}
        {tab === 'pacts' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: B_SERIF, fontSize: 22, fontWeight: 300, fontStyle: 'italic', color: B_INK, marginBottom: 4 }}>
                The pacts<span style={{ color: B_GOLD }}>.</span>
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
                      <div style={{ fontFamily: B_SERIF, fontSize: 18, fontStyle: 'italic', color: B_INK }}>
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
                    <span style={{ fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.15em', color: barColor }}>
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
        {tab === 'allies' && (
          <div>
            {([
              { key: 'rightOn',  label: 'Warp Lane',           color: '#22c55e' },
              { key: 'allRight', label: 'Diplomatic Clearance', color: B_GOLD },
              { key: 'writeOff', label: 'Blockaded',            color: '#ff3b3b' },
            ] as const).map(({ key, label, color }) => {
              const names = relations[key] as string[]
              return (
                <div key={key} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 20, height: 1, background: color }} />
                    <Label color={color}>{label}</Label>
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
                              <PlanetOrb name={planet.name} color={planet.color} size={28} glow={false} />
                            )}
                            <div style={{
                              fontFamily: B_SERIF, fontSize: 14, fontStyle: 'italic',
                              color: key === 'writeOff' ? B_FAINT : B_INK,
                              textDecoration: key === 'writeOff' ? 'line-through' : 'none',
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
                <div style={{ fontFamily: B_SERIF, fontSize: 48, fontStyle: 'italic', color: B_GOLD, marginBottom: 12 }}>
                  ◉
                </div>
                <div style={{ fontFamily: B_MONO, fontSize: 10, letterSpacing: '0.3em', color: B_GOLD }}>
                  TRANSMISSION RECEIVED
                </div>
                <div style={{ fontFamily: B_SERIF, fontSize: 14, fontStyle: 'italic', color: B_FAINT, marginTop: 8 }}>
                  Thank you, Governor.
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: B_SERIF, fontSize: 22, fontWeight: 300, fontStyle: 'italic', color: B_INK, marginBottom: 4 }}>
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

      {/* ── Trade Modal ── */}
      {showTradeModal && (
        <div className="sp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowTradeModal(false) }}>
          <div className="sp-modal">
            <div style={{ fontFamily: B_SERIF, fontSize: 22, fontStyle: 'italic', marginBottom: 4 }}>
              Propose trade<span style={{ color: B_GOLD }}>.</span>
            </div>
            <div style={{ height: 1, background: B_LINE, margin: '12px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Label>Target planet</Label>
                <select value={tradeTarget} onChange={e => setTradeTarget(e.target.value)} className="sp-input" style={{ marginTop: 6 }}>
                  <option value="">Select…</option>
                  {otherCountries.map(c => {
                    const blocked = relations.writeOff.includes(c.name)
                    return (
                      <option key={c.id} value={c.id} disabled={blocked}>
                        {c.name}{blocked ? ' (Blockaded)' : relations.rightOn.includes(c.name) ? ' · Warp Lane' : relations.allRight.includes(c.name) ? ' · Diplo.' : ''}
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
                    <button onClick={() => setOfferAmount(a => Math.max(1, a - 1))} className="btn-ghost" style={{ padding: '4px 10px' }}>−</button>
                    <span style={{ fontFamily: B_SERIF, fontSize: 24, fontStyle: 'italic', color: B_GOLD, flex: 1, textAlign: 'center' }}>{offerAmount}</span>
                    <button onClick={() => setOfferAmount(a => a + 1)} className="btn-ghost" style={{ padding: '4px 10px' }}>+</button>
                  </div>
                </div>
                <div>
                  <Label style={{ marginBottom: 6 }}>I want</Label>
                  <select value={requestResource} onChange={e => setRequestResource(e.target.value)} className="sp-input" style={{ marginBottom: 8 }}>
                    {RESOURCES.map(r => <option key={r} value={r}>{RES_LABELS[r]}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setRequestAmount(a => Math.max(1, a - 1))} className="btn-ghost" style={{ padding: '4px 10px' }}>−</button>
                    <span style={{ fontFamily: B_SERIF, fontSize: 24, fontStyle: 'italic', color: B_GOLD, flex: 1, textAlign: 'center' }}>{requestAmount}</span>
                    <button onClick={() => setRequestAmount(a => a + 1)} className="btn-ghost" style={{ padding: '4px 10px' }}>+</button>
                  </div>
                </div>
              </div>

              <button onClick={submitTrade} disabled={!tradeTarget} className="btn-cyan w-full" style={{ padding: '12px 0' }}>
                TRANSMIT OFFER
              </button>
              <button onClick={() => setShowTradeModal(false)} className="btn-ghost w-full" style={{ padding: '10px 0' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Escalation Modal ── */}
      {showEscalationModal && (
        <div className="sp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowEscalationModal(false) }}>
          <div className="sp-modal sp-modal-red">
            <div style={{ fontFamily: B_SERIF, fontSize: 22, fontStyle: 'italic', color: '#ff3b3b', marginBottom: 4 }}>
              Launch escalation<span style={{ color: B_INK }}>.</span>
            </div>
            <div style={{ fontFamily: B_MONO, fontSize: 9, letterSpacing: '0.25em', color: B_FAINT, marginBottom: 12 }}>
              PICK A TARGET · PICK A RESOURCE
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Label color="rgba(255,59,59,0.7)">Resource</Label>
                  <select value={scandalResource} onChange={e => setScandalResource(e.target.value)} className="sp-input" style={{ marginTop: 6 }}>
                    {RESOURCES.map(r => <option key={r} value={r}>{RES_LABELS[r]}</option>)}
                  </select>
                </div>
                <div>
                  <Label color="rgba(255,59,59,0.7)">Amount</Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <button onClick={() => setScandalAmount(a => Math.max(1, a - 1))} className="btn-ghost" style={{ padding: '4px 10px' }}>−</button>
                    <span style={{ fontFamily: B_SERIF, fontSize: 24, fontStyle: 'italic', color: '#ff3b3b', flex: 1, textAlign: 'center' }}>{scandalAmount}</span>
                    <button onClick={() => setScandalAmount(a => a + 1)} className="btn-ghost" style={{ padding: '4px 10px' }}>+</button>
                  </div>
                </div>
              </div>

              <button onClick={submitEscalation} disabled={!scandalTarget} className="btn-red w-full" style={{ padding: '12px 0' }}>
                ◤ LAUNCH
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
