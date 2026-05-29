// POST /api/sn/scenario — seed the KV-backed SN state with a specific
// attacker/defender/resource/amount. Called by the Sentinel facilitator +
// mobile views when they mount, so the polling backstop has the correct
// scenario in KV before it can overwrite the local cache with stale defaults.
//
// If KV already holds the same scenario, this is a no-op (setScenario short-
// circuits). If the scenario differs, the run-state is reset and the new
// scenario is broadcast over SSE so every client converges.

import { NextResponse } from 'next/server'
import { broadcastUpdate } from '@/lib/sse'
import { setScenario } from '@/lib/snStore'

export async function POST(req: Request) {
  const { sessionId, attackerId, defenderId, resource, amount, clientId } = await req.json() as {
    sessionId: string
    attackerId: string
    defenderId: string
    resource: string
    amount: number
    clientId?: string
  }
  if (!sessionId || !attackerId || !defenderId || !resource || typeof amount !== 'number') {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
  }
  const state = await setScenario(sessionId, { attackerId, defenderId, resource, stake: amount })
  broadcastUpdate(sessionId, { type: 'SN_STATE', state, clientId })
  return NextResponse.json({ state })
}
