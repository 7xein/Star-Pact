import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

const MAX_ROUNDS = 5

const SCANDAL_INCLUDE = {
  attacker: true,
  defender: true,
  alliances: { include: { country: true } },
  volleys: true,
} as const

export async function POST(req: Request) {
  const { scandalId } = await req.json()

  const scandal = await prisma.scandal.findUnique({
    where: { id: scandalId },
    include: SCANDAL_INCLUDE,
  })
  if (!scandal) return NextResponse.json({ error: 'Escalation not found' }, { status: 404 })
  if (scandal.beat === 'CLOSED') return NextResponse.json({ beat: 'CLOSED' })

  const now = new Date()
  const endsAt = scandal.beatEndsAt ? new Date(scandal.beatEndsAt) : null

  // Idempotency: if timer hasn't expired yet, return current state
  if (endsAt && endsAt > now) {
    return NextResponse.json({ beat: scandal.beat, beatEndsAt: scandal.beatEndsAt })
  }

  let updatedScandal

  if (scandal.beat === 'ALLIANCE') {
    // ALLIANCE → VOLLEY: start the first volley
    const volleyEndsAt = new Date(now.getTime() + 5000)
    updatedScandal = await prisma.scandal.update({
      where: { id: scandalId },
      data: { beat: 'VOLLEY', beatEndsAt: volleyEndsAt, currentRound: 1 },
      include: SCANDAL_INCLUDE,
    })

  } else if (scandal.beat === 'VOLLEY') {
    // Count rockets fired per side this round
    const roundVolleys = scandal.volleys.filter(v => v.round === scandal.currentRound)
    const strikerFires = roundVolleys.filter(v => v.side === 'STRIKER').length
    const shielderFires = roundVolleys.filter(v => v.side === 'SHIELDER').length

    let nextBeat: string
    let nextBeatEndsAt: Date
    let hitSide: string | null = null
    let nextRound = scandal.currentRound

    if (strikerFires === shielderFires && scandal.currentRound < MAX_ROUNDS) {
      // Equal (including both zero — but only repeat if under max rounds) → next volley
      nextRound = scandal.currentRound + 1
      nextBeat = 'VOLLEY'
      nextBeatEndsAt = new Date(now.getTime() + 5000)
    } else if (strikerFires > shielderFires) {
      // Strikers fired more → shielders take the hit → attacker wins
      hitSide = 'SHIELDER'
      nextBeat = 'HIT'
      nextBeatEndsAt = new Date(now.getTime() + 3000)
    } else {
      // shielderFires > strikerFires OR max rounds tie → strikers take the hit → defender wins
      hitSide = 'STRIKER'
      nextBeat = 'HIT'
      nextBeatEndsAt = new Date(now.getTime() + 3000)
    }

    updatedScandal = await prisma.scandal.update({
      where: { id: scandalId },
      data: {
        beat: nextBeat,
        beatEndsAt: nextBeatEndsAt,
        currentRound: nextRound,
        ...(hitSide ? { hitSide } : {}),
      },
      include: SCANDAL_INCLUDE,
    })

  } else if (scandal.beat === 'HIT') {
    // HIT → RESOLUTION: apply resource transfers + mark resolved
    const hitSide = scandal.hitSide
    const attackerWins = hitSide === 'SHIELDER' // shielders lost = attacker wins

    const outcome = attackerWins ? 'ATTACKER_WINS' : 'DEFENDER_WINS'

    const strikerAllies = scandal.alliances.filter(a => a.side === 'ATTACKER').map(a => a.countryId)
    const shielderAllies = scandal.alliances.filter(a => a.side === 'DEFENDER').map(a => a.countryId)

    const loserIds = attackerWins
      ? [scandal.defenderId, ...shielderAllies]
      : [scandal.attackerId, ...strikerAllies]
    const winnerIds = attackerWins
      ? [scandal.attackerId, ...strikerAllies]
      : [] // defenders just survive — no windfall

    const resolutionEndsAt = new Date(now.getTime() + 5000)

    await prisma.$transaction(async (tx) => {
      if (attackerWins) {
        for (const lid of loserIds) {
          await tx.country.update({
            where: { id: lid },
            data: { [scandal.resource]: { decrement: scandal.amount } },
          })
        }
        for (const wid of winnerIds) {
          await tx.country.update({
            where: { id: wid },
            data: { [scandal.resource]: { increment: scandal.amount } },
          })
        }
      }
      // Defender wins: no resource transfer — attacker just loses their rockets (already spent firing)

      await tx.scandal.update({
        where: { id: scandalId },
        data: {
          beat: 'RESOLUTION',
          beatEndsAt: resolutionEndsAt,
          status: 'RESOLVED',
          outcome,
        },
      })
    })

    updatedScandal = await prisma.scandal.findUnique({
      where: { id: scandalId },
      include: SCANDAL_INCLUDE,
    })

    // Also send updated session for resource changes
    const updatedSession = await prisma.session.findUnique({
      where: { id: scandal.sessionId },
      include: { countries: true },
    })
    broadcastUpdate(scandal.sessionId, { type: 'SESSION_UPDATE', session: updatedSession })

  } else if (scandal.beat === 'RESOLUTION') {
    // RESOLUTION → CLOSED
    updatedScandal = await prisma.scandal.update({
      where: { id: scandalId },
      data: { beat: 'CLOSED', beatEndsAt: null },
      include: SCANDAL_INCLUDE,
    })
  } else {
    return NextResponse.json({ error: 'Unknown beat' }, { status: 400 })
  }

  broadcastUpdate(scandal.sessionId, {
    type: 'SCANDAL_BEAT_ADVANCED',
    scandal: updatedScandal,
  })

  return NextResponse.json({ beat: updatedScandal!.beat })
}
