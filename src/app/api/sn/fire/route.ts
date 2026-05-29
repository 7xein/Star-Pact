// Authoritative Sentinel fire endpoint.
// 1. Applies the fire to the canonical KV-backed state (validates lockout,
//    decrements rockets, computes timer deadlines, checks exhaustion).
// 2. Broadcasts the new full state via SSE so connected clients can update
//    immediately. Clients also poll /api/sn/state as a reliability fallback.

import { NextResponse } from 'next/server'
import { broadcastUpdate } from '@/lib/sse'
import { applyFire, setScenario } from '@/lib/snStore'

export async function POST(req: Request) {
  const body = await req.json()
  const { sessionId, side, clientId, attackerId, defenderId, resource, amount } = body as {
    sessionId: string
    side: 'attacker' | 'defender'
    clientId?: string
    attackerId?: string
    defenderId?: string
    resource?: string
    amount?: number
  }
  if (!sessionId || (side !== 'attacker' && side !== 'defender')) {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
  }

  // First touch: if the caller passed scenario hints, seed the KV row so the
  // state machine starts with the right principals/stake.
  if (attackerId && defenderId && resource && typeof amount === 'number') {
    await setScenario(sessionId, { attackerId, defenderId, resource, stake: amount })
  }

  const state = await applyFire(sessionId, side)
  broadcastUpdate(sessionId, { type: 'SN_STATE', state, clientId })
  return NextResponse.json({ state })
}
