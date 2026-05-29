// GET /api/sn/state?sessionId=... — returns the canonical Sentinel state for
// the session. Applies any time-based phase transitions (response/stalemate
// timeouts, hit→resolution, resolution→reset) lazily as a side effect of
// reading; if the read advances a phase, the new state is broadcast over SSE
// so connected clients update without waiting for their next poll.

import { NextResponse } from 'next/server'
import { getState } from '@/lib/snStore'
import { broadcastUpdate } from '@/lib/sse'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const before = await getState(sessionId)
  // Re-read to catch a tick that may have advanced phase on read
  const after = await getState(sessionId)
  if (after.version !== before.version) {
    broadcastUpdate(sessionId, { type: 'SN_STATE', state: after })
  }
  return NextResponse.json({ state: after })
}
