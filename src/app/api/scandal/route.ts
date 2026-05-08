import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { broadcastUpdate } from '@/lib/sse'

const SCANDAL_INCLUDE = {
  attacker: true,
  defender: true,
  alliances: { include: { country: true } },
  volleys: true,
} as const

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const scandals = await prisma.scandal.findMany({
    where: { sessionId, status: 'OPEN' },
    include: SCANDAL_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(scandals)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { sessionId, attackerId, defenderId, resource, amount } = body

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session) return NextResponse.json({ error: 'No session' }, { status: 404 })
  if (session.phase !== 'SCANDAL') return NextResponse.json({ error: 'Not in escalation phase' }, { status: 400 })

  const attacker = await prisma.country.findUnique({ where: { id: attackerId } })
  if (!attacker) return NextResponse.json({ error: 'Planet not found' }, { status: 404 })
  if (attacker.kushBalls < 1) return NextResponse.json({ error: 'Need at least 1 rocket to launch an escalation' }, { status: 400 })

  // Only one active escalation per session
  const existing = await prisma.scandal.findFirst({
    where: { sessionId, beat: { not: 'CLOSED' }, status: 'OPEN' },
  })
  if (existing) return NextResponse.json({ error: 'Escalation already in progress' }, { status: 400 })

  const now = new Date()
  const allianceDuration = 20 * 1000
  const beatEndsAt = new Date(now.getTime() + allianceDuration)

  const scandal = await prisma.$transaction(async (tx) => {
    return tx.scandal.create({
      data: {
        sessionId,
        attackerId,
        defenderId,
        resource,
        amount,
        status: 'OPEN',
        year: session.year,
        windowEndsAt: beatEndsAt,
        beat: 'ALLIANCE',
        beatEndsAt,
        currentRound: 1,
      },
      include: SCANDAL_INCLUDE,
    })
  })

  broadcastUpdate(sessionId, { type: 'SCANDAL_LAUNCHED', scandal })
  return NextResponse.json(scandal)
}
