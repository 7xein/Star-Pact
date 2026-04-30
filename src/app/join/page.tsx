'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PlanetOrb from '@/components/PlanetOrb'

interface Country {
  id: string
  name: string
  color: string
  motto: string
}

interface Session {
  id: string
  countries: Country[]
}

const B_BG    = '#0b0a14'
const B_INK   = '#f4efe5'
const B_FAINT = 'rgba(244,239,229,0.35)'
const B_LINE  = 'rgba(244,239,229,0.12)'
const B_GOLD  = '#e8c87a'
const B_SERIF = '"Fraunces", "Georgia", serif'
const B_MONO  = '"JetBrains Mono", "Courier New", monospace'
const B_SANS  = '"Inter Tight", "Inter", system-ui, sans-serif'

export default function JoinPage() {
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSession(data) })
      .catch(console.error)
  }, [])

  const join = (country: Country) => {
    document.cookie = `countryId=${country.id}; path=/; max-age=86400`
    document.cookie = `sessionId=${session?.id}; path=/; max-age=86400`
    router.push('/play')
  }

  if (!session) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: B_BG }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <PlanetOrb name="Aqualis" color="#3b82f6" size={48} pulse />
        </div>
        <p style={{ fontFamily: B_MONO, fontSize: 10, letterSpacing: '0.3em', color: B_FAINT, textTransform: 'uppercase' }}>
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

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', padding: '0 0 32px' }}>

        {/* Header */}
        <div style={{ padding: '32px 22px 20px', textAlign: 'center' }}>
          <div style={{ fontFamily: B_MONO, fontSize: 10, letterSpacing: '0.3em', color: B_FAINT, textTransform: 'uppercase', marginBottom: 8 }}>
            Nebula Alliance
          </div>
          <div style={{ fontFamily: B_SERIF, fontSize: 34, fontWeight: 300, fontStyle: 'italic', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Choose your <span style={{ color: B_GOLD }}>planet</span>.
          </div>
          <div style={{ fontFamily: B_SERIF, fontSize: 14, fontStyle: 'italic', color: B_FAINT, marginTop: 10, lineHeight: 1.5, padding: '0 12px' }}>
            You are one of ten governors of the Outer Spiral. The Hollow Ring awaits.
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: B_LINE, margin: '0 0 4px' }}/>

        {/* Planet list */}
        <div>
          {session.countries.map((c, i) => (
            <button
              key={c.id}
              onClick={() => join(c)}
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
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = `${c.color}0d`)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <PlanetOrb name={c.name} color={c.color} size={44} sigil={c.name[0]} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: B_SERIF,
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                  color: B_INK,
                  marginBottom: 2,
                }}>
                  {c.name.charAt(0) + c.name.slice(1).toLowerCase()}
                </div>
                <div style={{
                  fontFamily: B_SERIF,
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: B_FAINT,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {c.motto}
                </div>
              </div>
              <div style={{ fontFamily: B_MONO, fontSize: 10, color: B_GOLD, letterSpacing: '0.2em', flexShrink: 0 }}>
                {String(i + 1).padStart(2, '0')} →
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, fontFamily: B_MONO, fontSize: 9, letterSpacing: '0.3em', color: 'rgba(244,239,229,0.2)', textTransform: 'uppercase' }}>
          Federation Intake Terminal v2.0
        </div>
      </div>
    </div>
  )
}
