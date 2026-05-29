// Authoritative Sentinel reset endpoint.

import { NextResponse } from 'next/server'
import { broadcastUpdate } from '@/lib/sse'
import { applyReset } from '@/lib/snStore'

export async function POST(req: Request) {
  const { sessionId, clientId } = await req.json() as { sessionId: string; clientId?: string }
  if (!sessionId) return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
  const state = await applyReset(sessionId)
  broadcastUpdate(sessionId, { type: 'SN_STATE', state, clientId })
  return NextResponse.json({ state })
}
