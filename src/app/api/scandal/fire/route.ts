import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

export async function POST(req: Request) {
  const { scandalId, countryId } = await req.json()

  const scandal = await prisma.scandal.findUnique({
    where: { id: scandalId },
    include: { alliances: true },
  })
  if (!scandal) return NextResponse.json({ error: 'Escalation not found' }, { status: 404 })
  if (scandal.beat !== 'VOLLEY') return NextResponse.json({ error: 'Not in volley phase' }, { status: 400 })
  if (!scandal.beatEndsAt || new Date(scandal.beatEndsAt) < new Date()) {
    return NextResponse.json({ error: 'Volley window closed' }, { status: 400 })
  }

  // Determine which side this country is on
  let side: string | null = null
  if (countryId === scandal.attackerId) side = 'STRIKER'
  else if (countryId === scandal.defenderId) side = 'SHIELDER'
  else {
    const alliance = scandal.alliances.find(a => a.countryId === countryId)
    if (alliance?.side === 'ATTACKER') side = 'STRIKER'
    else if (alliance?.side === 'DEFENDER') side = 'SHIELDER'
  }
  if (!side) return NextResponse.json({ error: 'Not a participant' }, { status: 403 })

  // Check if already fired this round
  const alreadyFired = await prisma.scandalVolley.findFirst({
    where: { scandalId, countryId, round: scandal.currentRound },
  })
  if (alreadyFired) return NextResponse.json({ error: 'Already fired this round' }, { status: 400 })

  const country = await prisma.country.findUnique({ where: { id: countryId } })
  if (!country || country.kushBalls < 1) {
    return NextResponse.json({ error: 'No rockets remaining' }, { status: 400 })
  }

  // Fire: decrement rockets, record the volley fire
  await prisma.$transaction(async (tx) => {
    await tx.country.update({
      where: { id: countryId },
      data: { kushBalls: { decrement: 1 } },
    })
    await tx.scandalVolley.create({
      data: {
        scandalId,
        round: scandal.currentRound,
        countryId,
        side,
      },
    })
  })

  const updatedCountry = await prisma.country.findUnique({ where: { id: countryId } })

  broadcastUpdate(scandal.sessionId, {
    type: 'SCANDAL_VOLLEY_FIRED',
    scandalId,
    countryId,
    side,
    round: scandal.currentRound,
    remainingRockets: updatedCountry!.kushBalls,
  })

  return NextResponse.json({ success: true, side, round: scandal.currentRound })
}
