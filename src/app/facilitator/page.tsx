'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FacilitatorLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleNewSession = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/session/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    if (!res.ok) {
      setError('Invalid password or error creating session')
      setLoading(false)
      return
    }
    const session = await res.json()
    localStorage.setItem('sessionId', session.id)
    router.push('/facilitator/dashboard')
  }

  const handleExisting = async () => {
    if (password !== 'admin123') { setError('Invalid password'); return }
    const res = await fetch('/api/session')
    if (!res.ok) { setError('No existing session'); return }
    const session = await res.json()
    localStorage.setItem('sessionId', session.id)
    router.push('/facilitator/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="sp-card w-full p-8" style={{ maxWidth: '28rem' }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: 'radial-gradient(circle at 35% 35%, #d4a0ff, #4a0080)',
            boxShadow: '0 0 32px rgba(155,89,182,0.8)',
          }} />
          <h1 className="font-display text-4xl font-black tracking-widest mb-2"
            style={{ color: 'var(--stardust)', textShadow: '0 0 30px rgba(155,89,182,0.7)' }}>
            STAR PACT
          </h1>
          <p className="text-xs tracking-widest text-slate-400 uppercase font-display">
            One Galaxy. Ten Planets. Zero Actual Cooperation.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--divider)' }} className="mb-6" />

        <p className="text-xs font-display tracking-widest text-slate-500 uppercase mb-3">
          Facilitator Access
        </p>

        <input
          type="password"
          placeholder="Enter access code"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNewSession()}
          className="sp-input mb-4"
        />

        {error && (
          <p className="text-xs mb-4 font-display tracking-wide" style={{ color: 'var(--red-raid)' }}>
            ⚠ {error}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={handleNewSession} disabled={loading} className="btn-cyan flex-1">
            {loading ? 'INITIALIZING...' : '⚡ NEW SESSION'}
          </button>
          <button onClick={handleExisting} className="btn-ghost flex-1">
            RESUME
          </button>
        </div>
      </div>
    </div>
  )
}
