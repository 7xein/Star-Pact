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
      <div className="sp-card w-full max-w-md p-8">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-block mb-3">
            <span className="text-5xl">🪐</span>
          </div>
          <h1 className="font-display text-4xl font-black tracking-widest glow-cyan mb-2">
            STAR PACT
          </h1>
          <p className="text-xs tracking-widest text-slate-400 uppercase font-display">
            One Galaxy. Ten Planets. Zero Actual Cooperation.
          </p>
        </div>

        {/* Divider */}
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
