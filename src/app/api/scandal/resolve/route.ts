import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'
import { randomBytes } from 'crypto'

export async function POST(req: Request) {
  const body = await req.json()
  const { scandalId, outcome: providedOutcome } = body as { scandalId: string; outcome?: 'ATTACKER_WINS' | 'DEFENDER_WINS' | 'DRAW' }

  const scandal = await prisma.scandal.findUnique({
    where: { id: scandalId },
    include: { attacker: true, defender: true, alliances: { include: { country: true } } }
  })
  if (!scandal) return NextResponse.json({ error: 'Scandal not found' }, { status: 404 })
  if (scandal.status !== 'OPEN') return NextResponse.json({ error: 'Already resolved' }, { status: 400 })

  // Outcome can be provided by the Sentinel game state (preferred); fall back
  // to server-side crypto-random 50/50 if not supplied.
  let outcome: 'ATTACKER_WINS' | 'DEFENDER_WINS' | 'DRAW'
  if (providedOutcome === 'ATTACKER_WINS' || providedOutcome === 'DEFENDER_WINS' || providedOutcome === 'DRAW') {
    outcome = providedOutcome
  } else {
    const randomByte = randomBytes(1)[0]
    outcome = randomByte < 128 ? 'ATTACKER_WINS' : 'DEFENDER_WINS'
  }

  // DRAW: no resource transfer, just close the scandal.
  if (outcome === 'DRAW') {
    await prisma.scandal.update({ where: { id: scandalId }, data: { status: 'RESOLVED', outcome } })
    const updatedSession = await prisma.session.findUnique({
      where: { id: scandal.sessionId },
      include: { countries: true }
    })
    broadcastUpdate(scandal.sessionId, { type: 'SCANDAL_RESOLVED', scandalId, outcome, session: updatedSession })
    return NextResponse.json({ outcome })
  }

  const attackerWins = outcome === 'ATTACKER_WINS'

  const winnerSide = attackerWins ? 'ATTACKER' : 'DEFENDER'
  const loserSide = attackerWins ? 'DEFENDER' : 'ATTACKER'

  const winnerAllies = scandal.alliances.filter(a => a.side === winnerSide).map(a => a.countryId)
  const loserAllies = scandal.alliances.filter(a => a.side === loserSide).map(a => a.countryId)

  const winnerId = attackerWins ? scandal.attackerId : scandal.defenderId
  const loserId = attackerWins ? scandal.defenderId : scandal.attackerId
  const loserIds = [loserId, ...loserAllies]
  const winnerIds = [winnerId, ...winnerAllies]

  await prisma.$transaction(async (tx) => {
    // Each loser gives up the full disputed amount
    for (const lid of loserIds) {
      await tx.country.update({
        where: { id: lid },
        data: { [scandal.resource]: { decrement: scandal.amount } }
      })
    }
    // Winners split — for simplicity each winner gains the amount (prototype)
    for (const wid of winnerIds) {
      await tx.country.update({
        where: { id: wid },
        data: { [scandal.resource]: { increment: scandal.amount } }
      })
    }
    await tx.scandal.update({ where: { id: scandalId }, data: { status: 'RESOLVED', outcome } })
  })

  const updatedSession = await prisma.session.findUnique({
    where: { id: scandal.sessionId },
    include: { countries: true }
  })

  broadcastUpdate(scandal.sessionId, { type: 'SCANDAL_RESOLVED', scandalId, outcome, session: updatedSession })
  return NextResponse.json({ outcome })
}
