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

// Returns inner surface detail elements rendered inside the sphere div.
// The sphere div must have position:relative and overflow:hidden.
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

function PlanetSphere({ name, color }: { name: string; color: string }) {
  return (
    <div style={{
      position: 'relative',
      width: 38,
      height: 38,
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
        <div style={{ width:48, height:48, borderRadius:'50%', margin:'0 auto 16px', background:'radial-gradient(circle at 35% 35%, #9b59b6, #4a0080)', boxShadow:'0 0 24px rgba(155,89,182,0.8)' }} />
        <p className="font-display text-sm tracking-widest" style={{ color:'var(--stardust)' }}>CONNECTING TO FEDERATION...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <h1 className="font-display text-3xl font-black tracking-widest mb-1" style={{ color:'var(--stardust)', textShadow:'0 0 30px rgba(155,89,182,0.7)' }}>
            STAR PACT
          </h1>
          <p className="font-display text-xs tracking-widest uppercase" style={{ color:'rgba(155,89,182,0.5)' }}>Select Your Planet</p>
        </div>

        <div style={{ borderTop:'1px solid var(--divider)' }} className="mb-6" />

        <div className="grid grid-cols-2 gap-3">
          {session.countries.map((c, i) => (
            <button
              key={c.id}
              onClick={() => join(c)}
              className="sp-card text-left p-3 transition-all duration-200 hover:scale-105 active:scale-95 anim-fade-in"
              style={{
                background: `${c.color}08`,
                border: `1px solid ${c.color}4d`,
                animationDelay: `${i * 0.04}s`,
                animationFillMode: 'both',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <PlanetSphere name={c.name} color={c.color} />
                <p className="font-display font-bold text-xs tracking-wider leading-tight"
                  style={{ color: c.color, textShadow: `0 0 8px ${c.color}60` }}>
                  {c.name.toUpperCase()}
                </p>
              </div>
              <p className="text-xs leading-tight" style={{ color:'rgba(255,255,255,0.4)' }}>{c.motto}</p>
            </button>
          ))}
        </div>

        <p className="text-center text-xs mt-6 font-display tracking-widest" style={{ color:'rgba(155,89,182,0.25)' }}>
          FEDERATION INTAKE TERMINAL v1.0
        </p>
      </div>
    </div>
  )
}
