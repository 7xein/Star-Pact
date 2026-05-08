'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PlanetOrb from '@/components/PlanetOrb'

interface Country {
  id: string
  name: string
  color: string
  motto: string
  claimedBy: string | null
}

interface Session {
  id: string
  countries: Country[]
}

const B_BG    = '#0b0a14'
const B_INK   = '#f4efe5'
const B_FAINT = 'rgba(244,239,229,0.55)'
const B_LINE  = 'rgba(244,239,229,0.14)'
const B_GOLD  = '#e8c87a'
const B_SERIF = '"Space Grotesk", "Century Gothic", "Futura", sans-serif'
const B_MONO  = '"JetBrains Mono", "Courier New", monospace'
const B_SANS  = '"Inter Tight", "Inter", system-ui, sans-serif'

export default function JoinPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSession(data) })
      .catch(console.error)
  }, [])

  // Listen for real-time updates so claimed planets appear instantly
  useEffect(() => {
    if (!session) return
    const es = new EventSource(`/api/sse?sessionId=${session.id}`)
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'SESSION_UPDATE' || data.type === 'SESSION_CREATED') {
        setSession(data.session)
      }
    }
    // Also poll as fallback
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/session')
        if (res.ok) {
          const fresh = await res.json()
          setSession(fresh)
        }
      } catch { /* ignore */ }
    }, 3000)
    return () => { es.close(); clearInterval(poll) }
  }, [session?.id])

  const join = async (country: Country) => {
    if (!session || claiming || country.claimedBy) return
    const trimmed = playerName.trim()
    if (!trimmed) {
      nameInputRef.current?.focus()
      nameInputRef.current?.classList.add('shake')
      setTimeout(() => nameInputRef.current?.classList.remove('shake'), 500)
      return
    }
    setClaiming(true)
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, countryId: country.id, playerName: trimmed }),
      })
      if (!res.ok) {
        const err = await res.json()
        setErrorMsg(err.error || 'Could not claim planet')
        setTimeout(() => setErrorMsg(null), 4000)
        setClaiming(false)
        return
      }
      document.cookie = `countryId=${country.id}; path=/; max-age=86400`
      document.cookie = `sessionId=${session.id}; path=/; max-age=86400`
      router.push('/play')
    } catch {
      setErrorMsg('Network error — try again')
      setTimeout(() => setErrorMsg(null), 4000)
      setClaiming(false)
    }
  }

  if (!session) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: B_BG }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <PlanetOrb name="Aqualis" color="#3b82f6" size={48} pulse />
        </div>
        <p style={{ fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.2em', color: B_FAINT, textTransform: 'uppercase' }}>
          Connecting to Federation…
        </p>
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: B_BG,
      color: B_INK,
      fontFamily: B_SANS,
      position: 'relative',
    }}>
      {/* Nebula backdrop */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at 80% 0%, #5b3a8a33 0%, transparent 50%), radial-gradient(ellipse at 0% 100%, #c9885633 0%, transparent 50%)',
      }}/>

      {/* Error notification */}
      {errorMsg && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, width: 'calc(100% - 32px)', maxWidth: '28rem',
          padding: '10px 16px', textAlign: 'center',
          background: 'rgba(255,59,59,0.15)', border: `1px solid rgba(255,59,59,0.4)`,
          backdropFilter: 'blur(8px)', animation: 'slide-down 0.3s ease-out',
        }}>
          <span style={{ fontFamily: B_MONO, fontSize: 12, letterSpacing: '0.15em', color: '#ff3b3b' }}>
            {errorMsg.toUpperCase()}
          </span>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', padding: '0 0 32px' }}>

        {/* Header */}
        <div style={{ padding: '32px 22px 20px', textAlign: 'center' }}>
          <div style={{ fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.2em', color: B_FAINT, textTransform: 'uppercase', marginBottom: 8 }}>
            Nebula Alliance
          </div>
          <div style={{ fontFamily: B_SERIF, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Choose your <span style={{ color: B_GOLD }}>planet</span>.
          </div>
          <div style={{ fontFamily: B_SERIF, fontSize: 14, color: B_FAINT, marginTop: 10, lineHeight: 1.5, padding: '0 12px' }}>
            You are one of ten governors of the Outer Spiral. The Hollow Ring awaits.
          </div>
        </div>

        {/* Name input */}
        <div style={{ padding: '0 22px 16px' }}>
          <label style={{ fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.2em', color: B_FAINT, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Your Name
          </label>
          <input
            ref={nameInputRef}
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your name to join…"
            maxLength={24}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(244,239,229,0.06)',
              border: `1px solid ${B_LINE}`,
              borderRadius: 6,
              color: B_INK,
              fontFamily: B_SERIF,
              fontSize: 16,
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = B_GOLD }}
            onBlur={e => { e.currentTarget.style.borderColor = B_LINE }}
          />
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20%, 60% { transform: translateX(-6px); }
              40%, 80% { transform: translateX(6px); }
            }
            .shake { animation: shake 0.4s ease-in-out; border-color: #e87a7a !important; }
          `}</style>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: B_LINE, margin: '0 0 4px' }}/>

        {/* Planet list */}
        <div>
          {session.countries.map((c, i) => {
            const taken = !!c.claimedBy
            return (
              <button
                key={c.id}
                onClick={() => join(c)}
                disabled={taken || claiming}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '14px 22px',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${B_LINE}`,
                  cursor: taken ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s, opacity 0.3s',
                  opacity: taken ? 0.4 : 1,
                  filter: taken ? 'saturate(0.3)' : 'none',
                }}
                onMouseEnter={e => { if (!taken) e.currentTarget.style.background = `${c.color}0d` }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <PlanetOrb name={c.name} color={c.color} size={44} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: B_SERIF,
                    fontSize: 18,
                    fontWeight: 400,
                    letterSpacing: '-0.01em',
                    color: taken ? B_FAINT : B_INK,
                    marginBottom: 2,
                  }}>
                    {c.name}
                  </div>
                  <div style={{
                    fontFamily: B_SERIF,
                    fontSize: 13,
                    fontWeight: 400,
                    color: B_FAINT,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {taken ? `Claimed by ${c.claimedBy}` : c.motto}
                  </div>
                </div>
                <div style={{ fontFamily: B_MONO, fontSize: 11, color: taken ? B_FAINT : B_GOLD, letterSpacing: '0.2em', flexShrink: 0 }}>
                  {taken ? 'TAKEN' : `${String(i + 1).padStart(2, '0')} →`}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, fontFamily: B_MONO, fontSize: 11, letterSpacing: '0.2em', color: 'rgba(244,239,229,0.3)', textTransform: 'uppercase' }}>
          Federation Intake Terminal v2.0
        </div>
      </div>
    </div>
  )
}
