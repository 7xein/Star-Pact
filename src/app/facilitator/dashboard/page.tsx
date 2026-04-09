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
  food: 'Energy', wealth: 'Population', environment: 'Oxygen', kushBalls: 'Smugglers'
}
const RES_ICONS: Record<string, string> = {
  food: '⚡', wealth: '👥', environment: '🌿', kushBalls: '🕵️'
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
    QRCode.toDataURL(`${window.location.origin}/join`, { width: 160, margin: 1, color: { dark: '#00f5ff', light: '#0a0a1a' } }).then(setQrUrl)

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
      <p className="font-display text-sm tracking-widest glow-cyan">INITIALIZING COMMAND CENTER...</p>
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
            <h1 className="font-display text-3xl font-black tracking-widest glow-cyan">STAR PACT</h1>
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
              <p className="font-display text-xs tracking-widest text-slate-500 mb-3">🪐 PLANETARY RESOURCE STATUS</p>
              <div className="grid grid-cols-2 gap-2">
                {session.countries.map(c => {
                  const dots = getPromiseDots(c, promiseChecks)
                  const col = resolveColor(c.color)
                  return (
                    <div key={c.id} className="sp-card p-3" style={{ borderLeft: `3px solid ${col}` }}>
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-display text-xs font-bold tracking-wide" style={{ color: col, textShadow: `0 0 8px ${col}60` }}>{c.name}</p>
                        <div className="flex gap-1 mt-0.5">
                          {dots.map((d, i) => (
                            <div key={i} className="w-2 h-2 rounded-full" style={{
                              background: d === 'green' ? '#22c55e' : d === 'amber' ? '#fbbf24' : d === 'red' ? 'var(--red-raid)' : 'rgba(255,255,255,0.15)'
                            }} />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {(['food','wealth','environment','kushBalls'] as const).map(r => (
                          <div key={r} className="flex items-center gap-1">
                            <span className="text-xs">{RES_ICONS[r]}</span>
                            <span className="font-display text-sm font-bold" style={{ color: col }}>{c[r]}</span>
                            <span className="text-xs text-slate-600">{RES_LABELS[r].slice(0,3)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
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
                  <div key={t.id} className="trade-feed-entry text-xs p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--divider)' }}>
                    <p className="font-display text-xs" style={{ color: t.status === 'ACCEPTED' ? '#22c55e' : t.status === 'REJECTED' ? 'var(--red-raid)' : 'var(--cyan)' }}>
                      {t.status === 'ACCEPTED' ? '✓' : t.status === 'REJECTED' ? '✗' : '⏳'} {t.senderName} → {t.receiverName}
                    </p>
                    <p className="text-slate-400 mt-0.5">
                      {t.offerAmount} {RES_ICONS[t.offerResource]} ↔ {t.requestAmount} {RES_ICONS[t.requestResource]}
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
