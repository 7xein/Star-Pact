import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function POST(req: Request) {
  const body = await req.json()
  const { scandalId, countryId, side } = body  // side: ATTACKER | DEFENDER

  const scandal = await prisma.scandal.findUnique({ where: { id: scandalId } })
  if (!scandal) return NextResponse.json({ error: 'Scandal not found' }, { status: 404 })
  if (scandal.status !== 'OPEN') return NextResponse.json({ error: 'Scandal closed' }, { status: 400 })
  if (new Date() > scandal.windowEndsAt) return NextResponse.json({ error: 'Alliance window closed' }, { status: 400 })

  const existing = await prisma.scandalAlliance.findFirst({ where: { scandalId, countryId } })
  if (existing) return NextResponse.json({ error: 'Already allied' }, { status: 400 })

  const alliance = await prisma.scandalAlliance.create({
    data: { scandalId, countryId, side },
    include: { country: true }
  })

  broadcastUpdate(scandal.sessionId, { type: 'SCANDAL_ALLY', alliance, scandalId })
  return NextResponse.json(alliance)
}
