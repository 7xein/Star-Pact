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

function PlanetSphere({ name, color, size = 38 }: { name: string; color: string; size?: number }) {
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
              <div className="flex items-center gap-2 mb-2">
                <PlanetSphere name={c.name} color={c.color} size={34} />
                <p className="font-display font-bold text-xs tracking-wider leading-tight"
                  style={{ color: c.color, textShadow: `0 0 8px ${c.color}60`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {c.name.toUpperCase()}
                </p>
              </div>
              <p className="text-xs" style={{ color:'rgba(255,255,255,0.4)', lineHeight: '1.4', maxHeight: '2.8em', overflow: 'hidden' }}>{c.motto}</p>
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
