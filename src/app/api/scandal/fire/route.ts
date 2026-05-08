import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

const SCANDAL_INCLUDE = {
  attacker: true,
  defender: true,
  alliances: { include: { country: true } },
  volleys: true,
} as const

export async function POST(req: Request) {
  const { scandalId, countryId } = await req.json()

  const scandal = await prisma.scandal.findUnique({
    where: { id: scandalId },
    include: SCANDAL_INCLUDE,
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

  // Fire: decrement rockets, record the volley, update lastFiringSide
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
    await tx.scandal.update({
      where: { id: scandalId },
      data: { lastFiringSide: side },
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

  // ── Auto-advance check ──────────────────────────────────
  // If all participants have either fired this round OR have 0 rockets,
  // advance the beat immediately instead of waiting for the timer.
  const allParticipantIds = [
    scandal.attackerId,
    scandal.defenderId,
    ...scandal.alliances.map(a => a.countryId),
  ]

  // Re-fetch volleys for this round (including the one we just created)
  const roundVolleys = await prisma.scandalVolley.findMany({
    where: { scandalId, round: scandal.currentRound },
  })
  const firedIds = new Set(roundVolleys.map(v => v.countryId))

  // Fetch current rocket counts for participants who haven't fired
  const unfiredIds = allParticipantIds.filter(id => !firedIds.has(id))
  let allDone = true
  if (unfiredIds.length > 0) {
    const unfiredCountries = await prisma.country.findMany({
      where: { id: { in: unfiredIds } },
      select: { id: true, kushBalls: true },
    })
    // If any unfired participant still has rockets, not all done
    allDone = unfiredCountries.every(c => c.kushBalls < 1)
  }

  if (allDone) {
    // Trigger early beat advancement by calling advance-beat logic inline
    await advanceBeatNow(scandalId, scandal.sessionId)
  }

  return NextResponse.json({ success: true, side, round: scandal.currentRound, autoAdvanced: allDone })
}

// Inline beat advancement (same logic as advance-beat route but skips timer check)
async function advanceBeatNow(scandalId: string, sessionId: string) {
  const scandal = await prisma.scandal.findUnique({
    where: { id: scandalId },
    include: SCANDAL_INCLUDE,
  })
  if (!scandal || scandal.beat !== 'VOLLEY') return

  const roundVolleys = scandal.volleys.filter(v => v.round === scandal.currentRound)
  const strikerFires = roundVolleys.filter(v => v.side === 'STRIKER').length
  const shielderFires = roundVolleys.filter(v => v.side === 'SHIELDER').length

  const now = new Date()
  let nextBeat: string
  let nextBeatEndsAt: Date
  let hitSide: string | null = null
  let nextRound = scandal.currentRound

  if (strikerFires === 0 && shielderFires === 0) {
    // Both sides empty — last side to fire in a previous round wins
    const lastSide = scandal.lastFiringSide
    if (lastSide === 'STRIKER') {
      hitSide = 'SHIELDER' // attacker wins
    } else if (lastSide === 'SHIELDER') {
      hitSide = 'STRIKER' // defender wins
    } else {
      hitSide = 'STRIKER' // nobody ever fired — defender wins by default
    }
    nextBeat = 'HIT'
    nextBeatEndsAt = new Date(now.getTime() + 3000)
  } else if (strikerFires === shielderFires && scandal.currentRound < 5) {
    // Tied — next round
    nextRound = scandal.currentRound + 1
    nextBeat = 'VOLLEY'
    nextBeatEndsAt = new Date(now.getTime() + 10000)
  } else if (strikerFires > shielderFires) {
    hitSide = 'SHIELDER'
    nextBeat = 'HIT'
    nextBeatEndsAt = new Date(now.getTime() + 3000)
  } else {
    // shielderFires > strikerFires OR max rounds tie
    hitSide = 'STRIKER'
    nextBeat = 'HIT'
    nextBeatEndsAt = new Date(now.getTime() + 3000)
  }

  const updatedScandal = await prisma.scandal.update({
    where: { id: scandalId },
    data: {
      beat: nextBeat,
      beatEndsAt: nextBeatEndsAt,
      currentRound: nextRound,
      ...(hitSide ? { hitSide } : {}),
    },
    include: SCANDAL_INCLUDE,
  })

  broadcastUpdate(sessionId, {
    type: 'SCANDAL_BEAT_ADVANCED',
    scandal: updatedScandal,
  })
}
