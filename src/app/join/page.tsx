'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

const resolveColor = (color: string) => color

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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🪐</div>
        <p className="font-display text-sm tracking-widest glow-cyan">CONNECTING TO FEDERATION...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <h1 className="font-display text-3xl font-black tracking-widest glow-cyan mb-1">STAR PACT</h1>
          <p className="font-display text-xs tracking-widest text-slate-500 uppercase">Select Your Planet</p>
        </div>

        <div style={{ borderTop: '1px solid var(--divider)' }} className="mb-6" />

        <div className="grid grid-cols-2 gap-3">
          {session.countries.map((c, i) => (
            <button
              key={c.id}
              onClick={() => join(c)}
              className="sp-card text-left p-4 transition-all duration-200 hover:scale-105 active:scale-95 anim-fade-in"
              style={{
                borderLeft: `3px solid ${resolveColor(c.color)}`,
                animationDelay: `${i * 0.04}s`,
                animationFillMode: 'both',
              }}
            >
              <p className="font-display font-bold text-sm tracking-wider mb-1"
                style={{ color: resolveColor(c.color), textShadow: `0 0 8px ${resolveColor(c.color)}60` }}>
                {c.name}
              </p>
              <p className="text-xs text-slate-400 leading-tight">{c.motto}</p>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6 font-display tracking-widest">
          FEDERATION INTAKE TERMINAL v1.0
        </p>
      </div>
    </div>
  )
}
