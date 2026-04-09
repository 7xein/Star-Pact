'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Layers, Activity, Clock, Globe } from 'lucide-react'

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
const RES_LABELS: Record<string, string> = { food: 'Energy', wealth: 'Population', environment: 'Oxygen', kushBalls: 'Rockets' }
const RES_ICONS: Record<string, string>  = { food: '⚡', wealth: '👥', environment: '💨', kushBalls: '🚀' }

const PHASE_LABELS: Record<string, string> = {
  TRADING: '⚡ Trading Phase', PROMISE_CHECK: '📋 Promise Check',
  SCANDAL: '☠️ Piracy Raid', YEAR_END: '📅 Year End', DEBRIEF: '📡 Debrief'
}
const PHASE_CLASS: Record<string, string> = {
  TRADING: 'phase-trading', PROMISE_CHECK: 'phase-promise',
  SCANDAL: 'phase-raid', YEAR_END: 'phase-yearend', DEBRIEF: 'phase-debrief'
}

function resolveColor(c: string) { return c }

function getCookie(name: string) {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return m ? m[2] : null
}

type TabId = 'codex' | 'resources' | 'pacts' | 'orbit'

function PlanetSphereDetails({ name }: { name: string }) {
  switch (name) {
    case 'Ignis Prime':
      return <>
        <div style={{ position:'absolute', top:'28%', left:'22%', width:7, height:7, borderRadius:'50%', background:'rgba(0,0,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:'55%', width:5, height:5, borderRadius:'50%', background:'rgba(0,0,0,0.35)' }} />
        <div style={{ position:'absolute', top:'40%', left:0, right:0, height:6, background:'linear-gradient(90deg,transparent,rgba(255,160,50,0.45),transparent)' }} />
      </>
    case 'Aqualis':
      return <>
        <div style={{ position:'absolute', top:'20%', left:'10%', width:18, height:18, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)' }} />
        <div style={{ position:'absolute', top:'35%', left:0, right:0, height:5, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)' }} />
      </>
    case 'Verdania':
      return <>
        <div style={{ position:'absolute', top:'20%', left:'30%', width:14, height:10, borderRadius:'40%', background:'rgba(0,100,30,0.55)' }} />
        <div style={{ position:'absolute', top:'55%', left:'15%', width:10, height:8, borderRadius:'40%', background:'rgba(0,100,30,0.45)' }} />
      </>
    case 'Solara':
      return <>
        <div style={{ position:'absolute', top:'30%', left:'40%', width:8, height:8, borderRadius:'50%', background:'rgba(180,100,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:'20%', width:5, height:5, borderRadius:'50%', background:'rgba(180,100,0,0.3)' }} />
      </>
    case 'Rosara':
      return <>
        <div style={{ position:'absolute', top:'15%', left:'50%', width:1, height:25, background:'rgba(255,255,255,0.25)', transform:'rotate(30deg)' }} />
        <div style={{ position:'absolute', top:'15%', left:'60%', width:1, height:20, background:'rgba(255,255,255,0.18)', transform:'rotate(-20deg)' }} />
        <div style={{ position:'absolute', top:'55%', left:'25%', width:1, height:18, background:'rgba(255,255,255,0.2)', transform:'rotate(45deg)' }} />
      </>
    case 'Lumenor':
      return (
        <div style={{ position:'absolute', top:0, left:'42%', width:10, height:'100%', background:'linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0.05),rgba(255,255,255,0.2))', transform:'rotate(10deg)' }} />
      )
    case 'Dustara':
      return <>
        <div style={{ position:'absolute', top:'30%', left:0, right:0, height:4, background:'rgba(180,90,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:0, right:0, height:3, background:'rgba(180,90,0,0.3)' }} />
      </>
    case 'Glacius':
      return <>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:11, background:'linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.1))', borderRadius:'50% 50% 0 0' }} />
        <div style={{ position:'absolute', top:'28%', left:'30%', width:1, height:14, background:'rgba(255,255,255,0.3)', transform:'rotate(15deg)' }} />
        <div style={{ position:'absolute', top:'35%', left:'55%', width:1, height:10, background:'rgba(255,255,255,0.25)', transform:'rotate(-25deg)' }} />
      </>
    case 'Ferron':
      return <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 9px,rgba(255,255,255,0.07) 9px,rgba(255,255,255,0.07) 10px),repeating-linear-gradient(90deg,transparent,transparent 9px,rgba(255,255,255,0.07) 9px,rgba(255,255,255,0.07) 10px)' }} />
    case 'Voidara':
      return <>
        <div style={{ position:'absolute', top:0, left:'40%', width:6, height:'100%', background:'linear-gradient(90deg,transparent,rgba(0,0,0,0.5),transparent)', transform:'rotate(20deg)' }} />
        <div style={{ position:'absolute', top:0, left:'42%', width:2, height:'100%', background:'linear-gradient(180deg,transparent,rgba(224,64,251,0.6),transparent)', transform:'rotate(20deg)' }} />
      </>
    default:
      return null
  }
}

function PlanetSphere({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  const isDustara = name === 'Dustara'
  const isSolara = name === 'Solara'
  const ringW = size + Math.round(size * 0.55)
  const offset = Math.round((ringW - size) / 2)

  const inner = (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      background: `radial-gradient(circle at 35% 30%, ${color}ee, ${color}55)`,
      boxShadow: isSolara
        ? `0 0 22px ${color}, 0 0 44px ${color}55, 0 0 6px ${color}88`
        : `0 0 16px ${color}cc, 0 0 4px ${color}55`,
    }}>
      <PlanetSphereDetails name={name} />
    </div>
  )

  if (isDustara) {
    return (
      <div style={{ position: 'relative', width: ringW, height: size, flexShrink: 0 }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotateX(70deg)', width: ringW, height: ringW, borderRadius:'50%', border:'3px solid rgba(255,180,60,0.4)', zIndex: 0, pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:0, left: offset, zIndex: 1 }}>{inner}</div>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotateX(70deg)', width: ringW, height: ringW / 2, borderRadius:'50% 50% 0 0', borderTop:'3px solid rgba(255,180,60,0.2)', zIndex: 2, pointerEvents:'none' }} />
      </div>
    )
  }

  return <div style={{ position: 'relative', flexShrink: 0 }}>{inner}</div>
}

export default function PlayPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [myCountry, setMyCountry] = useState<Country | null>(null)
  const [tab, setTab] = useState<TabId>('codex')
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
  // Raid modal
  const [showRaidModal, setShowRaidModal] = useState(false)
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
    'How safe did you feel after the first piracy raid — and who did you trust?',
    'What would you do differently — in the simulation, and at work?'
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
        showNotif(`📦 Trade offer from ${data.senderName}!`)
      }
      if (data.type === 'TRADE_ACCEPTED' || data.type === 'TRADE_REJECTED') {
        setIncomingTrades(prev => prev.filter(t => t.id !== data.trade?.id))
        const me2 = data.sender?.id === cid ? data.sender : data.receiver?.id === cid ? data.receiver : null
        if (me2) updateMyCountry(me2)
        showNotif(data.type === 'TRADE_ACCEPTED' ? '✅ Trade accepted!' : '❌ Trade rejected.')
      }
      if (data.type === 'SCANDAL_LAUNCHED') {
        setActiveScandals(prev => [...prev, data.scandal])
        showNotif('☠️ PIRACY RAID IN PROGRESS', 'raid')
      }
      if (data.type === 'SCANDAL_RESOLVED') {
        setActiveScandals(prev => prev.map(s => s.id === data.scandalId ? { ...s, status: 'RESOLVED' } : s))
        if (data.session) {
          setSession(data.session)
          const me2 = data.session.countries.find((c: Country) => c.id === cid)
          if (me2) updateMyCountry(me2)
        }
        const outcome = data.outcome === 'ATTACKER_WINS' ? '✅ Attacker wins!' : '🛡 Defender wins!'
        showNotif(`Raid resolved — ${outcome}`)
      }
    }
    return () => es.close()
  }, [loadData])

  const submitTrade = async () => {
    const sid = sessionIdRef.current; const cid = countryIdRef.current
    if (!sid || !cid || !tradeTarget) return
    const res = await fetch('/api/trade', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, senderId: cid, receiverId: tradeTarget, offerResource, offerAmount, requestResource, requestAmount })
    })
    if (!res.ok) {
      const err = await res.json()
      showNotif(`⚠ ${err.error}`, 'error')
    } else {
      showNotif('📡 Trade offer transmitted!')
      setShowTradeModal(false)
    }
  }

  const respondTrade = async (tradeId: string, accept: boolean) => {
    await fetch('/api/trade/respond', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeId, accept })
    })
    setIncomingTrades(prev => prev.filter(t => t.id !== tradeId))
  }

  const submitScandal = async () => {
    const sid = sessionIdRef.current; const cid = countryIdRef.current
    if (!sid || !cid || !scandalTarget) return
    const res = await fetch('/api/scandal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, attackerId: cid, defenderId: scandalTarget, resource: scandalResource, amount: scandalAmount })
    })
    if (!res.ok) {
      const err = await res.json()
      showNotif(`⚠ ${err.error}`, 'error')
    } else {
      setShowRaidModal(false)
    }
  }

  const joinScandal = async (scandalId: string, side: 'ATTACKER' | 'DEFENDER') => {
    const cid = countryIdRef.current; if (!cid) return
    await fetch('/api/scandal/ally', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scandalId, countryId: cid, side })
    })
  }

  const submitDebrief = async () => {
    const sid = sessionIdRef.current; const cid = countryIdRef.current; if (!sid || !cid) return
    await fetch('/api/debrief', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, countryId: cid, ...debriefAnswers })
    })
    setDebriefSubmitted(true)
  }

  if (!session || !myCountry) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div style={{ width:48, height:48, borderRadius:'50%', margin:'0 auto 16px', background:'radial-gradient(circle at 35% 35%, #9b59b6, #4a0080)', boxShadow:'0 0 24px rgba(155,89,182,0.8)' }} />
        <p className="font-display text-sm tracking-widest" style={{ color:'var(--stardust)' }}>CONNECTING TO FEDERATION...</p>
      </div>
    </div>
  )

  const relations = JSON.parse(myCountry.relationsData)
  const promises = JSON.parse(myCountry.promisesData) as Array<{ resource: string; target: number; byYear: number }>
  const otherCountries = session.countries.filter(c => c.id !== myCountry.id)
  const myColor = resolveColor(myCountry.color)
  const pendingTrades = incomingTrades.filter(t => t.status === 'PENDING')
  const openRaids = activeScandals.filter(s => s.status === 'OPEN' && s.attackerId !== myCountry.id && s.defenderId !== myCountry.id)

  const TABS: { id: TabId; icon: React.ReactNode; label: string }[] = [
    { id: 'codex',     icon: <Layers size={18} />,   label: 'Codex' },
    { id: 'resources', icon: <Activity size={18} />, label: 'Resources' },
    { id: 'pacts',     icon: <Clock size={18} />,    label: 'Pacts' },
    { id: 'orbit',     icon: <Globe size={18} />,    label: 'Orbit' },
  ]

  return (
    <div className="min-h-screen flex flex-col mx-auto" style={{ maxWidth: '32rem' }}>

      {/* ── Notification Toast ── */}
      {notification && (
        <div className="fixed top-3 left-3 right-3 mx-auto z-50 anim-slide-down rounded-xl p-3 text-center text-sm font-display tracking-wide"
          style={{
            maxWidth: '32rem',
            background: notifType === 'raid' ? 'rgba(255,59,59,0.2)' : notifType === 'error' ? 'rgba(255,59,59,0.15)' : 'rgba(155,89,182,0.1)',
            border: `1px solid ${notifType === 'raid' || notifType === 'error' ? 'rgba(255,59,59,0.5)' : 'var(--cyan-dim)'}`,
            backdropFilter: 'blur(8px)',
            color: notifType === 'raid' || notifType === 'error' ? 'var(--red-raid)' : 'var(--cyan)',
          }}>
          {notification}
        </div>
      )}

      {/* ── Header ── */}
      <div className="relative overflow-hidden px-4 pt-4 pb-3"
        style={{
          background: `linear-gradient(180deg, ${myColor}28 0%, ${myColor}08 60%, transparent 100%)`,
          borderBottom: `1px solid ${myColor}28`,
        }}>
        <div className="flex items-center gap-3">
          <PlanetSphere name={myCountry.name} color={myColor} size={32} />
          <div>
            <h1 className="font-display font-black tracking-wider"
              style={{ fontSize: '1rem', lineHeight: 1.1, color: myColor, textShadow: `0 0 12px ${myColor}80` }}>
              {myCountry.name}
            </h1>
            <p className="font-display uppercase"
              style={{ fontSize: '0.6rem', letterSpacing: '1.5px', color: `${myColor}70` }}>
              Planetary Governor
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-display font-black" style={{ fontSize: '1.5rem', lineHeight: 1, color: 'var(--stardust)', textShadow: '0 0 12px rgba(155,89,182,0.6)' }}>
              Y{session.year}
            </p>
            <span className={`phase-badge ${PHASE_CLASS[session.phase] || 'phase-yearend'}`} style={{ fontSize: '0.6rem' }}>
              {PHASE_LABELS[session.phase]?.split(' ').slice(1).join(' ') || session.phase}
            </span>
          </div>
        </div>
      </div>

      {/* ── Incoming Trade Alerts ── */}
      {pendingTrades.map(t => (
        <div key={t.id} className="mx-4 mt-2 sp-card p-3 rounded-xl"
          style={{ background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.3)' }}>
          <p className="font-display text-xs tracking-wide text-amber-400 mb-1">📦 TRADE OFFER — {t.senderName}</p>
          <p className="text-xs text-slate-300">
            Offer: {t.offerAmount} {RES_ICONS[t.offerResource]} {RES_LABELS[t.offerResource]}&nbsp;&nbsp;|&nbsp;&nbsp;
            Want: {t.requestAmount} {RES_ICONS[t.requestResource]} {RES_LABELS[t.requestResource]}
          </p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => respondTrade(t.id, true)} className="btn-cyan flex-1" style={{ fontSize: '0.7rem' }}>✓ ACCEPT</button>
            <button onClick={() => respondTrade(t.id, false)} className="btn-red flex-1" style={{ fontSize: '0.7rem' }}>✗ REJECT</button>
          </div>
        </div>
      ))}

      {/* ── Raid Alliance Requests ── */}
      {openRaids.map(s => (
        <div key={s.id} className="mx-4 mt-2 sp-card p-3 rounded-xl"
          style={{ background: 'rgba(255,59,59,0.08)', borderColor: 'rgba(255,59,59,0.3)' }}>
          <p className="font-display text-xs tracking-wide mb-1" style={{ color: 'var(--red-raid)' }}>
            ☠️ RAID: {s.attacker?.name} → {s.defender?.name}
          </p>
          <p className="text-xs text-slate-400">{s.amount} {RES_ICONS[s.resource]} {RES_LABELS[s.resource]} at stake</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => joinScandal(s.id, 'ATTACKER')} className="btn-red flex-1" style={{ fontSize: '0.7rem' }}>JOIN ATTACKER</button>
            <button onClick={() => joinScandal(s.id, 'DEFENDER')} className="btn-cyan flex-1" style={{ fontSize: '0.7rem' }}>JOIN DEFENDER</button>
          </div>
        </div>
      ))}

      {/* ── Tab Bar ── */}
      <div className="mx-4 mt-2 sp-card rounded-2xl overflow-hidden flex">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors"
            style={{
              background: tab === t.id ? `${myColor}15` : 'transparent',
              borderBottom: tab === t.id ? `2px solid ${myColor}` : '2px solid transparent',
              color: tab === t.id ? myColor : 'rgba(148,163,184,0.7)',
            }}>
            <span className="flex items-center justify-center" style={{ height: 20 }}>{t.icon}</span>
            <span className="font-display tracking-widest" style={{ fontSize: '0.65rem' }}>{t.label.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-3">

        {/* RESOURCES */}
        {tab === 'resources' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {RESOURCES.map(r => {
                const val = myCountry[r] as number
                const flash = flashRes[r]
                return (
                  <div key={r} className="sp-card p-4 resource-card rounded-2xl text-center"
                    style={flash === 'up' ? { animation: 'flash-green 0.8s ease-out forwards' } : flash === 'down' ? { animation: 'flash-red-bg 0.8s ease-out forwards' } : {}}>
                    <p className="text-2xl mb-1">{RES_ICONS[r]}</p>
                    <p className="font-display text-xs text-slate-500 tracking-widest mb-1">{RES_LABELS[r].toUpperCase()}</p>
                    <p className="font-display font-black" style={{ fontSize: '2.5rem', color: myColor, textShadow: `0 0 12px ${myColor}60`, lineHeight: 1 }}>{val}</p>
                  </div>
                )
              })}
            </div>

            {session.phase === 'TRADING' && (
              <button onClick={() => setShowTradeModal(true)} className="btn-cyan w-full py-3 text-sm tracking-widest">
                ⚡ PROPOSE TRADE
              </button>
            )}

            {session.phase === 'SCANDAL' && (
              <button onClick={() => setShowRaidModal(true)} className="btn-red w-full py-3 text-sm tracking-widest"
                style={{ boxShadow: 'var(--red-glow)' }}>
                ☠️ LAUNCH PIRACY RAID
              </button>
            )}
          </>
        )}

        {/* CODEX */}
        {tab === 'codex' && (
          <>
            <div className="sp-card p-5 rounded-2xl" style={{ borderLeft: `4px solid ${myColor}` }}>
              <h2 className="font-display text-2xl font-black mb-1" style={{ color: myColor, textShadow: `0 0 12px ${myColor}60` }}>
                {myCountry.name}
              </h2>
              <p className="text-slate-400 italic text-sm">&ldquo;{myCountry.motto}&rdquo;</p>
            </div>
            <div className="sp-card p-4 rounded-2xl">
              <p className="font-display text-xs tracking-widest text-slate-500 mb-2">PLANETARY HISTORY</p>
              <p className="text-slate-300 text-sm leading-relaxed">{myCountry.story}</p>
            </div>
            <div className="sp-card p-4 rounded-2xl">
              <p className="font-display text-xs tracking-widest text-slate-500 mb-2">FAMOUS FOR</p>
              <p className="text-slate-300 text-sm leading-relaxed">{myCountry.famousFor}</p>
            </div>
          </>
        )}

        {/* PACTS */}
        {tab === 'pacts' && (
          <>
            <p className="font-display text-xs tracking-widest text-slate-500 px-1">GALACTIC PACT COMMITMENTS</p>
            {promises.map((p, i) => {
              const current = myCountry[p.resource as keyof Country] as number
              const pct = Math.min(100, (current / p.target) * 100)
              const isDue = p.byYear <= session.year
              const met = current >= p.target
              const color = pct >= 100 ? myColor : pct >= 60 ? '#fbbf24' : 'var(--red-raid)'
              return (
                <div key={i} className="sp-card p-4 rounded-2xl"
                  style={{ borderLeft: `3px solid ${isDue && !met ? 'var(--red-raid)' : met ? '#22c55e' : 'var(--card-border)'}` }}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{RES_ICONS[p.resource]}</span>
                      <span className="font-display text-xs tracking-wider text-slate-300">{RES_LABELS[p.resource].toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDue && !met && <span className="text-xs">⚠️</span>}
                      <span className="font-display text-xs text-slate-500 tracking-widest">DUE Y{p.byYear}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>Target: <span className="font-display" style={{ color }}>{p.target}</span></span>
                    <span>Current: <span className="font-display" style={{ color: myColor }}>{current}</span></span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* ORBIT */}
        {tab === 'orbit' && (
          <>
            {(['rightOn', 'allRight', 'writeOff'] as const).map(rel => {
              const label = rel === 'rightOn' ? 'Warp Lane Access' : rel === 'allRight' ? 'Diplomatic Clearance' : 'Blockaded'
              const col = rel === 'rightOn' ? '#22c55e' : rel === 'allRight' ? '#fbbf24' : 'var(--red-raid)'
              return (
                <div key={rel} className="sp-card p-4 rounded-2xl">
                  <p className="font-display text-xs tracking-widest mb-3" style={{ color: col }}>{label.toUpperCase()}</p>
                  {relations[rel].length === 0 ? (
                    <p className="text-slate-600 text-xs font-display tracking-widest">NONE</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {relations[rel].map((name: string) => {
                        const planet = session.countries.find(c => c.name === name)
                        const pc = planet ? resolveColor(planet.color) : '#94a3b8'
                        return (
                          <span key={name} className="px-3 py-1 rounded-full text-xs font-display tracking-wide flex items-center gap-1"
                            style={{ background: `${pc}15`, border: `1px solid ${pc}50`, color: pc, opacity: rel === 'writeOff' ? 0.7 : 1 }}>
                            {rel === 'writeOff' && '🚫 '}{name}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* DEBRIEF */}
        {session.phase === 'DEBRIEF' && (
          <div className="mt-2">
            {debriefSubmitted ? (
              <div className="sp-card p-8 text-center rounded-2xl">
                <p className="text-3xl mb-3">📡</p>
                <p className="font-display text-sm tracking-widest glow-cyan">TRANSMISSION RECEIVED</p>
                <p className="text-slate-500 text-xs mt-2">Thank you, Governor.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center gap-2 mb-4">
                  {DEBRIEF_QUESTIONS.map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full transition-all"
                      style={{ background: i === debriefStep ? myColor : i < debriefStep ? `${myColor}60` : 'rgba(255,255,255,0.1)', boxShadow: i === debriefStep ? `0 0 8px ${myColor}` : 'none' }} />
                  ))}
                </div>
                <div className="sp-card p-5 rounded-2xl">
                  <p className="font-display text-xs tracking-widest text-slate-500 mb-1">QUESTION {debriefStep + 1} OF {DEBRIEF_QUESTIONS.length}</p>
                  <p className="text-slate-200 text-sm leading-relaxed mb-4">{DEBRIEF_QUESTIONS[debriefStep]}</p>
                  <textarea
                    value={debriefAnswers[`q${debriefStep + 1}` as keyof typeof debriefAnswers]}
                    onChange={e => setDebriefAnswers(prev => ({ ...prev, [`q${debriefStep + 1}`]: e.target.value }))}
                    rows={4}
                    className="sp-input resize-none"
                    placeholder="Transmit your response..."
                  />
                </div>
                <div className="flex gap-3 mt-3">
                  {debriefStep > 0 && (
                    <button onClick={() => setDebriefStep(s => s - 1)} className="btn-ghost flex-1">← BACK</button>
                  )}
                  {debriefStep < DEBRIEF_QUESTIONS.length - 1 ? (
                    <button onClick={() => setDebriefStep(s => s + 1)} className="btn-cyan flex-1">NEXT →</button>
                  ) : (
                    <button onClick={submitDebrief} className="btn-cyan flex-1" style={{ boxShadow: 'var(--cyan-glow)' }}>
                      📡 TRANSMIT ALL
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
            <p className="font-display text-xs tracking-widest glow-cyan mb-4">⚡ PROPOSE TRADE</p>
            <div className="space-y-3">
              <select value={tradeTarget} onChange={e => setTradeTarget(e.target.value)} className="sp-input">
                <option value="">Select target planet</option>
                {otherCountries.map(c => {
                  const r = relations
                  const blocked = r.writeOff.includes(c.name)
                  return (
                    <option key={c.id} value={c.id} disabled={blocked}>
                      {c.name}{blocked ? ' 🚫' : r.rightOn.includes(c.name) ? ' (Warp Lane)' : r.allRight.includes(c.name) ? ' (Diplo. max 2)' : ''}
                    </option>
                  )
                })}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-display text-xs text-slate-500 tracking-widest mb-1">I OFFER</p>
                  <select value={offerResource} onChange={e => setOfferResource(e.target.value)} className="sp-input mb-1">
                    {RESOURCES.map(r => <option key={r} value={r}>{RES_ICONS[r]} {RES_LABELS[r]}</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setOfferAmount(a => Math.max(1, a - 1))} className="btn-ghost px-3 py-1">−</button>
                    <span className="font-display text-lg glow-cyan flex-1 text-center">{offerAmount}</span>
                    <button onClick={() => setOfferAmount(a => a + 1)} className="btn-ghost px-3 py-1">+</button>
                  </div>
                </div>
                <div>
                  <p className="font-display text-xs text-slate-500 tracking-widest mb-1">I WANT</p>
                  <select value={requestResource} onChange={e => setRequestResource(e.target.value)} className="sp-input mb-1">
                    {RESOURCES.map(r => <option key={r} value={r}>{RES_ICONS[r]} {RES_LABELS[r]}</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setRequestAmount(a => Math.max(1, a - 1))} className="btn-ghost px-3 py-1">−</button>
                    <span className="font-display text-lg glow-cyan flex-1 text-center">{requestAmount}</span>
                    <button onClick={() => setRequestAmount(a => a + 1)} className="btn-ghost px-3 py-1">+</button>
                  </div>
                </div>
              </div>
              <button onClick={submitTrade} disabled={!tradeTarget} className="btn-cyan w-full py-2">TRANSMIT OFFER</button>
              <button onClick={() => setShowTradeModal(false)} className="btn-ghost w-full py-2">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Raid Modal ── */}
      {showRaidModal && (
        <div className="sp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowRaidModal(false) }}>
          <div className="sp-modal sp-modal-red">
            <p className="font-display text-xs tracking-widest mb-1" style={{ color: 'var(--red-raid)', textShadow: 'var(--red-glow)' }}>☠️ PIRACY RAID</p>
            <p className="text-xs text-slate-500 mb-4">⚠️ This action deploys your rockets. Costs 1 Rocket. Choose your target wisely.</p>
            <div className="space-y-3">
              <select value={scandalTarget} onChange={e => setScandalTarget(e.target.value)} className="sp-input">
                <option value="">Select target planet</option>
                {otherCountries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-display text-xs text-slate-500 tracking-widest mb-1">RESOURCE</p>
                  <select value={scandalResource} onChange={e => setScandalResource(e.target.value)} className="sp-input">
                    {RESOURCES.map(r => <option key={r} value={r}>{RES_ICONS[r]} {RES_LABELS[r]}</option>)}
                  </select>
                </div>
                <div>
                  <p className="font-display text-xs text-slate-500 tracking-widest mb-1">AMOUNT</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setScandalAmount(a => Math.max(1, a - 1))} className="btn-ghost px-3 py-1">−</button>
                    <span className="font-display text-lg flex-1 text-center" style={{ color: 'var(--red-raid)' }}>{scandalAmount}</span>
                    <button onClick={() => setScandalAmount(a => a + 1)} className="btn-ghost px-3 py-1">+</button>
                  </div>
                </div>
              </div>
              <button onClick={submitScandal} disabled={!scandalTarget} className="btn-red w-full py-2">⚔️ LAUNCH RAID</button>
              <button onClick={() => setShowRaidModal(false)} className="btn-ghost w-full py-2">STAND DOWN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
