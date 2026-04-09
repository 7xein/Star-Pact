'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'

interface Country {
  id: string
  name: string
  color: string
  food: number
  wealth: number
  environment: number
  kushBalls: number
  promisesData: string
}

interface PromiseCheck {
  id: string
  countryId: string
  year: number
  resource: string
  required: number
  actual: number
  passed: boolean
  country: Country
}

interface DebriefResponse {
  id: string
  countryId: string
  q1: string; q2: string; q3: string; q4: string; q5: string
  country: Country
  createdAt: string
}

interface TradeEntry {
  id: string
  senderName: string
  receiverName: string
  offerResource: string
  offerAmount: number
  requestResource: string
  requestAmount: number
  status: string
  time: number
}

interface ScandalData {
  id: string
  attacker: { name: string; color: string }
  defender: { name: string; color: string }
  resource: string
  amount: number
  status: string
  alliances: Array<{ country: { name: string }; side: string }>
}

interface Session {
  id: string
  year: number
  phase: string
  timerEnd: string | null
  timerRunning: boolean
  countries: Country[]
}

interface RaidResult {
  scandalId: string
  outcome: string
  attackerName: string
  defenderName: string
  resource: string
  amount: number
}

const PHASE_CLASS: Record<string, string> = {
  TRADING: 'phase-trading anim-pulse-phase',
  PROMISE_CHECK: 'phase-promise',
  SCANDAL: 'phase-raid anim-pulse-phase',
  YEAR_END: 'phase-yearend',
  DEBRIEF: 'phase-debrief',
}
const PHASE_LABELS: Record<string, string> = {
  TRADING: '⚡ TRADING PHASE',
  PROMISE_CHECK: '📋 PROMISE CHECK',
  SCANDAL: '☠️ PIRACY RAID',
  YEAR_END: '📅 YEAR END',
  DEBRIEF: '📡 DEBRIEF',
}
const RES_LABELS: Record<string, string> = {
  food: 'Energy', wealth: 'Population', environment: 'Oxygen', kushBalls: 'Rockets'
}
const RES_ICONS: Record<string, string> = {
  food: '⚡', wealth: '👥', environment: '💨', kushBalls: '🚀'
}

function resolveColor(c: string) { return c }

function getPromiseDots(country: Country, checks: PromiseCheck[]) {
  const promises = JSON.parse(country.promisesData) as Array<{ resource: string; target: number; byYear: number }>
  return promises.map(p => {
    const check = checks.find(c => c.countryId === country.id && c.resource === p.resource)
    const current = country[p.resource as keyof Country] as number
    if (check) return check.passed ? 'green' : 'red'
    const diff = p.target - current
    if (diff <= 0) return 'green'
    if (diff <= 2) return 'amber'
    return 'dim'
  })
}

function PlanetSphereDetails({ name }: { name: string }) {
  switch (name) {
    case 'Antica':
      return <>
        <div style={{ position:'absolute', top:'28%', left:'22%', width:6, height:6, borderRadius:'50%', background:'rgba(0,0,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:'55%', width:5, height:5, borderRadius:'50%', background:'rgba(0,0,0,0.35)' }} />
        <div style={{ position:'absolute', top:'40%', left:0, right:0, height:5, background:'linear-gradient(90deg,transparent,rgba(255,160,50,0.45),transparent)' }} />
      </>
    case 'Portswana':
      return <>
        <div style={{ position:'absolute', top:'30%', left:'40%', width:7, height:7, borderRadius:'50%', background:'rgba(160,80,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:'20%', width:5, height:5, borderRadius:'50%', background:'rgba(160,80,0,0.3)' }} />
      </>
    case 'Samosia':
      return <>
        <div style={{ position:'absolute', top:'20%', left:'30%', width:13, height:9, borderRadius:'40%', background:'rgba(0,100,30,0.55)' }} />
        <div style={{ position:'absolute', top:'55%', left:'15%', width:10, height:8, borderRadius:'40%', background:'rgba(0,100,30,0.45)' }} />
      </>
    case 'Bintu':
      return <>
        <div style={{ position:'absolute', top:'15%', left:'50%', width:1, height:22, background:'rgba(255,255,255,0.25)', transform:'rotate(30deg)' }} />
        <div style={{ position:'absolute', top:'15%', left:'60%', width:1, height:18, background:'rgba(255,255,255,0.18)', transform:'rotate(-20deg)' }} />
        <div style={{ position:'absolute', top:'55%', left:'25%', width:1, height:16, background:'rgba(255,255,255,0.2)', transform:'rotate(45deg)' }} />
      </>
    case 'Mertante':
      return <>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:10, background:'linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0.08))', borderRadius:'50% 50% 0 0' }} />
        <div style={{ position:'absolute', top:'35%', left:0, right:0, height:4, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)' }} />
      </>
    case 'Rostotto':
      return <>
        <div style={{ position:'absolute', top:0, left:'40%', width:5, height:'100%', background:'linear-gradient(90deg,transparent,rgba(0,0,0,0.5),transparent)', transform:'rotate(20deg)' }} />
        <div style={{ position:'absolute', top:0, left:'42%', width:2, height:'100%', background:'linear-gradient(180deg,transparent,rgba(224,64,251,0.6),transparent)', transform:'rotate(20deg)' }} />
      </>
    case 'Jasna':
      return <>
        <div style={{ position:'absolute', top:'30%', left:0, right:0, height:4, background:'rgba(120,50,0,0.4)' }} />
        <div style={{ position:'absolute', top:'55%', left:0, right:0, height:3, background:'rgba(120,50,0,0.3)' }} />
      </>
    case 'Geldar':
      return <>
        <div style={{ position:'absolute', top:'20%', left:'10%', width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)' }} />
        <div style={{ position:'absolute', top:'35%', left:0, right:0, height:5, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)' }} />
      </>
    case 'Halportia':
      return <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 9px,rgba(255,255,255,0.07) 9px,rgba(255,255,255,0.07) 10px),repeating-linear-gradient(90deg,transparent,transparent 9px,rgba(255,255,255,0.07) 9px,rgba(255,255,255,0.07) 10px)' }} />
    case 'Barria':
      return <>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:10, background:'linear-gradient(180deg,rgba(255,255,255,0.65),rgba(255,255,255,0.08))', borderRadius:'50% 50% 0 0' }} />
        <div style={{ position:'absolute', top:'28%', left:'30%', width:1, height:13, background:'rgba(255,255,255,0.3)', transform:'rotate(15deg)' }} />
        <div style={{ position:'absolute', top:'35%', left:'55%', width:1, height:9, background:'rgba(255,255,255,0.25)', transform:'rotate(-25deg)' }} />
      </>
    default:
      return null
  }
}

function PlanetSphere({ name, color, size = 34 }: { name: string; color: string; size?: number }) {
  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      flexShrink: 0,
      background: `radial-gradient(circle at 35% 30%, ${color}ee, ${color}55)`,
      boxShadow: `0 0 16px ${color}cc, 0 0 4px ${color}55`,
    }}>
      <PlanetSphereDetails name={name} />
    </div>
  )
}

export default function FacilitatorDashboard() {
  const [session, setSession] = useState<Session | null>(null)
  const [qrUrl, setQrUrl] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(5)
  const [promiseChecks, setPromiseChecks] = useState<PromiseCheck[]>([])
  const [debriefResponses, setDebriefResponses] = useState<DebriefResponse[]>([])
  const [scandals, setScandals] = useState<ScandalData[]>([])
  const [tradeFeed, setTradeFeed] = useState<TradeEntry[]>([])
  const [raidAlert, setRaidAlert] = useState<{ attacker: string; defender: string } | null>(null)
  const [raidOverlay, setRaidOverlay] = useState<RaidResult | null>(null)
  const [raidResolving, setRaidResolving] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const raidAlertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    QRCode.toDataURL(`${window.location.origin}/join`, { width: 160, margin: 1, color: { dark: '#d4a0ff', light: '#07021a' } }).then(setQrUrl)

    const es = new EventSource(`/api/sse?sessionId=${id}`)
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'SESSION_UPDATE' || data.type === 'SESSION_CREATED') {
        setSession(data.session)
        if (data.session.phase === 'PROMISE_CHECK') loadPromiseChecks(id, data.session.year)
        if (data.session.phase === 'DEBRIEF') loadDebriefResponses(id)
      }
      if (data.type === 'TRADE_OFFER') {
        const t = data.trade
        setTradeFeed(prev => [{
          id: t.id, senderName: data.senderName, receiverName: data.receiverName,
          offerResource: t.offerResource, offerAmount: t.offerAmount,
          requestResource: t.requestResource, requestAmount: t.requestAmount,
          status: 'PENDING', time: Date.now()
        }, ...prev].slice(0, 20))
      }
      if (data.type === 'TRADE_ACCEPTED' || data.type === 'TRADE_REJECTED') {
        const status = data.type === 'TRADE_ACCEPTED' ? 'ACCEPTED' : 'REJECTED'
        setTradeFeed(prev => prev.map(t => t.id === data.trade?.id ? { ...t, status } : t))
        if (data.session) setSession(data.session)
        if (data.sender && data.receiver) {
          setSession(prev => {
            if (!prev) return prev
            return {
              ...prev,
              countries: prev.countries.map(c =>
                c.id === data.sender?.id ? data.sender :
                c.id === data.receiver?.id ? data.receiver : c
              )
            }
          })
        }
      }
      if (data.type === 'DEBRIEF_RESPONSE') {
        setDebriefResponses(prev => [...prev.filter(r => r.id !== data.response.id), data.response])
      }
      if (data.type === 'SCANDAL_LAUNCHED') {
        setScandals(prev => [...prev, { ...data.scandal, alliances: [] }])
        setRaidAlert({ attacker: data.scandal.attacker?.name, defender: data.scandal.defender?.name })
        if (raidAlertTimer.current) clearTimeout(raidAlertTimer.current)
        raidAlertTimer.current = setTimeout(() => setRaidAlert(null), 5000)
      }
      if (data.type === 'SCANDAL_ALLY') {
        setScandals(prev => prev.map(s => s.id === data.scandalId
          ? { ...s, alliances: [...(s.alliances || []), data.alliance] } : s))
      }
      if (data.type === 'SCANDAL_RESOLVED') {
        setScandals(prev => prev.map(s => s.id === data.scandalId ? { ...s, status: 'RESOLVED' } : s))
        if (data.session) setSession(data.session)
        setScandals(prev => {
          const sc = prev.find(s => s.id === data.scandalId)
          if (sc) {
            setRaidOverlay({
              scandalId: data.scandalId,
              outcome: data.outcome,
              attackerName: sc.attacker?.name || '?',
              defenderName: sc.defender?.name || '?',
              resource: sc.resource,
              amount: sc.amount,
            })
            setTimeout(() => setRaidOverlay(null), 6000)
          }
          return prev
        })
        setRaidResolving(null)
      }
    }
    return () => es.close()
  }, [loadSession, loadPromiseChecks, loadDebriefResponses])

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (session?.timerEnd && session.timerRunning) {
        const diff = new Date(session.timerEnd).getTime() - Date.now()
        if (diff <= 0) { setTimeLeft('00:00'); setIsUrgent(false); return }
        setIsUrgent(diff < 60000)
        const m = Math.floor(diff / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        setTimeLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [session])

  const phaseAction = async (action: string, extra?: object) => {
    const id = sessionIdRef.current
    if (!id) return
    await fetch('/api/session/phase', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: id, action, ...extra })
    })
  }

  const resolveScandal = async (scandalId: string) => {
    setRaidResolving(scandalId)
    setTimeout(async () => {
      await fetch('/api/scandal/resolve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scandalId })
      })
    }, 3000)
  }

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="font-display text-sm tracking-widest" style={{ color: 'var(--stardust)' }}>INITIALIZING COMMAND CENTER...</p>
    </div>
  )

  const activeRaids = scandals.filter(s => s.status === 'OPEN')

  return (
    <div className="min-h-screen p-3 relative" style={{ fontFamily: 'var(--font-body)' }}>

      {/* ── Raid Alert Banner ── */}
      {raidAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 anim-slide-down"
          style={{ background: 'rgba(255,59,59,0.15)', borderBottom: '1px solid var(--red-raid)', backdropFilter: 'blur(8px)', padding: '0.75rem', textAlign: 'center' }}>
          <span className="font-display text-sm tracking-widest" style={{ color: 'var(--red-raid)', textShadow: 'var(--red-glow)' }}>
            ⚠️ PIRACY RAID LAUNCHED — {raidAlert.attacker} → {raidAlert.defender}
          </span>
        </div>
      )}

      {/* ── Raid Resolve Overlay ── */}
      {(raidResolving || raidOverlay) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}
          onClick={() => { setRaidOverlay(null); setRaidResolving(null); }}>
          <div className="sp-card sp-modal-red text-center p-8 max-w-lg w-full mx-4">
            {raidResolving && !raidOverlay ? (
              <>
                <p className="font-display text-xs tracking-widest text-slate-400 mb-6">NAVIGATION COMPUTER CALCULATING...</p>
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-2 anim-spin" style={{ borderColor: 'var(--red-raid)', borderTopColor: 'transparent' }} />
                    <div className="absolute inset-3 rounded-full border anim-spin" style={{ borderColor: 'rgba(255,59,59,0.4)', borderBottomColor: 'transparent', animationDirection: 'reverse', animationDuration: '1.2s' }} />
                    <div className="absolute inset-0 flex items-center justify-center font-display text-xs" style={{ color: 'var(--red-raid)' }}>+</div>
                  </div>
                </div>
                <p className="font-display text-sm tracking-widest" style={{ color: 'var(--red-raid)' }}>RESOLVING RAID...</p>
              </>
            ) : raidOverlay ? (
              <div className="anim-fade-in">
                {raidOverlay.outcome === 'ATTACKER_WINS' ? (
                  <>
                    <p className="font-display text-3xl font-black mb-2" style={{ color: '#22c55e', textShadow: '0 0 20px rgba(34,197,94,0.6)' }}>✅ RAID SUCCESSFUL</p>
                    <p className="font-display text-lg mb-4" style={{ color: '#22c55e' }}>{raidOverlay.attackerName} WINS</p>
                    <p className="text-slate-400 text-sm">+{raidOverlay.amount} {RES_ICONS[raidOverlay.resource]} {RES_LABELS[raidOverlay.resource]} transferred</p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-3xl font-black mb-2 anim-pulse-red" style={{ color: 'var(--red-raid)' }}>❌ RAID REPELLED</p>
                    <p className="font-display text-lg mb-4" style={{ color: 'var(--red-raid)' }}>{raidOverlay.defenderName} WINS</p>
                    <p className="text-slate-400 text-sm">Attacker force retreats</p>
                  </>
                )}
                <p className="text-xs text-slate-600 mt-4 font-display tracking-widest">TAP TO DISMISS</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto">

        {/* ── Top Header Bar ── */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h1 className="font-display text-3xl font-black tracking-widest" style={{ color: 'var(--stardust)', textShadow: '0 0 30px rgba(155,89,182,0.7), 0 0 60px rgba(155,89,182,0.3)' }}>STAR PACT</h1>
            <p className="font-display text-xs tracking-widest text-slate-500">FEDERATION COMMAND — FACILITATOR CONSOLE</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-display text-xs text-slate-500 tracking-widest">YEAR</p>
              <p className="font-display text-4xl font-black glow-cyan">{session.year}<span className="text-lg text-slate-500"> /5</span></p>
            </div>
            <div style={{ width: '1px', height: '48px', background: 'var(--divider)' }} />
            <div>
              <span className={`phase-badge ${PHASE_CLASS[session.phase] || 'phase-yearend'}`}>
                {PHASE_LABELS[session.phase] || session.phase}
              </span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--divider)' }} className="mb-4" />

        {/* ── Timer + Controls ── */}
        <div className="sp-card p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[140px]">
              <p className="font-display text-xs text-slate-500 tracking-widest mb-1">COUNTDOWN</p>
              <p className={`font-display font-black ${isUrgent ? 'anim-pulse-red' : 'glow-cyan'}`}
                style={{ fontSize: '3.5rem', lineHeight: 1, color: isUrgent ? 'var(--red-raid)' : 'var(--cyan)' }}>
                {timeLeft || '--:--'}
              </p>
            </div>
            <div style={{ width: '1px', height: '56px', background: 'var(--divider)' }} />
            <div className="flex items-center gap-2">
              <input type="number" value={timerMinutes} onChange={e => setTimerMinutes(Number(e.target.value))}
                className="sp-input w-16 text-center font-display" min="1" max="60" />
              <span className="text-xs text-slate-500 font-display tracking-widest">MIN</span>
            </div>
            <button onClick={() => phaseAction('START_TIMER', { minutes: timerMinutes })} className="btn-cyan">▶ START</button>
            <button onClick={() => phaseAction('PAUSE_TIMER')} className="btn-ghost">⏸ PAUSE</button>
            <div className="flex-1" />
            <button onClick={() => phaseAction('NEXT_PHASE')} className="btn-cyan">NEXT PHASE →</button>
            <button onClick={() => phaseAction('NEXT_YEAR')} className="btn-ghost">NEXT YEAR ⏭</button>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 320px' }}>

          {/* ── Left: Scoreboard + phase panels ── */}
          <div className="space-y-4">

            {/* Promise Check */}
            {session.phase === 'PROMISE_CHECK' && promiseChecks.length > 0 && (
              <div className="sp-card p-4">
                <p className="font-display text-xs tracking-widest text-amber-400 mb-3">📋 PROMISE CHECK — YEAR {session.year}</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Array.from(new Set(promiseChecks.map(c => c.country.name))).map(name => {
                    const checks = promiseChecks.filter(c => c.country.name === name)
                    const allPassed = checks.every(c => c.passed)
                    const country = session.countries.find(c => c.name === name)
                    return (
                      <div key={name} className="sp-card p-2" style={{ borderLeft: `3px solid ${allPassed ? '#22c55e' : 'var(--red-raid)'}` }}>
                        <p className="font-display text-xs font-bold mb-1" style={{ color: country ? resolveColor(country.color) : 'white' }}>{name}</p>
                        {checks.map(c => (
                          <p key={c.id} className="text-xs" style={{ color: c.passed ? '#22c55e' : 'var(--red-raid)' }}>
                            {c.passed ? '✓' : '✗'} {RES_ICONS[c.resource]} {c.actual}/{c.required}
                          </p>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Active Raids */}
            {activeRaids.length > 0 && (
              <div className="sp-card p-4" style={{ borderColor: 'rgba(255,59,59,0.3)' }}>
                <p className="font-display text-xs tracking-widest mb-3" style={{ color: 'var(--red-raid)' }}>☠️ ACTIVE PIRACY RAIDS</p>
                <div className="space-y-2">
                  {activeRaids.map(s => (
                    <div key={s.id} className="sp-card p-3 flex items-center justify-between"
                      style={{ background: 'rgba(255,59,59,0.08)', borderColor: 'rgba(255,59,59,0.25)' }}>
                      <div>
                        <p className="font-display text-sm font-bold" style={{ color: 'var(--red-raid)' }}>
                          {s.attacker?.name} <span className="text-slate-500">VS</span> {s.defender?.name}
                        </p>
                        <p className="text-xs text-slate-400">{s.amount} {RES_ICONS[s.resource]} {RES_LABELS[s.resource]} contested</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {s.alliances?.map((a, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full font-display"
                              style={{ background: a.side === 'ATTACKER' ? 'rgba(255,59,59,0.2)' : 'rgba(0,245,255,0.1)', color: a.side === 'ATTACKER' ? 'var(--red-raid)' : 'var(--cyan)', border: '1px solid currentColor' }}>
                              {a.country?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => resolveScandal(s.id)} className="btn-red ml-3" style={{ whiteSpace: 'nowrap' }}>
                        🎲 RESOLVE RAID
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debrief */}
            {session.phase === 'DEBRIEF' && (
              <div className="sp-card p-4">
                <p className="font-display text-xs tracking-widest mb-3" style={{ color: '#a78bfa' }}>
                  📡 INCOMING TRANSMISSIONS — DEBRIEF IN PROGRESS ({debriefResponses.length})
                </p>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {debriefResponses.map((r, i) => (
                    <div key={r.id} className="sp-card p-3 anim-typewriter" style={{ animationDelay: `${i * 0.1}s` }}>
                      <p className="font-display text-xs font-bold mb-2" style={{ color: resolveColor(r.country?.color) }}>
                        ▶ {r.country?.name}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-slate-400">
                        <p><span className="text-slate-600">Q1:</span> {r.q1}</p>
                        <p><span className="text-slate-600">Q2:</span> {r.q2}</p>
                        <p><span className="text-slate-600">Q3:</span> {r.q3}</p>
                        <p><span className="text-slate-600">Q4:</span> {r.q4}</p>
                        <p className="md:col-span-2"><span className="text-slate-600">Q5:</span> {r.q5}</p>
                      </div>
                    </div>
                  ))}
                  {debriefResponses.length === 0 && (
                    <p className="font-display text-xs tracking-widest text-slate-600">AWAITING TRANSMISSIONS...</p>
                  )}
                </div>
              </div>
            )}

            {/* Planet Scoreboard */}
            <div className="sp-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b59b6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <ellipse cx="12" cy="12" rx="11" ry="4.2" transform="rotate(-30 12 12)"/>
                  <ellipse cx="12" cy="12" rx="11" ry="4.2" transform="rotate(30 12 12)"/>
                </svg>
                <p className="font-display text-xs tracking-widest text-slate-500">PLANETARY RESOURCE STATUS</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {session.countries.map(c => {
                  const dots = getPromiseDots(c, promiseChecks)
                  const col = resolveColor(c.color)
                  return (
                    <div key={c.id} style={{
                      borderRadius: 8,
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: `linear-gradient(90deg, ${col}09 0%, transparent 70px), rgba(255,255,255,0.02)`,
                      border: `1px solid ${col}33`,
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <PlanetSphere name={c.name} color={col} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="font-display font-bold tracking-wide mb-1" style={{ fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: col, textShadow: `0 0 8px ${col}60` }}>
                          {c.name}
                        </p>
                        <div style={{ display: 'flex' }}>
                          {(['food', 'environment', 'wealth'] as const).map((r, idx) => (
                            <div key={r} style={{
                              flex: 1, textAlign: 'center',
                              borderRight: idx < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                              padding: '0 4px',
                            }}>
                              <div className="font-display font-bold" style={{ fontSize: '0.75rem', color: col, lineHeight: 1 }}>{c[r]}</div>
                              <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 1 }}>
                                {RES_LABELS[r].slice(0, 3)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        {dots.map((d, i) => (
                          <div key={i} style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: d === 'green' ? '#22c55e' : d === 'amber' ? '#fbbf24' : d === 'red' ? 'var(--red-raid)' : 'rgba(255,255,255,0.15)',
                            boxShadow: d === 'green' ? '0 0 5px #22c55e' : d === 'amber' ? '0 0 5px #fbbf24' : d === 'red' ? '0 0 5px var(--red-raid)' : 'none',
                          }} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Pact dot legend */}
              <div style={{ display:'flex', gap:16, marginTop:10, paddingTop:10, borderTop:'1px solid rgba(155,89,182,0.12)', flexWrap:'wrap' }}>
                {[
                  { color: '#22c55e', shadow: '#22c55e', label: 'Pact met' },
                  { color: '#fbbf24', shadow: '#fbbf24', label: 'At risk' },
                  { color: 'var(--red-raid)', shadow: '#ff3b3b', label: 'Failed' },
                  { color: 'rgba(255,255,255,0.18)', shadow: 'none', label: 'Pending' },
                ].map(({ color, shadow, label }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:9, height:9, borderRadius:'50%', background:color, boxShadow: shadow !== 'none' ? `0 0 5px ${shadow}` : 'none' }} />
                    <span className="font-display" style={{ fontSize:'0.6rem', letterSpacing:'1px', color:'rgba(200,180,255,0.55)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Trade Feed + QR ── */}
          <div className="space-y-4">
            {/* QR Code */}
            <div className="sp-card p-4 text-center">
              {qrUrl && <img src={qrUrl} alt="Join QR" className="w-32 h-32 mx-auto rounded-lg mb-2" />}
              <p className="font-display text-xs tracking-widest" style={{ color: 'var(--cyan)' }}>SCAN TO JOIN</p>
              <p className="text-xs text-slate-600 mt-1">/join</p>
            </div>

            {/* Trade Feed */}
            <div className="sp-card p-4 flex-1">
              <p className="font-display text-xs tracking-widest text-slate-500 mb-3">📡 TRADE ACTIVITY LOG</p>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {tradeFeed.length === 0 && (
                  <p className="font-display text-xs tracking-widest text-slate-700">MONITORING CHANNELS...</p>
                )}
                {tradeFeed.map((t) => (
                  <div key={t.id} className="trade-feed-entry p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                    <p className="font-display" style={{
                      fontSize: '0.68rem', letterSpacing: '1px', marginBottom: 3,
                      color: t.status === 'ACCEPTED' ? '#4fc3f7' : t.status === 'REJECTED' ? '#ff7875' : '#c9a9ff',
                    }}>
                      {t.status === 'ACCEPTED' ? '✓' : t.status === 'REJECTED' ? '✗' : '⏳'} {t.senderName} → {t.receiverName}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(220,200,255,0.6)' }}>
                      {t.offerAmount} {RES_ICONS[t.offerResource]} {RES_LABELS[t.offerResource]} ↔ {t.requestAmount} {RES_ICONS[t.requestResource]} {RES_LABELS[t.requestResource]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
