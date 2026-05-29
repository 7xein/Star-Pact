// Kick a player from their claimed planet without resetting anything else.
// Clears `claimedBy` on the country row so a new player can join in their
// place. All resource numbers, promises data, and game state are preserved.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function POST(req: Request) {
  try {
    const { sessionId, countryId } = await req.json() as { sessionId?: string; countryId?: string }
    if (!sessionId || !countryId) {
      return NextResponse.json({ error: 'Missing sessionId or countryId' }, { status: 400 })
    }

    const country = await prisma.country.findUnique({ where: { id: countryId } })
    if (!country) return NextResponse.json({ error: 'Country not found' }, { status: 404 })
    if (country.sessionId !== sessionId) return NextResponse.json({ error: 'Country not in session' }, { status: 400 })

    await prisma.country.update({ where: { id: countryId }, data: { claimedBy: null } })

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { countries: true },
    })
    if (session) {
      broadcastUpdate(sessionId, { type: 'SESSION_UPDATE', session })
      broadcastUpdate(sessionId, { type: 'PLAYER_KICKED', countryId })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
