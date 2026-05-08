import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function POST(req: Request) {
  try {
    const { sessionId, countryId, playerName } = await req.json()
    if (!sessionId || !countryId) {
      return NextResponse.json({ error: 'Missing sessionId or countryId' }, { status: 400 })
    }

    // Use a transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const country = await tx.country.findUnique({ where: { id: countryId } })
      if (!country) throw new Error('Country not found')
      if (country.sessionId !== sessionId) throw new Error('Country not in session')
      if (country.claimedBy) throw new Error('Planet already claimed')

      const updated = await tx.country.update({
        where: { id: countryId },
        data: { claimedBy: playerName || 'Player' },
      })
      return updated
    })

    // Broadcast so other join pages update in real time
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { countries: true },
    })
    if (session) {
      broadcastUpdate(sessionId, { type: 'SESSION_UPDATE', session })
    }

    return NextResponse.json({ success: true, country: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
